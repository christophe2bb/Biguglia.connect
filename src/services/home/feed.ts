// ─────────────────────────────────────────────────────────────────────────────
// Maison vivante — Service d'agrégation du feed local
// Point d'entrée unique pour toutes les sources de contenu.
// Appelé exclusivement côté serveur (SSR) — aucune logique UI ici.
// ─────────────────────────────────────────────────────────────────────────────

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { HomeFeedItem, HomeFeedResult, HomeSection } from './types';
import {
  helpRequestsToFeedItems,
  eventsToFeedItems,
  forumTopicsToFeedItems,
  lostFoundToFeedItems,
  listingsToFeedItems,
  outingsToFeedItems,
  jobOffersToFeedItems,
  jobDemandsToFeedItems,
  type RawHelpRequest,
  type RawEvent,
  type RawForumTopic,
  type RawLostFound,
  type RawListing,
  type RawOuting,
  type RawJobOffer,
  type RawJobDemand,
} from './mappers';
import { rankAndFilter, scoreItems, sortByScore, type UserFeedWeights } from './scoring';

// ─── Contexte utilisateur passé au feed ──────────────────────────────────────

export interface UserFeedContext {
  /** Poids de personnalisation par type d'item (de user-interests.ts) */
  feedWeights?: UserFeedWeights;
  /** Secteur de résidence de l'utilisateur (pour filtrage géo futur) */
  homeSectorId?: string | null;
  /** Profil utilisateur principal (pour la section forYou) */
  primaryInterest?: string;
}

// ─── Configuration des sections ───────────────────────────────────────────────

const SECTION_LIMITS = {
  now: 6,
  needs: 4,
  upcoming: 4,
  discussions: 4,
  emploi: 4,     // offres + demandes emploi dans le feed
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
): Promise<RawHelpRequest[]> {
  const since = new Date(Date.now() - 90 * 86400000).toISOString(); // 90 jours
  let q = supabase
    .from('help_requests')
    .select('id, title, description, status, urgency, sector_id, created_at, updated_at, author:profiles(id, full_name, avatar_url)')
    .neq('status', 'draft')
    .neq('status', 'resolved')
    .neq('status', 'archived')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  if (currentUserId) q = q.neq('author_id', currentUserId);
  const { data } = await q;
  return (data ?? []) as unknown as RawHelpRequest[];
}

async function fetchEvents(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
): Promise<RawEvent[]> {
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
  return (data ?? []) as unknown as RawEvent[];
}

async function fetchForumTopics(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
): Promise<RawForumTopic[]> {
  const since = new Date(Date.now() - 90 * 86400000).toISOString(); // 90 jours
  let q = supabase
    .from('forum_topics')
    .select('id, title, content, status, sector_id, created_at, updated_at, reply_count, author:profiles(id, full_name, avatar_url)')
    .neq('status', 'masque')
    .neq('status', 'archive')
    .neq('status', 'verrouille')
    .gte('created_at', since)
    .order('updated_at', { ascending: false })
    .limit(15);
  if (currentUserId) q = q.neq('author_id', currentUserId);
  const { data } = await q;
  return (data ?? []) as unknown as RawForumTopic[];
}

async function fetchLostFound(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
): Promise<RawLostFound[]> {
  const since = new Date(Date.now() - 60 * 86400000).toISOString();

  // Tentative 1 : avec FK explicite
  let q = supabase
    .from('lost_found_items')
    .select('id, title, description, status, type, location_area, created_at, updated_at, author:profiles!lost_found_items_author_id_fkey(id, full_name, avatar_url)')
    // Exclure statuts résolus (anglais ET français)
    .neq('status', 'resolved')
    .neq('status', 'found')
    .neq('status', 'returned')
    .neq('status', 'restitue')
    .neq('status', 'clos')
    .neq('status', 'archive')
    .neq('status', 'draft')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);
  if (currentUserId) q = q.neq('author_id', currentUserId);

  let { data, error } = await q;

  // Tentative 2 : sans FK explicite si la FK a un autre nom
  if (error?.message?.includes('fkey') || error?.message?.includes('foreign')) {
    let q2 = supabase
      .from('lost_found_items')
      .select('id, title, description, status, type, location_area, created_at, updated_at, author:profiles(id, full_name, avatar_url)')
      .neq('status', 'resolved')
      .neq('status', 'found')
      .neq('status', 'returned')
      .neq('status', 'restitue')
      .neq('status', 'clos')
      .neq('status', 'archive')
      .neq('status', 'draft')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    if (currentUserId) q2 = q2.neq('author_id', currentUserId);
    ({ data, error } = await q2);
  }

  // Tentative 3 : sans jointure profiles (données minimales, pas de profil auteur)
  if (error) {
    let q3 = supabase
      .from('lost_found_items')
      .select('id, title, description, status, type, location_area, created_at, updated_at')
      .neq('status', 'resolved')
      .neq('status', 'found')
      .neq('status', 'returned')
      .neq('status', 'restitue')
      .neq('status', 'clos')
      .neq('status', 'archive')
      .neq('status', 'draft')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    if (currentUserId) q3 = q3.neq('author_id', currentUserId);
    // Sans jointure profiles : author sera undefined — conforme à RawLostFound (champ optionnel)
    const { data: d3 } = await q3;
    return (d3 ?? []) as unknown as RawLostFound[];
  }

  return (data ?? []) as unknown as RawLostFound[];
}

async function fetchListings(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
): Promise<RawListing[]> {
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
  return (data ?? []) as unknown as RawListing[];
}

async function fetchJobOffers(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
): Promise<RawJobOffer[]> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString(); // 30 jours
  let q = supabase
    .from('job_offers')
    .select('id, slug, title, short_description, full_description, employer_name, job_category, contract_type, location_city, sector_id, salary_range_min, salary_range_max, salary_period, salary_type, is_urgent, provides_housing, experience_level, published_at, created_at, updated_at')
    .eq('status', 'published')
    .gte('created_at', since)
    .order('published_at', { ascending: false })
    .limit(6);
  if (currentUserId) q = q.neq('user_id', currentUserId);
  const { data, error } = await q;
  if (error) {
    // Table peut ne pas encore avoir toutes les colonnes — fallback colonnes minimales
    const { data: d2 } = await supabase
      .from('job_offers')
      .select('id, slug, title, short_description, employer_name, location_city, is_urgent, published_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6);
    // Colonnes optionnelles absentes → conformes à RawJobOffer (tous les champs extra sont optionnels)
    return (d2 ?? []) as unknown as RawJobOffer[];
  }
  return (data ?? []) as unknown as RawJobOffer[];
}

async function fetchJobDemands(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
): Promise<RawJobDemand[]> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  let q = supabase
    .from('job_demands')
    .select('id, slug, title, short_description, profile_description, job_category, desired_contract_types, location_city, sector_id, availability_type, experience_level, salary_expectation_min, salary_expectation_max, is_urgent, has_driving_license, has_vehicle, published_at, created_at, updated_at')
    .eq('status', 'active')
    .gte('created_at', since)
    .order('published_at', { ascending: false })
    .limit(4);
  if (currentUserId) q = q.neq('user_id', currentUserId);
  const { data, error } = await q;
  if (error) {
    // Fallback colonnes minimales
    const { data: d2 } = await supabase
      .from('job_demands')
      .select('id, slug, title, short_description, location_city, is_urgent, published_at, created_at')
      .eq('status', 'active')
      .order('published_at', { ascending: false })
      .limit(4);
    return (d2 ?? []) as unknown as RawJobDemand[];
  }
  return (data ?? []) as unknown as RawJobDemand[];
}

async function fetchOutings(
  supabase: ReturnType<typeof createClient>,
  currentUserId: string | null,
): Promise<RawOuting[]> {
  const today = todayStr();
  const in2Weeks = daysFromNow(14);
  let q = supabase
    .from('group_outings')
    .select('id, title, description, status, outing_date, meeting_point, max_participants, created_at, updated_at, organizer:profiles(id, full_name, avatar_url)')
    .gte('outing_date', today)
    .lte('outing_date', in2Weeks)
    .neq('status', 'annulee')
    .neq('status', 'cancelled')
    .neq('status', 'archivee')
    .neq('status', 'passe')
    .neq('status', 'archive')
    .order('outing_date', { ascending: true })
    .limit(8);
  if (currentUserId) q = q.neq('organizer_id', currentUserId);
  const { data } = await q;
  return (data ?? []) as unknown as RawOuting[];
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

function buildNowSection(allItems: HomeFeedItem[], userWeights: UserFeedWeights = {}): HomeSection {
  const eligible = allItems.filter(i =>
    ['help_request', 'lost_found', 'listing', 'forum_topic'].includes(i.type) && !i.isResolved
  );
  const items = rankAndFilter(eligible, { limit: SECTION_LIMITS.now, maxPerType: 2, userWeights });
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

function buildNeedsSection(allItems: HomeFeedItem[], userWeights: UserFeedWeights = {}): HomeSection {
  const eligible = allItems.filter(i => i.type === 'help_request' && !i.isResolved);
  const items = rankAndFilter(eligible, { limit: SECTION_LIMITS.needs, maxPerType: 4, excludeResolved: true, userWeights });
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

function buildDiscussionsSection(allItems: HomeFeedItem[], userWeights: UserFeedWeights = {}): HomeSection {
  const eligible = allItems.filter(i => i.type === 'forum_topic');
  const scored = scoreItems(eligible, userWeights);
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
function buildEmploiSection(allItems: HomeFeedItem[]): HomeSection {
  const eligible = allItems.filter(i => ['job_offer', 'job_demand'].includes(i.type));
  // Offres en premier, puis demandes
  const offers  = eligible.filter(i => i.type === 'job_offer').slice(0, 3);
  const demands = eligible.filter(i => i.type === 'job_demand').slice(0, 2);
  const items = [...offers, ...demands].slice(0, SECTION_LIMITS.emploi);
  return {
    id: 'emploi',
    title: '💼 Emploi local',
    subtitle: 'Offres et demandes d\'emploi à Biguglia et alentours',
    icon: '💼',
    items,
    ctaLabel: 'Voir toutes les offres',
    ctaUrl: '/emploi/offres',
    isEmpty: items.length === 0,
  };
}

function buildForYouSection(
  allItems: HomeFeedItem[],
  alreadyShown: Set<string>,
  userWeights: UserFeedWeights = {},
  primaryInterest?: string,
): HomeSection {
  const fresh = allItems.filter(i => !alreadyShown.has(i.id));
  // Pour la section "Pour vous", on amplifie encore les poids personnalisés
  const amplifiedWeights: UserFeedWeights = {};
  for (const [k, v] of Object.entries(userWeights)) {
    amplifiedWeights[k as keyof UserFeedWeights] = (v ?? 1) * 1.2;
  }
  const items = rankAndFilter(fresh, { limit: SECTION_LIMITS.foryou, maxPerType: 2, userWeights: amplifiedWeights });

  // Titre et sous-titre contextuels selon le profil d'intérêt
  const contextual: Record<string, { title: string; subtitle: string; icon: string }> = {
    artisanat: {
      title: 'Pour vous · Artisan',
      subtitle: 'Missions, matériaux et opportunités pro',
      icon: '🔧',
    },
    emploi: {
      title: 'Pour vous · Emploi',
      subtitle: 'Offres et opportunités locales sélectionnées',
      icon: '💼',
    },
    communaute: {
      title: 'Pour vous · Communauté',
      subtitle: 'Ce qui se passe près de chez vous',
      icon: '🏡',
    },
    entraide: {
      title: 'Pour vous · Entraide',
      subtitle: 'Voisins qui ont besoin d\'aide',
      icon: '🤝',
    },
    annonces: {
      title: 'Pour vous · Annonces',
      subtitle: 'Bonnes affaires locales',
      icon: '📦',
    },
    promenades: {
      title: 'Pour vous · Sorties',
      subtitle: 'Promenades et événements nature',
      icon: '🌿',
    },
  };

  const ctx = primaryInterest ? contextual[primaryInterest] : null;
  return {
    id: 'foryou',
    title: ctx?.title ?? 'Pour vous',
    subtitle: ctx?.subtitle ?? 'Sélection personnalisée de l\'activité locale',
    icon: ctx?.icon ?? '✨',
    items,
    ctaLabel: 'Explorer tout',
    ctaUrl: '/recherche',
    isEmpty: items.length === 0,
  };
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

// ─── Version interne (non cachée) ────────────────────────────────────────────
// getHomeFeed est appelée avec currentUserId : on ne cache que le feed anonyme
// (currentUserId=null) car le feed personnalisé varie par utilisateur.
async function _getHomeFeed(
  currentUserId: string | null = null,
  userContext: UserFeedContext = {},
): Promise<HomeFeedResult> {
  const { feedWeights = {}, primaryInterest } = userContext;
  const supabase = createClient();

  // Fetch en parallèle — tolérant aux pannes
  const [helpRaw, eventsRaw, forumRaw, lostFoundRaw, listingsRaw, outingsRaw, offersRaw, demandsRaw] =
    await Promise.allSettled([
      fetchHelpRequests(supabase, currentUserId),
      fetchEvents(supabase, currentUserId),
      fetchForumTopics(supabase, currentUserId),
      fetchLostFound(supabase, currentUserId),
      fetchListings(supabase, currentUserId),
      fetchOutings(supabase, currentUserId),
      fetchJobOffers(supabase, currentUserId),
      fetchJobDemands(supabase, currentUserId),
    ]);

  // Extrait le tableau résultat ou [] en cas d'échec
  function get<T>(r: PromiseSettledResult<T[]>): T[] {
    return r.status === 'fulfilled' ? r.value : [];
  }

  const allItems: HomeFeedItem[] = [
    ...helpRequestsToFeedItems(get(helpRaw)),
    ...eventsToFeedItems(get(eventsRaw)),
    ...forumTopicsToFeedItems(get(forumRaw)),
    ...lostFoundToFeedItems(get(lostFoundRaw)),
    ...listingsToFeedItems(get(listingsRaw)),
    ...outingsToFeedItems(get(outingsRaw)),
    ...jobOffersToFeedItems(get(offersRaw)),
    ...jobDemandsToFeedItems(get(demandsRaw)),
  ];

  // Construire les sections dans l'ordre — "Pour vous" utilise les IDs déjà affichés
  // Les poids utilisateur sont propagés à toutes les sections qui scorent
  const nowSection          = buildNowSection(allItems, feedWeights);
  const needsSection        = buildNeedsSection(allItems, feedWeights);
  const upcomingSection     = buildUpcomingSection(allItems);
  const discussionsSection  = buildDiscussionsSection(allItems, feedWeights);
  const emploiSection       = buildEmploiSection(allItems);
  const shownSoFar          = usedIds([nowSection, needsSection, upcomingSection, discussionsSection, emploiSection]);
  const forYouSection       = buildForYouSection(allItems, shownSoFar, feedWeights, primaryInterest);

  const sections = [
    nowSection,
    needsSection,
    upcomingSection,
    discussionsSection,
    emploiSection,
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

// ─── Cache ISR : feed anonyme mis en cache 60s ────────────────────────────────
// • Les visiteurs non connectés partagent le même résultat pendant 60s.
// • Les utilisateurs connectés (currentUserId != null) sautent le cache
//   pour recevoir un feed filtré (leurs propres contenus exclus).
// • revalidate: 60 → Vercel régénère en arrière-plan toutes les 60s.
const _getCachedHomeFeed = unstable_cache(
  () => _getHomeFeed(null, {}),
  ['home-feed-anon'],
  { revalidate: 60, tags: ['home-feed'] },
);

export async function getHomeFeed(
  currentUserId: string | null = null,
  userContext: UserFeedContext = {},
): Promise<HomeFeedResult> {
  // Feed personnalisé → pas de cache partagé
  if (currentUserId) return _getHomeFeed(currentUserId, userContext);
  // Feed anonyme → cache 60s
  return _getCachedHomeFeed();
}
