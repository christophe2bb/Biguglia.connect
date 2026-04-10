'use client';

/**
 * DemandFiltersClient — filtres interactifs pour /emploi/demandes
 * Filtres : recherche · secteur · catégorie de métier · urgence · permis · véhicule
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronDown, ChevronUp, Flame, Car } from 'lucide-react';
import type { JobDemandFilters } from '@/types/jobs';
import {
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  JOB_SECTORS,
} from '@/types/jobs/constants';

/* ── Secteurs de Biguglia ─────────────────────────────────────────── */
// Secteurs : liste centrale
const SECTORS = [...JOB_SECTORS];

interface Props {
  filters: Partial<JobDemandFilters>;
  totalResults: number;
}

export function DemandFiltersClient({ filters, totalResults }: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<Partial<JobDemandFilters>>(filters);
  const [openSection, setOpenSection] = useState<string | null>('categorie');
  const [searchInput, setSearchInput] = useState(filters.query ?? '');

  /* ── Envoi vers URL ──────────────────────────────────────────── */
  const push = useCallback((next: Partial<JobDemandFilters>) => {
    const p = new URLSearchParams();
    if (next.query)              p.set('query',      next.query);
    if (next.sectorId)           p.set('sectorId',   next.sectorId);
    if (next.categories?.length) p.set('categories', next.categories.join(','));
    if (next.isUrgent)           p.set('isUrgent',   'true');
    if (next.hasLicense)         p.set('hasLicense', 'true');
    if (next.hasVehicle)         p.set('hasVehicle', 'true');
    if (next.sortBy)             p.set('sortBy',     next.sortBy);
    router.push(`/emploi/demandes?${p.toString()}`);
  }, [router]);

  const update = (patch: Partial<JobDemandFilters>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    push(next);
  };

  const toggleCategory = (cat: string) => {
    const cur = local.categories ?? [];
    const updated = cur.includes(cat as any)
      ? cur.filter(c => c !== cat)
      : [...cur, cat as any];
    update({ categories: updated.length ? updated : undefined });
  };

  const clearAll = () => {
    setLocal({});
    setSearchInput('');
    router.push('/emploi/demandes');
  };

  /* ── Nombre de filtres actifs ────────────────────────────────── */
  const activeCount = [
    local.query,
    local.sectorId,
    local.categories?.length,
    local.isUrgent,
    local.hasLicense,
    local.hasVehicle,
  ].filter(Boolean).length;

  /* ── Accordéon ───────────────────────────────────────────────── */
  const Section = ({
    id, title, count, children,
  }: { id: string; title: string; count?: number; children: React.ReactNode }) => {
    const open = openSection === id;
    return (
      <div className="border-b border-gray-100 last:border-0">
        <button
          onClick={() => setOpenSection(open ? null : id)}
          className="w-full flex items-center justify-between py-3 px-1 text-left hover:text-purple-600 transition-colors"
        >
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            {title}
            {!!count && (
              <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full leading-none">
                {count}
              </span>
            )}
          </span>
          {open
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {open && <div className="pb-4 px-1 space-y-2">{children}</div>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">

      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Filtres</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {totalResults} résultat{totalResults !== 1 ? 's' : ''}
          </span>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              Tout effacer
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2 divide-y divide-gray-100">

        {/* ── RECHERCHE ─────────────────────────────────────────── */}
        <div className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Métier, compétence…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') update({ query: searchInput || undefined });
              }}
              onBlur={() => update({ query: searchInput || undefined })}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); update({ query: undefined }); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── SECTEUR ───────────────────────────────────────────── */}
        <Section id="secteur" title="Secteur / Quartier" count={local.sectorId ? 1 : 0}>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="sector"
                checked={!local.sectorId}
                onChange={() => update({ sectorId: undefined })}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-purple-600 font-medium">
                Tous les secteurs
              </span>
            </label>
            {SECTORS.map((s) => (
              <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="sector"
                  checked={local.sectorId === s.id}
                  onChange={() => update({ sectorId: s.id })}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-purple-600">
                  {s.emoji} {s.label}
                </span>
              </label>
            ))}
          </div>
        </Section>

        {/* ── CATÉGORIE ─────────────────────────────────────────── */}
        <Section
          id="categorie"
          title="Catégorie de métier"
          count={local.categories?.length}
        >
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {JOB_CATEGORIES.map((cat) => {
              const checked = local.categories?.includes(cat as any) ?? false;
              return (
                <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className={`text-sm transition-colors flex items-center gap-1.5 ${checked ? 'text-purple-700 font-semibold' : 'text-gray-700 group-hover:text-purple-600'}`}>
                    <span>{JOB_CATEGORY_ICONS[cat as keyof typeof JOB_CATEGORY_ICONS] ?? '💼'}</span>
                    {JOB_CATEGORY_LABELS[cat as keyof typeof JOB_CATEGORY_LABELS]}
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

        {/* ── OPTIONS ───────────────────────────────────────────── */}
        <Section id="options" title="Atouts du candidat" count={
          (local.isUrgent ? 1 : 0) + (local.hasLicense ? 1 : 0) + (local.hasVehicle ? 1 : 0)
        }>
          <div className="space-y-3">
            {/* Disponible rapidement */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => update({ isUrgent: local.isUrgent ? undefined : true })}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                  local.isUrgent ? 'bg-red-500' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  local.isUrgent ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-red-500" />
                  Disponible rapidement
                </span>
                <p className="text-xs text-gray-400">Candidats disponibles immédiatement</p>
              </div>
            </label>

            {/* Permis de conduire */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => update({ hasLicense: local.hasLicense ? undefined : true })}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                  local.hasLicense ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  local.hasLicense ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  🪪 Permis de conduire
                </span>
                <p className="text-xs text-gray-400">Candidats avec permis</p>
              </div>
            </label>

            {/* Véhicule */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => update({ hasVehicle: local.hasVehicle ? undefined : true })}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                  local.hasVehicle ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  local.hasVehicle ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  <Car className="w-4 h-4 text-green-600" />
                  Véhicule personnel
                </span>
                <p className="text-xs text-gray-400">Candidats avec leur propre véhicule</p>
              </div>
            </label>
          </div>
        </Section>

      </div>
    </div>
  );
}
