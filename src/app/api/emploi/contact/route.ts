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
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

// ── Schéma de validation ────────────────────────────────────────────────────

/** Miroir de l'ENUM SQL application_mode */
const APPLICATION_MODES = ['email', 'phone', 'on_site', 'mixed'] as const;

const ContactBodySchema = z.object({
  /**
   * Type d'annonce.
   * ‘offer’ → table job_offers | ‘demand’ → table job_demands
   */
  type: z.enum(['offer', 'demand']),

  /**
   * Slug de l'annonce : lettres, chiffres, tirets, 3–120 caractères.
   * Format réel : "serveur-a053956e", "dev-fullstack-bc3f21aa".
   * On rejette tout ce qui ne correspond pas plutôt que d'envoyer
   * une requête garantie sans résultat.
   */
  slug: z
    .string()
    .trim()
    .min(3,  'slug trop court')
    .max(120, 'slug trop long')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/i, 'slug invalide'),
});

// Type résultant de la requête Supabase
type ContactRow = {
  user_id:              string;
  contact_email:        string | null;
  contact_phone:        string | null;
  contact_instructions: string | null;
  application_mode:     typeof APPLICATION_MODES[number] | null;
};

export async function POST(req: NextRequest) {
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

  /* 3. Récupérer les données via admin (bypass RLS) */
  const table = type === 'offer' ? 'job_offers' : 'job_demands';
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(table)
    .select('user_id, contact_email, contact_phone, contact_instructions, application_mode')
    .eq('slug', slug)
    .maybeSingle<ContactRow>();

  if (error) {
    console.error('[contact API] DB error:', error.message);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  /* 4. Propriétaire → répondre avec status 'owner' (200, pas 403) */
  if (data.user_id === userId) {
    return NextResponse.json({ status: 'owner' });
  }

  /* 5. Retourner les coordonnées — jamais user_id ni données internes */
  return NextResponse.json({
    status: 'revealed',
    contact_email:        data.contact_email        ?? null,
    contact_phone:        data.contact_phone        ?? null,
    contact_instructions: data.contact_instructions ?? null,
    application_mode:     data.application_mode     ?? null,
  });
}
