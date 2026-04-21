/**
 * API Route — /api/admin/reports/[id]
 *
 * PATCH : mettre à jour le statut d'un signalement
 *   body: { action: 'update_status', status: 'resolved' | 'dismissed' | 'reviewed' }
 *   body: { action: 'ban_user', targetId: string }
 *
 * Sécurité :
 *   • getAdminUser() vérifie session + profil + role côté serveur
 *   • createAdminClient() pour toutes les mutations (bypass RLS)
 *   • Inputs validés par Zod
 *   • ban_user réservé aux admins (pas aux modérateurs seuls)
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

  // action === 'ban_user'
  // La suspension d'un utilisateur depuis un signalement est réservée aux admins
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
