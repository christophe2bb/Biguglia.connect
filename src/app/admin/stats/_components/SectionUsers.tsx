'use client';

import { Users, UserCheck, Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, UserX, Star } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS, PIE_COLORS, fmtTooltip } from '../_helpers';
import type { AllStats } from '../_types';

function InsightCard({
  text, severity, actions,
}: { text: string; severity: 'ok' | 'warn' | 'danger' | 'info'; actions?: string[] }) {
  const styles = {
    ok:     'bg-emerald-50 border-emerald-200 text-emerald-800',
    warn:   'bg-amber-50   border-amber-200   text-amber-800',
    danger: 'bg-red-50     border-red-200     text-red-800',
    info:   'bg-blue-50    border-blue-200    text-blue-800',
  };
  const icons = {
    ok:     <CheckCircle   className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />,
    warn:   <AlertTriangle className="w-4 h-4 text-amber-500   flex-shrink-0 mt-0.5" />,
    danger: <AlertTriangle className="w-4 h-4 text-red-500     flex-shrink-0 mt-0.5" />,
    info:   <TrendingUp    className="w-4 h-4 text-blue-500    flex-shrink-0 mt-0.5" />,
  };
  return (
    <div className={`border rounded-xl p-4 ${styles[severity]}`}>
      <div className="flex items-start gap-2 text-sm font-medium">
        {icons[severity]}
        <span>{text}</span>
      </div>
      {actions && actions.length > 0 && (
        <ol className="mt-2 ml-6 space-y-1 text-xs opacity-90 list-decimal">
          {actions.map((a, i) => <li key={i}>{a}</li>)}
        </ol>
      )}
    </div>
  );
}

function StatTile({
  label, value, sub, color, icon: Icon, bg,
}: { label: string; value: string | number; sub?: string; color: string; icon?: React.ElementType; bg?: string }) {
  return (
    <div className={`rounded-xl border border-gray-100 p-4 ${bg ?? 'bg-white'}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

export function SectionUsers({ stats }: { stats: AllStats }) {

  // Métriques dérivées
  const growthTrend: 'up' | 'down' | 'flat' =
    stats.userGrowthRate > 5 ? 'up' :
    stats.userGrowthRate < -5 ? 'down' : 'flat';

  const activationBenchmark = 35;
  const activationOk = stats.activationRate >= activationBenchmark;

  const ghostPct = stats.totalUsers > 0
    ? Math.round((stats.ghostUsers / stats.totalUsers) * 100)
    : 0;

  // Segments membres pour le donut
  const memberSegments = [
    { name: 'Actifs 30j',       value: stats.activeUsersLast30,                                 color: COLORS.green  },
    { name: 'Fantômes (>30j)',  value: stats.ghostUsers,                                        color: COLORS.red    },
    { name: 'Nouveaux (<30j)',  value: Math.max(0, stats.newUsersLast30 - stats.activeUsersLast30), color: COLORS.blue },
  ].filter(s => s.value > 0);

  // Score de croissance 0–100
  const growthScore = Math.min(100, Math.max(0, 50 + stats.userGrowthRate * 5));

  // ─── Insights automatiques ──────────────────────────────────────────────────
  const insights: { text: string; severity: 'ok' | 'warn' | 'danger' | 'info'; actions?: string[] }[] = [];

  // Croissance
  if (stats.newUsersLast7 === 0 && stats.totalUsers > 3) {
    insights.push({
      text: 'Aucune inscription cette semaine — croissance à 0',
      severity: 'danger',
      actions: [
        'Partager un lien d\'invitation sur les réseaux sociaux locaux',
        'Contacter la mairie de Biguglia pour un partenariat de promotion',
        'Afficher des affiches dans les commerces du village',
        'Lancer un parrainage : 1 invitation = badge "Ambassadeur"',
      ],
    });
  } else if (stats.userGrowthRate > 0) {
    insights.push({
      text: `Croissance positive : +${stats.userGrowthRate}% ce mois — maintenir la dynamique`,
      severity: 'ok',
    });
  } else if (stats.userGrowthRate < -10) {
    insights.push({
      text: `Croissance négative : ${stats.userGrowthRate}% — moins d'inscrits qu'il y a 30j`,
      severity: 'warn',
      actions: [
        'Analyser les désabonnements récents',
        'Relancer la communication sur les canaux locaux',
        'Proposer un événement de lancement communautaire',
      ],
    });
  }

  // Activation
  if (activationOk) {
    insights.push({ text: `Taux d'activation ${stats.activationRate}% — au-dessus du benchmark (${activationBenchmark}%)`, severity: 'ok' });
  } else if (stats.activationRate >= 15) {
    insights.push({
      text: `Taux d'activation ${stats.activationRate}% — sous le benchmark (${activationBenchmark}% recommandé)`,
      severity: 'warn',
      actions: [
        'Envoyer un email d\'onboarding à J+1, J+3 et J+7 pour les nouveaux membres',
        'Afficher un guide "Premiers pas" après l\'inscription',
        'Gamifier l\'activation avec un parcours de bienvenue (compléter son profil, poster, etc.)',
        'Créer une notification push hebdomadaire pour les membres inactifs',
      ],
    });
  } else {
    insights.push({
      text: `Taux d'activation critique : ${stats.activationRate}% — la majorité des membres ne reviennent jamais`,
      severity: 'danger',
      actions: [
        'Revoir entièrement le parcours d\'onboarding',
        'Rendre la valeur immédiatement visible dès la première connexion',
        'Envoyer un email de relance à tous les membres sans activité depuis > 14j',
        'Organiser une session live de démonstration de la plateforme',
      ],
    });
  }

  // Membres fantômes
  if (ghostPct >= 50) {
    insights.push({
      text: `${ghostPct}% de membres fantômes (${stats.ghostUsers}) — rétention catastrophique`,
      severity: 'danger',
      actions: [
        'Campagne de réactivation : email "Voici ce que vous avez manqué"',
        'Proposer une fonctionnalité de "suivi de quartier" en 1 clic',
        'Analyser pourquoi les membres partent (sondage de sortie)',
        'Envoyer un résumé mensuel personnalisé des actualités du quartier',
      ],
    });
  } else if (ghostPct >= 25) {
    insights.push({
      text: `${ghostPct}% de membres inactifs depuis > 30j — taux de rétention à améliorer`,
      severity: 'warn',
      actions: [
        'Séquence de réactivation automatique après 14j d\'inactivité',
        'Push notification "Votre quartier a du nouveau" avec contenu personnalisé',
        'Badge "Membre actif du mois" pour inciter les visites régulières',
      ],
    });
  } else if (stats.retentionRate >= 60) {
    insights.push({ text: `Rétention ${stats.retentionRate}% — excellente fidélisation des membres`, severity: 'ok' });
  }

  // Artisans
  if (stats.artisansPending > 0) {
    insights.push({
      text: `${stats.artisansPending} artisan${stats.artisansPending > 1 ? 's' : ''} en attente de vérification`,
      severity: stats.artisansPending >= 3 ? 'warn' : 'info',
      actions: ['Traiter les demandes via /admin/artisans'],
    });
  }
  if (stats.artisansVerified === 0 && stats.totalUsers > 2) {
    insights.push({
      text: 'Aucun artisan vérifié — la valeur principale de la plateforme est inactive',
      severity: 'danger',
      actions: [
        'Contacter les artisans locaux de Biguglia directement',
        'Simplifier le formulaire de demande artisan',
        'Offrir 3 mois d\'accès gratuit aux premiers artisans inscrits',
      ],
    });
  } else if (stats.artisansVerified >= 3) {
    insights.push({
      text: `${stats.artisansVerified} artisans vérifiés (${stats.artisansPro} Pro) — réseau actif`,
      severity: 'ok',
    });
  }

  return (
    <section>
      <SectionTitle icon={Users} title="Membres & Artisans" color="text-blue-700" />

      {/* ── KPIs principaux ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Membres inscrits"
          value={stats.totalUsers}
          sub={`+${stats.newUsersLast30} ce mois`}
          color="text-blue-600"
          icon={Users}
          bg="bg-blue-50"
        />
        <StatTile
          label="Actifs (30j)"
          value={stats.activeUsersLast30}
          sub={`activation ${stats.activationRate}%`}
          color={activationOk ? 'text-emerald-600' : 'text-amber-600'}
          icon={UserCheck}
          bg={activationOk ? 'bg-emerald-50' : 'bg-amber-50'}
        />
        <StatTile
          label="Membres fantômes"
          value={stats.ghostUsers}
          sub={`${ghostPct}% du total`}
          color={ghostPct < 25 ? 'text-gray-500' : ghostPct < 50 ? 'text-amber-600' : 'text-red-600'}
          icon={UserX}
          bg={ghostPct < 25 ? 'bg-gray-50' : ghostPct < 50 ? 'bg-amber-50' : 'bg-red-50'}
        />
        <StatTile
          label="Artisans vérifiés"
          value={stats.artisansVerified}
          sub={`${stats.artisansPending} en attente · ${stats.artisansPro} Pro`}
          color="text-green-600"
          icon={Star}
          bg="bg-green-50"
        />
      </div>

      {/* ── Barre de croissance ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            {growthTrend === 'up'
              ? <TrendingUp className="w-4 h-4 text-emerald-500" />
              : growthTrend === 'down'
              ? <TrendingDown className="w-4 h-4 text-red-500" />
              : <Clock className="w-4 h-4 text-gray-400" />}
            Indicateurs clés de croissance
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
          {[
            { label: 'Nouveaux (7j)', value: stats.newUsersLast7, max: Math.max(stats.newUsersLast30 / 4, 1), color: COLORS.blue },
            { label: 'Taux activation', value: stats.activationRate, max: 100, color: activationOk ? COLORS.green : COLORS.amber, unit: '%' },
            { label: 'Rétention 30j', value: stats.retentionRate, max: 100, color: stats.retentionRate >= 40 ? COLORS.green : COLORS.amber, unit: '%' },
            { label: 'Croissance mois', value: `${stats.userGrowthRate > 0 ? '+' : ''}${stats.userGrowthRate}%`, max: 100, color: stats.userGrowthRate > 0 ? COLORS.green : COLORS.red },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className="relative w-14 h-14 mx-auto mb-2">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={item.color} strokeWidth="3"
                    strokeDasharray={`${Math.min(100, Math.round((Number(String(item.value).replace('%', '')) / item.max) * 100))} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-800">{item.value}{item.unit ?? ''}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Insights ────────────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {insights.map((ins, i) => (
            <InsightCard key={i} text={ins.text} severity={ins.severity} actions={ins.actions} />
          ))}
        </div>
      )}

      {/* ── Graphiques ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Segments membres — Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Segmentation des membres</h3>
          <p className="text-xs text-gray-400 mb-3">Actifs 30j · Nouveaux · Fantômes</p>
          {memberSegments.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={memberSegments} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name" paddingAngle={3}
                    label={({ name, percent }: PieLabelRenderProps) =>
                      `${name ?? ''} ${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {memberSegments.map((entry, i) => (
                      <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={fmtTooltip} />
                </PieChart>
              </ResponsiveContainer>
              {/* Légende explicite */}
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {memberSegments.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-gray-400 text-center py-10">Aucun membre</p>}
        </div>

        {/* Artisans par métier */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Artisans par métier</h3>
          {stats.tradeCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.tradeCategories} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="value" fill={COLORS.green} radius={[0, 6, 6, 0]} name="Artisans" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-10">Aucun artisan inscrit</p>}
        </div>

        {/* Inscriptions 30j */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Nouvelles inscriptions — 30 jours</h3>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="text-blue-600 font-semibold">+{stats.newUsersLast30} ce mois</span>
              <span>+{stats.newUsersLast7} cette semaine</span>
              <span>+{stats.newUsersLast90} sur 90j</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={stats.dailyUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke={COLORS.blue} strokeWidth={2.5} dot={false} name="Inscriptions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
