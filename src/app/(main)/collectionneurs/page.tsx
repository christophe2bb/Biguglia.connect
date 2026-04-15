/**
 * Route /collectionneurs — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import CollectionneursPageClient from './_page.client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Collectionneurs à Biguglia — Échanges & Passions entre Passionnés',
  description:
    'Espace dédié aux collectionneurs de Biguglia : échangez, achetez, vendez ou discutez de vos collections avec d\'autres passionnés du village et de la région.',
  keywords: [
    'collectionneurs Biguglia', 'collections Corse', 'brocante Biguglia',
    'échange collection Haute-Corse', 'passionnés Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/collectionneurs` },
  openGraph: {
    title:       'Collectionneurs à Biguglia — Échanges & Passions',
    description: 'Échangez et discutez de vos collections avec d\'autres passionnés de Biguglia.',
    url:         `${SITE_URL}/collectionneurs`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Collectionneurs à Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Collectionneurs à Biguglia',
    description: 'Échanges et passions entre collectionneurs de Biguglia, Corse.',
    images:      [OG_IMAGE],
  },
};

export default function CollectionneursPage() {
  return <CollectionneursPageClient />;
}
