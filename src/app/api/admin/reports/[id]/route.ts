export const dynamic = 'force-dynamic';
export const maxDuration = 30;
/**
 * API Route — /api/admin/reports/[id]
 *
 * PATCH : mettre à jour le statut d'un signalement
 *   body: { action: 'update_status', status: 'resolved' | 'dismissed' | 'reviewed' }
 *   body: { action: 'ban_user', targetId: string }
 *   body: { action: 'delete_content' }           → supprime le contenu signalé (admin only)
 *   body: { action: 'send_message', message: string } → envoie une notification au créateur
 *
 * Sécurité :
 *   • getAdminUser() vérifie session + profil + role côté serveur
 *   • createAdminClient() pour toutes les mutations (bypass RLS)
 *   • Inputs validés par Zod
 *   • ban_user / delete_content réservés aux admins
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { logAdminAction } from '@/lib/admin/action-logger';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>; // reports.id
}

// ── Table map : target_type → table DB ───────────────────────────────────────

const CONTENT_TABLE_MAP: Record<string, string> = {
  listing:         'listings',
  equipment:       'equipment_items',
  help_request:    'help_requests',
  outing:          'group_outings',
  event:           'events',
  lost_found:      'lost_found_items',
  collection_item: 'collection_items',
  association:     'associations',
  forum_post:      'forum_posts',
  post:            'forum_posts',
};

// Colonne auteur dans chaque table (pour retrouver le user_id)
const AUTHOR_COLUMN: Record<string, string> = {
  listings:          'user_id',
  equipment_items:   'user_id',
  help_requests:     'user_id',
  group_outings:     'organizer_id',
  events:            'organizer_id',
  lost_found_items:  'user_id',
  collection_items:  'user_id',
  associations:      'created_by',
  forum_posts:       'author_id',
};

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const REPORT_STATUSES = ['resolved', 'dismissed', 'reviewed'] as const;

const PatchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update_status'),
    status: z.enum(REPORT_STATUSES),
  }).strict(),
  z.object({
    action:   z.literal('ban_user'),
    targetId: z.string().uuid('targetId doit être un UUID valide.'),
  }).strict(),
  z.object({
    action: z.literal('delete_content'),
  }).strict(),
  z.object({
    action:  z.literal('send_message'),
    message: z.string().min(1).max(2000),
  }).strict(),
]);

type PatchBody = z.infer<typeof PatchSchema>;

// ── PATCH /api/admin/reports/[id] ─────────────────────────────────────────────

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { actor, adminClient } = guard;
  const reportId = id;

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

  // ── update_status ─────────────────────────────────────────────────────────
  if (body.action === 'update_status') {
    const { error } = await adminClient
      .from('reports')
      .update({
        status:      body.status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actor.id,
      })
      .eq('id', reportId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminAction({
      adminClient,
      actor,
      action:      'report_status_set',
      targetTable: 'reports',
      targetId:    reportId,
      meta:        { new_status: body.status },
    });

    return NextResponse.json({ success: true, status: body.status });
  }

  // ── ban_user ──────────────────────────────────────────────────────────────
  if (body.action === 'ban_user') {
    if (actor.role !== 'admin') {
      return NextResponse.json(
        { error: 'Seul un administrateur peut suspendre un utilisateur.' },
        { status: 403 },
      );
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', body.targetId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await adminClient.from('notifications').insert({
      user_id: body.targetId,
      type:    'account_update',
      title:   '⚠️ Compte suspendu',
      message: 'Votre compte a été suspendu suite à un signalement. Contactez-nous pour plus d\'informations.',
    });

    await logAdminAction({
      adminClient,
      actor,
      action:      'report_ban_user',
      targetTable: 'profiles',
      targetId:    body.targetId,
      meta:        { report_id: reportId, new_status: 'suspended' },
    });

    return NextResponse.json({ success: true, action: 'banned', targetId: body.targetId });
  }

  // ── delete_content ────────────────────────────────────────────────────────
  if (body.action === 'delete_content') {
    if (actor.role !== 'admin') {
      return NextResponse.json(
        { error: 'Seul un administrateur peut supprimer du contenu.' },
        { status: 403 },
      );
    }

    // Récupérer le signalement pour connaître target_type et target_id
    const { data: report, error: fetchErr } = await adminClient
      .from('reports')
      .select('target_type, target_id, target_title, reporter_id')
      .eq('id', reportId)
      .single();

    if (fetchErr || !report) {
      return NextResponse.json({ error: 'Signalement introuvable.' }, { status: 404 });
    }

    const tableName = CONTENT_TABLE_MAP[report.target_type];
    if (!tableName) {
      return NextResponse.json(
        { error: `Type de contenu non supporté : ${report.target_type}` },
        { status: 400 },
      );
    }

    // Supprimer le contenu
    const { error: deleteErr } = await adminClient
      .from(tableName)
      .delete()
      .eq('id', report.target_id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Marquer le signalement comme résolu
    await adminClient
      .from('reports')
      .update({ status: 'resolved', reviewed_at: new Date().toISOString(), reviewed_by: actor.id })
      .eq('id', reportId);

    await logAdminAction({
      adminClient,
      actor,
      action:      'report_delete_content',
      targetTable: tableName,
      targetId:    report.target_id,
      meta:        { report_id: reportId, target_type: report.target_type, title: report.target_title },
    });

    return NextResponse.json({ success: true, action: 'content_deleted' });
  }

  // ── send_message ──────────────────────────────────────────────────────────
  if (body.action === 'send_message') {
    // Récupérer le signalement
    const { data: report, error: fetchErr } = await adminClient
      .from('reports')
      .select('target_type, target_id, target_title')
      .eq('id', reportId)
      .single();

    if (fetchErr || !report) {
      return NextResponse.json({ error: 'Signalement introuvable.' }, { status: 404 });
    }

    const tableName   = CONTENT_TABLE_MAP[report.target_type];
    const authorCol   = tableName ? AUTHOR_COLUMN[tableName] : null;
    let   authorId: string | null = null;

    // Trouver l'auteur du contenu
    if (tableName && authorCol) {
      const { data: content } = await adminClient
        .from(tableName)
        .select(authorCol)
        .eq('id', report.target_id)
        .single();

      if (content) {
        authorId = (content as unknown as Record<string, string>)[authorCol] ?? null;
      }
    }

    if (!authorId) {
      return NextResponse.json(
        { error: 'Impossible de trouver l\'auteur du contenu signalé.' },
        { status: 404 },
      );
    }

    // Envoyer une notification in-app à l'auteur
    const { error: notifErr } = await adminClient.from('notifications').insert({
      user_id: authorId,
      type:    'moderation',
      title:   '📋 Message de la modération',
      message: body.message,
    });

    if (notifErr) {
      return NextResponse.json({ error: notifErr.message }, { status: 500 });
    }

    // Marquer le signalement "en cours" s'il était en attente
    await adminClient
      .from('reports')
      .update({ status: 'reviewed', reviewed_at: new Date().toISOString(), reviewed_by: actor.id })
      .eq('id', reportId)
      .eq('status', 'pending');

    await logAdminAction({
      adminClient,
      actor,
      action:      'report_send_message',
      targetTable: 'reports',
      targetId:    reportId,
      meta:        { author_id: authorId, message_length: body.message.length },
    });

    return NextResponse.json({ success: true, action: 'message_sent', authorId });
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
}
