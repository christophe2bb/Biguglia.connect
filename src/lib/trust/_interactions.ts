/**
 * trust/_interactions.ts — CRUD des interactions de confiance (trust_interactions)
 *
 * Règles :
 *   – Un seul enregistrement par (source_type, source_id, requester_id)
 *   – La transition vers 'done' débloque les avis (review_unlocked = true)
 *   – L'historique de statut est append-only (status_history JSONB[])
 */

import { createClient } from '@/lib/supabase/client';
import type { TrustInteraction, InteractionSourceType, InteractionStatus, InteractionType } from './_types';

// ─── getOrCreateInteraction ───────────────────────────────────────────────────

export async function getOrCreateInteraction(params: {
  sourceType: InteractionSourceType;
  sourceId: string;
  receiverId: string;
  interactionType: InteractionType;
}): Promise<{ interaction: TrustInteraction | null; error: string | null; alreadyExists: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { interaction: null, error: 'Non connecté', alreadyExists: false };

  // Check existing
  const { data: existing } = await supabase
    .from('trust_interactions')
    .select('*')
    .eq('source_type', params.sourceType)
    .eq('source_id', params.sourceId)
    .eq('requester_id', user.id)
    .maybeSingle();

  if (existing) return { interaction: existing as TrustInteraction, error: null, alreadyExists: true };

  // Create
  const { data, error } = await supabase
    .from('trust_interactions')
    .insert({
      source_type:      params.sourceType,
      source_id:        params.sourceId,
      requester_id:     user.id,
      receiver_id:      params.receiverId,
      interaction_type: params.interactionType,
      status:           'requested',
      status_history: [{ status: 'requested', changed_at: new Date().toISOString() }],
    })
    .select()
    .single();

  if (error) return { interaction: null, error: error.message, alreadyExists: false };
  return { interaction: data as TrustInteraction, error: null, alreadyExists: false };
}

// ─── updateInteractionStatus ──────────────────────────────────────────────────

export async function updateInteractionStatus(
  interactionId: string,
  newStatus: InteractionStatus,
  note?: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from('trust_interactions')
    .select('status_history, status')
    .eq('id', interactionId)
    .single();

  if (!existing) return { success: false, error: 'Interaction introuvable' };

  const newHistory = [
    ...(existing.status_history || []),
    { status: newStatus, changed_at: new Date().toISOString(), ...(note ? { note } : {}) },
  ];

  const updates: Record<string, unknown> = { status: newStatus, status_history: newHistory };
  if (newStatus === 'accepted') updates.accepted_at  = new Date().toISOString();
  if (newStatus === 'done') {
    updates.completed_at    = new Date().toISOString();
    updates.review_unlocked = true;
  }

  const { error } = await supabase
    .from('trust_interactions')
    .update(updates)
    .eq('id', interactionId);

  return { success: !error, error: error?.message ?? null };
}
