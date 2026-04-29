export const dynamic = 'force-dynamic';
/**
 * API Route — /api/admin/artisans/[id]
 *
 * PATCH : approuver ou refuser une demande de validation artisan
 *   body: { action: 'approve' }
 *   body: { action: 'reject', reason: string }
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
import { logAdminAction } from '@/lib/admin/action-logger';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>; // artisanUserId (profiles.id du compte artisan)
}

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const PatchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
  }).strict(),
  z.object({
    action: z.literal('reject'),
    reason: z.string().min(10, 'La raison doit faire au moins 10 caractères.').max(500),
  }).strict(),
]);

type PatchBody = z.infer<typeof PatchSchema>;

// ── PATCH /api/admin/artisans/[id] ────────────────────────────────────────────

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { actor, adminClient } = guard;
  const artisanUserId = id;

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

  if (body.action === 'approve') {
    const { error } = await adminClient
      .from('profiles')
      .update({ role: 'artisan_verified', status: 'active' })
      .eq('id', artisanUserId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await adminClient.from('notifications').insert({
      user_id: artisanUserId,
      type:    'artisan_approved',
      title:   '✅ Profil artisan validé !',
      message: 'Félicitations ! Votre profil artisan a été validé. Vous êtes maintenant visible sur la plateforme Biguglia Connect.',
      link:    '/dashboard/artisan',
    });

    await logAdminAction({
      adminClient,
      actor,
      action:      'artisan_approve',
      targetTable: 'profiles',
      targetId:    artisanUserId,
      meta:        { new_role: 'artisan_verified' },
    });

    return NextResponse.json({ success: true, action: 'approved' });
  }

  // action === 'reject'
  const { error: profileErr } = await adminClient
    .from('profiles')
    .update({ role: 'resident', status: 'active' })
    .eq('id', artisanUserId);

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

  await adminClient
    .from('artisan_profiles')
    .update({ rejection_reason: body.reason })
    .eq('user_id', artisanUserId);

  await adminClient.from('notifications').insert({
    user_id: artisanUserId,
    type:    'artisan_rejected',
    title:   '❌ Profil artisan non validé',
    message: body.reason,
    link:    '/inscription/artisan-profil',
  });

  await logAdminAction({
    adminClient,
    actor,
    action:      'artisan_reject',
    targetTable: 'profiles',
    targetId:    artisanUserId,
    reason:      body.reason,
    meta:        { new_role: 'resident' },
  });

  return NextResponse.json({ success: true, action: 'rejected' });
}
