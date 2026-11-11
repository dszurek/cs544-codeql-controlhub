import type { Metadata } from 'next';
import { Inter, Playfair_Display, IBM_Plex_Mono } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import { appearanceToCss } from '@/lib/appearance';
import { getAppearance } from '@/lib/appearanceStore';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: '700',
  display: 'swap',
});

// IBM Plex Mono — the portfolio's "technical voice"; keeps hub + portfolio
// reading as one family.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ControlHub',
  description: 'Personal productivity hub',
  manifest: '/manifest.webmanifest',
};

// Sets the ambient daypart before first paint so the field never flashes.
// AmbientField (client) keeps it current after hydration.
const dayPartScript = `(function(){var h=new Date().getHours();document.documentElement.dataset.daypart=h>=5&&h<8?'dawn':h>=8&&h<17?'day':h>=17&&h<21?'dusk':'night';})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-rendered so custom appearance applies on first paint (no flash).
  const appearanceCss = appearanceToCss(await getAppearance());

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style id="appearance-vars" dangerouslySetInnerHTML={{ __html: appearanceCss }} />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: dayPartScript }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
