// ============================================================
// GET /api/v1/reports/occupancy
// src/app/api/v1/reports/occupancy/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentStaffAccount } from '@/modules/auth/domain/session';
import { calculateOccupancyRate } from '@/modules/reports/domain/occupancy';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

export async function GET(request: NextRequest) {
  try {
    const staff = await getCurrentStaffAccount();
    if (!staff || staff.role !== 'manager') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 });
    }

    const days = Number(request.nextUrl.searchParams.get('days') ?? 30);
    const supabase = createSupabaseServiceClient();

    // Get total rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('is_active', true);
    const totalRooms = rooms?.length ?? 25;

    // Generate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get bookings in date range
    const { data: bookings } = await supabase
      .from('bookings')
      .select('check_in_date, check_out_date, booking_status')
      .gte('check_in_date', startDate.toISOString().slice(0, 10))
      .lte('check_out_date', endDate.toISOString().slice(0, 10))
      .in('booking_status', ['Paid', 'Checked_In', 'Checked_Out']);

    // Calculate daily occupancy
    const dailyData: Record<string, { occupied: number; rate: number }> = {};

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      const occupied = (bookings ?? []).filter((b: any) => {
        const checkin = new Date(b.check_in_date);
        const checkout = new Date(b.check_out_date);
        const current = new Date(dateStr);
        return current >= checkin && current < checkout;
      }).length;

      dailyData[dateStr] = {
        occupied,
        rate: occupied / totalRooms,
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate stats
    const rates = Object.values(dailyData).map((d) => d.rate);
    const currentOccupancy = dailyData[new Date().toISOString().slice(0, 10)]?.rate ?? 0;
    const avgOccupancy = rates.reduce((a, b) => a + b, 0) / rates.length;

    // Trend (compare first half vs second half)
    const midIdx = Math.floor(rates.length / 2);
    const firstHalf = rates.slice(0, midIdx).reduce((a, b) => a + b, 0) / midIdx || 0;
    const secondHalf = rates.slice(midIdx).reduce((a, b) => a + b, 0) / (rates.length - midIdx) || 0;
    const trend = ((secondHalf - firstHalf) / firstHalf) * 100;

    // Peak and lowest dates
    const sorted = Object.entries(dailyData).sort((a, b) => b[1].rate - a[1].rate);
    const peakDate = sorted[0]?.[0] ?? 'N/A';
    const lowestDate = sorted[sorted.length - 1]?.[0] ?? 'N/A';

    // Forecast tonight
    const tonight = new Date();
    tonight.setDate(tonight.getDate() + 1);
    const tonightStr = tonight.toISOString().slice(0, 10);
    const forecastOccupancy = dailyData[tonightStr]?.rate ?? avgOccupancy;

    return NextResponse.json({
      data: {
        current_occupancy: currentOccupancy,
        average_occupancy: avgOccupancy,
        trend: trend,
        forecast_tonight: forecastOccupancy,
        peak_date: peakDate,
        lowest_date: lowestDate,
        data: Object.entries(dailyData).map(([date, info]) => ({
          date,
          total_rooms: totalRooms,
          occupied: info.occupied,
          available: totalRooms - info.occupied,
          rate: info.rate,
        })),
      },
    });
  } catch (err: any) {
    console.error('[occupancy-report]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
