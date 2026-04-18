/**
 * Route /associations — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import AssociationsPageClient from './_page.client';
import {
  JsonLd,
  breadcrumbSchema,
  faqSchema,
  collectionPageSchema,
  itemListSchema,
  sportsOrganizationSchema,
} from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Associations à Biguglia — Vie Associative et Clubs Locaux',
  description:
    'Découvrez et rejoignez les associations et clubs de Biguglia : sportifs, culturels, environnementaux… Participez à la vie associative du village.',
  keywords: [
    'associations Biguglia', 'clubs Biguglia', 'vie associative Corse',
    'bénévolat Biguglia', 'association Haute-Corse',
    'SC Biguglia', 'football Biguglia', 'association culturelle Biguglia',
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
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                url: '/' },
    { name: 'Associations Biguglia', url: '/associations' },
  ]);

  const collection = collectionPageSchema({
    name:        'Annuaire des Associations & Clubs de Biguglia',
    description: 'Répertoire complet des associations sportives, culturelles, environnementales et sociales de Biguglia.',
    url:         '/associations',
  });

  // SC Biguglia — SportsOrganization
  const scBiguglia = sportsOrganizationSchema({
    name:   'SC Biguglia — Sporting Club de Biguglia',
    url:    '/associations',
    sport:  'Football',
    city:   'Biguglia',
  });

  // Association protection de l'étang
  const etangAssociation = {
    '@context': 'https://schema.org',
    '@type':    'NGO',
    name:       'Association de Protection de l\'Étang de Biguglia',
    url:        `${SITE_URL}/associations`,
    description: 'Association locale dédiée à la protection de la réserve naturelle de l\'étang de Biguglia (site Ramsar, Natura 2000).',
    address: {
      '@type':           'PostalAddress',
      addressLocality:   'Biguglia',
      addressRegion:     'Haute-Corse',
      postalCode:        '20620',
      addressCountry:    'FR',
    },
    areaServed: { '@type': 'City', name: 'Biguglia' },
  };

  // Catégories d'associations — ItemList
  const categoriesItemList = itemListSchema({
    name:  'Types d\'associations à Biguglia',
    url:   '/associations',
    items: [
      { name: 'Associations sportives à Biguglia',      url: '/associations?categorie=sport',    description: 'Clubs sportifs, équipes de football, tennis, pétanque à Biguglia' },
      { name: 'Associations culturelles à Biguglia',    url: '/associations?categorie=culture',  description: 'Groupes culturels, théâtre, musique et patrimoine local à Biguglia' },
      { name: 'Associations nature & environnement',    url: '/associations?categorie=nature',   description: 'Protection de l\'étang de Biguglia, écologie et nature en Haute-Corse' },
      { name: 'Associations d\'entraide & sociale',     url: '/associations?categorie=social',   description: 'Associations solidarité, aide alimentaire et sociale à Biguglia' },
      { name: 'Associations seniors à Biguglia',        url: '/associations?categorie=seniors',  description: 'Clubs de seniors, activités pour les retraités à Biguglia' },
      { name: 'Associations jeunesse à Biguglia',       url: '/associations?categorie=jeunesse', description: 'Associations pour les jeunes, animations et activités jeunesse à Biguglia' },
    ],
  });

  const faq = faqSchema([
    {
      q: 'Quelles associations existe-t-il à Biguglia ?',
      a: 'Biguglia dispose de nombreuses associations : clubs sportifs (dont le SC Biguglia), associations culturelles, groupes de bénévolat, associations de seniors et clubs nature. Consultez l\'annuaire sur Biguglia Connect.',
    },
    {
      q: 'Comment rejoindre une association à Biguglia ?',
      a: 'Consultez le profil de l\'association sur Biguglia Connect pour trouver les coordonnées et les modalités d\'adhésion. Contactez directement les responsables via la plateforme.',
    },
    {
      q: 'Comment publier une association sur Biguglia Connect ?',
      a: 'Créez un compte et publiez votre association gratuitement. Partagez vos actualités, vos besoins en bénévoles et vos événements avec toute la communauté.',
    },
    {
      q: 'Comment créer une association à Biguglia ?',
      a: 'Pour créer une association loi 1901 à Biguglia, réunissez au moins 2 personnes, rédigez des statuts, élisez un bureau (président, secrétaire, trésorier) et déposez une déclaration en préfecture de Haute-Corse à Bastia.',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <JsonLd data={scBiguglia} />
      <JsonLd data={etangAssociation} />
      <JsonLd data={categoriesItemList} />
      <JsonLd data={faq} />
      <AssociationsPageClient />
    </>
  );
}
