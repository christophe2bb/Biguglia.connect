

import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle, Info, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import type { AllStats, PlatformAlert, WeeklyComparison } from '../_types';

// ─── Score global ─────────────────────────────────────────────────────────────

function HealthGauge({ score, level }: { score: number; level: AllStats['healthLevel'] }) {
  const color =
    level === 'excellent' ? 'text-emerald-600' :
    level === 'good'      ? 'text-blue-600' :
    level === 'fair'      ? 'text-amber-600' : 'text-red-600';
  const bg =
    level === 'excellent' ? 'bg-emerald-50 border-emerald-200' :
    level === 'good'      ? 'bg-blue-50 border-blue-200' :
    level === 'fair'      ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const barColor =
    level === 'excellent' ? 'bg-emerald-500' :
    level === 'good'      ? 'bg-blue-500' :
    level === 'fair'      ? 'bg-amber-500' : 'bg-red-500';
  const label =
    level === 'excellent' ? '🟢 Excellent' :
    level === 'good'      ? '🔵 Bon' :
    level === 'fair'      ? '🟡 Moyen' : '🔴 Critique';

  return (
    <div className={`rounded-2xl border p-6 ${bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score de santé global</p>
          <p className={`text-5xl font-black mt-1 ${color}`}>{score}<span className="text-2xl font-bold text-gray-400">/100</span></p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${color}`}>{label}</p>
          <p className="text-xs text-gray-500 mt-1">Biguglia Connect</p>
        </div>
      </div>
      <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── Composantes du score ────────────────────────────────────────────────────

function HealthBreakdown({ breakdown }: { breakdown: AllStats['healthBreakdown'] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Détail des composantes</h3>
      <div className="space-y-3">
        {breakdown.map(item => {
          const pct = Math.round((item.score / item.max) * 100);
          const color =
            pct >= 80 ? 'bg-emerald-500' :
            pct >= 50 ? 'bg-blue-500' :
            pct >= 25 ? 'bg-amber-500' : 'bg-red-400';
          const textColor =
            pct >= 80 ? 'text-emerald-600' :
            pct >= 50 ? 'text-blue-600' :
            pct >= 25 ? 'text-amber-600' : 'text-red-600';
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">
                  <span className="mr-1">{item.icon}</span>{item.label}
                </span>
                <span className={`text-xs font-bold ${textColor}`}>
                  {item.score}/{item.max}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alertes prioritaires ────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: PlatformAlert }) {
  const styles = {
    critical: {
      bg: 'bg-red-50 border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />,
      badge: 'bg-red-100 text-red-700',
      btn: 'bg-red-600 hover:bg-red-700 text-white',
      label: 'CRITIQUE',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />,
      badge: 'bg-amber-100 text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
      label: 'ATTENTION',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />,
      badge: 'bg-blue-100 text-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
      label: 'INFO',
    },
  };
  const s = styles[alert.level];
  return (
    <div className={`rounded-xl border p-4 ${s.bg}`}>
      <div className="flex gap-3">
        {s.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
              {s.label}
            </span>
            <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
          </div>
          <p className="text-xs text-gray-600">{alert.message}</p>
          {alert.action && alert.actionHref && (
            <Link
              href={alert.actionHref}
              className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${s.btn}`}
            >
              {alert.action} →
            </Link>
          )}
          {alert.action && !alert.actionHref && (
            <span className="inline-block mt-2 text-xs text-gray-500 italic">{alert.action}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comparaisons S/S ────────────────────────────────────────────────────────

function WeeklyCard({ item }: { item: WeeklyComparison }) {
  const isUp   = item.trend === 'up';
  const isDown = item.trend === 'down';
  const isFlat = item.trend === 'flat';

  const color  = isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-gray-400';
  const bg     = isUp ? 'bg-emerald-50'    : isDown ? 'bg-red-50'    : 'bg-gray-50';
  const border = isUp ? 'border-emerald-100' : isDown ? 'border-red-100' : 'border-gray-100';
  const Icon   = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div className={`rounded-xl border p-4 ${bg} ${border}`}>
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

// ─── Composant principal ─────────────────────────────────────────────────────

export function SectionHealth({ stats }: { stats: AllStats }) {
  const noAlerts = stats.alerts.length === 0;

  return (
    <>
      {/* ── Score global ─────────────────────────────────────── */}
      <section>
        <SectionTitle icon={Activity} title="Santé de la plateforme" color="text-gray-900" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <HealthGauge score={stats.healthScore} level={stats.healthLevel} />
          <HealthBreakdown breakdown={stats.healthBreakdown} />
        </div>

        {/* Recommandations intelligentes basées sur le score */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">💡 Analyse & recommandations</h3>
          <div className="space-y-2 text-sm text-gray-600">
            {stats.healthLevel === 'poor' && (
              <p className="bg-red-50 border border-red-100 rounded-lg p-3 text-red-700">
                ⚠️ <strong>Plateforme en démarrage</strong> — La priorité absolue est d&apos;acquérir les premiers membres actifs et de vérifier les artisans. Sans ces deux éléments, la valeur de la plateforme n&apos;est pas perceptible.
              </p>
            )}
            {stats.healthLevel === 'fair' && (
              <p className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-700">
                🔄 <strong>Croissance à stimuler</strong> — La base est là, mais l&apos;engagement reste faible. Activez des campagnes de re-engagement : newsletters, événements locaux, mises en avant d&apos;artisans.
              </p>
            )}
            {stats.healthLevel === 'good' && (
              <p className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-700">
                📊 <strong>Bonne dynamique</strong> — Passez à l&apos;optimisation de la rétention. Surveillez le taux d&apos;activation et les conversations actives. Objectif : 40%+ d&apos;utilisateurs actifs mensuels.
              </p>
            )}
            {stats.healthLevel === 'excellent' && (
              <p className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-emerald-700">
                🚀 <strong>Excellente santé</strong> — La plateforme performe bien. Pensez à diversifier les fonctionnalités (événements, sorties) et à renforcer la communauté via des challenges ou récompenses.
              </p>
            )}

            {stats.activationRate < 20 && stats.totalUsers > 5 && (
              <p className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                👻 <strong>Taux d&apos;activation {stats.activationRate}%</strong> — De nombreux membres inscrits ne sont pas actifs. Envoyez des notifications de relance, proposez du contenu d&apos;onboarding.
              </p>
            )}
            {stats.avgCommentsPerPost < 1 && stats.totalPosts > 3 && (
              <p className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                💬 <strong>Forum peu interactif</strong> — {stats.avgCommentsPerPost} commentaire/post en moyenne. Encouragez les admins/modérateurs à répondre aux premiers posts pour créer une dynamique.
              </p>
            )}
            {stats.artisanResponseRate < 50 && stats.totalRequests > 2 && (
              <p className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                ⏳ <strong>Réactivité artisans {stats.artisanResponseRate}%</strong> — Moins de la moitié des demandes reçoivent une réponse. Relancez les artisans inactifs ou proposez des formations.
              </p>
            )}
            {stats.listingActiveRate < 50 && stats.totalListings > 5 && (
              <p className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                📦 <strong>Seulement {stats.listingActiveRate}% d&apos;annonces actives</strong> — Beaucoup d&apos;annonces inactives. Pensez à archiver automatiquement après 60 jours et à notifier les auteurs.
              </p>
            )}
            {stats.avgRating > 0 && stats.avgRating < 3.5 && (
              <p className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                ⭐ <strong>Note moyenne faible : {stats.avgRating}/5</strong> — Des avis négatifs nuisent à la réputation. Contactez les artisans concernés pour améliorer la qualité du service.
              </p>
            )}
            {noAlerts && (
              <p className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-emerald-700">
                ✅ <strong>Aucune alerte active</strong> — Tout est sous contrôle. Continuez à surveiller les indicateurs hebdomadaires.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Alertes prioritaires ──────────────────────────────── */}
      {stats.alerts.length > 0 && (
        <section>
          <SectionTitle
            icon={AlertTriangle}
            title={`Alertes prioritaires (${stats.alerts.length})`}
            color="text-red-700"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
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
