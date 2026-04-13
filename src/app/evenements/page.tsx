/**
 * Route /evenements — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import EvenementsPageClient from './_page.client';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Événements à Biguglia — Agenda des Activités Locales',
  description:
    'Découvrez les événements et activités à Biguglia : fêtes du village, manifestations culturelles, marchés, concerts et rendez-vous locaux. Restez informé de la vie de Biguglia.',
  keywords: [
    'événements Biguglia', 'agenda Biguglia', 'fêtes Biguglia',
    'activités Haute-Corse', 'manifestations Biguglia', 'sorties Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/evenements` },
  openGraph: {
    title:       'Événements à Biguglia — Agenda des Activités Locales',
    description: 'Fêtes, marchés, concerts et événements locaux à Biguglia. L\'agenda complet du village.',
    url:         `${SITE_URL}/evenements`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Événements à Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Événements à Biguglia',
    description: 'L\'agenda des événements et activités locales à Biguglia, Haute-Corse.',
    images:      [OG_IMAGE],
  },
};

export default function EvenementsPage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Événements à Biguglia', url: '/evenements' },
  ]);
  const faq = faqSchema([
    { q: 'Quels événements ont lieu à Biguglia ?', a: 'Matchs du SC Biguglia, fêtes du village, marchés de producteurs, sorties nature autour de l\'étang, concerts, ateliers culturels et manifestations associatives.' },
    { q: 'Comment publier un événement à Biguglia ?', a: 'Créez un compte sur Biguglia Connect et publiez votre événement gratuitement en quelques clics. Il sera visible par toute la communauté locale.' },
    { q: 'Où trouver l\'agenda complet de Biguglia ?', a: 'L\'agenda complet de Biguglia Connect recense tous les événements locaux : fêtes, sport, culture, nature et associations. Consultez la liste et filtrez par catégorie.' },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <EvenementsPageClient />
    </>
  );
}
