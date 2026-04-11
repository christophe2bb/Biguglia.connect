/**
 * Route de diagnostic TEMPORAIRE — NE PAS LAISSER EN PRODUCTION.
 * Active uniquement si DEBUG_SESSION_KEY est défini dans les env vars.
 * Permet de vérifier si les cookies Supabase sont correctement transmis
 * au serveur (middleware Edge + API Routes).
 *
 * Usage: GET /api/debug-session?key=<DEBUG_SESSION_KEY>
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  // Sécurité : désactivé si pas de clé debug configurée
  const debugKey = process.env.DEBUG_SESSION_KEY;
  if (!debugKey) {
    return NextResponse.json({ error: 'Debug non activé' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== debugKey) {
    return NextResponse.json({ error: 'Clé invalide' }, { status: 403 });
  }

  // Liste des cookies présents
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'));

  // Tenter de lire la session via l'admin client (Bearer token depuis header)
  const authHeader = req.headers.get('authorization');
  let bearerUserId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7).trim();
      const admin = createAdminClient();
      const { data: { user } } = await admin.auth.getUser(token);
      bearerUserId = user?.id ?? null;
    } catch { /* ignore */ }
  }

  // Env vars (masquées)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    cookies: {
      total: allCookies.length,
      supabase_cookies: supabaseCookies.map(c => ({
        name: c.name,
        length: c.value.length,
        preview: c.value.slice(0, 20) + '...',
      })),
    },
    env: {
      supabase_url: supabaseUrl ? supabaseUrl.trim().slice(0, 40) + '...' : 'MANQUANT',
      supabase_url_has_newline: supabaseUrl !== supabaseUrl.trim(),
      anon_key_length: anonKey.length,
      anon_key_has_newline: anonKey !== anonKey.trim(),
      anon_key_preview: anonKey ? anonKey.trim().slice(0, 20) + '...' : 'MANQUANT',
    },
    bearer_user_id: bearerUserId,
    request_headers: {
      host: req.headers.get('host'),
      cookie_count: req.cookies.getAll().length,
      user_agent: (req.headers.get('user-agent') ?? '').slice(0, 80),
    },
  });
}
