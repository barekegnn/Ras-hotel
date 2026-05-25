'use client';

// ============================================================
// Guest Home Page
// src/app/(guest)/page.tsx
//
// Beautiful landing page with booking flow CTA.
// Requirements 18.1–18.4, 3.4–3.12
// ============================================================

import Link from 'next/link';
import Image from 'next/image';

export default function GuestHomePage() {
  return (
    <div className="space-y-0">

      {/* Hero section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-harar-50 -z-10" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob -z-10" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-harar-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 -z-10" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 sm:px-8 py-20 text-center space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wider text-harar-600">
              Welcome to Harar
            </p>
            <h1 className="text-5xl sm:text-7xl font-bold text-gray-900 leading-tight">
              Ras Hotel
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Experience authentic Ethiopian hospitality in the heart of the historic walled city. 
              Your gateway to Harar's culture, coffee, and centuries-old traditions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link href="/book"
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-8 py-3.5
                         text-lg font-semibold text-white shadow-lg hover:bg-brand-600 transition-all
                         hover:shadow-xl hover:-translate-y-1">
              Book your stay
            </Link>
            <Link href="#amenities"
              className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 bg-white
                         px-8 py-3.5 text-lg font-semibold text-gray-900 hover:border-gray-400 transition-all">
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-3 gap-8 sm:gap-16">
            <div className="text-center">
              <p className="text-4xl font-bold text-brand-600">25+</p>
              <p className="text-sm text-gray-600 mt-2">Carefully designed rooms</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-harar-600">500+</p>
              <p className="text-sm text-gray-600 mt-2">Happy guests annually</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-brand-600">10/10</p>
              <p className="text-sm text-gray-600 mt-2">Guest satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Room types showcase */}
      <section id="amenities" className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="mb-16 text-center space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">Room types</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Each room is thoughtfully appointed with modern amenities and traditional Harari touches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Standard', price: 2500, features: ['Queen bed', 'Ensuite bath', 'Free WiFi', 'City view'] },
              { name: 'Deluxe', price: 3500, features: ['King bed', 'Sitting area', 'Rain shower', 'Minibar'] },
              { name: 'Suite', price: 5000, features: ['Separate living', 'Jacuzzi bath', 'Premium linens', 'Terrace'] },
            ].map(({ name, price, features }) => (
              <div key={name}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-gradient-to-br from-brand-100 to-harar-100" />
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{name}</h3>
                    <p className="text-2xl font-bold text-brand-600 mt-1">ETB {price}</p>
                    <p className="text-xs text-gray-500 mt-0.5">per night</p>
                  </div>
                  <ul className="space-y-2">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-harar-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/book" className="btn-primary w-full justify-center mt-4">
                    Select this room
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900">
                Why choose Ras Hotel?
              </h2>
              <div className="space-y-4">
                {[
                  { title: 'Historic location', desc: 'Nestled in the heart of Harar\'s walled medina' },
                  { title: 'Authentic hospitality', desc: 'Genuine Ethiopian welcome and service' },
                  { title: 'Local experience', desc: 'Direct connection to Harar\'s culture and coffee' },
                  { title: '24/7 support', desc: 'Always available to help with your stay' },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="h-6 w-6 flex-shrink-0 rounded-full bg-brand-100 flex items-center justify-center">
                      <span className="text-brand-600 font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-brand-100 to-harar-100 aspect-square" />
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-gradient-to-r from-brand-500 to-harar-600 text-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-6 sm:px-8 text-center space-y-6">
          <h2 className="text-4xl font-bold">
            Ready to experience Ras Hotel?
          </h2>
          <p className="text-lg opacity-90">
            Book your stay today and immerse yourself in Harar's rich culture and history.
          </p>
          <Link href="/book"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5
                       text-lg font-semibold text-brand-600 shadow-lg hover:shadow-xl
                       transition-all hover:-translate-y-1">
            Start booking
          </Link>
        </div>
      </section>
    </div>
  );
}
