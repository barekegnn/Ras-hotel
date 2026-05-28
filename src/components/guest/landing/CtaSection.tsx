// ============================================================
// Final CTA Section
// ============================================================

import Link from 'next/link';

interface Props {
  minPrice: number;
}

export function CtaSection({ minPrice }: Props) {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-600 to-harar-700" />
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-harar-900/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 sm:px-8 text-center space-y-8">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm
                        border border-white/30 px-4 py-2">
          <span className="text-yellow-300">⭐</span>
          <span className="text-sm font-semibold text-white">
            From ETB {minPrice.toLocaleString()} per night
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-4xl sm:text-6xl font-bold text-white leading-tight">
          Your Harar adventure
          <br />
          <span className="text-sand-200">starts here</span>
        </h2>

        <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
          Join thousands of guests who have discovered the magic of Harar through Ras Hotel.
          Book today and experience Ethiopia's most captivating city.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/book"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white
                       px-8 py-4 text-lg font-bold text-brand-600
                       hover:bg-sand-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Book your stay now
          </Link>
          <Link href="/lookup"
            className="inline-flex items-center justify-center gap-2 rounded-xl
                       border-2 border-white/40 bg-white/10 backdrop-blur-sm
                       px-8 py-4 text-lg font-semibold text-white
                       hover:bg-white/20 transition-all">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Find my booking
          </Link>
        </div>

        {/* Reassurance */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm pt-4">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            No account required
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Instant confirmation
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Free cancellation 48h+
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            TeleBirr & CBE Birr accepted
          </span>
        </div>
      </div>
    </section>
  );
}
