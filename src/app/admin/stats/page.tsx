'use client';

/**
 * src/app/admin/stats/page.tsx — Orchestrateur (page légère).
 *
 * Logique de données → _hooks/useAdminStats.ts
 * Types             → _types.ts
 * Helpers           → _helpers.ts
 * UI atomique       → _components/KpiCard.tsx, SectionTitle.tsx
 * Sections          → _components/Section*.tsx
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { BarChart2, ChevronLeft, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { useAdminStats } from './_hooks/useAdminStats';
import { SectionOverview }  from './_components/SectionOverview';
import { SectionActivity }  from './_components/SectionActivity';
import { SectionUsers }     from './_components/SectionUsers';
import { SectionMessages }  from './_components/SectionMessages';
import { SectionForum }     from './_components/SectionForum';
import { SectionListings }  from './_components/SectionListings';
import { SectionRequests }  from './_components/SectionRequests';

export default function AdminStatsPage() {
  const { profile, isAdmin } = useAuthStore();
  const { stats, loading, lastRefresh, fetchAllStats } = useAdminStats();

  useEffect(() => { fetchAllStats(); }, [fetchAllStats]);

  if (!profile || !isAdmin()) return null;

  return (
    <ProtectedPage adminOnly>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-brand-600" /> Statistiques complètes
              </h1>
              <p className="text-sm text-gray-500">
                Toute l&apos;activité de Biguglia Connect en temps réel
              </p>
            </div>
          </div>
          <button
            onClick={fetchAllStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* ── Skeleton de chargement ──────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <div className="space-y-10">
            <SectionOverview  stats={stats} />
            <SectionActivity  stats={stats} />
            <SectionUsers     stats={stats} />
            <SectionMessages  stats={stats} />
            <SectionForum     stats={stats} />
            <SectionListings  stats={stats} />
            <SectionRequests  stats={stats} />

            {/* ── Pied de page ─────────────────────────────────────── */}
            <div className="text-center text-xs text-gray-400 pb-4">
              Données actualisées le{' '}
              {lastRefresh.toLocaleDateString('fr-FR')} à{' '}
              {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              <button onClick={fetchAllStats} className="text-brand-600 hover:underline">
                Actualiser
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
