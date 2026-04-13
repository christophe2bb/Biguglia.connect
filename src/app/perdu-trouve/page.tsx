/**
 * Route /perdu-trouve — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import PerduTrouvePageClient from './_page.client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Objets Perdus & Trouvés à Biguglia — Signalez & Retrouvez',
  description:
    'Signalez un objet perdu ou retrouvé à Biguglia. La plateforme de la communauté pour retrouver clés, animaux, portefeuilles et tout autre objet égaré dans le village.',
  keywords: [
    'objet perdu Biguglia', 'objet trouvé Biguglia', 'perdu trouvé Corse',
    'animal perdu Biguglia', 'clés perdues Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/perdu-trouve` },
  openGraph: {
    title:       'Objets Perdus & Trouvés à Biguglia',
    description: 'Signalez ou retrouvez un objet perdu à Biguglia. Clés, animaux, objets égarés dans le village.',
    url:         `${SITE_URL}/perdu-trouve`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Perdu-Trouvé Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Objets Perdus & Trouvés à Biguglia',
    description: 'Retrouvez ou signalez des objets perdus à Biguglia, Haute-Corse.',
    images:      [OG_IMAGE],
  },
};

export default function PerduTrouvePage() {
  return <PerduTrouvePageClient />;
}
