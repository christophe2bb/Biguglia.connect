/**
 * src/app/not-found.tsx — Page 404 globale (Server Component)
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiché par Next.js pour toute URL ne correspondant à aucune route,
 * ainsi que pour chaque appel à notFound() dans les pages dynamiques.
 *
 * Positionnement dans l'arborescence :
 *   src/app/not-found.tsx   ← ce fichier (racine — hors tout route group)
 *
 * Comme il est à la racine, il n'hérite d'aucun layout de route group :
 * ni de (main)/layout.tsx ni de (private)/layout.tsx.
 * On réplique ici le shell minimal (AuthProvider + Navbar + Footer)
 * pour garder la cohérence visuelle de toutes les pages du site.
 *
 * Metadata :
 *   Next.js injecte automatiquement noindex sur les pages 404 —
 *   pas besoin de le déclarer explicitement.
 *
 * Référence Next.js : https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */

import Link from 'next/link';
import AuthProvider from '@/components/providers/AuthProvider';
import Navbar       from '@/components/layout/Navbar';
import Footer       from '@/components/layout/Footer';

// ─── Liens de navigation rapide ───────────────────────────────────────────────

const QUICK_LINKS = [
  { href: '/',          label: 'Accueil',          emoji: '🏠' },
  { href: '/annonces',  label: 'Petites annonces', emoji: '📋' },
  { href: '/artisans',  label: 'Artisans',         emoji: '🔧' },
  { href: '/forum',     label: 'Forum',             emoji: '💬' },
  { href: '/materiel',  label: 'Matériel',         emoji: '🏗️' },
  { href: '/evenements',label: 'Événements',       emoji: '📅' },
] as const;

// ─── Composant ────────────────────────────────────────────────────────────────

export default function NotFound() {
  return (
    <AuthProvider>
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 py-16 bg-gray-50">

        {/* Illustration numérique 404 */}
        <div className="select-none mb-6" aria-hidden="true">
          <span className="text-[96px] font-black leading-none tracking-tighter text-blue-600 opacity-10">
            404
          </span>
        </div>

        {/* Icône centrée */}
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6 -mt-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z"
            />
          </svg>
        </div>

        {/* Message */}
        <div className="text-center max-w-md mb-10 space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Page introuvable
          </h1>
          <p className="text-gray-500 leading-relaxed text-sm">
            L&apos;adresse que vous avez saisie n&apos;existe pas ou a été déplacée.
            Utilisez les liens ci-dessous pour retrouver votre chemin.
          </p>
        </div>

        {/* CTA principal */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-colors shadow-sm mb-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.204 3.045a1.5 1.5 0 0 1 2.092 0L22.25 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          Retour à l&apos;accueil
        </Link>

        {/* Liens rapides */}
        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-4">
            Ou explorez une section
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map(({ href, label, emoji }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm text-gray-700 font-medium hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <span aria-hidden="true">{emoji}</span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

      </main>

      <Footer />
    </AuthProvider>
  );
}
