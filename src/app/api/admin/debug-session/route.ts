/**
 * GET /api/admin/debug-session
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoint de diagnostic temporaire — À SUPPRIMER après résolution du bug admin.
 *
 * Teste la session SSR, le refresh et le profil sans redirection,
 * pour diagnostiquer pourquoi verifyAdminLayout() échoue.
 *
 * Usage : ouvrir https://biguglia-connect.vercel.app/api/admin/debug-session
 * dans le navigateur de l'admin pour voir l'état de la session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const result: Record<string, unknown> = {};

  // 1. Liste des cookies présents
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const supabaseCookies = allCookies
    .filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
    .map(c => ({
      name: c.name,
      length: c.value.length,
      preview: c.value.slice(0, 60) + (c.value.length > 60 ? '...' : ''),
    }));
  result.cookies = {
    total: allCookies.length,
    supabaseCount: supabaseCookies.length,
    supabaseNames: supabaseCookies.map(c => c.name),
    supabaseDetails: supabaseCookies,
  };

  // 2. getSession()
  try {
    const ssrClient = createClient();
    const { data: { session }, error } = await ssrClient.auth.getSession();
    result.getSession = {
      ok: !!session,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
      expiresAt: session?.expires_at ?? null,
      error: error?.message ?? null,
    };

    // 3. Si pas de session → tenter refreshSession()
    if (!session) {
      const { data: refreshData, error: refreshError } = await ssrClient.auth.refreshSession();
      result.refreshSession = {
        ok: !!refreshData?.session,
        userId: refreshData?.session?.user?.id ?? null,
        error: refreshError?.message ?? null,
      };
    }

    // 4. Charger le profil via service-role
    const userId = session?.user?.id ?? null;
    if (userId) {
      try {
        const adminDb = createAdminClient();
        const { data: profile, error: profileError } = await adminDb
          .from('profiles')
          .select('id, role')
          .eq('id', userId)
          .single();
        result.profile = {
          ok: !!profile,
          id: profile?.id ?? null,
          role: profile?.role ?? null,
          roleType: typeof profile?.role,
          error: profileError?.message ?? null,
          errorCode: profileError?.code ?? null,
        };
      } catch (e) {
        result.profile = { ok: false, error: String(e) };
      }
    } else {
      result.profile = { ok: false, reason: 'pas de userId' };
    }

  } catch (e) {
    result.getSession = { ok: false, error: String(e) };
  }

  // 5. Variables d'env présentes (sans révéler les valeurs)
  result.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  return NextResponse.json(result, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'X-Debug': 'admin-session-diagnostic',
    },
  });
}
