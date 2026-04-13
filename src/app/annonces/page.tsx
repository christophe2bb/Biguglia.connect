/**
 * Route /annonces — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import AnnoncesPageClient from './_page.client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Petites Annonces à Biguglia — Vente, Location, Dons',
  description:
    'Parcourez les petites annonces de Biguglia : vente de particulier à particulier, location, dons et échanges entre habitants du village. Déposez votre annonce gratuitement.',
  keywords: [
    'petites annonces Biguglia', 'vente Biguglia', 'annonces Corse',
    'don objet Biguglia', 'annonces particulier Haute-Corse',
  ],
  alternates: { canonical: `${SITE_URL}/annonces` },
  openGraph: {
    title:       'Petites Annonces à Biguglia — Vente, Location, Dons',
    description: 'Vente, location, dons entre habitants de Biguglia. Déposez votre annonce gratuitement.',
    url:         `${SITE_URL}/annonces`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Annonces Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Petites Annonces à Biguglia',
    description: 'Vente, location, dons entre habitants de Biguglia.',
    images:      [OG_IMAGE],
  },
};

export default function AnnoncesPage() {
  return <AnnoncesPageClient />;
}
