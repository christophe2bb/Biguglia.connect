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

  // ── Ref stable vers statsHook.fetch ──────────────────────────────────────────
  // statsHook est recréé à chaque render (objet retourné par un hook interne) :
  // l'inclure dans le useCallback de fetchStats ou dans le useEffect provoquerait
  // une boucle infinie de re-renders. On stabilise la référence via useRef pour
  // accéder toujours à la version courante sans déclencher de nouvel effet.
  const statsHookRef = useRef(statsHook);
  useEffect(() => { statsHookRef.current = statsHook; });

  // ── Fetch initial : stats seules ─────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    // Utilise statsHookRef.current pour toujours avoir la version fraîche
    // sans que statsHook figure dans les dépendances (évite la boucle infinie).
    await statsHookRef.current.fetch(profileId);
    listingsRawRef.current = statsHookRef.current.listingsRaw;
    setLoading(statsHookRef.current.loading);
    setError(statsHookRef.current.error);
  }, [profileId]); // statsHook intentionnellement exclu — voir commentaire ci-dessus

  useEffect(() => {
    fetchedRef.current = new Set();
    listingsRawRef.current = [];
    fetchStats();
  }, [profileId, fetchStats]); // fetchStats est stable (useCallback [profileId])

  // ── Fetch différé déclenché par l'onglet actif ────────────────────────────────
  const fetchDeferred = useCallback(async (key: DeferredKey) => {
    if (!profileId || fetchedRef.current.has(key)) return;
    fetchedRef.current.add(key);

    // Accès via refs stables pour éviter les dépendances instables
    if (key === 'content') {
      await contentHookRef.current.fetch(profileId, listingsRawRef.current);
    } else if (key === 'interactions') {
      await interactionsHookRef.current.fetch(profileId);
    } else if (key === 'reviews') {
      await reviewsHookRef.current.fetch(profileId);
    }
  }, [profileId]); // sous-hooks accédés via refs stables

  // ── API publique appelée par page.tsx à chaque changement d'onglet ────────────
  const fetchForTab = useCallback((tab: string) => {
    const key = TAB_TO_DEFERRED[tab];
    if (key) void fetchDeferred(key);
  }, [fetchDeferred]);

  // ── Refs stables vers les sous-hooks ─────────────────────────────────────────
  // contentHook, interactionsHook, reviewsHook sont également recréés à chaque
  // render. On les stabilise via useRef pour éviter que refresh() et fetchDeferred()
  // aient à les lister en dépendances (ce qui déclencherait des cycles infinis).
  const contentHookRef      = useRef(contentHook);
  const interactionsHookRef = useRef(interactionsHook);
  const reviewsHookRef      = useRef(reviewsHook);
  useEffect(() => {
    contentHookRef.current      = contentHook;
    interactionsHookRef.current = interactionsHook;
    reviewsHookRef.current      = reviewsHook;
  });

  // ── Refresh complet (bouton actualiser) ──────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    fetchedRef.current = new Set();

    await statsHookRef.current.fetch(profileId);
    listingsRawRef.current = statsHookRef.current.listingsRaw;

    await Promise.all([
      contentHookRef.current.fetch(profileId, listingsRawRef.current),
      interactionsHookRef.current.fetch(profileId),
      reviewsHookRef.current.fetch(profileId),
    ]);

    fetchedRef.current = new Set(['content', 'interactions', 'reviews'] as DeferredKey[]);

    const subError =
      statsHookRef.current.error        ??
      contentHookRef.current.error      ??
      interactionsHookRef.current.error ??
      reviewsHookRef.current.error      ?? null;
    setError(subError);
    setLoading(false);
  }, [profileId]); // sous-hooks accédés via refs stables — pas de dépendances instables

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
