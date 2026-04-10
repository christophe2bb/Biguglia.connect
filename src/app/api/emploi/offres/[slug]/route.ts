/**
 * API Route — /api/emploi/offres/[slug]
 * DELETE : supprime une offre (propriétaire uniquement)
 * PATCH  : met à jour une offre (propriétaire uniquement)
 *
 * Utilise createClient() pour getUser() (cookies session)
 * et createAdminClient() (service role) pour lire/écrire sans RLS.
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: { slug: string };
}

// ── DELETE /api/emploi/offres/[slug] ────────────────────────────────────────
export async function DELETE(_req: Request, { params }: RouteParams) {
  // 1. Auth : qui appelle ?
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // 2. Lire l'offre via admin (bypass RLS → user_id toujours visible)
  const admin = createAdminClient();
  const { data: offer, error: fetchErr } = await admin
    .from('job_offers')
    .select('id, user_id')
    .eq('slug', params.slug)
    .single();

  if (fetchErr || !offer) {
    return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
  }

  // 3. Vérifier propriété
  if ((offer as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // 4. Supprimer via admin
  const { error: deleteErr } = await admin
    .from('job_offers')
    .delete()
    .eq('id', (offer as any).id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── PATCH /api/emploi/offres/[slug] ─────────────────────────────────────────
export async function PATCH(req: Request, { params }: RouteParams) {
  // 1. Auth
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // 2. Lire l'offre via admin
  const admin = createAdminClient();
  const { data: offer, error: fetchErr } = await admin
    .from('job_offers')
    .select('id, user_id')
    .eq('slug', params.slug)
    .single();

  if (fetchErr || !offer) {
    return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
  }

  // 3. Vérifier propriété
  if ((offer as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body = await req.json();

  // 4. Champs autorisés
  const allowed = [
    'title', 'short_description', 'full_description',
    'employer_name', 'location_city', 'location_address', 'sector_id',
    'contract_type', 'employment_type', 'experience_level',
    'salary_range_min', 'salary_range_max', 'salary_period', 'salary_type', 'salary_is_negotiable',
    'weekly_hours', 'is_flexible_schedule',
    'has_driving_license', 'requires_vehicle', 'provides_housing', 'provides_meals',
    'is_remote_possible', 'is_urgent',
    'contact_email', 'contact_phone', 'contact_instructions', 'application_mode',
    'required_skills', 'nice_to_have_skills',
    'start_date', 'availability',
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // 5. Mettre à jour via admin
  const { data: updated, error: updateErr } = await admin
    .from('job_offers')
    .update(updates)
    .eq('id', (offer as any).id)
    .select('slug')
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug: (updated as any)?.slug });
}
