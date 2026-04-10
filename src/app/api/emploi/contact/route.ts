/**
 * API Route: /api/emploi/contact
 * POST { type: 'offer' | 'demand', slug: string }
 *
 * Retourne les coordonnées UNIQUEMENT si l'utilisateur est connecté.
 * Accepte Authorization: Bearer <token> (priorité) ou cookies SSR.
 * Retourne 403 si l'utilisateur est le propriétaire.
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
  /* 1. Lire le body d'abord */
  let body: { type?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de la requête invalide.' }, { status: 400 });
  }

  const { type, slug } = body;
  if (!type || !slug || !['offer', 'demand'].includes(type)) {
    return NextResponse.json({ error: 'Paramètres manquants ou invalides.' }, { status: 400 });
  }

  /* 2. Authentification */
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: 'Vous devez être connecté pour accéder aux coordonnées.' },
      { status: 401 }
    );
  }

  /* 3. Récupérer les données via admin (bypass RLS) */
  const table = type === 'offer' ? 'job_offers' : 'job_demands';
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(table)
    .select('user_id, contact_email, contact_phone, contact_instructions, application_mode, contact_mode')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 });
  }

  /* 4. Propriétaire → 403 (il voit le bloc "Gérer mon annonce") */
  if ((data as any).user_id === userId) {
    return NextResponse.json({ error: "Propriétaire de l'annonce." }, { status: 403 });
  }

  /* 5. Retourner les coordonnées */
  return NextResponse.json({
    contact_email:        (data as any).contact_email        ?? null,
    contact_phone:        (data as any).contact_phone        ?? null,
    contact_instructions: (data as any).contact_instructions ?? null,
    application_mode:     (data as any).application_mode     ?? (data as any).contact_mode ?? null,
  });
}
