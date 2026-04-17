/**
 * GET /api/admin/debug-session
 * Endpoint de diagnostic temporaire — À SUPPRIMER après résolution du bug admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getSupabaseProjectRef } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

function decodeJwtSub(token: string): { sub: string | null; exp: number | null; expired: boolean } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { sub: null, exp: null, expired: false };
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded  = payload + '=='.slice(0, (4 - payload.length % 4) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
    const sub  = (decoded.sub as string) ?? null;
    const exp  = (decoded.exp as number) ?? null;
    const expired = exp ? exp < Math.floor(Date.now() / 1000) : false;
    return { sub, exp, expired };
  } catch {
    return { sub: null, exp: null, expired: false };
  }
}

export async function GET(_req: NextRequest) {
  const result: Record<string, unknown> = {};

  const cookieStore = cookies();
  const allCookies  = cookieStore.getAll();
  const projectRef  = getSupabaseProjectRef();
  const cookieName  = `sb-${projectRef}-auth-token`;

  // 1. Cookies présents
  const supabaseCookies = allCookies
    .filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
    .map(c => ({ name: c.name, length: c.value.length, preview: c.value.slice(0, 80) + '...' }));

  result.cookies = {
    total: allCookies.length,
    cookieName,
    projectRef,
    supabaseCount: supabaseCookies.length,
    supabaseNames: supabaseCookies.map(c => c.name),
    supabaseDetails: supabaseCookies,
  };

  // 2. Décoder le cookie JSON brut
  let userId: string | null = null;

  const rawCookie = cookieStore.get(cookieName)?.value;
  if (rawCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawCookie)) as Record<string, unknown>;
      const token  = parsed.access_token as string | undefined;
      if (token) {
        const { sub, exp, expired } = decodeJwtSub(token);
        userId = sub;
        result.cookieDecode = { format: 'json-brut', sub, exp, expired, tokenLength: token.length };
      }
    } catch {
      result.cookieDecode = { format: 'json-brut', error: 'parse failed' };
    }
  }

  // Format chunké .0
  if (!userId) {
    const chunk0 = cookieStore.get(`${cookieName}.0`)?.value;
    if (chunk0) {
      try {
        const parsed = JSON.parse(decodeURIComponent(chunk0)) as Record<string, unknown>;
        const token  = parsed.access_token as string | undefined;
        if (token) {
          const { sub, exp, expired } = decodeJwtSub(token);
          userId = sub;
          result.cookieDecode = { format: 'chunked-.0', sub, exp, expired, tokenLength: token.length };
        }
      } catch {
        result.cookieDecode = { format: 'chunked-.0', error: 'parse failed' };
      }
    }
  }

  result.extractedUserId = userId;

  // 3. Charger le profil si userId trouvé
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
        isAdmin: profile?.role ? ['admin','moderator'].includes(String(profile.role)) : false,
        error: profileError?.message ?? null,
        errorCode: profileError?.code ?? null,
      };
    } catch (e) {
      result.profile = { ok: false, error: String(e) };
    }
  } else {
    result.profile = { ok: false, reason: 'pas de userId extrait du cookie' };
  }

  // 4. Variables d'env
  result.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  // 5. Résumé
  result.summary = {
    cookiePresent: !!rawCookie,
    userIdExtracted: !!userId,
    profileLoaded: !!(result.profile as Record<string,unknown>)?.ok,
    isAdmin: !!(result.profile as Record<string,unknown>)?.isAdmin,
    verdict: !!userId && !!(result.profile as Record<string,unknown>)?.isAdmin
      ? '✅ DEVRAIT FONCTIONNER'
      : '❌ PROBLÈME DÉTECTÉ',
  };

  return NextResponse.json(result, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
