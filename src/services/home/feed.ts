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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Retourne la date du jour en YYYY-MM-DD (timezone locale du serveur)
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Fetch par domaine ────────────────────────────────────────────────────────
// • currentUserId : si fourni, on exclut les contenus de l'utilisateur connecté
//   (le fil est fait pour voir ce que les VOISINS publient)

async function fetchHelpRequests(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
) {
  const since = new Date(Date.now() - 90 * 86400000).toISOString(); // 90 jours
  let q = supabase
    .from('help_requests')
    .select('id, title, description, status, urgency, sector, created_at, updated_at, author:profiles(id, full_name, avatar_url)')
    .neq('status', 'draft')
    .neq('status', 'resolved')
    .neq('status', 'archived')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  if (currentUserId) q = q.neq('author_id', currentUserId);
  const { data } = await q;
  return data ?? [];
}

async function fetchEvents(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
) {
  const today = todayStr();
  const in3Weeks = daysFromNow(21);
  let q = supabase
    .from('events')
    .select('id, title, description, status, event_date, location, created_at, updated_at, author:profiles(id, full_name, avatar_url)')
    .gte('event_date', today)
    .lte('event_date', in3Weeks)
    .not('status', 'eq', 'annule')
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'draft')
    .order('event_date', { ascending: true })
    .limit(10);
  if (currentUserId) q = q.neq('author_id', currentUserId);
  const { data } = await q;
  return data ?? [];
}

async function fetchForumTopics(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
) {
  const since = new Date(Date.now() - 90 * 86400000).toISOString(); // 90 jours
  let q = supabase
    .from('forum_topics')
    .select('id, title, content, status, sector, created_at, updated_at, reply_count, author:profiles!forum_topics_author_id_fkey(id, full_name, avatar_url)')
    .neq('status', 'masque')
    .neq('status', 'archive')
    .neq('status', 'verrouille')
    .gte('created_at', since)
    .order('updated_at', { ascending: false })
    .limit(15);
  if (currentUserId) q = q.neq('author_id', currentUserId);
  const { data } = await q;
  return data ?? [];
}

async function fetchLostFound(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
) {
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  let q = supabase
    .from('lost_found_items')
    .select('id, title, description, status, type, location_area, created_at, updated_at, author:profiles!lost_found_items_author_id_fkey(id, full_name, avatar_url)')
    .neq('status', 'resolved')
    .neq('status', 'found')
    .neq('status', 'returned')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);
  if (currentUserId) q = q.neq('author_id', currentUserId);
  const { data } = await q;
  return data ?? [];
}

async function fetchListings(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
) {
  const since = new Date(Date.now() - 21 * 86400000).toISOString();
  // listings utilise user_id (pas author_id) — on exclut les propres annonces
  // Note: la jointure profiles est optionnelle; si elle échoue, le feed affiche quand même les annonces
  let q = supabase
    .from('listings')
    .select('id, title, description, status, price, category, created_at, updated_at')
    .in('status', ['active', 'published', 'approved', 'disponible'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);
  if (currentUserId) q = q.neq('user_id', currentUserId); // FK réelle = user_id
  const { data } = await q;
  return data ?? [];
}

async function fetchOutings(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
) {
  const today = todayStr();
  const in2Weeks = daysFromNow(14);
  let q = supabase
    .from('group_outings')
    .select('id, title, description, status, outing_date, meeting_point, max_participants, created_at, updated_at, organizer:profiles!group_outings_organizer_id_fkey(id, full_name, avatar_url)')
    .gte('outing_date', today)
    .lte('outing_date', in2Weeks)
    .neq('status', 'annulee')
    .neq('status', 'cancelled')
    .neq('status', 'archivee')
    .order('outing_date', { ascending: true })
    .limit(8);
  if (currentUserId) q = q.neq('organizer_id', currentUserId);
  const { data } = await q;
  return data ?? [];
}

// ─── Assemblage des sections ──────────────────────────────────────────────────

// Collecte les IDs déjà utilisés dans les sections précédentes (anti-doublon)
function usedIds(sections: HomeSection[]): Set<string> {
  const ids = new Set<string>();
  for (const s of sections) {
    for (const item of s.items) ids.add(item.id);
  }
  return ids;
}

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
  const eligible = allItems.filter(i => i.type === 'help_request' && !i.isResolved);
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
  const eligible = allItems.filter(i => ['event', 'outing'].includes(i.type));
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

// "Pour vous" : uniquement des items PAS encore affichés dans les sections précédentes
function buildForYouSection(allItems: HomeFeedItem[], alreadyShown: Set<string>): HomeSection {
  const fresh = allItems.filter(i => !alreadyShown.has(i.id));
  const items = rankAndFilter(fresh, { limit: SECTION_LIMITS.foryou, maxPerType: 1 });
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

export async function getHomeFeed(currentUserId: string | null = null): Promise<HomeFeedResult> {
  const supabase = createClient();

  // Fetch en parallèle — tolérant aux pannes
  const [helpRaw, eventsRaw, forumRaw, lostFoundRaw, listingsRaw, outingsRaw] =
    await Promise.allSettled([
      fetchHelpRequests(supabase, currentUserId),
      fetchEvents(supabase, currentUserId),
      fetchForumTopics(supabase, currentUserId),
      fetchLostFound(supabase, currentUserId),
      fetchListings(supabase, currentUserId),
      fetchOutings(supabase, currentUserId),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const get = <T>(r: PromiseSettledResult<T[]>): T[] =>
    r.status === 'fulfilled' ? r.value : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allItems: HomeFeedItem[] = [
    ...helpRequestsToFeedItems(get(helpRaw) as any[]),
    ...eventsToFeedItems(get(eventsRaw) as any[]),
    ...forumTopicsToFeedItems(get(forumRaw) as any[]),
    ...lostFoundToFeedItems(get(lostFoundRaw) as any[]),
    ...listingsToFeedItems(get(listingsRaw) as any[]),
    ...outingsToFeedItems(get(outingsRaw) as any[]),
  ];

  // Construire les sections dans l'ordre — "Pour vous" utilise les IDs déjà affichés
  const nowSection          = buildNowSection(allItems);
  const needsSection        = buildNeedsSection(allItems);
  const upcomingSection     = buildUpcomingSection(allItems);
  const discussionsSection  = buildDiscussionsSection(allItems);
  const shownSoFar          = usedIds([nowSection, needsSection, upcomingSection, discussionsSection]);
  const forYouSection       = buildForYouSection(allItems, shownSoFar);

  const sections = [
    nowSection,
    needsSection,
    upcomingSection,
    discussionsSection,
    forYouSection,
  ];

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

  return {
    sections,
    totalItems,
    generatedAt: new Date().toISOString(),
    hasContent: totalItems > 0,
  };
}
