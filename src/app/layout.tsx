import type { Metadata, Viewport } from 'next';
import {
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Playfair_Display,
  Source_Serif_4,
} from 'next/font/google';
import './globals.css';

// ── Self-hosted, subset fonts via next/font (no render-blocking @import) ──
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title:       { default: 'Ras Hotel', template: '%s · Ras Hotel' },
  description: 'Hotel management and booking platform — Harar, Ethiopia',
  manifest:    '/manifest.json',
  icons: {
    icon:       [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple:      '/icons/apple-touch-icon.png',
    shortcut:   '/icons/icon-512.png',
  },
  appleWebApp: {
    capable:           true,
    statusBarStyle:    'default',
    title:             'Ras Hotel',
  },
};

export const viewport: Viewport = {
  themeColor:    '#d96428',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${playfairDisplay.variable} ${sourceSerif4.variable}`}>
      <head>
        {/* Unregister stale service workers from old next-pwa@5 before new SW registers */}
        <script src="/sw-cleanup.js" async />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
