'use client';

/**
 * Admin — File de modération centralisée
 *
 * SÉCURITÉ : données chargées via GET /api/admin/moderation/queue
 * (protégé par getAdminUser — service-role, bypass RLS).
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Shield, CheckCircle,
  Search, RefreshCw, ArrowLeft,
  BarChart3, AlertCircle, Info,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import type { ModerationQueueData, ModerationKPI } from '@/app/api/admin/moderation/queue/route';
import ProtectedPage from '@/components/providers/ProtectedPage';
import toast from 'react-hot-toast';
import { adminFetch } from '@/lib/admin-fetch';
import {
  CONTENT_TYPE_LABELS,
  type ModerationStatus, type ContentType, type TrustLevel,
} from '@/lib/moderation';
import type { QueueItem as ApiQueueItem } from '@/app/api/admin/moderation/queue/route';
import KPICard from './_components/KPICard';

// Lazy-load the heavy QueueRow
const QueueRow = dynamic(() => import('./_components/QueueRow'), {
  loading: () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      </div>
    </div>
  ),
});

type QueueItem = ApiQueueItem & {
  author_trust: TrustLevel;
  status: ModerationStatus;
  content_type: ContentType;
};

function ModerationQueueContent() {
  const { profile, isModerator } = useAuthStore();
  const router = useRouter();

  const [items, setItems]           = useState<QueueItem[]>([]);
  const [kpi, setKpi]               = useState<ModerationKPI | null>(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const [filterStatus, setFilterStatus]     = useState<string>('en_attente_validation');
  const [filterType, setFilterType]         = useState<string>('all');
  const [filterRisk, setFilterRisk]         = useState<string>('all');
  const [filterTrust, setFilterTrust]       = useState<string>('all');
  const [filterNewMember, setFilterNewMember] = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [sortBy, setSortBy]                 = useState<'submitted_at' | 'risk_score'>('submitted_at');

  useEffect(() => {
    if (profile && !isModerator()) {
      router.push('/admin');
    }
  }, [profile, isModerator, router]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status:       filterStatus,
        content_type: filterType,
        risk_level:   filterRisk,
        author_trust: filterTrust,
        search:       searchQuery,
        sort:         sortBy,
      });

      const res = await adminFetch(`/api/admin/moderation/queue?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error('Erreur de chargement : ' + (err.error ?? res.statusText));
        return;
      }

      const data: ModerationQueueData = await res.json();

      let results = (data.items ?? []) as QueueItem[];
      if (filterNewMember) {
        const threshold = Date.now() - 7 * 24 * 3600 * 1000;
        results = results.filter(item =>
          item.author?.created_at && new Date(item.author.created_at).getTime() > threshold
        );
      }

      setItems(results);
      setKpi(data.kpi);
    } catch (err) {
      console.error('[moderation queue] fetch error:', err);
      toast.error('Impossible de charger la file de modération.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, filterRisk, filterTrust, filterNewMember, searchQuery, sortBy]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleQuickDecision = async (queueId: string, decision: 'accepter' | 'refuser') => {
    if (!profile) return;
    setProcessing(queueId);

    const res = await adminFetch(`/api/admin/moderation/${queueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur lors de la décision : ' + (data.error ?? res.statusText));
    } else {
      toast.success(decision === 'accepter' ? '✅ Publication acceptée' : '❌ Publication refusée');
      fetchQueue();
    }
    setProcessing(null);
  };

  const pendingCount = kpi?.pending ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                File de modération
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-500 text-sm">Validation centralisée — toutes les publications</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchQueue}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <Link
            href="/admin/moderation/stats"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-sm transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <KPICard label="En attente"    value={kpi?.pending ?? '—'}    emoji="⏳" color="text-amber-600"   highlight={(kpi?.pending ?? 0) > 0} />
        <KPICard label="Haut risque"   value={kpi?.high_risk ?? '—'}  emoji="⚠️" color="text-orange-600"  highlight={(kpi?.high_risk ?? 0) > 0} />
        <KPICard label="Publiées"      value={kpi?.published ?? '—'}  emoji="✅" color="text-emerald-600" />
        <KPICard label="Refusées"      value={kpi?.refused ?? '—'}    emoji="❌" color="text-red-600" />
        <KPICard
          label="Délai moyen"
          value={kpi?.avg_review_hours != null ? `${kpi.avg_review_hours.toFixed(1)}h` : '—'}
          emoji="⏱️"
          color="text-indigo-600"
          subtext="objectif < 24h"
        />
      </div>

      {/* Bannière alertes */}
      {(kpi?.high_risk ?? 0) > 0 && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">
              {kpi?.high_risk} publication{(kpi?.high_risk ?? 0) > 1 ? 's' : ''} à risque élevé nécessite{(kpi?.high_risk ?? 0) > 1 ? 'nt' : ''} une attention prioritaire
            </p>
          </div>
          <button
            onClick={() => { setFilterRisk('high'); setFilterStatus('en_attente_validation'); }}
            className="text-xs font-bold text-orange-700 hover:text-orange-900 underline"
          >
            Filtrer
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher titre, auteur…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="all">Tous statuts</option>
            <option value="en_attente_validation">⏳ En attente</option>
            <option value="a_corriger">✏️ À corriger</option>
            <option value="publie">✅ Publiées</option>
            <option value="refuse">❌ Refusées</option>
            <option value="brouillon">📝 Brouillons</option>
            <option value="archive">📦 Archivées</option>
            <option value="supprime_moderation">🗑️ Supprimées</option>
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="all">Tous types</option>
            {(Object.entries(CONTENT_TYPE_LABELS) as [ContentType, typeof CONTENT_TYPE_LABELS[ContentType]][]).map(([key, val]) => (
              <option key={key} value={key}>{val.emoji} {val.label}</option>
            ))}
          </select>

          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="all">Tous risques</option>
            <option value="critical">🔴 Critique</option>
            <option value="high">🟠 Élevé</option>
            <option value="medium">🟡 Modéré</option>
            <option value="low">🟢 Faible</option>
          </select>

          <select
            value={filterTrust}
            onChange={e => setFilterTrust(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="all">Tous niveaux</option>
            <option value="nouveau">🌱 Nouveau</option>
            <option value="surveille">⚠️ Surveillé</option>
            <option value="fiable">✅ Fiable</option>
            <option value="de_confiance">🏆 De confiance</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="submitted_at">Plus récent</option>
            <option value="risk_score">Plus risqué</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterNewMember}
              onChange={e => setFilterNewMember(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-300"
            />
            🌱 Nouveaux membres
          </label>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">File vide</h3>
          <p className="text-gray-500 text-sm">
            {filterStatus === 'en_attente_validation'
              ? 'Aucune publication en attente de validation. ✓'
              : 'Aucun résultat pour ces filtres.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{items.length}</span> publication{items.length > 1 ? 's' : ''}
            </p>
            {processing && (
              <div className="flex items-center gap-2 text-sm text-brand-600">
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                Traitement…
              </div>
            )}
          </div>
          {items.map(item => (
            <QueueRow
              key={item.id}
              item={item}
              onQuickDecision={handleQuickDecision}
            />
          ))}
        </div>
      )}

      {/* Info bas de page */}
      <div className="mt-8 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Objectifs de traitement</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Contenu standard : <strong>{'<'}24h</strong> · Contenu sensible / haut risque : <strong>quelques heures</strong> · Les auteurs sont notifiés automatiquement.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminModerationPage() {
  return (
    <ProtectedPage adminOnly>
      <ModerationQueueContent />
    </ProtectedPage>
  );
}
