/**
 * API Route — /api/admin/moderation/[id]
 *
 * PATCH : décision rapide sur un élément de la file de modération
 *   body: { decision: 'accepter' | 'refuser', refusal_reason?: string }
 *
 * Sécurité :
 *   • getAdminUser() vérifie session + profil + role côté serveur
 *   • createAdminClient() pour toutes les mutations (bypass RLS)
 *   • Inputs validés par Zod
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteParams {
  params: { id: string }; // moderation_queue.id
}

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const DECISIONS = ['accepter', 'refuser'] as const;

const PatchSchema = z.object({
  decision:       z.enum(DECISIONS),
  refusal_reason: z.string().max(500).optional(),
}).strict();

type PatchBody = z.infer<typeof PatchSchema>;

// ── PATCH /api/admin/moderation/[id] ─────────────────────────────────────────

export async function PATCH(req: Request, { params }: RouteParams) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { actor, adminClient } = guard;
  const queueId = params.id;

  // Parse + validate body
  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch {
    return NextResponse.json(
      { error: 'Corps de requête invalide (JSON attendu).' },
      { status: 400 },
    );
  }

  const parsed = PatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const body: PatchBody = parsed.data;

  const newStatus = body.decision === 'accepter' ? 'publie' : 'refuse';
  const defaultReason = body.decision === 'refuser'
    ? (body.refusal_reason ?? 'manque_informations')
    : undefined;

  const { error } = await adminClient
    .from('moderation_queue')
    .update({
      status:         newStatus,
      decision:       body.decision,
      refusal_reason: defaultReason,
      reviewed_by:    actor.id,
      reviewed_at:    new Date().toISOString(),
    })
    .eq('id', queueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, decision: body.decision, status: newStatus });
}
