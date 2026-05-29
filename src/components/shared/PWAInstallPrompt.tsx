'use client';

// ============================================================
// PWA Install Prompt
// src/components/shared/PWAInstallPrompt.tsx
//
// Smooth, non-intrusive slide-up banner that prompts users to
// install the app. Appears after 30s on first visit, never
// again after dismiss or install.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

const STORAGE_KEY = 'pwa-install-dismissed';
const DELAY_MS    = 30_000; // show after 30 seconds

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BannerState = 'hidden' | 'visible' | 'installing' | 'installed';

export function PWAInstallPrompt() {
  const [state,       setState]       = useState<BannerState>('hidden');
  const [deferredEvt, setDeferredEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS,       setIsIOS]       = useState(false);

  useEffect(() => {
    // Already dismissed or installed — never show again
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS manual-install instructions after delay
      const t = setTimeout(() => setState('visible'), DELAY_MS);
      return () => clearTimeout(t);
    }

    // Chrome / Edge / Android — capture the native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvt(e as BeforeInstallPromptEvent);
      const t = setTimeout(() => setState('visible'), DELAY_MS);
      // Store timer ref for cleanup
      (handler as any)._timer = t;
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also listen for successful install
    window.addEventListener('appinstalled', () => {
      setState('installed');
      localStorage.setItem(STORAGE_KEY, 'installed');
      setTimeout(() => setState('hidden'), 3000);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if ((handler as any)._timer) clearTimeout((handler as any)._timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredEvt) return;
    setState('installing');
    await deferredEvt.prompt();
    const { outcome } = await deferredEvt.userChoice;
    if (outcome === 'accepted') {
      setState('installed');
      localStorage.setItem(STORAGE_KEY, 'installed');
      setTimeout(() => setState('hidden'), 3000);
    } else {
      setState('visible');
    }
  }, [deferredEvt]);

  const handleDismiss = useCallback(() => {
    setState('hidden');
    localStorage.setItem(STORAGE_KEY, 'dismissed');
  }, []);

  if (state === 'hidden') return null;

  // ── Installed confirmation toast ─────────────────────────
  if (state === 'installed') {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
                      flex items-center gap-3 rounded-2xl bg-green-600 px-5 py-3.5
                      shadow-2xl text-white text-sm font-semibold
                      animate-slide-up">
        <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        Ras Hotel added to your home screen!
      </div>
    );
  }

  // ── iOS manual instructions ───────────────────────────────
  if (isIOS) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-6 pt-2
                       ${state === 'visible' ? 'animate-slide-up' : ''}`}>
        <div className="mx-auto max-w-sm rounded-2xl bg-gray-900/95 backdrop-blur-xl
                        border border-white/10 shadow-2xl overflow-hidden">
          {/* Top accent line */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10">
                  <Image
                    src="/Ras hotel pictures/harar-ras-hotel-logo-footer2.png"
                    alt="Ras Hotel"
                    width={44}
                    height={44}
                    className="object-contain w-full h-full"
                  />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">Ras Hotel</p>
                  <p className="text-gray-400 text-xs">Add to Home Screen</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center
                           justify-center text-gray-400 hover:text-white transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* iOS instructions */}
            <p className="text-gray-300 text-xs leading-relaxed mb-4">
              Install this app for quick access to bookings, room availability, and more — no App Store needed.
            </p>
            <div className="space-y-2.5">
              {[
                { step: '1', icon: 'share',   text: 'Tap the Share button in Safari' },
                { step: '2', icon: 'plus-box', text: 'Select "Add to Home Screen"' },
                { step: '3', icon: 'check',   text: 'Tap "Add" to confirm' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="h-5 w-5 rounded-full bg-amber-500/20 border border-amber-500/40
                                   text-amber-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {step}
                  </span>
                  <span className="text-gray-300 text-xs">{text}</span>
                </div>
              ))}
            </div>

            {/* iOS share icon hint */}
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 px-4">
              <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span className="text-gray-400 text-xs">Look for this icon in your browser toolbar</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Chrome / Android / Desktop install banner ─────────────
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-6 pt-2
                     ${state === 'visible' || state === 'installing' ? 'animate-slide-up' : ''}`}>
      <div className="mx-auto max-w-sm rounded-2xl bg-gray-900/95 backdrop-blur-xl
                      border border-white/10 shadow-2xl overflow-hidden">
        {/* Top accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10">
                <Image
                  src="/Ras hotel pictures/harar-ras-hotel-logo-footer2.png"
                  alt="Ras Hotel"
                  width={48}
                  height={48}
                  className="object-contain w-full h-full"
                />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Ras Hotel Harar</p>
                <p className="text-gray-400 text-xs mt-0.5">Install the app — it&apos;s free</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center
                         justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0 mt-0.5"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { icon: '⚡', label: 'Fast access' },
              { icon: '📶', label: 'Works offline' },
              { icon: '🔔', label: 'No App Store' },
            ].map(({ icon, label }) => (
              <div key={label}
                className="flex flex-col items-center gap-1 rounded-xl bg-white/5 py-2.5 px-2 text-center">
                <span className="text-lg leading-none">{icon}</span>
                <span className="text-gray-400 text-[10px] font-medium leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10
                         py-2.5 text-sm font-medium text-gray-400 hover:text-white
                         transition-all duration-200"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              disabled={state === 'installing'}
              className="flex-[2] rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                         py-2.5 text-sm font-semibold text-white transition-all duration-200
                         shadow-lg shadow-amber-900/40 hover:-translate-y-0.5
                         disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0
                         flex items-center justify-center gap-2"
            >
              {state === 'installing' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Installing…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Install app
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
