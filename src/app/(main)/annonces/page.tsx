/**
 * Route /annonces — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import AnnoncesPageClient from './_page.client';
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
  title: 'Petites Annonces à Biguglia — Vente, Location, Dons',
  description:
    'Parcourez les petites annonces de Biguglia : vente de particulier à particulier, location, dons et échanges entre habitants du village. Déposez votre annonce gratuitement.',
  keywords: [
    'petites annonces Biguglia', 'vente Biguglia', 'annonces Corse',
    'don objet Biguglia', 'annonces particulier Haute-Corse',
    'vente voiture Biguglia', 'meubles occasion Biguglia', 'annonces gratuites Biguglia',
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
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',                   url: '/' },
    { name: 'Petites annonces Biguglia', url: '/annonces' },
  ]);

  const collection = collectionPageSchema({
    name:        'Petites Annonces à Biguglia — Vente, Location & Dons',
    description: 'Toutes les petites annonces publiées par les habitants de Biguglia : ventes, locations, dons et échanges de particulier à particulier.',
    url:         '/annonces',
  });

  // Catégories d'annonces — ItemList
  const categoriesItemList = itemListSchema({
    name:  'Catégories de petites annonces à Biguglia',
    url:   '/annonces',
    items: [
      { name: 'Véhicules à Biguglia',        url: '/annonces?categorie=vehicule',     description: 'Voitures, motos, vélos et véhicules d\'occasion à vendre à Biguglia' },
      { name: 'Meubles & Mobilier',           url: '/annonces?categorie=mobilier',     description: 'Meubles, canapés, tables, chaises et mobilier d\'occasion à Biguglia' },
      { name: 'Électronique & High-Tech',     url: '/annonces?categorie=electronique', description: 'Smartphones, ordinateurs, TV et électronique d\'occasion à Biguglia' },
      { name: 'Maison & Jardin',              url: '/annonces?categorie=maison',       description: 'Articles de maison, jardin et bricolage à vendre à Biguglia' },
      { name: 'Vêtements & Mode',             url: '/annonces?categorie=vetement',     description: 'Vêtements, chaussures et accessoires d\'occasion à Biguglia' },
      { name: 'Dons gratuits à Biguglia',     url: '/annonces?categorie=don',          description: 'Objets à donner gratuitement entre habitants de Biguglia' },
      { name: 'Animaux à Biguglia',           url: '/annonces?categorie=animal',       description: 'Animaux à adopter, accessoires et fournitures pour animaux à Biguglia' },
    ],
  });

  // HowTo — déposer une annonce
  const howTo = howToSchema({
    name:        'Comment déposer une petite annonce à Biguglia',
    description: 'Guide pour publier gratuitement une annonce de vente, location ou don sur Biguglia Connect.',
    url:         '/annonces',
    totalTime:   'PT5M',
    steps: [
      { name: 'Créer un compte',        text: 'Inscrivez-vous gratuitement sur Biguglia Connect avec votre adresse email.' },
      { name: 'Rédiger l\'annonce',     text: 'Cliquez sur "Publier une annonce". Ajoutez un titre clair, une description détaillée et le prix (ou "Don").' },
      { name: 'Ajouter des photos',     text: 'Ajoutez jusqu\'à 5 photos de votre article. Une bonne photo multiplie par 4 les contacts reçus.' },
      { name: 'Publier & partager',     text: 'Validez votre annonce. Elle sera visible par toute la communauté de Biguglia après modération (sous 24h).' },
    ],
  });

  const faq = faqSchema([
    {
      q: 'Comment déposer une annonce à Biguglia ?',
      a: 'Créez un compte sur Biguglia Connect et cliquez sur "Publier une annonce". C\'est gratuit et votre annonce est visible par tous les habitants du village.',
    },
    {
      q: 'Quels objets peut-on vendre ou donner à Biguglia ?',
      a: 'Meubles, électroménager, vêtements, voitures, outillage, jouets, livres, équipements sportifs… Tout objet légal peut être mis en vente, loué ou donné entre habitants.',
    },
    {
      q: 'Les annonces de Biguglia Connect sont-elles vérifiées ?',
      a: 'Chaque annonce est modérée avant publication. Les annonces frauduleuses, les arnaques et les publicités commerciales sont supprimées. Les vendeurs ont un score de confiance visible.',
    },
    {
      q: 'Y a-t-il des frais pour vendre sur Biguglia Connect ?',
      a: 'Non, la publication d\'annonces est entièrement gratuite sur Biguglia Connect. Aucune commission n\'est prélevée sur les ventes — la transaction se fait directement entre acheteur et vendeur.',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <JsonLd data={categoriesItemList} />
      <JsonLd data={howTo} />
      <JsonLd data={faq} />
      <AnnoncesPageClient />
    </>
  );
}
