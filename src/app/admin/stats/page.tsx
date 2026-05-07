'use client';

/**
 * src/app/admin/stats/page.tsx — Dashboard analytique complet admin
 *
 * Sections :
 *  1. Vue d'ensemble (KPIs + score santé + alertes critiques)
 *  2. Santé plateforme (score détaillé + alertes + comparaisons S/S)
 *  3. Engagement & Croissance (taux, funnel artisan, contenus)
 *  4. Activité 30j (chart combiné)
 *  5. Membres & Artisans
 *  6. Messages & Conversations
 *  7. Forum
 *  8. Annonces & Matériel
 *  9. Demandes artisans & Avis + Signalements
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2, ChevronLeft, RefreshCw, Download,
  Activity, Zap, TrendingUp, Users, MessageSquare,
  FileText, Package, Star, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useAdminStats } from './_hooks/useAdminStats';
import dynamic from 'next/dynamic';

// ─── Lazy sections ────────────────────────────────────────────────────────────
const SectionOverview  = dynamic(() => import('./_components/SectionOverview').then(m => ({ default: m.SectionOverview })),   { ssr: false });
const SectionHealth    = dynamic(() => import('./_components/SectionHealth').then(m => ({ default: m.SectionHealth })),       { ssr: false });
const SectionEngagement = dynamic(() => import('./_components/SectionEngagement').then(m => ({ default: m.SectionEngagement })), { ssr: false });
const SectionActivity  = dynamic(() => import('./_components/SectionActivity').then(m => ({ default: m.SectionActivity })),   { ssr: false });
const SectionUsers     = dynamic(() => import('./_components/SectionUsers').then(m => ({ default: m.SectionUsers })),         { ssr: false });
const SectionMessages  = dynamic(() => import('./_components/SectionMessages').then(m => ({ default: m.SectionMessages })),   { ssr: false });
const SectionForum     = dynamic(() => import('./_components/SectionForum').then(m => ({ default: m.SectionForum })),         { ssr: false });
const SectionListings  = dynamic(() => import('./_components/SectionListings').then(m => ({ default: m.SectionListings })),   { ssr: false });
const SectionRequests  = dynamic(() => import('./_components/SectionRequests').then(m => ({ default: m.SectionRequests })),   { ssr: false });

// ─── Nav sticky des sections ──────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: 'overview',    label: 'Vue d\'ensemble', icon: Activity },
  { id: 'sante',       label: 'Santé',           icon: TrendingUp },
  { id: 'engagement',  label: 'Engagement',      icon: Zap },
  { id: 'activite',    label: 'Activité',        icon: BarChart2 },
  { id: 'membres',     label: 'Membres',         icon: Users },
  { id: 'messages',    label: 'Messages',        icon: MessageSquare },
  { id: 'forum',       label: 'Forum',           icon: FileText },
  { id: 'annonces',    label: 'Annonces',        icon: Package },
  { id: 'artisans',    label: 'Artisans & Avis', icon: Star },
] as const;

function SectionNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      {/* Mobile toggle */}
      <button
        className="sm:hidden w-full flex items-center justify-between py-3 text-sm font-medium text-gray-700"
        onClick={() => setOpen(!open)}
      >
        Navigation des sections
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {/* Desktop always visible, mobile conditional */}
      <div className={`${open ? 'flex' : 'hidden'} sm:flex flex-wrap gap-1 py-2 overflow-x-auto`}>
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(stats: NonNullable<ReturnType<typeof useAdminStats>['stats']>) {
  const today = new Date().toISOString().slice(0, 10);
  const rows: string[][] = [
    ['Métrique', 'Valeur', 'Catégorie'],
    ['Score de santé',           String(stats.healthScore),           'Santé'],
    ['Niveau de santé',          stats.healthLevel,                   'Santé'],
    ['Membres inscrits',         String(stats.totalUsers),            'Membres'],
    ['Nouveaux (7j)',             String(stats.newUsersLast7),         'Membres'],
    ['Nouveaux (30j)',            String(stats.newUsersLast30),        'Membres'],
    ['Nouveaux (90j)',            String(stats.newUsersLast90),        'Membres'],
    ['Artisans vérifiés',        String(stats.artisansVerified),      'Artisans'],
    ['Artisans en attente',      String(stats.artisansPending),       'Artisans'],
    ['Artisans Pro',             String(stats.artisansPro),           'Artisans'],
    ['Taux activation (%)',      String(stats.activationRate),        'Engagement'],
    ['Utilisateurs actifs 30j',  String(stats.activeUsersLast30),     'Engagement'],
    ['Taux réponse artisan (%)', String(stats.artisanResponseRate),   'Engagement'],
    ['Croissance 30j (%)',       String(stats.userGrowthRate),        'Croissance'],
    ['Messages totaux',          String(stats.totalMessages),         'Messages'],
    ['Conversations totales',    String(stats.totalConversations),    'Messages'],
    ['Convos actives 7j',        String(stats.activeConversations),   'Messages'],
    ['Msgs/conversation',        String(stats.avgMsgsPerConversation),'Messages'],
    ['Annonces totales',         String(stats.totalListings),         'Annonces'],
    ['Annonces actives',         String(stats.activeListings),        'Annonces'],
    ['Taux annonces actives (%)',String(stats.listingActiveRate),     'Annonces'],
    ['Posts forum',              String(stats.totalPosts),            'Forum'],
    ['Commentaires forum',       String(stats.totalComments),         'Forum'],
    ['Posts résolus',            String(stats.closedPosts),           'Forum'],
    ['Taux résolution forum (%)',String(stats.forumResolutionRate),   'Forum'],
    ['Cmts/post',                String(stats.avgCommentsPerPost),    'Forum'],
    ['Demandes artisans',        String(stats.totalRequests),         'Artisans'],
    ['Taux complétion (%)',      String(stats.requestCompletionRate), 'Artisans'],
    ['Taux annulation (%)',      String(stats.requestCancellationRate),'Artisans'],
    ['Avis clients',             String(stats.totalReviews),          'Qualité'],
    ['Note moyenne',             String(stats.avgRating),             'Qualité'],
    ['Avis positifs (≥4★)',      String(stats.positiveReviews),       'Qualité'],
    ['Avis négatifs (≤2★)',      String(stats.negativeReviews),       'Qualité'],
    ['Matériel total',           String(stats.totalEquipment),        'Matériel'],
    ['Matériel disponible',      String(stats.availableEquipment),    'Matériel'],
    ['Prêts total',              String(stats.totalBorrows),          'Matériel'],
    ['Taux utilisation (%)',     String(stats.equipmentUsageRate),    'Matériel'],
    ['Signalements en attente',  String(stats.pendingReports),        'Modération'],
    ['Signalements totaux',      String(stats.totalReports),          'Modération'],
    ['Signalements résolus',     String(stats.resolvedReports),       'Modération'],
    ['Taux résolution sig. (%)', String(stats.reportResolutionRate),  'Modération'],
    ['Notifications totales',    String(stats.totalNotifications),    'Notifs'],
    ['Notifs non lues',          String(stats.unreadNotifications),   'Notifs'],
    ['Taux lecture notifs (%)',  String(stats.notifReadRate),         'Notifs'],
    ['Coups de main',            String(stats.totalHelpRequests),     'Contenus'],
    ['Sorties groupées',         String(stats.totalOutings),          'Contenus'],
    ['Objets perdus/trouvés',    String(stats.totalLostFound),        'Contenus'],
    ['Événements',               String(stats.totalEvents),           'Contenus'],
  ];

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `biguglia_stats_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminStatsPage() {
  const { phase, profile, isAdmin } = useAuthStore();
  const { stats, loading, lastRefresh, fetchAllStats } = useAdminStats();

  useEffect(() => { fetchAllStats(); }, [fetchAllStats]);

  if (phase === 'initializing') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }
  if (!profile || !isAdmin()) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-brand-600" /> Statistiques complètes
            </h1>
            <p className="text-sm text-gray-500">
              Tableau de bord analytique · Biguglia Connect
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {stats && (
            <button
              onClick={() => exportCSV(stats)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          <button
            onClick={fetchAllStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Navigation sticky ───────────────────────────────────── */}
      <SectionNav />

      {/* ── Skeleton ────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-12">

          {/* 1 — Vue d'ensemble */}
          <div id="overview">
            <SectionOverview stats={stats} />
          </div>

          {/* 2 — Santé plateforme + alertes + comparaisons S/S */}
          <div id="sante">
            <SectionHealth stats={stats} />
          </div>

          {/* 3 — Engagement & Croissance */}
          <div id="engagement">
            <SectionEngagement stats={stats} />
          </div>

          {/* 4 — Activité 30j */}
          <div id="activite">
            <SectionActivity stats={stats} />
          </div>

          {/* 5 — Membres & Artisans */}
          <div id="membres">
            <SectionUsers stats={stats} />
          </div>

          {/* 6 — Messages & Conversations */}
          <div id="messages">
            <SectionMessages stats={stats} />
          </div>

          {/* 7 — Forum */}
          <div id="forum">
            <SectionForum stats={stats} />
          </div>

          {/* 8 — Annonces & Matériel */}
          <div id="annonces">
            <SectionListings stats={stats} />
          </div>

          {/* 9 — Demandes artisans & Avis + Signalements */}
          <div id="artisans">
            <SectionRequests stats={stats} />
          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-6 flex items-center justify-between flex-wrap gap-3 text-xs text-gray-400">
            <span>
              Données actualisées le{' '}
              <strong className="text-gray-600">
                {lastRefresh.toLocaleDateString('fr-FR')}
              </strong>{' '}
              à{' '}
              <strong className="text-gray-600">
                {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </strong>
            </span>
            <div className="flex items-center gap-3">
              {stats && (
                <button
                  onClick={() => exportCSV(stats)}
                  className="flex items-center gap-1.5 text-brand-600 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV complet
                </button>
              )}
              <button onClick={fetchAllStats} className="text-brand-600 hover:underline">
                Actualiser
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Impossible de charger les statistiques.</p>
          <button onClick={fetchAllStats} className="mt-3 text-brand-600 hover:underline text-sm">
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
