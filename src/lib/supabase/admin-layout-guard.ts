/**
 * src/lib/supabase/admin-layout-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard serveur pour le layout /admin — Server Component uniquement.
 *
 * ── Pourquoi ce fichier ? ────────────────────────────────────────────────────
 *
 *  Jusqu'ici, la protection de /admin reposait sur deux couches côté client :
 *    1. Le middleware (src/middleware.ts) vérifie uniquement qu'un access_token
 *       "ressemblant à un JWT" existe dans le cookie — pas de vérification de
 *       signature, pas de vérification de rôle.
 *    2. ProtectedPage (adminOnly) vérifie le rôle depuis le store Zustand
 *       (chargé en JS côté navigateur) — protection UI, contournable.
 *
 *  Conséquence : un utilisateur connecté (rôle ≠ admin) peut atteindre
 *  l'interface admin avant d'être rejeté côté client. Ce n'est pas une fuite
 *  critique (ProtectedPage + RLS l'en empêche), mais ce n'est pas "fort".
 *
 * ── Solution : Server Component Layout ───────────────────────────────────────
 *
 *  src/app/admin/layout.tsx est un Server Component (pas de 'use client').
 *  Next.js l'exécute sur le serveur avant tout rendu de page /admin/*.
 *  Il appelle `verifyAdminLayout()` qui :
 *    1. Crée un client Supabase SSR (cookies) et appelle auth.getUser()
 *       → validation JWT réelle par Supabase (signature + expiration).
 *    2. Si pas de session → redirect('/connexion?next=/admin').
 *    3. Charge profiles.role via createAdminClient (service-role, bypass RLS).
 *    4. Si role ∉ ['admin', 'moderator'] → redirect('/').
 *    5. Renvoie { actor: { id, role } } si tout est OK.
 *
 * ── Comparaison des couches de protection ────────────────────────────────────
 *
 *  Couche               | Emplacement    | Valide JWT | Vérifie rôle
 *  ─────────────────────┼────────────────┼────────────┼─────────────
 *  Middleware Edge      | src/middleware  | Non (eyJ)  | Non
 *  layout.tsx serveur   | admin/layout   | Oui        | Oui ← nouveau
 *  ProtectedPage        | client         | Non        | Oui (store)
 *  API routes admin     | api/admin/**   | Oui        | Oui (getAdminUser)
 *
 * ── SCOPE ────────────────────────────────────────────────────────────────────
 *
 *  Ce fichier est importé UNIQUEMENT par src/app/admin/layout.tsx.
 *  Ne pas importer dans des Client Components (imports 'next/headers').
 */

import { redirect } from 'next/navigation';
import 'server-only';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminLayoutRole = 'admin' | 'moderator';

export interface AdminLayoutActor {
  id: string;
  role: AdminLayoutRole;
}

/** Résultat retourné quand le guard passe. */
export interface AdminLayoutOk {
  actor: AdminLayoutActor;
}

const ADMIN_ROLES: readonly string[] = ['admin', 'moderator'] as const;

// ── Guard ─────────────────────────────────────────────────────────────────────

/**
 * verifyAdminLayout — Guard serveur pour le layout /admin.
 *
 * À appeler en tête du Server Component `src/app/admin/layout.tsx`.
 * Effectue deux redirections si les conditions ne sont pas remplies :
 *   - /connexion?next=/admin  si l'utilisateur n'est pas authentifié
 *   - /                       si l'utilisateur n'a pas le rôle admin/moderator
 *
 * @returns AdminLayoutOk avec l'actor identifié si tout est OK.
 *
 * @remarks
 *  - Utilise `auth.getUser()` (validation JWT réelle, pas `getSession()`).
 *  - Charge `profiles.role` via service-role key (bypass RLS) pour éviter
 *    qu'une policy trop restrictive empêche la lecture du rôle.
 *  - Ne lance JAMAIS d'exception : les redirections sont gérées par
 *    next/navigation (elles lancent une erreur spéciale interceptée par Next.js).
 */
export async function verifyAdminLayout(): Promise<AdminLayoutOk> {
  // ── Étape 1 : authentification réelle (JWT validé par Supabase) ───────────
  const ssrClient = createClient();
  const {
    data: { user },
    error: authError,
  } = await ssrClient.auth.getUser();

  if (authError || !user) {
    redirect('/connexion?next=/admin');
  }

  // ── Étape 2 : charge le rôle via service-role (bypass RLS) ───────────────
  const adminDb = createAdminClient();
  const { data: profileRow, error: profileError } = await adminDb
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profileRow) {
    // Profil introuvable ou erreur DB → pas admin
    redirect('/');
  }

  // ── Étape 3 : vérification du rôle ───────────────────────────────────────
  const role = profileRow.role as string;
  if (!ADMIN_ROLES.includes(role)) {
    redirect('/');
  }

  return {
    actor: {
      id: user.id,
      role: role as AdminLayoutRole,
    },
  };
}
