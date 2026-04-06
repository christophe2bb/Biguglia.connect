// ─────────────────────────────────────────────────────────────────────────────
// Maison vivante — Service d'agrégation du feed local
// Point d'entrée unique pour toutes les sources de contenu.
// Appelé exclusivement côté serveur (SSR) — aucune logique UI ici.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import type { HomeFeedItem, HomeFeedResult, HomeSection } from './types';
import {
  helpRequestsToFeedItems,
  eventsToFeedItems,
  forumTopicsToFeedItems,
  lostFoundToFeedItems,
  listingsToFeedItems,
  outingsToFeedItems,
} from './mappers';
import { rankAndFilter, scoreItems, sortByScore } from './scoring';

// ─── Configuration des sections ───────────────────────────────────────────────

const SECTION_LIMITS = {
  now: 6,
  needs: 4,
  upcoming: 4,
  discussions: 4,
  foryou: 5,
} as const;

// ─── Fetch par domaine ────────────────────────────────────────────────────────
// NB : on utilise les alias Supabase (author:profiles) pour normaliser
//      les clés de jointure quelle que soit la colonne FK source.

async function fetchHelpRequests(supabase: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('help_requests')
    .select('id, title, description, status, urgency, sector, created_at, updated_at, author:profiles(id, full_name, avatar_url)')
    .neq('status', 'draft')
    .neq('status', 'resolved')
    .neq('status', 'archived')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

async function fetchEvents(supabase: ReturnType<typeof createClient>) {
  // On récupère les événements à venir sur 21 jours, tous statuts visibles
  const now = new Date().toISOString().split('T')[0]; // date seule (YYYY-MM-DD)
  const inThreeWeeks = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data } = await supabase
    .from('events')
    .select('id, title, description, status, event_date, location, created_at, updated_at, author:profiles(id, full_name, avatar_url)')
    .gte('event_date', now)
    .lte('event_date', inThreeWeeks)
    // Tous les statuts non-annulés : a_venir, publie, active, approved, open, published, complet, reporte
    .not('status', 'eq', 'annule')
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'draft')
    .order('event_date', { ascending: true })
    .limit(10);
  return data ?? [];
}

async function fetchForumTopics(supabase: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('forum_topics')
    .select('id, title, content, status, sector, created_at, updated_at, reply_count, author:profiles(id, full_name, avatar_url)')
    .neq('status', 'masque')
    .neq('status', 'archive')
    .neq('status', 'verrouille')
    .gte('created_at', since)
    .order('updated_at', { ascending: false })
    .limit(15);
  return data ?? [];
}

async function fetchLostFound(supabase: ReturnType<typeof createClient>) {
  // Table réelle : lost_found_items (pas lost_and_found)
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('lost_found_items')
    .select('id, title, description, status, type, location_area, created_at, updated_at, author:profiles(id, full_name, avatar_url)')
    .neq('status', 'resolved')
    .neq('status', 'found')
    .neq('status', 'returned')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

async function fetchListings(supabase: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('listings')
    .select('id, title, description, status, price, category, created_at, updated_at, author:profiles(id, full_name, avatar_url)')
    .in('status', ['active', 'published', 'approved', 'disponible'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

async function fetchOutings(supabase: ReturnType<typeof createClient>) {
  // Table : group_outings, FK : organizer_id → profiles
  const now = new Date().toISOString().split('T')[0];
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data } = await supabase
    .from('group_outings')
    .select('id, title, description, status, outing_date, meeting_point, max_participants, created_at, updated_at, organizer:profiles!group_outings_organizer_id_fkey(id, full_name, avatar_url)')
    .gte('outing_date', now)
    .lte('outing_date', inTwoWeeks)
    .neq('status', 'annulee')
    .neq('status', 'cancelled')
    .neq('status', 'archivee')
    .order('outing_date', { ascending: true })
    .limit(8);
  return data ?? [];
}

// ─── Assemblage des sections ──────────────────────────────────────────────────

function buildNowSection(allItems: HomeFeedItem[]): HomeSection {
  const eligible = allItems.filter(i =>
    ['help_request', 'lost_found', 'listing', 'forum_topic'].includes(i.type) && !i.isResolved
  );
  const items = rankAndFilter(eligible, { limit: SECTION_LIMITS.now, maxPerType: 2 });
  return {
    id: 'now',
    title: 'Ce qui se passe maintenant',
    subtitle: 'Nouveautés, demandes actives, annonces récentes',
    icon: '⚡',
    items,
    ctaLabel: 'Voir tout',
    ctaUrl: '/forum',
    isEmpty: items.length === 0,
  };
}

function buildNeedsSection(allItems: HomeFeedItem[]): HomeSection {
  const eligible = allItems.filter(i =>
    i.type === 'help_request' && !i.isResolved
  );
  const items = rankAndFilter(eligible, { limit: SECTION_LIMITS.needs, maxPerType: 4, excludeResolved: true });
  return {
    id: 'needs',
    title: 'Besoins près de chez vous',
    subtitle: 'Voisins qui ont besoin d\'un coup de main',
    icon: '🤝',
    items,
    ctaLabel: 'Voir toutes les demandes',
    ctaUrl: '/coups-de-main',
    isEmpty: items.length === 0,
  };
}

function buildUpcomingSection(allItems: HomeFeedItem[]): HomeSection {
  const eligible = allItems.filter(i =>
    ['event', 'outing'].includes(i.type)
  );
  const sorted = [...eligible].sort((a, b) => {
    const da = new Date(a.eventDate ?? a.createdAt).getTime();
    const db = new Date(b.eventDate ?? b.createdAt).getTime();
    return da - db;
  });
  const items = sorted.slice(0, SECTION_LIMITS.upcoming);
  return {
    id: 'upcoming',
    title: 'À venir cette semaine',
    subtitle: 'Événements, promenades, sorties',
    icon: '📅',
    items,
    ctaLabel: 'Voir tous les événements',
    ctaUrl: '/evenements',
    isEmpty: items.length === 0,
  };
}

function buildDiscussionsSection(allItems: HomeFeedItem[]): HomeSection {
  const eligible = allItems.filter(i => i.type === 'forum_topic');
  const scored = scoreItems(eligible);
  const sorted = sortByScore(scored);
  const items = sorted.slice(0, SECTION_LIMITS.discussions);
  return {
    id: 'discussions',
    title: 'Ça parle ici',
    subtitle: 'Discussions actives du forum local',
    icon: '💬',
    items,
    ctaLabel: 'Rejoindre le forum',
    ctaUrl: '/forum',
    isEmpty: items.length === 0,
  };
}

function buildForYouSection(allItems: HomeFeedItem[]): HomeSection {
  const items = rankAndFilter(allItems, { limit: SECTION_LIMITS.foryou, maxPerType: 1 });
  return {
    id: 'foryou',
    title: 'Pour vous',
    subtitle: 'Sélection de l\'activité locale',
    icon: '✨',
    items,
    ctaLabel: 'Explorer',
    ctaUrl: '/recherche',
    isEmpty: items.length === 0,
  };
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

export async function getHomeFeed(): Promise<HomeFeedResult> {
  const supabase = createClient();

  // Fetch en parallèle — tolérant aux pannes : si une source échoue, les autres continuent
  const [helpRaw, eventsRaw, forumRaw, lostFoundRaw, listingsRaw, outingsRaw] =
    await Promise.allSettled([
      fetchHelpRequests(supabase),
      fetchEvents(supabase),
      fetchForumTopics(supabase),
      fetchLostFound(supabase),
      fetchListings(supabase),
      fetchOutings(supabase),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const get = <T>(r: PromiseSettledResult<T[]>): T[] =>
    r.status === 'fulfilled' ? r.value : [];

  // Normalisation via adaptateurs — chaque adaptateur gère ses alias
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allItems: HomeFeedItem[] = [
    ...helpRequestsToFeedItems(get(helpRaw) as any[]),
    ...eventsToFeedItems(get(eventsRaw) as any[]),
    ...forumTopicsToFeedItems(get(forumRaw) as any[]),
    ...lostFoundToFeedItems(get(lostFoundRaw) as any[]),
    ...listingsToFeedItems(get(listingsRaw) as any[]),
    ...outingsToFeedItems(get(outingsRaw) as any[]),
  ];

  const sections = [
    buildNowSection(allItems),
    buildNeedsSection(allItems),
    buildUpcomingSection(allItems),
    buildDiscussionsSection(allItems),
    buildForYouSection(allItems),
  ];

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const hasContent = totalItems > 0;

  return {
    sections,
    totalItems,
    generatedAt: new Date().toISOString(),
    hasContent,
  };
}
