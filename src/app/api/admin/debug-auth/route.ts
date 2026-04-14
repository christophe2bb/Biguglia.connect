/**
 * GET /api/admin/debug-auth
 *
 * Endpoint de diagnostic complet pour déboguer l'accès admin.
 * Affiche les cookies reçus, l'état auth, et le profil depuis la DB.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    cookiesSent: [] as string[],
    supabaseCookies: [] as string[],
    auth: null,
    profileAnon: null,
    profileServiceRole: null,
    diagnosis: null,
    error: null,
  };

  try {
    // ── 0. Lister TOUS les cookies reçus ───────────────────────────────────
    const allCookies = request.cookies.getAll();
    result.cookiesSent = allCookies.map(c => `${c.name}=${c.value.substring(0, 40)}...`);
    result.supabaseCookies = allCookies
      .filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
      .map(c => ({
        name: c.name,
        length: c.value.length,
        preview: c.value.substring(0, 60),
        startsWithEyJ: c.value.startsWith('eyJ') || c.value.includes('"access_token":"eyJ'),
      }));

    // ── 1. Essayer de lire la session via createServerClient ────────────────
    const cookieStore = cookies();
    const { url, anonKey } = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    };

    const ssrClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only in API route */ },
      },
    });

    // getUser() valide le JWT via réseau (pas getSession() qui lit localStorage)
    const { data: { user }, error: authError } = await ssrClient.auth.getUser();

    if (authError) {
      result.auth = {
        error: authError.message,
        status: authError.status,
        name: authError.name,
        user: null,
      };
    } else if (!user) {
      result.auth = {
        error: 'No user — session cookie manquant ou expiré',
        user: null,
      };
    } else {
      result.auth = {
        id: user.id,
        email: user.email,
        authenticated: true,
        last_sign_in_at: user.last_sign_in_at,
      };

      // ── 2. Lire le profil avec clé anon ──────────────────────────────────
      const { data: anonProfile, error: anonError } = await ssrClient
        .from('profiles')
        .select('id, role, email, full_name')
        .eq('id', user.id)
        .single();

      result.profileAnon = anonError
        ? { error: anonError.message, code: anonError.code, hint: anonError.hint, details: anonError.details }
        : anonProfile;

      // ── 3. Lire le profil avec service-role (bypass RLS) ─────────────────
      const adminDb = createAdminClient();
      const { data: srProfile, error: srError } = await adminDb
        .from('profiles')
        .select('id, role, email, full_name')
        .eq('id', user.id)
        .single();

      result.profileServiceRole = srError
        ? { error: srError.message, code: srError.code }
        : srProfile;

      // ── 4. Compter tous les profils (pour vérifier que la table existe) ──
      const { count, error: countError } = await adminDb
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      // ── 5. Diagnostic complet ─────────────────────────────────────────────
      result.diagnosis = {
        hasSession: true,
        userId: user.id,
        email: user.email,

        // Profil
        anonCanReadProfile: !anonError && !!anonProfile,
        rlsBlocksAnon: !!anonError,
        anonError: anonError?.message ?? null,

        // Rôle
        roleFromAnon: (anonProfile as Record<string,unknown>)?.role ?? null,
        roleFromServiceRole: (srProfile as Record<string,unknown>)?.role ?? null,
        isAdminOrModerator: ['admin', 'moderator'].includes((srProfile as Record<string,unknown>)?.role as string ?? ''),

        // Table
        profileTableExists: !countError,
        profileCount: countError ? `ERROR: ${countError.message}` : count,

        // Résumé des problèmes
        problems: [
          !!anonError && `RLS bloque SELECT sur profiles: ${anonError.message}`,
          !['admin', 'moderator'].includes((srProfile as Record<string,unknown>)?.role as string ?? '') && `Rôle insuffisant: "${(srProfile as Record<string,unknown>)?.role ?? 'null'}" (besoin: admin ou moderator)`,
          !!srError && `Service-role ne peut pas lire profiles: ${srError.message}`,
        ].filter(Boolean),

        // Actions à faire
        actions: [
          !!anonError && 'Exécuter SQL: CREATE POLICY "Profils lisibles" ON profiles FOR SELECT USING (true);',
          !['admin', 'moderator'].includes((srProfile as Record<string,unknown>)?.role as string ?? '') &&
            `Exécuter SQL: UPDATE profiles SET role = 'admin' WHERE id = '${user.id}';`,
        ].filter(Boolean),
      };
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    result.stack = e instanceof Error ? e.stack?.split('\n').slice(0, 5) : null;
  }

  return NextResponse.json(result, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
