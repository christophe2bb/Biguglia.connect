/**
 * Route /artisans/demande — wrapper serveur pour les métadonnées SEO.
 * Le composant UI réel est dans _page.client.tsx (Client Component).
 *
 * export const dynamic = 'force-dynamic' est requis car cette page utilise
 * useSearchParams() côté client. Sans cela, Next.js tente de la rendre
 * en mode statique au prefetch RSC — ce qui génère une erreur 404 pour
 * les requêtes ?_rsc= initiées par les <Link> de la Navbar.
 */
import type { Metadata } from 'next';
import DemandeServicePageClient from './_page.client';

// Empêche le prefetch RSC statique — la page lit useSearchParams() côté client.
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Faire une demande de service — Biguglia Connect',
  description:
    'Publiez votre demande d\'aide ou de travaux à Biguglia : plomberie, électricité, jardinage, bricolage… Les artisans et voisins de votre quartier peuvent vous répondre.',
  alternates: { canonical: `${SITE_URL}/artisans/demande` },
  openGraph: {
    title:       'Nouvelle demande de service — Biguglia Connect',
    description: 'Décrivez votre besoin et recevez des réponses d\'artisans vérifiés ou de voisins disponibles à Biguglia.',
    url:         `${SITE_URL}/artisans/demande`,
    type:        'website',
  },
  // Formulaire authentifié — inutile d'indexer, mais pas nuisible non plus.
  // On laisse indexer pour permettre l'accès via recherche organique.
};

export default function DemandeServicePage() {
  return <DemandeServicePageClient />;
}
