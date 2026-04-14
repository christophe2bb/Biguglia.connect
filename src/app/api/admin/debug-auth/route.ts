/**
 * GET /api/admin/debug-auth
 *
 * Endpoint de diagnostic pour déboguer l'accès admin.
 * Retourne l'état d'authentification et le rôle de l'utilisateur connecté.
 * Utilise la service-role key pour bypass RLS — toujours vrai côté serveur.
 *
 * ⚠️  Cet endpoint ne doit PAS être protégé par role check car il sert
 *     justement à diagnostiquer pourquoi le role check échoue.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    auth: null,
    profileAnon: null,
    profileServiceRole: null,
    error: null,
  };

  try {
    // ── 1. Vérifier la session (JWT) ─────────────────────────────────────────
    const ssrClient = createClient();
    const { data: { user }, error: authError } = await ssrClient.auth.getUser();

    if (authError) {
      result.auth = { error: authError.message, user: null };
    } else if (!user) {
      result.auth = { error: 'No user in session (not logged in)', user: null };
    } else {
      result.auth = {
        id: user.id,
        email: user.email,
        authenticated: true,
      };

      // ── 2. Lire le profil avec la clé anon (comme le navigateur) ───────────
      const { data: anonProfile, error: anonError } = await ssrClient
        .from('profiles')
        .select('id, role, email, full_name')
        .eq('id', user.id)
        .single();

      result.profileAnon = anonError
        ? { error: anonError.message, code: anonError.code, hint: anonError.hint }
        : anonProfile;

      // ── 3. Lire le profil avec service-role (bypass RLS) ───────────────────
      const adminDb = createAdminClient();
      const { data: srProfile, error: srError } = await adminDb
        .from('profiles')
        .select('id, role, email, full_name')
        .eq('id', user.id)
        .single();

      result.profileServiceRole = srError
        ? { error: srError.message, code: srError.code }
        : srProfile;

      // ── 4. Diagnostic ────────────────────────────────────────────────────────
      result.diagnosis = {
        hasSession: true,
        anonCanReadProfile: !anonError && !!anonProfile,
        roleFromAnon: anonProfile?.role ?? null,
        roleFromServiceRole: srProfile?.role ?? null,
        isAdminOrModerator: ['admin', 'moderator'].includes(srProfile?.role ?? ''),
        rlsProblem: !!anonError && !srError,
        roleProblem: !['admin', 'moderator'].includes(srProfile?.role ?? ''),
      };
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
