/**
 * API Route — PATCH /api/admin/moderation/[id]/decision
 *
 * Soumet une décision de modération (accepter / refuser / demander_correction)
 * pour un élément de la file d'attente.
 *
 * SÉCURITÉ — pourquoi cette route existe :
 *   Avant ce correctif, useModerationDetail appelait directement
 *   `createClient().from('moderation_queue').update(...)` et
 *   `createClient().from(<source_table>).update({ moderation_status })` côté
 *   navigateur avec la clé anon.
 *   La capacité de modifier les statuts de modération reposait uniquement sur la RLS.
 *
 *   Cette route garantit que :
 *   • getAdminUser() vérifie la session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) effectue les mises à jour de façon contrôlée
 *   • La table cible est dérivée du content_type de la queue (pas transmise par le client)
 *   • Les champs mis à jour sont strictement contrôlés par Zod
 *
 * Body :
 *   { decision: 'accepter' | 'refuser' | 'demander_correction',
 *     reason?: string,
 *     moderator_note?: string }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { logAdminAction } from '@/lib/admin/action-logger';

// ─── Mapping content_type → table source ─────────────────────────────────────
// Miroir du TABLE_MAP côté client — centralisé ici pour la validation serveur

const TABLE_MAP: Record<string, string> = {
  listing:         'listings',
  equipment:       'equipment_items',
  help_request:    'help_requests',
  outing:          'group_outings',
  event:           'events',
  lost_found:      'lost_found_items',
  collection_item: 'collection_items',
  association:     'associations',
  forum_post:      'forum_posts',
};

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const DecisionSchema = z.discriminatedUnion('decision', [
  z.object({
    decision:       z.literal('accepter'),
    moderator_note: z.string().max(1000).optional(),
  }).strict(),
  z.object({
    decision:       z.literal('refuser'),
    reason:         z.string().min(1).max(500),
    moderator_note: z.string().max(1000).optional(),
  }).strict(),
  z.object({
    decision:       z.literal('demander_correction'),
    reason:         z.string().min(1).max(500),
    moderator_note: z.string().max(1000).optional(),
  }).strict(),
]);

type DecisionBody = z.infer<typeof DecisionSchema>;

// ─── Types de réponse ────────────────────────────────────────────────────────

interface RouteParams {
  params: { id: string };
}

// ─── PATCH /api/admin/moderation/[id]/decision ───────────────────────────────

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
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
    return NextResponse.json({ error: 'Corps de requête invalide (JSON attendu).' }, { status: 400 });
  }

  const parsed = DecisionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const body: DecisionBody = parsed.data;

  // ── Récupérer l'item pour connaître content_type + content_id ────────────
  const { data: queueItem, error: fetchError } = await adminClient
    .from('moderation_queue')
    .select('id, content_type, content_id, status')
    .eq('id', queueId)
    .single();

  if (fetchError || !queueItem) {
    return NextResponse.json({ error: 'Élément de modération introuvable.' }, { status: 404 });
  }

  // ── Calculer le nouveau statut ───────────────────────────────────────────
  const newStatus =
    body.decision === 'accepter'            ? 'publie' :
    body.decision === 'refuser'             ? 'refuse' :
    /* demander_correction */                 'a_corriger';

  // ── Construire le payload de mise à jour ─────────────────────────────────
  const updateData: Record<string, unknown> = {
    status:         newStatus,
    decision:       body.decision,
    reviewed_by:    actor.id,
    reviewed_at:    new Date().toISOString(),
    moderator_note: body.moderator_note ?? null,
  };

  if (body.decision === 'refuser') {
    updateData.refusal_reason    = (body as { reason: string }).reason;
  }
  if (body.decision === 'demander_correction') {
    updateData.correction_reason = (body as { reason: string }).reason;
  }

  // ── Mettre à jour moderation_queue ──────────────────────────────────────
  const { error: queueError } = await adminClient
    .from('moderation_queue')
    .update(updateData)
    .eq('id', queueId);

  if (queueError) {
    return NextResponse.json({ error: queueError.message }, { status: 500 });
  }

  // ── Propager le statut à la table source ─────────────────────────────────
  const sourceTable = TABLE_MAP[String(queueItem.content_type)];
  if (sourceTable) {
    await adminClient
      .from(sourceTable)
      .update({ moderation_status: newStatus })
      .eq('id', String(queueItem.content_id));
    // Erreur non-fatale : la décision principale est déjà enregistrée
  }

  // ── Traçabilité ───────────────────────────────────────────────────────────
  await logAdminAction({
    adminClient,
    actor,
    action:      'moderation_decision',
    targetTable: 'moderation_queue',
    targetId:    queueId,
    reason:      'reason' in body ? body.reason : undefined,
    meta: {
      decision:     body.decision,
      new_status:   newStatus,
      content_type: queueItem.content_type,
      content_id:   queueItem.content_id,
      source_table: sourceTable ?? null,
      moderator_note: body.moderator_note ?? null,
    },
  });

  return NextResponse.json({ success: true, newStatus, decision: body.decision });
}
