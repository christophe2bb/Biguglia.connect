/**
 * RecherchePage — Server Component wrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Séparation server / client :
 *   • Cette page est un Server Component (pas de 'use client') → pas de JS
 *     envoyé au navigateur pour le shell, metadata SEO possible.
 *   • RechercheClient (dynamic import) porte tout le code interactif.
 *
 * Bénéfice perf mobile :
 *   • Le shell HTML est streamed par le serveur (FCP rapide)
 *   • Le JS interactif est différé (TBT réduit)
 *   • Suspense boundary correcte pour useSearchParams
 */

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Recherche — Biguglia Connect',
  description: 'Recherchez des artisans, annonces, événements, promenades et plus sur Biguglia Connect.',
  robots: { index: false, follow: true },
};

// ─── Shell statique affiché immédiatement (SSR, zéro JS) ─────────────────────
function RechercheShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-12 bg-gray-100 rounded-2xl animate-pulse mb-4" />
          <div className="flex gap-2 overflow-x-auto">
            {[80, 90, 100, 85, 95, 75].map((w, i) => (
              <div key={i} className="h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    </div>
  );
}

// ─── Client interactif chargé en différé ─────────────────────────────────────
const RechercheClient = dynamic(() => import('./_client'), {
  ssr: false,
  loading: () => <RechercheShell />,
});

// ─── Export page Server Component ────────────────────────────────────────────
export default function RecherchePage() {
  return (
    <RechercheClient />
  );
}
