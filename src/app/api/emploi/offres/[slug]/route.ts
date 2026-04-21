/**
 * API Route — /api/emploi/offres/[slug]
 * GET    : récupère une offre (propriétaire uniquement, bypass RLS)
 * DELETE : supprime une offre (propriétaire uniquement)
 * PATCH  : met à jour une offre (propriétaire uniquement) — body validé par Zod
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest, assertCsrfSafe } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ── Types Supabase locaux ─────────────────────────────────────────────────────

/** Shape minimale retournée par .select('id, user_id') */
interface OfferOwnership {
  id: string;
  user_id: string;
}

/** Shape retournée par .select('slug') après update */
interface OfferSlug {
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
const APPLICATION_MODES = ['email', 'phone', 'on_site', 'mixed'] as const;

/** Seuls ces champs peuvent être mis à jour par le propriétaire */
const OffrePatchSchema = z.object({
  title:                z.string().min(10).max(120).optional(),
  short_description:    z.string().min(50).max(300).optional(),
  full_description:     z.string().min(100).max(3000).nullable().optional(),
  employer_name:        z.string().max(200).nullable().optional(),
  location_city:        z.string().max(100).optional(),
  location_address:     z.string().max(200).nullable().optional(),
  sector_id:            z.string().max(100).nullable().optional(),
  job_category:         z.enum(JOB_CATEGORIES).optional(),
  contract_type:        z.enum(CONTRACT_TYPES).optional(),
  employment_type:      z.enum(EMPLOYMENT_TYPES).optional(),
  experience_level:     z.enum(EXPERIENCE_LEVELS).nullable().optional(),
  salary_range_min:     z.number().min(8).nullable().optional(),
  salary_range_max:     z.number().max(20000).nullable().optional(),
  salary_period:        z.enum(SALARY_PERIODS).nullable().optional(),
  salary_type:          z.string().max(50).nullable().optional(),     // TEXT column
  salary_is_negotiable: z.boolean().optional(),
  weekly_hours:         z.number().min(1).max(48).nullable().optional(),
  is_flexible_schedule: z.boolean().optional(),
  has_driving_license:  z.boolean().optional(),
  requires_vehicle:     z.boolean().optional(),
  provides_housing:     z.boolean().optional(),
  provides_meals:       z.boolean().optional(),
  is_remote_possible:   z.boolean().optional(),
  is_urgent:            z.boolean().optional(),
  availability_type:    z.enum(AVAILABILITY_TYPES).optional(),
  application_mode:     z.enum(APPLICATION_MODES).optional(),
  contact_email:        z.string().email().max(200).nullable().optional(),
  contact_phone:        z.string().max(20).nullable().optional(),
  contact_instructions: z.string().max(500).nullable().optional(),
  required_skills:      z.array(z.string().max(100)).max(30).nullable().optional(),
  nice_to_have_skills:  z.array(z.string().max(100)).max(30).nullable().optional(),
  start_date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  availability:         z.string().max(200).nullable().optional(),
}).strict();

type OffrePatch = z.infer<typeof OffrePatchSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function zodError(err: z.ZodError) {
  return NextResponse.json(
    { error: 'Données invalides', fieldErrors: err.flatten().fieldErrors },
    { status: 400 }
  );
}

// ── GET /api/emploi/offres/[slug] ────────────────────────────────────────────
export async function GET(req: Request, { params }: RouteParams) {
  const { slug } = await params;
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = createAdminClient();
  const { data: offer, error } = await admin
    .from('job_offers')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });

  const o = offer as unknown as OfferOwnership;
  if (o.user_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  return NextResponse.json({ offer });
}

// ── DELETE /api/emploi/offres/[slug] ────────────────────────────────────────
export async function DELETE(req: Request, { params }: RouteParams) {
  const { slug } = await params;

  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = createAdminClient();
  const { data: offer, error: fetchErr } = await admin
    .from('job_offers')
    .select('id, user_id')
    .eq('slug', slug)
    .single();

  if (fetchErr || !offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });

  const o = offer as unknown as OfferOwnership;
  if (o.user_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { error: deleteErr } = await admin
    .from('job_offers')
    .delete()
    .eq('id', o.id);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// ── PATCH /api/emploi/offres/[slug] ─────────────────────────────────────────
export async function PATCH(req: Request, { params }: RouteParams) {
  const { slug } = await params;

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

  const parsed = OffrePatchSchema.safeParse(rawBody);
  if (!parsed.success) return zodError(parsed.error);

  const body: OffrePatch = parsed.data;
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
  }

  // 2. Ownership check
  const admin = createAdminClient();
  const { data: offer, error: fetchErr } = await admin
    .from('job_offers')
    .select('id, user_id')
    .eq('slug', slug)
    .single();

  if (fetchErr || !offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });

  const o = offer as unknown as OfferOwnership;
  if (o.user_id !== user.id) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  // 3. Build update payload (only validated fields, plus timestamp)
  const updates: Record<string, unknown> = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateErr } = await admin
    .from('job_offers')
    .update(updates)
    .eq('id', o.id)
    .select('slug')
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const u = updated as unknown as OfferSlug | null;
  return NextResponse.json({ success: true, slug: u?.slug });
}
