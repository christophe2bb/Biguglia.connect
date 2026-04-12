'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useDashboardInteractions
// Responsabilité unique : charger les interactions actives de l'utilisateur
// (table `interactions`) et construire les todos associés.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { InteractionItem, TodoItem } from './useDashboardData';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseDashboardInteractionsResult {
  activeInteractions: InteractionItem[];
  loading: boolean;
  error:   string | null;
  fetch:   (profileId: string) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardInteractions(): UseDashboardInteractionsResult {
  const [activeInteractions, setActiveInteractions] = useState<InteractionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async (profileId: string) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      const { data: interactions } = await supabase
        .from('interactions')
        .select(`
          id, source_type, source_id, status, requester_id, receiver_id,
          review_unlocked, conversation_id, started_at,
          requester:profiles!interactions_requester_id_fkey(full_name, avatar_url),
          receiver:profiles!interactions_receiver_id_fkey(full_name, avatar_url)
        `)
        .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
        .not('status', 'in', '(cancelled,done)')
        .order('started_at', { ascending: false })
        .limit(6);

      const mapped: InteractionItem[] = (interactions || []).map(
        (i: Record<string, unknown>) => {
          const isRequester = i.requester_id === profileId;
          const other = isRequester
            ? (i.receiver  as Record<string, unknown>)
            : (i.requester as Record<string, unknown>);
          return {
            id:                i.id as string,
            sourceType:        i.source_type as string,
            sourceTitle:       `${i.source_type} #${(i.source_id as string).slice(0, 6)}`,
            status:            i.status as string,
            role:              isRequester ? 'requester' : 'receiver',
            otherPartyName:    (other?.full_name as string) || 'Utilisateur',
            otherPartyAvatar:  other?.avatar_url as string | undefined,
            updatedAt:         ((i.started_at || i.updated_at) as string),
            reviewUnlocked:    i.review_unlocked as boolean,
            conversationId:    i.conversation_id as string | undefined,
          };
        },
      );

      setActiveInteractions(mapped);
    } catch (err) {
      console.error('[useDashboardInteractions]', err);
      setError('Erreur lors du chargement des interactions');
    } finally {
      setLoading(false);
    }
  }, []);

  return { activeInteractions, loading, error, fetch };
}

// ─── Builder todos liés aux interactions ─────────────────────────────────────

export function buildInteractionTodos(
  pendingIntCount:  number,
  activeLendsCount: number,
  unreadMsgs:       number,
): Pick<TodoItem, 'id' | 'type' | 'priority' | 'title' | 'subtitle' | 'href' | 'icon'>[] {
  const todos: Pick<TodoItem, 'id' | 'type' | 'priority' | 'title' | 'subtitle' | 'href' | 'icon'>[] = [];

  if (pendingIntCount > 0) {
    todos.push({
      id:       'todo-pending-int',
      type:     'interaction',
      priority: 'urgent',
      title:    `${pendingIntCount} demande${pendingIntCount > 1 ? 's' : ''} en attente de réponse`,
      subtitle: 'Accepter ou refuser',
      href:     '/mes-echanges?filter=pending',
      icon:     '🔔',
    });
  }

  if (unreadMsgs > 0) {
    todos.push({
      id:       'todo-messages',
      type:     'message',
      priority: 'urgent',
      title:    `${unreadMsgs} message${unreadMsgs > 1 ? 's' : ''} sans réponse`,
      subtitle: 'Répondre dans la messagerie',
      href:     '/messages',
      icon:     '💬',
    });
  }

  if (activeLendsCount > 0) {
    todos.push({
      id:       'todo-lends',
      type:     'interaction',
      priority: 'normal',
      title:    `${activeLendsCount} prêt${activeLendsCount > 1 ? 's' : ''} en cours`,
      subtitle: 'Confirmer le retour du matériel',
      href:     '/mes-echanges?filter=active',
      icon:     '🔧',
    });
  }

  return todos;
}
