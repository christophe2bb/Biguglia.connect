/**
 * Route /forum — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import ForumPageClient from './_page.client';
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
  title: 'Forum de Biguglia — Discussion & Entraide entre Habitants',
  description:
    'Participez au forum de Biguglia : posez vos questions, partagez des informations, discutez de la vie du village et aidez-vous mutuellement entre voisins.',
  keywords: [
    'forum Biguglia', 'discussion Biguglia', 'forum village Corse',
    'entraide Biguglia', 'vie locale Biguglia', 'forum Haute-Corse',
    'questions voisins Biguglia', 'discussions communauté Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/forum` },
  openGraph: {
    title:       'Forum de Biguglia — Discussion & Entraide entre Habitants',
    description: 'Posez vos questions, partagez des infos et discutez de la vie du village à Biguglia.',
    url:         `${SITE_URL}/forum`,
    images:      [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Forum de Biguglia' }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Forum de Biguglia',
    description: 'Discussions, questions et entraide entre habitants de Biguglia.',
    images:      [OG_IMAGE],
  },
};

export default function ForumPage() {
  const breadcrumb = breadcrumbSchema([
    { name: 'Accueil',         url: '/' },
    { name: 'Forum Biguglia', url: '/forum' },
  ]);

  const collection = collectionPageSchema({
    name:        'Forum de Biguglia — Discussions & Entraide Communautaire',
    description: 'Le forum de la communauté de Biguglia : posez vos questions, partagez des informations et aidez vos voisins.',
    url:         '/forum',
  });

  // Catégories du forum — ItemList (aide Google à comprendre la structure du forum)
  const categoriesItemList = itemListSchema({
    name:  'Catégories du forum de Biguglia',
    url:   '/forum',
    items: [
      { name: 'Vie locale à Biguglia',         url: '/forum?categorie=vie_locale',  description: 'Discussions sur la vie quotidienne, les commerces et l\'actualité du village de Biguglia' },
      { name: 'Travaux & Bricolage',            url: '/forum?categorie=travaux',     description: 'Conseils, recommandations et questions sur les travaux et artisans à Biguglia' },
      { name: 'Entraide & Solidarité',          url: '/forum?categorie=entraide',    description: 'Demandes et propositions d\'entraide entre habitants de Biguglia' },
      { name: 'Nature & Environnement',         url: '/forum?categorie=nature',      description: 'Discussions sur l\'étang de Biguglia, la nature et l\'environnement local' },
      { name: 'Loisirs & Activités',            url: '/forum?categorie=loisirs',     description: 'Sorties, événements, sports et activités culturelles à Biguglia' },
      { name: 'Sécurité & Voisinage',           url: '/forum?categorie=securite',    description: 'Alertes de sécurité, informations de voisinage et prévention à Biguglia' },
      { name: 'Annonces & Petites offres',      url: '/forum?categorie=annonces',    description: 'Petites annonces et offres diverses publiées par les habitants de Biguglia' },
    ],
  });

  // DiscussionForum schema — aide Google à identifier le type de contenu
  const discussionForumSchema = {
    '@context':   'https://schema.org',
    '@type':      'DiscussionForumPosting',
    name:         'Forum de Biguglia Connect',
    url:          `${SITE_URL}/forum`,
    description:  'Forum communautaire de Biguglia : vie locale, travaux, entraide, nature et loisirs.',
    sharedContent: {
      '@type': 'WebPage',
      url:     `${SITE_URL}/forum`,
      name:    'Forum de Biguglia',
    },
    author: {
      '@type': 'Organization',
      name:    'Biguglia Connect',
      url:     SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name:    'Biguglia Connect',
      url:     SITE_URL,
    },
    inLanguage: 'fr',
    isPartOf: {
      '@type': 'WebSite',
      name:    'Biguglia Connect',
      url:     SITE_URL,
    },
  };

  const faq = faqSchema([
    {
      q: 'À quoi sert le forum de Biguglia Connect ?',
      a: 'Le forum permet aux habitants de Biguglia de poser des questions, partager des informations, signaler des événements et s\'entraider sur des sujets locaux : voisinage, travaux, transports, commerces, vie du village.',
    },
    {
      q: 'Comment participer au forum de Biguglia ?',
      a: 'Créez un compte gratuit sur Biguglia Connect et postez votre première discussion. Vous pouvez aussi répondre aux sujets existants et aider vos voisins.',
    },
    {
      q: 'Le forum de Biguglia est-il modéré ?',
      a: 'Oui, le forum est modéré par notre équipe. Les contenus inappropriés, les insultes et la publicité non autorisée sont supprimés. Un système de signalement permet à la communauté de participer à la modération.',
    },
    {
      q: 'Quelles sont les règles du forum de Biguglia Connect ?',
      a: 'Le forum est ouvert à tous les habitants de Biguglia. La courtoisie, le respect et la bienveillance sont obligatoires. Les messages publicitaires, les insultes et les contenus illégaux sont interdits.',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <JsonLd data={categoriesItemList} />
      <JsonLd data={discussionForumSchema} />
      <JsonLd data={faq} />
      <ForumPageClient />
    </>
  );
}
