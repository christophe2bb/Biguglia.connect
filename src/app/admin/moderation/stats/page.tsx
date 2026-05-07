'use client';

/**
 * Admin — Tableau de bord KPI Modération
 *
 * Statistiques complètes : taux d'acceptation/refus/correction,
 * délais moyens, thèmes problématiques, membres les plus signalés/fiables.
 *
 * SÉCURITÉ : toutes les données sont chargées via GET /api/admin/moderation/stats-data
 * (protégé par getAdminUser — service-role, bypass RLS).
 * Plus aucune requête Supabase directe depuis le navigateur.
 *
 * Architecture : 4 panneaux lazy-chargés → seuls les imports actifs atterrissent
 * dans le bundle initial.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react';
import type { ModerationStatsData } from '@/app/api/admin/moderation/stats-data/route';
import toast from 'react-hot-toast';
import { adminFetch } from '@/lib/admin-fetch';

// ─── Spinner inline ────────────────────────────────────────────────────────────
function PanelSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

// ─── Lazy panels ──────────────────────────────────────────────────────────────
const StatsOverview = dynamic(() => import('./_components/StatsOverview'), {
  loading: () => <PanelSkeleton />,
});

const RatesPanel = dynamic(() => import('./_components/RatesPanel'), {
  loading: () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  ),
});

const ByTypePanel = dynamic(() => import('./_components/ByTypePanel'), {
  loading: () => (
    <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
  ),
});

const MembersPanel = dynamic(() => import('./_components/MembersPanel'), {
  loading: () => (
    <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
  ),
});

// ─── Page ────────────────────────────────────────────────────────────────────
function ModerationStatsContent() {
  const [stats, setStats] = useState<ModerationStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/moderation/stats-data');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error('Erreur de chargement : ' + (err.error ?? res.statusText));
        return;
      }
      const json = await res.json();
      const data: ModerationStatsData = json.stats ?? json;
      setStats(data);
    } catch (err) {
      console.error('[moderation stats] fetch error:', err);
      toast.error('Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/moderation" className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Statistiques Modération</h1>
              <p className="text-gray-500 text-sm">KPIs & analyse des publications</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchStats}
          className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {loading ? (
        <PanelSkeleton />
      ) : !stats ? (
        <p className="text-gray-500 text-center py-12">Données non disponibles</p>
      ) : (
        <div className="space-y-8">
          {/* KPIs principaux */}
          <StatsOverview stats={stats} />

          {/* Taux + alertes risque */}
          <RatesPanel stats={stats} />

          {/* Répartition par thème + décisions récentes */}
          <ByTypePanel stats={stats} />

          {/* Membres surveillés + de confiance */}
          <MembersPanel stats={stats} />
        </div>
      )}
    </div>
  );
}

export default function ModerationStatsPage() {
  return <ModerationStatsContent />;
}
