

import { Star, Flag, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import Link from 'next/link';
import { SectionTitle } from './SectionTitle';
import { COLORS, PIE_COLORS, fmt } from '../_helpers';
import type { AllStats } from '../_types';

// ─── Distribution par étoile ──────────────────────────────────────────────────

function RatingBars({ stats }: { stats: AllStats }) {
  const maxCount = Math.max(...[5, 4, 3, 2, 1].map(s =>
    stats.ratingDistribution.find(r => r.name === `${s} ⭐`)?.value ?? 0
  ), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">
        Avis clients — {fmt.format(stats.totalReviews)} avis
      </h3>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl font-black text-amber-500">{stats.avgRating}</span>
        <div>
          <div className="flex gap-0.5 text-amber-400 text-lg">
            {[1,2,3,4,5].map(s => (
              <span key={s} className={s <= Math.round(stats.avgRating) ? 'opacity-100' : 'opacity-20'}>★</span>
            ))}
          </div>
          <p className="text-xs text-gray-400">sur 5 · {fmt.format(stats.totalReviews)} avis</p>
        </div>
      </div>

      {stats.totalReviews > 0 ? (
        <>
          <div className="space-y-2 mb-4">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.ratingDistribution.find(r => r.name === `${star} ⭐`)?.value ?? 0;
              const barW  = Math.round((count / maxCount) * 100);
              const barColor = star >= 4 ? 'bg-emerald-400' : star === 3 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-6">{star}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barW}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Sentiments */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-emerald-700">{stats.positiveReviews}</p>
              <p className="text-xs text-emerald-600">Positifs (≥4★)</p>
              <p className="text-xs text-emerald-400">{Math.round((stats.positiveReviews / stats.totalReviews) * 100)}%</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
              <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-600">{stats.negativeReviews}</p>
              <p className="text-xs text-red-500">Négatifs (≤2★)</p>
              <p className="text-xs text-red-300">{Math.round((stats.negativeReviews / stats.totalReviews) * 100)}%</p>
            </div>
          </div>

          {/* Insight qualité */}
          <div className="mt-4 p-3 rounded-xl border text-xs bg-gray-50 border-gray-100 text-gray-600">
            {stats.avgRating >= 4.5
              ? '🌟 Excellente réputation. Les artisans de la plateforme reçoivent d\'excellents retours.'
              : stats.avgRating >= 4
              ? '👍 Bonne satisfaction. Encouragez les clients satisfaits à laisser plus d\'avis.'
              : stats.avgRating >= 3
              ? '⚠️ Satisfaction mitigée. Identifiez les artisans avec plusieurs avis négatifs.'
              : '🔴 Satisfaction faible. Contactez les artisans concernés immédiatement.'}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Aucun avis pour le moment</p>
          <p className="text-xs text-gray-400 mt-1">Les avis apparaîtront après les premières demandes artisan terminées</p>
        </div>
      )}
    </div>
  );
}

// ─── Demandes artisans ────────────────────────────────────────────────────────

function RequestsPanel({ stats }: { stats: AllStats }) {
  const completionColor =
    stats.requestCompletionRate >= 50 ? 'text-emerald-600' :
    stats.requestCompletionRate >= 25 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Demandes artisans ({fmt.format(stats.totalRequests)} total)
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
          <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-amber-700">{stats.pendingRequests}</p>
          <p className="text-xs text-amber-600">En attente</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
          <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className={`text-lg font-bold ${completionColor}`}>{stats.requestCompletionRate}%</p>
          <p className="text-xs text-emerald-600">Complétées</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
          <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-red-500">{stats.requestCancellationRate}%</p>
          <p className="text-xs text-red-500">Annulées</p>
        </div>
      </div>

      {/* Statuts */}
      {stats.requestsByStatus.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.requestsByStatus} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} />
            <Tooltip />
            <Bar dataKey="value" fill={COLORS.indigo} radius={[0, 6, 6, 0]} name="Demandes" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">Aucune demande</p>
      )}

      {/* Insight */}
      <div className="mt-3 p-3 rounded-xl border text-xs bg-gray-50 border-gray-100 text-gray-600">
        {stats.artisanResponseRate >= 60
          ? '✅ Bonne réactivité artisans. Maintenez ce niveau de réponse.'
          : stats.artisanResponseRate >= 30
          ? `⏳ Taux de réponse artisans : ${stats.artisanResponseRate}%. Relancez les artisans qui n'ont pas encore répondu.`
          : `🔴 Réactivité faible (${stats.artisanResponseRate}%). Les clients risquent de se tourner vers d'autres solutions.`}
      </div>
    </div>
  );
}

// ─── Signalements ─────────────────────────────────────────────────────────────

function ReportsPanel({ stats }: { stats: AllStats }) {
  if (stats.totalReports === 0) return null;

  const reportData = [
    { name: 'En attente', value: stats.pendingReports,  fill: COLORS.amber },
    { name: 'Résolus',    value: stats.resolvedReports,  fill: COLORS.green },
    { name: 'Autres',     value: Math.max(0, stats.totalReports - stats.pendingReports - stats.resolvedReports), fill: COLORS.blue },
  ].filter(d => d.value > 0);

  return (
    <section>
      <SectionTitle icon={Flag} title="Signalements" color="text-red-700" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <p className="text-4xl font-black text-red-600">{fmt.format(stats.pendingReports)}</p>
              <p className="text-sm text-gray-600 mt-1">signalements en attente de traitement</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>📋 {fmt.format(stats.totalReports)} total</span>
                <span>✅ {fmt.format(stats.resolvedReports)} résolus</span>
                <span>📊 {stats.reportResolutionRate}% taux résolution</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {stats.pendingReports > 0 && (
                <Link
                  href="/admin/signalements"
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  <Flag className="w-4 h-4" /> Traiter
                </Link>
              )}
              <Link
                href="/admin/signalements/stats"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                📊 Statistiques détaillées
              </Link>
            </div>
          </div>

          <div className="p-3 rounded-xl border text-xs bg-red-50 border-red-100 text-red-700">
            {stats.reportResolutionRate >= 80
              ? '✅ Excellente gestion des signalements. La communauté est bien protégée.'
              : stats.reportResolutionRate >= 50
              ? '⚠️ Des signalements restent non traités. Établissez une routine de traitement quotidienne.'
              : '🔴 Nombreux signalements non traités. Traitez-les pour maintenir la confiance de la communauté.'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition des signalements</h3>
          {reportData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={reportData} cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70}
                  dataKey="value" nameKey="name"
                  paddingAngle={3}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {reportData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function SectionRequests({ stats }: { stats: AllStats }) {
  return (
    <>
      <section>
        <SectionTitle icon={Star} title="Demandes artisans & Avis clients" color="text-amber-700" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RequestsPanel stats={stats} />
          <RatingBars stats={stats} />
        </div>
      </section>

      <ReportsPanel stats={stats} />
    </>
  );
}
