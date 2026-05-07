'use client';

/**
 * SectionEngagement v4.0 — Engagement avancé avec algorithmes EWMA/DAU-MAU/Churn/NPS
 *
 * Métriques avancées intégrées :
 *   • DAU/MAU ratio (cible > 20%)
 *   • Stickiness index (DAU/WAU)
 *   • Churn risk 30j (% membres à risque d'abandon)
 *   • NPS estimé (promoteurs − détracteurs)
 *   • Cohortes de rétention J7/J14/J30
 *   • Momentum EWMA par série
 */

import { Zap, Users, MessageSquare, BarChart2, Award, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line,
} from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS, fmt } from '../_helpers';
import type { AllStats } from '../_types';

// ─── Jauge SVG circulaire (sans lib externe) ─────────────────────────────────

function SvgGauge({
  value, max = 100, size = 80, label, sub, color, icon: Icon,
}: {
  value: number; max?: number; size?: number; label: string;
  sub?: string; color: string; icon?: React.ElementType;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const r   = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const gap  = circ - dash;

  const trackColor = '#e5e7eb';
  const textColor  =
    pct >= 70 ? '#059669' :
    pct >= 40 ? '#2563eb' :
    pct >= 20 ? '#d97706' : '#dc2626';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth="7" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${gap}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Icon
            ? <Icon className="w-4 h-4 mb-0.5" style={{ color }} />
            : <span className="text-base font-black" style={{ color: textColor }}>{pct}%</span>
          }
          {Icon && <span className="text-xs font-black leading-none" style={{ color: textColor }}>{pct}%</span>}
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</p>
      {sub && <p className="text-xs text-gray-400 text-center leading-tight">{sub}</p>}
    </div>
  );
}

// ─── Carte métrique avancée ───────────────────────────────────────────────────

function AdvancedMetricCard({
  label, value, unit = '', target, description, color, trend, insight,
}: {
  label:       string;
  value:       number;
  unit?:       string;
  target?:     number;
  description: string;
  color:       string;
  trend?:      'up' | 'down' | 'flat';
  insight?:    string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  const progress = target ? Math.min(100, Math.round((value / target) * 100)) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 leading-tight">{label}</p>
        {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
      </div>
      <p className="text-2xl font-black text-gray-900">{value}{unit}</p>
      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      {progress !== null && target && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">vs objectif {target}{unit}</span>
            <span className={`font-bold ${progress >= 100 ? 'text-emerald-600' : progress >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-blue-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}
      {insight && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{insight}</p>
      )}
    </div>
  );
}

// ─── Section DAU/MAU avec NPS et churn ───────────────────────────────────────

function EngagementKpis({ stats }: { stats: AllStats }) {
  const em = stats.engagementMetrics;
  if (!em) return null;

  const npsColor =
    em.nps >= 50  ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    em.nps >= 30  ? 'text-blue-700 bg-blue-50 border-blue-200' :
    em.nps >= 0   ? 'text-amber-700 bg-amber-50 border-amber-200' :
                    'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-indigo-500" /> Métriques engagement avancées
        <span className="ml-auto text-xs text-gray-400 font-normal">Algorithmes EWMA + Cohortes</span>
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {/* DAU/MAU */}
        <AdvancedMetricCard
          label="DAU/MAU ratio" value={em.dauMauRatio} unit="%"
          target={20}
          description="Utilisateurs quotidiens / mensuels"
          color={COLORS.blue}
          trend={em.dauMauRatio >= 15 ? 'up' : em.dauMauRatio >= 5 ? 'flat' : 'down'}
          insight={em.dauMauRatio >= 20 ? '✅ Niveau Facebook-like' : em.dauMauRatio >= 10 ? '📊 Moyen — cible 20%' : '⚠️ Faible engagement quotidien'}
        />

        {/* Stickiness */}
        <AdvancedMetricCard
          label="Stickiness" value={em.stickiness} unit="%"
          target={30}
          description="DAU / WAU (fidélité quotidienne)"
          color={COLORS.purple}
          trend={em.stickiness >= 20 ? 'up' : 'flat'}
          insight={em.stickiness >= 30 ? '🔥 Très fidèle' : em.stickiness >= 15 ? '📈 Correct' : '📉 Visites irrégulières'}
        />

        {/* Activation nouveaux */}
        <AdvancedMetricCard
          label="Activation 7j" value={em.newUserActivation7d} unit="%"
          target={40}
          description="Nouveaux inscrits actifs en 7j"
          color={COLORS.green}
          trend={em.newUserActivation7d >= 30 ? 'up' : em.newUserActivation7d >= 10 ? 'flat' : 'down'}
          insight={em.newUserActivation7d >= 40 ? '✅ Excellent onboarding' : em.newUserActivation7d >= 20 ? '📧 Améliorer email accueil' : '🔴 Onboarding à revoir'}
        />

        {/* Churn risk */}
        <AdvancedMetricCard
          label="Risque churn" value={em.churnRisk30d} unit="%"
          description="Membres risquant l'abandon (30j)"
          color={COLORS.red}
          trend={em.churnRisk30d < 20 ? 'up' : em.churnRisk30d < 40 ? 'flat' : 'down'}
          insight={em.churnRisk30d < 20 ? '✅ Attrition faible' : em.churnRisk30d < 40 ? '⚠️ Surveiller la rétention' : '🚨 Relancer les inactifs d\'urgence'}
        />
      </div>

      {/* NPS estimé + sessions */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl border p-4 ${npsColor}`}>
          <p className="text-xs font-medium mb-1">NPS estimé (Net Promoter Score)</p>
          <p className="text-3xl font-black">{em.nps > 0 ? '+' : ''}{em.nps}</p>
          <p className="text-xs mt-1 opacity-80">
            {em.nps >= 50 ? '🏆 Excellent — communauté ambassadrice' :
             em.nps >= 30 ? '📈 Bon — satisfaction solide' :
             em.nps >= 0  ? '📊 Passable — à améliorer' :
                            '🚨 Négatif — urgence satisfaction'}
          </p>
          <p className="text-xs mt-1 opacity-60">Basé sur ratio avis 5★ vs 1-2★</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Sessions / utilisateur actif</p>
          <p className="text-3xl font-black text-gray-900">{em.avgSessionsPerUser}</p>
          <p className="text-xs text-gray-400 mt-1">Messages / actif 7j</p>
          <p className="text-xs mt-2 text-gray-500">
            {em.avgSessionsPerUser >= 5 ? '💬 Utilisateurs très engagés' :
             em.avgSessionsPerUser >= 2 ? '📱 Engagement modéré' :
                                          '🌵 Faible fréquence d\'utilisation'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tableau cohortes de rétention ────────────────────────────────────────────

function CohortTable({ stats }: { stats: AllStats }) {
  const cohorts = stats.cohortRetention ?? [];
  if (cohorts.length === 0) return null;

  const getColor = (pct: number) =>
    pct >= 40 ? 'bg-emerald-100 text-emerald-800' :
    pct >= 20 ? 'bg-blue-100 text-blue-800' :
    pct >= 10 ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-500" /> Rétention par cohortes
        <span className="ml-auto text-xs text-gray-400 font-normal">3 derniers mois</span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-semibold">Cohorte</th>
              <th className="text-right pb-2 font-semibold">Taille</th>
              <th className="text-right pb-2 font-semibold">Retour J+7</th>
              <th className="text-right pb-2 font-semibold">Retour J+14</th>
              <th className="text-right pb-2 font-semibold">Retour J+30</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cohorts.map((c, i) => (
              <tr key={i}>
                <td className="py-2 font-medium text-gray-700">{c.cohortLabel}</td>
                <td className="py-2 text-right font-bold text-gray-900">{c.cohortSize}</td>
                {[c.retDay7, c.retDay14, c.retDay30].map((pct, j) => (
                  <td key={j} className="py-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full font-bold ${getColor(pct)}`}>
                      {pct}%
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Benchmark rétention */}
      <div className="mt-4 bg-blue-50 rounded-xl p-3">
        <p className="text-xs text-blue-700">
          📊 <strong>Référence secteur :</strong> J+7 = 25%, J+14 = 20%, J+30 = 15%
          (plateformes communautaires locales — Voisin Malin 2023)
        </p>
      </div>
    </div>
  );
}

// ─── Jauges d'engagement classiques ──────────────────────────────────────────

function EngagementGauges({ stats }: { stats: AllStats }) {
  const gauges = [
    { label: "Taux d'activation", value: stats.activationRate, target: 35, color: COLORS.blue, icon: Users },
    { label: 'Réactivité artisans', value: stats.artisanResponseRate, target: 65, color: COLORS.green, icon: MessageSquare },
    { label: 'Annonces actives', value: stats.listingActiveRate, target: 70, color: COLORS.purple, icon: BarChart2 },
    { label: 'Lecture notifs', value: stats.notifReadRate, target: 60, color: COLORS.amber, icon: Zap },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-blue-500" /> Taux d'engagement
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {gauges.map((g, i) => (
          <SvgGauge
            key={i}
            value={g.value}
            max={100}
            size={90}
            label={g.label}
            sub={`Cible: ${g.target}%`}
            color={g.value >= g.target ? g.color : g.value >= g.target * 0.6 ? COLORS.amber : COLORS.red}
            icon={g.icon}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Funnel artisan ───────────────────────────────────────────────────────────

function ArtisanFunnel({ stats }: { stats: AllStats }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Award className="w-4 h-4 text-amber-500" /> Funnel artisans
      </h3>
      <div className="space-y-3">
        {stats.artisanFunnel.map((step, i) => {
          const widthPct = stats.artisanFunnel[0].value > 0
            ? Math.max(10, Math.round((step.value / stats.artisanFunnel[0].value) * 100))
            : 0;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="font-medium text-gray-700">{step.label}</span>
                <span className="font-bold text-gray-900">{fmt.format(step.value)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold transition-all"
                    style={{ width: `${widthPct}%`, background: step.color }}
                  >
                    {widthPct > 20 ? `${widthPct}%` : ''}
                  </div>
                </div>
                {i > 0 && (
                  <span className="text-xs text-gray-400 w-14 text-right">taux: {step.rate}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-xs text-amber-700">
          💡 {stats.artisansPending > stats.artisansVerified
            ? `${stats.artisansPending} artisans en attente — validez-les pour ne pas les perdre.`
            : stats.artisansVerified === 0
            ? 'Aucun artisan vérifié. Recrutez directement les professionnels locaux.'
            : 'Bon taux de conversion. Focus sur la fidélisation (avis + demandes récurrentes).'}
        </p>
      </div>
    </div>
  );
}

// ─── Métriques croissance ─────────────────────────────────────────────────────

function GrowthMetrics({ stats }: { stats: AllStats }) {
  const growthColor = stats.userGrowthRate > 0 ? 'text-emerald-600' : stats.userGrowthRate < 0 ? 'text-red-500' : 'text-gray-500';
  const growthBg    = stats.userGrowthRate > 0 ? 'bg-emerald-50 border-emerald-100' : stats.userGrowthRate < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100';

  const contentData = [
    { name: 'Annonces',    value: stats.totalListings,     fill: COLORS.purple },
    { name: 'Forum',       value: stats.totalPosts,        fill: COLORS.teal   },
    { name: 'Coups ♥',     value: stats.totalHelpRequests, fill: COLORS.green  },
    { name: 'Sorties',     value: stats.totalOutings,      fill: COLORS.blue   },
    { name: 'Événements',  value: stats.totalEvents,       fill: COLORS.amber  },
    { name: 'Obj. perdus', value: stats.totalLostFound,    fill: COLORS.red    },
  ].filter(d => d.value > 0);

  const allContent = contentData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-blue-500" /> Contenus & croissance
      </h3>

      <div className={`rounded-xl border p-4 mb-4 ${growthBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Croissance (30j vs 30j préc.)</p>
            <p className={`text-3xl font-black ${growthColor}`}>
              {stats.userGrowthRate > 0 ? '+' : ''}{stats.userGrowthRate}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Ce mois</p>
            <p className="text-xl font-bold text-gray-700">+{stats.monthlyNewUsers}</p>
            <p className="text-xs text-gray-400">90j: +{stats.newUsersLast90}</p>
          </div>
        </div>
      </div>

      {contentData.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-2">
            {fmt.format(allContent)} contenus publiés au total
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={contentData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Contenus">
                {contentData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function SectionEngagement({ stats }: { stats: AllStats }) {
  return (
    <section>
      <SectionTitle icon={Zap} title="Engagement & Croissance" color="text-indigo-700" />

      {/* Métriques avancées EWMA + DAU/MAU + Churn + NPS */}
      <EngagementKpis stats={stats} />

      {/* Cohortes de rétention */}
      <CohortTable stats={stats} />

      {/* Jauges taux d'engagement */}
      <EngagementGauges stats={stats} />

      {/* Métriques qualitatives */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            val: stats.avgMsgsPerConversation,
            label: 'msgs/conversation',
            insight: stats.avgMsgsPerConversation >= 5 ? '💬 Échanges riches' : stats.avgMsgsPerConversation >= 2 ? '💬 Correct' : '💬 À stimuler',
          },
          {
            val: stats.avgCommentsPerPost,
            label: 'commentaires/post',
            insight: stats.avgCommentsPerPost >= 3 ? '🔥 Actif' : stats.avgCommentsPerPost >= 1 ? '📝 Modéré' : '🌵 Silencieux',
          },
          {
            val: stats.activeConversations,
            label: 'convos actives (7j)',
            insight: stats.totalConversations > 0
              ? `${Math.round((stats.activeConversations / stats.totalConversations) * 100)}% du total`
              : 'Aucune conversation',
          },
          {
            val: stats.dauEstimate,
            label: 'utilisateurs/jour (est.)',
            insight: stats.totalUsers > 0
              ? `${Math.round((stats.dauEstimate / stats.totalUsers) * 100)}% des membres`
              : '—',
          },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{item.val}</p>
            <p className="text-xs font-medium text-gray-600 mt-1">{item.label}</p>
            <p className="text-xs text-gray-400 mt-1">{item.insight}</p>
          </div>
        ))}
      </div>

      {/* Funnel + Croissance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArtisanFunnel stats={stats} />
        <GrowthMetrics stats={stats} />
      </div>
    </section>
  );
}
