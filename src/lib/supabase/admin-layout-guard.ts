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
 *    3. Valide le JWT via adminDb.auth.getUser(accessToken) — service-role key,
 *       validation cryptographique réelle sans problème de cookie propagation.
 *    4. Charge profiles.role via adminClient (service-role, bypass RLS).
 *    5. Si role ∉ ['admin', 'moderator'] → redirect('/').
 *    6. Renvoie { actor: { id, role } } si tout est OK.
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
 *  - Utilise getSession() (lecture cookie locale) + adminDb.auth.getUser(token)
 *    (validation JWT réelle via service-role key, sans problème de cookie SSR).
 *  - Charge `profiles.role` via service-role key (bypass RLS) pour éviter
 *    qu'une policy trop restrictive empêche la lecture du rôle.
 *  - Ne lance JAMAIS d'exception : les redirections sont gérées par
 *    next/navigation (elles lancent une erreur spéciale interceptée par Next.js).
 */
export async function verifyAdminLayout(): Promise<AdminLayoutOk> {
  // ── Étape 1 : récupération de la session depuis les cookies ───────────────
  //
  // On utilise getSession() + adminDb.auth.getUser(token) au lieu de
  // ssrClient.auth.getUser() seul, pour deux raisons :
  //
  //  a) getUser() fait un appel HTTP vers Supabase Auth API — si le JWT est
  //     expiré et que le middleware n'a pas pu rafraîchir les cookies (cas
  //     fréquent après un blocage IP ou un long délai), getUser() échoue et
  //     redirige vers /connexion alors que l'utilisateur est bien admin.
  //
  //  b) getSession() lit les cookies locaux directement (pas d'appel réseau),
  //     puis on valide le JWT via adminDb.auth.getUser(accessToken) qui utilise
  //     la service-role key — cette validation est cryptographiquement fiable
  //     et bypass les problèmes de refresh token côté SSR.
  //
  const ssrClient = createClient();
  const {
    data: { session },
  } = await ssrClient.auth.getSession();

  if (!session?.access_token || !session?.user?.id) {
    redirect('/connexion?next=/admin');
  }

  const userId = session.user.id;
  const accessToken = session.access_token;

  // ── Étape 2 : validation du JWT + chargement du rôle (bypass RLS) ────────
  //
  // createAdminClient() utilise la service-role key — bypass RLS complet.
  // On valide le JWT cryptographiquement ET on récupère le rôle en un seul
  // client, évitant tout problème de cookie propagation.
  const adminDb = createAdminClient();

  // Validation JWT réelle par Supabase Auth (signature + expiration)
  const { data: { user: validatedUser }, error: userError } =
    await adminDb.auth.getUser(accessToken);

  if (userError || !validatedUser) {
    // JWT invalide ou expiré sans possibilité de refresh côté SSR
    redirect('/connexion?next=/admin');
  }

  // ── Étape 3 : chargement du profil DB (bypass RLS via service-role) ───────
  const { data: profileRow, error: profileError } = await adminDb
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (profileError || !profileRow) {
    // Profil introuvable ou erreur DB → pas admin
    redirect('/');
  }

  // ── Étape 4 : vérification du rôle ───────────────────────────────────────
  const role = String(profileRow.role); // cast explicite (enum user_role → string)
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
