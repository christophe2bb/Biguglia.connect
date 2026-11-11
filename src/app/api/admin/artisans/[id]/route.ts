export const dynamic = 'force-dynamic';
export const maxDuration = 30;
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

  if (!z.string().uuid().safeParse(artisanUserId).success) {
    return NextResponse.json({ error: 'Identifiant artisan invalide.' }, { status: 400 });
  }

  // Modifier la fiche ET le rôle en une seule transaction PostgreSQL.
  // Deux update() successifs pouvaient laisser un état incohérent lorsqu'une
  // seule des deux opérations échouait (ou modifiait zéro ligne).
  const approving = body.action === 'approve';
  const reason = approving ? null : body.reason.trim();
  const { data: artisanProfileId, error: reviewError } = await adminClient.rpc(
    'admin_review_artisan_profile',
    {
      p_user_id: artisanUserId,
      p_approve: approving,
      p_reason: reason,
    },
  );

  if (reviewError || !artisanProfileId) {
    if (reviewError?.code === 'P0002') {
      return NextResponse.json({ error: 'Dossier artisan introuvable.' }, { status: 404 });
    }
    console.error('[artisan review] transaction failed:', reviewError?.code);
    return NextResponse.json(
      { error: 'Validation non enregistrée. Aucun changement partiel du compte ne doit être conservé.' },
      { status: 503 },
    );
  }

  // La décision est COMMISE à ce stade. Une notification défaillante ne doit
  // pas faire croire à l'admin que la décision a échoué et provoquer un doublon.
  const notification = approving
    ? {
        user_id: artisanUserId,
        type: 'artisan_approved',
        title: '✅ Profil artisan validé !',
        message: 'Félicitations ! Votre profil artisan a été validé. Vous êtes maintenant visible sur Biguglia Connect.',
        link: '/dashboard/artisan',
      }
    : {
        user_id: artisanUserId,
        type: 'artisan_rejected',
        title: '❌ Profil artisan non validé',
        message: reason,
        link: '/inscription/artisan-profil',
      };
  const { error: notificationError } = await adminClient.from('notifications').insert(notification);
  if (notificationError) {
    console.warn('[artisan review] décision enregistrée, notification non envoyée:', notificationError.code);
  }

  try {
    await logAdminAction({
      adminClient,
      actor,
      action: approving ? 'artisan_approve' : 'artisan_reject',
      targetTable: 'profiles',
      targetId: artisanUserId,
      ...(approving ? {} : { reason: reason ?? undefined }),
      meta: { new_role: approving ? 'artisan_verified' : 'resident', artisan_profile_id: artisanProfileId },
    });
  } catch (error) {
    console.warn('[artisan review] décision enregistrée, journalisation indisponible', error);
  }

  return NextResponse.json({ success: true, action: approving ? 'approved' : 'rejected' });
}
