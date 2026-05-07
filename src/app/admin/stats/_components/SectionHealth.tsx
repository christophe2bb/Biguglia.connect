
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckCircle, Info, XCircle,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  Zap, Flame, Sprout, Wrench,
} from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import type { AllStats, WeeklyComparison } from '../_types';
import {
  analyzeStats,
  getPlatformTheme,
  type Insight,
  type InsightSeverity,
  type PlatformTheme,
} from '../_engine/analysisEngine';

// ─── Bannière thémée ──────────────────────────────────────────────────────────

function ThemedBanner({
  stats,
  theme,
  executiveSummary,
}: {
  stats: AllStats;
  theme: PlatformTheme;
  executiveSummary: string;
}) {
  const ThemeIcon =
    theme.level === 'excellent' ? Flame :
    theme.level === 'good'      ? TrendingUp :
    theme.level === 'fair'      ? Zap : Wrench;

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${theme.headerGradient} p-6 text-white`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Score + niveau */}
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur flex flex-col items-center justify-center flex-shrink-0"
          >
            <span className="text-3xl font-black leading-none">{stats.healthScore}</span>
            <span className="text-xs opacity-70 font-semibold">/100</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ThemeIcon className="w-5 h-5 opacity-80" />
              <span className="font-bold text-lg leading-tight">{theme.label}</span>
            </div>
            <p className="text-sm opacity-80 mb-2">{theme.statusLine}</p>
            {/* Barre de progression */}
            <div className="w-48 bg-white/20 rounded-full h-2.5">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-700"
                style={{ width: `${stats.healthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Résumé exécutif */}
        <div className="bg-white/15 backdrop-blur rounded-xl p-4 max-w-sm flex-1">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
            Résumé exécutif
          </p>
          <p className="text-sm font-medium leading-relaxed">{executiveSummary}</p>
        </div>
      </div>

      {/* KPIs inline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {[
          { label: 'Actifs / 30j',   value: stats.activeUsersLast30,   sub: `sur ${stats.totalUsers}` },
          { label: 'Activation',     value: `${stats.activationRate}%`, sub: 'des membres' },
          { label: 'Croissance',     value: `${stats.userGrowthRate > 0 ? '+' : ''}${stats.userGrowthRate}%`, sub: '30j vs préc.' },
          { label: 'Alertes',        value: stats.alerts.length,        sub: 'actives' },
        ].map(k => (
          <div key={k.label} className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-xl font-black">{k.value}</p>
            <p className="text-xs font-semibold opacity-90">{k.label}</p>
            <p className="text-xs opacity-60">{k.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Décomposition du score ───────────────────────────────────────────────────

function ScoreBreakdown({
  stats,
  theme,
}: {
  stats: AllStats;
  theme: PlatformTheme;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-5">
        Composantes du score
      </h3>
      <div className="space-y-4">
        {stats.healthBreakdown.map(item => {
          const p = Math.round((item.score / item.max) * 100);
          const barColor =
            p >= 80 ? 'bg-emerald-500' :
            p >= 50 ? 'bg-blue-500' :
            p >= 25 ? 'bg-amber-500' : 'bg-red-400';
          const textColor =
            p >= 80 ? 'text-emerald-600' :
            p >= 50 ? 'text-blue-600' :
            p >= 25 ? 'text-amber-600' : 'text-red-600';
          const tip =
            p === 0   ? 'Non activé' :
            p < 25    ? 'Critique' :
            p < 50    ? 'Insuffisant' :
            p < 80    ? 'Correct' : 'Excellent';

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  <span>{item.icon}</span>
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${textColor}`}>{tip}</span>
                  <span className={`text-xs font-bold ${textColor}`}>
                    {item.score}/{item.max}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Top actions immédiates ───────────────────────────────────────────────────

function TopActionsBanner({
  topActions,
  theme,
}: {
  topActions: { action: string; from: string }[];
  theme: PlatformTheme;
}) {
  if (topActions.length === 0) return null;
  return (
    <div className={`rounded-2xl border p-5 ${theme.sectionBg} ${theme.sectionBorder}`}>
      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${theme.textAccent}`}>
        <Zap className="w-4 h-4" />
        {topActions.length === 1 ? 'Action immédiate prioritaire' : `${topActions.length} actions immédiates à faire maintenant`}
      </h3>
      <div className="space-y-2">
        {topActions.map((a, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/60 rounded-xl p-3">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${theme.barClass}`}>
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{a.action}</p>
              <p className="text-xs text-gray-500 mt-0.5">Lié à : {a.from}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Carte insight ────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<InsightSeverity, {
  border: string; bg: string; badge: string; badgeText: string;
  dot: string; label: string;
}> = {
  critical: {
    border: 'border-red-300',
    bg:     'bg-red-50',
    badge:  'bg-red-600',
    badgeText: 'text-white',
    dot:    'bg-red-500',
    label:  '🔴 CRITIQUE',
  },
  danger: {
    border: 'border-orange-300',
    bg:     'bg-orange-50',
    badge:  'bg-orange-500',
    badgeText: 'text-white',
    dot:    'bg-orange-500',
    label:  '🟠 DANGER',
  },
  warning: {
    border: 'border-amber-300',
    bg:     'bg-amber-50',
    badge:  'bg-amber-400',
    badgeText: 'text-white',
    dot:    'bg-amber-400',
    label:  '🟡 ATTENTION',
  },
  ok: {
    border: 'border-gray-200',
    bg:     'bg-gray-50',
    badge:  'bg-gray-400',
    badgeText: 'text-white',
    dot:    'bg-gray-400',
    label:  '⚪ INFO',
  },
  great: {
    border: 'border-emerald-300',
    bg:     'bg-emerald-50',
    badge:  'bg-emerald-500',
    badgeText: 'text-white',
    dot:    'bg-emerald-500',
    label:  '✅ BON POINT',
  },
};

const CATEGORY_LABEL: Record<Insight['category'], string> = {
  growth:      '📈 Croissance',
  engagement:  '⚡ Engagement',
  content:     '✍️ Contenu',
  artisans:    '🔨 Artisans',
  quality:     '⭐ Qualité',
  moderation:  '🛡️ Modération',
  retention:   '🔄 Rétention',
};

function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);
  const s = SEVERITY_STYLES[insight.severity];

  return (
    <div className={`rounded-2xl border ${s.border} ${s.bg} overflow-hidden`}>
      {/* En-tête */}
      <button
        className="w-full p-4 text-left flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Point de sévérité */}
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge} ${s.badgeText}`}>
              {s.label}
            </span>
            <span className="text-xs text-gray-500">{CATEGORY_LABEL[insight.category]}</span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900">
              <span className="mr-1.5">{insight.icon}</span>
              {insight.title}
            </p>
            <span className="text-lg font-black text-gray-700 flex-shrink-0 tabular-nums">
              {insight.metric}
            </span>
          </div>
        </div>
        <span className="text-gray-400 flex-shrink-0 mt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Détail dépliable */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/60 pt-3 space-y-3">
          {/* Diagnostic */}
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              🔍 Diagnostic
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{insight.diagnosis}</p>
          </div>

          {/* Actions numérotées */}
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              🎯 Actions recommandées
            </p>
            <ol className="space-y-2">
              {insight.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {action}
                </li>
              ))}
            </ol>
          </div>

          {/* Objectif cible */}
          {insight.target && (
            <div className="flex items-start gap-2 bg-white/70 rounded-xl p-3">
              <span className="text-sm">🏆</span>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                  Objectif cible
                </p>
                <p className="text-sm font-semibold text-gray-700">{insight.target}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Comparaisons S/S ─────────────────────────────────────────────────────────

function WeeklyCard({ item }: { item: WeeklyComparison }) {
  const isUp   = item.trend === 'up';
  const isDown = item.trend === 'down';
  const color  = isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-gray-400';
  const bg     = isUp ? 'bg-emerald-50 border-emerald-100' : isDown ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100';
  const Icon   = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 leading-tight">{item.metric}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-2xl font-black ${color}`}>{item.current}</p>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-xs font-bold ${color}`}>
          {isUp ? '+' : ''}{item.deltaPct}%
        </span>
        <span className="text-xs text-gray-400">vs sem. préc. ({item.previous})</span>
      </div>
    </div>
  );
}

// ─── Section principale ───────────────────────────────────────────────────────

export function SectionHealth({ stats }: { stats: AllStats }) {
  const { theme, insights, topActions, executiveSummary } = useMemo(
    () => analyzeStats(stats),
    [stats],
  );

  const critical = insights.filter(i => i.severity === 'critical');
  const danger   = insights.filter(i => i.severity === 'danger');
  const warnings = insights.filter(i => i.severity === 'warning');
  const greats   = insights.filter(i => i.severity === 'great');

  const [activeTab, setActiveTab] = useState<'all' | 'problems' | 'positives'>('all');
  const visibleInsights =
    activeTab === 'problems'  ? [...critical, ...danger, ...warnings] :
    activeTab === 'positives' ? greats :
    insights;

  return (
    <>
      {/* ── Bannière thémée ──────────────────────────────────── */}
      <section>
        <SectionTitle icon={Activity} title="Santé de la plateforme" color="text-gray-900" />

        <ThemedBanner stats={stats} theme={theme} executiveSummary={executiveSummary} />
      </section>

      {/* ── Score détaillé ───────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScoreBreakdown stats={stats} theme={theme} />

          {/* Top actions immédiates */}
          <div className="flex flex-col gap-4">
            {topActions.length > 0 ? (
              <TopActionsBanner topActions={topActions} theme={theme} />
            ) : (
              <div className={`rounded-2xl border p-6 flex flex-col items-center justify-center text-center ${theme.sectionBg} ${theme.sectionBorder} h-full`}>
                <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
                <p className="font-bold text-gray-800 mb-1">Aucune action critique</p>
                <p className="text-sm text-gray-500">
                  Continuez à surveiller les indicateurs hebdomadaires. La plateforme est sur la bonne voie.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Insights contextuels ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Info className="w-5 h-5 text-gray-400" />
            Analyse contextuelle
            <span className="text-sm font-normal text-gray-400">
              ({insights.length} insight{insights.length > 1 ? 's' : ''})
            </span>
          </h2>
          {/* Filtres par onglet */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'all',       label: 'Tous',      count: insights.length },
              { key: 'problems',  label: '⚠️ À traiter', count: critical.length + danger.length + warnings.length },
              { key: 'positives', label: '✅ Points forts', count: greats.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 bg-gray-200 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {visibleInsights.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Sprout className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {activeTab === 'positives'
                ? 'Pas encore de points forts détectés — revenez quand la plateforme aura plus de données.'
                : 'Aucun problème détecté dans cette catégorie.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </section>

      {/* ── Alertes urgentes (ex-ancien système) ─────────────── */}
      {stats.alerts.filter(a => a.level === 'critical' || a.level === 'warning').length > 0 && (
        <section>
          <SectionTitle
            icon={AlertTriangle}
            title={`Alertes système (${stats.alerts.length})`}
            color="text-red-700"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.alerts.map((alert, i) => {
              const s =
                alert.level === 'critical'
                  ? { bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />, badge: 'bg-red-100 text-red-700', btn: 'bg-red-600 hover:bg-red-700 text-white', label: 'CRITIQUE' }
                  : alert.level === 'warning'
                  ? { bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />, badge: 'bg-amber-100 text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700 text-white', label: 'ATTENTION' }
                  : { bg: 'bg-blue-50 border-blue-200', icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />, badge: 'bg-blue-100 text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700 text-white', label: 'INFO' };
              return (
                <div key={i} className={`rounded-xl border p-4 ${s.bg}`}>
                  <div className="flex gap-3">
                    {s.icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                        <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                      </div>
                      <p className="text-xs text-gray-600">{alert.message}</p>
                      {alert.action && alert.actionHref && (
                        <Link href={alert.actionHref} className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${s.btn}`}>
                          {alert.action} →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Comparaisons semaine sur semaine ──────────────────── */}
      <section>
        <SectionTitle icon={TrendingUp} title="Évolution semaine sur semaine" color="text-gray-900" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.weeklyComparisons.map((item, i) => (
            <WeeklyCard key={i} item={item} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Comparaison 7 derniers jours vs 7 jours précédents
        </p>
      </section>
    </>
  );
}
