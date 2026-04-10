/**
 * API Route: /api/emploi/contact
 * POST { type: 'offer' | 'demand', slug: string }
 *
 * Returns contact details (email/phone) ONLY if the caller is authenticated.
 * The DB row is fetched server-side so credentials never appear in client HTML.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();

  /* 1. Vérifier l'authentification */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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

  /* 3. Récupérer les coordonnées depuis la base */
  const table = type === 'offer' ? 'job_offers' : 'job_demands';

  const { data, error } = await supabase
    .from(table)
    .select('contact_email, contact_phone, contact_instructions, application_mode, contact_mode')
    .eq('slug', slug)
    .in('status', ['published', 'active'])
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 });
  }

  /* 4. Retourner les coordonnées */
  return NextResponse.json({
    contact_email: data.contact_email ?? null,
    contact_phone: data.contact_phone ?? null,
    contact_instructions: data.contact_instructions ?? null,
    application_mode: (data as Record<string, unknown>).application_mode as string ?? (data as Record<string, unknown>).contact_mode as string ?? null,
  });
}
