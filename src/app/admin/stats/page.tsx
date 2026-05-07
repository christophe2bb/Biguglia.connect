'use client';

/**
 * src/app/admin/stats/page.tsx — Dashboard analytique ULTRA-COMPLET v3
 *
 * Sections :
 *  1. Vue d'ensemble (KPIs + score santé + alertes critiques)
 *  2. Santé plateforme (score + insights + alertes + comparaisons S/S)
 *  3. Engagement & Croissance (taux, funnel, contenus)
 *  4. Heatmap 7j × 24h (NOUVEAU — quand la communauté est active)
 *  5. Prédictions 14j (NOUVEAU — régression linéaire)
 *  6. Artisans Ranking (NOUVEAU — score individuel)
 *  7. Benchmarks secteur (NOUVEAU — comparaisons civic-tech)
 *  8. Activité 30j
 *  9. Membres & Artisans
 * 10. Messages & Conversations
 * 11. Forum
 * 12. Annonces & Matériel
 * 13. Demandes artisans & Avis + Signalements
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2, ChevronLeft, RefreshCw, Download,
  Activity, Zap, TrendingUp, Users, MessageSquare,
  FileText, Package, Star, ChevronDown, ChevronUp,
  Clock, Brain, Award, Target, Radio,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useAdminStats } from './_hooks/useAdminStats';
import dynamic from 'next/dynamic';

// ─── Lazy sections ────────────────────────────────────────────────────────────
const SectionOverview       = dynamic(() => import('./_components/SectionOverview').then(m => ({ default: m.SectionOverview })),             { ssr: false });
const SectionHealth         = dynamic(() => import('./_components/SectionHealth').then(m => ({ default: m.SectionHealth })),                 { ssr: false });
const SectionEngagement     = dynamic(() => import('./_components/SectionEngagement').then(m => ({ default: m.SectionEngagement })),         { ssr: false });
const SectionHeatmap        = dynamic(() => import('./_components/SectionHeatmap').then(m => ({ default: m.SectionHeatmap })),               { ssr: false });
const SectionPredictions    = dynamic(() => import('./_components/SectionPredictions').then(m => ({ default: m.SectionPredictions })),       { ssr: false });
const SectionArtisanRanking = dynamic(() => import('./_components/SectionArtisanRanking').then(m => ({ default: m.SectionArtisanRanking })), { ssr: false });
const SectionBenchmarks     = dynamic(() => import('./_components/SectionBenchmarks').then(m => ({ default: m.SectionBenchmarks })),         { ssr: false });
const SectionActivity       = dynamic(() => import('./_components/SectionActivity').then(m => ({ default: m.SectionActivity })),             { ssr: false });
const SectionUsers          = dynamic(() => import('./_components/SectionUsers').then(m => ({ default: m.SectionUsers })),                   { ssr: false });
const SectionMessages       = dynamic(() => import('./_components/SectionMessages').then(m => ({ default: m.SectionMessages })),             { ssr: false });
const SectionForum          = dynamic(() => import('./_components/SectionForum').then(m => ({ default: m.SectionForum })),                   { ssr: false });
const SectionListings       = dynamic(() => import('./_components/SectionListings').then(m => ({ default: m.SectionListings })),             { ssr: false });
const SectionRequests       = dynamic(() => import('./_components/SectionRequests').then(m => ({ default: m.SectionRequests })),             { ssr: false });

// ─── Navigation sticky ────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: 'overview',         label: "Vue d'ensemble",  icon: Activity    },
  { id: 'sante',            label: 'Santé',           icon: TrendingUp  },
  { id: 'engagement',       label: 'Engagement',      icon: Zap         },
  { id: 'heatmap',          label: 'Heatmap',         icon: Clock       },
  { id: 'predictions',      label: 'Prédictions',     icon: Brain       },
  { id: 'artisan-ranking',  label: 'Artisans ★',      icon: Award       },
  { id: 'benchmarks',       label: 'Benchmarks',      icon: Target      },
  { id: 'activite',         label: 'Activité',        icon: BarChart2   },
  { id: 'membres',          label: 'Membres',         icon: Users       },
  { id: 'messages',         label: 'Messages',        icon: MessageSquare },
  { id: 'forum',            label: 'Forum',           icon: FileText    },
  { id: 'annonces',         label: 'Annonces',        icon: Package     },
  { id: 'artisans',         label: 'Avis & Dem.',     icon: Star        },
] as const;

function SectionNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      <button
        className="sm:hidden w-full flex items-center justify-between py-3 text-sm font-medium text-gray-700"
        onClick={() => setOpen(!open)}
      >
        Navigation des sections
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
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
    // Santé
    ['Score de santé',            String(stats.healthScore),             'Santé'],
    ['Niveau de santé',           stats.healthLevel,                     'Santé'],
    // Membres
    ['Membres inscrits',          String(stats.totalUsers),              'Membres'],
    ['Nouveaux (7j)',              String(stats.newUsersLast7),           'Membres'],
    ['Nouveaux (30j)',             String(stats.newUsersLast30),          'Membres'],
    ['Nouveaux (90j)',             String(stats.newUsersLast90),          'Membres'],
    ['Membres fantômes',          String(stats.ghostUsers),              'Membres'],
    ['Taux de rétention (%)',     String(stats.retentionRate),           'Membres'],
    // Artisans
    ['Artisans vérifiés',         String(stats.artisansVerified),        'Artisans'],
    ['Artisans en attente',       String(stats.artisansPending),         'Artisans'],
    ['Artisans Pro',              String(stats.artisansPro),             'Artisans'],
    // Engagement
    ['Taux activation (%)',       String(stats.activationRate),          'Engagement'],
    ['Utilisateurs actifs 30j',   String(stats.activeUsersLast30),       'Engagement'],
    ['Taux réponse artisan (%)',  String(stats.artisanResponseRate),     'Engagement'],
    ['Croissance 30j (%)',        String(stats.userGrowthRate),          'Croissance'],
    ['Vélocité contenu (actions/j)', String(stats.contentVelocity),     'Engagement'],
    ['Jours depuis dernier contenu', String(stats.daysSinceLastContent), 'Engagement'],
    ['Heure de pic',              String(stats.peakHour),                'Engagement'],
    // Messages
    ['Messages totaux',           String(stats.totalMessages),           'Messages'],
    ['Conversations totales',     String(stats.totalConversations),      'Messages'],
    ['Convos actives 7j',         String(stats.activeConversations),     'Messages'],
    ['Msgs/conversation',         String(stats.avgMsgsPerConversation),  'Messages'],
    // Annonces
    ['Annonces totales',          String(stats.totalListings),           'Annonces'],
    ['Annonces actives',          String(stats.activeListings),          'Annonces'],
    ['Taux annonces actives (%)', String(stats.listingActiveRate),       'Annonces'],
    // Forum
    ['Posts forum',               String(stats.totalPosts),              'Forum'],
    ['Commentaires forum',        String(stats.totalComments),           'Forum'],
    ['Posts résolus',             String(stats.closedPosts),             'Forum'],
    ['Taux résolution forum (%)', String(stats.forumResolutionRate),     'Forum'],
    ['Cmts/post',                 String(stats.avgCommentsPerPost),      'Forum'],
    // Demandes
    ['Demandes artisans',         String(stats.totalRequests),           'Artisans'],
    ['Taux complétion (%)',       String(stats.requestCompletionRate),   'Artisans'],
    ['Taux annulation (%)',       String(stats.requestCancellationRate), 'Artisans'],
    // Avis
    ['Avis clients',              String(stats.totalReviews),            'Qualité'],
    ['Note moyenne',              String(stats.avgRating),               'Qualité'],
    ['Avis positifs (≥4★)',       String(stats.positiveReviews),         'Qualité'],
    ['Avis négatifs (≤2★)',       String(stats.negativeReviews),         'Qualité'],
    // Matériel
    ['Matériel total',            String(stats.totalEquipment),          'Matériel'],
    ['Matériel disponible',       String(stats.availableEquipment),      'Matériel'],
    ['Prêts total',               String(stats.totalBorrows),            'Matériel'],
    ['Taux utilisation (%)',      String(stats.equipmentUsageRate),      'Matériel'],
    // Modération
    ['Signalements en attente',   String(stats.pendingReports),          'Modération'],
    ['Signalements totaux',       String(stats.totalReports),            'Modération'],
    ['Signalements résolus',      String(stats.resolvedReports),         'Modération'],
    ['Taux résolution sig. (%)',  String(stats.reportResolutionRate),    'Modération'],
    // Notifications
    ['Notifications totales',     String(stats.totalNotifications),      'Notifs'],
    ['Notifs non lues',           String(stats.unreadNotifications),     'Notifs'],
    ['Taux lecture notifs (%)',   String(stats.notifReadRate),           'Notifs'],
    // Contenus
    ['Coups de main',             String(stats.totalHelpRequests),       'Contenus'],
    ['Sorties groupées',          String(stats.totalOutings),            'Contenus'],
    ['Objets perdus/trouvés',     String(stats.totalLostFound),          'Contenus'],
    ['Événements',                String(stats.totalEvents),             'Contenus'],
    // Benchmarks
    ...stats.benchmarks.map(b => [
      `Benchmark — ${b.metric}`,
      `${b.platform}${b.unit} (ref: ${b.benchmark}${b.unit}, ${b.status})`,
      'Benchmark',
    ]),
    // Scores artisans
    ...stats.artisanScores.map(a => [
      `Score artisan — ${a.displayName}`,
      String(a.score),
      'Artisans',
    ]),
  ];

  const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `biguglia_stats_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Indicateur LIVE ──────────────────────────────────────────────────────────

function LiveIndicator({
  isLive, countdown, onToggle, lastRefresh, liveMode, latency, sseRetries,
}: {
  isLive:      boolean;
  countdown:   number;
  onToggle:    () => void;
  lastRefresh: Date;
  liveMode:    import('./_hooks/useAdminStats').LiveMode;
  latency:     number;
  sseRetries:  number;
}) {
  const isSSE     = liveMode === 'sse';
  const isPolling = liveMode === 'polling';

  return (
    <button
      onClick={onToggle}
      title={isSSE ? 'SSE actif — push temps réel du serveur' : isPolling ? `Polling actif — prochain refresh dans ${countdown}s` : 'Auto-refresh désactivé'}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
        isSSE    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
        isPolling ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                   'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse' : ''}`} />
      {isSSE ? (
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          SSE LIVE
        </span>
      ) : isPolling ? (
        <span>POLL · {countdown}s</span>
      ) : (
        <span>LIVE OFF</span>
      )}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-48 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminStatsPage() {
  const { phase, profile, isAdmin } = useAuthStore();
  const {
    stats, loading, lastRefresh, fetchAllStats,
    isLive, toggleLive, countdown, liveMode, latency, sseRetries,
  } = useAdminStats();

  if (phase === 'initializing') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <Skeleton />
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
              <BarChart2 className="w-6 h-6 text-brand-600" />
              Statistiques complètes
            </h1>
            <p className="text-sm text-gray-500">
              Dashboard analytique temps réel · Biguglia Connect
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Indicateur LIVE */}
          <LiveIndicator
            isLive={isLive}
            countdown={countdown}
            onToggle={toggleLive}
            lastRefresh={lastRefresh}
            liveMode={liveMode}
            latency={latency}
            sseRetries={sseRetries}
          />

          {/* Export CSV */}
          {stats && (
            <button
              onClick={() => exportCSV(stats)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}

          {/* Refresh manuel */}
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

      {/* ── Contenu ─────────────────────────────────────────────── */}
      {loading && !stats ? (
        <Skeleton />
      ) : stats ? (
        <div className="space-y-16">

          {/* 1 — Vue d'ensemble */}
          <div id="overview">
            <SectionOverview stats={stats} />
          </div>

          {/* 2 — Santé plateforme */}
          <div id="sante">
            <SectionHealth stats={stats} />
          </div>

          {/* 3 — Engagement & Croissance */}
          <div id="engagement">
            <SectionEngagement stats={stats} />
          </div>

          {/* 4 — Heatmap 7j × 24h */}
          <div id="heatmap">
            <SectionHeatmap stats={stats} />
          </div>

          {/* 5 — Prédictions 14 jours */}
          <div id="predictions">
            <SectionPredictions stats={stats} />
          </div>

          {/* 6 — Classement artisans */}
          <div id="artisan-ranking">
            <SectionArtisanRanking stats={stats} />
          </div>

          {/* 7 — Benchmarks secteur */}
          <div id="benchmarks">
            <SectionBenchmarks stats={stats} />
          </div>

          {/* 8 — Activité 30j */}
          <div id="activite">
            <SectionActivity stats={stats} />
          </div>

          {/* 9 — Membres & Artisans */}
          <div id="membres">
            <SectionUsers stats={stats} />
          </div>

          {/* 10 — Messages */}
          <div id="messages">
            <SectionMessages stats={stats} />
          </div>

          {/* 11 — Forum */}
          <div id="forum">
            <SectionForum stats={stats} />
          </div>

          {/* 12 — Annonces */}
          <div id="annonces">
            <SectionListings stats={stats} />
          </div>

          {/* 13 — Demandes & Avis */}
          <div id="artisans">
            <SectionRequests stats={stats} />
          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-6 flex items-center justify-between flex-wrap gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1 ${
                liveMode === 'sse' ? 'text-emerald-600' :
                liveMode === 'polling' ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <Radio className={`w-3 h-3 ${isLive ? 'animate-pulse' : ''}`} />
                {liveMode === 'sse' ? 'SSE temps réel' :
                 liveMode === 'polling' ? `Polling (${countdown}s)` : 'Auto-refresh désactivé'}
                {latency > 0 && <span className="text-gray-400 ml-1">· {latency}ms</span>}
              </span>
              <span>
                Dernière maj :{' '}
                <strong className="text-gray-600">
                  {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {stats && (
                <button
                  onClick={() => exportCSV(stats)}
                  className="flex items-center gap-1.5 text-brand-600 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV complet
                </button>
              )}
              <button onClick={fetchAllStats} disabled={loading} className="text-brand-600 hover:underline disabled:opacity-50">
                Actualiser maintenant
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
