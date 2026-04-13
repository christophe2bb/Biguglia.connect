/**
 * _eligibility.ts — Logique d'éligibilité à la notation
 *
 * Règles par type de source :
 *   promenade / lost_found  → libre (tout le monde)
 *   listing / equipment / association / collection_item
 *                           → échange confirmé (exchange_status = 'done')
 *   help_request            → échange confirmé OU demande resolved + auteur
 *   event                   → inscrit + événement passé
 *   outing                  → inscrit + sortie passée
 *   service_request         → auteur de la demande uniquement
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RatingTargetType } from './_types';

// ─── API helper — contourne la RLS récursive des conversations ────────────────

export async function checkConversationViaAPI(
  relatedType: string,
  relatedId: string,
  authToken?: string | null,
): Promise<{ conversationId: string | null; exchangeStatus: string | null }> {
  try {
    const url = `/api/messages/check-conversation?relatedType=${encodeURIComponent(relatedType)}&relatedId=${encodeURIComponent(relatedId)}`;
    const res = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!res.ok) return { conversationId: null, exchangeStatus: null };
    return await res.json();
  } catch {
    return { conversationId: null, exchangeStatus: null };
  }
}

// ─── checkEligibility ─────────────────────────────────────────────────────────

export async function checkEligibility(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  targetType: RatingTargetType,
  targetId: string,
  userId: string,
  authorId?: string,
  authToken?: string | null,
): Promise<boolean> {
  // Auteur de l'item → jamais (auto-notation interdite)
  if (userId === authorId) return false;

  switch (targetType) {
    // ── Libre ─────────────────────────────────────────────────────────────────
    case 'promenade':
    case 'lost_found':
      return true;

    // ── Échange confirmé obligatoire ──────────────────────────────────────────
    case 'listing':
    case 'equipment':
    case 'association':
    case 'collection_item': {
      const { conversationId, exchangeStatus } = await checkConversationViaAPI(targetType, targetId, authToken);
      if (!conversationId) return false;
      return exchangeStatus === 'done' || exchangeStatus === null;
    }

    // ── Coup de main ──────────────────────────────────────────────────────────
    case 'help_request': {
      const { data: req } = await supabase
        .from('help_requests')
        .select('author_id, status')
        .eq('id', targetId)
        .single();
      if (!req) return false;

      const { conversationId, exchangeStatus } = await checkConversationViaAPI('help_request', targetId, authToken);
      if (conversationId) {
        if (exchangeStatus === 'done') return true;
        if (exchangeStatus === null && req.status === 'resolved') return true;
      }
      return req.status === 'resolved' && req.author_id === userId;
    }

    // ── Événement : inscrit + passé ───────────────────────────────────────────
    case 'event': {
      const { data: ev } = await supabase
        .from('events')
        .select('event_date')
        .eq('id', targetId)
        .single();
      if (ev?.event_date && new Date(ev.event_date) > new Date()) return false;
      const { data } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', targetId)
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    }

    // ── Sortie : inscrit + passée ─────────────────────────────────────────────
    case 'outing': {
      const { data: out } = await supabase
        .from('group_outings')
        .select('outing_date')
        .eq('id', targetId)
        .single();
      if (out?.outing_date && new Date(out.outing_date) > new Date()) return false;
      const { data } = await supabase
        .from('outing_participants')
        .select('id')
        .eq('outing_id', targetId)
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    }

    // ── Artisan : auteur de la demande uniquement ─────────────────────────────
    case 'service_request': {
      const { data } = await supabase
        .from('service_requests')
        .select('user_id')
        .eq('id', targetId)
        .single();
      return data?.user_id === userId;
    }

    default:
      return false;
  }
}
