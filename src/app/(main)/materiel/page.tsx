/**
 * Route /materiel — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import MaterielPageClient from './_page.client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Prêt de Matériel à Biguglia — Outils & Équipements entre Voisins',
  description:
    'Empruntez ou prêtez du matériel entre habitants de Biguglia : outils, équipements de jardinage, matériel de bricolage… La bibliothèque d\'objets du village.',
  keywords: [
    'prêt matériel Biguglia', 'emprunt outils Biguglia', 'troc matériel Corse',
    'partage outils village', 'matériel bricolage Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/materiel` },
  openGraph: {
    title:       'Prêt de Matériel à Biguglia — Outils & Équipements entre Voisins',
    description: 'Empruntez ou prêtez du matériel entre habitants de Biguglia. Outils, équipements et plus.',
    url:         `${SITE_URL}/materiel`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Prêt de matériel Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Prêt de Matériel à Biguglia',
    description: 'Empruntez ou prêtez outils et équipements entre voisins à Biguglia.',
    images:      [OG_IMAGE],
  },
};

export default function MaterielPage() {
  return <MaterielPageClient />;
}
