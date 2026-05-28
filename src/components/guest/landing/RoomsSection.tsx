'use client';

// ============================================================
// Rooms Section — World-class design, real Ras Hotel rooms
// ============================================================

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface RoomType { type: string; min_price: number; count: number; }
interface Props { roomsByType: RoomType[]; rooms: unknown[]; }

// ── Real Ras Hotel room catalogue — 4 types (no Double) ──────
const ROOMS = [
  {
    id:          'single',
    name:        'Single Room',
    price:       2000,
    description: 'Our friendly single rooms are refreshing for individual travelers. One single sized bed and a seating area, flat-screen TV with international channels, and bathroom with a bath or shower.',
    features:    ['Single bed', 'Seating area', 'Flat-screen TV', 'International channels', 'Bath or shower', 'Free WiFi'],
    photos: [
      '/Ras hotel pictures/room types/single room/dsc_1842-jpg.jpg',
      '/Ras hotel pictures/room types/single room/dsc_2202-jpg.jpg',
      '/Ras hotel pictures/room types/single room/dsc_2211-jpg.jpg',
      '/Ras hotel pictures/room types/single room/dsc_2217-jpg.jpg',
      '/Ras hotel pictures/room types/single room/dsc_1805-jpg (1).jpg',
    ],
    badge: null,
    accentColor: 'from-stone-700 to-stone-900',
  },
  {
    id:          'suite',
    name:        'Suite Room',
    price:       4000,
    description: 'Our inspirational Suite rooms offer the perfect place for individuals and couples traveling together. One king sized bed and comprehensive seating area, flat-screen TV with international channels, and bathroom with a bath or shower.',
    features:    ['King bed', 'Comprehensive seating area', 'Flat-screen TV', 'International channels', 'Bath or shower', 'Free WiFi'],
    photos: [
      '/Ras hotel pictures/room types/suit room/dsc_1803-jpg.jpg',
      '/Ras hotel pictures/room types/suit room/dsc_1805-jpg.jpg',
      '/Ras hotel pictures/room types/suit room/dsc_1842-jpg.jpg',
      '/Ras hotel pictures/room types/suit room/dsc_1803-jpg (1).jpg',
    ],
    badge: 'Premium',
    accentColor: 'from-yellow-700 to-yellow-900',
  },
  {
    id:          'twin-small',
    name:        'Twin Small Room',
    price:       2000,
    description: 'Our hospitable Twin rooms offer the perfect respite for friends traveling together, solo travelers or families with two single beds and a seating area, flat-screen TV with international channels, and bathroom with a bath or shower.',
    features:    ['Two single beds', 'Seating area', 'Flat-screen TV', 'International channels', 'Bath or shower', 'Free WiFi'],
    photos: [
      '/Ras hotel pictures/room types/twin small room/dsc_2226-jpg.jpg',
      '/Ras hotel pictures/room types/twin small room/dsc_2227-jpg.jpg',
      '/Ras hotel pictures/room types/twin small room/dsc_2226-jpg (1).jpg',
    ],
    badge: null,
    accentColor: 'from-stone-600 to-stone-800',
  },
  {
    id:          'twin-large',
    name:        'Twin Large Room',
    price:       4000,
    description: 'Our hospitable Twin rooms offer the perfect respite for friends traveling together, solo travelers or families with two bigger single beds and a seating area, flat-screen TV with international channels, and bathroom with a bath or shower.',
    features:    ['Two large single beds', 'Seating area', 'Flat-screen TV', 'International channels', 'Bath or shower', 'Free WiFi'],
    photos: [
      '/Ras hotel pictures/room types/twin large room/dsc_1807-jpg.jpg',
      '/Ras hotel pictures/room types/twin large room/dsc_1807-jpg (1).jpg',
    ],
    badge: null,
    accentColor: 'from-amber-800 to-stone-900',
  },
];

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  );
}

export function RoomsSection({ roomsByType }: Props) {
  const [activeIdx,  setActiveIdx]  = useState(1); // Default: Suite
  const [photoIdx,   setPhotoIdx]   = useState(0);

  const room = ROOMS[activeIdx]!;

  function selectRoom(idx: number) {
    setActiveIdx(idx);
    setPhotoIdx(0);
  }

  // Merge live DB prices if available
  const livePrice = (type: string) => {
    const match = roomsByType.find((r) =>
      r.type.toLowerCase().replace(/\s+/g, '-') === type ||
      r.type.toLowerCase() === type.replace('-', ' ')
    );
    return match?.min_price ?? null;
  };

  return (
    <section id="rooms" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">

        {/* ── Section header ──────────────────────────────────── */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500 mb-3">
            Our Accommodations
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Rooms Crafted for Comfort
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Five distinct room categories — each blending modern amenities with the warmth
            of traditional Harari hospitality.
          </p>
        </div>

        {/* ── Room type selector tabs ──────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {ROOMS.map((r, i) => (
            <button
              key={r.id}
              onClick={() => selectRoom(i)}
              className={`relative rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200
                ${activeIdx === i
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
            >
              {r.name}
              {r.badge && activeIdx !== i && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-amber-500 border-2 border-white" />
              )}
            </button>
          ))}
        </div>

        {/* ── Main room detail card ────────────────────────────── */}
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100 bg-white mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[520px]">

            {/* ── Left: Photo panel ─────────────────────────── */}
            <div className="relative flex flex-col">
              {/* Main photo */}
              <div className="relative flex-1 min-h-[340px] lg:min-h-0 overflow-hidden">
                <Image
                  key={`${room.id}-${photoIdx}`}
                  src={room.photos[photoIdx] ?? room.photos[0]!}
                  alt={`${room.name} at Ras Hotel`}
                  fill
                  className="object-cover transition-all duration-500"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={activeIdx === 1}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {room.badge && (
                    <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      ⭐ {room.badge}
                    </span>
                  )}
                  <span className="rounded-full bg-black/40 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white uppercase tracking-wider">
                    {room.name}
                  </span>
                </div>

                {/* Price overlay */}
                <div className="absolute bottom-4 right-4 text-right">
                  <div className="rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 px-4 py-2">
                    <p className="text-2xl font-bold text-amber-300">
                      ETB {(livePrice(room.id) ?? room.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-white/60">per night</p>
                  </div>
                </div>

                {/* Photo counter */}
                {room.photos.length > 1 && (
                  <div className="absolute bottom-4 left-4 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-xs text-white/70">
                    {photoIdx + 1} / {room.photos.length}
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {room.photos.length > 1 && (
                <div className="flex gap-2 p-3 bg-gray-900 overflow-x-auto scrollbar-none">
                  {room.photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`relative h-16 w-24 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200
                        ${i === photoIdx
                          ? 'ring-2 ring-amber-400 opacity-100 scale-105'
                          : 'opacity-50 hover:opacity-80 hover:scale-102'
                        }`}
                    >
                      <Image src={photo} alt="" fill className="object-cover" sizes="96px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Right: Details panel ──────────────────────── */}
            <div className="flex flex-col p-8 lg:p-10">

              {/* Room name + price */}
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-1">{room.name}</h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-bold text-amber-500">
                    ETB {(livePrice(room.id) ?? room.price).toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-sm">/ night</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed mb-8 text-[15px]">
                {room.description}
              </p>

              {/* Features grid */}
              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  Room features
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {room.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <div className="h-5 w-5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                        <CheckIcon />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* CTA */}
              <div className="pt-6 border-t border-gray-100">
                <Link
                  href="/book"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500
                             py-4 font-bold text-white text-base hover:bg-amber-600 transition-all
                             shadow-lg shadow-amber-200 hover:shadow-xl hover:-translate-y-0.5
                             active:translate-y-0 focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Book {room.name}
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <p className="text-center text-xs text-gray-400 mt-3">
                  Free cancellation · Instant confirmation · No account required
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── All rooms overview grid ──────────────────────────── */}
        <div>
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">
            All room categories
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {ROOMS.map((r, i) => (
              <button
                key={r.id}
                onClick={() => selectRoom(i)}
                className={`group relative rounded-2xl overflow-hidden text-left transition-all duration-200
                  ${activeIdx === i
                    ? 'ring-2 ring-amber-500 shadow-xl shadow-amber-100 scale-[1.03]'
                    : 'border border-gray-200 hover:shadow-lg hover:-translate-y-1 hover:border-amber-200'
                  } bg-white`}
              >
                {/* Photo */}
                <div className="relative h-32 overflow-hidden">
                  <Image
                    src={r.photos[0]!}
                    alt={r.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {r.badge && (
                    <div className="absolute top-2 right-2">
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {r.badge}
                      </span>
                    </div>
                  )}
                  {activeIdx === i && (
                    <div className="absolute inset-0 bg-amber-500/10" />
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className={`font-bold text-sm leading-tight mb-1 ${activeIdx === i ? 'text-amber-600' : 'text-gray-900'}`}>
                    {r.name}
                  </p>
                  <p className="text-amber-500 font-bold text-base leading-none">
                    ETB {(livePrice(r.id) ?? r.price).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">per night</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ───────────────────────────────────────── */}
        <div className="text-center mt-12">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500
                       px-8 py-3 text-sm font-bold text-amber-600 hover:bg-amber-500 hover:text-white
                       transition-all duration-200 hover:shadow-lg hover:shadow-amber-200"
          >
            View all available rooms & book
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
