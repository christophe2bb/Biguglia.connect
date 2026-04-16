'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useDashboardData — Orchestrateur avec chargement différé par onglet
// ─────────────────────────────────────────────────────────────────────────────
//
// Stratégie de chargement :
//   1. Au montage  → fetch stats uniquement (compteurs KPI pour l'en-tête)
//   2. Par onglet  → fetch du sous-hook correspondant à la première visite
//
// Onglet → sous-hook :
//   overview     → content (recentContents, recentActivity, participations)
//   contenus     → content
//   interactions → interactions
//   messages     → (pas de fetch supplémentaire, géré par useConversationList)
//   avis         → reviews
//   historique   → content (activité récente)
//
// Les tabs qui ne déclenchent pas de fetch supplémentaire affichent les données
// déjà chargées (stats) ou des skeletons jusqu'à ce que le fetch arrive.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboardStats }                                   from './useDashboardStats';
import { useDashboardContent, buildContentTodos }              from './useDashboardContent';
import { useDashboardInteractions, buildInteractionTodos }     from './useDashboardInteractions';
import { useDashboardReviews, mapRawReviews, buildReviewTodos } from './useDashboardReviews';

// ─── Types publics ─────────────────────────────────────────────────────────────
// Re-exportés pour que les widgets n'aient pas à changer leurs imports.

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

// ─── Tabs connus ──────────────────────────────────────────────────────────────
// Ceux qui nécessitent un fetch supplémentaire au-delà des stats.
type DeferredKey = 'content' | 'interactions' | 'reviews';

// Map tab → clé de sous-hook. undefined = tab sans fetch dédié (messages).
const TAB_TO_DEFERRED: Record<string, DeferredKey | undefined> = {
  overview:     'content',
  contenus:     'content',
  historique:   'content',
  interactions: 'interactions',
  avis:         'reviews',
  messages:     undefined,
};

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
  /** Appelé par page.tsx lors du changement d'onglet pour déclencher le fetch différé */
  fetchForTab: (tab: string) => void;
}

// ─── Orchestrateur ─────────────────────────────────────────────────────────────

export function useDashboardData(profileId: string | undefined): DashboardData {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const statsHook        = useDashboardStats();
  const contentHook      = useDashboardContent();
  const interactionsHook = useDashboardInteractions();
  const reviewsHook      = useDashboardReviews();

  // Garde : sous-hooks déjà fetchés au moins une fois (évite double-fetch)
  const fetchedRef = useRef<Set<DeferredKey>>(new Set());
  // Ref vers listingsRaw stable pour les closures des fetchs différés
  const listingsRawRef = useRef<Record<string, unknown>[]>([]);

  // ── Fetch initial : stats seules ─────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    await statsHook.fetch(profileId);
    // Stocker listingsRaw pour les fetchs différés
    listingsRawRef.current = statsHook.listingsRaw;
    setLoading(statsHook.loading);
    setError(statsHook.error);
  }, [profileId, statsHook]);

  useEffect(() => {
    fetchedRef.current = new Set();
    listingsRawRef.current = [];
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // ── Fetch différé déclenché par l'onglet actif ────────────────────────────────
  const fetchDeferred = useCallback(async (key: DeferredKey) => {
    if (!profileId || fetchedRef.current.has(key)) return;
    fetchedRef.current.add(key);

    if (key === 'content') {
      await contentHook.fetch(profileId, listingsRawRef.current);
    } else if (key === 'interactions') {
      await interactionsHook.fetch(profileId);
    } else if (key === 'reviews') {
      await reviewsHook.fetch(profileId);
    }
  }, [profileId, contentHook, interactionsHook, reviewsHook]);

  // ── API publique appelée par page.tsx à chaque changement d'onglet ────────────
  const fetchForTab = useCallback((tab: string) => {
    const key = TAB_TO_DEFERRED[tab];
    if (key) void fetchDeferred(key);
  }, [fetchDeferred]);

  // ── Refresh complet (bouton actualiser) ──────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    fetchedRef.current = new Set();

    await statsHook.fetch(profileId);
    listingsRawRef.current = statsHook.listingsRaw;

    await Promise.all([
      contentHook.fetch(profileId, listingsRawRef.current),
      interactionsHook.fetch(profileId),
      reviewsHook.fetch(profileId),
    ]);

    fetchedRef.current = new Set(['content', 'interactions', 'reviews'] as DeferredKey[]);

    const subError =
      statsHook.error        ??
      contentHook.error      ??
      interactionsHook.error ??
      reviewsHook.error      ?? null;
    setError(subError);
    setLoading(false);
  }, [profileId, statsHook, contentHook, interactionsHook, reviewsHook]);

  // ── Todos assemblés depuis les compteurs de stats ────────────────────────────
  const { stats } = statsHook;
  const todos: TodoItem[] = [
    ...buildInteractionTodos(
      stats.pendingInteractions,
      stats.activeLends,
      stats.unreadMessages,
    ),
    ...buildReviewTodos(stats.toReviewInteractions, stats.profileScore),
    ...buildContentTodos(listingsRawRef.current),
  ].sort((a, b) => {
    const order = { urgent: 0, normal: 1, low: 2 } as const;
    return order[a.priority] - order[b.priority];
  }) as TodoItem[];

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
    loading:            loading || statsHook.loading,
    error,
    refresh,
    fetchForTab,
  };
}
