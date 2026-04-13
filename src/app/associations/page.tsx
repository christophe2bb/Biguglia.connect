/**
 * Route /associations — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import AssociationsPageClient from './_page.client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Associations à Biguglia — Vie Associative et Clubs Locaux',
  description:
    'Découvrez et rejoignez les associations et clubs de Biguglia : sportifs, culturels, environnementaux… Participez à la vie associative du village.',
  keywords: [
    'associations Biguglia', 'clubs Biguglia', 'vie associative Corse',
    'bénévolat Biguglia', 'association Haute-Corse',
  ],
  alternates: { canonical: `${SITE_URL}/associations` },
  openGraph: {
    title:       'Associations à Biguglia — Vie Associative et Clubs Locaux',
    description: 'Clubs sportifs, associations culturelles et environnementales à Biguglia. Rejoignez la communauté.',
    url:         `${SITE_URL}/associations`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Associations de Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Associations à Biguglia',
    description: 'Vie associative, clubs et bénévolat à Biguglia, Haute-Corse.',
    images:      [OG_IMAGE],
  },
};

export default function AssociationsPage() {
  return <AssociationsPageClient />;
}
