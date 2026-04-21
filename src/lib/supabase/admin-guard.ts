/**
 * src/lib/supabase/admin-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard serveur pour les API Routes d'administration.
 *
 * Problème résolu :
 *   Les mutations admin (suspension, suppression, changement de rôle, validation
 *   artisan, modération) étaient exécutées directement depuis le navigateur via
 *   await createClient() (anon key). La sécurité reposait uniquement sur les policies
 *   RLS de Supabase. Une policy trop large permettrait à un non-admin d'exécuter
 *   les mêmes requêtes depuis la console ou un script.
 *
 * Solution :
 *   Toutes les mutations admin transitent par des API Routes Next.js.
 *   Chaque route commence par `getAdminUser(req)` qui :
 *     1. Résout la session via cookies SSR (getUserFromRequest)
 *     2. Charge le profil depuis la DB via createAdminClient (bypass RLS)
 *     3. Vérifie que role === 'admin' ou 'moderator'
 *   Seuls les rôles strictement admin ont accès au `adminClient`.
 *
 * Usage type :
 *   const guard = await getAdminUser(req);
 *   if (!guard.ok) return guard.response;          // 401 ou 403 prêt
 *   // guard.adminClient  → SupabaseClient service-role (bypass RLS)
 *   // guard.actor        → { id, role } de l'admin authentifié
 *
 * SCOPE : API Routes uniquement (src/app/api/admin/**)
 * NE PAS importer dans des Client Components.
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/auth-helper';
import { createAdminClient } from '@/lib/supabase/server';
import { captureAuthError } from '@/lib/monitoring/sentry';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminRole = 'admin' | 'moderator';

export interface AdminActor {
  id: string;
  role: AdminRole;
}

/** Résultat succès : guard passé */
export interface AdminGuardOk {
  ok: true;
  actor: AdminActor;
  adminClient: ReturnType<typeof createAdminClient>;
}

/** Résultat échec : réponse 401/403 à retourner directement */
export interface AdminGuardFail {
  ok: false;
  response: NextResponse;
}

export type AdminGuardResult = AdminGuardOk | AdminGuardFail;

// ── Constantes ────────────────────────────────────────────────────────────────

const ADMIN_ROLES: AdminRole[] = ['admin', 'moderator'];

// ── Guard ─────────────────────────────────────────────────────────────────────

/**
 * Vérifie côté serveur que le requérant est bien admin ou modérateur.
 *
 * Étapes :
 *   1. Résout la session (cookies SSR ou Bearer)
 *   2. Charge profiles.role via le client admin (pas soumis aux policies RLS)
 *   3. Refuse si role n'est pas dans ['admin', 'moderator']
 *
 * @returns AdminGuardOk  avec actor + adminClient si autorisé
 * @returns AdminGuardFail avec une Response 401/403 si non autorisé
 */
export async function getAdminUser(req: Request): Promise<AdminGuardResult> {
  // ── Étape 1 : session ──────────────────────────────────────────────────────
  const user = await getUserFromRequest(req);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Non authentifié.' },
        { status: 401 },
      ),
    };
  }

  // ── Étape 2 : charger le profil (bypass RLS — service role) ───────────────
  const adminClient = createAdminClient();
  const { data: profileRow, error } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (error || !profileRow) {
    // Profil manquant alors que l'utilisateur est authentifié → anomalie à surveiller
    captureAuthError('profile_load_failed', {
      event: 'profile_load_failed',
      userId: user.id,
      extra: { supabaseError: error?.message },
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Profil introuvable.' },
        { status: 401 },
      ),
    };
  }

  // ── Étape 3 : vérifier le rôle ────────────────────────────────────────────
  const role = profileRow.role as string;
  if (!ADMIN_ROLES.includes(role as AdminRole)) {
    // Tentative d'accès admin par un non-admin → log Sentry (niveau warning, pas error)
    captureAuthError('admin_access_denied', {
      event:    'admin_access_denied',
      userId:   user.id,
      userRole: role,
      tags:     { role },
      level:    'warning',
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Accès réservé aux administrateurs.' },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    actor: { id: user.id, role: role as AdminRole },
    adminClient,
  };
}
