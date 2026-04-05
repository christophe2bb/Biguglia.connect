'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StatusCounts {
  active: number;
  reserved: number;
  sold: number;
  expired: number;
  archived: number;
  [key: string]: number;
}

export interface DashboardStats {
  // Contenus
  activeListings: number;
  totalListings: number;
  activeEquipment: number;
  openHelps: number;
  upcomingEvents: number;
  upcomingOutings: number;
  forumPosts: number;
  associations: number;
  // Nouveaux thèmes
  activeCollections: number;
  activeLostFound: number;
  // Participations
  eventParticipations: number;
  outingParticipations: number;
  // Prêts/emprunts
  activeBorrows: number;      // items que j'emprunte (approved/borrowed)
  activeLends: number;        // items que je prête (approved/borrowed)
  // Messages / notifs
  unreadMessages: number;
  unreadNotifications: number;
  // Interactions
  pendingInteractions: number;
  activeInteractions: number;
  toReviewInteractions: number;
  // Avis
  averageRating: number | null;
  totalReviewsReceived: number;
  reviewsToGive: number;
  // Vues
  totalViews: number;
  // Profile completeness
  profileScore: number;
  // Par statut (pour dashboard "Mes contenus")
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
  isReceived: boolean; // true = received, false = given
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

// ─── Profile completeness ─────────────────────────────────────────────────────

function computeProfileScore(profile: Record<string, unknown>): number {
  const checks = [
    !!profile.full_name,
    !!profile.avatar_url,
    !!profile.bio,
    !!profile.phone,
    !!profile.neighborhood,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useDashboardData(profileId: string | undefined): DashboardData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const emptyStatusCounts = (): StatusCounts => ({
    active: 0, reserved: 0, sold: 0, expired: 0, archived: 0,
    available: 0, borrowed: 0, unavailable: 0,
    in_progress: 0, paused: 0, resolved: 0, closed: 0, draft: 0,
    cancelled: 0, completed: 0,
  });

  const [stats, setStats] = useState<DashboardStats>({
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
  });
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [recentContents, setRecentContents] = useState<ContentItem[]>([]);
  const [activeInteractions, setActiveInteractions] = useState<InteractionItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [participations, setParticipations] = useState<ParticipationItem[]>([]);

  const fetchData = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];

      const [
        // Contenus principaux
        { data: listings, count: listingsCount },
        { count: activeListingsCount },
        { data: equipment, count: equipCount },
        { count: openHelpsCount },
        { count: upcomingEventsCount },
        { count: upcomingOutingsCount },
        { count: forumCount },
        { count: assoCount },
        // Messages / notifs
        { count: unreadMsgs },
        { count: unreadNotifs },
        // Interactions
        { count: pendingIntCount },
        { count: activeIntCount },
        { data: interactions },
        // Avis
        { data: reviews },
        // Profile
        { data: profileData },
      ] = await Promise.all([
        supabase.from('listings').select('id, title, status, views, created_at, category:listing_categories(name)', { count: 'exact' })
          .eq('user_id', profileId).order('created_at', { ascending: false }).limit(8),
        supabase.from('listings').select('id', { count: 'exact', head: true })
          .eq('user_id', profileId).eq('status', 'active'),
        supabase.from('equipment_items').select('id, title, is_available, pickup_location, created_at', { count: 'exact' })
          .eq('owner_id', profileId).order('created_at', { ascending: false }).limit(6),
        supabase.from('help_requests').select('id', { count: 'exact', head: true })
          .eq('author_id', profileId).eq('status', 'active'),
        supabase.from('events').select('id', { count: 'exact', head: true })
          .eq('author_id', profileId).gte('event_date', today),
        supabase.from('group_outings').select('id', { count: 'exact', head: true })
          .eq('organizer_id', profileId).gte('outing_date', today),
        supabase.from('forum_posts').select('id', { count: 'exact', head: true })
          .eq('author_id', profileId),
        supabase.from('associations').select('id', { count: 'exact', head: true })
          .eq('author_id', profileId),
        // Unread messages via conversation_participants
        supabase.from('conversation_participants').select('conversation_id', { count: 'exact', head: true })
          .eq('user_id', profileId),
        // Unread notifications
        supabase.from('notifications').select('id', { count: 'exact', head: true })
          .eq('user_id', profileId).eq('is_read', false),
        // Pending interactions
        supabase.from('interactions').select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
          .in('status', ['requested', 'pending']),
        // Active interactions
        supabase.from('interactions').select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
          .in('status', ['accepted', 'in_progress']),
        // Recent interactions (full data)
        supabase.from('interactions').select(`
          id, source_type, source_id, status, requester_id, receiver_id,
          review_unlocked, conversation_id, started_at,
          requester:profiles!interactions_requester_id_fkey(full_name, avatar_url),
          receiver:profiles!interactions_receiver_id_fkey(full_name, avatar_url)
        `)
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
          .not('status', 'in', '(cancelled,done)')
          .order('started_at', { ascending: false })
          .limit(6),
        // Reviews received — schéma unifié (author_id + target_user_id + source_type)
        supabase.from('reviews').select('id, rating, comment, source_type, source_id, created_at, author:profiles!reviews_author_id_fkey(full_name, avatar_url)')
          .eq('target_user_id', profileId)
          .eq('moderation_status', 'visible')
          .order('created_at', { ascending: false })
          .limit(5),
        // Profile
        supabase.from('profiles').select('full_name, avatar_url, bio, phone, neighborhood').eq('id', profileId).single(),
      ]);

      // ── Nouveaux thèmes (collectionneurs, perdu/trouvé) ───────────────────
      const [
        { count: collectionsCount },
        { count: lostFoundCount },
        { count: eventParticipationsCount },
        { count: outingParticipationsCount },
      ] = await Promise.all([
        supabase.from('collection_items').select('id', { count: 'exact', head: true })
          .eq('author_id', profileId).eq('status', 'active'),
        supabase.from('lost_found_items').select('id', { count: 'exact', head: true })
          .eq('author_id', profileId).eq('status', 'active'),
        supabase.from('event_participants').select('id', { count: 'exact', head: true })
          .eq('user_id', profileId),
        supabase.from('outing_participants').select('id', { count: 'exact', head: true })
          .eq('user_id', profileId),
      ]);

      // ── Prêts/emprunts ────────────────────────────────────────────────────
      let activeBorrowsCount = 0;
      let activeLendsCount = 0;
      try {
        const [{ count: borrows }, { count: lends }] = await Promise.all([
          supabase.from('borrow_requests').select('id', { count: 'exact', head: true })
            .eq('borrower_id', profileId).in('status', ['approved', 'borrowed']),
          supabase.from('borrow_requests').select('id', { count: 'exact', head: true })
            .in('status', ['approved', 'borrowed'])
            .filter('item_id', 'in', `(SELECT id FROM equipment_items WHERE owner_id = '${profileId}')`),
        ]);
        activeBorrowsCount = borrows || 0;
        activeLendsCount = lends || 0;
      } catch {
        // tables may not exist
      }

      // Views total
      const totalViews = (listings || []).reduce((s: number, l: Record<string, unknown>) => s + ((l.views as number) || 0), 0);

      // Profile score
      const profileScore = profileData ? computeProfileScore(profileData as Record<string, unknown>) : 0;

      // Reviews stats
      const ratingValues = (reviews || []).map((r: Record<string, unknown>) => r.rating as number);
      const avgRating = ratingValues.length > 0
        ? Math.round((ratingValues.reduce((a: number, b: number) => a + b, 0) / ratingValues.length) * 10) / 10
        : null;

      // Reviews to give — trust_interactions (schéma unifié) avec fallback sur interactions
      let toReviewCount = 0;
      try {
        const { count } = await supabase.from('trust_interactions')
          .select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
          .eq('status', 'done')
          .eq('review_unlocked', true);
        toReviewCount = count || 0;
      } catch {
        // Fallback sur l'ancienne table interactions si trust_interactions n'existe pas encore
        try {
          const { count } = await supabase.from('interactions')
            .select('id', { count: 'exact', head: true })
            .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
            .eq('status', 'done')
            .eq('review_unlocked', true);
          toReviewCount = count || 0;
        } catch {}
      }

      // ── Par-statut counts (pour dashboard "Mes contenus") ────────────────────
      const listingsByStatus = emptyStatusCounts();
      const equipmentByStatus = emptyStatusCounts();
      const helpsByStatus = emptyStatusCounts();
      const lostFoundByStatus = emptyStatusCounts();

      try {
        // Annonces par statut
        const { data: listingStatuses } = await supabase
          .from('listings')
          .select('status')
          .eq('user_id', profileId);
        (listingStatuses || []).forEach((r: Record<string, unknown>) => {
          const s = (r.status as string) || 'active';
          listingsByStatus[s] = (listingsByStatus[s] || 0) + 1;
        });

        // Matériel par statut
        const { data: equipStatuses } = await supabase
          .from('equipment_items')
          .select('status, is_available')
          .eq('owner_id', profileId);
        (equipStatuses || []).forEach((r: Record<string, unknown>) => {
          const s = (r.status as string) || ((r.is_available) ? 'available' : 'unavailable');
          equipmentByStatus[s] = (equipmentByStatus[s] || 0) + 1;
        });

        // Coups de main par statut
        const { data: helpStatuses } = await supabase
          .from('help_requests')
          .select('status')
          .eq('author_id', profileId);
        (helpStatuses || []).forEach((r: Record<string, unknown>) => {
          const s = (r.status as string) || 'active';
          helpsByStatus[s] = (helpsByStatus[s] || 0) + 1;
        });

        // Perdu/Trouvé par statut
        const { data: lfStatuses } = await supabase
          .from('lost_found_items')
          .select('status')
          .eq('author_id', profileId);
        (lfStatuses || []).forEach((r: Record<string, unknown>) => {
          const s = (r.status as string) || 'active';
          lostFoundByStatus[s] = (lostFoundByStatus[s] || 0) + 1;
        });
      } catch {
        // ignore if tables not ready
      }

      setStats({
        activeListings: activeListingsCount || 0,
        totalListings: listingsCount || 0,
        activeEquipment: equipCount || 0,
        openHelps: openHelpsCount || 0,
        upcomingEvents: upcomingEventsCount || 0,
        upcomingOutings: upcomingOutingsCount || 0,
        forumPosts: forumCount || 0,
        associations: assoCount || 0,
        activeCollections: collectionsCount || 0,
        activeLostFound: lostFoundCount || 0,
        eventParticipations: eventParticipationsCount || 0,
        outingParticipations: outingParticipationsCount || 0,
        activeBorrows: activeBorrowsCount,
        activeLends: activeLendsCount,
        unreadMessages: unreadMsgs || 0,
        unreadNotifications: unreadNotifs || 0,
        pendingInteractions: pendingIntCount || 0,
        activeInteractions: activeIntCount || 0,
        toReviewInteractions: toReviewCount || 0,
        averageRating: avgRating,
        totalReviewsReceived: ratingValues.length,
        reviewsToGive: toReviewCount || 0,
        totalViews,
        profileScore,
        listingsByStatus,
        equipmentByStatus,
        helpsByStatus,
        lostFoundByStatus,
      });

      // ── Recent contents ───────────────────────────────────────────────────
      const contents: ContentItem[] = [
        ...(listings || []).slice(0, 5).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          type: 'listing' as const,
          title: l.title as string,
          status: l.status as string,
          createdAt: l.created_at as string,
          views: l.views as number || 0,
          href: `/annonces/${l.id}`,
          editHref: `/annonces/${l.id}/modifier`,
          isClosed: ['sold', 'archived', 'expired'].includes(l.status as string),
        })),
        ...(equipment || []).slice(0, 3).map((e: Record<string, unknown>) => ({
          id: e.id as string,
          type: 'equipment' as const,
          title: e.title as string,
          status: (e.is_available ? 'available' : 'unavailable') as string,
          createdAt: e.created_at as string,
          href: `/materiel/${e.id}`,
          editHref: `/materiel/${e.id}/modifier`,
          isClosed: !(e.is_available as boolean),
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRecentContents(contents);

      // ── Active interactions ────────────────────────────────────────────────
      const mappedInteractions: InteractionItem[] = (interactions || []).map((i: Record<string, unknown>) => {
        const isRequester = i.requester_id === profileId;
        const other = isRequester
          ? (i.receiver as Record<string, unknown>)
          : (i.requester as Record<string, unknown>);
        return {
          id: i.id as string,
          sourceType: i.source_type as string,
          sourceTitle: `${i.source_type} #${(i.source_id as string).slice(0, 6)}`,
          status: i.status as string,
          role: isRequester ? 'requester' : 'receiver',
          otherPartyName: (other?.full_name as string) || 'Utilisateur',
          otherPartyAvatar: other?.avatar_url as string | undefined,
          updatedAt: (i.started_at || i.updated_at) as string,
          reviewUnlocked: i.review_unlocked as boolean,
          conversationId: i.conversation_id as string | undefined,
        };
      });
      setActiveInteractions(mappedInteractions);

      // ── Reviews ────────────────────────────────────────────────────────────
      const mappedReviews: ReviewItem[] = (reviews || []).map((r: Record<string, unknown>) => {
        const author = r.author as Record<string, unknown> | null;
        return {
          id: r.id as string,
          rating: r.rating as number,
          comment: r.comment as string | undefined,
          targetType: (r.source_type as string) || '',
          targetId: (r.source_id as string) || '',
          authorName: (author?.full_name as string) || 'Anonyme',
          authorAvatar: author?.avatar_url as string | undefined,
          createdAt: r.created_at as string,
          isReceived: true,
        };
      });
      setRecentReviews(mappedReviews);

      // ── Participations ────────────────────────────────────────────────────
      const participationItems: ParticipationItem[] = [];
      try {
        const [{ data: eventParts }, { data: outingParts }] = await Promise.all([
          supabase.from('event_participants')
            .select('id, event_id, event:events(id, title, event_date, status)')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('outing_participants')
            .select('id, outing_id, outing:group_outings(id, title, outing_date, status)')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        (eventParts || []).forEach((p: Record<string, unknown>) => {
          const ev = p.event as Record<string, unknown> | null;
          if (ev) {
            participationItems.push({
              id: `ep-${p.id}`,
              type: 'event',
              title: ev.title as string,
              date: ev.event_date as string,
              status: ev.status as string || 'active',
              href: `/evenements`,
              sourceId: p.event_id as string,
            });
          }
        });

        (outingParts || []).forEach((p: Record<string, unknown>) => {
          const ot = p.outing as Record<string, unknown> | null;
          if (ot) {
            participationItems.push({
              id: `op-${p.id}`,
              type: 'outing',
              title: ot.title as string,
              date: ot.outing_date as string,
              status: ot.status as string || 'active',
              href: `/promenades`,
              sourceId: p.outing_id as string,
            });
          }
        });
      } catch {
        // tables may not exist yet
      }
      setParticipations(participationItems);

      // ── Todo list (tâches prioritaires) ───────────────────────────────────
      const todoItems: TodoItem[] = [];

      // 1. Interactions en attente (répondre)
      if (pendingIntCount && pendingIntCount > 0) {
        todoItems.push({
          id: 'todo-pending-int',
          type: 'interaction',
          priority: 'urgent',
          title: `${pendingIntCount} demande${pendingIntCount > 1 ? 's' : ''} en attente de réponse`,
          subtitle: 'Accepter ou refuser',
          href: '/mes-echanges?filter=pending',
          icon: '🔔',
        });
      }

      // 2. Avis à laisser
      if (toReviewCount && toReviewCount > 0) {
        todoItems.push({
          id: 'todo-reviews',
          type: 'review',
          priority: 'normal',
          title: `${toReviewCount} avis à laisser`,
          subtitle: 'Vos échanges terminés attendent votre avis',
          href: '/mes-echanges?filter=to_review',
          icon: '⭐',
        });
      }

      // 3. Messages non lus
      if (unreadMsgs && unreadMsgs > 0) {
        todoItems.push({
          id: 'todo-messages',
          type: 'message',
          priority: 'urgent',
          title: `${unreadMsgs} message${unreadMsgs > 1 ? 's' : ''} sans réponse`,
          subtitle: 'Répondre dans la messagerie',
          href: '/messages',
          icon: '💬',
        });
      }

      // 4. Prêts/emprunts en attente de confirmation
      if (activeLendsCount > 0) {
        todoItems.push({
          id: 'todo-lends',
          type: 'interaction',
          priority: 'normal',
          title: `${activeLendsCount} prêt${activeLendsCount > 1 ? 's' : ''} en cours`,
          subtitle: 'Confirmer le retour du matériel',
          href: '/mes-echanges?filter=active',
          icon: '🔧',
        });
      }

      // 5. Profil incomplet
      if (profileScore < 80) {
        todoItems.push({
          id: 'todo-profile',
          type: 'profile',
          priority: 'low',
          title: `Profil complété à ${profileScore}%`,
          subtitle: 'Ajoutez bio, photo et quartier',
          href: '/profil',
          icon: '👤',
        });
      }

      // 6. Annonces expirées/archivées → republier
      const expiredListings = (listings || []).filter((l: Record<string, unknown>) =>
        l.status === 'expired' || l.status === 'archived'
      );
      if (expiredListings.length > 0) {
        todoItems.push({
          id: 'todo-relist',
          type: 'listing',
          priority: 'low',
          title: `${expiredListings.length} annonce${expiredListings.length > 1 ? 's' : ''} expirée${expiredListings.length > 1 ? 's' : ''}`,
          subtitle: 'Republier pour rester visible',
          href: '/dashboard/contenus',
          icon: '📦',
        });
      }

      setTodos(todoItems.sort((a, b) => {
        const order = { urgent: 0, normal: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }));

      // ── Recent activity ────────────────────────────────────────────────────
      const activity: ActivityItem[] = [];

      // Fetch recent help requests
      const { data: helpData } = await supabase
        .from('help_requests')
        .select('id, title, status, created_at')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false })
        .limit(3);

      (helpData || []).forEach((h: Record<string, unknown>) => {
        activity.push({
          id: `help-${h.id}`,
          type: 'help',
          title: h.title as string,
          subtitle: 'Coup de main',
          href: `/coups-de-main#${h.id}`,
          date: h.created_at as string,
          badge: h.status as string,
          badgeColor: h.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600',
        });
      });

      // Fetch upcoming events created by user
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, event_date, status')
        .eq('author_id', profileId)
        .gte('event_date', today)
        .order('event_date')
        .limit(3);

      (eventsData || []).forEach((e: Record<string, unknown>) => {
        activity.push({
          id: `event-${e.id}`,
          type: 'event',
          title: e.title as string,
          subtitle: `Le ${new Date(e.event_date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
          href: `/evenements`,
          date: e.event_date as string,
          badge: 'À venir',
          badgeColor: 'bg-purple-100 text-purple-700',
        });
      });

      // Fetch upcoming outings
      const { data: outingsData } = await supabase
        .from('group_outings')
        .select('id, title, outing_date, status')
        .eq('organizer_id', profileId)
        .gte('outing_date', today)
        .order('outing_date')
        .limit(3);

      (outingsData || []).forEach((o: Record<string, unknown>) => {
        activity.push({
          id: `outing-${o.id}`,
          type: 'outing',
          title: o.title as string,
          subtitle: `Le ${new Date(o.outing_date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
          href: `/promenades`,
          date: o.outing_date as string,
          badge: 'Promenade',
          badgeColor: 'bg-emerald-100 text-emerald-700',
        });
      });

      // Fetch recent lost/found items
      try {
        const { data: lfData } = await supabase
          .from('lost_found_items')
          .select('id, title, status, type, created_at')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false })
          .limit(2);

        (lfData || []).forEach((lf: Record<string, unknown>) => {
          activity.push({
            id: `lf-${lf.id}`,
            type: 'lost_found',
            title: lf.title as string,
            subtitle: lf.type === 'perdu' ? 'Objet perdu' : 'Objet trouvé',
            href: `/perdu-trouve`,
            date: lf.created_at as string,
            badge: lf.status === 'resolved' ? 'Résolu' : (lf.type === 'perdu' ? 'Perdu' : 'Trouvé'),
            badgeColor: lf.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : lf.type === 'perdu' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
          });
        });
      } catch {}

      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 8));

    } catch (err) {
      console.error('Dashboard data error:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    todos,
    recentContents,
    activeInteractions,
    recentActivity,
    recentReviews,
    participations,
    loading,
    error,
    refresh: fetchData,
  };
}
