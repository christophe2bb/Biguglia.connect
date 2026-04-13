/**
 * Route /coups-de-main — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import CoupsDeMainPageClient from './_page.client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Coups de Main à Biguglia — Entraide & Bénévolat entre Voisins',
  description:
    'Demandez ou proposez un coup de main à Biguglia : aide au déménagement, jardinage, garde d\'animaux, petits travaux… L\'entraide entre voisins du village.',
  keywords: [
    'coup de main Biguglia', 'entraide Biguglia', 'bénévolat Biguglia',
    'aide voisin Corse', 'solidarité village Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/coups-de-main` },
  openGraph: {
    title:       'Coups de Main à Biguglia — Entraide & Bénévolat',
    description: 'Proposez ou demandez un coup de main entre voisins à Biguglia. Déménagement, jardinage, petits travaux.',
    url:         `${SITE_URL}/coups-de-main`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Entraide à Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Coups de Main à Biguglia',
    description: 'Entraide et solidarité entre habitants de Biguglia.',
    images:      [OG_IMAGE],
  },
};

export default function CoupsDeMainPage() {
  return <CoupsDeMainPageClient />;
}
