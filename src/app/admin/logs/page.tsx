'use client';

/**
 * src/app/admin/logs/page.tsx
 *
 * Écran admin — Journal des actions (admin_action_logs).
 *
 * Fonctionnalités :
 *   • Tableau paginé des entrées de admin_action_logs (50 / page côté serveur)
 *   • Filtres extraits dans LogFilters, tableau dans LogTable (lazy-load)
 *   • Pagination serveur via URLSearchParams
 *
 * Accès : admins et modérateurs uniquement (protégé par verifyAdminLayout côté serveur).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { AdminLogsResponse } from '@/app/api/admin/logs/route';
import { adminFetch } from '@/lib/admin-fetch';
import LogFilters from './_components/LogFilters';

// Lazy-load heavy table (rows not needed until data arrives)
const LogTable = dynamic(() => import('./_components/LogTable'), {
  loading: () => (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="space-y-px">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-50 animate-pulse" />
        ))}
      </div>
    </div>
  ),
});

export default function AdminLogsPage() {
  const [data, setData]       = useState<AdminLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [filterAction, setFilterAction] = useState('');
  const [filterActor,  setFilterActor]  = useState('');
  const [filterTable,  setFilterTable]  = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [page,         setPage]         = useState(1);

  const abortRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    const controller   = new AbortController();
    abortRef.current   = controller;

    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '50' });
      if (filterAction) params.set('action',   filterAction);
      if (filterActor)  params.set('actor_id', filterActor);
      if (filterTable)  params.set('table',    filterTable);
      if (filterFrom)   params.set('from',     new Date(filterFrom).toISOString());
      if (filterTo) {
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        params.set('to', to.toISOString());
      }

      const res = await adminFetch(`/api/admin/logs?${params.toString()}`, {
        signal:  controller.signal,
        headers: { 'x-requested-with': 'XMLHttpRequest' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Erreur ${res.status}`);
      }

      setData(await res.json());
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterActor, filterTable, filterFrom, filterTo]);

  useEffect(() => { fetchLogs(page); }, [fetchLogs, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  }

  function handleClear() {
    setFilterAction('');
    setFilterActor('');
    setFilterTable('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  }

  const hasFilters = !!(filterAction || filterActor || filterTable || filterFrom || filterTo);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal des actions admin</h1>
          <p className="text-gray-500 text-sm">Traçabilité de toutes les mutations sensibles</p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Filtres (extracted component) */}
      <LogFilters
        filterAction={filterAction}
        filterActor={filterActor}
        filterTable={filterTable}
        filterFrom={filterFrom}
        filterTo={filterTo}
        total={data?.total ?? null}
        onSubmit={handleSearch}
        onClear={handleClear}
        onAction={setFilterAction}
        onActor={setFilterActor}
        onTable={setFilterTable}
        onFrom={setFilterFrom}
        onTo={setFilterTo}
      />

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tableau (lazy-loaded) */}
      <LogTable
        logs={data?.logs ?? []}
        loading={loading}
        hasFilters={hasFilters}
      />

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-sm text-gray-500">
            Page {page} / {data.pages}
            {' · '}{data.total.toLocaleString('fr-FR')} entrée{data.total > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages || loading}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lien retour */}
      <div className="mt-10 pt-6 border-t border-gray-100">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord admin
        </Link>
      </div>
    </div>
  );
}
