'use client';

/**
 * SectionArtisanRanking — Classement & scoring individuel des artisans
 *
 * Score composite 0-100 par artisan basé sur :
 *   • 30% taux de réponse aux demandes
 *   • 30% taux de complétion (missions terminées)
 *   • 30% note moyenne clients
 *   • 10% activité récente (30j)
 *
 * Donne à l'admin une vision claire des artisans performants / inactifs.
 */

import { useState } from 'react';
import { Award, TrendingUp, TrendingDown, AlertTriangle, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import { fmt } from '../_helpers';
import type { AllStats, ArtisanScore } from '../_types';

// ─── Badge niveau ─────────────────────────────────────────────────────────────

function ScoreBadge({ level, score }: { level: ArtisanScore['scoreLevel']; score: number }) {
  const styles = {
    excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    good:      'bg-blue-100   text-blue-700   border-blue-200',
    fair:      'bg-amber-100  text-amber-700  border-amber-200',
    poor:      'bg-red-100    text-red-700    border-red-200',
  };
  const labels = { excellent: 'Excellent', good: 'Bon', fair: 'Moyen', poor: 'Inactif' };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles[level]}`}>
      {labels[level]} · {score}/100
    </span>
  );
}

// ─── Barre de score ───────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const w = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Carte artisan expandable ─────────────────────────────────────────────────

function ArtisanCard({ artisan, rank }: { artisan: ArtisanScore; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  const isInactive = artisan.lastActivityDays > 30;
  const borderColor =
    artisan.scoreLevel === 'excellent' ? 'border-emerald-200' :
    artisan.scoreLevel === 'good'      ? 'border-blue-200'    :
    artisan.scoreLevel === 'fair'      ? 'border-amber-200'   : 'border-red-200';
  const rankBg =
    rank === 1 ? 'bg-amber-400 text-white' :
    rank === 2 ? 'bg-gray-300 text-gray-800' :
    rank === 3 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-600';

  // Score par composante (reconstruit pour affichage)
  const sResponse   = Math.round(artisan.responseRate   * 0.30);
  const sCompletion = Math.round(artisan.completionRate * 0.30);
  const sRating     = artisan.avgRating > 0 ? Math.round((artisan.avgRating / 5) * 30) : 10;
  const sActivity   = artisan.requestsLast30 >= 3 ? 10 : artisan.requestsLast30 >= 1 ? 6 : artisan.totalRequests > 0 ? 3 : 0;

  // Diagnostic contextuel
  const issues: string[] = [];
  const positives: string[] = [];

  if (artisan.responseRate >= 70) positives.push(`✅ Réactif : ${artisan.responseRate}% de réponse`);
  else if (artisan.responseRate < 30 && artisan.totalRequests > 0) issues.push(`⚠️ Seulement ${artisan.responseRate}% de réponses — ${artisan.pendingRequests} demande(s) ignorée(s)`);

  if (artisan.completionRate >= 70) positives.push(`✅ Fiable : ${artisan.completionRate}% de complétion`);
  else if (artisan.completionRate < 30 && artisan.totalRequests > 2) issues.push(`⚠️ Faible complétion : ${artisan.completionRate}% — vérifier les abandons`);

  if (artisan.avgRating >= 4.5) positives.push(`⭐ Note excellente : ${artisan.avgRating}/5`);
  else if (artisan.avgRating > 0 && artisan.avgRating < 3.5) issues.push(`🔴 Note basse : ${artisan.avgRating}/5 — clients insatisfaits`);

  if (isInactive) issues.push(`💤 Inactif depuis ${artisan.lastActivityDays === 9999 ? 'toujours' : `${artisan.lastActivityDays}j`}`);
  else if (artisan.requestsLast7 > 0) positives.push(`🔥 Actif cette semaine : ${artisan.requestsLast7} demande(s)`);

  if (artisan.totalReviews === 0 && artisan.totalRequests > 2) issues.push(`📭 0 avis malgré ${artisan.totalRequests} demandes — relancer les clients`);

  return (
    <div className={`rounded-2xl border ${borderColor} bg-white overflow-hidden`}>
      {/* Header */}
      <button
        className="w-full p-4 text-left flex items-center gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rang */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${rankBg}`}>
          {rank}
        </div>

        {/* Badge + nom */}
        <div className="text-2xl flex-shrink-0">{artisan.badge}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-bold text-gray-900 truncate">{artisan.displayName}</p>
              <p className="text-xs text-gray-500">{artisan.tradeCategory}</p>
            </div>
            <ScoreBadge level={artisan.scoreLevel} score={artisan.score} />
          </div>
          {/* Mini barre de score */}
          <div className="mt-2">
            <ScoreBar
              value={artisan.score}
              color={
                artisan.scoreLevel === 'excellent' ? '#059669' :
                artisan.scoreLevel === 'good'      ? '#3b82f6' :
                artisan.scoreLevel === 'fair'       ? '#f59e0b' : '#ef4444'
              }
            />
          </div>
        </div>

        {/* KPIs rapides */}
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-center">
          <div>
            <p className="text-xs text-gray-400">Demandes</p>
            <p className="text-sm font-bold text-gray-900">{artisan.totalRequests}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Note</p>
            <p className="text-sm font-bold text-gray-900">
              {artisan.avgRating > 0 ? `${artisan.avgRating}⭐` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Répond</p>
            <p className={`text-sm font-bold ${artisan.responseRate >= 60 ? 'text-emerald-600' : artisan.responseRate >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
              {artisan.responseRate}%
            </p>
          </div>
        </div>

        {/* Alerte inactive */}
        {isInactive && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
        <span className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Détail expandable */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {/* Décomposition score */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Taux réponse',   value: `${artisan.responseRate}%`,   pts: sResponse,   color: '#3b82f6', target: '≥70%' },
              { label: 'Complétion',     value: `${artisan.completionRate}%`, pts: sCompletion, color: '#22c55e', target: '≥70%' },
              { label: 'Note clients',   value: artisan.avgRating > 0 ? `${artisan.avgRating}/5` : '—', pts: sRating, color: '#f59e0b', target: '≥4/5' },
              { label: 'Activité 30j',  value: `${artisan.requestsLast30} dem.`, pts: sActivity, color: '#a855f7', target: '≥3 dem.' },
            ].map(comp => (
              <div key={comp.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">{comp.label}</p>
                <p className="text-sm font-bold text-gray-900">{comp.value}</p>
                <div className="flex items-center justify-between mt-1.5 mb-1">
                  <ScoreBar value={comp.pts} max={30} color={comp.color} />
                </div>
                <p className="text-xs text-gray-400">{comp.pts}/30 pts · cible {comp.target}</p>
              </div>
            ))}
          </div>

          {/* Statistiques détaillées */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Total dem.',  value: artisan.totalRequests },
              { label: 'Terminées',  value: artisan.completedRequests },
              { label: 'Annulées',   value: artisan.cancelledRequests },
              { label: 'En attente', value: artisan.pendingRequests },
              { label: 'Avis',       value: artisan.totalReviews },
              { label: 'Note moy.',  value: artisan.avgRating > 0 ? `${artisan.avgRating}★` : '—' },
            ].map(s => (
              <div key={s.label} className="text-center bg-white border border-gray-100 rounded-lg p-2">
                <p className="text-sm font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Diagnostic & recommandations */}
          {(issues.length > 0 || positives.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {positives.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-emerald-700 mb-2">✅ Points forts</p>
                  <ul className="space-y-1">
                    {positives.map((p, i) => <li key={i} className="text-xs text-emerald-800">{p}</li>)}
                  </ul>
                </div>
              )}
              {issues.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-2">⚠️ Points à améliorer</p>
                  <ul className="space-y-1">
                    {issues.map((p, i) => <li key={i} className="text-xs text-red-800">{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Dernier contact */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            {artisan.lastActivityDays === 9999
              ? 'Jamais actif'
              : artisan.lastActivityDays === 0
              ? "Actif aujourd'hui"
              : `Dernière activité : il y a ${artisan.lastActivityDays} jour${artisan.lastActivityDays > 1 ? 's' : ''}`}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

type FilterType = 'all' | 'active' | 'inactive' | 'poor';

export function SectionArtisanRanking({ stats }: { stats: AllStats }) {
  const [filter, setFilter] = useState<FilterType>('all');

  const artisans = stats.artisanScores ?? [];

  const filtered = artisans.filter(a => {
    if (filter === 'active')   return a.lastActivityDays < 30;
    if (filter === 'inactive') return a.lastActivityDays >= 30;
    if (filter === 'poor')     return a.scoreLevel === 'poor' || a.scoreLevel === 'fair';
    return true;
  });

  const avgScore = artisans.length > 0
    ? Math.round(artisans.reduce((s, a) => s + a.score, 0) / artisans.length)
    : 0;
  const inactiveCount  = artisans.filter(a => a.lastActivityDays >= 30).length;
  const excellentCount = artisans.filter(a => a.scoreLevel === 'excellent').length;
  const poorCount      = artisans.filter(a => a.scoreLevel === 'poor').length;

  if (artisans.length === 0) {
    return (
      <section id="artisan-ranking">
        <SectionTitle icon={Award} title="Classement & score des artisans" color="text-amber-700" />
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucun artisan inscrit pour le moment</p>
          <p className="text-xs mt-1">Le classement apparaîtra dès le premier artisan vérifié</p>
        </div>
      </section>
    );
  }

  return (
    <section id="artisan-ranking">
      <SectionTitle icon={Award} title="Classement & score des artisans" color="text-amber-700" />

      {/* Résumé global */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black text-gray-900">{artisans.length}</p>
          <p className="text-xs font-medium text-gray-600 mt-1">Artisans</p>
          <p className="text-xs text-gray-400">{artisans.filter(a => a.artisanType === 'professionnel').length} pros · {artisans.filter(a => a.artisanType === 'particulier').length} particuliers</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className={`text-2xl font-black ${avgScore >= 60 ? 'text-emerald-600' : avgScore >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
            {avgScore}
          </p>
          <p className="text-xs font-medium text-gray-600 mt-1">Score moyen /100</p>
          <p className="text-xs text-gray-400">{excellentCount} excellent{excellentCount > 1 ? 's' : ''}</p>
        </div>
        <div className={`rounded-2xl border p-4 text-center ${inactiveCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <p className={`text-2xl font-black ${inactiveCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {inactiveCount}
          </p>
          <p className="text-xs font-medium text-gray-600 mt-1">Inactifs &gt; 30j</p>
          <p className="text-xs text-gray-400">
            {inactiveCount > 0 ? 'À relancer manuellement' : '✅ Tous actifs'}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 text-center ${poorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <p className={`text-2xl font-black ${poorCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {poorCount}
          </p>
          <p className="text-xs font-medium text-gray-600 mt-1">Score insuffisant</p>
          <p className="text-xs text-gray-400">
            {poorCount > 0 ? 'Formation/suspension à envisager' : '✅ Tous corrects'}
          </p>
        </div>
      </div>

      {/* Insight global */}
      {inactiveCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {inactiveCount} artisan{inactiveCount > 1 ? 's' : ''} inactif{inactiveCount > 1 ? 's' : ''} depuis plus de 30 jours
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Un artisan inactif depuis 30j a 70% de chances de ne jamais revenir sans relance directe.
              <strong className="ml-1">Contactez-les individuellement</strong> avec un message personnalisé rappelant les demandes en attente.
            </p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'all',      label: `Tous (${artisans.length})` },
          { key: 'active',   label: `Actifs (${artisans.length - inactiveCount})` },
          { key: 'inactive', label: `Inactifs (${inactiveCount})` },
          { key: 'poor',     label: `À améliorer (${poorCount + artisans.filter(a => a.scoreLevel === 'fair').length})` },
        ] as { key: FilterType; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === f.key
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tendances globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-bold text-gray-700">Meilleur artisan</p>
          </div>
          {artisans[0] && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{artisans[0].badge}</span>
              <div>
                <p className="text-sm font-bold text-gray-900">{artisans[0].displayName}</p>
                <p className="text-xs text-gray-500">{artisans[0].tradeCategory} · {artisans[0].score}/100</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold text-gray-700">Meilleure note</p>
          </div>
          {(() => {
            const best = [...artisans].filter(a => a.totalReviews > 0).sort((a, b) => b.avgRating - a.avgRating)[0];
            return best ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{best.displayName}</p>
                  <p className="text-xs text-gray-500">{best.avgRating}/5 · {best.totalReviews} avis</p>
                </div>
              </div>
            ) : <p className="text-xs text-gray-400">Aucun avis encore</p>;
          })()}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          Aucun artisan dans cette catégorie
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((artisan, idx) => (
            <ArtisanCard
              key={artisan.userId}
              artisan={artisan}
              rank={artisans.indexOf(artisan) + 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}
