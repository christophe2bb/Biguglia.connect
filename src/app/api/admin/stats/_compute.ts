/**
 * Module de calcul partagé — admin/stats
 *
 * Contient toute la logique de calcul des stats, utilisée par :
 *   • GET /api/admin/stats        (requête classique)
 *   • GET /api/admin/stats/stream (SSE push temps réel)
 *
 * Ainsi la logique est DRY (Don't Repeat Yourself) et les deux endpoints
 * produisent toujours des données identiques.
 */

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DailyPoint, KV, PlatformAlert, FunnelStep, WeeklyComparison,
  ArtisanScore, HeatmapCell, Prediction, PredictionPoint, BenchmarkItem,
  AnomalyPoint, EwmaMetrics, EngagementMetrics, CohortRetention,
  AllStats,
} from '@/app/admin/stats/_types';

// ─── Helpers temporels ────────────────────────────────────────────────────────

export function getLast30DaysValues(): string[] {
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

function countByDay(items: Array<{ created_at: string }>, days: string[]): DailyPoint[] {
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
  return den === 0 ? 0 : Math.round((num / den) * 100);
}

// ─── Algorithmes ──────────────────────────────────────────────────────────────

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

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

function meanVal(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

function ewma(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) result = alpha * values[i] + (1 - alpha) * result;
  return Math.round(result * 10) / 10;
}

function momentumScore(ewmaShort: number, ewmaLong: number): number {
  if (ewmaLong === 0) return ewmaShort > 0 ? 100 : 0;
  return Math.round(((ewmaShort - ewmaLong) / ewmaLong) * 100);
}

function buildPrediction(metric: string, dailyValues: number[], horizon = 14): Prediction {
  const { slope, intercept } = linearRegression(dailyValues);
  const sd  = stdDev(dailyValues);
  const n   = dailyValues.length;
  const avg = meanVal(dailyValues);

  const ewma7val  = ewma(dailyValues, 0.3);
  const ewma30val = ewma(dailyValues, 0.1);
  const momentum  = momentumScore(ewma7val, ewma30val);

  const points: PredictionPoint[] = [];
  dailyValues.forEach((v, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
    const predicted = Math.max(0, Math.round(intercept + slope * i));
    const band = Math.max(1, Math.round(sd * (1 + Math.abs(momentum) / 200)));
    points.push({ date: d.toISOString().slice(0, 10), actual: v, predicted, lower: Math.max(0, predicted - band), upper: predicted + band });
  });
  for (let h = 1; h <= horizon; h++) {
    const idx  = n - 1 + h;
    const regP = Math.max(0, intercept + slope * idx);
    const ewmP = Math.max(0, ewma7val + slope * h);
    const pred = Math.max(0, Math.round(0.6 * regP + 0.4 * ewmP));
    const band = Math.max(1, Math.round(sd * (1 + h / horizon)));
    const d = new Date(); d.setDate(d.getDate() + h);
    points.push({ date: d.toISOString().slice(0, 10), actual: null, predicted: pred, lower: Math.max(0, pred - band), upper: pred + band });
  }

  const trend: Prediction['trend'] = Math.abs(slope) < 0.05 ? 'flat' : slope > 0 ? 'up' : 'down';
  const ss_res = dailyValues.reduce((s, v, i) => s + (v - (intercept + slope * i)) ** 2, 0);
  const ss_tot = dailyValues.reduce((s, v) => s + (v - avg) ** 2, 0);
  const r2 = ss_tot > 0 ? 1 - ss_res / ss_tot : 0;
  const confidence = Math.round(Math.max(10, Math.min(95, r2 * 100)));

  const projectedIn14 = Math.max(0, Math.round(intercept + slope * (n + 13)));
  const delta14 = projectedIn14 - (dailyValues[n - 1] ?? 0);
  const momentumLabel = momentum > 20 ? '🚀 Forte accélération' : momentum > 5 ? '📈 En accélération' : momentum < -20 ? '⚠️ Forte décélération' : momentum < -5 ? '📉 En décélération' : '➡️ Stable';
  const insight = trend === 'up'
    ? `📈 ${momentumLabel} — projection +${delta14 >= 0 ? '+' : ''}${delta14} dans 14j (R²=${confidence}%)`
    : trend === 'down'
    ? `📉 ${momentumLabel} — projection ${delta14} dans 14j.`
    : `➡️ Stable — ${momentumLabel} (R²=${confidence}%)`;

  return { metric, horizon, points, trend, confidence, insight, momentumScore: momentum, ewma7: ewma7val, ewma30: ewma30val };
}

function detectAnomalies(series: DailyPoint[], metricName: string, threshold = 2.0): AnomalyPoint[] {
  const values = series.map(p => p.value);
  if (values.length < 5) return [];
  const μ = meanVal(values);
  const σ = stdDev(values);
  return series.slice(-7).flatMap(point => {
    const z = σ === 0 ? 0 : (point.value - μ) / σ;
    const absZ = Math.abs(z);
    if (absZ < threshold) return [];
    return [{
      date: point.date, metric: metricName, value: point.value,
      zscore: Math.round(z * 100) / 100, mean: Math.round(μ * 10) / 10,
      stddev: Math.round(σ * 10) / 10, level: absZ >= 3 ? 'critical' as const : 'warning' as const,
      direction: z > 0 ? 'spike' as const : 'drop' as const,
    }];
  });
}

function buildCohortRetention(
  profiles: Array<{ id: string; created_at: string }>,
  activeIds30: Set<string>, activeIds14: Set<string>, activeIds7: Set<string>,
): CohortRetention[] {
  const cohorts: Record<string, string[]> = {};
  profiles.forEach(p => {
    const k = p.created_at.slice(0, 7);
    if (!cohorts[k]) cohorts[k] = [];
    cohorts[k].push(p.id);
  });
  const monthLabels: Record<string, string> = {
    '01':'Jan','02':'Fév','03':'Mar','04':'Avr','05':'Mai','06':'Jun',
    '07':'Jul','08':'Aoû','09':'Sep','10':'Oct','11':'Nov','12':'Déc',
  };
  return Object.keys(cohorts).sort().reverse().slice(0, 3).map(month => {
    const ids = cohorts[month] ?? [];
    const size = ids.length;
    const [year, m] = month.split('-');
    return {
      cohortLabel: `${monthLabels[m] ?? m} ${year}`,
      cohortSize:  size,
      retDay7:     size > 0 ? pct(ids.filter(id => activeIds7.has(id)).length,  size) : 0,
      retDay14:    size > 0 ? pct(ids.filter(id => activeIds14.has(id)).length, size) : 0,
      retDay30:    size > 0 ? pct(ids.filter(id => activeIds30.has(id)).length, size) : 0,
    };
  });
}

function benchmarkItem(metric: string, platform: number, benchmark: number, unit: string, context: string): BenchmarkItem {
  const gap    = Math.round((platform - benchmark) * 10) / 10;
  const gapPct = benchmark !== 0 ? Math.round(Math.abs(gap / benchmark) * 100) : 0;
  const status = platform >= benchmark * 1.05 ? 'above' : platform >= benchmark * 0.9 ? 'at' : 'below';
  return { metric, platform, benchmark, unit, status, gap, gapPct, context };
}

// ─── Fonction principale de calcul ───────────────────────────────────────────

export async function computeAllStats(adminClient: SupabaseClient): Promise<AllStats> {
  const COLORS = { blue:'#3b82f6', green:'#22c55e', amber:'#f59e0b', red:'#ef4444',
                   purple:'#a855f7', teal:'#14b8a6', indigo:'#6366f1', pink:'#ec4899' };

  const days30 = getLast30DaysValues();
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

  const [
    { data: allProfiles }, { data: allMessages }, { data: allConversations },
    { data: allListings }, { data: allPosts }, { data: allComments },
    { data: allRequests }, { data: allReviews }, { data: allEquipment },
    { data: allBorrows }, { data: allReports }, { data: allNotifications },
    { data: artisanProfiles }, { data: helpReqs }, { data: outings },
    { data: lostFound }, { data: events },
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

  type Profile  = { id: string; role: string; created_at: string };
  type Msg      = { id: string; conversation_id: string; sender_id: string; created_at: string };
  type Listing  = { id: string; status: string; created_at: string; category: { name: string } | null };
  type Post     = { id: string; title: string; is_closed: boolean; created_at: string; category: { name: string } | null };
  type Comment  = { id: string; post_id: string; author_id: string; created_at: string };
  type Req      = { id: string; status: string; artisan_id: string; created_at: string };
  type Review   = { id: string; rating: number; artisan_id: string; created_at: string };
  type Equip    = { id: string; is_available: boolean; created_at: string };
  type Report   = { id: string; status: string; created_at: string };
  type Notif    = { id: string; is_read: boolean; created_at: string };
  type ArtPrf   = { id: string; user_id: string; artisan_type: string | null; trade_category: { name: string; icon: string } | null; display_name: string | null; created_at: string };

  const profiles  = (allProfiles ?? []) as Profile[];
  const msgs      = (allMessages ?? []) as Msg[];
  const listings  = (allListings ?? []) as unknown as Listing[];
  const posts     = (allPosts ?? []) as unknown as Post[];
  const comments  = (allComments ?? []) as Comment[];
  const reqs      = (allRequests ?? []) as Req[];
  const reviews   = (allReviews ?? []) as Review[];
  const equip     = (allEquipment ?? []) as Equip[];
  const reports   = (allReports ?? []) as Report[];
  const notifs    = (allNotifications ?? []) as Notif[];
  const apRaw     = (artisanProfiles ?? []) as unknown as ArtPrf[];

  // ── Métriques de base ──────────────────────────────────────────────────────
  const totalUsers        = profiles.filter(p => p.role !== 'admin').length;
  const residents         = profiles.filter(p => p.role === 'resident').length;
  const artisansPending   = profiles.filter(p => p.role === 'artisan_pending').length;
  const artisansVerified  = profiles.filter(p => p.role === 'artisan_verified').length;
  const newUsersLast7     = profiles.filter(p => new Date(p.created_at) >= since7).length;
  const newUsersLast30    = profiles.filter(p => new Date(p.created_at) >= since30).length;
  const newUsersLast90    = profiles.filter(p => new Date(p.created_at) >= since90).length;
  const newUsersPrev30    = profiles.filter(p => { const d = new Date(p.created_at); return d >= since60 && d < since30; }).length;
  const artisansPro       = apRaw.filter(a => a.artisan_type === 'professionnel').length;
  const artisansParticulier = apRaw.filter(a => a.artisan_type === 'particulier').length;

  const totalMessages      = msgs.length;
  const totalConversations = (allConversations ?? []).length;
  const messagesLast7      = msgs.filter(m => new Date(m.created_at) >= since7).length;
  const messagesPrev7      = msgs.filter(m => { const d = new Date(m.created_at); return d >= prev7 && d < since7; }).length;
  const recentMsgConvos    = new Set(msgs.filter(m => new Date(m.created_at) >= since7).map(m => m.conversation_id));
  const activeConversations = recentMsgConvos.size;
  const avgMsgsPerConversation = totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

  const totalListings     = listings.length;
  const activeListings    = listings.filter(l => l.status === 'active').length;
  const listingsLast7     = listings.filter(l => new Date(l.created_at) >= since7).length;
  const listingsPrev7     = listings.filter(l => { const d = new Date(l.created_at); return d >= prev7 && d < since7; }).length;
  const listingActiveRate = pct(activeListings, totalListings);
  const listingCatMap: Record<string, number> = {};
  listings.forEach(l => { const c = l.category?.name ?? 'Autre'; listingCatMap[c] = (listingCatMap[c] ?? 0) + 1; });
  const listingCategories = Object.entries(listingCatMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}));

  const totalPosts          = posts.length;
  const totalComments       = comments.length;
  const closedPosts         = posts.filter(p => p.is_closed).length;
  const postsLast7          = posts.filter(p => new Date(p.created_at) >= since7).length;
  const postsPrev7          = posts.filter(p => { const d = new Date(p.created_at); return d >= prev7 && d < since7; }).length;
  const forumResolutionRate = pct(closedPosts, totalPosts);
  const avgCommentsPerPost  = totalPosts > 0 ? Math.round((totalComments / totalPosts) * 10) / 10 : 0;
  const forumCatMap: Record<string, number> = {};
  posts.forEach(p => { const c = p.category?.name ?? 'Autre'; forumCatMap[c] = (forumCatMap[c] ?? 0) + 1; });
  const forumCategories = Object.entries(forumCatMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}));
  const topForumWords = topWords(posts.map(p => p.title ?? ''));

  const totalRequests           = reqs.length;
  const pendingRequests         = reqs.filter(r => r.status === 'submitted').length;
  const completedReqs           = reqs.filter(r => r.status === 'completed').length;
  const cancelledReqs           = reqs.filter(r => r.status === 'cancelled').length;
  const repliedReqs             = reqs.filter(r => ['replied','scheduled','completed'].includes(r.status)).length;
  const requestCompletionRate   = pct(completedReqs, totalRequests);
  const requestCancellationRate = pct(cancelledReqs, totalRequests);
  const artisanResponseRate     = pct(repliedReqs, totalRequests);
  const statusLabels: Record<string,string> = { submitted:'Soumises', viewed:'Vues', replied:'Répondues', scheduled:'Planifiées', completed:'Terminées', cancelled:'Annulées' };
  const reqStatusMap: Record<string,number> = {};
  reqs.forEach(r => { const k = statusLabels[r.status] ?? r.status; reqStatusMap[k] = (reqStatusMap[k] ?? 0) + 1; });
  const requestsByStatus = Object.entries(reqStatusMap).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));

  const totalReviews     = reviews.length;
  const avgRating        = totalReviews ? Math.round((reviews.reduce((s,r)=>s+r.rating,0)/totalReviews)*10)/10 : 0;
  const ratingDistribution: KV[] = [5,4,3,2,1].map(star=>({name:`${star} ⭐`,value:reviews.filter(r=>r.rating===star).length}));
  const positiveReviews  = reviews.filter(r => r.rating >= 4).length;
  const negativeReviews  = reviews.filter(r => r.rating <= 2).length;

  const totalEquipment      = equip.length;
  const availableEquipment  = equip.filter(e => e.is_available).length;
  const totalBorrows        = (allBorrows ?? []).length;
  const equipmentUsageRate  = pct(totalBorrows, totalEquipment || 1);

  const pendingReports       = reports.filter(r => r.status === 'pending').length;
  const totalReports         = reports.length;
  const resolvedReports      = reports.filter(r => r.status === 'resolved').length;
  const reportResolutionRate = pct(resolvedReports, totalReports);

  const totalNotifications  = notifs.length;
  const unreadNotifications = notifs.filter(n => !n.is_read).length;
  const notifReadRate       = pct(notifs.filter(n => n.is_read).length, totalNotifications);

  const totalHelpRequests = (helpReqs ?? []).length;
  const totalOutings      = (outings ?? []).length;
  const totalLostFound    = (lostFound ?? []).length;
  const totalEvents       = (events ?? []).length;

  // ── Engagement (sets d'IDs actifs) ────────────────────────────────────────
  const aS30 = new Set(msgs.filter(m=>m.created_at>=since30Str).map(m=>m.sender_id));
  const aP30 = new Set(posts.filter(p=>p.created_at>=since30Str).map(p=>p.id));
  const aC30 = new Set(comments.filter(c=>c.created_at>=since30Str).map(c=>c.author_id));
  const allActiveIds30 = new Set([...aS30,...aP30,...aC30]);
  const activeUsersLast30 = Math.min(totalUsers, allActiveIds30.size);
  const activationRate    = pct(activeUsersLast30, totalUsers);

  const aS7 = new Set(msgs.filter(m=>m.created_at>=since7Str).map(m=>m.sender_id));
  const aP7 = new Set(posts.filter(p=>p.created_at>=since7Str).map(p=>p.id));
  const aC7 = new Set(comments.filter(c=>c.created_at>=since7Str).map(c=>c.author_id));
  const allActiveIds7  = new Set([...aS7,...aP7,...aC7]);
  const weeklyActiveUsers = allActiveIds7.size;

  const aS14 = new Set(msgs.filter(m=>m.created_at>=since14Str).map(m=>m.sender_id));
  const aP14 = new Set(posts.filter(p=>p.created_at>=since14Str).map(p=>p.id));
  const aC14 = new Set(comments.filter(c=>c.created_at>=since14Str).map(c=>c.author_id));
  const allActiveIds14 = new Set([...aS14,...aP14,...aC14]);

  const notifsToday = notifs.filter(n => n.created_at?.slice(0,10) === today);
  const dauEstimate = Math.max(notifsToday.length, messagesLast7 > 0 ? Math.ceil(messagesLast7/7) : 0);

  const userGrowthRate  = newUsersPrev30 > 0 ? Math.round(((newUsersLast30-newUsersPrev30)/newUsersPrev30)*100) : (newUsersLast30>0?100:0);
  const monthlyNewUsers = newUsersLast30;

  const olderProfiles = profiles.filter(p => new Date(p.created_at) < since30);
  const ghostUsers    = olderProfiles.filter(p => !allActiveIds30.has(p.id)).length;
  const retentionRate = olderProfiles.length > 0 ? pct(olderProfiles.length - ghostUsers, olderProfiles.length) : 0;
  const totalActions7 = postsLast7 + listingsLast7 + messagesLast7;
  const contentVelocity = Math.round((totalActions7/7)*10)/10;
  const allContent = [...posts.map(p=>p.created_at),...listings.map(l=>l.created_at),...msgs.map(m=>m.created_at)].filter(Boolean).sort().reverse();
  const daysSinceLastContent = allContent.length > 0 ? Math.floor((now.getTime()-new Date(allContent[0]).getTime())/(86400000)) : 999;

  // ── Heatmap 7×24 ──────────────────────────────────────────────────────────
  const hm: Record<string,number> = {};
  for (let d=0;d<7;d++) for (let h=0;h<24;h++) hm[`${d}-${h}`]=0;
  const addHm = (items: Array<{created_at:string}>) => items.filter(i=>new Date(i.created_at)>=since7).forEach(i=>{
    const d = new Date(i.created_at);
    const k = `${(d.getDay()+6)%7}-${d.getHours()}`;
    hm[k]=(hm[k]??0)+1;
  });
  addHm(msgs); addHm(posts); addHm(listings);
  const heatmap7x24: HeatmapCell[] = [];
  for (let d=0;d<7;d++) for (let h=0;h<24;h++) heatmap7x24.push({day:d,hour:h,value:hm[`${d}-${h}`]??0});
  const maxCell = heatmap7x24.reduce((b,c)=>c.value>b.value?c:b,heatmap7x24[0]);
  const peakHour = maxCell?.hour ?? 12;
  const peakDayOfWeek = maxCell?.day ?? 0;

  // ── Activité par heure (30j) ───────────────────────────────────────────────
  const hourMap: Record<number,{messages:number;posts:number}> = {};
  for (let h=0;h<24;h++) hourMap[h]={messages:0,posts:0};
  msgs.filter(m=>m.created_at>=since30Str).forEach(m=>{hourMap[new Date(m.created_at).getHours()].messages++;});
  posts.filter(p=>p.created_at>=since30Str).forEach(p=>{hourMap[new Date(p.created_at).getHours()].posts++;});
  const activityByHour = Array.from({length:24},(_,h)=>({hour:`${String(h).padStart(2,'0')}h`,messages:hourMap[h].messages,posts:hourMap[h].posts}));

  // ── Scoring artisans ──────────────────────────────────────────────────────
  const artisanScores: ArtisanScore[] = apRaw.map(ap => {
    const uid = ap.user_id;
    const artReqs  = reqs.filter(r=>r.artisan_id===uid);
    const artCompleted = artReqs.filter(r=>r.status==='completed').length;
    const artCancelled = artReqs.filter(r=>r.status==='cancelled').length;
    const artPending   = artReqs.filter(r=>r.status==='submitted').length;
    const artReplied   = artReqs.filter(r=>['replied','scheduled','completed'].includes(r.status)).length;
    const artReviews   = reviews.filter(r=>r.artisan_id===uid);
    const artAvgRating = artReviews.length>0 ? Math.round((artReviews.reduce((s,r)=>s+r.rating,0)/artReviews.length)*10)/10 : 0;
    const responseRate   = pct(artReplied, artReqs.length);
    const completionRate = pct(artCompleted, artReqs.length);
    const artReqsLast30  = artReqs.filter(r=>r.created_at>=since30Str).length;
    const sResponse   = Math.round(responseRate*0.30);
    const sCompletion = Math.round(completionRate*0.30);
    const sRating     = artAvgRating>0 ? Math.round((artAvgRating/5)*30) : 10;
    const sActivity   = artReqsLast30>=3?10:artReqsLast30>=1?6:artReqs.length>0?3:0;
    const score       = sResponse+sCompletion+sRating+sActivity;
    const artReqs60 = artReqs.filter(r=>r.created_at>=since60Str&&r.created_at<since30Str);
    const prevScore = Math.round(pct(artReqs60.filter(r=>['replied','scheduled','completed'].includes(r.status)).length,artReqs60.length)*0.30)+Math.round(pct(artReqs60.filter(r=>r.status==='completed').length,artReqs60.length)*0.30)+sRating+(artReqs60.length>=3?10:artReqs60.length>=1?6:artReqs.length>0?3:0);
    const scoreTrend: ArtisanScore['scoreTrend'] = score-prevScore>5?'up':score-prevScore<-5?'down':'flat';
    const lastReqDate = artReqs.map(r=>r.created_at).sort().reverse()[0];
    const lastActivityDays = lastReqDate ? Math.floor((now.getTime()-new Date(lastReqDate).getTime())/86400000) : 9999;
    const churnRisk: ArtisanScore['churnRisk'] = lastActivityDays>60||(score<30&&artReqs.length>0)?'high':lastActivityDays>30||score<50?'medium':'low';
    const scoreLevel: ArtisanScore['scoreLevel'] = score>=80?'excellent':score>=55?'good':score>=30?'fair':'poor';
    const badge = scoreLevel==='excellent'?'🏆':scoreLevel==='good'?'⭐':scoreLevel==='fair'?'🔧':'💤';
    return { userId:uid, displayName:ap.display_name??`Artisan ${uid.slice(0,6)}`, tradeCategory:ap.trade_category?.name??'Non renseigné', artisanType:ap.artisan_type??'particulier', totalRequests:artReqs.length, completedRequests:artCompleted, cancelledRequests:artCancelled, pendingRequests:artPending, totalReviews:artReviews.length, avgRating:artAvgRating, responseRate, completionRate, score, scoreLevel, badge, requestsLast30:artReqsLast30, requestsLast7:artReqs.filter(r=>r.created_at>=since7Str).length, lastActivityDays, scoreTrend, churnRisk };
  }).sort((a,b)=>b.score-a.score);

  // ── Séries temporelles ────────────────────────────────────────────────────
  const dailyUsers    = countByDay(profiles.filter(p=>p.created_at>=since30Str), days30);
  const dailyMessages = countByDay(msgs.filter(m=>m.created_at>=since30Str), days30);
  const dailyPosts    = countByDay(posts.filter(p=>p.created_at>=since30Str), days30);
  const dailyListings = countByDay(listings.filter(l=>l.created_at>=since30Str), days30);
  const dailyRequests = countByDay(reqs.filter(r=>r.created_at>=since30Str), days30);

  // ── EWMA + Momentum ───────────────────────────────────────────────────────
  const msgV = dailyMessages.map(p=>p.value), postV = dailyPosts.map(p=>p.value), userV = dailyUsers.map(p=>p.value);
  const mE7=ewma(msgV,0.3),mE30=ewma(msgV,0.1),pE7=ewma(postV,0.3),pE30=ewma(postV,0.1),uE7=ewma(userV,0.3),uE30=ewma(userV,0.1);
  const ewmaMetrics: EwmaMetrics = { messagesEwma7:mE7, messagesEwma30:mE30, postsEwma7:pE7, postsEwma30:pE30, usersEwma7:uE7, usersEwma30:uE30, messagesMomentum:momentumScore(mE7,mE30), postsMomentum:momentumScore(pE7,pE30), usersMomentum:momentumScore(uE7,uE30) };
  const platformMomentum = Math.round(ewmaMetrics.messagesMomentum*0.4+ewmaMetrics.postsMomentum*0.3+ewmaMetrics.usersMomentum*0.3);

  // ── Anomalies Z-score ─────────────────────────────────────────────────────
  const anomalies: AnomalyPoint[] = [
    ...detectAnomalies(dailyMessages,'Messages',2.0),
    ...detectAnomalies(dailyPosts,'Forum',2.0),
    ...detectAnomalies(dailyUsers,'Inscriptions',2.0),
    ...detectAnomalies(dailyListings,'Annonces',2.0),
  ];

  // ── Engagement avancé ─────────────────────────────────────────────────────
  const dauMauRatio = pct(dauEstimate, totalUsers);
  const newProfiles7 = profiles.filter(p=>new Date(p.created_at)>=since7);
  const newActive7   = newProfiles7.filter(p=>allActiveIds7.has(p.id)).length;
  const atRiskProfiles = profiles.filter(p=>{const d=new Date(p.created_at);return d>=since60&&d<since14&&!allActiveIds14.has(p.id)&&p.role!=='admin';});
  const promoters  = reviews.filter(r=>r.rating===5).length;
  const detractors = reviews.filter(r=>r.rating<=2).length;
  const nps = totalReviews>0?Math.round(((promoters-detractors)/totalReviews)*100):0;
  const engagementMetrics: EngagementMetrics = { dauMauRatio, weeklyActiveRate:pct(weeklyActiveUsers,totalUsers), stickiness:weeklyActiveUsers>0?Math.round((dauEstimate/weeklyActiveUsers)*100):0, avgSessionsPerUser:activeUsersLast30>0?Math.round((messagesLast7/activeUsersLast30)*10)/10:0, newUserActivation7d:pct(newActive7,newProfiles7.length), churnRisk30d:pct(atRiskProfiles.length,totalUsers), virality:0, nps };

  // ── Cohortes ──────────────────────────────────────────────────────────────
  const cohortRetention = buildCohortRetention(profiles.filter(p=>p.role!=='admin'), allActiveIds30, allActiveIds14, allActiveIds7);

  // ── Prédictions ───────────────────────────────────────────────────────────
  const predictions: Prediction[] = [
    buildPrediction('Inscriptions/jour', userV, 14),
    buildPrediction('Messages/jour', msgV, 14),
    buildPrediction('Posts forum/jour', postV, 14),
    buildPrediction('Annonces/jour', dailyListings.map(p=>p.value), 14),
  ];

  // ── Historique santé ──────────────────────────────────────────────────────
  const healthHistory: DailyPoint[] = Array.from({length:12},(_,w)=>{
    const ws=new Date(now); ws.setDate(now.getDate()-(11-w)*7);
    const we=new Date(ws); we.setDate(ws.getDate()+7);
    const wss=ws.toISOString(),wes=we.toISOString();
    const wU=profiles.filter(p=>p.created_at>=wss&&p.created_at<wes).length;
    const wM=msgs.filter(m=>m.created_at>=wss&&m.created_at<wes).length;
    const wP=posts.filter(p=>p.created_at>=wss&&p.created_at<wes).length;
    return {date:`S${w+1}`,value:Math.min(100,30+Math.min(40,wM*2+wP*3+wU*5))};
  });

  // ── Benchmarks ────────────────────────────────────────────────────────────
  const benchmarks: BenchmarkItem[] = [
    benchmarkItem('Taux d\'activation', activationRate, 35, '%', 'Nextdoor France : 30-40% actifs/30j.'),
    benchmarkItem('Réactivité artisans', artisanResponseRate, 65, '%', 'Allovoisins (2023) : 60-70% taux réponse.'),
    benchmarkItem('Commentaires/post', avgCommentsPerPost, 2.5, '', 'Voisin Malin : 2-3 commentaires/post.'),
    benchmarkItem('Rétention 30j', retentionRate, 40, '%', 'Référence civic-tech : 40% rétention.'),
    benchmarkItem('Msgs/conversation', avgMsgsPerConversation, 5, '', 'Standard messagerie : 5+ msgs/échange.'),
    benchmarkItem('NPS estimé', nps, 30, 'pts', 'NPS > 30 = bonne santé communautaire.'),
    benchmarkItem('DAU/MAU ratio', dauMauRatio, 20, '%', 'Apps locales : 15-25%. Cible : 20%.'),
  ];

  // ── Répartition ───────────────────────────────────────────────────────────
  const roleDistribution: KV[] = [{name:'Résidents',value:residents,color:COLORS.blue},{name:'Artisans vér.',value:artisansVerified,color:COLORS.green},{name:'En attente',value:artisansPending,color:COLORS.amber}].filter(r=>r.value>0);
  const tradeCatMap: Record<string,number> = {};
  apRaw.forEach(a=>{const c=a.trade_category?.name??'Autre';tradeCatMap[c]=(tradeCatMap[c]??0)+1;});
  const tradeCategories = Object.entries(tradeCatMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}));
  const artisanFunnel: FunnelStep[] = [
    {label:'Membres inscrits',value:totalUsers,rate:100,color:COLORS.blue},
    {label:'Artisans enregistrés',value:apRaw.length,rate:pct(apRaw.length,totalUsers),color:COLORS.indigo},
    {label:'Vérifiés',value:artisansVerified,rate:pct(artisansVerified,apRaw.length||1),color:COLORS.green},
    {label:'Avec demande',value:new Set(reqs.map(r=>r.artisan_id)).size,rate:pct(new Set(reqs.map(r=>r.artisan_id)).size,artisansVerified||1),color:COLORS.teal},
    {label:'Mission complétée',value:new Set(reqs.filter(r=>r.status==='completed').map(r=>r.artisan_id)).size,rate:pct(new Set(reqs.filter(r=>r.status==='completed').map(r=>r.artisan_id)).size,new Set(reqs.map(r=>r.artisan_id)).size||1),color:COLORS.amber},
  ];

  // ── Comparaisons S/S ──────────────────────────────────────────────────────
  const prevNewUsers7 = profiles.filter(p=>{const d=new Date(p.created_at);return d>=prev7&&d<since7;}).length;
  const weeklyComparisons: WeeklyComparison[] = [
    {metric:'Messages',current:messagesLast7,previous:messagesPrev7,delta:messagesLast7-messagesPrev7,deltaPct:messagesPrev7>0?Math.round(((messagesLast7-messagesPrev7)/messagesPrev7)*100):0,trend:messagesLast7>messagesPrev7?'up':messagesLast7<messagesPrev7?'down':'flat'},
    {metric:'Posts forum',current:postsLast7,previous:postsPrev7,delta:postsLast7-postsPrev7,deltaPct:postsPrev7>0?Math.round(((postsLast7-postsPrev7)/postsPrev7)*100):0,trend:postsLast7>postsPrev7?'up':postsLast7<postsPrev7?'down':'flat'},
    {metric:'Annonces',current:listingsLast7,previous:listingsPrev7,delta:listingsLast7-listingsPrev7,deltaPct:listingsPrev7>0?Math.round(((listingsLast7-listingsPrev7)/listingsPrev7)*100):0,trend:listingsLast7>listingsPrev7?'up':listingsLast7<listingsPrev7?'down':'flat'},
    {metric:'Inscriptions',current:newUsersLast7,previous:prevNewUsers7,delta:newUsersLast7-prevNewUsers7,deltaPct:prevNewUsers7>0?Math.round(((newUsersLast7-prevNewUsers7)/prevNewUsers7)*100):0,trend:newUsersLast7>prevNewUsers7?'up':newUsersLast7<prevNewUsers7?'down':'flat'},
  ];

  // ── Score de santé ────────────────────────────────────────────────────────
  const sG = Math.min(25, newUsersLast30*2.5);
  const sE = Math.min(25, activationRate*0.6);
  const sA = Math.min(20, artisanResponseRate*0.2);
  const sC = Math.min(15, contentVelocity*5);
  const sR = Math.min(15, retentionRate*0.15);
  const mB = Math.min(5, Math.max(0, platformMomentum/20));
  const healthScore = Math.min(100, Math.max(0, Math.round(sG+sE+sA+sC+sR+mB)));
  const healthLevel: AllStats['healthLevel'] = healthScore>=80?'excellent':healthScore>=55?'good':healthScore>=30?'fair':'poor';
  const healthBreakdown = [{label:'Croissance',score:Math.round(sG),max:25,icon:'📈'},{label:'Engagement',score:Math.round(sE),max:25,icon:'💬'},{label:'Artisans',score:Math.round(sA),max:20,icon:'🔧'},{label:'Contenu',score:Math.round(sC),max:15,icon:'📝'},{label:'Rétention',score:Math.round(sR),max:15,icon:'🔄'}];

  // ── Alertes ───────────────────────────────────────────────────────────────
  const alerts: PlatformAlert[] = [];
  anomalies.filter(a=>a.level==='critical').forEach(a=>{alerts.push({level:'critical',title:`Anomalie : ${a.metric}`,message:`${a.direction==='spike'?'📈 Pic':'📉 Chute'} inhabituel — valeur ${a.value} (z=${a.zscore})`,value:a.value});});
  if (pendingReports>0) alerts.push({level:pendingReports>=5?'critical':'warning',title:'Signalements en attente',message:`${pendingReports} signalement${pendingReports>1?'s':''} à traiter`,action:'Modérer',actionHref:'/admin/signalements',value:pendingReports});
  if (artisansPending>0) alerts.push({level:artisansPending>=5?'critical':'warning',title:'Artisans à valider',message:`${artisansPending} artisan${artisansPending>1?'s':''} en attente`,action:'Valider',actionHref:'/admin/artisans',value:artisansPending});
  if (newUsersLast7===0&&totalUsers>5) alerts.push({level:'warning',title:'Croissance stoppée',message:'Aucune inscription cette semaine',value:0});
  if (platformMomentum<-30) alerts.push({level:'warning',title:'Momentum négatif',message:`Score momentum : ${platformMomentum}. L'activité décélère.`,value:platformMomentum});
  if (engagementMetrics.churnRisk30d>40) alerts.push({level:'warning',title:'Risque de churn élevé',message:`${engagementMetrics.churnRisk30d}% des membres risquent l'abandon`,value:engagementMetrics.churnRisk30d});
  if (notifReadRate<20&&totalNotifications>50) alerts.push({level:'info',title:'Notifications ignorées',message:`${notifReadRate}% de taux de lecture`,value:notifReadRate});

  return {
    totalUsers, residents, artisansPending, artisansVerified, artisansPro, artisansParticulier,
    newUsersLast7, newUsersLast30, newUsersLast90,
    activeUsersLast30, activationRate, dauEstimate, avgMsgsPerConversation, artisanResponseRate,
    totalMessages, totalConversations, activeConversations, messagesLast7, messagesPrev7,
    totalListings, activeListings, listingViews:0, listingCategories, listingsLast7, listingsPrev7, listingActiveRate,
    totalPosts, totalComments, closedPosts, forumCategories, topForumWords, postsLast7, postsPrev7, forumResolutionRate, avgCommentsPerPost,
    totalRequests, requestsByStatus, requestCompletionRate, requestCancellationRate, pendingRequests,
    totalReviews, avgRating, ratingDistribution, positiveReviews, negativeReviews,
    totalEquipment, availableEquipment, totalBorrows, equipmentUsageRate,
    pendingReports, totalReports, resolvedReports, reportResolutionRate,
    totalNotifications, unreadNotifications, notifReadRate,
    dailyUsers, dailyMessages, dailyPosts, dailyListings, dailyRequests,
    roleDistribution, tradeCategories, activityByHour,
    healthScore, healthLevel, healthBreakdown,
    alerts, weeklyComparisons, artisanFunnel,
    userGrowthRate, monthlyNewUsers,
    totalHelpRequests, totalOutings, totalLostFound, totalEvents,
    heatmap7x24, artisanScores, predictions, benchmarks,
    ghostUsers, retentionRate, avgResponseDays:0, contentVelocity, daysSinceLastContent, peakHour, peakDayOfWeek, healthHistory,
    anomalies, ewmaMetrics, engagementMetrics, cohortRetention, platformMomentum,
    generatedAt: now.toISOString(),
  };
}
