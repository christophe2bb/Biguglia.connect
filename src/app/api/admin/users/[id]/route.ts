/**
 * API Route — /api/admin/users/[id]
 *
 * PATCH  : modifier le statut (suspend/réactiver) ou le rôle d'un utilisateur
 * DELETE : supprimer définitivement un compte utilisateur
 *
 * Sécurité :
 *   • getAdminUser() vérifie la session + profil + role côté serveur
 *   • createAdminClient() (service role) utilisé pour toutes les mutations
 *   • Un admin ne peut pas se modifier ou se supprimer lui-même
 *   • Inputs validés par Zod avant toute écriture DB
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { logAdminAction } from '@/lib/admin/action-logger';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteParams {
  params: { id: string };
}

// ── Constantes ────────────────────────────────────────────────────────────────

const VALID_ROLES = [
  'admin', 'moderator', 'artisan_verified', 'artisan_pending', 'resident',
] as const;

const VALID_STATUSES = ['active', 'suspended', 'inactive'] as const;

// ── Schémas Zod ───────────────────────────────────────────────────────────────

const PatchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_status'),
    status: z.enum(VALID_STATUSES),
  }).strict(),
  z.object({
    action: z.literal('set_role'),
    role: z.enum(VALID_ROLES),
  }).strict(),
]);

type PatchBody = z.infer<typeof PatchSchema>;

// ── PATCH /api/admin/users/[id] ───────────────────────────────────────────────

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  // CSRF — exige Origin same-host si cookie-only
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  // Auth + rôle admin (serveur)
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { actor, adminClient } = guard;
  const targetId = params.id;

  // Self-modification interdite
  if (targetId === actor.id) {
    return NextResponse.json(
      { error: 'Un administrateur ne peut pas se modifier lui-même.' },
      { status: 400 },
    );
  }

  // Parse body
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

  if (body.action === 'set_status') {
    const { error } = await adminClient
      .from('profiles')
      .update({ status: body.status })
      .eq('id', targetId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notification utilisateur
    const title  = body.status === 'suspended' ? '⚠️ Compte suspendu' : '✅ Compte réactivé';
    const message = body.status === 'suspended'
      ? 'Votre compte a été suspendu par l\'administrateur. Contactez-nous pour plus d\'informations.'
      : 'Votre compte a été réactivé. Vous pouvez de nouveau accéder à toutes les fonctionnalités.';

    await adminClient.from('notifications').insert({
      user_id: targetId,
      type:    'account_update',
      title,
      message,
    });

    await logAdminAction({
      adminClient,
      actor,
      action:      'user_status_set',
      targetTable: 'profiles',
      targetId,
      meta: { new_status: body.status },
    });

    return NextResponse.json({ success: true, status: body.status });
  }

  // action === 'set_role'
  if (body.action === 'set_role') {
    // Seul un admin (pas un modérateur) peut changer les rôles
    if (actor.role !== 'admin') {
      return NextResponse.json(
        { error: 'Seul un administrateur peut modifier les rôles.' },
        { status: 403 },
      );
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ role: body.role })
      .eq('id', targetId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await adminClient.from('notifications').insert({
      user_id: targetId,
      type:    'account_update',
      title:   '📋 Rôle modifié',
      message: `Votre rôle sur Biguglia Connect a été modifié par l'administrateur : ${body.role}`,
    });

    await logAdminAction({
      adminClient,
      actor,
      action:      'user_role_set',
      targetTable: 'profiles',
      targetId,
      meta: { new_role: body.role },
    });

    return NextResponse.json({ success: true, role: body.role });
  }

  // Exhaustive check — Zod discriminatedUnion guarantees one of the two actions above
  return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
}

// ── DELETE /api/admin/users/[id] ─────────────────────────────────────────────

export async function DELETE(req: Request, { params }: RouteParams): Promise<Response> {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { actor, adminClient } = guard;

  // Seul un admin peut supprimer des comptes
  if (actor.role !== 'admin') {
    return NextResponse.json(
      { error: 'Seul un administrateur peut supprimer des comptes.' },
      { status: 403 },
    );
  }

  const targetId = params.id;

  if (targetId === actor.id) {
    return NextResponse.json(
      { error: 'Un administrateur ne peut pas supprimer son propre compte via cette route.' },
      { status: 400 },
    );
  }

  // Supprimer le profil (les FK en CASCADE suppriment les données liées)
  const { error } = await adminClient
    .from('profiles')
    .delete()
    .eq('id', targetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    adminClient,
    actor,
    action:      'user_delete',
    targetTable: 'profiles',
    targetId,
    meta: { deleted_by_role: actor.role },
  });

  return NextResponse.json({ success: true });
}
