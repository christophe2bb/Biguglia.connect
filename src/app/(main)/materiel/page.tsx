/**
 * Route /materiel — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import MaterielPageClient from './_page.client';
import {
  JsonLd,
  breadcrumbSchema,
  faqSchema,
  collectionPageSchema,
  itemListSchema,
  howToSchema,
} from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Prêt de Matériel à Biguglia — Outils & Équipements entre Voisins',
  description:
    'Empruntez ou prêtez du matériel entre habitants de Biguglia : outils, équipements de jardinage, matériel de bricolage… La bibliothèque d\'objets du village.',
  keywords: [
    'prêt matériel Biguglia', 'emprunt outils Biguglia', 'troc matériel Corse',
    'partage outils village', 'matériel bricolage Biguglia',
    'bibliothèque objets Biguglia', 'location outils voisins', 'outillage partagé Corse',
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
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                url: '/' },
    { name: 'Prêt de matériel Biguglia', url: '/materiel' },
  ]);

  const collection = collectionPageSchema({
    name:        'Prêt de Matériel entre Voisins à Biguglia',
    description: 'Bibliothèque d\'objets et d\'outils entre habitants de Biguglia : empruntez gratuitement ce dont vous avez besoin.',
    url:         '/materiel',
  });

  // Catégories de matériel disponible — ItemList
  const categoriesItemList = itemListSchema({
    name:  'Catégories de matériel disponible à Biguglia',
    url:   '/materiel',
    items: [
      { name: 'Outils de bricolage',         url: '/materiel', description: 'Perceuses, scies, niveaux, marteaux et outillage à main — emprunt entre voisins à Biguglia' },
      { name: 'Matériel de jardinage',        url: '/materiel', description: 'Tondeuses, taille-haies, débroussailleuses et outils de jardin — prêt entre habitants' },
      { name: 'Équipement de sport',          url: '/materiel', description: 'Vélos, kayaks, planches de surf et équipement sportif — location entre voisins Biguglia' },
      { name: 'Matériel de cuisine',          url: '/materiel', description: 'Grandes marmites, plats de service, équipement pour les fêtes — emprunt à Biguglia' },
      { name: 'Équipement pour enfants',      url: '/materiel', description: 'Poussettes, transat, parc, jeux — prêt entre familles à Biguglia' },
      { name: 'Matériel de déménagement',     url: '/materiel', description: 'Diables, sangles, couvertures de déménagement — emprunt gratuit entre voisins' },
    ],
  });

  // HowTo pour emprunter du matériel
  const howTo = howToSchema({
    name:        'Comment emprunter du matériel à un voisin à Biguglia',
    description: 'Étapes pour emprunter gratuitement des outils ou équipements entre voisins sur Biguglia Connect.',
    url:         '/materiel',
    totalTime:   'PT3M',
    steps: [
      { name: 'Parcourir les annonces',  text: 'Consultez la liste du matériel disponible à l\'emprunt dans votre quartier de Biguglia.' },
      { name: 'Contacter le propriétaire', text: 'Cliquez sur l\'annonce et envoyez un message au propriétaire pour convenir d\'un rendez-vous.' },
      { name: 'Récupérer le matériel',   text: 'Récupérez directement le matériel chez votre voisin selon l\'accord convenu.' },
      { name: 'Rendre le matériel',      text: 'Rendez le matériel en bon état dans le délai convenu. Laissez un avis pour renforcer la confiance.' },
    ],
  });

  const faq = faqSchema([
    {
      q: 'Comment emprunter un outil ou du matériel à Biguglia ?',
      a: 'Sur Biguglia Connect, parcourez les annonces de prêt de matériel. Contactez le propriétaire pour convenir des modalités. L\'emprunt est gratuit, entre voisins, sur la base de la confiance et des avis de la communauté.',
    },
    {
      q: 'Quel matériel peut-on prêter ou emprunter à Biguglia ?',
      a: 'Tout type de matériel peut être proposé au prêt : outillage (perceuse, scie, marteau), jardinage (tondeuse, débroussailleuse), sport, cuisine, mobilier d\'événement, matériel de déménagement et bien plus encore.',
    },
    {
      q: 'Le prêt de matériel est-il gratuit sur Biguglia Connect ?',
      a: 'Oui, la plateforme est gratuite et la décision de prêt appartient entièrement au propriétaire. Certains peuvent demander une caution symbolique, d\'autres prêtent simplement en bonne entente de voisinage.',
    },
    {
      q: 'Comment proposer du matériel au prêt à Biguglia ?',
      a: 'Créez un compte sur Biguglia Connect et publiez votre annonce de matériel disponible. Indiquez la disponibilité, la durée maximale d\'emprunt et toute condition particulière.',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <JsonLd data={categoriesItemList} />
      <JsonLd data={howTo} />
      <JsonLd data={faq} />
      <MaterielPageClient />
    </>
  );
}
