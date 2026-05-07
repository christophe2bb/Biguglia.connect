'use client';

/**
 * SectionHeatmap — Grille d'activité 7 jours × 24 heures
 *
 * Visualise QUAND la communauté est active (messages + posts + annonces).
 * Chaque cellule = nb d'actions. Couleur = intensité.
 * → L'admin sait à quelle heure envoyer des notifications, publier du contenu.
 */

import { useMemo } from 'react';
import { Clock, Zap } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import type { AllStats } from '../_types';

const DAYS_FR  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// ─── Palette de chaleur (6 niveaux) ──────────────────────────────────────────

function heatColor(value: number, max: number): { bg: string; text: string } {
  if (max === 0 || value === 0) return { bg: 'bg-gray-100', text: 'text-gray-300' };
  const ratio = value / max;
  if (ratio >= 0.85) return { bg: 'bg-orange-600', text: 'text-white' };
  if (ratio >= 0.65) return { bg: 'bg-orange-400', text: 'text-white' };
  if (ratio >= 0.45) return { bg: 'bg-amber-300',  text: 'text-amber-900' };
  if (ratio >= 0.25) return { bg: 'bg-amber-100',  text: 'text-amber-700' };
  if (ratio >= 0.05) return { bg: 'bg-blue-100',   text: 'text-blue-600' };
  return { bg: 'bg-gray-100', text: 'text-gray-400' };
}

// ─── Sous-composant : résumé par jour ────────────────────────────────────────

function DayBar({ day, total, max }: { day: number; total: number; max: number }) {
  const w   = max === 0 ? 0 : Math.round((total / max) * 100);
  const pct = w;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-gray-500 font-medium text-right">{DAYS_FR[day]}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-gray-700 font-bold tabular-nums">{total}</span>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function SectionHeatmap({ stats }: { stats: AllStats }) {
  const { maxVal, byDay, byHour, peakLabel } = useMemo(() => {
    const cells = stats.heatmap7x24;
    const maxVal = Math.max(...cells.map(c => c.value), 1);

    // Total par jour
    const byDay = Array.from({ length: 7 }, (_, d) =>
      cells.filter(c => c.day === d).reduce((s, c) => s + c.value, 0),
    );
    const maxByDay = Math.max(...byDay, 1);

    // Total par heure
    const byHour = Array.from({ length: 24 }, (_, h) =>
      cells.filter(c => c.hour === h).reduce((s, c) => s + c.value, 0),
    );

    // Pic
    const peak = cells.reduce((best, c) => c.value > best.value ? c : best, cells[0] ?? { day: 0, hour: 12, value: 0 });
    const peakLabel = `${DAYS_FULL[peak.day]} ${String(peak.hour).padStart(2, '0')}h–${String(peak.hour + 1).padStart(2, '0')}h`;

    return { maxVal, byDay, maxByDay, byHour, peakLabel };
  }, [stats.heatmap7x24]);

  const totalActions = stats.heatmap7x24.reduce((s, c) => s + c.value, 0);

  // Heures de la grille (on affiche colonnes 0h à 23h)
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <section id="heatmap">
      <SectionTitle icon={Clock} title="Heatmap d'activité — 7 jours × 24 heures" color="text-amber-700" />

      {/* Bandeau contextuel */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Pic d'activité : <strong>{peakLabel}</strong>
            {totalActions > 0 && <span className="text-amber-600 font-normal ml-2">· {totalActions} actions sur 7j</span>}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            💡 <strong>Conseil :</strong> Envoyez vos notifications et publications importantes <strong>30 min avant</strong> le pic pour maximiser l'engagement.
            {stats.peakHour < 12
              ? ` La communauté est matinale — planifiez les annonces importantes le matin.`
              : stats.peakHour < 18
              ? ` Communauté active en journée — idéal pour les annonces en pause déjeuner.`
              : ` Communauté de soirée — envoyez entre ${stats.peakHour - 1}h et ${stats.peakHour + 1}h.`}
          </p>
        </div>
      </div>

      {totalActions === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucune activité sur les 7 derniers jours</p>
          <p className="text-xs mt-1">La heatmap s'activera dès que des membres interagissent</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 overflow-x-auto">
          {/* Grille principale */}
          <div className="min-w-[640px]">
            {/* En-têtes heures */}
            <div className="flex mb-1">
              <div className="w-10 flex-shrink-0" /> {/* espace label jour */}
              {hours.map(h => (
                <div
                  key={h}
                  className="flex-1 text-center text-xs text-gray-400 font-medium"
                  style={{ minWidth: 24 }}
                >
                  {h % 3 === 0 ? `${String(h).padStart(2, '0')}` : ''}
                </div>
              ))}
            </div>

            {/* Lignes jours */}
            {Array.from({ length: 7 }, (_, day) => (
              <div key={day} className="flex items-center mb-1 gap-0.5">
                {/* Label jour */}
                <div className="w-10 flex-shrink-0 text-xs text-gray-500 font-semibold text-right pr-1.5">
                  {DAYS_FR[day]}
                </div>
                {/* Cellules heures */}
                {hours.map(hour => {
                  const cell = stats.heatmap7x24.find(c => c.day === day && c.hour === hour);
                  const val  = cell?.value ?? 0;
                  const { bg } = heatColor(val, maxVal);
                  return (
                    <div
                      key={hour}
                      className={`flex-1 rounded-sm cursor-default transition-all hover:scale-110 hover:z-10 relative group ${bg}`}
                      style={{ height: 22, minWidth: 20 }}
                      title={`${DAYS_FULL[day]} ${String(hour).padStart(2, '0')}h : ${val} action${val > 1 ? 's' : ''}`}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex items-center bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20 pointer-events-none">
                        {DAYS_FULL[day]} {String(hour).padStart(2, '0')}h : <strong className="ml-1">{val}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Légende couleurs */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-xs text-gray-400">Faible</span>
              {[0, 0.05, 0.25, 0.45, 0.65, 0.85].map((r, i) => {
                const { bg } = heatColor(r * 10, 10);
                return <div key={i} className={`w-5 h-4 rounded-sm ${bg}`} />;
              })}
              <span className="text-xs text-gray-400">Fort</span>
            </div>
          </div>
        </div>
      )}

      {/* Résumés par jour + top heures */}
      {totalActions > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

          {/* Volume par jour */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">📅 Volume d'activité par jour</h3>
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, d) => (
                <DayBar
                  key={d}
                  day={d}
                  total={byDay[d]}
                  max={Math.max(...byDay, 1)}
                />
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-600">
                💡 <strong>Meilleur jour :</strong>{' '}
                {DAYS_FULL[byDay.indexOf(Math.max(...byDay))]} ({Math.max(...byDay)} actions).{' '}
                <strong>Publiez vos annonces importantes ce jour-là.</strong>
              </p>
            </div>
          </div>

          {/* Top 5 heures d'activité */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">⏰ Top 5 heures d'activité</h3>
            <div className="space-y-3">
              {byHour
                .map((val, h) => ({ h, val }))
                .sort((a, b) => b.val - a.val)
                .slice(0, 5)
                .map(({ h, val }, rank) => {
                  const pct2 = Math.round((val / Math.max(...byHour, 1)) * 100);
                  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                  return (
                    <div key={h} className="flex items-center gap-3">
                      <span className="text-lg">{medals[rank]}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {String(h).padStart(2, '0')}h – {String(h + 1).padStart(2, '0')}h
                          </span>
                          <span className="text-xs font-bold text-gray-900">{val} actions</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${pct2}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-700">
                🔔 <strong>Automatisation suggérée :</strong> Programmez vos notifications push à{' '}
                <strong>{String(stats.peakHour - 1 < 0 ? 0 : stats.peakHour - 1).padStart(2, '0')}h30</strong>{' '}
                pour un taux de lecture optimal.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
