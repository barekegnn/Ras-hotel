// ============================================================
// Testimonials Section
// ============================================================

const TESTIMONIALS = [
  {
    name: 'Amira Hassan',
    origin: 'Addis Ababa, Ethiopia',
    rating: 5,
    text: 'The most authentic experience I\'ve had in Ethiopia. The staff were incredibly warm, the room was spotless, and waking up to the call to prayer inside the old city walls was unforgettable.',
    avatar: 'AH',
    color: 'bg-brand-500',
  },
  {
    name: 'Thomas Müller',
    origin: 'Berlin, Germany',
    rating: 5,
    text: 'Ras Hotel is a hidden gem. The location inside the walled city is unbeatable. The online booking was seamless and I received my confirmation instantly. Will definitely return.',
    avatar: 'TM',
    color: 'bg-harar-500',
  },
  {
    name: 'Fatuma Abdullahi',
    origin: 'Nairobi, Kenya',
    rating: 5,
    text: 'I loved that I could book in Amharic and pay with TeleBirr. The hyena feeding experience arranged by the hotel was the highlight of my entire trip to Ethiopia.',
    avatar: 'FA',
    color: 'bg-sand-600',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-900 via-brand-950 to-harar-950">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">

        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-300">
            Guest Stories
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            What our guests say
          </h2>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map(({ name, origin, rating, text, avatar, color }) => (
            <div key={name}
              className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8
                         hover:bg-white/10 transition-colors">

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: rating }).map((_, i) => (
                  <svg key={i} className="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-white/80 leading-relaxed mb-6 text-sm">
                "{text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${color} flex items-center justify-center
                                 text-white text-sm font-bold flex-shrink-0`}>
                  {avatar}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{name}</p>
                  <p className="text-white/50 text-xs">{origin}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rating summary */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-sm
                          border border-white/20 px-8 py-5">
            <div className="text-center">
              <p className="text-4xl font-bold text-white">5.0</p>
              <div className="flex gap-0.5 mt-1 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div className="text-left">
              <p className="text-white font-semibold">Average guest rating</p>
              <p className="text-white/50 text-sm">Based on verified stays</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
