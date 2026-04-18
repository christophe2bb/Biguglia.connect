/**
 * Route /promenades — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import PromenadePageClient from './_page.client';
import {
  JsonLd,
  breadcrumbSchema,
  faqSchema,
  collectionPageSchema,
  itemListSchema,
  placeSchema,
  howToSchema,
} from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-etang.jpg`;

export const metadata: Metadata = {
  title: 'Promenades & Sorties à Biguglia — Randonnées et Activités Nature',
  description:
    'Découvrez les promenades et sorties organisées à Biguglia et autour de l\'étang de Biguglia : randonnées, balades nature, activités plein air entre habitants.',
  keywords: [
    'promenades Biguglia', 'randonnées Biguglia', 'étang Biguglia',
    'nature Haute-Corse', 'balade Biguglia', 'sortie nature Corse',
    'randonnée Haute-Corse', 'sentiers Biguglia', 'étang de Biguglia promenade',
  ],
  alternates: { canonical: `${SITE_URL}/promenades` },
  openGraph: {
    title:       'Promenades & Sorties à Biguglia — Nature et Étang',
    description: 'Randonnées, balades autour de l\'étang de Biguglia et sorties nature entre habitants.',
    url:         `${SITE_URL}/promenades`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Étang de Biguglia — promenades' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Promenades & Sorties à Biguglia',
    description: 'Randonnées et balades autour de l\'étang de Biguglia, Haute-Corse.',
    images:      [OG_IMAGE],
  },
};

export default function PromenadePage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',              url: '/' },
    { name: 'Promenades Biguglia', url: '/promenades' },
  ]);

  const collection = collectionPageSchema({
    name:        'Promenades & Sorties à Biguglia',
    description: 'Toutes les randonnées, balades nature et sorties organisées autour de Biguglia et de son étang.',
    url:         '/promenades',
  });

  // Lieux clés autour de Biguglia — TouristAttraction
  const etangSchema = placeSchema({
    name:        'Étang de Biguglia',
    description: 'Réserve naturelle de l\'étang de Biguglia, site Ramsar et Natura 2000. Idéal pour les balades nature, l\'observation des oiseaux et la découverte de la faune méditerranéenne.',
    url:         '/promenades',
    latitude:    42.5747,
    longitude:    9.4436,
    type:        'TouristAttraction',
  });

  const sentierSchema = placeSchema({
    name:        'Sentiers de randonnée de Biguglia',
    description: 'Réseau de sentiers de randonnée autour de Biguglia : sentier de l\'étang, Tour du village, chemin des bergers et circuits nature en Haute-Corse.',
    url:         '/promenades',
    latitude:    42.5750,
    longitude:    9.4440,
    type:        'Park',
  });

  // ItemList des catégories de promenades
  const promsItemList = itemListSchema({
    name:  'Types de promenades à Biguglia',
    url:   '/promenades',
    items: [
      { name: 'Promenade autour de l\'étang de Biguglia', url: '/promenades', description: 'Balade facile autour de la réserve naturelle de l\'étang de Biguglia' },
      { name: 'Randonnée nature Haute-Corse',             url: '/promenades', description: 'Sentiers de randonnée en Haute-Corse autour de Biguglia' },
      { name: 'Sortie ornithologique étang de Biguglia',  url: '/promenades', description: 'Observation des oiseaux migrateurs sur l\'étang de Biguglia' },
      { name: 'Balade en famille à Biguglia',             url: '/promenades', description: 'Promenades adaptées aux familles et aux enfants autour de Biguglia' },
      { name: 'Sortie nature entre voisins',              url: '/promenades', description: 'Sorties organisées par des habitants de Biguglia' },
    ],
  });

  // Guide HowTo pour organiser une sortie
  const howTo = howToSchema({
    name:        'Comment organiser une sortie nature à Biguglia',
    description: 'Guide pour organiser et rejoindre une promenade ou sortie nature à Biguglia via Biguglia Connect.',
    url:         '/promenades',
    totalTime:   'PT5M',
    steps: [
      { name: 'Consulter les sorties',   text: 'Parcourez la liste des promenades et sorties organisées par des habitants de Biguglia sur la page /promenades.' },
      { name: 'Choisir une sortie',      text: 'Sélectionnez une sortie selon la date, le niveau de difficulté et le type d\'activité (randonnée, balade, observation).' },
      { name: 'S\'inscrire',             text: 'Créez un compte sur Biguglia Connect et inscrivez-vous à la sortie en quelques clics.' },
      { name: 'Proposer une sortie',     text: 'Vous pouvez aussi organiser votre propre promenade en cliquant sur "Proposer une sortie" et en renseignant les détails.' },
    ],
  });

  const faq = faqSchema([
    {
      q: 'Quelles promenades peut-on faire autour de Biguglia ?',
      a: 'Les principales promenades autour de Biguglia incluent : le tour de l\'étang de Biguglia (réserve naturelle Ramsar), les sentiers en garrigue, les balades en bord d\'étang et les circuits de randonnée en Haute-Corse. L\'étang est classé Natura 2000 et accueille plus de 250 espèces d\'oiseaux.',
    },
    {
      q: 'L\'étang de Biguglia est-il ouvert à la promenade ?',
      a: 'Oui, l\'étang de Biguglia est accessible au public sur les sentiers balisés. Il est classé réserve naturelle (site Ramsar, Natura 2000). Des sorties guidées sont régulièrement organisées par des associations locales pour découvrir la faune et la flore.',
    },
    {
      q: 'Comment organiser une sortie nature à Biguglia ?',
      a: 'Sur Biguglia Connect, créez un compte et publiez votre sortie : date, lieu de rendez-vous, niveau et description. La communauté sera notifiée et pourra s\'inscrire gratuitement.',
    },
    {
      q: 'Y a-t-il des promenades adaptées aux enfants à Biguglia ?',
      a: 'Oui, plusieurs parcours autour de l\'étang de Biguglia sont accessibles aux familles avec enfants : sentier plat en bord d\'étang, balade d\'observation des oiseaux et circuits nature courts adaptés aux jeunes randonneurs.',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <JsonLd data={etangSchema} />
      <JsonLd data={sentierSchema} />
      <JsonLd data={promsItemList} />
      <JsonLd data={howTo} />
      <JsonLd data={faq} />
      <PromenadePageClient />
    </>
  );
}
