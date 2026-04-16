'use client';

/**
 * ModerationFilters — Barre de filtres pour la file de modération (lazy-loaded).
 *
 * Extrait de page.tsx (8 contrôles en inline) pour alléger l'orchestrateur.
 * Chargé en lazy depuis page.tsx via dynamic() : ne pèse pas sur le bundle initial.
 *
 * Usage:
 *   const ModerationFilters = dynamic(() => import('./_components/ModerationFilters'));
 */

import { Search } from 'lucide-react';
import { CONTENT_TYPE_LABELS, type ContentType } from '@/lib/moderation';

interface ModerationFiltersProps {
  searchQuery:     string;
  filterStatus:    string;
  filterType:      string;
  filterRisk:      string;
  filterTrust:     string;
  filterNewMember: boolean;
  sortBy:          'submitted_at' | 'risk_score';
  onSearch:        (v: string) => void;
  onStatus:        (v: string) => void;
  onType:          (v: string) => void;
  onRisk:          (v: string) => void;
  onTrust:         (v: string) => void;
  onNewMember:     (v: boolean) => void;
  onSort:          (v: 'submitted_at' | 'risk_score') => void;
}

const SELECT_CLS =
  'text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white';

export default function ModerationFilters({
  searchQuery, filterStatus, filterType, filterRisk, filterTrust,
  filterNewMember, sortBy,
  onSearch, onStatus, onType, onRisk, onTrust, onNewMember, onSort,
}: ModerationFiltersProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
      <div className="flex flex-wrap gap-3">

        {/* Recherche texte */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher titre, auteur…"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* Statut */}
        <select value={filterStatus} onChange={e => onStatus(e.target.value)} className={SELECT_CLS}>
          <option value="all">Tous statuts</option>
          <option value="en_attente_validation">⏳ En attente</option>
          <option value="a_corriger">✏️ À corriger</option>
          <option value="publie">✅ Publiées</option>
          <option value="refuse">❌ Refusées</option>
          <option value="brouillon">📝 Brouillons</option>
          <option value="archive">📦 Archivées</option>
          <option value="supprime_moderation">🗑️ Supprimées</option>
        </select>

        {/* Type de contenu */}
        <select value={filterType} onChange={e => onType(e.target.value)} className={SELECT_CLS}>
          <option value="all">Tous types</option>
          {(Object.entries(CONTENT_TYPE_LABELS) as [ContentType, typeof CONTENT_TYPE_LABELS[ContentType]][]).map(
            ([key, val]) => (
              <option key={key} value={key}>{val.emoji} {val.label}</option>
            )
          )}
        </select>

        {/* Risque */}
        <select value={filterRisk} onChange={e => onRisk(e.target.value)} className={SELECT_CLS}>
          <option value="all">Tous risques</option>
          <option value="critical">🔴 Critique</option>
          <option value="high">🟠 Élevé</option>
          <option value="medium">🟡 Modéré</option>
          <option value="low">🟢 Faible</option>
        </select>

        {/* Niveau de confiance */}
        <select value={filterTrust} onChange={e => onTrust(e.target.value)} className={SELECT_CLS}>
          <option value="all">Tous niveaux</option>
          <option value="nouveau">🌱 Nouveau</option>
          <option value="surveille">⚠️ Surveillé</option>
          <option value="fiable">✅ Fiable</option>
          <option value="de_confiance">🏆 De confiance</option>
        </select>

        {/* Tri */}
        <select value={sortBy} onChange={e => onSort(e.target.value as typeof sortBy)} className={SELECT_CLS}>
          <option value="submitted_at">Plus récent</option>
          <option value="risk_score">Plus risqué</option>
        </select>

        {/* Nouveaux membres */}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterNewMember}
            onChange={e => onNewMember(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-300"
          />
          🌱 Nouveaux membres
        </label>
      </div>
    </div>
  );
}
