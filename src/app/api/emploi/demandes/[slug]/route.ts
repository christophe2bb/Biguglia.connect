/**
 * API Route — /api/emploi/demandes/[slug]
 * GET    : récupère une demande (propriétaire uniquement, bypass RLS)
 * DELETE : supprime une demande (propriétaire uniquement)
 * PATCH  : met à jour une demande (propriétaire uniquement)
 *
 * Utilise createClient() pour getUser() (cookies session)
 * et createAdminClient() (service role) pour lire/écrire sans RLS.
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: { slug: string };
}

// ── GET /api/emploi/demandes/[slug] ──────────────────────────────────────────
// Récupère les données complètes d'une demande pour son propriétaire (édition)
export async function GET(_req: Request, { params }: RouteParams) {
  // 1. Auth
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // 2. Lire la demande via admin (bypass RLS) ou via client authentifié
  let demand: Record<string, unknown> | null = null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('job_demands')
      .select('*')
      .eq('slug', params.slug)
      .single();
    if (!error && data) demand = data as Record<string, unknown>;
  }

  // Fallback : client authentifié (fonctionne via RLS si status=active/published)
  if (!demand) {
    const { data, error } = await supabase
      .from('job_demands')
      .select('*')
      .eq('slug', params.slug)
      .single();
    if (!error && data) demand = data as Record<string, unknown>;
  }

  if (!demand) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  // 3. Vérifier propriété
  if (demand.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  return NextResponse.json({ demand });
}

// ── DELETE /api/emploi/demandes/[slug] ───────────────────────────────────────
export async function DELETE(_req: Request, { params }: RouteParams) {
  // 1. Auth
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // 2. Lire la demande via admin (bypass RLS)
  const admin = createAdminClient();
  const { data: demand, error: fetchErr } = await admin
    .from('job_demands')
    .select('id, user_id')
    .eq('slug', params.slug)
    .single();

  if (fetchErr || !demand) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  // 3. Vérifier propriété
  if ((demand as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // 4. Supprimer via admin
  const { error: deleteErr } = await admin
    .from('job_demands')
    .delete()
    .eq('id', (demand as any).id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── PATCH /api/emploi/demandes/[slug] ────────────────────────────────────────
export async function PATCH(req: Request, { params }: RouteParams) {
  // 1. Auth
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // 2. Lire la demande via admin (bypass RLS)
  const admin = createAdminClient();
  const { data: demand, error: fetchErr } = await admin
    .from('job_demands')
    .select('id, user_id')
    .eq('slug', params.slug)
    .single();

  if (fetchErr || !demand) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  // 3. Vérifier propriété
  if ((demand as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body = await req.json();

  // 4. Champs autorisés
  const allowed = [
    'title', 'short_description', 'full_description',
    'job_category', 'desired_contract_types', 'employment_type',
    'location_city', 'sector_id', 'mobility_radius',
    'experience_level', 'experience_years',
    'salary_expectation_min', 'salary_expectation_max', 'salary_period', 'salary_type',
    'weekly_hours_desired', 'is_flexible_schedule',
    'has_driving_license', 'has_vehicle',
    'availability_type', 'available_from', 'is_urgent',
    'contact_email', 'contact_phone', 'contact_instructions', 'contact_mode',
    'skills', 'cv_url',
  ];

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // 5. Mettre à jour via admin
  const { data: updated, error: updateErr } = await admin
    .from('job_demands')
    .update(updates)
    .eq('id', (demand as any).id)
    .select('slug')
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug: (updated as any)?.slug });
}
