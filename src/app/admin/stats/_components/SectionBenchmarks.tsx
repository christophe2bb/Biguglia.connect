'use client';

/**
 * SectionBenchmarks — Comparaison avec benchmarks secteur civic-tech
 *
 * Compare chaque métrique clé de Biguglia Connect avec les standards
 * des plateformes communautaires locales (Nextdoor, Voisin Malin, Allovoisins).
 * Donne un contexte objectif à l'admin pour savoir où il se situe réellement.
 */

import { BarChart2, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import type { AllStats, BenchmarkItem } from '../_types';

// ─── Barre de comparaison ─────────────────────────────────────────────────────

function CompareBar({
  platform,
  benchmark,
  unit,
}: {
  platform: number;
  benchmark: number;
  unit: string;
}) {
  const max = Math.max(platform, benchmark) * 1.3;
  const pPct = max === 0 ? 0 : Math.round((platform  / max) * 100);
  const bPct = max === 0 ? 0 : Math.round((benchmark / max) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="w-20 text-right text-xs font-semibold text-brand-600">Vous</div>
        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-700"
            style={{ width: `${pPct}%` }}
          />
        </div>
        <div className="w-16 text-xs font-bold text-gray-900 tabular-nums">
          {platform}{unit}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20 text-right text-xs font-medium text-gray-500">Référence</div>
        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gray-400 transition-all duration-700"
            style={{ width: `${bPct}%` }}
          />
        </div>
        <div className="w-16 text-xs font-semibold text-gray-500 tabular-nums">
          {benchmark}{unit}
        </div>
      </div>
    </div>
  );
}

// ─── Carte benchmark ──────────────────────────────────────────────────────────

function BenchmarkCard({ item }: { item: BenchmarkItem }) {
  const isAbove = item.status === 'above';
  const isAt    = item.status === 'at';
  const isBelow = item.status === 'below';

  const statusStyle =
    isAbove ? { border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', label: '▲ AU-DESSUS', Icon: TrendingUp,  iconColor: 'text-emerald-600' } :
    isAt    ? { border: 'border-blue-200',    bg: 'bg-blue-50',    badge: 'bg-blue-100    text-blue-700',    label: '= DANS LA NORME', Icon: Minus,      iconColor: 'text-blue-500'    } :
              { border: 'border-red-200',     bg: 'bg-red-50',     badge: 'bg-red-100     text-red-700',     label: '▼ EN DESSOUS',   Icon: TrendingDown, iconColor: 'text-red-500'   };

  const gapText =
    isAbove ? `+${Math.abs(item.gap)}${item.unit} de plus (+${Math.abs(item.gapPct)}%)` :
    isAt    ? `Dans la moyenne du secteur` :
              `${Math.abs(item.gap)}${item.unit} en dessous (-${Math.abs(item.gapPct)}%)`;

  return (
    <div className={`rounded-2xl border ${statusStyle.border} ${statusStyle.bg} p-5`}>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-bold text-gray-900">{item.metric}</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle.badge}`}>
            {statusStyle.label}
          </span>
        </div>
        <statusStyle.Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusStyle.iconColor}`} />
      </div>

      {/* Barres de comparaison */}
      <CompareBar platform={item.platform} benchmark={item.benchmark} unit={item.unit} />

      {/* Écart */}
      <p className={`text-xs font-semibold mt-3 ${isAbove ? 'text-emerald-700' : isAt ? 'text-blue-600' : 'text-red-600'}`}>
        {gapText}
      </p>

      {/* Contexte */}
      <p className="text-xs text-gray-600 mt-2 leading-relaxed">{item.context}</p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SectionBenchmarks({ stats }: { stats: AllStats }) {
  const benchmarks = stats.benchmarks ?? [];

  const aboveCount = benchmarks.filter(b => b.status === 'above').length;
  const atCount    = benchmarks.filter(b => b.status === 'at').length;
  const belowCount = benchmarks.filter(b => b.status === 'below').length;

  // Score benchmark global (% métriques au-dessus ou dans la norme)
  const benchmarkScore = benchmarks.length > 0
    ? Math.round(((aboveCount + atCount) / benchmarks.length) * 100)
    : 0;

  return (
    <section id="benchmarks">
      <SectionTitle icon={BarChart2} title="Benchmarks — Comparaison secteur civic-tech" color="text-indigo-700" />

      {/* Disclaimer sources */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Références : études OuiHelper (2023), Voisin Malin (2022), Nextdoor France (2022), Allovoisins (2023).
          Ces benchmarks concernent des plateformes communautaires locales de 100–5000 membres.
          <strong className="ml-1">Votre plateforme est en phase de démarrage</strong> — certains écarts sont normaux et se réduisent naturellement avec la croissance.
        </p>
      </div>

      {/* Résumé global */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-emerald-700">{aboveCount}</p>
          <p className="text-xs font-semibold text-emerald-800 mt-1">Au-dessus</p>
          <p className="text-xs text-emerald-600">des standards</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-blue-700">{atCount}</p>
          <p className="text-xs font-semibold text-blue-800 mt-1">Dans la norme</p>
          <p className="text-xs text-blue-600">du secteur</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-red-700">{belowCount}</p>
          <p className="text-xs font-semibold text-red-800 mt-1">En dessous</p>
          <p className="text-xs text-red-600">à améliorer</p>
        </div>
      </div>

      {/* Barre de score benchmark */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Score de positionnement sectoriel</p>
          <span className={`text-lg font-black ${benchmarkScore >= 60 ? 'text-emerald-600' : benchmarkScore >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
            {benchmarkScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${benchmarkScore >= 60 ? 'bg-emerald-500' : benchmarkScore >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${benchmarkScore}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {benchmarkScore >= 70
            ? "🏆 Vous performez mieux que la moyenne du secteur sur la majorité des indicateurs."
            : benchmarkScore >= 45
            ? "📊 Performances dans la norme du secteur — focus sur les métriques en dessous."
            : "📈 Phase de démarrage normale. Ces écarts se comblent avec la croissance de la communauté."}
        </p>
      </div>

      {/* Grille des benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {benchmarks.map((item, i) => (
          <BenchmarkCard key={i} item={item} />
        ))}
      </div>

      {/* Insight global en bas */}
      <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Priorité pour atteindre les standards secteur
        </p>
        <ol className="space-y-2">
          {benchmarks
            .filter(b => b.status === 'below')
            .sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct))
            .slice(0, 3)
            .map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-indigo-900">
                <span className="font-black text-indigo-600 w-4 flex-shrink-0">{i + 1}.</span>
                <span>
                  <strong>{b.metric}</strong> : actuellement {b.platform}{b.unit}
                  {' '}→ objectif {b.benchmark}{b.unit}
                  <span className="text-indigo-600 ml-1">(écart : {Math.abs(b.gap)}{b.unit})</span>
                </span>
              </li>
            ))}
          {benchmarks.filter(b => b.status === 'below').length === 0 && (
            <li className="text-xs text-indigo-700">🎉 Vous êtes dans ou au-dessus des standards sur toutes les métriques !</li>
          )}
        </ol>
      </div>
    </section>
  );
}
