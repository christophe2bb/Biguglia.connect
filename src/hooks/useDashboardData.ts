'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useDashboardData — Orchestrateur
// Coordonne les 4 hooks spécialisés et expose le contrat public inchangé.
// Les types sont re-exportés depuis ce fichier pour ne pas casser les
// consommateurs existants (widgets, page.tsx).
//
// Sous-hooks :
//   useDashboardStats        → compteurs KPI + statuts par catégorie
//   useDashboardContent      → contenus récents + activité + participations
//   useDashboardInteractions → interactions actives
//   useDashboardReviews      → avis reçus
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useDashboardStats }        from './useDashboardStats';
import { useDashboardContent, buildContentTodos }             from './useDashboardContent';
import { useDashboardInteractions, buildInteractionTodos }    from './useDashboardInteractions';
import { useDashboardReviews, mapRawReviews, buildReviewTodos } from './useDashboardReviews';

// ─── Types publics ────────────────────────────────────────────────────────────
// Re-exportés ici pour que les widgets n'aient pas à changer leurs imports.

export interface StatusCounts {
  active: number;
  reserved: number;
  sold: number;
  expired: number;
  archived: number;
  [key: string]: number;
}

export interface DashboardStats {
  activeListings: number;
  totalListings: number;
  activeEquipment: number;
  openHelps: number;
  upcomingEvents: number;
  upcomingOutings: number;
  forumPosts: number;
  associations: number;
  activeCollections: number;
  activeLostFound: number;
  eventParticipations: number;
  outingParticipations: number;
  activeBorrows: number;
  activeLends: number;
  unreadMessages: number;
  unreadNotifications: number;
  pendingInteractions: number;
  activeInteractions: number;
  toReviewInteractions: number;
  averageRating: number | null;
  totalReviewsReceived: number;
  reviewsToGive: number;
  totalViews: number;
  profileScore: number;
  listingsByStatus: StatusCounts;
  equipmentByStatus: StatusCounts;
  helpsByStatus: StatusCounts;
  lostFoundByStatus: StatusCounts;
}

export interface TodoItem {
  id: string;
  type: 'interaction' | 'review' | 'profile' | 'listing' | 'message';
  priority: 'urgent' | 'normal' | 'low';
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
  createdAt?: string;
}

export interface ContentItem {
  id: string;
  type: 'listing' | 'equipment' | 'help' | 'event' | 'outing' | 'forum' | 'association' | 'collection' | 'lost_found';
  title: string;
  status: string;
  createdAt: string;
  views?: number;
  responses?: number;
  href: string;
  editHref?: string;
  isClosed?: boolean;
}

export interface InteractionItem {
  id: string;
  sourceType: string;
  sourceTitle: string;
  status: string;
  role: 'requester' | 'receiver';
  otherPartyName: string;
  otherPartyAvatar?: string;
  updatedAt: string;
  reviewUnlocked?: boolean;
  conversationId?: string;
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  targetType: string;
  targetId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  isReceived: boolean;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  date: string;
  badge?: string;
  badgeColor?: string;
}

export interface ParticipationItem {
  id: string;
  type: 'event' | 'outing' | 'borrow';
  title: string;
  date?: string;
  status: string;
  href: string;
  sourceId: string;
}

export interface DashboardData {
  stats: DashboardStats;
  todos: TodoItem[];
  recentContents: ContentItem[];
  activeInteractions: InteractionItem[];
  recentActivity: ActivityItem[];
  recentReviews: ReviewItem[];
  participations: ParticipationItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─── Orchestrateur ────────────────────────────────────────────────────────────

export function useDashboardData(profileId: string | undefined): DashboardData {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const statsHook        = useDashboardStats();
  const contentHook      = useDashboardContent();
  const interactionsHook = useDashboardInteractions();
  const reviewsHook      = useDashboardReviews();

  const fetchAll = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);

    // Stats en premier : fournit listingsRaw aux autres hooks
    await statsHook.fetch(profileId);

    // Les trois autres s'exécutent en parallèle
    await Promise.all([
      contentHook.fetch(profileId, statsHook.listingsRaw),
      interactionsHook.fetch(profileId),
      reviewsHook.fetch(profileId),
    ]);

    // Consolide les erreurs des sous-hooks
    const subError =
      statsHook.error        ??
      contentHook.error      ??
      interactionsHook.error ??
      reviewsHook.error      ?? null;
    setError(subError);
    setLoading(false);
  }, [profileId, statsHook, contentHook, interactionsHook, reviewsHook]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Todos assemblés depuis les 3 builders ──────────────────────────────────
  const { stats } = statsHook;
  const todos: TodoItem[] = [
    ...buildInteractionTodos(
      stats.pendingInteractions,
      stats.activeLends,
      stats.unreadMessages,
    ),
    ...buildReviewTodos(stats.toReviewInteractions, stats.profileScore),
    ...buildContentTodos(statsHook.listingsRaw),
  ].sort((a, b) => {
    const order = { urgent: 0, normal: 1, low: 2 } as const;
    return order[a.priority] - order[b.priority];
  }) as TodoItem[];

  // reviewsHook est la source vérité pour les avis ; mapRawReviews([]) = fallback vide
  const recentReviews =
    reviewsHook.recentReviews.length > 0
      ? reviewsHook.recentReviews
      : mapRawReviews([]);

  return {
    stats:              statsHook.stats,
    todos,
    recentContents:     contentHook.recentContents,
    activeInteractions: interactionsHook.activeInteractions,
    recentActivity:     contentHook.recentActivity,
    recentReviews,
    participations:     contentHook.participations,
    loading:            loading || statsHook.loading || contentHook.loading,
    error,
    refresh:            fetchAll,
  };
}
