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
 *    1. Lit la session depuis les cookies SSR (getSession — pas d'appel réseau).
 *    2. Si pas de session → redirect('/connexion?next=/admin').
 *    3. Charge profiles.role via adminClient (service-role, bypass RLS total).
 *    4. Si role ∉ ['admin', 'moderator'] → redirect('/').
 *    5. Renvoie { actor: { id, role } } si tout est OK.
 *
 * ── Comparaison des couches de protection ────────────────────────────────────
 *
 *  Couche               | Emplacement    | Valide JWT | Vérifie rôle
 *  ─────────────────────┼────────────────┼────────────┼─────────────
 *  Middleware Edge      | src/middleware  | Non (eyJ)  | Non
 *  layout.tsx serveur   | admin/layout   | Oui*       | Oui ← barrière principale
 *  ProtectedPage        | client         | Non        | Oui (store)
 *  API routes admin     | api/admin/**   | Oui        | Oui (getAdminUser)
 *
 *  * JWT validé par le middleware via getSession() qui rafraîchit le token.
 *    verifyAdminLayout ne refait pas la validation JWT pour éviter les
 *    échecs sur token expiré côté SSR layout (cookie propagation Edge→RSC).
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
 *  - Utilise getSession() (lecture cookie locale, pas d'appel réseau) pour
 *    éviter les échecs sur JWT expiré quand le middleware Edge n'a pas pu
 *    rafraîchir les cookies avant le rendu du layout RSC.
 *  - Charge `profiles.role` via service-role key (bypass RLS total) pour éviter
 *    tout problème de policy RLS (récursion, cast enum, etc.).
 *  - Ne lance JAMAIS d'exception : les redirections sont gérées par
 *    next/navigation (elles lancent une erreur spéciale interceptée par Next.js).
 */
export async function verifyAdminLayout(): Promise<AdminLayoutOk> {
  // ── Étape 1 : lecture de la session depuis les cookies SSR ───────────────
  //
  // getSession() lit le cookie Supabase localement sans appel réseau.
  // C'est plus fiable que getUser() dans un layout RSC car :
  //   - getUser() fait un appel HTTP → peut échouer si JWT expiré et que
  //     le middleware Edge n'a pas propagé les cookies rafraîchis au RSC
  //   - getSession() retourne la session locale même si le JWT vient d'expirer
  //     (le middleware aura rafraîchi le token et mis à jour le cookie)
  //
  const ssrClient = createClient();
  const {
    data: { session },
  } = await ssrClient.auth.getSession();

  if (!session?.user?.id) {
    redirect('/connexion?next=/admin');
  }

  const userId = session.user.id;

  // ── Étape 2 : chargement du profil via service-role (bypass RLS total) ────
  //
  // createAdminClient() utilise SUPABASE_SERVICE_ROLE_KEY.
  // Bypass complet des policies RLS → pas de dépendance à is_moderator_or_admin()
  // ni aux policies SELECT sur profiles (qui peuvent avoir des problèmes de
  // cast enum user_role → text ou de récursion).
  //
  const adminDb = createAdminClient();

  const { data: profileRow, error: profileError } = await adminDb
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (profileError || !profileRow) {
    // Profil introuvable ou erreur DB → rediriger vers accueil (pas /connexion)
    redirect('/');
  }

  // ── Étape 3 : vérification du rôle ───────────────────────────────────────
  //
  // String() cast explicite : la colonne role est de type enum user_role en DB.
  // PostgREST la sérialise en string, mais on force le cast pour éviter tout
  // problème de comparaison TypeScript entre enum et string literal.
  //
  const role = String(profileRow.role);
  if (!ADMIN_ROLES.includes(role)) {
    redirect('/');
  }

  return {
    actor: {
      id: userId,
      role: role as AdminLayoutRole,
    },
  };
}
