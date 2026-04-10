/**
 * API Route: /api/emploi/contact
 * POST { type: 'offer' | 'demand', slug: string }
 *
 * Retourne un objet unifié selon l'état de l'utilisateur :
 *   { status: 'owner' }                         — propriétaire de l'annonce
 *   { status: 'revealed', contact_email, ... }  — connecté, coordonnées révélées
 *   { status: 'guest' }                         — non authentifié (401)
 *   { status: 'not_found' }                     — annonce introuvable (404)
 *
 * Accepte Authorization: Bearer <token> (priorité) ou cookies SSR.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

async function getUserId(req: NextRequest): Promise<string | null> {
  // ── Priorité 1 : Bearer token dans le header Authorization
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const client = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: { user } } = await client.auth.getUser(token);
      if (user) return user.id;
    } catch { /* ignore */ }
  }

  // ── Priorité 2 : cookies SSR (fallback)
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user.id;
  } catch { /* ignore */ }

  return null;
}

export async function POST(req: NextRequest) {
  /* 1. Lire le body */
  let body: { type?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide.', status: 'error' }, { status: 400 });
  }

  const { type, slug } = body;
  if (!type || !slug || !['offer', 'demand'].includes(type)) {
    return NextResponse.json({ error: 'Paramètres manquants.', status: 'error' }, { status: 400 });
  }

  /* 2. Authentification */
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ status: 'guest' }, { status: 401 });
  }

  /* 3. Récupérer les données via admin (bypass RLS) */
  const table = type === 'offer' ? 'job_offers' : 'job_demands';
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(table)
    .select('user_id, contact_email, contact_phone, contact_instructions, application_mode')
    .eq('slug', slug)
    .maybeSingle();   // ← maybeSingle() au lieu de single() : pas d'erreur si 0 lignes

  if (error) {
    // Erreur DB réelle (ex : table manquante)
    console.error('[contact API] DB error:', error.message);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  /* 4. Propriétaire → répondre avec status 'owner' (200, pas 403) */
  if ((data as any).user_id === userId) {
    return NextResponse.json({ status: 'owner' });
  }

  /* 5. Retourner les coordonnées */
  return NextResponse.json({
    status: 'revealed',
    contact_email:        (data as any).contact_email        ?? null,
    contact_phone:        (data as any).contact_phone        ?? null,
    contact_instructions: (data as any).contact_instructions ?? null,
    application_mode:     (data as any).application_mode     ?? null,
  });
}
// force redeploy Fri Apr 10 09:15:56 UTC 2026
