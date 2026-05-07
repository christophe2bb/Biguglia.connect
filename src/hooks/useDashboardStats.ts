'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useDashboardStats
// Responsabilité unique : charger tous les compteurs agrégés du dashboard.
// Retourne un objet { stats, loading, error }.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DashboardStats, StatusCounts } from './useDashboardData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function emptyStatusCounts(): StatusCounts {
  return {
    active: 0, reserved: 0, sold: 0, expired: 0, archived: 0,
    available: 0, borrowed: 0, unavailable: 0,
    in_progress: 0, paused: 0, resolved: 0, closed: 0, draft: 0,
    cancelled: 0, completed: 0,
  };
}

export function computeProfileScore(profile: Record<string, unknown>): number {
  // bio et city n'existent pas dans la table profiles — score basé sur les colonnes réelles
  const checks = [
    !!profile.full_name,
    !!profile.avatar_url,
    !!profile.phone,
    !!profile.home_sector_id,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function emptyStats(): DashboardStats {
  return {
    activeListings: 0, totalListings: 0, activeEquipment: 0,
    openHelps: 0, upcomingEvents: 0, upcomingOutings: 0,
    forumPosts: 0, associations: 0,
    activeCollections: 0, activeLostFound: 0,
    eventParticipations: 0, outingParticipations: 0,
    activeBorrows: 0, activeLends: 0,
    unreadMessages: 0, unreadNotifications: 0,
    pendingInteractions: 0, activeInteractions: 0, toReviewInteractions: 0,
    averageRating: null, totalReviewsReceived: 0, reviewsToGive: 0,
    totalViews: 0, profileScore: 0,
    listingsByStatus: emptyStatusCounts(),
    equipmentByStatus: emptyStatusCounts(),
    helpsByStatus: emptyStatusCounts(),
    lostFoundByStatus: emptyStatusCounts(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseDashboardStatsResult {
  stats: DashboardStats;
  /** Vues totales extraites des listings (partagées avec useDashboardContent) */
  listingsRaw: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  fetch: (profileId: string) => Promise<void>;
}

export function useDashboardStats(): UseDashboardStatsResult {
  const [stats, setStats]             = useState<DashboardStats>(emptyStats());
  const [listingsRaw, setListingsRaw] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const fetch = useCallback(async (profileId: string) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const today    = new Date().toISOString().split('T')[0];

      // ── Requêtes parallèles batch 1 ──────────────────────────────────────
      // conversation_participants est optionnelle — on l’isoà pour éviter qu’une
      // erreur 500 (table manquante) ne fasse planter tout le Promise.all
      let unreadMsgsCount = 0;
      try {
        const cpRes = await supabase
          .from('conversation_participants')
          .select('conversation_id', { count: 'exact', head: true })
          .eq('user_id', profileId);
        unreadMsgsCount = cpRes.count ?? 0;
      } catch { /* table optionnelle */ }

      const [
        { data: listings, count: listingsCount },
        { count: activeListingsCount },
        { count: equipCount },
        { count: openHelpsCount },
        { count: upcomingEventsCount },
        { count: upcomingOutingsCount },
        { count: forumCount },
        { count: assoCount },
        { count: unreadNotifs },
        { count: pendingIntCount },
        { count: activeIntCount },
        { data: reviews },
        { data: profileData },
      ] = await Promise.all([
        supabase.from('listings')
          .select('id, title, status, views_count, created_at, category:listing_categories(name)', { count: 'exact' })
          .eq('user_id', profileId).order('created_at', { ascending: false }).limit(8),
        supabase.from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profileId).eq('status', 'active'),
        supabase.from('equipment_items')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', profileId),
        supabase.from('help_requests')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileId).eq('status', 'active'),
        supabase.from('events')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileId).gte('event_date', today),
        supabase.from('group_outings')
          .select('id', { count: 'exact', head: true })
          .eq('organizer_id', profileId).gte('outing_date', today),
        supabase.from('forum_topics')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileId),
        supabase.from('associations')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileId),
        supabase.from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profileId).eq('is_read', false),
        supabase.from('interactions')
          .select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
          .in('status', ['requested', 'pending']),
        supabase.from('interactions')
          .select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
          .in('status', ['accepted', 'in_progress']),
        supabase.from('reviews')
          .select('id, rating, comment, source_type, source_id, created_at, author:profiles!reviews_author_id_fkey(full_name, avatar_url)')
          .eq('target_user_id', profileId)
          .eq('moderation_status', 'visible')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('profiles')
          .select('full_name, avatar_url, phone, home_sector_id')
          .eq('id', profileId).single(),
      ]);

      // ── Batch 2 : thèmes & participations ────────────────────────────────
      const [
        { count: collectionsCount },
        { count: lostFoundCount },
        { count: eventParticipationsCount },
        { count: outingParticipationsCount },
      ] = await Promise.all([
        supabase.from('collection_items')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileId).eq('status', 'active'),
        supabase.from('lost_found_items')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profileId).eq('status', 'active'),
        supabase.from('event_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profileId),
        supabase.from('outing_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profileId),
      ]);

      // ── Prêts/emprunts (table optionnelle) ───────────────────────────────
      // Note : .filter('item_id', 'in', '(SELECT ...)') n'est pas supporté par
      // PostgREST (retourne 400). On utilise une requête en deux étapes :
      //   1. Récupérer les IDs des équipements appartenant au user
      //   2. Filtrer borrow_requests sur ces IDs avec .in()
      let activeBorrowsCount = 0;
      let activeLendsCount   = 0;
      try {
        // Étape 1 : IDs des équipements du user
        const { data: ownedItems } = await supabase
          .from('equipment_items')
          .select('id')
          .eq('owner_id', profileId);
        const ownedItemIds = (ownedItems ?? []).map((r: Record<string, unknown>) => r.id as string);

        // Étape 2 : compter les emprunts/prêts
        const borrowQuery = supabase.from('borrow_requests')
          .select('id', { count: 'exact', head: true })
          .eq('borrower_id', profileId).in('status', ['approved', 'borrowed']);

        // Si aucun équipement → activeLendsCount reste 0 (pas de requête inutile)
        const lendsQuery = ownedItemIds.length > 0
          ? supabase.from('borrow_requests')
              .select('id', { count: 'exact', head: true })
              .in('status', ['approved', 'borrowed'])
              .in('item_id', ownedItemIds)
          : Promise.resolve({ count: 0, data: null, error: null });

        const [{ count: borrows }, { count: lends }] = await Promise.all([borrowQuery, lendsQuery]);
        activeBorrowsCount = borrows || 0;
        activeLendsCount   = lends   || 0;
      } catch { /* table may not exist */ }

      // ── Avis à laisser (trust_interactions → fallback interactions) ──────
      let toReviewCount = 0;
      try {
        const { count } = await supabase.from('trust_interactions')
          .select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
          .eq('status', 'done').eq('review_unlocked', true);
        toReviewCount = count || 0;
      } catch {
        try {
          const { count } = await supabase.from('interactions')
            .select('id', { count: 'exact', head: true })
            .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
            .eq('status', 'done').eq('review_unlocked', true);
          toReviewCount = count || 0;
        } catch { /* ignore */ }
      }

      // ── Compteurs par statut ─────────────────────────────────────────────
      const listingsByStatus  = emptyStatusCounts();
      const equipmentByStatus = emptyStatusCounts();
      const helpsByStatus     = emptyStatusCounts();
      const lostFoundByStatus = emptyStatusCounts();
      try {
        const [
          { data: listingStatuses },
          { data: equipStatuses },
          { data: helpStatuses },
          { data: lfStatuses },
        ] = await Promise.all([
          supabase.from('listings').select('status').eq('user_id', profileId),
          supabase.from('equipment_items').select('status, is_available').eq('owner_id', profileId),
          supabase.from('help_requests').select('status').eq('author_id', profileId),
          supabase.from('lost_found_items').select('status').eq('author_id', profileId),
        ]);
        (listingStatuses || []).forEach((r: Record<string, unknown>) => {
          const s = (r.status as string) || 'active';
          listingsByStatus[s] = (listingsByStatus[s] || 0) + 1;
        });
        (equipStatuses || []).forEach((r: Record<string, unknown>) => {
          const s = (r.status as string) || (r.is_available ? 'available' : 'unavailable');
          equipmentByStatus[s] = (equipmentByStatus[s] || 0) + 1;
        });
        (helpStatuses || []).forEach((r: Record<string, unknown>) => {
          const s = (r.status as string) || 'active';
          helpsByStatus[s] = (helpsByStatus[s] || 0) + 1;
        });
        (lfStatuses || []).forEach((r: Record<string, unknown>) => {
          const s = (r.status as string) || 'active';
          lostFoundByStatus[s] = (lostFoundByStatus[s] || 0) + 1;
        });
      } catch { /* ignore if tables not ready */ }

      // ── Calculs dérivés ──────────────────────────────────────────────────
      const rawListings  = (listings || []) as Record<string, unknown>[];
      const totalViews   = rawListings.reduce((s, l) => s + ((l.views_count as number) || 0), 0);
      const profileScore = profileData ? computeProfileScore(profileData as Record<string, unknown>) : 0;
      const ratingValues = (reviews || []).map((r: Record<string, unknown>) => r.rating as number);
      const avgRating    = ratingValues.length > 0
        ? Math.round((ratingValues.reduce((a: number, b: number) => a + b, 0) / ratingValues.length) * 10) / 10
        : null;

      setListingsRaw(rawListings);
      setStats({
        activeListings:       activeListingsCount         || 0,
        totalListings:        listingsCount               || 0,
        activeEquipment:      equipCount                  || 0,
        openHelps:            openHelpsCount              || 0,
        upcomingEvents:       upcomingEventsCount         || 0,
        upcomingOutings:      upcomingOutingsCount        || 0,
        forumPosts:           forumCount                  || 0,
        associations:         assoCount                   || 0,
        activeCollections:    collectionsCount            || 0,
        activeLostFound:      lostFoundCount              || 0,
        eventParticipations:  eventParticipationsCount    || 0,
        outingParticipations: outingParticipationsCount   || 0,
        activeBorrows:        activeBorrowsCount,
        activeLends:          activeLendsCount,
        unreadMessages:       unreadMsgsCount,
        unreadNotifications:  unreadNotifs                || 0,
        pendingInteractions:  pendingIntCount             || 0,
        activeInteractions:   activeIntCount              || 0,
        toReviewInteractions: toReviewCount,
        averageRating:        avgRating,
        totalReviewsReceived: ratingValues.length,
        reviewsToGive:        toReviewCount,
        totalViews,
        profileScore,
        listingsByStatus,
        equipmentByStatus,
        helpsByStatus,
        lostFoundByStatus,
      });
    } catch (err) {
      console.error('[useDashboardStats]', err);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, listingsRaw, loading, error, fetch };
}
