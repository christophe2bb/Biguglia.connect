'use client';
/**
 * src/app/(main)/annonces/[id]/error.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Error boundary pour la page de détail d'une annonce.
 * Intercepte les erreurs dans ce segment de route (DB timeout, network, etc.)
 * et affiche une UI de fallback propre DANS le shell de l'application
 * (avec Navbar + Footer), sans déclencher global-error.tsx.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AnnonceDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'annonce-detail', digest: error.digest ?? 'none' },
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <span className="text-2xl">📦</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold text-gray-900">
            Impossible d&apos;afficher cette annonce
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Un problème est survenu lors du chargement. Réessayez ou revenez à la liste des annonces.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-1 rounded-full inline-block">
              Réf : {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/annonces"
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Toutes les annonces
          </Link>
        </div>
      </div>
    </div>
  );
}
