'use client';

import { MessageSquare, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Users2, Clock } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS } from '../_helpers';
import type { AllStats } from '../_types';

// ─── Composants utilitaires ───────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon, trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'flat';
}) {
  const trendIcon = trend === 'up'
    ? <TrendingUp  className="w-3.5 h-3.5 text-emerald-500" />
    : trend === 'down'
    ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <div className={`text-2xl font-bold ${color} flex items-center gap-1.5`}>
        {value}
        {trendIcon}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function InsightBox({
  text, severity, actions,
}: {
  text: string;
  severity: 'ok' | 'warn' | 'danger' | 'info';
  actions?: string[];
}) {
  const styles = {
    ok:     { wrap: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', badge: 'text-emerald-600' },
    warn:   { wrap: 'bg-amber-50   border-amber-200',   text: 'text-amber-800',   badge: 'text-amber-600'   },
    danger: { wrap: 'bg-red-50     border-red-200',     text: 'text-red-800',     badge: 'text-red-600'     },
    info:   { wrap: 'bg-blue-50    border-blue-200',    text: 'text-blue-800',    badge: 'text-blue-600'    },
  };
  const icons = {
    ok:     <CheckCircle   className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />,
    warn:   <AlertTriangle className="w-4 h-4 text-amber-500   flex-shrink-0 mt-0.5" />,
    danger: <AlertTriangle className="w-4 h-4 text-red-500     flex-shrink-0 mt-0.5" />,
    info:   <CheckCircle   className="w-4 h-4 text-blue-500    flex-shrink-0 mt-0.5" />,
  };
  const s = styles[severity];
  return (
    <div className={`border rounded-xl p-4 ${s.wrap}`}>
      <div className={`flex items-start gap-2 ${s.text} text-sm font-medium`}>
        {icons[severity]}
        <span>{text}</span>
      </div>
      {actions && actions.length > 0 && (
        <ol className={`mt-2 ml-6 space-y-1 text-xs ${s.badge} list-decimal`}>
          {actions.map((a, i) => <li key={i}>{a}</li>)}
        </ol>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SectionMessages({ stats }: { stats: AllStats }) {

  // Métriques dérivées
  const convRate      = stats.totalConversations > 0
    ? Math.round((stats.activeConversations / stats.totalConversations) * 100)
    : 0;

  const msgTrend: 'up' | 'down' | 'flat' = stats.messagesPrev7 === 0
    ? (stats.messagesLast7 > 0 ? 'up' : 'flat')
    : stats.messagesLast7 > stats.messagesPrev7 ? 'up'
    : stats.messagesLast7 < stats.messagesPrev7 ? 'down'
    : 'flat';

  const msgDelta = stats.messagesPrev7 > 0
    ? Math.round(((stats.messagesLast7 - stats.messagesPrev7) / stats.messagesPrev7) * 100)
    : 0;

  const avgMsgs = stats.avgMsgsPerConversation;
  const benchmark = 5; // Messages/conversation benchmark secteur

  // Série combinée messages + activité
  const combinedData = stats.dailyMessages.map((d, i) => ({
    date:     d.date,
    Messages: d.value,
    Posts:    stats.dailyPosts[i]?.value || 0,
  }));

  // ─── Insights automatiques ─────────────────────────────────────────────────

  const insights: { text: string; severity: 'ok' | 'warn' | 'danger' | 'info'; actions?: string[] }[] = [];

  // Engagement conversationnel
  if (avgMsgs >= benchmark) {
    insights.push({
      text: `${avgMsgs} messages/conversation — au-dessus du benchmark secteur (${benchmark})`,
      severity: 'ok',
    });
  } else if (avgMsgs >= 2) {
    insights.push({
      text: `${avgMsgs} messages/conversation — sous le benchmark (${benchmark} recommandé)`,
      severity: 'warn',
      actions: [
        'Envoyer des relances automatiques après 48h de silence',
        'Afficher des suggestions de réponse contextuelles',
        'Créer des modèles de messages pour les artisans',
      ],
    });
  } else if (stats.totalConversations > 0) {
    insights.push({
      text: `Conversations trop courtes : ${avgMsgs} messages/conv. — échanges avortés`,
      severity: 'danger',
      actions: [
        'Analyser les conversations avec 1 seul message : demande sans réponse ?',
        'Implémenter un système de rappel pour les artisans non-répondants',
        'Ajouter un indicateur "vu" pour encourager la réponse',
        'Proposer un résumé de la demande en 1 clic à l\'artisan',
      ],
    });
  }

  // Tendance messages semaine
  if (msgTrend === 'up' && msgDelta > 20) {
    insights.push({ text: `+${msgDelta}% de messages cette semaine — belle dynamique`, severity: 'ok' });
  } else if (msgTrend === 'down' && Math.abs(msgDelta) > 30) {
    insights.push({
      text: `${msgDelta}% de messages vs semaine dernière — baisse significative`,
      severity: 'warn',
      actions: [
        'Notifier les membres des nouvelles annonces dans leur quartier',
        'Programmer une newsletter hebdomadaire de la communauté',
        'Proposer un "défi de la semaine" pour stimuler les échanges',
      ],
    });
  } else if (stats.messagesLast7 === 0 && stats.totalMessages > 0) {
    insights.push({
      text: 'Aucun message cette semaine — communauté silencieuse',
      severity: 'danger',
      actions: [
        'Envoyer une notification push à tous les membres actifs',
        'Publier un post d\'animation de la part de l\'admin',
        'Relancer les conversations abandonnées depuis > 7 jours',
      ],
    });
  }

  // Taux de conversations actives
  if (convRate >= 60) {
    insights.push({ text: `${convRate}% des conversations actives — excellent taux d'engagement`, severity: 'ok' });
  } else if (convRate >= 30) {
    insights.push({
      text: `${convRate}% de conversations actives sur 7j — marge de progression`,
      severity: 'info',
      actions: [
        'Envoyer une notification "Vous avez un message en attente" après 24h',
        'Afficher les conversations non-lues en priorité dans le tableau de bord',
      ],
    });
  } else if (stats.totalConversations > 0) {
    insights.push({
      text: `Seulement ${convRate}% de conversations actives — la plupart sont abandonnées`,
      severity: 'warn',
      actions: [
        'Implémenter une relance automatique pour les convos sans activité > 3j',
        'Analyser les raisons d\'abandon (artisan non-répondant ? demande résolue ?)',
        'Ajouter un bouton "Marquer comme résolu" pour nettoyer les convos terminées',
      ],
    });
  }

  // Zéro messages
  if (stats.totalMessages === 0) {
    insights.push({
      text: 'Aucun message envoyé sur la plateforme — fonctionnalité non adoptée',
      severity: 'danger',
      actions: [
        'Envoyer un email d\'onboarding guidant les membres vers la messagerie',
        'Créer une conversation test avec un message de bienvenue de l\'admin',
        'Mettre en avant la messagerie sur la page d\'accueil avec un CTA visible',
        'Lier automatiquement chaque demande artisan à une conversation dédiée',
      ],
    });
  }

  return (
    <section id="messages">
      <SectionTitle icon={MessageSquare} title="Messages & Conversations" color="text-orange-700" />

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          label="Total messages"
          value={stats.totalMessages}
          color="text-orange-600"
          icon={MessageSquare}
        />
        <StatCard
          label="Cette semaine"
          value={stats.messagesLast7}
          sub={msgDelta !== 0 ? `${msgDelta > 0 ? '+' : ''}${msgDelta}% vs S-1` : 'stable'}
          color="text-orange-500"
          trend={msgTrend}
        />
        <StatCard
          label="Conversations"
          value={stats.totalConversations}
          sub={`${stats.activeConversations} actives`}
          color="text-blue-600"
          icon={Users2}
        />
        <StatCard
          label="Taux actif"
          value={`${convRate}%`}
          sub="conversations 7j"
          color={convRate >= 50 ? 'text-emerald-600' : convRate >= 25 ? 'text-amber-600' : 'text-red-600'}
        />
        <StatCard
          label="Msgs / conv."
          value={avgMsgs}
          sub={`cible : ${benchmark}`}
          color={avgMsgs >= benchmark ? 'text-emerald-600' : avgMsgs >= 2 ? 'text-amber-600' : 'text-red-600'}
          icon={Clock}
        />
        <StatCard
          label="Heure de pic"
          value={`${String(stats.peakHour).padStart(2, '0')}h`}
          sub="activité max."
          color="text-purple-600"
        />
      </div>

      {/* ── Insights ────────────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {insights.map((ins, i) => (
            <InsightBox key={i} text={ins.text} severity={ins.severity} actions={ins.actions} />
          ))}
        </div>
      )}

      {/* ── Graphiques ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Messages envoyés 30j avec tendance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Messages envoyés — 30 jours</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              msgTrend === 'up'   ? 'bg-emerald-50 text-emerald-700' :
              msgTrend === 'down' ? 'bg-red-50 text-red-700' :
              'bg-gray-50 text-gray-600'
            }`}>
              {msgTrend === 'up' ? '↑' : msgTrend === 'down' ? '↓' : '→'}{' '}
              {msgDelta !== 0 ? `${msgDelta > 0 ? '+' : ''}${msgDelta}% vs S-1` : 'stable'}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="Messages" stroke={COLORS.brand}
                fill={COLORS.brand} fillOpacity={0.12} strokeWidth={2} />
              <Line type="monotone" dataKey="Posts" stroke={COLORS.teal}
                strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Activité par heure */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Activité par heure (30j)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.activityByHour} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="messages" fill={COLORS.brand} radius={[3, 3, 0, 0]} name="Messages" />
              <Bar dataKey="posts"    fill={COLORS.teal}  radius={[3, 3, 0, 0]} name="Posts" />
              <Legend iconType="circle" iconSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Benchmark messages/conversation */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">Qualité des conversations</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              {
                label:     'Messages / conv.',
                value:     avgMsgs,
                benchmark: benchmark,
                unit:      'msgs',
                color:     avgMsgs >= benchmark ? COLORS.green : avgMsgs >= 2 ? COLORS.amber : COLORS.red,
              },
              {
                label:     'Conversations actives',
                value:     convRate,
                benchmark: 50,
                unit:      '%',
                color:     convRate >= 50 ? COLORS.green : convRate >= 25 ? COLORS.amber : COLORS.red,
              },
              {
                label:     'Msgs cette semaine',
                value:     stats.messagesLast7,
                benchmark: Math.max(stats.messagesPrev7, 1),
                unit:      'msgs',
                color:     stats.messagesLast7 >= stats.messagesPrev7 ? COLORS.green : COLORS.amber,
              },
              {
                label:     'Conversations totales',
                value:     stats.totalConversations,
                benchmark: Math.max(stats.totalUsers * 0.5, 1),
                unit:      '',
                color:     stats.totalConversations >= stats.totalUsers * 0.5 ? COLORS.green : COLORS.amber,
              },
            ].map(item => {
              const pct = Math.min(100, Math.round((Number(item.value) / Number(item.benchmark)) * 100));
              return (
                <div key={item.label} className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-3">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke={item.color} strokeWidth="3"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-800">{pct}%</span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-800">{item.value}{item.unit}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">cible : {item.benchmark}{item.unit}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
