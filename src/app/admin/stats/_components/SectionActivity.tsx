'use client';

import { TrendingUp, AlertTriangle, TrendingDown, CheckCircle, Zap } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { SectionTitle } from './SectionTitle';
import { COLORS } from '../_helpers';
import type { AllStats } from '../_types';

interface Props { stats: AllStats }

// ─── Détection d'anomalies sur une série ──────────────────────────────────────
function detectAnomalies(series: { date: string; value: number }[]): {
  hasAnomaly: boolean;
  msg: string;
  severity: 'ok' | 'warn' | 'danger';
} {
  if (series.length < 7) return { hasAnomaly: false, msg: '', severity: 'ok' };
  const recent7  = series.slice(-7).reduce((s, d) => s + d.value, 0);
  const prev7    = series.slice(-14, -7).reduce((s, d) => s + d.value, 0);
  const avg30    = series.reduce((s, d) => s + d.value, 0) / series.length;

  if (recent7 === 0 && avg30 > 0.5) return { hasAnomaly: true, msg: 'Aucune activité ces 7 derniers jours — rupture inhabituelle', severity: 'danger' };
  if (prev7 > 0 && recent7 / prev7 < 0.3) return { hasAnomaly: true, msg: `Chute de ${Math.round((1 - recent7 / prev7) * 100)}% vs semaine précédente`, severity: 'warn' };
  if (prev7 > 0 && recent7 / prev7 > 2) return { hasAnomaly: true, msg: `Hausse de ${Math.round((recent7 / prev7 - 1) * 100)}% vs semaine précédente`, severity: 'ok' };
  return { hasAnomaly: false, msg: '', severity: 'ok' };
}

// ─── Calcul de tendance sur N derniers jours ──────────────────────────────────
function trendValue(series: { value: number }[], days = 7): number {
  const slice = series.slice(-days);
  return slice.reduce((s, d) => s + d.value, 0);
}

// ─── Carte d'insight ──────────────────────────────────────────────────────────
function InsightChip({
  text, severity,
}: { text: string; severity: 'ok' | 'warn' | 'danger' }) {
  const styles = {
    ok:     'bg-emerald-50 border-emerald-200 text-emerald-700',
    warn:   'bg-amber-50  border-amber-200  text-amber-700',
    danger: 'bg-red-50    border-red-200    text-red-700',
  };
  const icons = {
    ok:     <CheckCircle  className="w-3.5 h-3.5 flex-shrink-0" />,
    warn:   <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />,
    danger: <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />,
  };
  return (
    <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-medium ${styles[severity]}`}>
      {icons[severity]}
      {text}
    </div>
  );
}

// ─── KPI rapide ────────────────────────────────────────────────────────────────
function QuickKpi({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export function SectionActivity({ stats }: Props) {

  const combined30 = stats.dailyUsers.map((d, i) => ({
    date:     d.date,
    Inscrits: d.value,
    Messages: stats.dailyMessages[i]?.value || 0,
    Posts:    stats.dailyPosts[i]?.value    || 0,
    Annonces: stats.dailyListings[i]?.value || 0,
  }));

  const gradients = [
    { id: 'ins', color: COLORS.blue   },
    { id: 'msg', color: COLORS.brand  },
    { id: 'pos', color: COLORS.teal   },
    { id: 'ann', color: COLORS.purple },
  ];

  // Détection d'anomalies par série
  const anomMsgs  = detectAnomalies(stats.dailyMessages);
  const anomUsers = detectAnomalies(stats.dailyUsers);
  const anomPosts = detectAnomalies(stats.dailyPosts);
  const anomAll   = [anomMsgs, anomUsers, anomPosts].filter(a => a.hasAnomaly);

  // KPIs rapides
  const msgs7   = trendValue(stats.dailyMessages, 7);
  const users7  = trendValue(stats.dailyUsers, 7);
  const posts7  = trendValue(stats.dailyPosts, 7);
  const annonces7 = trendValue(stats.dailyListings, 7);

  const msgs30  = stats.dailyMessages.reduce((s, d) => s + d.value, 0);
  const users30 = stats.newUsersLast30;
  const posts30 = stats.dailyPosts.reduce((s, d) => s + d.value, 0);
  const annonces30 = stats.dailyListings.reduce((s, d) => s + d.value, 0);

  // Moy. journalière
  const avgMsgs  = Math.round((msgs30  / 30) * 10) / 10;
  const avgPosts = Math.round((posts30 / 30) * 10) / 10;

  // Jour le plus actif (combiné messages + posts)
  const mostActiveDay = combined30.reduce(
    (best, d) => (d.Messages + d.Posts > best.Messages + best.Posts ? d : best),
    combined30[0] ?? { date: '-', Messages: 0, Posts: 0 },
  );

  // Score d'activité global 7j
  const activityScore7 = msgs7 + posts7 + annonces7 + users7;

  // Insights contextuels automatiques
  const insights: { text: string; severity: 'ok' | 'warn' | 'danger' }[] = [];

  if (stats.contentVelocity >= 3) insights.push({ text: `Vélocité contenu élevée : ${stats.contentVelocity} actions/j`, severity: 'ok' });
  else if (stats.contentVelocity > 0) insights.push({ text: `Vélocité faible : ${stats.contentVelocity} actions/j (cible ≥ 3)`, severity: 'warn' });
  else insights.push({ text: 'Aucune action de contenu récente — communauté en pause', severity: 'danger' });

  if (stats.daysSinceLastContent === 0) insights.push({ text: 'Contenu publié aujourd\'hui ✓', severity: 'ok' });
  else if (stats.daysSinceLastContent <= 3) insights.push({ text: `Dernier contenu il y a ${stats.daysSinceLastContent}j — rythme à maintenir`, severity: 'ok' });
  else if (stats.daysSinceLastContent <= 7) insights.push({ text: `${stats.daysSinceLastContent}j sans contenu — relancer les membres`, severity: 'warn' });
  else insights.push({ text: `${stats.daysSinceLastContent}j sans contenu — urgence de relance`, severity: 'danger' });

  if (avgMsgs >= 2) insights.push({ text: `${avgMsgs} messages/j en moyenne — bon rythme`, severity: 'ok' });
  else if (avgMsgs > 0) insights.push({ text: `Seulement ${avgMsgs} messages/j — stimuler les échanges`, severity: 'warn' });

  const peakHourLabel = `${String(stats.peakHour).padStart(2, '0')}h`;
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const peakDayLabel  = days[stats.peakDayOfWeek] ?? 'N/A';
  if (activityScore7 > 0) {
    insights.push({ text: `Pic d'activité : ${peakDayLabel} à ${peakHourLabel} → envoyer les notifs 30 min avant`, severity: 'ok' });
  }

  // Ajouter les anomalies
  anomAll.forEach(a => insights.push({ text: a.msg, severity: a.severity }));

  // Moyenne glissante 7j pour la reference line
  const avg7 = msgs30 > 0 ? Math.round((msgs30 / 30) * 10) / 10 : 0;

  return (
    <section>
      <SectionTitle icon={TrendingUp} title="Activité des 30 derniers jours" color="text-gray-900" />

      {/* ── KPIs 7j ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <QuickKpi label="Messages (7j)"  value={msgs7}     sub={`${avgMsgs}/j moy.`}  color="text-orange-600" />
        <QuickKpi label="Inscrits (7j)"  value={users7}    sub={`+${users30} ce mois`} color="text-blue-600" />
        <QuickKpi label="Posts forum (7j)" value={posts7}  sub={`${avgPosts}/j moy.`}  color="text-teal-600" />
        <QuickKpi label="Annonces (7j)"  value={annonces7} sub={`${annonces30} au total`} color="text-purple-600" />
      </div>

      {/* ── Insights automatiques ────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {insights.map((ins, i) => (
            <InsightChip key={i} text={ins.text} severity={ins.severity} />
          ))}
        </div>
      )}

      {/* ── Graphe combiné 30j ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Toutes les activités — 30 jours</h3>
          {mostActiveDay && (
            <span className="text-xs text-gray-400">
              Pic le <span className="font-medium text-gray-600">{mostActiveDay.date}</span>
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={combined30} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {gradients.map(({ id, color }) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}    />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} />
            {avg7 > 0 && (
              <ReferenceLine y={avg7} stroke={COLORS.gray} strokeDasharray="4 4"
                label={{ value: `moy. ${avg7}/j`, position: 'right', fontSize: 10, fill: COLORS.gray }} />
            )}
            <Area type="monotone" dataKey="Inscrits" stroke={COLORS.blue}   fill="url(#ins)" strokeWidth={2} />
            <Area type="monotone" dataKey="Messages" stroke={COLORS.brand}  fill="url(#msg)" strokeWidth={2} />
            <Area type="monotone" dataKey="Posts"    stroke={COLORS.teal}   fill="url(#pos)" strokeWidth={2} />
            <Area type="monotone" dataKey="Annonces" stroke={COLORS.purple} fill="url(#ann)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Répartition contenu 7j ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition contenu cette semaine</h3>
          {activityScore7 > 0 ? (
            <div className="space-y-3">
              {[
                { label: 'Messages', value: msgs7,     color: COLORS.brand,  pct: Math.round(msgs7     / activityScore7 * 100) },
                { label: 'Inscrits', value: users7,    color: COLORS.blue,   pct: Math.round(users7    / activityScore7 * 100) },
                { label: 'Posts',    value: posts7,    color: COLORS.teal,   pct: Math.round(posts7    / activityScore7 * 100) },
                { label: 'Annonces', value: annonces7, color: COLORS.purple, pct: Math.round(annonces7 / activityScore7 * 100) },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500">{item.value} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Aucune activité cette semaine</div>
          )}
        </div>

        {/* Activité par heure (30j) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Activité par heure (30j)</h3>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
              <Zap className="w-3 h-3 inline mr-0.5" />Pic à {peakHourLabel}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={175}>
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
      </div>
    </section>
  );
}
