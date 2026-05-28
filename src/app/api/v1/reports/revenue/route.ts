// ============================================================
// GET /api/v1/reports/revenue
// src/app/api/v1/reports/revenue/route.ts
//
// Comprehensive revenue analytics for hotel managers.
// Categorises by booking source, payment method, and time periods.
// Requirements 16.1, 25.2–25.4
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get('start_date') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate   = searchParams.get('end_date')   ?? new Date().toISOString().slice(0, 10);
  const period    = searchParams.get('period')     ?? 'daily';

  try {
    const supabase = createSupabaseServiceClient();

    // Core revenue query
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`id, booking_reference, total_amount, payment_method, source,
               check_in_date, check_out_date, booking_status, created_at,
               rooms ( room_type )`)
      .gte('check_in_date', startDate)
      .lte('check_in_date', endDate)
      .in('booking_status', ['paid', 'checked_in', 'checked_out'])
      .order('check_in_date');

    if (error) throw new Error(`Revenue query failed: ${error.message}`);

    const bookingData = (bookings ?? []).map((b: any) => ({
      ...b,
      room_type: b.rooms?.room_type ?? 'Unknown',
    }));

    const totalRevenue   = bookingData.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
    const totalBookings  = bookingData.length;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Revenue by source
    const revenueBySource = bookingData.reduce((acc: Record<string, number>, b: any) => {
      const source = b.source === 'online' ? 'Online Booking' : 'Walk-in / Manual';
      acc[source] = (acc[source] || 0) + (b.total_amount || 0);
      return acc;
    }, {});

    // Revenue by payment method
    const revenueByPayment = bookingData.reduce((acc: Record<string, number>, b: any) => {
      const method = formatPaymentMethod(b.payment_method);
      acc[method] = (acc[method] || 0) + (b.total_amount || 0);
      return acc;
    }, {});

    // Revenue by room type
    const revenueByRoomType = bookingData.reduce((acc: Record<string, number>, b: any) => {
      acc[b.room_type] = (acc[b.room_type] || 0) + (b.total_amount || 0);
      return acc;
    }, {});

    // Time series
    const timeSeries = generateTimeSeries(bookingData, period, startDate, endDate);

    // Top performing days
    const dailyRevenue = bookingData.reduce((acc: Record<string, number>, b: any) => {
      const date = b.check_in_date;
      acc[date] = (acc[date] || 0) + (b.total_amount || 0);
      return acc;
    }, {});

    const topDays = Object.entries(dailyRevenue)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([date, revenue]) => ({ date, revenue }));

    // Growth vs previous period
    const periodDays = Math.max(1, Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
    ));
    const prevStart = new Date(new Date(startDate).getTime() - periodDays * 86400000).toISOString().slice(0, 10);
    const prevEnd   = new Date(new Date(startDate).getTime() - 86400000).toISOString().slice(0, 10);

    const { data: prevBookings } = await supabase
      .from('bookings')
      .select('total_amount')
      .gte('check_in_date', prevStart)
      .lte('check_in_date', prevEnd)
      .in('booking_status', ['paid', 'checked_in', 'checked_out']);

    const prevRevenue   = (prevBookings ?? []).reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return NextResponse.json({
      data: {
        summary: {
          total_revenue:     totalRevenue,
          total_bookings:    totalBookings,
          avg_booking_value: Math.round(avgBookingValue),
          revenue_growth:    Math.round(revenueGrowth * 100) / 100,
          period:            `${startDate} to ${endDate}`,
        },
        breakdown: {
          by_source: Object.entries(revenueBySource).map(([source, revenue]) => ({
            source, revenue,
            percentage: totalRevenue > 0 ? Math.round(((revenue as number) / totalRevenue) * 100) : 0,
          })),
          by_payment_method: Object.entries(revenueByPayment).map(([method, revenue]) => ({
            method, revenue,
            percentage: totalRevenue > 0 ? Math.round(((revenue as number) / totalRevenue) * 100) : 0,
          })),
          by_room_type: Object.entries(revenueByRoomType).map(([room_type, revenue]) => ({
            room_type, revenue,
            percentage: totalRevenue > 0 ? Math.round(((revenue as number) / totalRevenue) * 100) : 0,
          })),
        },
        time_series: timeSeries,
        top_days:    topDays,
        insights:    generateInsights(bookingData, revenueBySource, revenueByPayment, revenueGrowth, totalRevenue),
      },
    });
  } catch (err: any) {
    console.error('[GET /api/v1/reports/revenue]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash:         'Cash',
    chapa:        'Chapa (Online)',
    telebirr:     'TeleBirr',
    cbe_birr:     'CBE Birr',
    online_chapa: 'Chapa (Online)',
  };
  return map[method] ?? method ?? 'Unknown';
}

function generateTimeSeries(bookings: any[], period: string, startDate: string, endDate: string) {
  const series: Array<{ date: string; revenue: number; bookings: number }> = [];
  const start = new Date(startDate);
  const end   = new Date(endDate);

  if (period === 'daily') {
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr    = d.toISOString().slice(0, 10);
      const dayBookings = bookings.filter((b) => b.check_in_date === dateStr);
      series.push({
        date:     dateStr,
        revenue:  dayBookings.reduce((s, b) => s + (b.total_amount || 0), 0),
        bookings: dayBookings.length,
      });
    }
  } else if (period === 'weekly') {
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const weekStart   = d.toISOString().slice(0, 10);
      const weekEnd     = new Date(d.getTime() + 6 * 86400000).toISOString().slice(0, 10);
      const weekBookings = bookings.filter((b) => b.check_in_date >= weekStart && b.check_in_date <= weekEnd);
      series.push({
        date:     `Week of ${weekStart}`,
        revenue:  weekBookings.reduce((s, b) => s + (b.total_amount || 0), 0),
        bookings: weekBookings.length,
      });
    }
  } else {
    const months = [...new Set(bookings.map((b) => b.check_in_date.slice(0, 7)))].sort();
    for (const month of months) {
      const monthBookings = bookings.filter((b) => b.check_in_date.startsWith(month));
      series.push({
        date:     month,
        revenue:  monthBookings.reduce((s, b) => s + (b.total_amount || 0), 0),
        bookings: monthBookings.length,
      });
    }
  }
  return series;
}

function generateInsights(
  bookings: any[],
  bySource: Record<string, number>,
  byPayment: Record<string, number>,
  growth: number,
  totalRevenue: number,
): string[] {
  const insights: string[] = [];

  if (growth > 10)  insights.push(`Revenue grew by ${growth.toFixed(1)}% compared to the previous period`);
  else if (growth < -10) insights.push(`Revenue declined by ${Math.abs(growth).toFixed(1)}% vs the previous period`);

  const onlineRev = bySource['Online Booking'] || 0;
  const walkInRev = bySource['Walk-in / Manual'] || 0;
  if (totalRevenue > 0) {
    if (onlineRev > walkInRev) {
      insights.push(`Online bookings generated ${Math.round((onlineRev / totalRevenue) * 100)}% of total revenue`);
    } else if (walkInRev > 0) {
      insights.push(`Walk-in bookings generated ${Math.round((walkInRev / totalRevenue) * 100)}% of total revenue`);
    }
  }

  const chapaRev = (byPayment['Chapa (Online)'] || 0);
  if (chapaRev > 0 && totalRevenue > 0) {
    insights.push(`Digital payments (Chapa) accounted for ${Math.round((chapaRev / totalRevenue) * 100)}% of revenue`);
  }

  const weekendBookings = bookings.filter((b) => {
    const day = new Date(b.check_in_date).getDay();
    return day === 5 || day === 6;
  });
  if (bookings.length > 0 && weekendBookings.length > bookings.length * 0.4) {
    insights.push(`${Math.round((weekendBookings.length / bookings.length) * 100)}% of bookings were for weekends`);
  }

  if (insights.length === 0) insights.push('No significant trends detected for this period');
  return insights;
}
