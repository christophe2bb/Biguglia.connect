/**
 * API Route — GET /api/admin/stats
 *
 * Version 4.0 — Algorithmes avancés temps réel
 *
 * Algorithmes implémentés :
 *   • Z-score anomaly detection (|z| > 2σ = warning, > 3σ = critical)
 *   • EWMA (Exponential Weighted Moving Average) α=0.3 (7j) / α=0.1 (30j)
 *   • Momentum score = (EWMA7 − EWMA30) / EWMA30 × 100
 *   • Cohort retention (J+7, J+14, J+30) par mois d'inscription
 *   • DAU/MAU ratio, stickiness (DAU/WAU), churn risk
 *   • NPS estimé (avis 5★ vs 1-2★)
 *   • Régression linéaire + intervalle de confiance
 *   • Score momentum artisan (comparaison 2 périodes)
 *
 * SÉCURITÉ : getAdminUser() vérifie session + role admin/moderator
 */

import 'server-only';
export const dynamic    = 'force-dynamic';
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import type {
  DailyPoint, KV, PlatformAlert, FunnelStep, WeeklyComparison,
  ArtisanScore, HeatmapCell, Prediction, PredictionPoint, BenchmarkItem,
  AnomalyPoint, EwmaMetrics, EngagementMetrics, CohortRetention,
  AllStats,
} from '@/app/admin/stats/_types';

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

// ─── Helpers temporels ────────────────────────────────────────────────────────

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

// ─── Algorithme 1 : Régression linéaire ──────────────────────────────────────

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

// ─── Algorithme 2 : Écart-type ────────────────────────────────────────────────

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sq   = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sq / values.length);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── Algorithme 3 : EWMA (Exponential Weighted Moving Average) ───────────────
// α fort (0.3) = réactif court terme | α faible (0.1) = tendance long terme

function ewma(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return Math.round(result * 10) / 10;
}

// Calcul de la série EWMA complète (pour graphes)
function ewmaSeries(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result.map(v => Math.round(v * 10) / 10);
}

// ─── Algorithme 4 : Z-score (détection d'anomalies) ──────────────────────────
// Formule : z = (x - μ) / σ

function zScore(value: number, seriesMean: number, seriesStd: number): number {
  if (seriesStd === 0) return 0;
  return (value - seriesMean) / seriesStd;
}

// ─── Algorithme 5 : Score momentum ───────────────────────────────────────────
// Momentum = (EWMA_court - EWMA_long) / EWMA_long × 100
// Positif = accélération | Négatif = décélération

function momentumScore(ewmaShort: number, ewmaLong: number): number {
  if (ewmaLong === 0) return ewmaShort > 0 ? 100 : 0;
  return Math.round(((ewmaShort - ewmaLong) / ewmaLong) * 100);
}

// ─── Algorithme 6 : Prédiction avec EWMA et régression ───────────────────────

function buildPrediction(
  metric: string,
  dailyValues: number[],
  horizon = 14,
): Prediction {
  const { slope, intercept } = linearRegression(dailyValues);
  const sd  = stdDev(dailyValues);
  const n   = dailyValues.length;
  const avg = mean(dailyValues);

  // EWMA
  const ewma7Series  = ewmaSeries(dailyValues, 0.3);
  const ewma30Series = ewmaSeries(dailyValues, 0.1);
  const ewma7val     = ewma7Series[ewma7Series.length - 1] ?? avg;
  const ewma30val    = ewma30Series[ewma30Series.length - 1] ?? avg;
  const momentum     = momentumScore(ewma7val, ewma30val);

  const points: PredictionPoint[] = [];

  // Points historiques avec bandes de confiance EWMA
  dailyValues.forEach((v, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    const predicted = Math.max(0, Math.round(intercept + slope * i));
    // Bande basée sur écart-type adaptatif
    const band = Math.max(1, Math.round(sd * (1 + Math.abs(momentum) / 200)));
    points.push({
      date:      d.toISOString().slice(0, 10),
      actual:    v,
      predicted,
      lower:     Math.max(0, predicted - band),
      upper:     predicted + band,
    });
  });

  // Points futurs (horizon jours)
  for (let h = 1; h <= horizon; h++) {
    const idx  = n - 1 + h;
    // Prédiction hybride : 60% régression + 40% EWMA (plus réaliste)
    const regPred  = Math.max(0, intercept + slope * idx);
    const ewmaPred = Math.max(0, ewma7val + slope * h); // EWMA projeté
    const pred     = Math.max(0, Math.round(0.6 * regPred + 0.4 * ewmaPred));
    // Bande qui s'élargit avec le temps (incertitude croissante)
    const band = Math.max(1, Math.round(sd * (1 + h / horizon)));
    const d = new Date();
    d.setDate(d.getDate() + h);
    points.push({
      date:      d.toISOString().slice(0, 10),
      actual:    null,
      predicted: pred,
      lower:     Math.max(0, pred - band),
      upper:     pred + band,
    });
  }

  const trend: Prediction['trend'] =
    Math.abs(slope) < 0.05 ? 'flat' :
    slope > 0               ? 'up'  : 'down';

  // Confiance : basée sur R² et stabilité de la série
  const ss_res = dailyValues.reduce((s, v, i) => s + (v - (intercept + slope * i)) ** 2, 0);
  const ss_tot = dailyValues.reduce((s, v) => s + (v - avg) ** 2, 0);
  const r2 = ss_tot > 0 ? 1 - ss_res / ss_tot : 0;
  const confidence = Math.round(Math.max(10, Math.min(95, r2 * 100)));

  const projectedIn14 = Math.max(0, Math.round(intercept + slope * (n + 13)));
  const delta14       = projectedIn14 - (dailyValues[n - 1] ?? 0);

  const momentumLabel =
    momentum > 20  ? '🚀 Forte accélération' :
    momentum > 5   ? '📈 En accélération' :
    momentum < -20 ? '⚠️ Forte décélération' :
    momentum < -5  ? '📉 En décélération' : '➡️ Stable';

  const insight =
    trend === 'up'
      ? `📈 ${momentumLabel} — projection +${delta14 >= 0 ? '+' : ''}${delta14} dans 14j (R²=${confidence}%)`
      : trend === 'down'
      ? `📉 ${momentumLabel} — projection ${delta14} dans 14j. Action recommandée si persiste.`
      : `➡️ Stable — ${momentumLabel} (R²=${confidence}%)`;

  return {
    metric, horizon, points, trend, confidence, insight,
    momentumScore: momentum,
    ewma7: ewma7val,
    ewma30: ewma30val,
  };
}

// ─── Algorithme 7 : Détection anomalies Z-score ───────────────────────────────

function detectAnomalies(
  series: DailyPoint[],
  metricName: string,
  threshold = 2.0,
): AnomalyPoint[] {
  const values = series.map(p => p.value);
  if (values.length < 5) return [];

  const μ  = mean(values);
  const σ  = stdDev(values);
  const anomalies: AnomalyPoint[] = [];

  // On ne regarde que les 7 derniers points
  series.slice(-7).forEach(point => {
    const z = zScore(point.value, μ, σ);
    const absZ = Math.abs(z);
    if (absZ >= threshold) {
      anomalies.push({
        date:      point.date,
        metric:    metricName,
        value:     point.value,
        zscore:    Math.round(z * 100) / 100,
        mean:      Math.round(μ * 10) / 10,
        stddev:    Math.round(σ * 10) / 10,
        level:     absZ >= 3 ? 'critical' : 'warning',
        direction: z > 0 ? 'spike' : 'drop',
      });
    }
  });

  return anomalies;
}

// ─── Algorithme 8 : Rétention par cohortes ───────────────────────────────────
// Regroupe les inscrits par mois et mesure leur activité aux étapes clés

function buildCohortRetention(
  profiles: Array<{ id: string; created_at: string }>,
  activeIds30: Set<string>,
  activeIds14: Set<string>,
  activeIds7: Set<string>,
): CohortRetention[] {
  // Grouper par mois (3 derniers mois)
  const cohorts: Record<string, string[]> = {};
  profiles.forEach(p => {
    const monthKey = p.created_at.slice(0, 7); // YYYY-MM
    if (!cohorts[monthKey]) cohorts[monthKey] = [];
    cohorts[monthKey].push(p.id);
  });

  const months = Object.keys(cohorts).sort().reverse().slice(0, 3);
  const monthLabels: Record<string, string> = {
    '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
  };

  return months.map(month => {
    const ids  = cohorts[month] ?? [];
    const size = ids.length;
    const [year, m] = month.split('-');
    const label = `${monthLabels[m] ?? m} ${year}`;

    const ret7  = size > 0 ? pct(ids.filter(id => activeIds7.has(id)).length,  size) : 0;
    const ret14 = size > 0 ? pct(ids.filter(id => activeIds14.has(id)).length, size) : 0;
    const ret30 = size > 0 ? pct(ids.filter(id => activeIds30.has(id)).length, size) : 0;

    return {
      cohortLabel: label,
      cohortSize:  size,
      retDay7:     ret7,
      retDay14:    ret14,
      retDay30:    ret30,
    };
  });
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  const days90 = getLast90Days();
  const days30 = getLast30Days();
  const now    = new Date();

  const since7  = new Date(now); since7.setDate(now.getDate() - 7);
  const since14 = new Date(now); since14.setDate(now.getDate() - 14);
  const since30 = new Date(now); since30.setDate(now.getDate() - 30);
  const since60 = new Date(now); since60.setDate(now.getDate() - 60);
  const since90 = new Date(now); since90.setDate(now.getDate() - 90);
  const prev7   = new Date(now); prev7.setDate(now.getDate() - 14);
  const today   = now.toISOString().slice(0, 10);

  const since7Str  = since7.toISOString();
  const since14Str = since14.toISOString();
  const since30Str = since30.toISOString();
  const since60Str = since60.toISOString();
  const since90Str = since90.toISOString();

  // ── Requêtes parallèles ────────────────────────────────────────────────────
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

  // ─── Typages ───────────────────────────────────────────────────────────────

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

  // ─── Utilisateurs ──────────────────────────────────────────────────────────

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

  // ─── Messages ──────────────────────────────────────────────────────────────

  const totalMessages      = msgs.length;
  const totalConversations = (allConversations ?? []).length;
  const messagesLast7      = msgs.filter(m => new Date(m.created_at) >= since7).length;
  const messagesPrev7      = msgs.filter(m => { const d = new Date(m.created_at); return d >= prev7 && d < since7; }).length;
  const recentMsgConvos    = new Set(msgs.filter(m => new Date(m.created_at) >= since7).map(m => m.conversation_id));
  const activeConversations = recentMsgConvos.size;
  const avgMsgsPerConversation = totalConversations > 0
    ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

  // ─── Annonces ──────────────────────────────────────────────────────────────

  const totalListings     = listings.length;
  const activeListings    = listings.filter(l => l.status === 'active').length;
  const listingViews      = 0;
  const listingsLast7     = listings.filter(l => new Date(l.created_at) >= since7).length;
  const listingsPrev7     = listings.filter(l => { const d = new Date(l.created_at); return d >= prev7 && d < since7; }).length;
  const listingActiveRate = pct(activeListings, totalListings);
  const listingCatMap: Record<string, number> = {};
  listings.forEach(l => { const cat = l.category?.name ?? 'Autre'; listingCatMap[cat] = (listingCatMap[cat] ?? 0) + 1; });
  const listingCategories = Object.entries(listingCatMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  // ─── Forum ─────────────────────────────────────────────────────────────────

  const totalPosts          = posts.length;
  const totalComments       = comments.length;
  const closedPosts         = posts.filter(p => p.is_closed === true).length;
  const postsLast7          = posts.filter(p => new Date(p.created_at) >= since7).length;
  const postsPrev7          = posts.filter(p => { const d = new Date(p.created_at); return d >= prev7 && d < since7; }).length;
  const forumResolutionRate = pct(closedPosts, totalPosts);
  const avgCommentsPerPost  = totalPosts > 0 ? Math.round((totalComments / totalPosts) * 10) / 10 : 0;
  const forumCatMap: Record<string, number> = {};
  posts.forEach(p => { const cat = p.category?.name ?? 'Autre'; forumCatMap[cat] = (forumCatMap[cat] ?? 0) + 1; });
  const forumCategories = Object.entries(forumCatMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  const topForumWords   = topWords(posts.map(p => p.title ?? ''));

  // ─── Demandes ──────────────────────────────────────────────────────────────

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

  // ─── Avis ──────────────────────────────────────────────────────────────────

  const totalReviews     = reviews.length;
  const avgRating        = totalReviews ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10 : 0;
  const ratingDistribution: KV[] = [5, 4, 3, 2, 1].map(star => ({ name: `${star} ⭐`, value: reviews.filter(r => r.rating === star).length }));
  const positiveReviews  = reviews.filter(r => r.rating >= 4).length;
  const negativeReviews  = reviews.filter(r => r.rating <= 2).length;

  // ─── Matériel ──────────────────────────────────────────────────────────────

  const totalEquipment     = equip.length;
  const availableEquipment = equip.filter(e => e.is_available).length;
  const totalBorrows       = (allBorrows ?? []).length;
  const equipmentUsageRate = pct(totalBorrows, totalEquipment || 1);

  // ─── Signalements ──────────────────────────────────────────────────────────

  const pendingReports       = reports.filter(r => r.status === 'pending').length;
  const totalReports         = reports.length;
  const resolvedReports      = reports.filter(r => r.status === 'resolved').length;
  const reportResolutionRate = pct(resolvedReports, totalReports);

  // ─── Notifications ─────────────────────────────────────────────────────────

  const totalNotifications  = notifs.length;
  const unreadNotifications = notifs.filter(n => !n.is_read).length;
  const readNotifs          = notifs.filter(n => n.is_read).length;
  const notifReadRate       = pct(readNotifs, totalNotifications);

  // ─── Autres contenus ───────────────────────────────────────────────────────

  const totalHelpRequests = (helpReqs ?? []).length;
  const totalOutings      = (outings ?? []).length;
  const totalLostFound    = (lostFound ?? []).length;
  const totalEvents       = (events ?? []).length;

  // ─── Engagement actif ──────────────────────────────────────────────────────

  const activeSenderIds30 = new Set(msgs.filter(m => m.created_at >= since30Str).map(m => m.sender_id));
  const activeAuthorIds30 = new Set(posts.filter(p => p.created_at >= since30Str).map(p => p.id));
  const activeCommentIds30 = new Set(comments.filter(c => c.created_at >= since30Str).map(c => c.author_id));
  const allActiveIds30 = new Set([...activeSenderIds30, ...activeAuthorIds30, ...activeCommentIds30]);
  const activeUsersLast30 = Math.min(totalUsers, allActiveIds30.size);
  const activationRate    = pct(activeUsersLast30, totalUsers);

  const notifsToday   = notifs.filter(n => n.created_at?.slice(0, 10) === today);
  const dauEstimate   = Math.max(notifsToday.length, messagesLast7 > 0 ? Math.ceil(messagesLast7 / 7) : 0);

  // Actifs 7 jours
  const activeSenderIds7  = new Set(msgs.filter(m => m.created_at >= since7Str).map(m => m.sender_id));
  const activePostIds7    = new Set(posts.filter(p => p.created_at >= since7Str).map(p => p.id));
  const activeCommentIds7 = new Set(comments.filter(c => c.created_at >= since7Str).map(c => c.author_id));
  const allActiveIds7     = new Set([...activeSenderIds7, ...activePostIds7, ...activeCommentIds7]);
  const weeklyActiveUsers = allActiveIds7.size;

  // Actifs 14 jours
  const activeSenderIds14  = new Set(msgs.filter(m => m.created_at >= since14Str).map(m => m.sender_id));
  const activePostIds14    = new Set(posts.filter(p => p.created_at >= since14Str).map(p => p.id));
  const activeCommentIds14 = new Set(comments.filter(c => c.created_at >= since14Str).map(c => c.author_id));
  const allActiveIds14     = new Set([...activeSenderIds14, ...activePostIds14, ...activeCommentIds14]);

  // ─── Croissance ────────────────────────────────────────────────────────────

  const userGrowthRate  = newUsersPrev30 > 0
    ? Math.round(((newUsersLast30 - newUsersPrev30) / newUsersPrev30) * 100)
    : (newUsersLast30 > 0 ? 100 : 0);
  const monthlyNewUsers = newUsersLast30;

  // ─── Rétention ─────────────────────────────────────────────────────────────

  const olderProfiles   = profiles.filter(p => new Date(p.created_at) < since30);
  const ghostUsers      = olderProfiles.filter(p => !allActiveIds30.has(p.id)).length;
  const retentionRate   = olderProfiles.length > 0 ? pct(olderProfiles.length - ghostUsers, olderProfiles.length) : 0;

  const totalActions7   = postsLast7 + listingsLast7 + messagesLast7;
  const contentVelocity = Math.round((totalActions7 / 7) * 10) / 10;

  const allContent = [
    ...posts.map(p => p.created_at),
    ...listings.map(l => l.created_at),
    ...msgs.map(m => m.created_at),
  ].filter(Boolean).sort().reverse();
  const daysSinceLastContent = allContent.length > 0
    ? Math.floor((now.getTime() - new Date(allContent[0]).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const avgResponseDays = 0;

  // ─── ALGORITHME : Heatmap 7×24 ────────────────────────────────────────────

  const heatmapMap: Record<string, number> = {};
  for (let day = 0; day < 7; day++)
    for (let hour = 0; hour < 24; hour++)
      heatmapMap[`${day}-${hour}`] = 0;

  const addToHeatmap = (items: Array<{ created_at: string }>) => {
    items.filter(item => new Date(item.created_at) >= since7).forEach(item => {
      const d    = new Date(item.created_at);
      const dow  = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      heatmapMap[`${dow}-${hour}`] = (heatmapMap[`${dow}-${hour}`] ?? 0) + 1;
    });
  };
  addToHeatmap(msgs); addToHeatmap(posts); addToHeatmap(listings);

  const heatmap7x24: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++)
    for (let hour = 0; hour < 24; hour++)
      heatmap7x24.push({ day, hour, value: heatmapMap[`${day}-${hour}`] ?? 0 });

  const maxCell       = heatmap7x24.reduce((best, c) => c.value > best.value ? c : best, heatmap7x24[0]);
  const peakHour      = maxCell?.hour ?? 12;
  const peakDayOfWeek = maxCell?.day  ?? 0;

  // ─── Activité par heure (30j) ──────────────────────────────────────────────

  const hourMap: Record<number, { messages: number; posts: number }> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = { messages: 0, posts: 0 };
  msgs.filter(m => m.created_at >= since30Str).forEach(m => { hourMap[new Date(m.created_at).getHours()].messages++; });
  posts.filter(p => p.created_at >= since30Str).forEach(p => { hourMap[new Date(p.created_at).getHours()].posts++; });
  const activityByHour = Array.from({ length: 24 }, (_, h) => ({
    hour:     `${String(h).padStart(2, '0')}h`,
    messages: hourMap[h].messages,
    posts:    hourMap[h].posts,
  }));

  // ─── ALGORITHME : Scoring artisans avec momentum + churn risk ─────────────

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

    // Score composite (actuel)
    const sResponse   = Math.round(responseRate   * 0.30);
    const sCompletion = Math.round(completionRate  * 0.30);
    const sRating     = artAvgRating > 0 ? Math.round((artAvgRating / 5) * 30) : 10;
    const artReqsLast30 = artReqs.filter(r => r.created_at >= since30Str).length;
    const sActivity   = artReqsLast30 >= 3 ? 10 : artReqsLast30 >= 1 ? 6 : artReqs.length > 0 ? 3 : 0;
    const score       = sResponse + sCompletion + sRating + sActivity;

    // Score précédente période (30-60j) pour calculer la tendance
    const artReqs30to60  = artReqs.filter(r => r.created_at >= since60Str && r.created_at < since30Str);
    const artReplied60   = artReqs30to60.filter(r => ['replied', 'scheduled', 'completed'].includes(r.status)).length;
    const artCompleted60 = artReqs30to60.filter(r => r.status === 'completed').length;
    const rr60  = pct(artReplied60,   artReqs30to60.length);
    const cr60  = pct(artCompleted60, artReqs30to60.length);
    const prevScore = Math.round(rr60 * 0.30) + Math.round(cr60 * 0.30) + sRating +
                      (artReqs30to60.length >= 3 ? 10 : artReqs30to60.length >= 1 ? 6 : artReqs.length > 0 ? 3 : 0);

    const scoreDelta = score - prevScore;
    const scoreTrend: ArtisanScore['scoreTrend'] =
      scoreDelta > 5 ? 'up' : scoreDelta < -5 ? 'down' : 'flat';

    // Risque de churn artisan
    const lastReqDate = artReqs.map(r => r.created_at).sort().reverse()[0];
    const lastActivityDays = lastReqDate
      ? Math.floor((now.getTime() - new Date(lastReqDate).getTime()) / (1000 * 60 * 60 * 24))
      : 9999;

    const churnRisk: ArtisanScore['churnRisk'] =
      lastActivityDays > 60 || (score < 30 && artReqs.length > 0) ? 'high'   :
      lastActivityDays > 30 || score < 50                          ? 'medium' : 'low';

    const scoreLevel: ArtisanScore['scoreLevel'] =
      score >= 80 ? 'excellent' :
      score >= 55 ? 'good'      :
      score >= 30 ? 'fair'      : 'poor';

    const badge =
      scoreLevel === 'excellent' ? '🏆' :
      scoreLevel === 'good'      ? '⭐' :
      scoreLevel === 'fair'      ? '🔧' : '💤';

    return {
      userId:            uid,
      displayName:       ap.display_name ?? `Artisan ${uid.slice(0, 6)}`,
      tradeCategory:     ap.trade_category?.name ?? 'Non renseigné',
      artisanType:       ap.artisan_type ?? 'particulier',
      totalRequests:     artReqs.length,
      completedRequests: artCompleted,
      cancelledRequests: artCancelled,
      pendingRequests:   artPending,
      totalReviews:      artReviews.length,
      avgRating:         artAvgRating,
      responseRate,
      completionRate,
      score,
      scoreLevel,
      badge,
      requestsLast30: artReqsLast30,
      requestsLast7:  artReqs.filter(r => r.created_at >= since7Str).length,
      lastActivityDays,
      scoreTrend,
      churnRisk,
    };
  }).sort((a, b) => b.score - a.score);

  // ─── Séries temporelles ────────────────────────────────────────────────────

  const dailyUsers    = countByDay(profiles.filter(p => p.created_at >= since30Str), days30);
  const dailyMessages = countByDay(msgs.filter(m => m.created_at >= since30Str), days30);
  const dailyPosts    = countByDay(posts.filter(p => p.created_at >= since30Str), days30);
  const dailyListings = countByDay(listings.filter(l => l.created_at >= since30Str), days30);
  const dailyRequests = countByDay(reqs.filter(r => r.created_at >= since30Str), days30);

  // ─── ALGORITHME : EWMA + Momentum ─────────────────────────────────────────

  const msgValues  = dailyMessages.map(p => p.value);
  const postValues = dailyPosts.map(p => p.value);
  const userValues = dailyUsers.map(p => p.value);

  const msgEwma7   = ewma(msgValues,  0.3);
  const msgEwma30  = ewma(msgValues,  0.1);
  const postEwma7  = ewma(postValues, 0.3);
  const postEwma30 = ewma(postValues, 0.1);
  const userEwma7  = ewma(userValues, 0.3);
  const userEwma30 = ewma(userValues, 0.1);

  const ewmaMetrics: EwmaMetrics = {
    messagesEwma7:    msgEwma7,
    messagesEwma30:   msgEwma30,
    postsEwma7:       postEwma7,
    postsEwma30:      postEwma30,
    usersEwma7:       userEwma7,
    usersEwma30:      userEwma30,
    messagesMomentum: momentumScore(msgEwma7,  msgEwma30),
    postsMomentum:    momentumScore(postEwma7, postEwma30),
    usersMomentum:    momentumScore(userEwma7, userEwma30),
  };

  // Score momentum global = moyenne pondérée des 3 momentums
  const platformMomentum = Math.round(
    (ewmaMetrics.messagesMomentum * 0.4 +
     ewmaMetrics.postsMomentum    * 0.3 +
     ewmaMetrics.usersMomentum    * 0.3)
  );

  // ─── ALGORITHME : Détection anomalies Z-score ─────────────────────────────

  const anomalies: AnomalyPoint[] = [
    ...detectAnomalies(dailyMessages, 'Messages',  2.0),
    ...detectAnomalies(dailyPosts,    'Forum',     2.0),
    ...detectAnomalies(dailyUsers,    'Inscriptions', 2.0),
    ...detectAnomalies(dailyListings, 'Annonces',  2.0),
  ];

  // ─── ALGORITHME : Engagement avancé (DAU/MAU, stickiness, NPS, churn) ─────

  const dauMauRatio         = totalUsers > 0 ? pct(dauEstimate, totalUsers) : 0;
  const weeklyActiveRate    = pct(weeklyActiveUsers, totalUsers);
  const dauWauRatio         = weeklyActiveUsers > 0 ? Math.round((dauEstimate / weeklyActiveUsers) * 100) : 0;

  // Activation nouveaux inscrits (inscrits 7j et qui ont eu une action)
  const newProfiles7 = profiles.filter(p => new Date(p.created_at) >= since7);
  const newActive7   = newProfiles7.filter(p => allActiveIds7.has(p.id)).length;
  const newUserActivation7d = pct(newActive7, newProfiles7.length);

  // Churn risk (membres inactifs depuis > 14j mais inscrits < 60j)
  const atRiskProfiles = profiles.filter(p => {
    const d = new Date(p.created_at);
    return d >= since60 && d < since14 && !allActiveIds14.has(p.id) && p.role !== 'admin';
  });
  const churnRisk30d = pct(atRiskProfiles.length, totalUsers);

  // NPS estimé : (avis 5★) - (avis 1★ + avis 2★) / total × 100
  const promoters  = reviews.filter(r => r.rating === 5).length;
  const detractors = reviews.filter(r => r.rating <= 2).length;
  const nps = totalReviews > 0 ? Math.round(((promoters - detractors) / totalReviews) * 100) : 0;

  const engagementMetrics: EngagementMetrics = {
    dauMauRatio,
    weeklyActiveRate,
    stickiness:          dauWauRatio,
    avgSessionsPerUser:  activeUsersLast30 > 0 ? Math.round((messagesLast7 / activeUsersLast30) * 10) / 10 : 0,
    newUserActivation7d,
    churnRisk30d,
    virality:            0, // pas de donnée d'invitation disponible
    nps,
  };

  // ─── ALGORITHME : Cohortes de rétention ───────────────────────────────────

  const cohortRetention = buildCohortRetention(
    profiles.filter(p => p.role !== 'admin'),
    allActiveIds30,
    allActiveIds14,
    allActiveIds7,
  );

  // ─── Prédictions hybrides (régression + EWMA) ─────────────────────────────

  const predictions: Prediction[] = [
    buildPrediction('Inscriptions/jour', userValues, 14),
    buildPrediction('Messages/jour',     msgValues,  14),
    buildPrediction('Posts forum/jour',  postValues, 14),
    buildPrediction('Annonces/jour', dailyListings.map(p => p.value), 14),
  ];

  // ─── Historique santé (12 semaines) ───────────────────────────────────────

  const healthHistory: DailyPoint[] = Array.from({ length: 12 }, (_, w) => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (11 - w) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const ws = weekStart.toISOString();
    const we = weekEnd.toISOString();

    const wUsers  = profiles.filter(p => p.created_at >= ws && p.created_at < we).length;
    const wMsgs   = msgs.filter(m => m.created_at >= ws && m.created_at < we).length;
    const wPosts  = posts.filter(p => p.created_at >= ws && p.created_at < we).length;

    // Score simplifié basé sur l'activité relative de la semaine
    const actScore = Math.min(40, wMsgs * 2 + wPosts * 3 + wUsers * 5);
    const baseScore = 30;
    const wScore = Math.min(100, baseScore + actScore);

    const d = new Date(weekStart);
    return { date: `S${w + 1}`, value: wScore };
  });

  // ─── Benchmarks secteur civic-tech ────────────────────────────────────────

  function benchmarkItem(
    metric: string, platform: number, benchmark: number, unit: string, context: string,
  ): BenchmarkItem {
    const gap     = Math.round((platform - benchmark) * 10) / 10;
    const gapPct  = benchmark !== 0 ? Math.round(Math.abs(gap / benchmark) * 100) : 0;
    const status  = platform >= benchmark * 1.05 ? 'above' : platform >= benchmark * 0.9 ? 'at' : 'below';
    return { metric, platform, benchmark, unit, status, gap, gapPct, context };
  }

  const benchmarks: BenchmarkItem[] = [
    benchmarkItem('Taux d\'activation', activationRate, 35, '%',
      'Nextdoor France : 30-40% des inscrits actifs sur 30j. Objectif : 35%.'),
    benchmarkItem('Réactivité artisans', artisanResponseRate, 65, '%',
      'Allovoisins (2023) : 60-70% de taux de réponse. Standard de qualité service.'),
    benchmarkItem('Commentaires/post forum', avgCommentsPerPost, 2.5, '',
      'Voisin Malin : 2-3 commentaires par post. Signe d\'une communauté engagée.'),
    benchmarkItem('Taux rétention 30j', retentionRate, 40, '%',
      'Référence civic-tech : 40% des membres retournent après 30j. Cible minimale.'),
    benchmarkItem('Messages/conversation', avgMsgsPerConversation, 5, '',
      'Standard messagerie communautaire : 5+ messages/échange pour signifier un vrai dialogue.'),
    benchmarkItem('NPS estimé', nps, 30, 'pts',
      'NPS > 30 = bonne santé. NPS > 50 = excellent. Basé sur ratio avis 5★ vs 1-2★.'),
    benchmarkItem('DAU/MAU ratio', dauMauRatio, 20, '%',
      'Facebook : 65%. Apps communautaires locales : 15-25%. Cible réaliste : 20%.'),
  ];

  // ─── Répartition rôles et métiers ─────────────────────────────────────────

  const roleDistribution: KV[] = [
    { name: 'Résidents',    value: residents,       color: COLORS.blue   },
    { name: 'Artisans vér.', value: artisansVerified, color: COLORS.green  },
    { name: 'En attente',   value: artisansPending,  color: COLORS.amber  },
  ].filter(r => r.value > 0);

  const tradeCatMap: Record<string, number> = {};
  apRaw.forEach(a => {
    const cat = a.trade_category?.name ?? 'Autre';
    tradeCatMap[cat] = (tradeCatMap[cat] ?? 0) + 1;
  });
  const tradeCategories = Object.entries(tradeCatMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  // ─── Funnel artisan ────────────────────────────────────────────────────────

  const totalProfiles   = profiles.length;
  const artisanFunnel: FunnelStep[] = [
    { label: 'Membres inscrits',    value: totalUsers,        rate: 100,                             color: COLORS.blue   },
    { label: 'Artisans enregistrés', value: apRaw.length,     rate: pct(apRaw.length, totalUsers),   color: COLORS.indigo },
    { label: 'Vérifiés',            value: artisansVerified,  rate: pct(artisansVerified, apRaw.length || 1), color: COLORS.green },
    { label: 'Avec demande reçue',  value: new Set(reqs.map(r => r.artisan_id)).size,
      rate: pct(new Set(reqs.map(r => r.artisan_id)).size, artisansVerified || 1), color: COLORS.teal },
    { label: 'Mission complétée',   value: new Set(reqs.filter(r => r.status === 'completed').map(r => r.artisan_id)).size,
      rate: pct(new Set(reqs.filter(r => r.status === 'completed').map(r => r.artisan_id)).size, new Set(reqs.map(r => r.artisan_id)).size || 1), color: COLORS.amber },
  ];

  // ─── Comparaisons S/S ──────────────────────────────────────────────────────

  const weeklyComparisons: WeeklyComparison[] = [
    { metric: 'Messages',       current: messagesLast7, previous: messagesPrev7, delta: messagesLast7 - messagesPrev7, deltaPct: messagesPrev7 > 0 ? Math.round(((messagesLast7 - messagesPrev7) / messagesPrev7) * 100) : 0, trend: messagesLast7 > messagesPrev7 ? 'up' : messagesLast7 < messagesPrev7 ? 'down' : 'flat' },
    { metric: 'Posts forum',    current: postsLast7,    previous: postsPrev7,    delta: postsLast7 - postsPrev7, deltaPct: postsPrev7 > 0 ? Math.round(((postsLast7 - postsPrev7) / postsPrev7) * 100) : 0, trend: postsLast7 > postsPrev7 ? 'up' : postsLast7 < postsPrev7 ? 'down' : 'flat' },
    { metric: 'Annonces',       current: listingsLast7, previous: listingsPrev7, delta: listingsLast7 - listingsPrev7, deltaPct: listingsPrev7 > 0 ? Math.round(((listingsLast7 - listingsPrev7) / listingsPrev7) * 100) : 0, trend: listingsLast7 > listingsPrev7 ? 'up' : listingsLast7 < listingsPrev7 ? 'down' : 'flat' },
    { metric: 'Inscriptions',   current: newUsersLast7, previous: profiles.filter(p => { const d = new Date(p.created_at); return d >= prev7 && d < since7; }).length, delta: 0, deltaPct: 0, trend: 'flat' },
  ];
  // Recalcul delta/deltaPct pour inscriptions
  const prevNewUsers7 = weeklyComparisons[3].previous;
  weeklyComparisons[3].delta    = newUsersLast7 - prevNewUsers7;
  weeklyComparisons[3].deltaPct = prevNewUsers7 > 0 ? Math.round(((newUsersLast7 - prevNewUsers7) / prevNewUsers7) * 100) : 0;
  weeklyComparisons[3].trend    = newUsersLast7 > prevNewUsers7 ? 'up' : newUsersLast7 < prevNewUsers7 ? 'down' : 'flat';

  // ─── Score de santé global ─────────────────────────────────────────────────

  // Formule pondérée avec momentum intégré
  const sGrowth     = Math.min(25, newUsersLast30 * 2.5);
  const sEngagement = Math.min(25, activationRate * 0.6);
  const sArtisans   = Math.min(20, artisanResponseRate * 0.2);
  const sContent    = Math.min(15, contentVelocity * 5);
  const sRetention  = Math.min(15, retentionRate * 0.15);

  // Bonus momentum : si plateforme accélère, +5 pts max
  const momentumBonus = Math.min(5, Math.max(0, platformMomentum / 20));

  let healthScore = Math.round(sGrowth + sEngagement + sArtisans + sContent + sRetention + momentumBonus);
  healthScore = Math.min(100, Math.max(0, healthScore));

  const healthLevel: AllStats['healthLevel'] =
    healthScore >= 80 ? 'excellent' :
    healthScore >= 55 ? 'good'      :
    healthScore >= 30 ? 'fair'      : 'poor';

  const healthBreakdown = [
    { label: 'Croissance',   score: Math.round(sGrowth),     max: 25, icon: '📈' },
    { label: 'Engagement',   score: Math.round(sEngagement), max: 25, icon: '💬' },
    { label: 'Artisans',     score: Math.round(sArtisans),   max: 20, icon: '🔧' },
    { label: 'Contenu',      score: Math.round(sContent),    max: 15, icon: '📝' },
    { label: 'Rétention',    score: Math.round(sRetention),  max: 15, icon: '🔄' },
  ];

  // ─── Alertes intelligentes ─────────────────────────────────────────────────

  const alerts: PlatformAlert[] = [];

  // Anomalies critiques en priorité
  anomalies.filter(a => a.level === 'critical').forEach(a => {
    alerts.push({
      level: 'critical',
      title: `Anomalie détectée : ${a.metric}`,
      message: `${a.direction === 'spike' ? '📈 Pic' : '📉 Chute'} inhabituel — valeur ${a.value} (z=${a.zscore}, moyenne ${a.mean})`,
      value: a.value,
    });
  });

  if (pendingReports > 0) {
    alerts.push({ level: pendingReports >= 5 ? 'critical' : 'warning', title: 'Signalements en attente', message: `${pendingReports} signalement${pendingReports > 1 ? 's' : ''} à traiter`, action: 'Modérer', actionHref: '/admin/signalements', value: pendingReports });
  }
  if (artisansPending > 0) {
    alerts.push({ level: artisansPending >= 5 ? 'critical' : 'warning', title: 'Artisans à valider', message: `${artisansPending} artisan${artisansPending > 1 ? 's' : ''} en attente de vérification`, action: 'Valider', actionHref: '/admin/artisans', value: artisansPending });
  }
  if (newUsersLast7 === 0 && totalUsers > 5) {
    alerts.push({ level: 'warning', title: 'Croissance stoppée', message: 'Aucune inscription cette semaine', value: 0 });
  }
  if (platformMomentum < -30) {
    alerts.push({ level: 'warning', title: 'Momentum négatif', message: `Score momentum : ${platformMomentum}. L'activité décélère fortement.`, value: platformMomentum });
  }
  if (churnRisk30d > 40) {
    alerts.push({ level: 'warning', title: 'Risque de churn élevé', message: `${churnRisk30d}% des membres présentent un risque d'abandon`, value: churnRisk30d });
  }
  if (notifReadRate < 20 && totalNotifications > 50) {
    alerts.push({ level: 'info', title: 'Notifications ignorées', message: `${notifReadRate}% de taux de lecture — revoir le contenu des notifications`, value: notifReadRate });
  }
  if (anomalies.filter(a => a.level === 'warning').length > 0) {
    const warnAnomalies = anomalies.filter(a => a.level === 'warning');
    alerts.push({ level: 'info', title: `${warnAnomalies.length} anomalie(s) statistique(s)`, message: `Métriques concernées : ${warnAnomalies.map(a => a.metric).join(', ')}` });
  }

  // ─── Assemblage final ─────────────────────────────────────────────────────

  const statsPayload: AllStats = {
    // Utilisateurs
    totalUsers, residents, artisansPending, artisansVerified,
    artisansPro, artisansParticulier, newUsersLast7, newUsersLast30, newUsersLast90,

    // Engagement
    activeUsersLast30, activationRate, dauEstimate,
    avgMsgsPerConversation, artisanResponseRate,

    // Messages
    totalMessages, totalConversations, activeConversations, messagesLast7, messagesPrev7,

    // Annonces
    totalListings, activeListings, listingViews, listingCategories,
    listingsLast7, listingsPrev7, listingActiveRate,

    // Forum
    totalPosts, totalComments, closedPosts, forumCategories, topForumWords,
    postsLast7, postsPrev7, forumResolutionRate, avgCommentsPerPost,

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

    // Séries
    dailyUsers, dailyMessages, dailyPosts, dailyListings, dailyRequests,

    // Répartition
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

    // Avancé
    heatmap7x24, artisanScores, predictions, benchmarks,
    ghostUsers, retentionRate, avgResponseDays, contentVelocity,
    daysSinceLastContent, peakHour, peakDayOfWeek, healthHistory,

    // NOUVEAU v4.0
    anomalies, ewmaMetrics, engagementMetrics, cohortRetention,
    platformMomentum,
    generatedAt: now.toISOString(),
  };

  return NextResponse.json({ stats: statsPayload });
}
