'use client';

/**
 * LogFilters — Formulaire de filtres pour le journal admin.
 * Composant extrait de logs/page.tsx pour alléger l'orchestrateur.
 */

import { Search, X, Tag, User, Table2 } from 'lucide-react';
import { ACTION_LABELS } from './log-config';

interface LogFiltersProps {
  filterAction: string;
  filterActor:  string;
  filterTable:  string;
  filterFrom:   string;
  filterTo:     string;
  total:        number | null;
  onSubmit:     (e: React.FormEvent) => void;
  onClear:      () => void;
  onAction:     (v: string) => void;
  onActor:      (v: string) => void;
  onTable:      (v: string) => void;
  onFrom:       (v: string) => void;
  onTo:         (v: string) => void;
}

export default function LogFilters({
  filterAction, filterActor, filterTable, filterFrom, filterTo,
  total,
  onSubmit, onClear,
  onAction, onActor, onTable, onFrom, onTo,
}: LogFiltersProps) {
  const hasFilters = filterAction || filterActor || filterTable || filterFrom || filterTo;

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">

        {/* Action */}
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filterAction}
            onChange={(e) => onAction(e.target.value)}
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
            onChange={(e) => onActor(e.target.value)}
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
            onChange={(e) => onTable(e.target.value)}
            placeholder="Table cible…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Date de */}
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => onFrom(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Depuis…"
        />

        {/* Date à */}
        <input
          type="date"
          value={filterTo}
          onChange={(e) => onTo(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Jusqu'au…"
        />
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
            onClick={onClear}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <X className="w-4 h-4" /> Effacer les filtres
          </button>
        )}
        {total !== null && (
          <span className="ml-auto text-sm text-gray-400">
            {total.toLocaleString('fr-FR')} entrée{total > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </form>
  );
}
