'use client';
/**
 * src/app/global-error.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Error boundary global de Next.js App Router.
 *
 * Capturé par ce fichier :
 *   • Erreurs non rattrapées dans le layout racine (src/app/layout.tsx)
 *   • Erreurs de rendu des Server Components à la racine
 *   • Erreurs de rendu qui font crasher toute l'application
 *
 * Ce fichier doit être un Client Component ('use client') car il reçoit
 * des props React (error, reset) injectées par le framework.
 *
 * Référence : https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 *
 * Note : global-error.tsx remplace layout.tsx quand il est actif,
 * donc il doit inclure <html> et <body>.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Envoyer l'erreur à Sentry dès le montage du composant.
    // Sentry.captureException est safe si Sentry n'est pas configuré (DSN absent).
    Sentry.captureException(error, {
      tags: {
        boundary: 'global-error',
        digest:   error.digest ?? 'none',
      },
    });
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
          {/* Icône d'erreur */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">
              Une erreur inattendue s&apos;est produite
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              L&apos;application a rencontré un problème et ne peut pas afficher cette page.
              Notre équipe a été automatiquement informée.
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 font-mono bg-gray-100 px-3 py-1 rounded-full inline-block">
                Référence : {error.digest}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Réessayer
            </button>
            <a
              href="/"
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Retour à l&apos;accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
