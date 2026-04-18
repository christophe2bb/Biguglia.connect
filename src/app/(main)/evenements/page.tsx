/**
 * Route /evenements — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import EvenementsPageClient from './_page.client';
import {
  JsonLd,
  breadcrumbSchema,
  faqSchema,
  collectionPageSchema,
  itemListSchema,
} from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Événements à Biguglia — Agenda des Activités Locales',
  description:
    'Découvrez les événements et activités à Biguglia : fêtes du village, manifestations culturelles, marchés, concerts et rendez-vous locaux. Restez informé de la vie de Biguglia.',
  keywords: [
    'événements Biguglia', 'agenda Biguglia', 'fêtes Biguglia',
    'activités Haute-Corse', 'manifestations Biguglia', 'sorties Biguglia',
    'marché Biguglia', 'concert Biguglia', 'sport Biguglia 2B',
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
    { name: 'Accueil',               url: '/' },
    { name: 'Événements à Biguglia', url: '/evenements' },
  ]);

  const collection = collectionPageSchema({
    name:        'Agenda des Événements & Activités à Biguglia',
    description: 'Toutes les manifestations, fêtes, marchés, concerts et activités organisés à Biguglia et dans ses environs.',
    url:         '/evenements',
  });

  // Catégories d'événements — ItemList
  const categoriesItemList = itemListSchema({
    name:  'Catégories d\'événements à Biguglia',
    url:   '/evenements',
    items: [
      { name: 'Sport & Matchs à Biguglia',         url: '/evenements?categorie=sport',    description: 'Matchs du SC Biguglia, tournois sportifs et compétitions locales' },
      { name: 'Culture & Spectacles',               url: '/evenements?categorie=culture',  description: 'Concerts, théâtre, expositions et événements culturels à Biguglia' },
      { name: 'Fêtes & Marchés',                    url: '/evenements?categorie=fete',     description: 'Fêtes de village, marchés de producteurs et vide-greniers à Biguglia' },
      { name: 'Nature & Sorties',                   url: '/evenements?categorie=nature',   description: 'Sorties nature, randonnées et découverte de l\'étang de Biguglia' },
      { name: 'Ateliers & Formation',               url: '/evenements?categorie=atelier',  description: 'Ateliers pratiques, cours et formations pour les habitants de Biguglia' },
      { name: 'Réunions de quartier',               url: '/evenements?categorie=reunion',  description: 'Réunions communautaires, conseils de quartier et rencontres citoyennes' },
    ],
  });

  // EventSeries schema pour l'agenda des matchs SC Biguglia
  const scBigugliaEventSeries = {
    '@context': 'https://schema.org',
    '@type':    'EventSeries',
    name:       'Matchs du SC Biguglia',
    description: 'Calendrier des matchs de football du Sporting Club de Biguglia, club local de Haute-Corse.',
    url:        `${SITE_URL}/evenements?categorie=sport`,
    location: {
      '@type':   'Place',
      name:      'Stade de Biguglia',
      address: {
        '@type':           'PostalAddress',
        addressLocality:   'Biguglia',
        addressRegion:     'Haute-Corse',
        postalCode:        '20620',
        addressCountry:    'FR',
      },
    },
    organizer: {
      '@type': 'SportsOrganization',
      name:    'SC Biguglia',
      url:     `${SITE_URL}/associations`,
    },
  };

  const faq = faqSchema([
    {
      q: 'Quels événements ont lieu à Biguglia ?',
      a: 'Matchs du SC Biguglia, fêtes du village, marchés de producteurs, sorties nature autour de l\'étang, concerts, ateliers culturels et manifestations associatives.',
    },
    {
      q: 'Comment publier un événement à Biguglia ?',
      a: 'Créez un compte sur Biguglia Connect et publiez votre événement gratuitement en quelques clics. Il sera visible par toute la communauté locale.',
    },
    {
      q: 'Où trouver l\'agenda complet de Biguglia ?',
      a: 'L\'agenda complet de Biguglia Connect recense tous les événements locaux : fêtes, sport, culture, nature et associations. Consultez la liste et filtrez par catégorie.',
    },
    {
      q: 'Les événements sur Biguglia Connect sont-ils gratuits ?',
      a: 'La publication d\'événements est gratuite. Certains événements peuvent être payants selon le tarif fixé par l\'organisateur. Les infos de prix sont indiquées sur chaque annonce.',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <JsonLd data={categoriesItemList} />
      <JsonLd data={scBigugliaEventSeries} />
      <JsonLd data={faq} />
      <EvenementsPageClient />
    </>
  );
}
