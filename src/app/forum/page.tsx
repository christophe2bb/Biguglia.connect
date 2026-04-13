/**
 * Route /forum — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import ForumPageClient from './_page.client';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Forum de Biguglia — Discussion & Entraide entre Habitants',
  description:
    'Participez au forum de Biguglia : posez vos questions, partagez des informations, discutez de la vie du village et aidez-vous mutuellement entre voisins.',
  keywords: [
    'forum Biguglia', 'discussion Biguglia', 'forum village Corse',
    'entraide Biguglia', 'vie locale Biguglia', 'forum Haute-Corse',
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
    { name: 'Accueil', url: '/' },
    { name: 'Forum de Biguglia', url: '/forum' },
  ]);
  const faq = faqSchema([
    { q: 'À quoi sert le forum de Biguglia Connect ?', a: 'Le forum permet aux habitants de Biguglia de poser des questions, partager des informations, signaler des événements et s\'entraider sur des sujets locaux : voisinage, travaux, transports, commerces, vie du village.' },
    { q: 'Comment participer au forum de Biguglia ?', a: 'Créez un compte gratuit sur Biguglia Connect et postez votre première discussion. Vous pouvez aussi répondre aux sujets existants et aider vos voisins.' },
    { q: 'Le forum de Biguglia est-il modéré ?', a: 'Oui, le forum est modéré par notre équipe. Les contenus inappropriés, les insultes et la publicité non autorisée sont supprimés. Un système de signalement permet à la communauté de participer à la modération.' },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <ForumPageClient />
    </>
  );
}
