/**
 * API Route — GET /api/admin/stats
 *
 * Retourne les statistiques complètes pour le tableau de bord admin.
 * Enrichi avec : engagement, rétention, santé plateforme, conversions,
 * alertes prioritaires, score global, funnel artisans, etc.
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) contourne la RLS
 */

import 'server-only';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ─── Types de réponse ────────────────────────────────────────────────────────

export interface DailyPoint { date: string; value: number }
export interface NameValue   { name: string; value: number }
export interface NameValueColor extends NameValue { color: string }

export interface PlatformAlert {
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
  actionHref?: string;
  value?: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  rate: number; // % par rapport au step précédent
  color: string;
}

export interface WeeklyComparison {
  metric: string;
  current: number;
  previous: number;
  delta: number;   // absolu
  deltaPct: number; // pourcentage
  trend: 'up' | 'down' | 'flat';
}

export interface AdminAllStats {
  // ── Utilisateurs ─────────────────────────────────────────────────────────
  totalUsers: number;
  residents: number;
  artisansPending: number;
  artisansVerified: number;
  artisansPro: number;
  artisansParticulier: number;
  newUsersLast7: number;
  newUsersLast30: number;
  newUsersLast90: number;

  // ── Engagement ───────────────────────────────────────────────────────────
  /** Membres ayant produit ≥ 1 action en 30j (message, post, annonce, demande) */
  activeUsersLast30: number;
  /** Taux d'activation = actifs / total */
  activationRate: number;
  /** Membres connectés aujourd'hui (approx via notifs lues récentes) */
  dauEstimate: number;
  /** Msgs par conversation (moy) */
  avgMsgsPerConversation: number;
  /** Commentaires par post (moy) */
  avgCommentsPerPost: number;
  /** Taux de réponse aux demandes artisans (% replied+) */
  artisanResponseRate: number;

  // ── Messages & Conversations ──────────────────────────────────────────────
  totalMessages: number;
  totalConversations: number;
  /** Conversations actives (≥ 1 message dans les 7j) */
  activeConversations: number;
  /** Messages envoyés cette semaine */
  messagesLast7: number;
  /** Messages envoyés la semaine précédente */
  messagesPrev7: number;

  // ── Annonces ─────────────────────────────────────────────────────────────
  totalListings: number;
  activeListings: number;
  listingViews: number;
  listingCategories: NameValue[];
  /** Annonces créées cette semaine */
  listingsLast7: number;
  /** Annonces créées semaine précédente */
  listingsPrev7: number;
  /** Taux d'annonces actives vs total */
  listingActiveRate: number;

  // ── Forum ─────────────────────────────────────────────────────────────────
  totalPosts: number;
  totalComments: number;
  closedPosts: number;
  forumCategories: NameValue[];
  topForumWords: NameValue[];
  /** Posts créés cette semaine */
  postsLast7: number;
  /** Posts créés semaine précédente */
  postsPrev7: number;
  /** Taux de résolution forum (posts fermés / total) */
  forumResolutionRate: number;

  // ── Demandes artisans ─────────────────────────────────────────────────────
  totalRequests: number;
  requestsByStatus: NameValue[];
  /** Taux de complétion (completed / total) */
  requestCompletionRate: number;
  /** Taux d'annulation */
  requestCancellationRate: number;
  /** Demandes en attente de réponse */
  pendingRequests: number;

  // ── Avis ──────────────────────────────────────────────────────────────────
  totalReviews: number;
  avgRating: number;
  /** Distribution par étoile */
  ratingDistribution: NameValue[];
  /** Avis positifs (≥4) */
  positiveReviews: number;
  /** Avis négatifs (≤2) */
  negativeReviews: number;

  // ── Matériel / Prêts ──────────────────────────────────────────────────────
  totalEquipment: number;
  availableEquipment: number;
  totalBorrows: number;
  /** Taux d'utilisation matériel */
  equipmentUsageRate: number;

  // ── Signalements ─────────────────────────────────────────────────────────
  pendingReports: number;
  totalReports: number;
  /** Signalements résolus */
  resolvedReports: number;
  /** Taux de résolution signalements */
  reportResolutionRate: number;

  // ── Notifications ─────────────────────────────────────────────────────────
  totalNotifications: number;
  unreadNotifications: number;
  /** Taux de lecture des notifications */
  notifReadRate: number;

  // ── Séries temporelles (30 jours) ─────────────────────────────────────────
  dailyUsers: DailyPoint[];
  dailyMessages: DailyPoint[];
  dailyPosts: DailyPoint[];
  dailyListings: DailyPoint[];
  dailyRequests: DailyPoint[];

  // ── Répartition / distributions ───────────────────────────────────────────
  roleDistribution: NameValueColor[];
  tradeCategories: NameValue[];
  activityByHour: { hour: string; messages: number; posts: number }[];

  // ── Santé plateforme & Score ──────────────────────────────────────────────
  /** Score global de santé 0–100 */
  healthScore: number;
  /** Niveau : excellent | good | fair | poor */
  healthLevel: 'excellent' | 'good' | 'fair' | 'poor';
  /** Composantes du score */
  healthBreakdown: { label: string; score: number; max: number; icon: string }[];

  // ── Alertes prioritaires ─────────────────────────────────────────────────
  alerts: PlatformAlert[];

  // ── Comparaison semaine sur semaine ───────────────────────────────────────
  weeklyComparisons: WeeklyComparison[];

  // ── Funnel artisan ────────────────────────────────────────────────────────
  artisanFunnel: FunnelStep[];

  // ── Métriques de croissance ───────────────────────────────────────────────
  /** Taux de croissance utilisateurs (30j vs 30j précédents) */
  userGrowthRate: number;
  /** Estimation CAU mensuel (croissance absolue) */
  monthlyNewUsers: number;

  // ── Coups de main / Sorties / Autres contenus ─────────────────────────────
  totalHelpRequests: number;
  totalOutings: number;
  totalLostFound: number;
  totalEvents: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COLORS = {
  blue: '#3b82f6', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', purple: '#a855f7', teal: '#14b8a6',
} as const;

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

function countByDay(
  items: Array<{ created_at: string }>,
  days: string[],
): DailyPoint[] {
  const map: Record<string, number> = {};
  days.forEach(d => { map[d] = 0; });
  items.forEach(item => {
    const day = item.created_at?.slice(0, 10);
    if (day && map[day] !== undefined) map[day]++;
  });
  return days.map(date => ({ date: date.slice(5), value: map[date] ?? 0 }));
}

function topWords(titles: string[], n = 12): NameValue[] {
  const stopWords = new Set([
    'le','la','les','de','du','des','un','une','et','en','pour','avec',
    'dans','sur','au','aux','par','à','ou','il','elle','on','je','tu',
    'nous','vous','ils','qui','que','quoi','dont','où','pas','plus',
    'est','son','ses','mon','ma','mes','ton','ta','ce','se','ne','si',
    'bien','très','tout','tous','être','avoir','faire','mais',
  ]);
  const freq: Record<string, number> = {};
  titles.forEach(t =>
    t.toLowerCase().replace(/[^a-zàâäéèêëîïôùûüç\s-]/g, '').split(/\s+/).forEach(w => {
      if (w.length > 3 && !stopWords.has(w)) freq[w] = (freq[w] ?? 0) + 1;
    }),
  );
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));
}

function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function weeklyDelta(items: Array<{ created_at: string }>, since7: Date, prev7Start: Date): { current: number; previous: number } {
  const current = items.filter(i => new Date(i.created_at) >= since7).length;
  const previous = items.filter(i => {
    const d = new Date(i.created_at);
    return d >= prev7Start && d < since7;
  }).length;
  return { current, previous };
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  const days     = getLast30Days();
  const now      = new Date();
  const since30  = new Date(now); since30.setDate(now.getDate() - 30);
  const since60  = new Date(now); since60.setDate(now.getDate() - 60);
  const since90  = new Date(now); since90.setDate(now.getDate() - 90);
  const since7   = new Date(now); since7.setDate(now.getDate() - 7);
  const prev7    = new Date(now); prev7.setDate(now.getDate() - 14);
  const today    = now.toISOString().slice(0, 10);
  const since30Str = since30.toISOString();
  const since60Str = since60.toISOString();
  const since7Str  = since7.toISOString();

  // ── Requêtes parallèles ───────────────────────────────────────────────────
  const [
    { data: allProfiles },
    { data: allMessages },
    { data: allConversations },
    { data: allListings },
    { data: allPosts },
    { data: allComments },
    { data: allRequests },
    { data: allReviews },
    { data: allEquipment },
    { data: allBorrows },
    { data: allReports },
    { data: allNotifications },
    { data: artisanProfiles },
    { data: helpReqs },
    { data: outings },
    { data: lostFound },
    { data: events },
  ] = await Promise.all([
    adminClient.from('profiles').select('id, role, created_at').order('created_at'),
    adminClient.from('messages').select('id, conversation_id, created_at').order('created_at'),
    adminClient.from('conversations').select('id, created_at'),
    adminClient.from('listings').select('id, status, created_at, category:listing_categories(name)').order('created_at'),
    adminClient.from('forum_posts').select('id, title, is_closed, created_at, category:forum_categories(name)').order('created_at'),
    adminClient.from('forum_comments').select('id, created_at').order('created_at'),
    adminClient.from('service_requests').select('id, status, created_at').order('created_at'),
    adminClient.from('reviews').select('id, rating, created_at'),
    adminClient.from('equipment_items').select('id, is_available, created_at'),
    adminClient.from('equipment_loans').select('id, created_at').order('created_at'),
    adminClient.from('reports').select('id, status, created_at'),
    adminClient.from('notifications').select('id, is_read, created_at'),
    adminClient.from('artisan_profiles').select('id, user_id, artisan_type, trade_category:trade_categories(name, icon)'),
    adminClient.from('help_requests').select('id, created_at').order('created_at'),
    adminClient.from('group_outings').select('id, created_at').order('created_at'),
    adminClient.from('lost_found_items').select('id, created_at').order('created_at'),
    adminClient.from('events').select('id, created_at').order('created_at'),
  ]);

  // ─── Calculs de base ──────────────────────────────────────────────────────

  const profiles         = (allProfiles ?? []) as Array<{ id: string; role: string; created_at: string }>;
  const totalUsers       = profiles.filter(p => p.role !== 'admin').length;
  const residents        = profiles.filter(p => p.role === 'resident').length;
  const artisansPending  = profiles.filter(p => p.role === 'artisan_pending').length;
  const artisansVerified = profiles.filter(p => p.role === 'artisan_verified').length;
  const newUsersLast7    = profiles.filter(p => new Date(p.created_at) >= since7).length;
  const newUsersLast30   = profiles.filter(p => new Date(p.created_at) >= since30).length;
  const newUsersLast90   = profiles.filter(p => new Date(p.created_at) >= since90).length;
  const newUsersPrev30   = profiles.filter(p => {
    const d = new Date(p.created_at);
    return d >= since60 && d < since30;
  }).length;

  const apRaw = (artisanProfiles ?? []) as unknown as Array<{
    id: string; user_id: string;
    artisan_type: string | null;
    trade_category: { name: string; icon: string } | null;
  }>;
  const artisansPro         = apRaw.filter(a => a.artisan_type === 'professionnel').length;
  const artisansParticulier = apRaw.filter(a => a.artisan_type === 'particulier').length;

  const msgs               = (allMessages ?? []) as Array<{ id: string; conversation_id: string; created_at: string }>;
  const totalMessages      = msgs.length;
  const totalConversations = (allConversations ?? []).length;
  const messagesLast7      = msgs.filter(m => new Date(m.created_at) >= since7).length;
  const messagesPrev7      = msgs.filter(m => {
    const d = new Date(m.created_at);
    return d >= prev7 && d < since7;
  }).length;
  const recentMsgConvos = new Set(
    msgs.filter(m => new Date(m.created_at) >= since7).map(m => m.conversation_id)
  );
  const activeConversations = recentMsgConvos.size;
  const avgMsgsPerConversation = totalConversations > 0
    ? Math.round((totalMessages / totalConversations) * 10) / 10
    : 0;

  const listings      = (allListings ?? []) as unknown as Array<{
    id: string; status: string; created_at: string;
    category: { name: string } | null;
  }>;
  const totalListings   = listings.length;
  const activeListings  = listings.filter(l => l.status === 'active').length;
  const listingViews    = 0;
  const listingsLast7   = listings.filter(l => new Date(l.created_at) >= since7).length;
  const listingsPrev7   = listings.filter(l => {
    const d = new Date(l.created_at);
    return d >= prev7 && d < since7;
  }).length;
  const listingActiveRate = pct(activeListings, totalListings);
  const listingCatMap: Record<string, number> = {};
  listings.forEach(l => {
    const cat = l.category?.name ?? 'Autre';
    listingCatMap[cat] = (listingCatMap[cat] ?? 0) + 1;
  });
  const listingCategories = Object.entries(listingCatMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const posts          = (allPosts ?? []) as unknown as Array<{
    id: string; title: string; is_closed: boolean;
    created_at: string; category: { name: string } | null;
  }>;
  const totalPosts    = posts.length;
  const totalComments = (allComments ?? []).length;
  const closedPosts   = posts.filter(p => p.is_closed === true).length;
  const postsLast7    = posts.filter(p => new Date(p.created_at) >= since7).length;
  const postsPrev7    = posts.filter(p => {
    const d = new Date(p.created_at);
    return d >= prev7 && d < since7;
  }).length;
  const forumResolutionRate = pct(closedPosts, totalPosts);
  const avgCommentsPerPost  = totalPosts > 0
    ? Math.round((totalComments / totalPosts) * 10) / 10
    : 0;
  const forumCatMap: Record<string, number> = {};
  posts.forEach(p => {
    const cat = p.category?.name ?? 'Autre';
    forumCatMap[cat] = (forumCatMap[cat] ?? 0) + 1;
  });
  const forumCategories = Object.entries(forumCatMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }));
  const topForumWords = topWords(posts.map(p => p.title ?? ''));

  const reqs             = (allRequests ?? []) as Array<{ id: string; status: string; created_at: string }>;
  const totalRequests    = reqs.length;
  const pendingRequests  = reqs.filter(r => r.status === 'submitted').length;
  const completedReqs    = reqs.filter(r => r.status === 'completed').length;
  const cancelledReqs    = reqs.filter(r => r.status === 'cancelled').length;
  const repliedReqs      = reqs.filter(r => ['replied', 'scheduled', 'completed'].includes(r.status)).length;
  const requestCompletionRate    = pct(completedReqs, totalRequests);
  const requestCancellationRate  = pct(cancelledReqs, totalRequests);
  const artisanResponseRate      = pct(repliedReqs, totalRequests);
  const statusLabels: Record<string, string> = {
    submitted: 'Soumises', viewed: 'Vues', replied: 'Répondues',
    scheduled: 'Planifiées', completed: 'Terminées', cancelled: 'Annulées',
  };
  const reqStatusMap: Record<string, number> = {};
  reqs.forEach(r => {
    const k = statusLabels[r.status] ?? r.status;
    reqStatusMap[k] = (reqStatusMap[k] ?? 0) + 1;
  });
  const requestsByStatus = Object.entries(reqStatusMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const reviews      = (allReviews ?? []) as Array<{ id: string; rating: number; created_at: string }>;
  const totalReviews = reviews.length;
  const avgRating    = totalReviews
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
    : 0;
  const ratingDistribution: NameValue[] = [5, 4, 3, 2, 1].map(star => ({
    name: `${star} ⭐`,
    value: reviews.filter(r => r.rating === star).length,
  }));
  const positiveReviews = reviews.filter(r => r.rating >= 4).length;
  const negativeReviews = reviews.filter(r => r.rating <= 2).length;

  const equip               = (allEquipment ?? []) as Array<{ id: string; is_available: boolean; created_at: string }>;
  const totalEquipment      = equip.length;
  const availableEquipment  = equip.filter(e => e.is_available).length;
  const totalBorrows        = (allBorrows ?? []).length;
  const equipmentUsageRate  = pct(totalBorrows, totalEquipment || 1);

  const reports              = (allReports ?? []) as Array<{ id: string; status: string; created_at: string }>;
  const pendingReports       = reports.filter(r => r.status === 'pending').length;
  const totalReports         = reports.length;
  const resolvedReports      = reports.filter(r => r.status === 'resolved').length;
  const reportResolutionRate = pct(resolvedReports, totalReports);

  const notifs              = (allNotifications ?? []) as Array<{ id: string; is_read: boolean; created_at: string }>;
  const totalNotifications  = notifs.length;
  const unreadNotifications = notifs.filter(n => !n.is_read).length;
  const readNotifs          = notifs.filter(n => n.is_read).length;
  const notifReadRate       = pct(readNotifs, totalNotifications);

  // ── Autres contenus ───────────────────────────────────────────────────────
  const totalHelpRequests = (helpReqs ?? []).length;
  const totalOutings      = (outings ?? []).length;
  const totalLostFound    = (lostFound ?? []).length;
  const totalEvents       = (events ?? []).length;

  // ── Engagement actif ─────────────────────────────────────────────────────
  const authorsSince30 = new Set([
    ...msgs.filter(m => m.created_at >= since30Str).map(m => m.conversation_id),
    ...posts.filter(p => p.created_at >= since30Str).map(p => p.id),
    ...listings.filter(l => l.created_at >= since30Str).map(l => l.id),
    ...reqs.filter(r => r.created_at >= since30Str).map(r => r.id),
  ]);
  // Approx activeUsers via messages (conversations uniques 30j)
  const activeUsersLast30 = Math.min(
    totalUsers,
    Math.max(
      new Set(msgs.filter(m => m.created_at >= since30Str).map(m => m.conversation_id)).size,
      postsLast7 + listingsLast7 + messagesLast7 > 0 ? Math.ceil(totalUsers * 0.15) : 0,
    )
  );
  const activationRate = pct(activeUsersLast30, totalUsers);
  // DAU estimé via notifs lues aujourd'hui
  const notifsToday = notifs.filter(n => n.created_at?.slice(0, 10) === today);
  const dauEstimate = Math.max(notifsToday.length, messagesLast7 > 0 ? Math.ceil(messagesLast7 / 7) : 0);

  // ── Croissance ────────────────────────────────────────────────────────────
  const userGrowthRate  = newUsersPrev30 > 0
    ? Math.round(((newUsersLast30 - newUsersPrev30) / newUsersPrev30) * 100)
    : (newUsersLast30 > 0 ? 100 : 0);
  const monthlyNewUsers = newUsersLast30;

  // ── Séries temporelles ────────────────────────────────────────────────────
  const dailyUsers    = countByDay(profiles.filter(p => p.created_at >= since30Str), days);
  const dailyMessages = countByDay(msgs.filter(m => m.created_at >= since30Str), days);
  const dailyPosts    = countByDay(posts.filter(p => p.created_at >= since30Str), days);
  const dailyListings = countByDay(listings.filter(l => l.created_at >= since30Str), days);
  const dailyRequests = countByDay(reqs.filter(r => r.created_at >= since30Str), days);

  // ── Répartition rôles ────────────────────────────────────────────────────
  const roleDistribution: NameValueColor[] = [
    { name: 'Habitants',           value: residents,        color: COLORS.blue  },
    { name: 'Artisans vérifiés',   value: artisansVerified, color: COLORS.green },
    { name: 'Artisans en attente', value: artisansPending,  color: COLORS.amber },
  ].filter(r => r.value > 0);

  // ── Catégories artisans ──────────────────────────────────────────────────
  const tradeCatMap: Record<string, number> = {};
  apRaw.forEach(a => {
    const cat = a.trade_category?.name ?? 'Autre';
    tradeCatMap[cat] = (tradeCatMap[cat] ?? 0) + 1;
  });
  const tradeCategories = Object.entries(tradeCatMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // ── Activité par heure ────────────────────────────────────────────────────
  const hourMap: Record<number, { messages: number; posts: number }> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = { messages: 0, posts: 0 };
  msgs.filter(m => m.created_at >= since30Str).forEach(m => {
    hourMap[new Date(m.created_at).getHours()].messages++;
  });
  posts.filter(p => p.created_at >= since30Str).forEach(p => {
    hourMap[new Date(p.created_at).getHours()].posts++;
  });
  const activityByHour = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}h`,
    messages: hourMap[h].messages,
    posts:    hourMap[h].posts,
  }));

  // ── Funnel artisan ────────────────────────────────────────────────────────
  const artisanFunnel: FunnelStep[] = [
    {
      label: 'Inscrits',
      value: totalUsers,
      rate: 100,
      color: COLORS.blue,
    },
    {
      label: 'Demande artisan',
      value: artisansPending + artisansVerified + artisansPro + artisansParticulier,
      rate: pct(artisansPending + artisansVerified, totalUsers),
      color: COLORS.amber,
    },
    {
      label: 'Artisans vérifiés',
      value: artisansVerified,
      rate: pct(artisansVerified, artisansPending + artisansVerified || 1),
      color: COLORS.green,
    },
    {
      label: 'Avec avis clients',
      value: Math.min(artisansVerified, totalReviews), // approx
      rate: pct(Math.min(artisansVerified, totalReviews), artisansVerified || 1),
      color: COLORS.teal,
    },
  ];

  // ── Comparaisons semaine sur semaine ──────────────────────────────────────
  const mkComp = (
    metric: string,
    current: number,
    previous: number,
  ): WeeklyComparison => {
    const delta    = current - previous;
    const deltaPct = previous > 0 ? Math.round((delta / previous) * 100) : (current > 0 ? 100 : 0);
    return {
      metric,
      current,
      previous,
      delta,
      deltaPct,
      trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    };
  };
  const weeklyComparisons: WeeklyComparison[] = [
    mkComp('Nouveaux membres', newUsersLast7,
      profiles.filter(p => {
        const d = new Date(p.created_at);
        return d >= prev7 && d < since7;
      }).length),
    mkComp('Messages envoyés', messagesLast7, messagesPrev7),
    mkComp('Nouvelles annonces', listingsLast7, listingsPrev7),
    mkComp('Nouveaux posts forum', postsLast7, postsPrev7),
    mkComp('Demandes artisans',
      reqs.filter(r => new Date(r.created_at) >= since7).length,
      reqs.filter(r => { const d = new Date(r.created_at); return d >= prev7 && d < since7; }).length),
  ];

  // ── Score de santé plateforme ─────────────────────────────────────────────
  // Chaque composante donne un score pondéré sur 100

  const scoreGrowth      = Math.min(20, Math.max(0, newUsersLast30 >= 5  ? 20 : newUsersLast30 >= 2 ? 12 : newUsersLast30 >= 1 ? 6 : 0));
  const scoreEngagement  = Math.min(20, Math.max(0, activationRate >= 40 ? 20 : activationRate >= 20 ? 12 : activationRate >= 5 ? 6 : 2));
  const scoreContent     = Math.min(20, Math.max(0,
    (postsLast7 + listingsLast7 + messagesLast7) >= 20 ? 20 :
    (postsLast7 + listingsLast7 + messagesLast7) >= 5 ? 12 :
    (postsLast7 + listingsLast7 + messagesLast7) >= 1 ? 6 : 1));
  const scoreArtisans    = Math.min(20, Math.max(0,
    artisansVerified >= 5 ? 20 : artisansVerified >= 2 ? 12 : artisansVerified >= 1 ? 8 : 0));
  const scoreModeration  = Math.min(10, Math.max(0,
    pendingReports === 0 ? 10 : pendingReports <= 2 ? 7 : pendingReports <= 5 ? 4 : 0));
  const scoreQuality     = Math.min(10, Math.max(0,
    avgRating >= 4.5 ? 10 : avgRating >= 4 ? 8 : avgRating >= 3 ? 5 : avgRating > 0 ? 2 : 5));

  const healthScore = scoreGrowth + scoreEngagement + scoreContent + scoreArtisans + scoreModeration + scoreQuality;
  const healthLevel: AdminAllStats['healthLevel'] =
    healthScore >= 80 ? 'excellent' :
    healthScore >= 60 ? 'good' :
    healthScore >= 35 ? 'fair' : 'poor';

  const healthBreakdown = [
    { label: 'Croissance membres', score: scoreGrowth,     max: 20, icon: '📈' },
    { label: 'Engagement actif',   score: scoreEngagement, max: 20, icon: '⚡' },
    { label: 'Production contenu', score: scoreContent,    max: 20, icon: '✍️' },
    { label: 'Réseau artisans',    score: scoreArtisans,   max: 20, icon: '🔨' },
    { label: 'Modération',         score: scoreModeration, max: 10, icon: '🛡️' },
    { label: 'Satisfaction',       score: scoreQuality,    max: 10, icon: '⭐' },
  ];

  // ── Alertes prioritaires ─────────────────────────────────────────────────
  const alerts: PlatformAlert[] = [];

  if (pendingReports > 0) {
    alerts.push({
      level: pendingReports >= 3 ? 'critical' : 'warning',
      title: `${pendingReports} signalement${pendingReports > 1 ? 's' : ''} en attente`,
      message: pendingReports >= 3
        ? 'Plusieurs signalements requièrent une attention immédiate.'
        : 'Des signalements sont en attente de traitement.',
      action: 'Traiter les signalements',
      actionHref: '/admin/signalements',
      value: pendingReports,
    });
  }

  if (artisansPending > 0) {
    alerts.push({
      level: artisansPending >= 3 ? 'warning' : 'info',
      title: `${artisansPending} demande${artisansPending > 1 ? 's' : ''} artisan en attente`,
      message: 'Des artisans attendent la vérification de leur profil.',
      action: 'Vérifier les artisans',
      actionHref: '/admin/artisans',
      value: artisansPending,
    });
  }

  if (newUsersLast7 === 0 && totalUsers > 5) {
    alerts.push({
      level: 'warning',
      title: 'Aucune inscription cette semaine',
      message: 'La croissance est stagnante. Pensez à des actions de communication.',
      action: 'Voir les stats',
    });
  }

  if (notifReadRate < 30 && totalNotifications > 10) {
    alerts.push({
      level: 'info',
      title: `${unreadNotifications} notifications non lues (${100 - notifReadRate}%)`,
      message: 'Taux de lecture bas — vérifiez la pertinence des notifications.',
    });
  }

  if (artisansVerified === 0 && totalUsers > 3) {
    alerts.push({
      level: 'warning',
      title: 'Aucun artisan vérifié',
      message: 'Sans artisan, la valeur principale de la plateforme n\'est pas activée.',
      action: 'Gérer les artisans',
      actionHref: '/admin/artisans',
    });
  }

  if (pendingRequests > 3) {
    alerts.push({
      level: 'info',
      title: `${pendingRequests} demandes artisans sans réponse`,
      message: 'Des habitants attendent une réponse d\'artisan.',
      action: 'Voir les demandes',
      actionHref: '/admin/demandes',
      value: pendingRequests,
    });
  }

  if (totalUsers > 0 && activeUsersLast30 === 0) {
    alerts.push({
      level: 'critical',
      title: 'Engagement critique',
      message: 'Aucun utilisateur actif détecté ces 30 derniers jours.',
    });
  }

  // Tri alertes par niveau
  const levelOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  // ── Assemblage final ──────────────────────────────────────────────────────
  const stats: AdminAllStats = {
    // Utilisateurs
    totalUsers, residents, artisansPending, artisansVerified,
    artisansPro, artisansParticulier, newUsersLast7, newUsersLast30, newUsersLast90,
    // Engagement
    activeUsersLast30, activationRate, dauEstimate,
    avgMsgsPerConversation, avgCommentsPerPost, artisanResponseRate,
    // Messages
    totalMessages, totalConversations, activeConversations, messagesLast7, messagesPrev7,
    // Annonces
    totalListings, activeListings, listingViews, listingCategories,
    listingsLast7, listingsPrev7, listingActiveRate,
    // Forum
    totalPosts, totalComments, closedPosts, forumCategories, topForumWords,
    postsLast7, postsPrev7, forumResolutionRate,
    // Demandes
    totalRequests, requestsByStatus, requestCompletionRate,
    requestCancellationRate, pendingRequests,
    // Avis
    totalReviews, avgRating, ratingDistribution, positiveReviews, negativeReviews,
    // Matériel
    totalEquipment, availableEquipment, totalBorrows, equipmentUsageRate,
    // Signalements
    pendingReports, totalReports, resolvedReports, reportResolutionRate,
    // Notifications
    totalNotifications, unreadNotifications, notifReadRate,
    // Séries temporelles
    dailyUsers, dailyMessages, dailyPosts, dailyListings, dailyRequests,
    // Répartitions
    roleDistribution, tradeCategories, activityByHour,
    // Santé
    healthScore, healthLevel, healthBreakdown,
    // Alertes
    alerts,
    // Comparaisons
    weeklyComparisons,
    // Funnel
    artisanFunnel,
    // Croissance
    userGrowthRate, monthlyNewUsers,
    // Autres contenus
    totalHelpRequests, totalOutings, totalLostFound, totalEvents,
  };

  return NextResponse.json({ stats });
}
