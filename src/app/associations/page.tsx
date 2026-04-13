/**
 * Route /associations — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import AssociationsPageClient from './_page.client';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Associations à Biguglia — Vie Associative et Clubs Locaux',
  description:
    'Découvrez et rejoignez les associations et clubs de Biguglia : sportifs, culturels, environnementaux… Participez à la vie associative du village.',
  keywords: [
    'associations Biguglia', 'clubs Biguglia', 'vie associative Corse',
    'bénévolat Biguglia', 'association Haute-Corse',
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
    { name: 'Accueil', url: '/' },
    { name: 'Associations à Biguglia', url: '/associations' },
  ]);
  const faq = faqSchema([
    { q: 'Quelles associations existe-t-il à Biguglia ?', a: 'Biguglia dispose de nombreuses associations : clubs sportifs (dont le SC Biguglia), associations culturelles, groupes de bénévolat, associations de seniors et clubs nature. Consultez l\'annuaire sur Biguglia Connect.' },
    { q: 'Comment rejoindre une association à Biguglia ?', a: 'Consultez le profil de l\'association sur Biguglia Connect pour trouver les coordonnées et les modalités d\'adhésion. Contactez directement les responsables via la plateforme.' },
    { q: 'Comment publier une association sur Biguglia Connect ?', a: 'Créez un compte et publiez votre association gratuitement. Partagez vos actualités, vos besoins en bénévoles et vos événements avec toute la communauté.' },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <AssociationsPageClient />
    </>
  );
}
