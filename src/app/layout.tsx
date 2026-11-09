import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter_Tight } from 'next/font/google';
import '@/styles/plan.css';
import '@/styles/globals.css';
import { withBase } from '@/lib/base';

// latin-ext : caractères roumains et polonais (ă, ș, ł, ż…)
const font = Inter_Tight({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Plans de la carrière',
  description: 'Plan de circulation, itinéraires vers les produits, poste de chargement (trémie) et maquette 3D de la carrière.',
  icons: { icon: withBase('/favicon.svg'), apple: withBase('/icons/apple-touch-icon.png') },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e6e5e1' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0d' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}
