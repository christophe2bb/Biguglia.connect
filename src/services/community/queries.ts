/**
 * services/community/queries.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Requêtes serveur pour la dynamique communautaire.
 * Appelées exclusivement depuis des Server Components ou des Route Handlers.
 *
 * Fonctions :
 *   fetchCommunityStats        — compteurs globaux du site (résumé vivant)
 *   fetchTopArtisans           — artisans les mieux notés (top 4)
 *   fetchRecentHelpers         — derniers coups de main résolus avec auteur
 *   fetchActiveMembersSpotlight — profils actifs récents à mettre en avant
 *   fetchRecentEvents          — prochains événements communautaires
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── Types publics ────────────────────────────────────────────────────────────

export interface CommunityStats {
  totalMembers:   number;
  totalHelps:     number;
  totalEvents:    number;
  totalListings:  number;
  totalForumTopics: number;
  activeThisWeek: number;
}

export interface SpotlightArtisan {
  id:           string;
  full_name:    string;
  avatar_url:   string | null;
  business_name: string | null;
  trade_name:   string | null;
  avg_rating:   number;
  review_count: number;
  trust_score:  number;
  badges:       string[];
}

export interface SpotlightHelper {
  id:        string;
  title:     string;
  solved_at: string;
  author: {
    id:        string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface SpotlightMember {
  id:          string;
  full_name:   string;
  avatar_url:  string | null;
  role:        string;
  created_at:  string;
  trust_score: number | null;
  badge_codes: string[];
}

export interface SpotlightEvent {
  id:         string;
  title:      string;
  event_date: string;
  location:   string | null;
  status:     string;
  participant_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

// ─── fetchCommunityStats ─────────────────────────────────────────────────────

// ─── fetchCommunityStats — cachée 120s ───────────────────────────────────────
// 6 requêtes COUNT(*) sur des tables entières : résultat identique pour tous
// les visiteurs. Cache 120s sur Vercel (régénération en arrière-plan).
async function _fetchCommunityStats(): Promise<CommunityStats> {
  const supabase = await createClient();
  const since1Week = daysAgo(7);

  const [
    { count: members },
    { count: helps },
    { count: events },
    { count: listings },
    { count: topics },
    { count: recentActivity },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .in('role', ['resident', 'artisan_verified', 'moderator', 'admin']),
    supabase.from('help_requests').select('*', { count: 'exact', head: true })
      .eq('status', 'resolved'),
    supabase.from('events').select('*', { count: 'exact', head: true })
      .not('status', 'in', '("draft","annule","cancelled")'),
    supabase.from('listings').select('*', { count: 'exact', head: true })
      .in('status', ['active', 'published', 'approved']),
    supabase.from('forum_topics').select('*', { count: 'exact', head: true })
      .not('status', 'in', '("archive","masque")'),
    // Activité récente : publications des 7 derniers jours
    supabase.from('forum_topics').select('*', { count: 'exact', head: true })
      .gte('created_at', since1Week),
  ]);

  return {
    totalMembers:    members    ?? 0,
    totalHelps:      helps      ?? 0,
    totalEvents:     events     ?? 0,
    totalListings:   listings   ?? 0,
    totalForumTopics: topics    ?? 0,
    activeThisWeek:  recentActivity ?? 0,
  };
}

export const fetchCommunityStats = unstable_cache(
  _fetchCommunityStats,
  ['community-stats'],
  { revalidate: 120, tags: ['community-stats'] },
);

// ─── fetchTopArtisans ─────────────────────────────────────────────────────────

// ─── fetchTopArtisans — cachée 300s ─────────────────────────────────────────
// La liste des artisans vedettes change rarement. Cache 5min.
async function _fetchTopArtisans(limit = 4): Promise<SpotlightArtisan[]> {
  const supabase = await createClient();

  // Artisans vérifiés avec leur score de confiance
  const { data: artisans } = await supabase
    .from('artisan_profiles')
    .select(`
      id,
      business_name,
      profile:profiles!artisan_profiles_user_id_fkey(
        id, full_name, avatar_url, created_at, role
      ),
      trade_category:trade_categories(name),
      reviews:reviews(rating)
    `)
    .eq('is_verified', true)
    .eq('is_featured', true)
    .limit(limit * 2);

  if (!artisans || artisans.length === 0) {
    // Fallback sans is_featured filter
    const { data: fallback } = await supabase
      .from('artisan_profiles')
      .select(`
        id,
        business_name,
        profile:profiles!artisan_profiles_user_id_fkey(
          id, full_name, avatar_url, created_at, role
        ),
        trade_category:trade_categories(name)
      `)
      .eq('is_verified', true)
      .limit(limit);

    if (!fallback) return [];
    return (fallback as unknown as Array<{
      id: string;
      business_name: string | null;
      profile: { id: string; full_name: string; avatar_url: string | null; created_at: string; role: string } | null;
      trade_category: { name: string } | null;
    }>).map(a => ({
      id:            a.profile?.id ?? a.id,
      full_name:     a.profile?.full_name ?? 'Artisan',
      avatar_url:    a.profile?.avatar_url ?? null,
      business_name: a.business_name,
      trade_name:    a.trade_category?.name ?? null,
      avg_rating:    0,
      review_count:  0,
      trust_score:   0,
      badges:        ['admin_validated'],
    }));
  }

  type RawArtisan = {
    id: string;
    business_name: string | null;
    profile: { id: string; full_name: string; avatar_url: string | null; created_at: string; role: string } | null;
    trade_category: { name: string } | null;
    reviews?: Array<{ rating: number }>;
  };

  return (artisans as unknown as RawArtisan[])
    .map(a => {
      const ratings = (a.reviews ?? []).map(r => r.rating).filter(r => r > 0);
      const avg = ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
        : 0;
      return {
        id:            a.profile?.id ?? a.id,
        full_name:     a.profile?.full_name ?? 'Artisan',
        avatar_url:    a.profile?.avatar_url ?? null,
        business_name: a.business_name,
        trade_name:    a.trade_category?.name ?? null,
        avg_rating:    avg,
        review_count:  ratings.length,
        trust_score:   0,
        badges:        ['admin_validated', ...(avg >= 4.5 ? ['top_rated'] : [])],
      };
    })
    .sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count)
    .slice(0, limit);
}

export const fetchTopArtisans = unstable_cache(
  (limit = 4) => _fetchTopArtisans(limit),
  ['community-top-artisans'],
  { revalidate: 300, tags: ['community-artisans'] },
);

// ─── fetchRecentHelpers ───────────────────────────────────────────────────────

// cachée 60s — les coups de main récents changent parfois
async function _fetchRecentHelpers(limit = 5): Promise<SpotlightHelper[]> {
  const supabase = await createClient();
  const since30 = daysAgo(30);

  const { data } = await supabase
    .from('help_requests')
    .select('id, title, updated_at, author:profiles!help_requests_author_id_fkey(id, full_name, avatar_url)')
    .eq('status', 'resolved')
    .gte('updated_at', since30)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  return (data as unknown as Array<{
    id: string;
    title: string;
    updated_at: string;
    author: { id: string; full_name: string; avatar_url: string | null } | null;
  }>).map(h => ({
    id:        h.id,
    title:     h.title,
    solved_at: h.updated_at,
    author:    h.author,
  }));
}

export const fetchRecentHelpers = unstable_cache(
  (limit = 5) => _fetchRecentHelpers(limit),
  ['community-recent-helpers'],
  { revalidate: 60, tags: ['community-helpers'] },
);

// ─── fetchActiveMembersSpotlight ─────────────────────────────────────────────

// cachée 120s
async function _fetchActiveMembersSpotlight(limit = 6): Promise<SpotlightMember[]> {
  const supabase = await createClient();

  // Membres récents actifs avec trust_profile_stats
  const { data } = await supabase
    .from('profiles')
    .select(`
      id, full_name, avatar_url, role, created_at,
      trust_stats:trust_profile_stats(trust_score)
    `)
    .in('role', ['artisan_verified', 'resident', 'moderator'])
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (!data) return [];

  type RawMember = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    created_at: string;
    trust_stats?: { trust_score: number } | null;
  };

  return (data as unknown as RawMember[])
    .map(m => ({
      id:          m.id,
      full_name:   m.full_name,
      avatar_url:  m.avatar_url,
      role:        m.role,
      created_at:  m.created_at,
      trust_score: m.trust_stats?.trust_score ?? null,
      badge_codes: m.role === 'artisan_verified' ? ['admin_validated'] : [],
    }))
    .filter(m => m.full_name)
    .slice(0, limit);
}

export const fetchActiveMembersSpotlight = unstable_cache(
  (limit = 6) => _fetchActiveMembersSpotlight(limit),
  ['community-members-spotlight'],
  { revalidate: 120, tags: ['community-members'] },
);

// ─── fetchRecentEvents ────────────────────────────────────────────────────────

async function _fetchRecentEvents(limit = 3): Promise<SpotlightEvent[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in3Weeks = daysFromNow(21).slice(0, 10);

  const { data } = await supabase
    .from('events')
    .select('id, title, event_date, location, status')
    .gte('event_date', today)
    .lte('event_date', in3Weeks)
    .not('status', 'in', '("draft","annule","cancelled")')
    .order('event_date', { ascending: true })
    .limit(limit);

  if (!data) return [];

  return (data as unknown as SpotlightEvent[]).map(e => ({
    ...e,
    participant_count: 0,
  }));
}

export const fetchRecentEvents = unstable_cache(
  (limit = 3) => _fetchRecentEvents(limit),
  ['community-recent-events'],
  { revalidate: 60, tags: ['community-events'] },
);
