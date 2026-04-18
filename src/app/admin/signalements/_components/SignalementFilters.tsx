'use client';

import { RefreshCw } from 'lucide-react';
import { TYPE_LABELS } from './signalement-config';

type FilterStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'all';

interface SignalementFiltersProps {
  filterStatus: FilterStatus;
  filterType: string;
  loading: boolean;
  onStatus: (s: FilterStatus) => void;
  onType: (t: string) => void;
  onRefresh: () => void;
}

const STATUS_OPTS: { key: FilterStatus; label: string }[] = [
  { key: 'pending',   label: '🚨 En attente' },
  { key: 'reviewed',  label: '👀 En cours' },
  { key: 'resolved',  label: '✅ Résolus' },
  { key: 'dismissed', label: '🚫 Ignorés' },
  { key: 'all',       label: '📋 Tous' },
];

export default function SignalementFilters({
  filterStatus,
  filterType,
  loading,
  onStatus,
  onType,
  onRefresh,
}: SignalementFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {STATUS_OPTS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onStatus(key)}
            className={`px-4 py-2.5 text-xs font-semibold transition-all ${
              filterStatus === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <select
        value={filterType}
        onChange={e => onType(e.target.value)}
        className="border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white focus:outline-none shadow-sm"
      >
        <option value="all">Tous les types</option>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>

      <button
        onClick={onRefresh}
        disabled={loading}
        aria-label="Actualiser"
        className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-700 shadow-sm"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
