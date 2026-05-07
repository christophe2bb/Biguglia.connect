'use client';

/**
 * SectionPredictions — Prédictions 14 jours par régression linéaire
 *
 * Calcul côté serveur (API) via régression linéaire sur les 30 derniers jours.
 * Affiche la tendance + intervalle de confiance + insight actionnable.
 */

import { useMemo, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import { COLORS } from '../_helpers';
import type { AllStats, Prediction } from '../_types';

// ─── Carte prédiction ─────────────────────────────────────────────────────────

function PredCard({ pred, active, onClick }: {
  pred: Prediction;
  active: boolean;
  onClick: () => void;
}) {
  const Icon  = pred.trend === 'up' ? TrendingUp : pred.trend === 'down' ? TrendingDown : Minus;
  const color = pred.trend === 'up' ? 'text-emerald-600' : pred.trend === 'down' ? 'text-red-500' : 'text-gray-400';
  const bg    = pred.trend === 'up' ? 'bg-emerald-50 border-emerald-200' : pred.trend === 'down' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200';

  // Valeur actuelle (dernier point avec actual !== null)
  const lastActual = [...pred.points].reverse().find(p => p.actual !== null);
  // Valeur prédite à J+14
  const pred14 = pred.points[pred.points.length - 1];

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all ${active ? 'ring-2 ring-brand-500 shadow-md' : ''} ${bg}`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-bold text-gray-700 leading-tight">{pred.metric}</p>
        <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-black text-gray-900">{pred14?.predicted ?? '—'}</p>
        <p className="text-xs text-gray-500 mb-1">dans 14j</p>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Aujourd'hui : <strong>{lastActual?.actual ?? 0}</strong>
      </p>
      <div className="mt-2 flex items-center gap-1">
        <div className="flex-1 bg-white/60 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${pred.trend === 'up' ? 'bg-emerald-400' : pred.trend === 'down' ? 'bg-red-400' : 'bg-gray-400'}`}
            style={{ width: `${pred.confidence}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">{pred.confidence}% conf.</span>
      </div>
    </button>
  );
}

// ─── Tooltip custom ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        p.value != null && (
          <p key={i} style={{ color: p.color }}>
            {p.name} : <strong>{p.value}</strong>
          </p>
        )
      ))}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SectionPredictions({ stats }: { stats: AllStats }) {
  const predictions = stats.predictions ?? [];
  const [selected, setSelected] = useState(0);

  const pred = predictions[selected];

  // Formate les données pour recharts
  const chartData = useMemo(() => {
    if (!pred) return [];
    return pred.points.map(p => ({
      date:      p.date.slice(5),        // MM-DD
      actual:    p.actual,
      predicted: p.predicted,
      lower:     p.lower,
      upper:     p.upper,
      isFuture:  p.actual === null,
    }));
  }, [pred]);

  // Ligne séparation historique / futur
  const todayIdx  = chartData.findIndex(p => p.isFuture);
  const todayDate = todayIdx >= 0 ? chartData[todayIdx]?.date : null;

  if (predictions.length === 0) {
    return (
      <section id="predictions">
        <SectionTitle icon={Brain} title="Prédictions 14 jours" color="text-purple-700" />
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Pas assez de données pour les prédictions</p>
          <p className="text-xs mt-1">Il faut au minimum 7 jours d'activité</p>
        </div>
      </section>
    );
  }

  return (
    <section id="predictions">
      <SectionTitle icon={Brain} title="Prédictions & tendances — 14 jours" color="text-purple-700" />

      {/* Disclaimer */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-6 text-xs text-purple-800">
        <strong>🤖 Algorithme :</strong> Régression linéaire sur les 30 derniers jours de données réelles.
        Les prédictions sont des <em>estimations probabilistes</em>, non des certitudes — l'intervalle gris représente la zone de confiance.
        Confiance ≥ 70% = données stables. Confiance &lt; 40% = forte volatilité.
      </div>

      {/* Sélecteurs de métriques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {predictions.map((p, i) => (
          <PredCard
            key={i}
            pred={p}
            active={selected === i}
            onClick={() => setSelected(i)}
          />
        ))}
      </div>

      {/* Graphe principal */}
      {pred && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">{pred.metric}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{pred.insight}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-brand-500" />
                <span className="text-gray-600">Réel</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-dashed border-purple-500 bg-transparent" />
                <span className="text-gray-600">Prédit</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-100 opacity-60" />
                <span className="text-gray-600">Intervalle confiance</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.brand} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.brand} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradConf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />

              {/* Zone de confiance */}
              <Area
                type="monotone"
                dataKey="upper"
                fill="url(#gradConf)"
                stroke="transparent"
                name="Borne haute"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="lower"
                fill="white"
                stroke="transparent"
                name="Borne basse"
                legendType="none"
              />

              {/* Données réelles */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke={COLORS.brand}
                strokeWidth={2}
                fill="url(#gradActual)"
                dot={false}
                name="Réel"
                connectNulls={false}
              />

              {/* Prédiction */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="Prédit"
              />

              {/* Ligne verticale aujourd'hui */}
              {todayDate && (
                <ReferenceLine
                  x={todayDate}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: "Aujourd'hui", position: 'top', fontSize: 10, fill: '#94a3b8' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Résumé textuel */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              {
                label:  'Aujourd\'hui',
                value:  [...pred.points].reverse().find(p => p.actual !== null)?.actual ?? 0,
                sub:    'valeur réelle',
                color:  'text-gray-900',
              },
              {
                label: 'Dans 7 jours',
                value: pred.points[pred.points.length - 8]?.predicted ?? '—',
                sub:   `±${pred.points[pred.points.length - 8] ? Math.round((pred.points[pred.points.length - 8].upper - pred.points[pred.points.length - 8].predicted)) : 0}`,
                color: 'text-purple-700',
              },
              {
                label: 'Dans 14 jours',
                value: pred.points[pred.points.length - 1]?.predicted ?? '—',
                sub:   `conf. ${pred.confidence}%`,
                color: 'text-purple-700',
              },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-50 rounded-xl p-3">
                <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs font-medium text-gray-600">{kpi.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
