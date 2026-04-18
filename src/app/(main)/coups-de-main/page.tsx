/**
 * Route /coups-de-main — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import CoupsDeMainPageClient from './_page.client';
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
  title: 'Coups de Main à Biguglia — Entraide & Bénévolat entre Voisins',
  description:
    'Demandez ou proposez un coup de main à Biguglia : aide au déménagement, jardinage, garde d\'animaux, petits travaux… L\'entraide entre voisins du village.',
  keywords: [
    'coup de main Biguglia', 'entraide Biguglia', 'bénévolat Biguglia',
    'aide voisin Corse', 'solidarité village Biguglia',
    'aide déménagement Biguglia', 'garde animaux Biguglia', 'petits travaux Biguglia',
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
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',             url: '/' },
    { name: 'Coups de main Biguglia', url: '/coups-de-main' },
  ]);

  const collection = collectionPageSchema({
    name:        'Coups de Main & Entraide à Biguglia',
    description: 'Plateforme d\'entraide et de solidarité entre habitants de Biguglia : proposez ou demandez un coup de main gratuitement.',
    url:         '/coups-de-main',
  });

  // Types de coups de main — ItemList
  const typesItemList = itemListSchema({
    name:  'Types de coups de main disponibles à Biguglia',
    url:   '/coups-de-main',
    items: [
      { name: 'Aide au déménagement à Biguglia',    url: '/coups-de-main', description: 'Coup de main entre voisins pour déménager à Biguglia — transport, portage, emballage' },
      { name: 'Jardinage et entretien extérieur',   url: '/coups-de-main', description: 'Aide pour tondre, tailler, arroser et entretenir le jardin à Biguglia' },
      { name: 'Garde d\'animaux à Biguglia',        url: '/coups-de-main', description: 'Garde de chats, chiens et autres animaux pendant vos absences — entre voisins' },
      { name: 'Petits travaux bricolage',           url: '/coups-de-main', description: 'Aide pour des petits travaux de bricolage, montage meuble, installation à Biguglia' },
      { name: 'Courses et livraisons',              url: '/coups-de-main', description: 'Aide pour faire des courses ou livrer des colis pour des voisins à Biguglia' },
      { name: 'Soutien scolaire',                   url: '/coups-de-main', description: 'Aide aux devoirs et soutien scolaire proposé par des habitants de Biguglia' },
      { name: 'Transport et covoiturage',            url: '/coups-de-main', description: 'Coup de main transport pour des déplacements ponctuels à Biguglia et alentours' },
    ],
  });

  // HowTo — demander un coup de main
  const howTo = howToSchema({
    name:        'Comment demander un coup de main à Biguglia',
    description: 'Guide pour demander de l\'aide à des voisins bienveillants via Biguglia Connect.',
    url:         '/coups-de-main',
    totalTime:   'PT5M',
    steps: [
      { name: 'Décrire le besoin',       text: 'Cliquez sur "Demander un coup de main" et décrivez précisément ce dont vous avez besoin : type d\'aide, durée estimée, disponibilités.' },
      { name: 'Choisir la date',         text: 'Indiquez les créneaux qui vous conviennent pour que les voisins disponibles puissent s\'organiser.' },
      { name: 'Recevoir des propositions', text: 'Des voisins vous répondront directement via la messagerie Biguglia Connect.' },
      { name: 'Confirmer et remercier',  text: 'Confirmez avec la personne qui vous aidera et pensez à laisser un avis après l\'entraide.' },
    ],
  });

  const faq = faqSchema([
    {
      q: 'Comment demander un coup de main à Biguglia ?',
      a: 'Sur Biguglia Connect, publiez votre demande d\'aide en décrivant ce dont vous avez besoin (type de tâche, durée, date souhaitée). Des voisins volontaires pourront vous répondre directement.',
    },
    {
      q: 'Les coups de main sont-ils rémunérés à Biguglia ?',
      a: 'Non, les coups de main sur Biguglia Connect sont basés sur le bénévolat et la solidarité de voisinage. Ce n\'est pas un service professionnel rémunéré mais une entraide communautaire gratuite.',
    },
    {
      q: 'Quels types de coups de main peut-on demander à Biguglia ?',
      a: 'Aide au déménagement, jardinage, garde d\'animaux, petits travaux de bricolage, courses, soutien scolaire, transport ponctuel… Toute forme d\'entraide bienveillante est bienvenue.',
    },
    {
      q: 'Comment proposer un coup de main à Biguglia ?',
      a: 'Créez un profil sur Biguglia Connect et parcourez les demandes d\'aide de vos voisins. Répondez directement à celles qui correspondent à vos disponibilités et compétences.',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <JsonLd data={typesItemList} />
      <JsonLd data={howTo} />
      <JsonLd data={faq} />
      <CoupsDeMainPageClient />
    </>
  );
}
