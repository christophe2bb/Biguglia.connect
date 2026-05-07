'use client';

/**
 * /admin/signalements/stats
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard analytique complet des signalements.
 * Données : GET /api/admin/reports/stats (service-role, bypass RLS).
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, BarChart3, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminFetch } from '@/lib/admin-fetch';
import type { ReportStatsData } from '@/app/api/admin/reports/stats/route';

// ── Lazy panels ───────────────────────────────────────────────────────────────
const KpiStrip         = dynamic(() => import('./_components/KpiStrip'),          { loading: () => <Skeleton h="h-40" /> });
const TimeSeriesChart  = dynamic(() => import('./_components/TimeSeriesChart'),   { loading: () => <Skeleton h="h-52" /> });
const DistributionPanels = dynamic(() => import('./_components/DistributionPanels'), { loading: () => <Skeleton h="h-64" /> });
const TopPanels        = dynamic(() => import('./_components/TopPanels'),         { loading: () => <Skeleton h="h-64" /> });
const ResolutionPanel  = dynamic(() => import('./_components/ResolutionPanel'),   { loading: () => <Skeleton h="h-48" /> });

function Skeleton({ h }: { h: string }) {
  return <div className={`w-full ${h} bg-gray-100 rounded-2xl animate-pulse`} />;
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(stats: ReportStatsData) {
  const rows = [
    ['Indicateur', 'Valeur'],
    ['Total signalements', stats.kpi.total],
    ['En attente', stats.kpi.pending],
    ['En examen', stats.kpi.reviewed],
    ['Résolus', stats.kpi.resolved],
    ['Ignorés', stats.kpi.dismissed],
    ['Taux résolution (%)', stats.kpi.resolutionRate],
    ['Taux rejet (%)', stats.kpi.dismissRate],
    ['Délai moyen (h)', stats.kpi.avgResolutionHours ?? '—'],
    ['Délai min (h)', stats.kpi.minResolutionHours ?? '—'],
    ['Délai max (h)', stats.kpi.maxResolutionHours ?? '—'],
    ['Aujourd\'hui', stats.kpi.todayCount],
    ['7 derniers jours', stats.kpi.last7d],
    ['30 derniers jours', stats.kpi.last30d],
    [],
    ['Type de contenu', 'Total', '% du total', 'Résolus', 'En attente'],
    ...stats.byType.map(t => [t.type, t.count, t.pct, t.resolved, t.pending]),
    [],
    ['Raison', 'Total', '% du total', 'Résolus'],
    ...stats.byReason.map(r => [r.reason, r.count, r.pct, r.resolved]),
    [],
    ['Série temporelle (30j)', 'Date', 'Signalements', 'Résolus'],
    ...stats.timeSeries.map(d => ['', d.date, d.count, d.resolved]),
  ];

  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `signalements_stats_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SignalementsStatsPage() {
  const [stats,   setStats]   = useState<ReportStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/reports/stats');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error('Erreur de chargement : ' + (err.error ?? res.statusText));
        return;
      }
      const data: ReportStatsData = await res.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[signalements/stats]', err);
      toast.error('Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/signalements"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-xl hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-rose-700 rounded-2xl flex items-center justify-center shadow-sm">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Analytique Signalements</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Métriques, tendances &amp; indicateurs de performance
                  {lastRefresh && (
                    <span className="ml-2">· actualisé {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stats && (
              <button
                onClick={() => exportCSV(stats)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                title="Exporter en CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        {/* ── Contenu ── */}
        {loading && !stats ? (
          <div className="space-y-5">
            <Skeleton h="h-40" />
            <Skeleton h="h-52" />
            <Skeleton h="h-64" />
          </div>
        ) : !stats ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400">Données non disponibles.</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* 1 — KPIs */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Indicateurs clés de performance
              </h2>
              <KpiStrip kpi={stats.kpi} />
            </section>

            {/* 2 — Évolution temporelle */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Tendances temporelles
              </h2>
              <TimeSeriesChart data={stats.timeSeries} />
            </section>

            {/* 3 — Distributions */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Répartitions
              </h2>
              <DistributionPanels
                byType={stats.byType}
                byReason={stats.byReason}
                byStatus={stats.byStatus}
              />
            </section>

            {/* 4 — Tops & récidivistes */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Membres &amp; contenus
              </h2>
              <TopPanels
                topReporters={stats.topReporters}
                topTargets={stats.topTargets}
                recidivists={stats.recidivists}
              />
            </section>

            {/* 5 — Délais de traitement */}
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Performance de traitement — SLA
              </h2>
              <ResolutionPanel data={stats.resolutionByType} />
            </section>

            {/* Footer récapitulatif */}
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-100 p-5">
              <p className="text-sm font-bold text-red-800 mb-2">📋 Synthèse exécutive</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-red-700">{stats.kpi.total}</p>
                  <p className="text-[10px] text-red-500 font-semibold">signalements totaux</p>
                </div>
                <div>
                  <p className={`text-2xl font-black ${stats.kpi.resolutionRate >= 80 ? 'text-emerald-600' : stats.kpi.resolutionRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {stats.kpi.resolutionRate}%
                  </p>
                  <p className="text-[10px] text-red-500 font-semibold">taux résolution</p>
                </div>
                <div>
                  <p className={`text-2xl font-black ${(stats.kpi.avgResolutionHours ?? 999) <= 24 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {stats.kpi.avgResolutionHours != null ? `${stats.kpi.avgResolutionHours}h` : '—'}
                  </p>
                  <p className="text-[10px] text-red-500 font-semibold">délai moyen traitement</p>
                </div>
                <div>
                  <p className={`text-2xl font-black ${stats.kpi.pending === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stats.kpi.pending}
                  </p>
                  <p className="text-[10px] text-red-500 font-semibold">en attente actuellement</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
