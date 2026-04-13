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
 *
 * ─── Différence offer vs demand ───────────────────────────────────────────────
 * job_offers  : possède contact_email, contact_phone, contact_instructions,
 *               application_mode — on les retourne directement.
 * job_demands : N'a PAS ces colonnes. On retourne le contact du candidat
 *               via la table profiles (email + phone).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

// ── Schéma de validation ────────────────────────────────────────────────────

const ContactBodySchema = z.object({
  type: z.enum(['offer', 'demand']),
  slug: z
    .string()
    .trim()
    .min(3,  'slug trop court')
    .max(120, 'slug trop long')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/i, 'slug invalide'),
});

// ── Types des lignes DB ─────────────────────────────────────────────────────

type OfferContactRow = {
  user_id:              string;
  contact_email:        string | null;
  contact_phone:        string | null;
  contact_instructions: string | null;
  application_mode:     string | null;
};

type DemandOwnerRow = {
  user_id: string;
};

type ProfileRow = {
  email: string | null;
  phone: string | null;
};

// ── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  /* 1. Valider le body */
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide.', status: 'error' }, { status: 400 });
  }

  const parsed = ContactBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides.', status: 'error', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { type, slug } = parsed.data;

  /* 2. Authentification */
  const userId = await getUserIdBearerFirst(req);
  if (!userId) {
    return NextResponse.json({ status: 'guest' }, { status: 401 });
  }

  const admin = createAdminClient();

  /* ════════════════════════════════════════════════════════════════
     OFFRE D'EMPLOI — colonnes contact directement sur job_offers
  ════════════════════════════════════════════════════════════════ */
  if (type === 'offer') {
    const { data, error } = await admin
      .from('job_offers')
      .select('user_id, contact_email, contact_phone, contact_instructions, application_mode')
      .eq('slug', slug)
      .maybeSingle<OfferContactRow>();

    if (error) {
      console.error('[contact API] offer DB error:', error.message);
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    if (data.user_id === userId) {
      return NextResponse.json({ status: 'owner' });
    }

    return NextResponse.json({
      status:               'revealed',
      contact_email:        data.contact_email        ?? null,
      contact_phone:        data.contact_phone        ?? null,
      contact_instructions: data.contact_instructions ?? null,
      application_mode:     data.application_mode     ?? null,
    });
  }

  /* ════════════════════════════════════════════════════════════════
     DEMANDE D'EMPLOI — job_demands n'a pas de colonnes contact.
     On récupère le profil du candidat (profiles.email + phone).
  ════════════════════════════════════════════════════════════════ */
  // Étape A : trouver le user_id de la demande
  const { data: demandRow, error: demandError } = await admin
    .from('job_demands')
    .select('user_id')
    .eq('slug', slug)
    .maybeSingle<DemandOwnerRow>();

  if (demandError) {
    console.error('[contact API] demand DB error:', demandError.message);
    return NextResponse.json({ status: 'error', error: demandError.message }, { status: 500 });
  }
  if (!demandRow) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  // Propriétaire de la demande
  if (demandRow.user_id === userId) {
    return NextResponse.json({ status: 'owner' });
  }

  // Étape B : récupérer email + téléphone depuis profiles
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email, phone')
    .eq('id', demandRow.user_id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    console.error('[contact API] profile DB error:', profileError.message);
    return NextResponse.json({ status: 'error', error: profileError.message }, { status: 500 });
  }

  if (!profile || (!profile.email && !profile.phone)) {
    return NextResponse.json({ status: 'no_contact' });
  }

  return NextResponse.json({
    status:               'revealed',
    contact_email:        profile.email  ?? null,
    contact_phone:        profile.phone  ?? null,
    contact_instructions: null,
    application_mode:     null,
  });
}
