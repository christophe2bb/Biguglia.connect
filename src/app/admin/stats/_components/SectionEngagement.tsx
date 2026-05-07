

import { Zap, Users, MessageSquare, BarChart2, Award } from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS, fmt } from '../_helpers';
import type { AllStats } from '../_types';

// ─── Jauge circulaire d'un taux ───────────────────────────────────────────────

function RateGauge({
  label, value, max = 100, color, icon: Icon, insight,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  icon: React.ElementType;
  insight: string;
}) {
  const pct   = Math.min(100, Math.round((value / max) * 100));
  const level = pct >= 70 ? '🟢' : pct >= 40 ? '🟡' : '🔴';
  const data  = [{ name: label, value: pct, fill: color }];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center text-center">
      <div className="w-full" style={{ height: 100 }}>
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="55%" outerRadius="80%"
            startAngle={220} endAngle={-40}
            data={data}
          >
            <RadialBar dataKey="value" background={{ fill: '#f3f4f6' }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="-mt-6">
        <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
        <p className="text-2xl font-black text-gray-900">{value}{max === 100 ? '%' : ''}</p>
        <p className="text-xs font-semibold text-gray-600 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{level} {insight}</p>
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
                  <span className="text-xs text-gray-400 w-14 text-right">
                    taux: {step.rate}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-xs text-amber-700">
          💡 <strong>Insight :</strong>{' '}
          {stats.artisansVerified === 0
            ? 'Aucun artisan vérifié. Relancez les demandes en attente ou recrutez directement.'
            : stats.artisansPending > stats.artisansVerified
            ? `${stats.artisansPending} artisans en attente de validation — agissez vite pour ne pas les perdre.`
            : `Bon taux de conversion artisan. Travaillez sur la fidélisation (avis, demandes récurrentes).`}
        </p>
      </div>
    </div>
  );
}

// ─── Métriques de croissance ─────────────────────────────────────────────────

function GrowthMetrics({ stats }: { stats: AllStats }) {
  const growthColor = stats.userGrowthRate > 0 ? 'text-emerald-600' : stats.userGrowthRate < 0 ? 'text-red-500' : 'text-gray-500';
  const growthBg    = stats.userGrowthRate > 0 ? 'bg-emerald-50 border-emerald-100' : stats.userGrowthRate < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100';

  const allContent = stats.totalListings + stats.totalPosts + stats.totalHelpRequests + stats.totalOutings + stats.totalEvents + stats.totalLostFound;

  const contentData = [
    { name: 'Annonces', value: stats.totalListings,     fill: COLORS.purple },
    { name: 'Forum',    value: stats.totalPosts,        fill: COLORS.teal   },
    { name: 'Coups ♥',  value: stats.totalHelpRequests, fill: COLORS.green  },
    { name: 'Sorties',  value: stats.totalOutings,      fill: COLORS.blue   },
    { name: 'Événements', value: stats.totalEvents,     fill: COLORS.amber  },
    { name: 'Objets perdus', value: stats.totalLostFound, fill: COLORS.red  },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-blue-500" /> Contenus & croissance
      </h3>

      {/* Taux de croissance */}
      <div className={`rounded-xl border p-4 mb-4 ${growthBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Croissance membres (30j vs 30j préc.)</p>
            <p className={`text-3xl font-black ${growthColor}`}>
              {stats.userGrowthRate > 0 ? '+' : ''}{stats.userGrowthRate}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Ce mois</p>
            <p className="text-xl font-bold text-gray-700">+{stats.monthlyNewUsers}</p>
            <p className="text-xs text-gray-400">Depuis 90j: +{stats.newUsersLast90}</p>
          </div>
        </div>
      </div>

      {/* Répartition des contenus */}
      {contentData.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-2">
            Répartition des {fmt.format(allContent)} contenus publiés
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={contentData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Contenus">
                {contentData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
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

      {/* Jauges d'engagement */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <RateGauge
          label="Taux d'activation"
          value={stats.activationRate}
          color={COLORS.blue}
          icon={Users}
          insight={stats.activationRate >= 40 ? 'Excellent' : stats.activationRate >= 20 ? 'À améliorer' : 'Critique'}
        />
        <RateGauge
          label="Réactivité artisans"
          value={stats.artisanResponseRate}
          color={COLORS.green}
          icon={MessageSquare}
          insight={stats.artisanResponseRate >= 60 ? 'Bonne réactivité' : stats.artisanResponseRate >= 30 ? 'Lent' : 'Insuffisant'}
        />
        <RateGauge
          label="Annonces actives"
          value={stats.listingActiveRate}
          color={COLORS.purple}
          icon={BarChart2}
          insight={stats.listingActiveRate >= 70 ? 'Bon stock' : 'Beaucoup d\'inactives'}
        />
        <RateGauge
          label="Taux lecture notifs"
          value={stats.notifReadRate}
          color={COLORS.amber}
          icon={Zap}
          insight={stats.notifReadRate >= 60 ? 'Bien lu' : stats.notifReadRate >= 30 ? 'Moyen' : 'Ignorées'}
        />
      </div>

      {/* Métriques qualitatives */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black text-gray-900">{stats.avgMsgsPerConversation}</p>
          <p className="text-xs font-medium text-gray-600 mt-1">msgs/conversation</p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.avgMsgsPerConversation >= 5 ? '💬 Échanges riches' : stats.avgMsgsPerConversation >= 2 ? '💬 Correct' : '💬 À stimuler'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black text-gray-900">{stats.avgCommentsPerPost}</p>
          <p className="text-xs font-medium text-gray-600 mt-1">commentaires/post</p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.avgCommentsPerPost >= 3 ? '🔥 Actif' : stats.avgCommentsPerPost >= 1 ? '📝 Modéré' : '🌵 Silencieux'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black text-gray-900">{stats.activeConversations}</p>
          <p className="text-xs font-medium text-gray-600 mt-1">convos actives (7j)</p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.totalConversations > 0
              ? `${Math.round((stats.activeConversations / stats.totalConversations) * 100)}% du total`
              : 'Aucune conversation'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black text-gray-900">{stats.dauEstimate}</p>
          <p className="text-xs font-medium text-gray-600 mt-1">utilisateurs/jour (est.)</p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.totalUsers > 0
              ? `${Math.round((stats.dauEstimate / stats.totalUsers) * 100)}% des membres`
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArtisanFunnel stats={stats} />
        <GrowthMetrics stats={stats} />
      </div>
    </section>
  );
}
