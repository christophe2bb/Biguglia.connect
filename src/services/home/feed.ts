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
  now: 6,       // Ce qui se passe maintenant
  needs: 4,     // Besoins près de chez vous
  upcoming: 4,  // À venir cette semaine
  discussions: 4, // Ça parle ici
  foryou: 5,    // Pour vous
} as const;

// ─── Fetch par domaine ────────────────────────────────────────────────────────

async function fetchHelpRequests(supabase: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 jours
  const { data } = await supabase
    .from('help_requests')
    .select('id, title, description, status, urgency, sector, created_at, updated_at, profiles(id, full_name, avatar_url)')
    .in('status', ['open', 'pending', 'active'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

async function fetchEvents(supabase: ReturnType<typeof createClient>) {
  const now = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('events')
    .select('id, title, description, status, event_date, location, created_at, updated_at, profiles(id, full_name, avatar_url)')
    .gte('event_date', now)
    .lte('event_date', nextWeek)
    .in('status', ['published', 'active', 'approved', 'open'])
    .order('event_date', { ascending: true })
    .limit(10);
  return data ?? [];
}

async function fetchForumTopics(supabase: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('forum_topics')
    .select('id, title, content, status, sector, created_at, updated_at, reply_count, profiles(id, full_name, avatar_url)')
    .neq('status', 'masque')
    .neq('status', 'archive')
    .gte('created_at', since)
    .order('updated_at', { ascending: false })
    .limit(15);
  return data ?? [];
}

async function fetchLostFound(supabase: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('lost_and_found')
    .select('id, title, description, status, type, location, created_at, updated_at, profiles(id, full_name, avatar_url)')
    .neq('status', 'resolved')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

async function fetchListings(supabase: ReturnType<typeof createClient>) {
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('listings')
    .select('id, title, description, status, price, category, created_at, updated_at, profiles(id, full_name, avatar_url)')
    .in('status', ['active', 'published', 'approved'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

async function fetchOutings(supabase: ReturnType<typeof createClient>) {
  const now = new Date().toISOString();
  const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('group_outings')
    .select('id, title, description, status, outing_date, location, max_participants, created_at, updated_at, profiles(id, full_name, avatar_url)')
    .gte('outing_date', now)
    .lte('outing_date', nextTwoWeeks)
    .in('status', ['ouverte', 'active', 'published', 'open'])
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
    ['event', 'outing'].includes(i.type) && (i.status === 'upcoming' || i.eventDate)
  );
  // Sort by event date ascending
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
  // V1 : mix équilibré des contenus les plus récents toutes sources
  const items = rankAndFilter(allItems, { limit: SECTION_LIMITS.foryou, maxPerType: 1 });
  return {
    id: 'foryou',
    title: 'Pour vous',
    subtitle: 'Sélection personnalisée de l\'activité locale',
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

  // Fetch en parallèle — si une source échoue, les autres continuent
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

  // Normalisation via adaptateurs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allItems: HomeFeedItem[] = [
    ...helpRequestsToFeedItems(get(helpRaw) as any[]),
    ...eventsToFeedItems(get(eventsRaw) as any[]),
    ...forumTopicsToFeedItems(get(forumRaw) as any[]),
    ...lostFoundToFeedItems(get(lostFoundRaw) as any[]),
    ...listingsToFeedItems(get(listingsRaw) as any[]),
    ...outingsToFeedItems(get(outingsRaw) as any[]),
  ];

  // Assemblage des sections
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
