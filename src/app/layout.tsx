import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       { default: 'Ras Hotel', template: '%s · Ras Hotel' },
  description: 'Hotel management and booking platform — Harar, Ethiopia',
  manifest:    '/manifest.json',
  icons: {
    icon:  '/icons/icon-192.png',
    apple: '/icons/icon-512.png',
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
