/**
 * API Route — /api/emploi/demandes/[slug]
 * GET    : récupère une demande (propriétaire uniquement, bypass RLS)
 * DELETE : supprime une demande (propriétaire uniquement)
 * PATCH  : met à jour une demande (propriétaire uniquement) — body validé par Zod
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest, assertCsrfSafe } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: { slug: string };
}

// ── Types Supabase locaux ─────────────────────────────────────────────────────

/** Shape minimale retournée par .select('id, user_id') */
interface DemandOwnership {
  id: string;
  user_id: string;
}

/** Shape retournée par .select('slug') après update */
interface DemandSlug {
  slug: string;
}

// ── Zod — Schéma de mise à jour ───────────────────────────────────────────────
const CONTRACT_TYPES = [
  'cdi', 'cdd', 'saisonnier', 'mission', 'extra',
  'remplacement', 'alternance', 'stage', 'interim', 'freelance',
] as const;

const EMPLOYMENT_TYPES = ['temps_plein', 'temps_partiel', 'flexible'] as const;

const JOB_CATEGORIES = [
  'restauration', 'hotellerie', 'commerce', 'artisanat',
  'batiment', 'services_personne', 'administratif', 'logistique',
  'nettoyage', 'transport', 'sante', 'animation', 'petite_enfance',
  'association', 'evenementiel', 'agriculture', 'autre',
] as const;

const EXPERIENCE_LEVELS = ['debutant', 'junior', 'confirme', 'senior', 'expert'] as const;
const AVAILABILITY_TYPES = ['immediate', 'week', 'month', 'date', 'flexible'] as const;
const SALARY_PERIODS = ['hourly', 'monthly', 'yearly'] as const;

/** Seuls ces champs peuvent être mis à jour par le propriétaire */
const DemandePatchSchema = z.object({
  title:                   z.string().min(10).max(120).optional(),
  short_description:       z.string().min(50).max(300).optional(),
  full_description:        z.string().min(100).max(3000).nullable().optional(),
  job_category:            z.enum(JOB_CATEGORIES).optional(),
  desired_contract_types:  z.array(z.enum(CONTRACT_TYPES)).min(1).optional(),
  employment_type:         z.enum(EMPLOYMENT_TYPES).optional(),   // legacy field
  desired_employment_types: z.array(z.enum(EMPLOYMENT_TYPES)).min(1).optional(),
  location_city:           z.string().max(100).optional(),
  sector_id:               z.string().max(100).nullable().optional(),
  mobility_radius:         z.number().int().min(0).max(100).nullable().optional(),
  experience_level:        z.enum(EXPERIENCE_LEVELS).nullable().optional(),
  experience_years:        z.number().int().min(0).max(50).nullable().optional(),
  salary_expectation_min:  z.number().min(8).nullable().optional(),
  salary_expectation_max:  z.number().max(20000).nullable().optional(),
  salary_period:           z.enum(SALARY_PERIODS).nullable().optional(),
  salary_type:             z.string().max(50).nullable().optional(),  // TEXT column
  weekly_hours_desired:    z.number().min(1).max(48).nullable().optional(),
  is_flexible_schedule:    z.boolean().optional(),
  has_driving_license:     z.boolean().optional(),
  has_vehicle:             z.boolean().optional(),
  availability_type:       z.enum(AVAILABILITY_TYPES).optional(),
  available_from:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  is_urgent:               z.boolean().optional(),
  contact_email:           z.string().email().max(200).nullable().optional(),
  contact_phone:           z.string().max(20).nullable().optional(),
  contact_instructions:    z.string().max(500).nullable().optional(),
  contact_mode:            z.string().max(50).nullable().optional(),  // TEXT column
  skills:                  z.array(z.string().max(100)).max(30).nullable().optional(),
  cv_url:                  z.string().url().max(500).nullable().optional(),
}).strict();

type DemandePatch = z.infer<typeof DemandePatchSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function zodError(err: z.ZodError) {
  return NextResponse.json(
    { error: 'Données invalides', fieldErrors: err.flatten().fieldErrors },
    { status: 400 }
  );
}

// ── GET /api/emploi/demandes/[slug] ──────────────────────────────────────────
export async function GET(req: Request, { params }: RouteParams) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = createAdminClient();
  const { data: demand, error } = await admin
    .from('job_demands')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !demand) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });

  const d = demand as unknown as DemandOwnership;
  if (d.user_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  return NextResponse.json({ demand });
}

// ── DELETE /api/emploi/demandes/[slug] ───────────────────────────────────────
export async function DELETE(req: Request, { params }: RouteParams) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = createAdminClient();
  const { data: demand, error: fetchErr } = await admin
    .from('job_demands')
    .select('id, user_id')
    .eq('slug', params.slug)
    .single();

  if (fetchErr || !demand) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });

  const d = demand as unknown as DemandOwnership;
  if (d.user_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { error: deleteErr } = await admin
    .from('job_demands')
    .delete()
    .eq('id', d.id);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// ── PATCH /api/emploi/demandes/[slug] ────────────────────────────────────────
export async function PATCH(req: Request, { params }: RouteParams) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  // 1. Parse + validate body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide (JSON attendu)' }, { status: 400 });
  }

  const parsed = DemandePatchSchema.safeParse(rawBody);
  if (!parsed.success) return zodError(parsed.error);

  const body: DemandePatch = parsed.data;
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
  }

  // 2. Ownership check
  const admin = createAdminClient();
  const { data: demand, error: fetchErr } = await admin
    .from('job_demands')
    .select('id, user_id')
    .eq('slug', params.slug)
    .single();

  if (fetchErr || !demand) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });

  const d = demand as unknown as DemandOwnership;
  if (d.user_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  // 3. Build update payload (only validated fields, plus timestamp)
  const updates: Record<string, unknown> = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateErr } = await admin
    .from('job_demands')
    .update(updates)
    .eq('id', d.id)
    .select('slug')
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const u = updated as unknown as DemandSlug | null;
  return NextResponse.json({ success: true, slug: u?.slug });
}
