'use client';

// ============================================================
// Hero Section — Auto-advancing carousel with real hotel photos
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Props {
  hotelName: string;
  hotelAddress: string;
  minPrice: number;
}

// Best hotel photos for the hero carousel (non-room, non-toilet shots)
const SLIDES = [
  {
    src:     '/Ras hotel pictures/dsc_2220-jpg.jpg',
    caption: 'Experience Authentic Ethiopian Hospitality',
    sub:     'Inside the UNESCO World Heritage walled city of Harar',
  },
  {
    src:     '/Ras hotel pictures/dsc_2210-jpg.jpg',
    caption: 'Where History Meets Comfort',
    sub:     'Centuries of culture, coffee, and warm Harari welcome',
  },
  {
    src:     '/Ras hotel pictures/dsc_2191-jpg.jpg',
    caption: 'Your Home in Ancient Harar',
    sub:     'Modern amenities in the heart of a living heritage city',
  },
  {
    src:     '/Ras hotel pictures/dsc_1834-jpg.jpg',
    caption: 'Discover the Magic of Harar Jugol',
    sub:     'One of Africa\'s most sacred and captivating cities',
  },
  {
    src:     '/Ras hotel pictures/dsc_2206-jpg.jpg',
    caption: 'Comfort, Culture & Connection',
    sub:     'Rooms from ETB 2,000 · Free WiFi · 24/7 Reception',
  },
];

const INTERVAL = 5000; // 5 s per slide

export function HeroSection({ hotelAddress, minPrice }: Props) {
  const router   = useRouter();
  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [checkIn,  setCheckIn]  = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [current,  setCurrent]  = useState(0);
  const [paused,   setPaused]   = useState(false);
  const [animDir,  setAnimDir]  = useState<'left' | 'right'>('left');

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setAnimDir('left');
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [paused]);

  const goTo = useCallback((idx: number) => {
    setAnimDir(idx > current ? 'left' : 'right');
    setCurrent(idx);
    setPaused(true);
    setTimeout(() => setPaused(false), 8000); // resume after 8 s
  }, [current]);

  const prev = () => goTo((current - 1 + SLIDES.length) % SLIDES.length);
  const next = () => goTo((current + 1) % SLIDES.length);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/book?check_in=${checkIn}&check_out=${checkOut}`);
  }

  const nights = Math.max(1, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));

  const slide = SLIDES[current]!;

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >

      {/* ── Carousel background ──────────────────────────────── */}
      {SLIDES.map((s, i) => (
        <div
          key={s.src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out
            ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          <Image
            src={s.src}
            alt={s.caption}
            fill
            className="object-cover object-center"
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Overlays */}
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/55 via-black/35 to-black/75" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 z-20 bg-gradient-to-t from-black/60 to-transparent" />

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="relative z-30 w-full max-w-5xl mx-auto px-6 sm:px-8 pt-20 pb-36 text-center">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/Ras hotel pictures/RAS-HOTEL.png"
            alt="Ras Hotel"
            width={200}
            height={72}
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>

        {/* Location pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-5 py-2 mb-7">
          <svg className="h-3.5 w-3.5 text-amber-300 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span className="text-xs font-semibold text-white/90 tracking-widest uppercase">
            {hotelAddress}
          </span>
        </div>

        {/* Animated headline — changes with slide */}
        <div className="min-h-[120px] sm:min-h-[100px] flex flex-col items-center justify-center mb-4">
          <h1
            key={current}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight
                       animate-fade-in-up"
          >
            {slide.caption}
          </h1>
          <p
            key={`sub-${current}`}
            className="mt-3 text-base sm:text-lg text-white/70 max-w-xl mx-auto animate-fade-in-up animation-delay-100"
          >
            {slide.sub}
          </p>
        </div>

        <p className="text-sm text-white/50 mb-10">
          Rooms from{' '}
          <span className="text-amber-300 font-bold text-base">ETB {minPrice.toLocaleString()}</span>
          {' '}per night
        </p>

        {/* ── Availability search ───────────────────────────── */}
        <form onSubmit={handleSearch}
          className="mx-auto max-w-3xl rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-2 shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-2">

            <div className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 transition-colors px-4 py-3 text-left">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Check-in</label>
              <input type="date" value={checkIn} min={today}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (e.target.value >= checkOut)
                    setCheckOut(new Date(new Date(e.target.value).getTime() + 86400000).toISOString().slice(0, 10));
                }}
                className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none [color-scheme:dark] cursor-pointer"
              />
            </div>

            <div className="hidden sm:flex items-center justify-center text-white/30 px-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>

            <div className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 transition-colors px-4 py-3 text-left">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Check-out</label>
              <input type="date" value={checkOut} min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none [color-scheme:dark] cursor-pointer"
              />
            </div>

            <div className="hidden sm:flex flex-col items-center justify-center px-4 py-3 text-center min-w-[72px]">
              <span className="text-2xl font-bold text-white leading-none">{nights}</span>
              <span className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">
                {nights === 1 ? 'night' : 'nights'}
              </span>
            </div>

            <button type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                         px-8 py-3 font-bold text-white text-sm transition-all
                         shadow-lg shadow-amber-900/40 hover:-translate-y-0.5
                         flex items-center justify-center gap-2 whitespace-nowrap">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Check availability
            </button>
          </div>
        </form>

        {/* Trust signals */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-5 text-white/40 text-xs">
          {['🔒 Secure booking', '✓ Instant confirmation', '↩ Free cancellation 48h+', '💳 TeleBirr & CBE Birr'].map((t) => (
            <span key={t} className="font-medium">{t}</span>
          ))}
        </div>
      </div>

      {/* ── Carousel controls ─────────────────────────────────── */}

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40
                   h-11 w-11 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm
                   border border-white/20 flex items-center justify-center text-white
                   transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40
                   h-11 w-11 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm
                   border border-white/20 flex items-center justify-center text-white
                   transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* Dot indicators + progress bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
        {/* Progress bar for current slide */}
        <div className="w-32 h-0.5 bg-white/20 rounded-full overflow-hidden">
          <div
            key={current}
            className="h-full bg-amber-400 rounded-full"
            style={{
              animation: paused ? 'none' : `progress ${INTERVAL}ms linear forwards`,
            }}
          />
        </div>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                ${i === current
                  ? 'w-6 h-2 bg-amber-400'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
            />
          ))}
        </div>

        {/* Slide counter */}
        <span className="text-[10px] text-white/40 font-semibold tracking-widest">
          {String(current + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </span>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 right-8 z-40 hidden lg:flex flex-col items-center gap-1.5 text-white/30 animate-bounce">
        <span className="text-[10px] uppercase tracking-widest font-semibold">Scroll</span>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animation-delay-100 {
          animation-delay: 0.1s;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
