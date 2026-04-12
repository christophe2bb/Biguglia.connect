'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useDashboardReviews
// Responsabilité unique : charger les avis reçus et construire le todo associé.
// Les avis sont préchargés dans useDashboardStats (même requête réseau) ;
// ce hook reçoit les données brutes et les mappe — pas de requête Supabase
// supplémentaire au runtime. Le fetch() est conservé pour un usage autonome.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ReviewItem, TodoItem } from './useDashboardData';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseDashboardReviewsResult {
  recentReviews: ReviewItem[];
  loading:       boolean;
  error:         string | null;
  /** Chargement autonome (optionnel — l'orchestrateur passe les données via mapRawReviews). */
  fetch:         (profileId: string) => Promise<void>;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapRawReviews(raw: Record<string, unknown>[]): ReviewItem[] {
  return raw.map(r => {
    const author = r.author as Record<string, unknown> | null;
    return {
      id:          r.id as string,
      rating:      r.rating as number,
      comment:     r.comment as string | undefined,
      targetType:  (r.source_type as string) || '',
      targetId:    (r.source_id   as string) || '',
      authorName:  (author?.full_name as string) || 'Anonyme',
      authorAvatar: author?.avatar_url as string | undefined,
      createdAt:   r.created_at as string,
      isReceived:  true,
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardReviews(): UseDashboardReviewsResult {
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const fetch = useCallback(async (profileId: string) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, source_type, source_id, created_at, author:profiles!reviews_author_id_fkey(full_name, avatar_url)')
        .eq('target_user_id', profileId)
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentReviews(mapRawReviews((data || []) as Record<string, unknown>[]));
    } catch (err) {
      console.error('[useDashboardReviews]', err);
      setError('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  }, []);

  return { recentReviews, loading, error, fetch };
}

// ─── Builder todo lié aux avis ────────────────────────────────────────────────

export function buildReviewTodos(
  toReviewCount:  number,
  profileScore:   number,
): Pick<TodoItem, 'id' | 'type' | 'priority' | 'title' | 'subtitle' | 'href' | 'icon'>[] {
  const todos: Pick<TodoItem, 'id' | 'type' | 'priority' | 'title' | 'subtitle' | 'href' | 'icon'>[] = [];

  if (toReviewCount > 0) {
    todos.push({
      id:       'todo-reviews',
      type:     'review',
      priority: 'normal',
      title:    `${toReviewCount} avis à laisser`,
      subtitle: 'Vos échanges terminés attendent votre avis',
      href:     '/mes-echanges?filter=to_review',
      icon:     '⭐',
    });
  }

  if (profileScore < 80) {
    todos.push({
      id:       'todo-profile',
      type:     'profile',
      priority: 'low',
      title:    `Profil complété à ${profileScore}%`,
      subtitle: 'Ajoutez bio, photo et quartier',
      href:     '/profil',
      icon:     '👤',
    });
  }

  return todos;
}
