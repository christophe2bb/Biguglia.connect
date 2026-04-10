/**
 * API Route: /api/emploi/contact
 * POST { type: 'offer' | 'demand', slug: string }
 *
 * Retourne les coordonnées UNIQUEMENT si l'utilisateur est connecté.
 * Accepte cookies SSR ET Authorization: Bearer <token>.
 * Retourne 403 si l'utilisateur est le propriétaire (il ne doit pas voir ce bloc).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/supabase/auth-helper';

export async function POST(req: NextRequest) {
  /* 1. Authentification (cookies SSR ou Bearer token) */
  const user = await getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { error: 'Vous devez être connecté pour accéder aux coordonnées.' },
      { status: 401 }
    );
  }

  /* 2. Lire le body */
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

  /* 4. Si l'utilisateur est le propriétaire → 403 (il voit le bloc "Gérer mon annonce") */
  if ((data as any).user_id === user.id) {
    return NextResponse.json({ error: 'Propriétaire de l\'annonce.' }, { status: 403 });
  }

  /* 5. Retourner les coordonnées */
  return NextResponse.json({
    contact_email:        (data as any).contact_email ?? null,
    contact_phone:        (data as any).contact_phone ?? null,
    contact_instructions: (data as any).contact_instructions ?? null,
    application_mode:     (data as any).application_mode ?? (data as any).contact_mode ?? null,
  });
}
