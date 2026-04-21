/**
 * Route /demandes — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import DemandesPageClient from './_page.client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Demandes d\'aide — Entraide à Biguglia',
  description:
    'Consultez les demandes d\'aide des habitants de Biguglia : travaux, bricolage, jardinage, conseils. Répondez ou postez votre propre demande.',
  keywords: [
    'demande aide Biguglia', 'entraide Biguglia', 'service entre voisins',
    'petits travaux Biguglia', 'coup de main Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/demandes` },
  openGraph: {
    title:       'Demandes d\'aide — Entraide à Biguglia',
    description: 'Les habitants de Biguglia partagent leurs besoins : artisans, conseils, coups de main. Consultez, répondez, aidez.',
    url:         `${SITE_URL}/demandes`,
    type:        'website',
  },
};

export default function DemandesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Accueil', url: '/' },
          { name: 'Demandes d\'aide', url: '/demandes' },
        ])}
      />
      <DemandesPageClient />
    </>
  );
}
