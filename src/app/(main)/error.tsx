'use client';
/**
 * src/app/(main)/error.tsx — Error boundary du groupe (main)
 * ─────────────────────────────────────────────────────────────────────────────
 * Intercepte toute erreur non rattrapée dans les pages publiques du site :
 *   /forum/[id], /evenements/[id], /artisans/[id], /materiel/[id],
 *   /associations/[id], /coups-de-main/[id], /perdu-trouve/[id],
 *   /communaute, /recherche, et toutes les autres routes du groupe (main).
 *
 * Hiérarchie des error boundaries :
 *   src/app/global-error.tsx          ← crashes du layout racine
 *   src/app/(main)/error.tsx          ← ce fichier (pages du groupe (main))
 *   src/app/(main)/annonces/[id]/error.tsx ← override spécifique annonces
 *
 * Comportement Next.js App Router :
 *   • Ce composant s'affiche DANS le shell (main)/layout.tsx :
 *     Navbar et Footer sont déjà rendus — ne pas les ré-inclure.
 *   • Doit être un Client Component ('use client') car il reçoit
 *     les props error et reset injectées par React Error Boundary.
 *   • error.digest est un identifiant serveur opaque pour le débogage.
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

// ─── Liens de retour selon le pathname (best-effort côté client) ──────────────

const SECTION_LINKS: Array<{ pattern: RegExp; href: string; label: string }> = [
  { pattern: /^\/forum/,       href: '/forum',       label: 'Forum'           },
  { pattern: /^\/evenements/,  href: '/evenements',  label: 'Événements'      },
  { pattern: /^\/artisans/,    href: '/artisans',    label: 'Artisans'        },
  { pattern: /^\/materiel/,    href: '/materiel',    label: 'Matériel'        },
  { pattern: /^\/annonces/,    href: '/annonces',    label: 'Annonces'        },
  { pattern: /^\/associations/,href: '/associations',label: 'Associations'    },
  { pattern: /^\/coups-de-main/,href:'/coups-de-main',label: 'Coups de main' },
  { pattern: /^\/perdu-trouve/,href: '/perdu-trouve',label: 'Perdu & Trouvé' },
  { pattern: /^\/communaute/,  href: '/communaute',  label: 'Communauté'      },
  { pattern: /^\/emploi/,      href: '/emploi/offres',label: 'Emploi'         },
];

function getSectionLink(): { href: string; label: string } | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname; // nosec — read-only pathname for Sentry error tag, no user input, no write
  return SECTION_LINKS.find(({ pattern }) => pattern.test(path)) ?? null;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function MainError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        boundary: 'main-layout',
        digest:   error.digest ?? 'none',
        path:     typeof window !== 'undefined' ? window.location.pathname : 'unknown', // nosec — read-only pathname for Sentry error tag, no user input, no write
      },
    });
  }, [error]);

  const section = getSectionLink();

  return (
    <div className="min-h-[70vh] bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-6">

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
            Quelque chose s&apos;est mal passé
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Une erreur inattendue est survenue lors du chargement de cette page.
            Notre équipe a été automatiquement informée.
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

          {section ? (
            <Link
              href={section.href}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              {section.label}
            </Link>
          ) : (
            <Link
              href="/"
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}
