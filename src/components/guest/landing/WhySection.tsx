'use client';

// ============================================================
// WhySection — Ras Café → Conference → Why Ras Hotel → Services
// ============================================================

import { useState } from 'react';
import Image from 'next/image';

// ── YouTube videos ────────────────────────────────────────────
const VIDEOS = [
  {
    id:       'Nvhi6LDYqAE',
    title:    'UNESCO Heritage City',
    subtitle: "Harar Jugol — Africa's Living Museum",
    icon:     '🏛️',
    color:    'from-amber-900/80 to-stone-900/80',
  },
  {
    id:       '4Hj2FsC-y9M',
    title:    'Ethiopian Coffee Ceremony',
    subtitle: 'The birthplace of coffee, served for centuries',
    icon:     '☕',
    color:    'from-stone-800/80 to-amber-900/80',
  },
  {
    id:       'JgWSexGdIQ4',
    title:    'Hyena Feeding Experience',
    subtitle: 'A legendary Harari tradition',
    icon:     '🌙',
    color:    'from-gray-900/80 to-stone-800/80',
  },
];

// ── Services list ─────────────────────────────────────────────
const SERVICES = [
  { icon: '🛎️', label: 'Reception & Concierge' },
  { icon: '🚌', label: 'Shuttle Service' },
  { icon: '🎬', label: 'Ras Cinema & Game Zone' },
  { icon: '📶', label: 'Free Wi-Fi' },
  { icon: '🏧', label: 'ATM' },
  { icon: '👕', label: 'Laundry' },
  { icon: '☕', label: 'Ras Café' },
  { icon: '💱', label: 'Currency Exchange' },
];

// ── Video card with lazy-load thumbnail ───────────────────────
function VideoCard({ video }: { video: typeof VIDEOS[0] }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-white">
      <div className="relative aspect-video bg-gray-900">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group"
            aria-label={`Play ${video.title}`}
          >
            <Image
              src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
              alt={video.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${video.color} opacity-60 group-hover:opacity-40 transition-opacity`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110
                              transition-all duration-200 flex items-center justify-center shadow-2xl">
                <svg className="h-7 w-7 text-red-600 ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
            <div className="absolute bottom-3 right-3">
              <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                YouTube
              </span>
            </div>
          </button>
        )}
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{video.icon}</span>
          <h3 className="font-bold text-gray-900 text-base">{video.title}</h3>
        </div>
        <p className="text-sm text-gray-500">{video.subtitle}</p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export function WhySection() {
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <>
      {/* 1. Ras Café ─────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">On-site dining</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Welcome to Ras Café</h2>
              <p className="text-gray-600 leading-relaxed">
                Ras Café offers a cozy atmosphere where you can relax and unwind with friends or get some
                work done. Freshly brewed coffee, delicious pastries, and light meals made from the finest
                ingredients — your home away from home.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Freshly brewed coffee', 'Pastries & light meals', 'Cozy atmosphere', 'Work-friendly'].map((tag) => (
                  <span key={tag} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] col-span-2">
                <Image src="/Ras hotel pictures/dinning/dsc_2193-jpg.jpg" alt="Ras Café dining area"
                  fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-square">
                <Image src="/Ras hotel pictures/dinning/dsc_2194-jpg.jpg" alt="Ras Café interior"
                  fill className="object-cover" sizes="25vw" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-square">
                <Image src="/Ras hotel pictures/dinning/dsc_2195-jpg.jpg" alt="Ras Café food"
                  fill className="object-cover" sizes="25vw" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Conference & Meeting ─────────────────────────────── */}
      <section className="py-20 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-2 gap-3 order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] col-span-2">
                <Image
                  src="/Ras hotel pictures/conference and meeting/conference and Meeting Hall.jpg"
                  alt="Ras Hotel Conference Hall"
                  fill className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-square">
                <Image src="/Ras hotel pictures/conference and meeting/dsc_2199-jpg.jpg"
                  alt="Meeting setup" fill className="object-cover" sizes="25vw" />
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-square">
                <Image src="/Ras hotel pictures/conference and meeting/resturant-table-set-up-2.jpg"
                  alt="Restaurant table setup" fill className="object-cover" sizes="25vw" />
              </div>
            </div>
            <div className="space-y-5 order-1 lg:order-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Events & Meetings</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Ras Cinema & Conference</h2>
              <p className="text-gray-600 leading-relaxed">
                Ras Cinema isn&apos;t just the top destination for movies — it&apos;s also the perfect venue
                for your next big meeting. With exceptional screens and sound systems, your message will be
                seen and heard clearly.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Cinema screening', 'Corporate meetings', 'Exceptional AV', 'Flexible seating'].map((tag) => (
                  <span key={tag} className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Ras Hotel — YouTube videos ──────────────────── */}
      <section id="why" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 mb-3">
              Why Ras Hotel
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              More than a place to sleep
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              An immersive gateway into one of Ethiopia&apos;s most extraordinary cities.
              Watch and discover what awaits you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
            {VIDEOS.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '📱', title: 'Seamless Digital Booking', desc: 'Book in minutes with TeleBirr, CBE Birr, or Chapa. Instant SMS confirmation.' },
              { icon: '🛡️', title: 'Flexible Cancellation',   desc: 'Cancel up to 48 hours before check-in for a full refund — no questions asked.' },
              { icon: '🌍', title: 'Multilingual Support',     desc: 'Our AI assistant and staff speak English, Amharic, and Afaan Oromo.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-amber-100 bg-amber-50 p-5 flex gap-4">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <blockquote className="max-w-2xl mx-auto">
              <div className="text-5xl text-amber-200 font-serif leading-none mb-3">&ldquo;</div>
              <p className="text-lg sm:text-xl text-gray-600 font-medium leading-relaxed italic">
                Harar is a city where every alley tells a story, every meal is a ceremony,
                and every guest becomes part of the family.
              </p>
              <footer className="mt-4 text-sm text-gray-400 font-semibold">— The Ras Hotel Team</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* 4. Services — compact collapsible strip ────────────── */}
      <section id="services" className="bg-gray-900 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <button
            onClick={() => setServicesOpen((o) => !o)}
            className="w-full flex items-center justify-between py-4 text-left group"
            aria-expanded={servicesOpen}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">
                Hotel Services
              </span>
              <span className="text-xs text-gray-500">— {SERVICES.length} amenities included</span>
            </div>
            <svg
              className={`h-4 w-4 text-gray-500 group-hover:text-amber-400 transition-transform duration-200
                ${servicesOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {servicesOpen && (
            <div className="pb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SERVICES.map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-xl bg-gray-800 px-4 py-3">
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <span className="text-sm text-gray-300 font-medium">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
