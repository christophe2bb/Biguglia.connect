/**
 * API Route — PATCH /api/admin/moderation/[id]/trust
 *
 * Met à jour le niveau de confiance (trust_level) de l'auteur d'un item
 * de la file de modération. Met également à jour author_trust dans
 * moderation_queue pour garder les deux en cohérence.
 *
 * SÉCURITÉ — pourquoi cette route existe :
 *   Avant ce correctif, useModerationDetail appelait directement
 *   `createClient().from('profiles').update({ trust_level })` côté navigateur.
 *   Modifier le trust_level d'un profil arbitraire reposait uniquement sur la RLS.
 *
 *   Cette route garantit que :
 *   • getAdminUser() vérifie la session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) effectue les mutations de façon contrôlée
 *   • Le profil modifié est contraint à l'auteur de l'item en queue (récupéré
 *     côté serveur — le client ne choisit pas l'ID cible)
 *   • trust_level est validé par Zod (valeurs enum strictes)
 *
 * Body : { trust_level: 'nouveau' | 'surveille' | 'fiable' | 'de_confiance' }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { logAdminAction } from '@/lib/admin/action-logger';

// ─── Schéma Zod ──────────────────────────────────────────────────────────────

const TrustSchema = z.object({
  trust_level: z.enum(['nouveau', 'surveille', 'fiable', 'de_confiance']),
}).strict();

// ─── Route params ────────────────────────────────────────────────────────────

interface RouteParams {
  params: { id: string };
}

// ─── PATCH /api/admin/moderation/[id]/trust ──────────────────────────────────

export async function PATCH(req: Request, { params }: RouteParams) {
  const csrfError = assertCsrfSafe(req);
  if (csrfError) return csrfError;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;
  const queueId = params.id;

  // Parse + validate body
  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch {
    return NextResponse.json({ error: 'Corps de requête invalide (JSON attendu).' }, { status: 400 });
  }

  const parsed = TrustSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides.', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { trust_level } = parsed.data;

  // ── Récupérer l'item pour connaître author_id côté serveur ───────────────
  // On ne fait pas confiance au client pour fournir l'author_id.
  const { data: queueItem, error: fetchError } = await adminClient
    .from('moderation_queue')
    .select('id, author_id')
    .eq('id', queueId)
    .single();

  if (fetchError || !queueItem) {
    return NextResponse.json({ error: 'Élément de modération introuvable.' }, { status: 404 });
  }

  const authorId = String(queueItem.author_id);

  // ── Mettre à jour profiles.trust_level ──────────────────────────────────
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ trust_level })
    .eq('id', authorId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // ── Mettre à jour moderation_queue.author_trust ──────────────────────────
  await adminClient
    .from('moderation_queue')
    .update({ author_trust: trust_level })
    .eq('id', queueId);
  // Erreur non-fatale : la mise à jour principale du profil est déjà faite

  // ── Traçabilité ───────────────────────────────────────────────────────────
  const { actor } = guard;
  await logAdminAction({
    adminClient,
    actor,
    action:      'moderation_trust_update',
    targetTable: 'profiles',
    targetId:    authorId,
    meta: { trust_level, queue_id: queueId },
  });

  return NextResponse.json({ success: true, trust_level, author_id: authorId });
}
