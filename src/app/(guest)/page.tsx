// ============================================================
// Ras Hotel — Landing Page
// src/app/(guest)/page.tsx
//
// Server Component: fetches live rooms + hotel config from DB.
// Client islands handle the availability search and animations.
// Requirements 3.1, 3.7, 9.1–9.4, 11.6, 18.1–18.4
// ============================================================

import { Suspense } from 'react';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase.server';
import { resolveNightlyRate } from '@/modules/pricing/infrastructure/repository';
import { HeroSection } from '@/components/guest/landing/HeroSection';
import { RoomsSection } from '@/components/guest/landing/RoomsSection';
import { WhySection } from '@/components/guest/landing/WhySection';
import { LocationSection } from '@/components/guest/landing/LocationSection';
import { TestimonialsSection } from '@/components/guest/landing/TestimonialsSection';
import { CtaSection } from '@/components/guest/landing/CtaSection';
import { StatsSection } from '@/components/guest/landing/StatsSection';

// ── Data fetching ─────────────────────────────────────────────

async function getHotelData() {
  const supabase = createSupabaseServiceClient();

  // Fetch rooms and hotel config in parallel
  const [roomsResult, configResult, statsResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, room_type, floor, description, base_price_per_night, status')
      .eq('is_active', true)
      .order('base_price_per_night'),
    supabase
      .from('hotel_configuration')
      .select('key, value'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('booking_status', ['checked_out', 'checked_in', 'paid']),
  ]);

  const rooms = roomsResult.data ?? [];
  const configMap = Object.fromEntries(
    (configResult.data ?? []).map((c) => [c.key, c.value])
  );
  const totalGuests = statsResult.count ?? 0;

  // Resolve current nightly rates for each room
  const today = new Date();
  const roomsWithRates = await Promise.all(
    rooms.map(async (room) => {
      const nightlyRate = await resolveNightlyRate(
        room.room_type,
        today,
        room.base_price_per_night
      );
      return { ...room, nightly_rate: nightlyRate };
    })
  );

  // Group rooms by type for display
  const roomsByType = roomsWithRates.reduce((acc, room) => {
    if (!acc[room.room_type]) {
      acc[room.room_type] = {
        type: room.room_type,
        min_price: room.nightly_rate,
        count: 0,
        rooms: [],
      };
    }
    const entry = acc[room.room_type]!;
    entry.rooms.push(room);
    entry.count++;
    if (room.nightly_rate < entry.min_price) {
      entry.min_price = room.nightly_rate;
    }
    return acc;
  }, {} as Record<string, { type: string; min_price: number; count: number; rooms: typeof roomsWithRates }>);

  return {
    rooms: roomsWithRates,
    roomsByType: Object.values(roomsByType),
    totalRooms: rooms.length,
    totalGuests,
    config: configMap,
  };
}

// ── Page ──────────────────────────────────────────────────────

export default async function LandingPage() {
  const { rooms, roomsByType, totalRooms, totalGuests, config } = await getHotelData();

  const hotelName    = config.hotel_name    ?? 'Ras Hotel';
  const hotelAddress = config.hotel_address ?? 'Harar, Ethiopia';
  const hotelPhone   = config.hotel_phone   ?? '+251 XXX XXX XXX';
  const checkinTime  = config.checkin_time  ?? '14:00';
  const checkoutTime = config.checkout_time ?? '12:00';

  return (
    <div className="overflow-x-hidden">
      {/* 1. Hero — full-screen with live availability search */}
      <HeroSection
        hotelName={hotelName}
        hotelAddress={hotelAddress}
        minPrice={rooms.length > 0 ? Math.min(...rooms.map(r => r.nightly_rate)) : 2500}
      />

      {/* 2. Live stats bar */}
      <StatsSection
        totalRooms={totalRooms}
        totalGuests={totalGuests}
        checkinTime={checkinTime}
        checkoutTime={checkoutTime}
      />

      {/* 3. Rooms showcase — live from DB */}
      <Suspense fallback={<RoomsSkeleton />}>
        <RoomsSection roomsByType={roomsByType} rooms={rooms} />
      </Suspense>

      {/* 4. Why choose us */}
      <WhySection />

      {/* 5. Testimonials */}
      <TestimonialsSection />

      {/* 6. Location map */}
      <LocationSection
        address={hotelAddress}
        phone={hotelPhone}
        mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}
      />

      {/* 7. Final CTA */}
      <CtaSection minPrice={rooms.length > 0 ? Math.min(...rooms.map(r => r.nightly_rate)) : 2500} />
    </div>
  );
}

function RoomsSkeleton() {
  return (
    <section className="py-24 bg-sand-50">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white overflow-hidden animate-pulse">
              <div className="h-56 bg-gray-200" />
              <div className="p-6 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
