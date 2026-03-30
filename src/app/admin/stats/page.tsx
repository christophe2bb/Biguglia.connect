'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Wrench, MessageSquare, Package, TrendingUp,
  ChevronLeft, Activity, Star, Flag, Bell, BarChart2,
  RefreshCw, HardHat, Users2, Eye, FileText, ShoppingBag,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

// ─── Couleurs ──────────────────────────────────────────────
const COLORS = {
  brand: '#f97316',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  red: '#ef4444',
  amber: '#f59e0b',
  teal: '#14b8a6',
  indigo: '#6366f1',
  pink: '#ec4899',
  gray: '#94a3b8',
};
const PIE_COLORS = [COLORS.brand, COLORS.blue, COLORS.green, COLORS.purple, COLORS.red, COLORS.amber];

// ─── Types ──────────────────────────────────────────────────
interface DailyPoint { date: string; value: number }
interface KV { name: string; value: number; color?: string }

interface AllStats {
  // Utilisateurs
  totalUsers: number;
  residents: number;
  artisansPending: number;
  artisansVerified: number;
  artisansPro: number;
  artisansParticulier: number;
  newUsersLast7: number;
  newUsersLast30: number;
  // Messages & conversations
  totalMessages: number;
  totalConversations: number;
  // Annonces
  totalListings: number;
  activeListings: number;
  listingViews: number;
  // Forum
  totalPosts: number;
  totalComments: number;
  closedPosts: number;
  // Demandes artisans
  totalRequests: number;
  requestsByStatus: KV[];
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
  // Séries temporelles (30 jours)
  dailyUsers: DailyPoint[];
  dailyMessages: DailyPoint[];
  dailyPosts: DailyPoint[];
  dailyListings: DailyPoint[];
  // Répartition
  roleDistribution: KV[];
  listingCategories: KV[];
  forumCategories: KV[];
  tradeCategories: KV[];
  // Recherches top mots (forum titles)
  topForumWords: KV[];
  // Activité par heure (messages)
  activityByHour: { hour: string; messages: number; posts: number }[];
}

// ─── Helpers ────────────────────────────────────────────────
function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

function countByDay(rows: { created_at: string }[], days: string[]): DailyPoint[] {
  const map: Record<string, number> = {};
  days.forEach(d => { map[d] = 0; });
  rows.forEach(r => {
    const d = r.created_at?.slice(0, 10);
    if (d && map[d] !== undefined) map[d]++;
  });
  return days.map(d => ({ date: d.slice(5), value: map[d] }));
}

function topWords(texts: string[], count = 12): KV[] {
  const stop = new Set(['le','la','les','de','du','des','un','une','et','en','au','aux','pour','par','sur','dans','avec','est','pas','que','qui','ce','je','il','elle','nous','vous','ils','sont','se','ne','à','ou','je','mon','ma','mes','ton','ta','ses','son','notre','votre','leurs','ça','a','y']);
  const freq: Record<string, number> = {};
  texts.forEach(t =>
    t.toLowerCase().replace(/[^a-zàâéèêîôùûç\s]/g, ' ').split(/\s+/).forEach(w => {
      if (w.length > 3 && !stop.has(w)) freq[w] = (freq[w] || 0) + 1;
    })
  );
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([name, value]) => ({ name, value }));
}

// ─── Mini composants ────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${bg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, color = 'text-gray-700' }: {
  icon: React.ElementType; title: string; color?: string;
}) {
  return (
    <h2 className={`flex items-center gap-2 text-lg font-bold mb-4 ${color}`}>
      <Icon className="w-5 h-5" /> {title}
    </h2>
  );
}

const fmt = new Intl.NumberFormat('fr-FR');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtTooltip = (v: any) => fmt.format(Number(v));

// ─── Page principale ─────────────────────────────────────────
export default function AdminStatsPage() {
  const { profile, isAdmin } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<AllStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    if (!isAdmin()) { router.push('/'); return; }
    fetchAllStats();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAllStats = async () => {
    setLoading(true);
    const supabase = createClient();
    const days = getLast30Days();
    const since30 = new Date(); since30.setDate(since30.getDate() - 30);
    const since7  = new Date(); since7.setDate(since7.getDate() - 7);

    // ── Requêtes parallèles ──────────────────────────────────
    const [
      { data: allProfiles },
      { data: allMessages },
      { data: allConversations },
      { data: allListings },
      { data: allListingCats },
      { data: allPosts },
      { data: allComments },
      { data: allRequests },
      { data: allReviews },
      { data: allEquipment },
      { data: allBorrows },
      { data: allReports },
      { data: allNotifications },
      { data: artisanProfiles },
      { data: tradeCats },
    ] = await Promise.all([
      supabase.from('profiles').select('id, role, created_at').order('created_at'),
      supabase.from('messages').select('id, created_at').order('created_at'),
      supabase.from('conversations').select('id, created_at'),
      supabase.from('listings').select('id, status, views_count, created_at, category:listing_categories(name)').order('created_at'),
      supabase.from('listing_categories').select('id, name'),
      supabase.from('forum_posts').select('id, title, status, created_at, category:forum_categories(name)').order('created_at'),
      supabase.from('forum_comments').select('id, created_at').order('created_at'),
      supabase.from('service_requests').select('id, status, created_at').order('created_at'),
      supabase.from('reviews').select('id, rating, created_at'),
      supabase.from('equipment_items').select('id, is_available, created_at'),
      supabase.from('equipment_loans').select('id, created_at').order('created_at'),
      supabase.from('reports').select('id, status, created_at'),
      supabase.from('notifications').select('id, is_read, created_at'),
      supabase.from('artisan_profiles').select('id, artisan_type, trade_category_id, trade_category:trade_categories(name, icon)'),
      supabase.from('trade_categories').select('id, name, icon'),
    ]);

    // ── Calculs utilisateurs ─────────────────────────────────
    const profiles = allProfiles || [];
    const totalUsers = profiles.filter(p => p.role !== 'admin').length;
    const residents = profiles.filter(p => p.role === 'resident').length;
    const artisansPending = profiles.filter(p => p.role === 'artisan_pending').length;
    const artisansVerified = profiles.filter(p => p.role === 'artisan_verified').length;
    const newUsersLast7 = profiles.filter(p => new Date(p.created_at) >= since7).length;
    const newUsersLast30 = profiles.filter(p => new Date(p.created_at) >= since30).length;
    const artisansPro = (artisanProfiles || []).filter(a => a.artisan_type === 'professionnel').length;
    const artisansParticulier = (artisanProfiles || []).filter(a => a.artisan_type === 'particulier').length;

    // ── Calculs messages ─────────────────────────────────────
    const msgs = allMessages || [];
    const totalMessages = msgs.length;
    const totalConversations = (allConversations || []).length;

    // ── Annonces ─────────────────────────────────────────────
    const listings = allListings || [];
    const totalListings = listings.length;
    const activeListings = listings.filter(l => l.status === 'active').length;
    const listingViews = listings.reduce((s, l) => s + (l.views_count || 0), 0);

    // Catégories annonces
    const listingCatMap: Record<string, number> = {};
    listings.forEach(l => {
      const cat = (l.category as unknown as { name: string })?.name || 'Autre';
      listingCatMap[cat] = (listingCatMap[cat] || 0) + 1;
    });
    const listingCategories = Object.entries(listingCatMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // ── Forum ─────────────────────────────────────────────────
    const posts = allPosts || [];
    const totalPosts = posts.length;
    const totalComments = (allComments || []).length;
    const closedPosts = posts.filter(p => p.status === 'closed').length;

    // Catégories forum
    const forumCatMap: Record<string, number> = {};
    posts.forEach(p => {
      const cat = (p.category as unknown as { name: string })?.name || 'Autre';
      forumCatMap[cat] = (forumCatMap[cat] || 0) + 1;
    });
    const forumCategories = Object.entries(forumCatMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // Mots les + utilisés dans titres forum
    const topForumWords = topWords(posts.map(p => p.title || ''));

    // ── Demandes artisans ─────────────────────────────────────
    const reqs = allRequests || [];
    const totalRequests = reqs.length;
    const statusLabels: Record<string, string> = {
      submitted: 'Soumises', viewed: 'Vues', replied: 'Répondues',
      scheduled: 'Planifiées', completed: 'Terminées', cancelled: 'Annulées',
    };
    const reqStatusMap: Record<string, number> = {};
    reqs.forEach(r => {
      const k = statusLabels[r.status] || r.status;
      reqStatusMap[k] = (reqStatusMap[k] || 0) + 1;
    });
    const requestsByStatus = Object.entries(reqStatusMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // ── Avis ─────────────────────────────────────────────────
    const reviews = allReviews || [];
    const totalReviews = reviews.length;
    const avgRating = totalReviews
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    // ── Matériel ─────────────────────────────────────────────
    const equip = allEquipment || [];
    const totalEquipment = equip.length;
    const availableEquipment = equip.filter(e => e.is_available).length;
    const totalBorrows = (allBorrows || []).length;

    // ── Signalements ─────────────────────────────────────────
    const reports = allReports || [];
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const totalReports = reports.length;

    // ── Notifications ─────────────────────────────────────────
    const notifs = allNotifications || [];
    const totalNotifications = notifs.length;
    const unreadNotifications = notifs.filter(n => !n.is_read).length;

    // ── Séries temporelles 30j ────────────────────────────────
    const dailyUsers = countByDay(
      profiles.filter(p => new Date(p.created_at) >= since30), days
    );
    const dailyMessages = countByDay(
      msgs.filter(m => new Date(m.created_at) >= since30), days
    );
    const dailyPosts = countByDay(
      posts.filter(p => new Date(p.created_at) >= since30), days
    );
    const dailyListings = countByDay(
      listings.filter(l => new Date(l.created_at) >= since30), days
    );

    // ── Répartition rôles ─────────────────────────────────────
    const roleDistribution: KV[] = [
      { name: 'Habitants', value: residents, color: COLORS.blue },
      { name: 'Artisans vérifiés', value: artisansVerified, color: COLORS.green },
      { name: 'Artisans en attente', value: artisansPending, color: COLORS.amber },
    ].filter(r => r.value > 0);

    // ── Catégories artisans ────────────────────────────────────
    const tradeCatMap: Record<string, number> = {};
    (artisanProfiles || []).forEach(a => {
      const cat = (a.trade_category as unknown as { name: string; icon: string })?.name || 'Autre';
      tradeCatMap[cat] = (tradeCatMap[cat] || 0) + 1;
    });
    const tradeCategories = Object.entries(tradeCatMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // ── Activité par heure (messages des 30 derniers jours) ───
    const hourMap: Record<number, { messages: number; posts: number }> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = { messages: 0, posts: 0 };
    msgs.filter(m => new Date(m.created_at) >= since30).forEach(m => {
      const h = new Date(m.created_at).getHours();
      hourMap[h].messages++;
    });
    posts.filter(p => new Date(p.created_at) >= since30).forEach(p => {
      const h = new Date(p.created_at).getHours();
      hourMap[h].posts++;
    });
    const activityByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}h`,
      messages: hourMap[h].messages,
      posts: hourMap[h].posts,
    }));

    setStats({
      totalUsers, residents, artisansPending, artisansVerified,
      artisansPro, artisansParticulier,
      newUsersLast7, newUsersLast30,
      totalMessages, totalConversations,
      totalListings, activeListings, listingViews,
      totalPosts, totalComments, closedPosts,
      totalRequests, requestsByStatus,
      totalReviews, avgRating,
      totalEquipment, availableEquipment, totalBorrows,
      pendingReports, totalReports,
      totalNotifications, unreadNotifications,
      dailyUsers, dailyMessages, dailyPosts, dailyListings,
      roleDistribution, listingCategories, forumCategories, tradeCategories,
      topForumWords, activityByHour,
    });
    setLastRefresh(new Date());
    setLoading(false);
  };

  if (!profile || !isAdmin()) return null;

  // ── Graphique combiné 30j ──────────────────────────────────
  const combined30 = stats?.dailyUsers.map((d, i) => ({
    date: d.date,
    Inscrits: d.value,
    Messages: stats.dailyMessages[i]?.value || 0,
    Posts: stats.dailyPosts[i]?.value || 0,
    Annonces: stats.dailyListings[i]?.value || 0,
  })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-brand-600" /> Statistiques complètes
            </h1>
            <p className="text-sm text-gray-500">
              Toute l&apos;activité de Biguglia Connect en temps réel
            </p>
          </div>
        </div>
        <button
          onClick={fetchAllStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : stats && (
        <div className="space-y-10">

          {/* ── 1. KPIs GLOBAUX ──────────────────────────────── */}
          <section>
            <SectionTitle icon={Activity} title="Vue d'ensemble" color="text-gray-900" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <KpiCard icon={Users} label="Membres inscrits" value={fmt.format(stats.totalUsers)}
                sub={`+${stats.newUsersLast7} cette semaine`} color="text-blue-600" bg="bg-blue-50" />
              <KpiCard icon={Wrench} label="Artisans vérifiés" value={fmt.format(stats.artisansVerified)}
                sub={`${stats.artisansPending} en attente`} color="text-green-600" bg="bg-green-50" />
              <KpiCard icon={MessageSquare} label="Messages envoyés" value={fmt.format(stats.totalMessages)}
                sub={`${stats.totalConversations} conversations`} color="text-brand-600" bg="bg-orange-50" />
              <KpiCard icon={Package} label="Annonces publiées" value={fmt.format(stats.totalListings)}
                sub={`${stats.activeListings} actives · ${fmt.format(stats.listingViews)} vues`} color="text-purple-600" bg="bg-purple-50" />
              <KpiCard icon={FileText} label="Posts forum" value={fmt.format(stats.totalPosts)}
                sub={`${stats.totalComments} commentaires`} color="text-teal-600" bg="bg-teal-50" />
              <KpiCard icon={Activity} label="Demandes artisans" value={fmt.format(stats.totalRequests)}
                sub="Toutes demandes" color="text-indigo-600" bg="bg-indigo-50" />
              <KpiCard icon={Star} label="Avis clients" value={fmt.format(stats.totalReviews)}
                sub={`Note moy. ${stats.avgRating}/5 ⭐`} color="text-amber-600" bg="bg-amber-50" />
              <KpiCard icon={ShoppingBag} label="Matériel" value={fmt.format(stats.totalEquipment)}
                sub={`${stats.availableEquipment} dispo · ${stats.totalBorrows} prêts`} color="text-pink-600" bg="bg-pink-50" />
              <KpiCard icon={Flag} label="Signalements" value={fmt.format(stats.totalReports)}
                sub={`${stats.pendingReports} en attente`} color="text-red-600" bg="bg-red-50" />
              <KpiCard icon={Bell} label="Notifications" value={fmt.format(stats.totalNotifications)}
                sub={`${stats.unreadNotifications} non lues`} color="text-sky-600" bg="bg-sky-50" />
              <KpiCard icon={HardHat} label="Artisans Pro" value={fmt.format(stats.artisansPro)}
                sub="Professionnels déclarés" color="text-blue-700" bg="bg-blue-100" />
              <KpiCard icon={Users2} label="Particuliers/Bénévoles" value={fmt.format(stats.artisansParticulier)}
                sub="Savoir-faire & entraide" color="text-green-700" bg="bg-green-100" />
            </div>
          </section>

          {/* ── 2. ÉVOLUTION 30 JOURS ────────────────────────── */}
          <section>
            <SectionTitle icon={TrendingUp} title="Activité des 30 derniers jours" color="text-gray-900" />
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={combined30} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    {[
                      { id: 'ins', color: COLORS.blue },
                      { id: 'msg', color: COLORS.brand },
                      { id: 'pos', color: COLORS.teal },
                      { id: 'ann', color: COLORS.purple },
                    ].map(({ id, color }) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="Inscrits" stroke={COLORS.blue} fill="url(#ins)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Messages" stroke={COLORS.brand} fill="url(#msg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Posts" stroke={COLORS.teal} fill="url(#pos)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Annonces" stroke={COLORS.purple} fill="url(#ann)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── 3. UTILISATEURS ──────────────────────────────── */}
          <section>
            <SectionTitle icon={Users} title="Membres & Artisans" color="text-blue-700" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Répartition rôles — Pie */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition des rôles</h3>
                {stats.roleDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.roleDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        dataKey="value" nameKey="name" paddingAngle={3} label={({ name, percent }: import('recharts').PieLabelRenderProps) => `${name ?? ''} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stats.roleDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={fmtTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>}
              </div>

              {/* Catégories artisans — Bar horizontal */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Artisans par métier</h3>
                {stats.tradeCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.tradeCategories} layout="vertical" margin={{ left: 30, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.green} radius={[0, 6, 6, 0]} name="Artisans" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-gray-400 text-center py-8">Aucun artisan inscrit</p>}
              </div>

              {/* Inscriptions 30j — Line */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouvelles inscriptions (30 jours)</h3>
                <div className="flex gap-6 mb-3 text-sm">
                  <span className="text-blue-600 font-semibold">+{stats.newUsersLast30} ce mois</span>
                  <span className="text-gray-500">+{stats.newUsersLast7} cette semaine</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={stats.dailyUsers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={COLORS.blue} strokeWidth={2} dot={false} name="Inscriptions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* ── 4. MESSAGES & CONVERSATIONS ──────────────────── */}
          <section>
            <SectionTitle icon={MessageSquare} title="Messages & Conversations" color="text-orange-700" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Messages envoyés (30 jours)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.dailyMessages}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke={COLORS.brand} fill={COLORS.brand} fillOpacity={0.15} strokeWidth={2} name="Messages" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Activité par heure (30j)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.activityByHour} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="messages" fill={COLORS.brand} radius={[3, 3, 0, 0]} name="Messages" />
                    <Bar dataKey="posts" fill={COLORS.teal} radius={[3, 3, 0, 0]} name="Posts" />
                    <Legend iconType="circle" iconSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* ── 5. FORUM ─────────────────────────────────────── */}
          <section>
            <SectionTitle icon={FileText} title="Forum" color="text-teal-700" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Posts par catégorie</h3>
                {stats.forumCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.forumCategories} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.teal} radius={[0, 6, 6, 0]} name="Posts" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-gray-400 text-center py-8">Aucun post</p>}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Mots les plus utilisés dans les titres
                </h3>
                {stats.topForumWords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.topForumWords.map((w, i) => {
                      const maxVal = stats.topForumWords[0].value;
                      const size = Math.max(11, Math.min(22, 11 + (w.value / maxVal) * 11));
                      const opacity = 0.5 + (w.value / maxVal) * 0.5;
                      return (
                        <span key={w.name} style={{ fontSize: size, opacity }}
                          className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full font-medium cursor-default"
                          title={`${w.value} occurrence${w.value > 1 ? 's' : ''}`}
                        >
                          {w.name}
                          <span className="text-xs ml-1 text-teal-400">{w.value}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-gray-400 text-center py-8">Aucun post forum</p>}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouveaux posts (30 jours)</h3>
                <div className="flex gap-6 mb-3 text-sm">
                  <span className="text-teal-600 font-semibold">{stats.totalPosts} posts total</span>
                  <span className="text-gray-500">{stats.totalComments} commentaires · {stats.closedPosts} fermés</span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={stats.dailyPosts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={COLORS.teal} strokeWidth={2} dot={false} name="Posts" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* ── 6. ANNONCES ──────────────────────────────────── */}
          <section>
            <SectionTitle icon={Package} title="Annonces & Matériel" color="text-purple-700" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Annonces par catégorie</h3>
                {stats.listingCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={stats.listingCategories} cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" nameKey="name" label={({ name, percent }: import('recharts').PieLabelRenderProps) => (((percent as number) ?? 0) > 0.05) ? `${name ?? ''} ${(((percent as number) ?? 0) * 100).toFixed(0)}%` : ''}
                      >
                        {stats.listingCategories.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={fmtTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-gray-400 text-center py-8">Aucune annonce</p>}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Nouvelles annonces (30 jours)</h3>
                <div className="flex gap-4 mb-3 text-sm">
                  <span className="text-purple-600 font-semibold">{fmt.format(stats.listingViews)} vues total</span>
                  <span className="text-gray-500">{stats.activeListings} actives</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stats.dailyListings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.purple} radius={[3, 3, 0, 0]} name="Annonces" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* ── 7. DEMANDES & AVIS ───────────────────────────── */}
          <section>
            <SectionTitle icon={Star} title="Demandes artisans & Avis" color="text-amber-700" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Demandes par statut ({fmt.format(stats.totalRequests)} total)
                </h3>
                {stats.requestsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.requestsByStatus} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.indigo} radius={[0, 6, 6, 0]} name="Demandes" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-gray-400 text-center py-8">Aucune demande</p>}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Avis clients — {fmt.format(stats.totalReviews)} avis · Moy. {stats.avgRating}/5
                </h3>
                {stats.totalReviews > 0 ? (
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = 0; // sera enrichi si on récupère la distribution
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 w-8">{star}★</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: stats.totalReviews > 0 ? `${Math.min(100, (stats.avgRating / 5) * 100)}%` : '0%' }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{fmt.format(stats.totalReviews)}</span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-gray-100 text-center">
                      <span className="text-3xl font-bold text-amber-500">{stats.avgRating}</span>
                      <span className="text-gray-400 text-sm"> / 5</span>
                      <div className="text-xs text-gray-400 mt-1">Basé sur {fmt.format(stats.totalReviews)} avis</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Aucun avis pour le moment</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 8. SIGNALEMENTS ──────────────────────────────── */}
          {stats.totalReports > 0 && (
            <section>
              <SectionTitle icon={Flag} title="Signalements" color="text-red-700" />
              <div className="bg-white rounded-2xl border border-red-100 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-red-600">{fmt.format(stats.pendingReports)}</p>
                    <p className="text-sm text-gray-600">signalements en attente de traitement</p>
                    <p className="text-xs text-gray-400">{fmt.format(stats.totalReports)} signalements au total</p>
                  </div>
                  {stats.pendingReports > 0 && (
                    <Link href="/admin/signalements"
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
                      <Flag className="w-4 h-4" /> Traiter les signalements
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── 9. PIED DE PAGE ──────────────────────────────── */}
          <div className="text-center text-xs text-gray-400 pb-4">
            Données actualisées le {lastRefresh.toLocaleDateString('fr-FR')} à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {' — '}
            <button onClick={fetchAllStats} className="text-brand-600 hover:underline">Actualiser</button>
          </div>

        </div>
      )}
    </div>
  );
}
