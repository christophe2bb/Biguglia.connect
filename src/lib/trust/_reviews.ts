/**
 * trust/_reviews.ts — Soumission, lecture et éligibilité des avis
 *
 * Règles :
 *   – Auto-évaluation interdite (reviewer ≠ reviewed, aussi contraint en DB)
 *   – Avis possible uniquement si review_unlocked = true sur l'interaction
 *   – Un seul avis par (interaction_id, author_id)
 *   – Fenêtre de 30 jours après completed_at
 */

import { createClient } from '@/lib/supabase/client';
import { THEME_CONFIG } from './_themes';
import type { Review, InteractionSourceType } from './_types';

// ─── submitReview ─────────────────────────────────────────────────────────────

export async function submitReview(params: {
  interactionId: string;
  targetUserId: string;
  sourceType: InteractionSourceType;
  sourceId: string;
  rating: number;
  dimCommunication?: number | null;
  dimReliability?: number | null;
  dimPunctuality?: number | null;
  dimQuality?: number | null;
  comment?: string;
  wouldRecommend?: boolean;
  tags?: string[];
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Non connecté' };
  if (user.id === params.targetUserId) return { success: false, error: 'Auto-évaluation interdite' };

  // Vérifier que l'interaction est terminée et débloquée
  const { data: interaction } = await supabase
    .from('trust_interactions')
    .select('status, review_unlocked, requester_id, receiver_id')
    .eq('id', params.interactionId)
    .single();

  if (!interaction)                 return { success: false, error: 'Interaction introuvable' };
  if (!interaction.review_unlocked) return { success: false, error: 'Avis pas encore débloqué' };
  if (interaction.requester_id !== user.id && interaction.receiver_id !== user.id) {
    return { success: false, error: 'Vous n\'êtes pas participant de cette interaction' };
  }

  // Insérer l'avis
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      interaction_id:    params.interactionId,
      source_type:       params.sourceType,
      source_id:         params.sourceId,
      author_id:         user.id,
      target_user_id:    params.targetUserId,
      rating:            params.rating,
      dim_communication: params.dimCommunication ?? null,
      dim_reliability:   params.dimReliability   ?? null,
      dim_punctuality:   params.dimPunctuality   ?? null,
      dim_quality:       params.dimQuality       ?? null,
      comment:           params.comment          || null,
      would_recommend:   params.wouldRecommend   ?? null,
    })
    .select('id')
    .single();

  if (reviewError) return { success: false, error: reviewError.message };

  // Tags optionnels
  if (params.tags?.length && review?.id) {
    await supabase.from('review_tags').insert(
      params.tags.map(tag => ({ review_id: review.id, tag }))
    );
  }

  // Marquer l'avis comme réalisé pour ce participant
  const field = interaction.requester_id === user.id
    ? 'review_requester_done'
    : 'review_receiver_done';
  await supabase.from('trust_interactions').update({ [field]: true }).eq('id', params.interactionId);

  // Notifier l'utilisateur évalué
  await supabase.from('notifications').insert({
    user_id: params.targetUserId,
    type:    'new_review',
    title:   'Nouvel avis reçu',
    message: `Vous avez reçu un avis ${params.rating}/5 sur ${THEME_CONFIG[params.sourceType]?.label ?? params.sourceType}.`,
    link:    '/dashboard/avis',
  });

  return { success: true, error: null };
}

// ─── fetchPublicReviews ───────────────────────────────────────────────────────

export async function fetchPublicReviews(
  profileId: string,
  limit = 20,
): Promise<Review[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('reviews')
    .select(`
      id, source_type, source_id, rating,
      dim_communication, dim_reliability, dim_punctuality, dim_quality,
      comment, would_recommend, created_at,
      author:profiles!reviews_author_id_fkey(id, full_name, avatar_url),
      review_tags(tag)
    `)
    .eq('target_user_id', profileId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data || []) as unknown as Review[]).map(r => ({
    ...r,
    tags: (((r as unknown as Record<string, unknown>).review_tags as Array<{ tag: string }>) || []).map(t => t.tag),
  }));
}

// ─── canLeaveReview ───────────────────────────────────────────────────────────

export async function canLeaveReview(interactionId: string): Promise<{
  canReview: boolean;
  alreadyDone: boolean;
  reason: string | null;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { canReview: false, alreadyDone: false, reason: 'Non connecté' };

  const { data: interaction } = await supabase
    .from('trust_interactions')
    .select('status, review_unlocked, review_requester_done, review_receiver_done, requester_id, receiver_id, completed_at')
    .eq('id', interactionId)
    .single();

  if (!interaction)                 return { canReview: false, alreadyDone: false, reason: 'Interaction introuvable' };
  if (!interaction.review_unlocked) return { canReview: false, alreadyDone: false, reason: 'Interaction non terminée' };

  const isRequester = interaction.requester_id === user.id;
  const isReceiver  = interaction.receiver_id  === user.id;
  if (!isRequester && !isReceiver) return { canReview: false, alreadyDone: false, reason: 'Non participant' };

  const alreadyDone = isRequester ? interaction.review_requester_done : interaction.review_receiver_done;
  if (alreadyDone) return { canReview: false, alreadyDone: true, reason: 'Avis déjà laissé' };

  // Fenêtre temporelle
  if (interaction.completed_at) {
    const daysSince = (Date.now() - new Date(interaction.completed_at).getTime()) / 86_400_000;
    if (daysSince > 30) return { canReview: false, alreadyDone: false, reason: 'Fenêtre de 30 jours expirée' };
  }

  // Vérifier qu'aucun avis n'existe déjà
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('interaction_id', interactionId)
    .eq('author_id', user.id)
    .maybeSingle();

  if (existingReview) return { canReview: false, alreadyDone: true, reason: 'Avis déjà soumis' };

  return { canReview: true, alreadyDone: false, reason: null };
}
