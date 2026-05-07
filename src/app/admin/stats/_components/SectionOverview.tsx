'use client';

/**
 * SectionOverview v4.0 — Vue d'ensemble avec algorithmes avancés
 *
 * Nouveautés :
 *   • Indicateur momentum global (EWMA7 vs EWMA30)
 *   • Anomalies Z-score détectées
 *   • Sparklines inline (mini-graphes 7j)
 *   • Badges d'alerte dynamiques sur chaque KPI
 */

import {
  Users, Wrench, MessageSquare, Package,
  FileText, Activity, Star, ShoppingBag,
  Flag, Bell, HardHat, Users2, Heart, MapPin, Search, Calendar,
  TrendingUp, TrendingDown, Minus, Zap, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { KpiCard } from './KpiCard';
import { SectionTitle } from './SectionTitle';
import { fmt } from '../_helpers';
import type { AllStats } from '../_types';

// ─── Mini-sparkline SVG inline ────────────────────────────────────────────────

function Sparkline({ values, color = '#3b82f6', height = 28, width = 64 }: {
  values: number[];
  color?:  string;
  height?: number;
  width?:  number;
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');
  const fillPts = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} className="opacity-70">
      <defs>
        <linearGradient id={`sg_${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#sg_${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Badge momentum ───────────────────────────────────────────────────────────

function MomentumBadge({ momentum }: { momentum: number }) {
  if (Math.abs(momentum) < 5) return null;
  const positive = momentum > 0;
  const strong   = Math.abs(momentum) > 20;
  const Icon     = positive ? TrendingUp : TrendingDown;
  const color    = positive
    ? (strong ? 'text-emerald-700 bg-emerald-100' : 'text-emerald-600 bg-emerald-50')
    : (strong ? 'text-red-700 bg-red-100' : 'text-orange-600 bg-orange-50');
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      <Icon className="w-3 h-3" />
      {positive ? '+' : ''}{momentum}%
    </span>
  );
}

// ─── Bannière momentum global ─────────────────────────────────────────────────

function MomentumBanner({ stats }: { stats: AllStats }) {
  const m  = stats.platformMomentum ?? 0;
  const level =
    m >= 20  ? { label: '🚀 Forte accélération', color: 'from-emerald-500 to-teal-600',   bar: 'bg-emerald-400' } :
    m >= 5   ? { label: '📈 En accélération',    color: 'from-blue-500 to-indigo-600',    bar: 'bg-blue-400'    } :
    m >= -5  ? { label: '➡️ Stable',            color: 'from-gray-600 to-gray-700',      bar: 'bg-gray-400'    } :
    m >= -20 ? { label: '📉 En décélération',    color: 'from-amber-500 to-orange-600',   bar: 'bg-amber-400'   } :
               { label: '⚠️ Forte décélération', color: 'from-red-500 to-rose-600',       bar: 'bg-red-400'     };

  const ewma = stats.ewmaMetrics;

  return (
    <div className={`bg-gradient-to-r ${level.color} rounded-2xl p-5 mb-6 text-white`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Score santé + momentum */}
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
            Score de santé global · Momentum EWMA
          </p>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl font-black">{stats.healthScore}</span>
            <span className="text-white/50 text-xl">/100</span>
            <span className="text-sm font-bold px-3 py-1 rounded-full bg-white/20">
              {stats.healthLevel === 'excellent' ? '🟢 Excellent' :
               stats.healthLevel === 'good'      ? '🔵 Bon'       :
               stats.healthLevel === 'fair'      ? '🟡 Moyen'     : '🔴 Critique'}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-40 bg-white/20 rounded-full h-2">
              <div className={`h-full rounded-full ${level.bar}`} style={{ width: `${stats.healthScore}%` }} />
            </div>
            <span className="text-xs text-white/70">{stats.healthScore}%</span>
          </div>
          <p className="text-xs text-white/80 font-semibold">{level.label} · momentum {m > 0 ? '+' : ''}{m}%</p>
        </div>

        {/* KPIs rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">{stats.activeUsersLast30}</p>
            <p className="text-white/60 text-xs">Actifs 30j</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">{stats.activationRate}%</p>
            <p className="text-white/60 text-xs">Activation</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">
              {stats.userGrowthRate > 0 ? '+' : ''}{stats.userGrowthRate}%
            </p>
            <p className="text-white/60 text-xs">Croissance</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">{stats.alerts.length}</p>
            <p className="text-white/60 text-xs">Alertes</p>
          </div>
        </div>

        {/* EWMA en temps réel */}
        {ewma && (
          <div className="hidden xl:grid grid-cols-3 gap-3 text-center text-xs">
            {[
              { label: 'Msgs/j EWMA7',  val: ewma.messagesEwma7,  m: ewma.messagesMomentum },
              { label: 'Posts/j EWMA7', val: ewma.postsEwma7,    m: ewma.postsMomentum    },
              { label: 'Users/j EWMA7', val: ewma.usersEwma7,    m: ewma.usersMomentum    },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-xl p-2">
                <p className="text-base font-bold">{item.val}</p>
                <p className="text-white/60 text-xs">{item.label}</p>
                <MomentumBadge momentum={item.m} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panneau anomalies Z-score ────────────────────────────────────────────────

function AnomalyPanel({ stats }: { stats: AllStats }) {
  const anomalies = stats.anomalies ?? [];
  if (anomalies.length === 0) return null;

  const critical = anomalies.filter(a => a.level === 'critical');
  const warnings = anomalies.filter(a => a.level === 'warning');

  return (
    <div className={`rounded-2xl border p-4 mb-6 ${
      critical.length > 0
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={`w-4 h-4 ${critical.length > 0 ? 'text-red-600' : 'text-amber-600'}`} />
        <h3 className={`text-sm font-bold ${critical.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
          {critical.length > 0
            ? `🚨 ${critical.length} anomalie${critical.length > 1 ? 's' : ''} critique${critical.length > 1 ? 's' : ''} détectée${critical.length > 1 ? 's' : ''}`
            : `⚠️ ${warnings.length} anomalie${warnings.length > 1 ? 's' : ''} statistique${warnings.length > 1 ? 's' : ''}`}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          critical.length > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        }`}>
          Algorithme Z-score (σ {'>'} {critical.length > 0 ? '3' : '2'})
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {anomalies.slice(0, 6).map((a, i) => (
          <div key={i} className={`rounded-xl p-3 text-xs ${
            a.level === 'critical' ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-gray-800">{a.metric}</span>
              <span className={`font-bold ${a.direction === 'spike' ? 'text-red-600' : 'text-blue-600'}`}>
                {a.direction === 'spike' ? '📈' : '📉'} z={a.zscore}
              </span>
            </div>
            <p className="text-gray-600">
              Valeur : <strong>{a.value}</strong> (moy: {a.mean} ± {a.stddev})
            </p>
            <p className="text-gray-500 mt-0.5">{a.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card enrichie avec sparkline ────────────────────────────────────────

function SparkKpiCard({
  icon: Icon, label, value, sub, color, bg,
  sparkValues, sparkColor, momentum,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg: string;
  sparkValues?: number[];
  sparkColor?: string;
  momentum?: number;
}) {
  return (
    <div className={`${bg} rounded-2xl p-4 border border-white/60 flex flex-col gap-2`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-xl bg-white/60 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {momentum !== undefined && <MomentumBadge momentum={momentum} />}
      </div>
      <div>
        <p className="text-xl font-black text-gray-900">{value}</p>
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>}
      </div>
      {sparkValues && sparkValues.length > 1 && (
        <Sparkline values={sparkValues} color={sparkColor ?? '#3b82f6'} />
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SectionOverview({ stats }: { stats: AllStats }) {
  const ewma = stats.ewmaMetrics;

  return (
    <section>
      <SectionTitle icon={Activity} title="Vue d'ensemble" color="text-gray-900" />

      {/* Bannière momentum + santé */}
      <MomentumBanner stats={stats} />

      {/* Anomalies Z-score si présentes */}
      <AnomalyPanel stats={stats} />

      {/* KPI cards — membres & artisans */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        👥 Membres & Artisans
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <SparkKpiCard
          icon={Users} label="Membres inscrits" value={fmt.format(stats.totalUsers)}
          sub={`+${stats.newUsersLast7} cette sem. · +${stats.newUsersLast30} ce mois`}
          color="text-blue-600" bg="bg-blue-50"
          sparkValues={stats.dailyUsers.slice(-7).map(p => p.value)}
          sparkColor="#3b82f6"
          momentum={ewma?.usersMomentum}
        />
        <SparkKpiCard
          icon={Wrench} label="Artisans vérifiés" value={fmt.format(stats.artisansVerified)}
          sub={`${stats.artisansPending} en attente · ${stats.artisansPro} pros`}
          color="text-green-600" bg="bg-green-50"
        />
        <SparkKpiCard
          icon={HardHat} label="Artisans Pro" value={fmt.format(stats.artisansPro)}
          sub="Professionnels déclarés"
          color="text-blue-700" bg="bg-blue-100"
        />
        <SparkKpiCard
          icon={Users2} label="Particuliers/Bénévoles" value={fmt.format(stats.artisansParticulier)}
          sub="Savoir-faire & entraide"
          color="text-green-700" bg="bg-green-100"
        />
      </div>

      {/* KPI cards — activité & contenu */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        💬 Activité & Contenu
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <SparkKpiCard
          icon={MessageSquare} label="Messages envoyés" value={fmt.format(stats.totalMessages)}
          sub={`${stats.totalConversations} convos · ${stats.activeConversations} actives (7j)`}
          color="text-orange-600" bg="bg-orange-50"
          sparkValues={stats.dailyMessages.slice(-7).map(p => p.value)}
          sparkColor="#f97316"
          momentum={ewma?.messagesMomentum}
        />
        <SparkKpiCard
          icon={Package} label="Annonces publiées" value={fmt.format(stats.totalListings)}
          sub={`${stats.activeListings} actives (${stats.listingActiveRate}%) · +${stats.listingsLast7} sem.`}
          color="text-purple-600" bg="bg-purple-50"
          sparkValues={stats.dailyListings.slice(-7).map(p => p.value)}
          sparkColor="#a855f7"
        />
        <SparkKpiCard
          icon={FileText} label="Posts forum" value={fmt.format(stats.totalPosts)}
          sub={`${stats.totalComments} commentaires · ${stats.closedPosts} résolus`}
          color="text-teal-600" bg="bg-teal-50"
          sparkValues={stats.dailyPosts.slice(-7).map(p => p.value)}
          sparkColor="#14b8a6"
          momentum={ewma?.postsMomentum}
        />
        <SparkKpiCard
          icon={Activity} label="Demandes artisans" value={fmt.format(stats.totalRequests)}
          sub={`${stats.pendingRequests} en attente · ${stats.requestCompletionRate}% complétés`}
          color="text-indigo-600" bg="bg-indigo-50"
          sparkValues={stats.dailyRequests.slice(-7).map(p => p.value)}
          sparkColor="#6366f1"
        />
      </div>

      {/* KPI cards — qualité & autres contenus */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        ⭐ Qualité & Autres Contenus
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Star} label="Avis clients" value={fmt.format(stats.totalReviews)}
          sub={`Note moy. ${stats.avgRating}/5 ⭐ · ${stats.positiveReviews} positifs`}
          color="text-amber-600" bg="bg-amber-50" />
        <KpiCard icon={ShoppingBag} label="Matériel" value={fmt.format(stats.totalEquipment)}
          sub={`${stats.availableEquipment} dispo · ${stats.totalBorrows} prêts`}
          color="text-pink-600" bg="bg-pink-50" />
        <KpiCard icon={Heart} label="Coups de main" value={fmt.format(stats.totalHelpRequests)}
          sub="Demandes entraide voisinage" color="text-rose-600" bg="bg-rose-50" />
        <KpiCard icon={MapPin} label="Sorties groupées" value={fmt.format(stats.totalOutings)}
          sub="Promenades & activités" color="text-cyan-600" bg="bg-cyan-50" />
        <KpiCard icon={Search} label="Objets perdus" value={fmt.format(stats.totalLostFound)}
          sub="Annonces perdu/trouvé" color="text-violet-600" bg="bg-violet-50" />
        <KpiCard icon={Calendar} label="Événements" value={fmt.format(stats.totalEvents)}
          sub="Événements locaux" color="text-fuchsia-600" bg="bg-fuchsia-50" />
        <KpiCard icon={Flag} label="Signalements" value={fmt.format(stats.totalReports)}
          sub={`${stats.pendingReports} en attente · ${stats.reportResolutionRate}% résolus`}
          color="text-red-600" bg="bg-red-50" />
        <KpiCard icon={Bell} label="Notifications" value={fmt.format(stats.totalNotifications)}
          sub={`${stats.unreadNotifications} non lues · ${stats.notifReadRate}% lues`}
          color="text-sky-600" bg="bg-sky-50" />
      </div>

      {/* Alertes critiques inline */}
      {stats.alerts.filter(a => a.level === 'critical').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-sm font-bold text-red-700">
                {stats.alerts.filter(a => a.level === 'critical').length} alerte{stats.alerts.filter(a => a.level === 'critical').length > 1 ? 's' : ''} critique{stats.alerts.filter(a => a.level === 'critical').length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600">
                {stats.alerts.filter(a => a.level === 'critical').map(a => a.title).join(' · ')}
              </p>
            </div>
          </div>
          <Link href="#sante" className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">
            Voir les alertes →
          </Link>
        </div>
      )}
    </section>
  );
}
