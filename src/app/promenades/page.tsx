/**
 * Route /promenades — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import PromenadePageClient from './_page.client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-etang.jpg`;

export const metadata: Metadata = {
  title: 'Promenades & Sorties à Biguglia — Randonnées et Activités Nature',
  description:
    'Découvrez les promenades et sorties organisées à Biguglia et autour de l\'étang de Biguglia : randonnées, balades nature, activités plein air entre habitants.',
  keywords: [
    'promenades Biguglia', 'randonnées Biguglia', 'étang Biguglia',
    'nature Haute-Corse', 'balade Biguglia', 'sortie nature Corse',
  ],
  alternates: { canonical: `${SITE_URL}/promenades` },
  openGraph: {
    title:       'Promenades & Sorties à Biguglia — Nature et Étang',
    description: 'Randonnées, balades autour de l\'étang de Biguglia et sorties nature entre habitants.',
    url:         `${SITE_URL}/promenades`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Étang de Biguglia — promenades' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Promenades & Sorties à Biguglia',
    description: 'Randonnées et balades autour de l\'étang de Biguglia, Haute-Corse.',
    images:      [OG_IMAGE],
  },
};

export default function PromenadePage() {
  return <PromenadePageClient />;
}
