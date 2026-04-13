/**
 * Route /annonces — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import AnnoncesPageClient from './_page.client';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';
const OG_IMAGE = `${SITE_URL}/images/biguglia-village.jpg`;

export const metadata: Metadata = {
  title: 'Petites Annonces à Biguglia — Vente, Location, Dons',
  description:
    'Parcourez les petites annonces de Biguglia : vente de particulier à particulier, location, dons et échanges entre habitants du village. Déposez votre annonce gratuitement.',
  keywords: [
    'petites annonces Biguglia', 'vente Biguglia', 'annonces Corse',
    'don objet Biguglia', 'annonces particulier Haute-Corse',
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
    { name: 'Accueil', url: '/' },
    { name: 'Petites annonces Biguglia', url: '/annonces' },
  ]);
  const faq = faqSchema([
    { q: 'Comment déposer une annonce à Biguglia ?', a: 'Créez un compte sur Biguglia Connect et cliquez sur "Publier une annonce". C\'est gratuit et votre annonce est visible par tous les habitants du village.' },
    { q: 'Quels objets peut-on vendre ou donner à Biguglia ?', a: 'Meubles, électroménager, vêtements, voitures, outillage, jouets, livres, équipements sportifs… Tout objet légal peut être mis en vente, loué ou donné entre habitants.' },
    { q: 'Les annonces de Biguglia Connect sont-elles vérifiées ?', a: 'Chaque annonce est modérée avant publication. Les annonces frauduleuses, les arnaques et les publicités commerciales sont supprimées. Les vendeurs ont un score de confiance visible.' },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faq} />
      <AnnoncesPageClient />
    </>
  );
}
