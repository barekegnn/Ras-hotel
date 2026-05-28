'use client';

// ============================================================
// Location Section — Google Maps embed + hotel info
// Requirements 9.1–9.4
// ============================================================

import { useState } from 'react';

interface Props {
  address: string;
  phone: string;
  mapsApiKey: string;
}

// Harar Jugol (walled city) — real coordinates
const HARAR_LAT = 9.3119;
const HARAR_LNG = 42.1197;

export function LocationSection({ address, phone, mapsApiKey }: Props) {
  const [mapError, setMapError] = useState(false);

  const mapsEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=Harar+Jugol+Ethiopia&zoom=15`
    : null;

  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${HARAR_LAT},${HARAR_LNG}`;

  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">

        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-500">
            Find Us
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
            In the heart of Harar
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Located inside the ancient walled city of Harar Jugol — a UNESCO World Heritage Site
            and one of Islam's holiest cities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* Map — takes 3/5 of the width */}
          <div className="lg:col-span-3 rounded-2xl overflow-hidden shadow-xl border border-gray-200 aspect-[4/3]">
            {!mapError && mapsEmbedUrl ? (
              <iframe
                src={mapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onError={() => setMapError(true)}
                title="Ras Hotel location"
              />
            ) : (
              /* Fallback when map unavailable (Req 9.4) */
              <div className="w-full h-full bg-gradient-to-br from-harar-50 to-brand-50
                              flex flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="text-5xl">🗺️</div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">Harar Jugol, Ethiopia</p>
                  <p className="text-gray-600 mt-1">{address || 'Inside the walled city of Harar'}</p>
                </div>
                <a
                  href={googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5
                             text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Open in Google Maps
                </a>
              </div>
            )}
          </div>

          {/* Info panel — takes 2/5 */}
          <div className="lg:col-span-2 space-y-6">

            {/* Address card */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Getting here</h3>

              {[
                {
                  icon: (
                    <svg className="h-5 w-5 text-brand-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  ),
                  label: 'Address',
                  value: address || 'Harar Jugol (Walled City), Harar, Ethiopia',
                },
                {
                  icon: (
                    <svg className="h-5 w-5 text-brand-500" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.79-1.79a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  ),
                  label: 'Phone',
                  value: phone || '+251256660027',
                  href: `tel:${(phone || '+251256660027').split(',')[0]!.trim()}`,
                },
                {
                  icon: (
                    <svg className="h-5 w-5 text-brand-500" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  ),
                  label: 'Email',
                  value: 'reservation@hararrashotel.com',
                  href: 'mailto:reservation@hararrashotel.com',
                },
              ].map(({ icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
                    {href ? (
                      <a href={href} className="text-sm text-gray-900 hover:text-brand-600 transition-colors font-medium">
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-900 font-medium">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Directions button */}
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand-500
                         px-6 py-3.5 font-semibold text-white hover:bg-brand-600 transition-all
                         shadow-md shadow-brand-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Get directions
            </a>

            {/* Nearby highlights */}
            <div className="rounded-2xl border border-harar-200 bg-harar-50 p-6">
              <h4 className="font-bold text-harar-900 mb-3 text-sm uppercase tracking-wide">
                Nearby attractions
              </h4>
              <ul className="space-y-2">
                {[
                  { name: 'Harar Jugol Walls', dist: '2 min walk' },
                  { name: 'Arthur Rimbaud Museum', dist: '5 min walk' },
                  { name: 'Hyena Feeding Site', dist: '10 min walk' },
                  { name: 'Harar Grand Mosque', dist: '3 min walk' },
                ].map(({ name, dist }) => (
                  <li key={name} className="flex items-center justify-between text-sm">
                    <span className="text-harar-800 font-medium">{name}</span>
                    <span className="text-harar-600 text-xs">{dist}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
