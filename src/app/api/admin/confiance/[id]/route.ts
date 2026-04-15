/**
 * API Route — PATCH /api/admin/confiance/[id]
 *
 * Deux actions disponibles :
 *   action: 'moderate_review' — modère un avis (visible / hidden / deleted)
 *   action: 'award_badge'     — attribue un badge de confiance à un profil
 *
 * SÉCURITÉ — pourquoi cette route existe :
 *   Avant ce correctif, la page admin/confiance appelait directement
 *   `createClient().from('reviews').update({...})` et
 *   `createClient().from('profile_badges').upsert({...})` côté navigateur.
 *   La protection reposait uniquement sur la RLS.
 *
 *   Cette route garantit que :
 *   • getAdminUser() vérifie la session + role admin/moderator côté serveur
 *   • Le champ moderated_by est rempli côté serveur (actor.id — pas par le client)
 *   • Les valeurs de moderation_status et badge_code sont validées par Zod
 *   • createAdminClient() (service role) effectue les mutations de façon contrôlée
 *
 * Le segment [id] est :
 *   - Pour moderate_review : l'ID de l'avis (reviews.id)
 *   - Pour award_badge     : l'ID du profil cible (profiles.id)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { logAdminAction } from '@/lib/admin/action-logger';

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const PatchSchema = z.discriminatedUnion('action', [
  z.object({
    action:            z.literal('moderate_review'),
    moderation_status: z.enum(['visible', 'hidden', 'deleted']),
  }).strict(),
  z.object({
    action:     z.literal('award_badge'),
    badge_code: z.string().min(1).max(100),
  }).strict(),
]);

type PatchBody = z.infer<typeof PatchSchema>;

// ─── Route params ────────────────────────────────────────────────────────────

interface RouteParams {
  params: { id: string };
}

// ─── PATCH /api/admin/confiance/[id] ─────────────────────────────────────────

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { actor, adminClient } = guard;
  const targetId = params.id;

  // Parse + validate body
  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch {
    return NextResponse.json({ error: 'Corps de requête invalide (JSON attendu).' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const body: PatchBody = parsed.data;

  // ── moderate_review ──────────────────────────────────────────────────────
  if (body.action === 'moderate_review') {
    const { error } = await adminClient
      .from('reviews')
      .update({
        moderation_status: body.moderation_status,
        moderated_by:      actor.id,              // côté serveur — pas fourni par le client
        moderated_at:      new Date().toISOString(),
      })
      .eq('id', targetId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction({
      adminClient,
      actor,
      action:      'review_moderate',
      targetTable: 'reviews',
      targetId:    targetId,
      meta:        { new_status: body.moderation_status },
    });

    return NextResponse.json({ success: true, action: 'moderate_review', moderation_status: body.moderation_status });
  }

  // ── award_badge ──────────────────────────────────────────────────────────
  if (body.action === 'award_badge') {
    // Vérifier que le profil cible existe
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', targetId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil cible introuvable.' }, { status: 404 });
    }

    const { error } = await adminClient
      .from('profile_badges')
      .upsert({
        profile_id: targetId,
        badge_code: body.badge_code,
        awarded_by: actor.id,                     // côté serveur — ID réel de l'admin
      }, { onConflict: 'profile_id,badge_code', ignoreDuplicates: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction({
      adminClient,
      actor,
      action:      'badge_award',
      targetTable: 'profile_badges',
      targetId:    targetId,
      meta:        { badge_code: body.badge_code },
    });

    return NextResponse.json({ success: true, action: 'award_badge', badge_code: body.badge_code });
  }

  // Exhaustive check — Zod discriminatedUnion guarantees one of the two actions above
  return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
}
