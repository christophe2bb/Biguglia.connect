/**
 * RecherchePage — Server Component wrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Séparation server / client :
 *   • Cette page est un Server Component (pas de 'use client') → pas de JS
 *     envoyé au navigateur pour le shell, metadata SEO possible.
 *   • RechercheLoader (dynamic import avec ssr:false) porte tout le code interactif
 *     dans un Client Component dédié (Next.js 15 exige 'use client' pour ssr:false).
 *
 * Bénéfice perf mobile :
 *   • Le shell HTML est streamed par le serveur (FCP rapide)
 *   • Le JS interactif est différé (TBT réduit)
 *   • Suspense boundary correcte pour useSearchParams
 */

import type { Metadata } from 'next';
import RechercheLoader from './RechercheLoader';

export const metadata: Metadata = {
  title: 'Recherche — Biguglia Connect',
  description: 'Recherchez des artisans, annonces, événements, promenades et plus sur Biguglia Connect.',
  robots: { index: false, follow: true },
};

export default function RecherchePage() {
  return <RechercheLoader />;
}
