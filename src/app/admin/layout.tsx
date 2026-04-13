/**
 * src/app/admin/layout.tsx — Server Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout racine de toutes les pages /admin/*.
 *
 * ── Rôle de sécurité ─────────────────────────────────────────────────────────
 *
 *  Ce layout est exécuté côté serveur (Node.js) AVANT tout rendu de page.
 *  Il constitue la troisième couche de protection admin, la seule côté serveur
 *  qui vérifie réellement le rôle :
 *
 *    Couche 1 – Middleware Edge  : vérifie qu'un JWT existe (eyJ…) — pas de
 *               signature, pas de rôle.
 *    Couche 2 – Layout serveur   : valide le JWT via auth.getUser() et vérifie
 *               profiles.role ∈ ['admin','moderator'] — CETTE COUCHE.
 *    Couche 3 – ProtectedPage    : vérification côté client (store Zustand).
 *    Couche 4 – API routes admin : getAdminUser() — mutations uniquement.
 *
 *  Si l'utilisateur n'est pas authentifié → redirect /connexion?next=/admin.
 *  Si l'utilisateur est authentifié mais n'est pas admin/modérateur → redirect /.
 *
 * ── Pas de 'use client' ───────────────────────────────────────────────────────
 *
 *  Ce fichier est intentionnellement un Server Component (aucun 'use client').
 *  Les pages enfants restent 'use client' et continuent d'utiliser ProtectedPage
 *  comme garde de présentation. Le layout est le seul point d'entrée
 *  côté serveur pour /admin/*.
 *
 * ── Impact sur le bundle ─────────────────────────────────────────────────────
 *
 *  Zéro impact : ce composant n'est jamais envoyé au navigateur.
 *  Les imports (createClient, createAdminClient) ne polluent pas le bundle JS
 *  client grâce à la frontière Server/Client de Next.js App Router.
 */

import { verifyAdminLayout } from '@/lib/supabase/admin-layout-guard';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * AdminLayout — Server Component racine de /admin.
 *
 * next/navigation.redirect() lance une exception spéciale interceptée par
 * Next.js avant que `children` ne soit rendu. Le composant ne retourne jamais
 * de JSX si l'utilisateur n'est pas autorisé.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Lance une redirect si non authentifié ou rôle insuffisant.
  // Si on arrive ici, l'acteur est admin ou moderator.
  await verifyAdminLayout();

  return <>{children}</>;
}
