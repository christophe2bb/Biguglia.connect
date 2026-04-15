'use client';

/**
 * src/app/admin/logs/page.tsx
 *
 * Écran admin — Journal des actions (admin_action_logs).
 *
 * Fonctionnalités :
 *   • Tableau paginé des entrées de admin_action_logs
 *   • Filtres : action, acteur (uuid ou email), table cible, plage de dates
 *   • Affichage du détail (meta JSON) au clic sur une ligne
 *   • Export CSV basique via window.open (optionnel)
 *
 * Accès : admins et modérateurs uniquement (protégé par ProtectedPage adminOnly).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Search, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, User, Tag, Table2 } from 'lucide-react';
import ProtectedPage from '@/components/providers/ProtectedPage';
import type { AdminActionLog, AdminLogsResponse } from '@/app/api/admin/logs/route';

// ─── Label helpers ────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  moderation_decision:    'Décision de modération',
  moderation_trust_update:'Niveau de confiance',
  user_status_set:        'Statut utilisateur',
  user_role_set:          'Rôle utilisateur',
  user_delete:            'Suppression compte',
  user_password_reset:    'Reset mot de passe',
  artisan_approve:        'Artisan approuvé',
  artisan_reject:         'Artisan refusé',
  content_status_set:     'Statut contenu',
  content_delete:         'Suppression contenu',
  content_close_set:      'Fermeture contenu',
  content_pin_set:        'Épinglage contenu',
  content_available_set:  'Disponibilité contenu',
  review_moderate:        'Modération avis',
  badge_award:            'Attribution badge',
  report_status_set:      'Statut signalement',
  report_ban_user:        'Suspension (signalement)',
};

const ACTION_COLORS: Record<string, string> = {
  moderation_decision:    'bg-blue-100 text-blue-800',
  moderation_trust_update:'bg-purple-100 text-purple-800',
  user_status_set:        'bg-orange-100 text-orange-800',
  user_role_set:          'bg-yellow-100 text-yellow-800',
  user_delete:            'bg-red-100 text-red-800',
  user_password_reset:    'bg-gray-100 text-gray-800',
  artisan_approve:        'bg-green-100 text-green-800',
  artisan_reject:         'bg-red-100 text-red-800',
  content_status_set:     'bg-teal-100 text-teal-800',
  content_delete:         'bg-red-100 text-red-800',
  content_close_set:      'bg-slate-100 text-slate-800',
  content_pin_set:        'bg-indigo-100 text-indigo-800',
  content_available_set:  'bg-cyan-100 text-cyan-800',
  review_moderate:        'bg-amber-100 text-amber-800',
  badge_award:            'bg-emerald-100 text-emerald-800',
  report_status_set:      'bg-rose-100 text-rose-800',
  report_ban_user:        'bg-red-100 text-red-800',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── Composant principal ──────────────────────────────────────────────────────

function LogsContent() {
  // ── État ──────────────────────────────────────────────────────────────────
  const [data, setData]         = useState<AdminLogsResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtres
  const [filterAction,  setFilterAction]  = useState('');
  const [filterActor,   setFilterActor]   = useState('');
  const [filterTable,   setFilterTable]   = useState('');
  const [filterFrom,    setFilterFrom]    = useState('');
  const [filterTo,      setFilterTo]      = useState('');
  const [page,          setPage]          = useState(1);

  // Ref pour éviter des fetch redondants au montage
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current  = controller;

    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '50' });
      if (filterAction) params.set('action',   filterAction);
      if (filterActor)  params.set('actor_id', filterActor);
      if (filterTable)  params.set('table',    filterTable);
      if (filterFrom)   params.set('from',     new Date(filterFrom).toISOString());
      if (filterTo) {
        // Inclure toute la journée sélectionnée
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        params.set('to', to.toISOString());
      }

      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        signal: controller.signal,
        headers: { 'x-requested-with': 'XMLHttpRequest' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Erreur ${res.status}`);
      }

      const json: AdminLogsResponse = await res.json();
      setData(json);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterActor, filterTable, filterFrom, filterTo]);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const hasFilters = filterAction || filterActor || filterTable || filterFrom || filterTo;

  // ── Rendu ──────────────────────────────────────────────────────────────────
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

      {/* Filtres */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
          {/* Action */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white appearance-none"
            >
              <option value="">Toutes les actions</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Acteur */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              placeholder="UUID acteur…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Table cible */}
          <div className="relative">
            <Table2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              placeholder="Table cible…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Date de */}
          <div>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Depuis…"
            />
          </div>

          {/* Date à */}
          <div>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Jusqu'au…"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Search className="w-4 h-4" /> Rechercher
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <X className="w-4 h-4" /> Effacer les filtres
            </button>
          )}
          {data && (
            <span className="ml-auto text-sm text-gray-400">
              {data.total.toLocaleString('fr-FR')} entrée{data.total > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </form>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : data && data.logs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            Aucun log trouvé{hasFilters ? ' pour ces filtres' : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Acteur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Cible</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Raison</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.logs ?? []).map((log) => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => toggleExpand(log.id)}
                      className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                        {formatDate(log.created_at)}
                      </td>

                      {/* Acteur */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 text-xs">
                            {log.actor_name ?? '—'}
                          </span>
                          <span className="text-gray-400 font-mono text-[10px]">
                            {log.actor_email ?? log.actor_id.slice(0, 8) + '…'}
                          </span>
                          <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded w-fit ${log.actor_role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {log.actor_role}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-lg ${actionColor(log.action)}`}>
                          {actionLabel(log.action)}
                        </span>
                      </td>

                      {/* Cible */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          {log.target_table && (
                            <span className="text-xs text-gray-600 font-medium">{log.target_table}</span>
                          )}
                          {log.target_id && (
                            <span className="text-[10px] font-mono text-gray-400 truncate max-w-[10rem]">
                              {log.target_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Raison */}
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">
                        <span className="line-clamp-2">{log.reason ?? '—'}</span>
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-3 text-gray-400">
                        {expandedId === log.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />
                        }
                      </td>
                    </tr>

                    {/* Ligne de détail (meta JSON) */}
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-slate-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Métadonnées (meta)</span>
                          </div>
                          <pre className="text-xs font-mono text-slate-700 bg-slate-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                          <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-400">
                            <span>ID : <span className="font-mono">{log.id}</span></span>
                            <span>Acteur ID : <span className="font-mono">{log.actor_id}</span></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
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

export default function AdminLogsPage() {
  return <ProtectedPage adminOnly><LogsContent /></ProtectedPage>;
}
