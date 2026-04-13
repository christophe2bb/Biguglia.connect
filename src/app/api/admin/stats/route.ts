/**
 * API Route — GET /api/admin/stats
 *
 * Retourne les statistiques complètes pour le tableau de bord admin/stats.
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) contourne la RLS
 *   • Avant ce correctif, admin/stats/_hooks/useAdminStats.ts appelait
 *     createClient() côté navigateur avec la clé anon. Cela exposait des
 *     données agrégées sensibles (emails, téléphones via profiles, compteurs
 *     exhaustifs de messages, signalements, etc.) à tout utilisateur
 *     authentifié capable de rejouer les mêmes requêtes Supabase.
 *
 * Réponse : { stats: AdminAllStats }
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ─── Types de réponse ────────────────────────────────────────────────────────

export interface DailyPoint { date: string; value: number }
export interface NameValue   { name: string; value: number }
export interface NameValueColor extends NameValue { color: string }

export interface AdminAllStats {
  // Utilisateurs
  totalUsers: number;
  residents: number;
  artisansPending: number;
  artisansVerified: number;
  artisansPro: number;
  artisansParticulier: number;
  newUsersLast7: number;
  newUsersLast30: number;
  // Messages
  totalMessages: number;
  totalConversations: number;
  // Annonces
  totalListings: number;
  activeListings: number;
  listingViews: number;
  listingCategories: NameValue[];
  // Forum
  totalPosts: number;
  totalComments: number;
  closedPosts: number;
  forumCategories: NameValue[];
  topForumWords: NameValue[];
  // Demandes artisans
  totalRequests: number;
  requestsByStatus: NameValue[];
  // Avis
  totalReviews: number;
  avgRating: number;
  // Matériel
  totalEquipment: number;
  availableEquipment: number;
  totalBorrows: number;
  // Signalements
  pendingReports: number;
  totalReports: number;
  // Notifications
  totalNotifications: number;
  unreadNotifications: number;
  // Séries temporelles
  dailyUsers: DailyPoint[];
  dailyMessages: DailyPoint[];
  dailyPosts: DailyPoint[];
  dailyListings: DailyPoint[];
  // Répartition
  roleDistribution: NameValueColor[];
  tradeCategories: NameValue[];
  activityByHour: { hour: string; messages: number; posts: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COLORS = { blue: '#3b82f6', green: '#22c55e', amber: '#f59e0b' } as const;

/** Génère les 30 derniers jours sous forme 'YYYY-MM-DD' */
function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function countByDay(
  items: Array<{ created_at: string }>,
  days: string[],
): DailyPoint[] {
  const map: Record<string, number> = {};
  items.forEach(item => {
    const day = item.created_at.slice(0, 10);
    map[day] = (map[day] ?? 0) + 1;
  });
  return days.map(date => ({ date, value: map[date] ?? 0 }));
}

function topWords(titles: string[], n = 10): NameValue[] {
  const stopWords = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'pour', 'avec', 'dans', 'sur', 'au', 'aux', 'par', 'à', 'ou', 'il', 'elle', 'on', 'je', 'tu', 'nous', 'vous', 'ils', 'qui', 'que', 'quoi', 'dont', 'où']);
  const freq: Record<string, number> = {};
  titles.forEach(t =>
    t.toLowerCase().replace(/[^a-zàâäéèêëîïôùûüç\s-]/g, '').split(/\s+/).forEach(w => {
      if (w.length > 2 && !stopWords.has(w)) freq[w] = (freq[w] ?? 0) + 1;
    }),
  );
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  const days    = getLast30Days();
  const since30 = new Date(); since30.setDate(since30.getDate() - 30);
  const since7  = new Date(); since7.setDate(since7.getDate() - 7);

  // ── Requêtes parallèles (service role — bypass RLS) ───────────────────────
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
  ] = await Promise.all([
    adminClient.from('profiles').select('id, role, created_at').order('created_at'),
    adminClient.from('messages').select('id, created_at').order('created_at'),
    adminClient.from('conversations').select('id, created_at'),
    adminClient.from('listings').select('id, status, views_count, created_at, category:listing_categories(name)').order('created_at'),
    adminClient.from('forum_posts').select('id, title, status, created_at, category:forum_categories(name)').order('created_at'),
    adminClient.from('forum_comments').select('id, created_at').order('created_at'),
    adminClient.from('service_requests').select('id, status, created_at').order('created_at'),
    adminClient.from('reviews').select('id, rating, created_at'),
    adminClient.from('equipment_items').select('id, is_available, created_at'),
    adminClient.from('equipment_loans').select('id, created_at').order('created_at'),
    adminClient.from('reports').select('id, status, created_at'),
    adminClient.from('notifications').select('id, is_read, created_at'),
    adminClient.from('artisan_profiles').select('id, artisan_type, trade_category:trade_categories(name, icon)'),
  ]);

  // ── Calculs ───────────────────────────────────────────────────────────────

  const profiles         = (allProfiles ?? []) as Array<{ id: string; role: string; created_at: string }>;
  const totalUsers       = profiles.filter(p => p.role !== 'admin').length;
  const residents        = profiles.filter(p => p.role === 'resident').length;
  const artisansPending  = profiles.filter(p => p.role === 'artisan_pending').length;
  const artisansVerified = profiles.filter(p => p.role === 'artisan_verified').length;
  const newUsersLast7    = profiles.filter(p => new Date(p.created_at) >= since7).length;
  const newUsersLast30   = profiles.filter(p => new Date(p.created_at) >= since30).length;

  const apRaw = (artisanProfiles ?? []) as unknown as Array<{ id: string; artisan_type: string | null; trade_category: { name: string; icon: string } | null }>;
  const artisansPro        = apRaw.filter(a => a.artisan_type === 'professionnel').length;
  const artisansParticulier = apRaw.filter(a => a.artisan_type === 'particulier').length;

  const msgs              = (allMessages ?? []) as Array<{ id: string; created_at: string }>;
  const totalMessages     = msgs.length;
  const totalConversations = (allConversations ?? []).length;

  const listings      = (allListings ?? []) as unknown as Array<{ id: string; status: string; views_count: number | null; created_at: string; category: { name: string } | null }>;
  const totalListings  = listings.length;
  const activeListings = listings.filter(l => l.status === 'active').length;
  const listingViews   = listings.reduce((s, l) => s + (l.views_count ?? 0), 0);
  const listingCatMap: Record<string, number> = {};
  listings.forEach(l => { const cat = l.category?.name ?? 'Autre'; listingCatMap[cat] = (listingCatMap[cat] ?? 0) + 1; });
  const listingCategories = Object.entries(listingCatMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  const posts         = (allPosts ?? []) as unknown as Array<{ id: string; title: string; status: string; created_at: string; category: { name: string } | null }>;
  const totalPosts    = posts.length;
  const totalComments = (allComments ?? []).length;
  const closedPosts   = posts.filter(p => p.status === 'closed').length;
  const forumCatMap: Record<string, number> = {};
  posts.forEach(p => { const cat = p.category?.name ?? 'Autre'; forumCatMap[cat] = (forumCatMap[cat] ?? 0) + 1; });
  const forumCategories = Object.entries(forumCatMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  const topForumWords = topWords(posts.map(p => p.title ?? ''));

  const reqs          = (allRequests ?? []) as Array<{ id: string; status: string; created_at: string }>;
  const totalRequests = reqs.length;
  const statusLabels: Record<string, string> = {
    submitted: 'Soumises', viewed: 'Vues', replied: 'Répondues',
    scheduled: 'Planifiées', completed: 'Terminées', cancelled: 'Annulées',
  };
  const reqStatusMap: Record<string, number> = {};
  reqs.forEach(r => { const k = statusLabels[r.status] ?? r.status; reqStatusMap[k] = (reqStatusMap[k] ?? 0) + 1; });
  const requestsByStatus = Object.entries(reqStatusMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const reviews      = (allReviews ?? []) as Array<{ id: string; rating: number; created_at: string }>;
  const totalReviews = reviews.length;
  const avgRating    = totalReviews ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10 : 0;

  const equip             = (allEquipment ?? []) as Array<{ id: string; is_available: boolean; created_at: string }>;
  const totalEquipment    = equip.length;
  const availableEquipment = equip.filter(e => e.is_available).length;
  const totalBorrows      = (allBorrows ?? []).length;

  const reports        = (allReports ?? []) as Array<{ id: string; status: string; created_at: string }>;
  const pendingReports = reports.filter(r => r.status === 'pending').length;
  const totalReports   = reports.length;

  const notifs             = (allNotifications ?? []) as Array<{ id: string; is_read: boolean; created_at: string }>;
  const totalNotifications = notifs.length;
  const unreadNotifications = notifs.filter(n => !n.is_read).length;

  // ── Séries temporelles ────────────────────────────────────────────────────
  const since30Str = since30.toISOString();
  const dailyUsers    = countByDay(profiles.filter(p => p.created_at >= since30Str), days);
  const dailyMessages = countByDay(msgs.filter(m => m.created_at >= since30Str), days);
  const dailyPosts    = countByDay(posts.filter(p => p.created_at >= since30Str), days);
  const dailyListings = countByDay(listings.filter(l => l.created_at >= since30Str), days);

  // ── Répartition rôles ────────────────────────────────────────────────────
  const roleDistribution: NameValueColor[] = [
    { name: 'Habitants',           value: residents,        color: COLORS.blue  },
    { name: 'Artisans vérifiés',   value: artisansVerified, color: COLORS.green },
    { name: 'Artisans en attente', value: artisansPending,  color: COLORS.amber },
  ].filter(r => r.value > 0);

  // ── Catégories artisans ──────────────────────────────────────────────────
  const tradeCatMap: Record<string, number> = {};
  apRaw.forEach(a => { const cat = a.trade_category?.name ?? 'Autre'; tradeCatMap[cat] = (tradeCatMap[cat] ?? 0) + 1; });
  const tradeCategories = Object.entries(tradeCatMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  // ── Activité par heure ────────────────────────────────────────────────────
  const hourMap: Record<number, { messages: number; posts: number }> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = { messages: 0, posts: 0 };
  msgs.filter(m => m.created_at >= since30Str).forEach(m => { hourMap[new Date(m.created_at).getHours()].messages++; });
  posts.filter(p => p.created_at >= since30Str).forEach(p => { hourMap[new Date(p.created_at).getHours()].posts++; });
  const activityByHour = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}h`,
    messages: hourMap[h].messages,
    posts:    hourMap[h].posts,
  }));

  const stats: AdminAllStats = {
    totalUsers, residents, artisansPending, artisansVerified,
    artisansPro, artisansParticulier, newUsersLast7, newUsersLast30,
    totalMessages, totalConversations,
    totalListings, activeListings, listingViews, listingCategories,
    totalPosts, totalComments, closedPosts, forumCategories, topForumWords,
    totalRequests, requestsByStatus,
    totalReviews, avgRating,
    totalEquipment, availableEquipment, totalBorrows,
    pendingReports, totalReports,
    totalNotifications, unreadNotifications,
    dailyUsers, dailyMessages, dailyPosts, dailyListings,
    roleDistribution, tradeCategories, activityByHour,
  };

  return NextResponse.json({ stats });
}
