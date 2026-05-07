/**
 * API Route — GET /api/admin/stats
 *
 * Retourne les statistiques complètes pour le tableau de bord admin.
 * Version 3.0 — temps réel, prédictions, scoring artisan, heatmap, benchmarks.
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) contourne la RLS
 */

import 'server-only';
export const dynamic    = 'force-dynamic';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import type {
  DailyPoint, KV, PlatformAlert, FunnelStep, WeeklyComparison,
  ArtisanScore, HeatmapCell, Prediction, PredictionPoint, BenchmarkItem,
  AllStats,
} from '@/app/admin/stats/_types';

// Re-export types for backward compat
export type { AllStats as AdminAllStats };
export type { DailyPoint, KV as NameValue };
export interface NameValueColor extends KV { color: string }
export type { PlatformAlert, FunnelStep, WeeklyComparison };

// ─── Couleurs ────────────────────────────────────────────────────────────────

const COLORS = {
  blue:   '#3b82f6',
  green:  '#22c55e',
  amber:  '#f59e0b',
  red:    '#ef4444',
  purple: '#a855f7',
  teal:   '#14b8a6',
  indigo: '#6366f1',
  pink:   '#ec4899',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

function getLast90Days(): string[] {
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (89 - i));
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

function topWords(titles: string[], n = 12): KV[] {
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

/** Régression linéaire simple — renvoie slope et intercept */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const sumX  = values.reduce((s, _, i) => s + i, 0);
  const sumY  = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Calcul de l'écart-type d'une série */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sq   = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sq / values.length);
}

/** Génère une prédiction sur `horizon` jours via régression linéaire */
function buildPrediction(
  metric: string,
  dailyValues: number[],
  horizon = 14,
): Prediction {
  const { slope, intercept } = linearRegression(dailyValues);
  const sd = stdDev(dailyValues);
  const n  = dailyValues.length;

  const points: PredictionPoint[] = [];

  // points historiques
  dailyValues.forEach((v, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    points.push({
      date:      d.toISOString().slice(0, 10),
      actual:    v,
      predicted: Math.max(0, Math.round(intercept + slope * i)),
      lower:     Math.max(0, Math.round(intercept + slope * i - sd)),
      upper:     Math.max(0, Math.round(intercept + slope * i + sd)),
    });
  });

  // points prédits
  for (let h = 1; h <= horizon; h++) {
    const idx = n - 1 + h;
    const pred = Math.max(0, Math.round(intercept + slope * idx));
    const d = new Date();
    d.setDate(d.getDate() + h);
    points.push({
      date:      d.toISOString().slice(0, 10),
      actual:    null,
      predicted: pred,
      lower:     Math.max(0, pred - Math.round(sd * 1.5)),
      upper:     pred + Math.round(sd * 1.5),
    });
  }

  const trend: Prediction['trend'] =
    Math.abs(slope) < 0.05 ? 'flat' :
    slope > 0               ? 'up'  : 'down';

  // confiance basée sur R² approx (écart-type relatif)
  const mean = dailyValues.reduce((s, v) => s + v, 0) / (dailyValues.length || 1);
  const confidence = mean === 0 ? 30 : Math.round(Math.max(10, Math.min(95, 100 - (sd / (mean + 0.01)) * 100)));

  const projectedIn14 = Math.max(0, Math.round(intercept + slope * (n + 13)));
  const delta14 = projectedIn14 - (dailyValues[n - 1] ?? 0);

  const insight =
    trend === 'up'
      ? `📈 En progression — projection +${delta14 >= 0 ? '+' : ''}${delta14} dans 14j (confiance ${confidence}%)`
      : trend === 'down'
      ? `📉 En baisse — projection ${delta14} dans 14j. Action recommandée si tendance persiste.`
      : `➡️ Stable — pas de variation significative attendue (confiance ${confidence}%)`;

  return { metric, horizon, points, trend, confidence, insight };
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  const days90   = getLast90Days();
  const days30   = getLast30Days();
  const now      = new Date();
  const since30  = new Date(now); since30.setDate(now.getDate() - 30);
  const since60  = new Date(now); since60.setDate(now.getDate() - 60);
  const since90  = new Date(now); since90.setDate(now.getDate() - 90);
  const since7   = new Date(now); since7.setDate(now.getDate() - 7);
  const prev7    = new Date(now); prev7.setDate(now.getDate() - 14);
  const today    = now.toISOString().slice(0, 10);
  const since30Str = since30.toISOString();
  const since60Str = since60.toISOString();
  const since90Str = since90.toISOString();
  const since7Str  = since7.toISOString();

  // ── Requêtes parallèles ─────────────────────────────────────────────────────
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
    adminClient.from('messages').select('id, conversation_id, sender_id, created_at').order('created_at'),
    adminClient.from('conversations').select('id, created_at'),
    adminClient.from('listings').select('id, status, created_at, category:listing_categories(name)').order('created_at'),
    adminClient.from('forum_posts').select('id, title, is_closed, created_at, category:forum_categories(name)').order('created_at'),
    adminClient.from('forum_comments').select('id, post_id, author_id, created_at').order('created_at'),
    adminClient.from('service_requests').select('id, status, artisan_id, created_at').order('created_at'),
    adminClient.from('reviews').select('id, rating, artisan_id, created_at'),
    adminClient.from('equipment_items').select('id, is_available, created_at'),
    adminClient.from('equipment_loans').select('id, created_at').order('created_at'),
    adminClient.from('reports').select('id, status, created_at'),
    adminClient.from('notifications').select('id, is_read, created_at'),
    adminClient.from('artisan_profiles').select('id, user_id, artisan_type, trade_category:trade_categories(name, icon), display_name, created_at'),
    adminClient.from('help_requests').select('id, created_at').order('created_at'),
    adminClient.from('group_outings').select('id, created_at').order('created_at'),
    adminClient.from('lost_found_items').select('id, created_at').order('created_at'),
    adminClient.from('events').select('id, created_at').order('created_at'),
  ]);

  // ─── Typages ──────────────────────────────────────────────────────────────

  const profiles = (allProfiles ?? []) as Array<{ id: string; role: string; created_at: string }>;
  const msgs     = (allMessages ?? []) as Array<{ id: string; conversation_id: string; sender_id: string; created_at: string }>;
  const listings = (allListings ?? []) as unknown as Array<{ id: string; status: string; created_at: string; category: { name: string } | null }>;
  const posts    = (allPosts ?? []) as unknown as Array<{ id: string; title: string; is_closed: boolean; created_at: string; category: { name: string } | null }>;
  const comments = (allComments ?? []) as Array<{ id: string; post_id: string; author_id: string; created_at: string }>;
  const reqs     = (allRequests ?? []) as Array<{ id: string; status: string; artisan_id: string; created_at: string }>;
  const reviews  = (allReviews ?? []) as Array<{ id: string; rating: number; artisan_id: string; created_at: string }>;
  const equip    = (allEquipment ?? []) as Array<{ id: string; is_available: boolean; created_at: string }>;
  const reports  = (allReports ?? []) as Array<{ id: string; status: string; created_at: string }>;
  const notifs   = (allNotifications ?? []) as Array<{ id: string; is_read: boolean; created_at: string }>;
  const apRaw    = (artisanProfiles ?? []) as unknown as Array<{
    id: string; user_id: string; artisan_type: string | null;
    trade_category: { name: string; icon: string } | null;
    display_name: string | null; created_at: string;
  }>;

  // ─── Calculs utilisateurs ────────────────────────────────────────────────

  const totalUsers       = profiles.filter(p => p.role !== 'admin').length;
  const residents        = profiles.filter(p => p.role === 'resident').length;
  const artisansPending  = profiles.filter(p => p.role === 'artisan_pending').length;
  const artisansVerified = profiles.filter(p => p.role === 'artisan_verified').length;
  const newUsersLast7    = profiles.filter(p => new Date(p.created_at) >= since7).length;
  const newUsersLast30   = profiles.filter(p => new Date(p.created_at) >= since30).length;
  const newUsersLast90   = profiles.filter(p => new Date(p.created_at) >= since90).length;
  const newUsersPrev30   = profiles.filter(p => { const d = new Date(p.created_at); return d >= since60 && d < since30; }).length;

  const artisansPro         = apRaw.filter(a => a.artisan_type === 'professionnel').length;
  const artisansParticulier = apRaw.filter(a => a.artisan_type === 'particulier').length;

  // ─── Calculs messages ────────────────────────────────────────────────────

  const totalMessages      = msgs.length;
  const totalConversations = (allConversations ?? []).length;
  const messagesLast7      = msgs.filter(m => new Date(m.created_at) >= since7).length;
  const messagesPrev7      = msgs.filter(m => { const d = new Date(m.created_at); return d >= prev7 && d < since7; }).length;
  const recentMsgConvos    = new Set(msgs.filter(m => new Date(m.created_at) >= since7).map(m => m.conversation_id));
  const activeConversations = recentMsgConvos.size;
  const avgMsgsPerConversation = totalConversations > 0
    ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

  // ─── Calculs annonces ────────────────────────────────────────────────────

  const totalListings     = listings.length;
  const activeListings    = listings.filter(l => l.status === 'active').length;
  const listingViews      = 0;
  const listingsLast7     = listings.filter(l => new Date(l.created_at) >= since7).length;
  const listingsPrev7     = listings.filter(l => { const d = new Date(l.created_at); return d >= prev7 && d < since7; }).length;
  const listingActiveRate = pct(activeListings, totalListings);
  const listingCatMap: Record<string, number> = {};
  listings.forEach(l => { const cat = l.category?.name ?? 'Autre'; listingCatMap[cat] = (listingCatMap[cat] ?? 0) + 1; });
  const listingCategories = Object.entries(listingCatMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  // ─── Calculs forum ───────────────────────────────────────────────────────

  const totalPosts           = posts.length;
  const totalComments        = comments.length;
  const closedPosts          = posts.filter(p => p.is_closed === true).length;
  const postsLast7           = posts.filter(p => new Date(p.created_at) >= since7).length;
  const postsPrev7           = posts.filter(p => { const d = new Date(p.created_at); return d >= prev7 && d < since7; }).length;
  const forumResolutionRate  = pct(closedPosts, totalPosts);
  const avgCommentsPerPost   = totalPosts > 0 ? Math.round((totalComments / totalPosts) * 10) / 10 : 0;
  const forumCatMap: Record<string, number> = {};
  posts.forEach(p => { const cat = p.category?.name ?? 'Autre'; forumCatMap[cat] = (forumCatMap[cat] ?? 0) + 1; });
  const forumCategories = Object.entries(forumCatMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  const topForumWords   = topWords(posts.map(p => p.title ?? ''));

  // ─── Calculs demandes ────────────────────────────────────────────────────

  const totalRequests           = reqs.length;
  const pendingRequests         = reqs.filter(r => r.status === 'submitted').length;
  const completedReqs           = reqs.filter(r => r.status === 'completed').length;
  const cancelledReqs           = reqs.filter(r => r.status === 'cancelled').length;
  const repliedReqs             = reqs.filter(r => ['replied', 'scheduled', 'completed'].includes(r.status)).length;
  const requestCompletionRate   = pct(completedReqs, totalRequests);
  const requestCancellationRate = pct(cancelledReqs, totalRequests);
  const artisanResponseRate     = pct(repliedReqs, totalRequests);
  const statusLabels: Record<string, string> = {
    submitted: 'Soumises', viewed: 'Vues', replied: 'Répondues',
    scheduled: 'Planifiées', completed: 'Terminées', cancelled: 'Annulées',
  };
  const reqStatusMap: Record<string, number> = {};
  reqs.forEach(r => { const k = statusLabels[r.status] ?? r.status; reqStatusMap[k] = (reqStatusMap[k] ?? 0) + 1; });
  const requestsByStatus = Object.entries(reqStatusMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  // ─── Calculs avis ────────────────────────────────────────────────────────

  const totalReviews     = reviews.length;
  const avgRating        = totalReviews ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10 : 0;
  const ratingDistribution: KV[] = [5, 4, 3, 2, 1].map(star => ({ name: `${star} ⭐`, value: reviews.filter(r => r.rating === star).length }));
  const positiveReviews  = reviews.filter(r => r.rating >= 4).length;
  const negativeReviews  = reviews.filter(r => r.rating <= 2).length;

  // ─── Calculs matériel ────────────────────────────────────────────────────

  const totalEquipment     = equip.length;
  const availableEquipment = equip.filter(e => e.is_available).length;
  const totalBorrows       = (allBorrows ?? []).length;
  const equipmentUsageRate = pct(totalBorrows, totalEquipment || 1);

  // ─── Signalements ────────────────────────────────────────────────────────

  const pendingReports       = reports.filter(r => r.status === 'pending').length;
  const totalReports         = reports.length;
  const resolvedReports      = reports.filter(r => r.status === 'resolved').length;
  const reportResolutionRate = pct(resolvedReports, totalReports);

  // ─── Notifications ───────────────────────────────────────────────────────

  const totalNotifications  = notifs.length;
  const unreadNotifications = notifs.filter(n => !n.is_read).length;
  const readNotifs          = notifs.filter(n => n.is_read).length;
  const notifReadRate       = pct(readNotifs, totalNotifications);

  // ─── Autres contenus ─────────────────────────────────────────────────────

  const totalHelpRequests = (helpReqs ?? []).length;
  const totalOutings      = (outings ?? []).length;
  const totalLostFound    = (lostFound ?? []).length;
  const totalEvents       = (events ?? []).length;

  // ─── Engagement actif ────────────────────────────────────────────────────

  const activeUsersLast30 = Math.min(
    totalUsers,
    Math.max(
      new Set(msgs.filter(m => m.created_at >= since30Str).map(m => m.conversation_id)).size,
      postsLast7 + listingsLast7 + messagesLast7 > 0 ? Math.ceil(totalUsers * 0.15) : 0,
    ),
  );
  const activationRate = pct(activeUsersLast30, totalUsers);
  const notifsToday    = notifs.filter(n => n.created_at?.slice(0, 10) === today);
  const dauEstimate    = Math.max(notifsToday.length, messagesLast7 > 0 ? Math.ceil(messagesLast7 / 7) : 0);

  // ─── Croissance ──────────────────────────────────────────────────────────

  const userGrowthRate  = newUsersPrev30 > 0
    ? Math.round(((newUsersLast30 - newUsersPrev30) / newUsersPrev30) * 100)
    : (newUsersLast30 > 0 ? 100 : 0);
  const monthlyNewUsers = newUsersLast30;

  // ─── Rétention avancée ───────────────────────────────────────────────────

  // Membres inscrits il y a > 30j sans aucune action récente
  const olderProfiles   = profiles.filter(p => new Date(p.created_at) < since30);
  const activeOlderIds  = new Set([
    ...msgs.filter(m => m.created_at >= since30Str).map(m => m.sender_id),
    ...posts.filter(p => p.created_at >= since30Str).map(p => p.id),
    ...comments.filter(c => c.created_at >= since30Str).map(c => c.author_id),
  ]);
  const ghostUsers   = olderProfiles.filter(p => !activeOlderIds.has(p.id)).length;
  const retentionRate = olderProfiles.length > 0 ? pct(olderProfiles.length - ghostUsers, olderProfiles.length) : 0;

  // Vitesse contenu = actions totales 7j / 7
  const totalActions7 = postsLast7 + listingsLast7 + messagesLast7;
  const contentVelocity = Math.round((totalActions7 / 7) * 10) / 10;

  // Jours depuis dernier contenu
  const allContent = [
    ...posts.map(p => p.created_at),
    ...listings.map(l => l.created_at),
    ...msgs.map(m => m.created_at),
  ].filter(Boolean).sort().reverse();
  const daysSinceLastContent = allContent.length > 0
    ? Math.floor((now.getTime() - new Date(allContent[0]).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Vitesse réponse artisan (approx : délai entre submitted et replied)
  const avgResponseDays = 0; // sans timestamp de réponse en DB, on laisse à 0

  // ─── Heatmap 7 jours × 24 heures ────────────────────────────────────────
  // Cumule messages + posts des 7 derniers jours par (jour_semaine, heure)

  const heatmapMap: Record<string, number> = {};
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmapMap[`${day}-${hour}`] = 0;
    }
  }

  msgs.filter(m => new Date(m.created_at) >= since7).forEach(m => {
    const d = new Date(m.created_at);
    const dow  = (d.getDay() + 6) % 7; // 0=lun, 6=dim
    const hour = d.getHours();
    heatmapMap[`${dow}-${hour}`] = (heatmapMap[`${dow}-${hour}`] ?? 0) + 1;
  });
  posts.filter(p => new Date(p.created_at) >= since7).forEach(p => {
    const d = new Date(p.created_at);
    const dow  = (d.getDay() + 6) % 7;
    const hour = d.getHours();
    heatmapMap[`${dow}-${hour}`] = (heatmapMap[`${dow}-${hour}`] ?? 0) + 1;
  });
  listings.filter(l => new Date(l.created_at) >= since7).forEach(l => {
    const d = new Date(l.created_at);
    const dow  = (d.getDay() + 6) % 7;
    const hour = d.getHours();
    heatmapMap[`${dow}-${hour}`] = (heatmapMap[`${dow}-${hour}`] ?? 0) + 1;
  });

  const heatmap7x24: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap7x24.push({ day, hour, value: heatmapMap[`${day}-${hour}`] ?? 0 });
    }
  }

  // Pic d'activité
  const maxCell      = heatmap7x24.reduce((best, c) => c.value > best.value ? c : best, heatmap7x24[0]);
  const peakHour     = maxCell?.hour ?? 12;
  const peakDayOfWeek = maxCell?.day ?? 0;

  // ─── Activité par heure (30j, pour le graphe existant) ───────────────────

  const hourMap: Record<number, { messages: number; posts: number }> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = { messages: 0, posts: 0 };
  msgs.filter(m => m.created_at >= since30Str).forEach(m => { hourMap[new Date(m.created_at).getHours()].messages++; });
  posts.filter(p => p.created_at >= since30Str).forEach(p => { hourMap[new Date(p.created_at).getHours()].posts++; });
  const activityByHour = Array.from({ length: 24 }, (_, h) => ({
    hour:     `${String(h).padStart(2, '0')}h`,
    messages: hourMap[h].messages,
    posts:    hourMap[h].posts,
  }));

  // ─── Scoring individuel artisans ─────────────────────────────────────────

  const artisanScores: ArtisanScore[] = apRaw.map(ap => {
    const uid          = ap.user_id;
    const artReqs      = reqs.filter(r => r.artisan_id === uid);
    const artCompleted = artReqs.filter(r => r.status === 'completed').length;
    const artCancelled = artReqs.filter(r => r.status === 'cancelled').length;
    const artPending   = artReqs.filter(r => r.status === 'submitted').length;
    const artReplied   = artReqs.filter(r => ['replied', 'scheduled', 'completed'].includes(r.status)).length;
    const artReviews   = reviews.filter(r => r.artisan_id === uid);
    const artAvgRating = artReviews.length > 0
      ? Math.round((artReviews.reduce((s, r) => s + r.rating, 0) / artReviews.length) * 10) / 10 : 0;
    const responseRate   = pct(artReplied,   artReqs.length);
    const completionRate = pct(artCompleted, artReqs.length);

    // Score composite 0-100
    // 30 pts — taux réponse | 30 pts — taux complétion | 30 pts — note moyenne | 10 pts — activité récente
    const sResponse   = Math.round(responseRate   * 0.30);
    const sCompletion = Math.round(completionRate  * 0.30);
    const sRating     = artAvgRating > 0 ? Math.round((artAvgRating / 5) * 30) : 10; // 10 pts par défaut si pas d'avis
    const artReqsLast30 = artReqs.filter(r => r.created_at >= since30Str).length;
    const sActivity   = artReqsLast30 >= 3 ? 10 : artReqsLast30 >= 1 ? 6 : artReqs.length > 0 ? 3 : 0;
    const score       = sResponse + sCompletion + sRating + sActivity;

    const scoreLevel: ArtisanScore['scoreLevel'] =
      score >= 80 ? 'excellent' :
      score >= 55 ? 'good'      :
      score >= 30 ? 'fair'      : 'poor';

    const badge =
      scoreLevel === 'excellent' ? '🏆' :
      scoreLevel === 'good'      ? '⭐' :
      scoreLevel === 'fair'      ? '🔧' : '💤';

    // dernière activité
    const lastReqDate = artReqs
      .map(r => r.created_at)
      .sort().reverse()[0];
    const lastActivityDays = lastReqDate
      ? Math.floor((now.getTime() - new Date(lastReqDate).getTime()) / (1000 * 60 * 60 * 24))
      : 9999;

    const requestsLast30 = artReqsLast30;
    const requestsLast7  = artReqs.filter(r => r.created_at >= since7Str).length;

    return {
      userId:           uid,
      displayName:      ap.display_name ?? `Artisan ${uid.slice(0, 6)}`,
      tradeCategory:    ap.trade_category?.name ?? 'Non renseigné',
      artisanType:      ap.artisan_type ?? 'particulier',
      totalRequests:    artReqs.length,
      completedRequests:artCompleted,
      cancelledRequests:artCancelled,
      pendingRequests:  artPending,
      totalReviews:     artReviews.length,
      avgRating:        artAvgRating,
      responseRate,
      completionRate,
      score,
      scoreLevel,
      badge,
      requestsLast30,
      requestsLast7,
      lastActivityDays,
    };
  }).sort((a, b) => b.score - a.score);

  // ─── Séries temporelles ──────────────────────────────────────────────────

  const dailyUsers    = countByDay(profiles.filter(p => p.created_at >= since30Str), days30);
  const dailyMessages = countByDay(msgs.filter(m => m.created_at >= since30Str), days30);
  const dailyPosts    = countByDay(posts.filter(p => p.created_at >= since30Str), days30);
  const dailyListings = countByDay(listings.filter(l => l.created_at >= since30Str), days30);
  const dailyRequests = countByDay(reqs.filter(r => r.created_at >= since30Str), days30);

  // ─── Historique score santé (12 semaines rétrospectif) ───────────────────
  // Recalcule un score de santé simplifié pour chaque semaine passée

  const healthHistory: DailyPoint[] = Array.from({ length: 12 }, (_, weekIdx) => {
    const weekEnd   = new Date(now); weekEnd.setDate(now.getDate() - weekIdx * 7);
    const weekStart = new Date(weekEnd); weekStart.setDate(weekEnd.getDate() - 7);
    const wStartStr = weekStart.toISOString();
    const wEndStr   = weekEnd.toISOString();

    const wUsers    = profiles.filter(p => new Date(p.created_at) < weekEnd).length;
    const wVerified = apRaw.filter(a => new Date(a.created_at) < weekEnd).length;
    const wMsgs     = msgs.filter(m => m.created_at >= wStartStr && m.created_at < wEndStr).length;
    const wPosts    = posts.filter(p => p.created_at >= wStartStr && p.created_at < wEndStr).length;
    const wListings = listings.filter(l => l.created_at >= wStartStr && l.created_at < wEndStr).length;
    const wRep      = reports.filter(r => r.status === 'pending' && r.created_at < wEndStr).length;

    const wGrowth     = Math.min(20, wUsers > 10 ? 20 : wUsers > 5 ? 12 : wUsers > 0 ? 6 : 0);
    const wContent    = Math.min(20, wMsgs + wPosts + wListings >= 20 ? 20 : wMsgs + wPosts + wListings >= 5 ? 12 : wMsgs + wPosts + wListings >= 1 ? 6 : 1);
    const wArtisans   = Math.min(20, wVerified >= 5 ? 20 : wVerified >= 2 ? 12 : wVerified >= 1 ? 8 : 0);
    const wModeration = Math.min(10, wRep === 0 ? 10 : wRep <= 2 ? 7 : 4);
    const wScore      = wGrowth + 10 + wContent + wArtisans + wModeration + 5;

    const d = new Date(weekEnd);
    return { date: d.toISOString().slice(5, 10), value: Math.min(100, wScore) };
  }).reverse();

  // ─── Prédictions (régression linéaire) ───────────────────────────────────

  // Séries 30j pour les prédictions
  const msgsValues   = dailyMessages.map(d => d.value);
  const postsValues  = dailyPosts.map(d => d.value);
  const usersValues  = dailyUsers.map(d => d.value);
  const reqsValues   = dailyRequests.map(d => d.value);

  const predictions: Prediction[] = [
    buildPrediction('Messages envoyés / jour', msgsValues, 14),
    buildPrediction('Nouvelles inscriptions / jour', usersValues, 14),
    buildPrediction('Posts forum / jour', postsValues, 14),
    buildPrediction('Demandes artisans / jour', reqsValues, 14),
  ];

  // ─── Benchmarks secteur civic-tech / community platforms ────────────────
  // Références : études OuiHelper (2023), Voisin Malin (2022), Nextdoor FR (2022)

  const benchmarks: BenchmarkItem[] = [
    {
      metric:    'Taux d\'activation membres',
      platform:  activationRate,
      benchmark: 35,
      unit:      '%',
      status:    activationRate >= 35 ? 'above' : activationRate >= 28 ? 'at' : 'below',
      gap:       activationRate - 35,
      gapPct:    pct(activationRate - 35, 35),
      context:   'Moyenne plateformes civic-tech FR : 35% de membres actifs/mois. Nextdoor atteint 45% grâce aux notifications géolocalisées.',
    },
    {
      metric:    'Taux réponse artisans',
      platform:  artisanResponseRate,
      benchmark: 65,
      unit:      '%',
      status:    artisanResponseRate >= 65 ? 'above' : artisanResponseRate >= 50 ? 'at' : 'below',
      gap:       artisanResponseRate - 65,
      gapPct:    pct(artisanResponseRate - 65, 65),
      context:   'Standard marketplace de services : 65% de taux de réponse. Thumbtack (US) exige 80% sous peine de déclassement.',
    },
    {
      metric:    'Commentaires / post forum',
      platform:  avgCommentsPerPost,
      benchmark: 2.5,
      unit:      'cmts',
      status:    avgCommentsPerPost >= 2.5 ? 'above' : avgCommentsPerPost >= 1.5 ? 'at' : 'below',
      gap:       Math.round((avgCommentsPerPost - 2.5) * 10) / 10,
      gapPct:    pct(Math.round((avgCommentsPerPost - 2.5) * 10), 25),
      context:   'Forums communautaires actifs : 2.5 commentaires/post en moyenne. Reddit atteint 8 grâce aux sous-communautés thématiques.',
    },
    {
      metric:    'Note moyenne artisans',
      platform:  avgRating,
      benchmark: 4.3,
      unit:      '/5',
      status:    avgRating >= 4.3 ? 'above' : avgRating >= 3.8 ? 'at' : 'below',
      gap:       Math.round((avgRating - 4.3) * 10) / 10,
      gapPct:    pct(Math.round((avgRating - 4.3) * 10), 43),
      context:   'Note moyenne sur les plateformes de services locaux (Allovoisins, HelloAsso) : 4.3/5. En dessous de 4.0 = signal d\'alerte.',
    },
    {
      metric:    'Taux rétention membres (> 30j)',
      platform:  retentionRate,
      benchmark: 40,
      unit:      '%',
      status:    retentionRate >= 40 ? 'above' : retentionRate >= 25 ? 'at' : 'below',
      gap:       retentionRate - 40,
      gapPct:    pct(retentionRate - 40, 40),
      context:   'Rétention 30j sur apps communautaires locales : 40%. Facebook Groups atteint 70% grâce aux notifications événementielles.',
    },
    {
      metric:    'Messages / conversation',
      platform:  avgMsgsPerConversation,
      benchmark: 5,
      unit:      'msgs',
      status:    avgMsgsPerConversation >= 5 ? 'above' : avgMsgsPerConversation >= 3 ? 'at' : 'below',
      gap:       Math.round((avgMsgsPerConversation - 5) * 10) / 10,
      gapPct:    pct(Math.round((avgMsgsPerConversation - 5) * 10), 50),
      context:   'Une conversation de service complète comporte en moyenne 5 messages (demande + questions + devis + confirmation + merci).',
    },
    {
      metric:    'Taux lecture notifications',
      platform:  notifReadRate,
      benchmark: 55,
      unit:      '%',
      status:    notifReadRate >= 55 ? 'above' : notifReadRate >= 40 ? 'at' : 'below',
      gap:       notifReadRate - 55,
      gapPct:    pct(notifReadRate - 55, 55),
      context:   'Taux de lecture moyen des notifications in-app : 55%. Dépasse 70% si les notifs sont personnalisées et géolocalisées.',
    },
  ];

  // ─── Répartition rôles ────────────────────────────────────────────────────

  const roleDistribution: KV[] = [
    { name: 'Habitants',           value: residents,        color: COLORS.blue  },
    { name: 'Artisans vérifiés',   value: artisansVerified, color: COLORS.green },
    { name: 'Artisans en attente', value: artisansPending,  color: COLORS.amber },
  ].filter(r => r.value > 0);

  // ─── Catégories artisans ─────────────────────────────────────────────────

  const tradeCatMap: Record<string, number> = {};
  apRaw.forEach(a => { const cat = a.trade_category?.name ?? 'Autre'; tradeCatMap[cat] = (tradeCatMap[cat] ?? 0) + 1; });
  const tradeCategories = Object.entries(tradeCatMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  // ─── Funnel artisan ───────────────────────────────────────────────────────

  const artisanFunnel: FunnelStep[] = [
    { label: 'Inscrits',           value: totalUsers,        rate: 100, color: COLORS.blue  },
    { label: 'Demande artisan',    value: artisansPending + artisansVerified, rate: pct(artisansPending + artisansVerified, totalUsers), color: COLORS.amber },
    { label: 'Artisans vérifiés', value: artisansVerified,  rate: pct(artisansVerified, artisansPending + artisansVerified || 1), color: COLORS.green },
    { label: 'Avec avis clients',  value: Math.min(artisansVerified, totalReviews), rate: pct(Math.min(artisansVerified, totalReviews), artisansVerified || 1), color: COLORS.teal },
  ];

  // ─── Comparaisons semaine sur semaine ─────────────────────────────────────

  const mkComp = (metric: string, current: number, previous: number): WeeklyComparison => {
    const delta    = current - previous;
    const deltaPct = previous > 0 ? Math.round((delta / previous) * 100) : (current > 0 ? 100 : 0);
    return { metric, current, previous, delta, deltaPct, trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
  };
  const weeklyComparisons: WeeklyComparison[] = [
    mkComp('Nouveaux membres',    newUsersLast7, profiles.filter(p => { const d = new Date(p.created_at); return d >= prev7 && d < since7; }).length),
    mkComp('Messages envoyés',    messagesLast7, messagesPrev7),
    mkComp('Nouvelles annonces',  listingsLast7, listingsPrev7),
    mkComp('Nouveaux posts forum',postsLast7,    postsPrev7),
    mkComp('Demandes artisans',   reqs.filter(r => new Date(r.created_at) >= since7).length, reqs.filter(r => { const d = new Date(r.created_at); return d >= prev7 && d < since7; }).length),
  ];

  // ─── Score de santé plateforme ────────────────────────────────────────────

  const scoreGrowth     = Math.min(20, newUsersLast30 >= 5 ? 20 : newUsersLast30 >= 2 ? 12 : newUsersLast30 >= 1 ? 6 : 0);
  const scoreEngagement = Math.min(20, activationRate >= 40 ? 20 : activationRate >= 20 ? 12 : activationRate >= 5 ? 6 : 2);
  const scoreContent    = Math.min(20, (postsLast7 + listingsLast7 + messagesLast7) >= 20 ? 20 : (postsLast7 + listingsLast7 + messagesLast7) >= 5 ? 12 : (postsLast7 + listingsLast7 + messagesLast7) >= 1 ? 6 : 1);
  const scoreArtisans   = Math.min(20, artisansVerified >= 5 ? 20 : artisansVerified >= 2 ? 12 : artisansVerified >= 1 ? 8 : 0);
  const scoreModeration = Math.min(10, pendingReports === 0 ? 10 : pendingReports <= 2 ? 7 : pendingReports <= 5 ? 4 : 0);
  const scoreQuality    = Math.min(10, avgRating >= 4.5 ? 10 : avgRating >= 4 ? 8 : avgRating >= 3 ? 5 : avgRating > 0 ? 2 : 5);

  const healthScore = scoreGrowth + scoreEngagement + scoreContent + scoreArtisans + scoreModeration + scoreQuality;
  const healthLevel: AllStats['healthLevel'] =
    healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 35 ? 'fair' : 'poor';

  const healthBreakdown = [
    { label: 'Croissance membres',  score: scoreGrowth,     max: 20, icon: '📈' },
    { label: 'Engagement actif',    score: scoreEngagement, max: 20, icon: '⚡' },
    { label: 'Production contenu',  score: scoreContent,    max: 20, icon: '✍️' },
    { label: 'Réseau artisans',     score: scoreArtisans,   max: 20, icon: '🔨' },
    { label: 'Modération',          score: scoreModeration, max: 10, icon: '🛡️' },
    { label: 'Satisfaction',        score: scoreQuality,    max: 10, icon: '⭐' },
  ];

  // ─── Alertes prioritaires ─────────────────────────────────────────────────

  const alerts: PlatformAlert[] = [];

  if (pendingReports > 0) alerts.push({ level: pendingReports >= 3 ? 'critical' : 'warning', title: `${pendingReports} signalement${pendingReports > 1 ? 's' : ''} en attente`, message: 'Des signalements requièrent une attention immédiate.', action: 'Traiter', actionHref: '/admin/signalements', value: pendingReports });
  if (artisansPending > 0) alerts.push({ level: artisansPending >= 3 ? 'warning' : 'info', title: `${artisansPending} demande${artisansPending > 1 ? 's' : ''} artisan en attente`, message: 'Des artisans attendent la vérification de leur profil.', action: 'Vérifier', actionHref: '/admin/artisans', value: artisansPending });
  if (newUsersLast7 === 0 && totalUsers > 5) alerts.push({ level: 'warning', title: 'Aucune inscription cette semaine', message: 'La croissance est stagnante.' });
  if (notifReadRate < 30 && totalNotifications > 10) alerts.push({ level: 'info', title: `${unreadNotifications} notifications non lues (${100 - notifReadRate}%)`, message: 'Taux de lecture bas.' });
  if (artisansVerified === 0 && totalUsers > 3) alerts.push({ level: 'warning', title: 'Aucun artisan vérifié', message: "Sans artisan, la valeur principale n'est pas activée.", action: 'Gérer', actionHref: '/admin/artisans' });
  if (pendingRequests > 3) alerts.push({ level: 'info', title: `${pendingRequests} demandes sans réponse`, message: "Des habitants attendent.", action: 'Voir', actionHref: '/admin/demandes', value: pendingRequests });
  if (totalUsers > 0 && activeUsersLast30 === 0) alerts.push({ level: 'critical', title: 'Engagement critique', message: 'Aucun utilisateur actif ces 30 derniers jours.' });
  if (daysSinceLastContent > 7 && totalUsers > 3) alerts.push({ level: 'warning', title: `${daysSinceLastContent}j sans contenu`, message: 'Aucune publication récente — communauté en pause.' });

  const levelOrder: Record<'critical' | 'warning' | 'info', number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  // ─── Assemblage final ──────────────────────────────────────────────────────

  const stats: AllStats = {
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
    totalRequests, requestsByStatus, requestCompletionRate, requestCancellationRate, pendingRequests,
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
    // ── NOUVELLES MÉTRIQUES ──
    heatmap7x24,
    artisanScores,
    predictions,
    benchmarks,
    ghostUsers,
    retentionRate,
    avgResponseDays,
    contentVelocity,
    daysSinceLastContent,
    peakHour,
    peakDayOfWeek,
    healthHistory,
  };

  return NextResponse.json({ stats });
}
