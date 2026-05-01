'use client';
/**
 * src/app/(auth)/error.tsx — Error boundary du groupe (auth)
 * ─────────────────────────────────────────────────────────────────────────────
 * Intercepte toute erreur non rattrapée dans les pages d'authentification :
 *   /connexion, /inscription, /mot-de-passe-oublie
 *
 * Sans ce fichier, une erreur dans ces pages (ou lors de la navigation
 * client-side vers/depuis elles) remontait directement au global-error.tsx
 * (page blanche complète sans Navbar ni possibilité de revenir facilement).
 *
 * Hiérarchie des error boundaries :
 *   src/app/global-error.tsx   ← crashes du layout racine (html/body)
 *   src/app/(auth)/error.tsx   ← ce fichier (pages /connexion, /inscription…)
 *   src/app/(private)/error.tsx← pages /dashboard, /messages, /profil
 *   src/app/(main)/error.tsx   ← pages publiques /forum, /artisans…
 *
 * Comportement Next.js App Router :
 *   • Ce composant s'affiche DANS le shell (auth)/layout.tsx
 *     (AuthProvider + Toaster déjà présents — ne pas les ré-inclure).
 *   • Doit être un Client Component ('use client') : reçoit error et reset.
 *   • error.digest = identifiant opaque serveur pour le débogage Sentry.
 *
 * Référence : https://nextjs.org/docs/app/api-reference/file-conventions/error
 */

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        boundary: 'auth-layout',
        digest:   error.digest ?? 'none',
        path:     typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-6">

        {/* Icône */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-lg font-bold text-gray-900">
            Une erreur est survenue
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Un problème est apparu lors du chargement de la page.
            Réessayez ou revenez à l&apos;accueil.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-1 rounded-full inline-block">
              Réf&nbsp;: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </div>
  );
}
