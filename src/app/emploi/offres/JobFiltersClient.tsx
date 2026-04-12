'use client';

/**
 * JobFiltersClient — filtres interactifs pour /emploi/offres
 * Filtres : recherche · secteur · type de contrat · catégorie
 *           salaire min · urgence · logement fourni
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronDown, ChevronUp, Flame, Home, Euro } from 'lucide-react';
import type { JobOfferFilters } from '@/types/jobs';
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  JOB_SECTORS,
  type ContractType,
  type JobCategory,
} from '@/types/jobs/constants';

/* ── Secteurs de Biguglia (à adapter selon table DB) ─────────────── */
// Secteurs : liste centrale
const SECTORS = [...JOB_SECTORS];

const SALARY_STEPS = [0, 1000, 1200, 1500, 1800, 2000, 2500, 3000, 4000];

interface Props {
  filters: Partial<JobOfferFilters>;
  totalResults: number;
}

export function JobFiltersClient({ filters, totalResults }: Props) {
  const router  = useRouter();
  const [local, setLocal] = useState<Partial<JobOfferFilters>>(filters);
  const [openSection, setOpenSection] = useState<string | null>('contrat'); // section ouverte par défaut
  const [searchInput, setSearchInput] = useState(filters.query ?? '');

  /* ── Envoi vers URL ──────────────────────────────────────────── */
  const push = useCallback((next: Partial<JobOfferFilters>) => {
    const p = new URLSearchParams();
    if (next.query)                   p.set('query',           next.query);
    if (next.sectorId)                p.set('sectorId',        next.sectorId);
    if (next.categories?.length)      p.set('categories',      next.categories.join(','));
    if (next.contractTypes?.length)   p.set('contractTypes',   next.contractTypes.join(','));
    if (next.salaryMin)               p.set('salaryMin',       String(next.salaryMin));
    if (next.isUrgent)                p.set('isUrgent',        'true');
    if (next.providesHousing)         p.set('providesHousing', 'true');
    if (next.sortBy)                  p.set('sortBy',          next.sortBy);
    router.push(`/emploi/offres?${p.toString()}`);
  }, [router]);

  const update = (patch: Partial<JobOfferFilters>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    push(next);
  };

  /* ── Toggle helpers ──────────────────────────────────────────── */
  const toggleContractType = (type: ContractType) => {
    const cur = local.contractTypes ?? [];
    const updated = cur.includes(type)
      ? cur.filter(c => c !== type)
      : [...cur, type];
    update({ contractTypes: updated.length ? updated : undefined });
  };

  const toggleCategory = (cat: JobCategory) => {
    const cur = local.categories ?? [];
    const updated = cur.includes(cat)
      ? cur.filter(c => c !== cat)
      : [...cur, cat];
    update({ categories: updated.length ? updated : undefined });
  };

  const clearAll = () => {
    setLocal({});
    setSearchInput('');
    router.push('/emploi/offres');
  };

  /* ── Nombre de filtres actifs ────────────────────────────────── */
  const activeCount = [
    local.query,
    local.sectorId,
    local.contractTypes?.length,
    local.categories?.length,
    local.salaryMin,
    local.isUrgent,
    local.providesHousing,
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
          className="w-full flex items-center justify-between py-3 px-1 text-left hover:text-brand-600 transition-colors"
        >
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            {title}
            {!!count && (
              <span className="px-1.5 py-0.5 bg-brand-500 text-white text-[10px] font-bold rounded-full leading-none">
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
            <span className="px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full">
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
              className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1 transition-colors"
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
              placeholder="Titre, mot-clé…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') update({ query: searchInput || undefined });
              }}
              onBlur={() => update({ query: searchInput || undefined })}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
                className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-brand-600 font-medium">
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
                  className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-brand-600">
                  {s.emoji} {s.label}
                </span>
              </label>
            ))}
          </div>
        </Section>

        {/* ── TYPE DE CONTRAT ───────────────────────────────────── */}
        <Section
          id="contrat"
          title="Type de contrat"
          count={local.contractTypes?.length}
        >
          <div className="space-y-1.5">
            {CONTRACT_TYPES.map((type) => {
              const checked = local.contractTypes?.includes(type) ?? false;
              return (
                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleContractType(type)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className={`text-sm transition-colors ${checked ? 'text-brand-700 font-semibold' : 'text-gray-700 group-hover:text-brand-600'}`}>
                    {CONTRACT_TYPE_LABELS[type]}
                  </span>
                </label>
              );
            })}
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
              const checked = local.categories?.includes(cat) ?? false;
              return (
                <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className={`text-sm transition-colors flex items-center gap-1.5 ${checked ? 'text-brand-700 font-semibold' : 'text-gray-700 group-hover:text-brand-600'}`}>
                    <span>{JOB_CATEGORY_ICONS[cat] ?? '💼'}</span>
                    {JOB_CATEGORY_LABELS[cat]}
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

        {/* ── SALAIRE MINIMUM ───────────────────────────────────── */}
        <Section id="salaire" title="Salaire minimum" count={local.salaryMin ? 1 : 0}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-900">
                {local.salaryMin ? `${local.salaryMin} €/mois` : 'Peu importe'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={4000}
              step={100}
              value={local.salaryMin ?? 0}
              onChange={(e) =>
                update({ salaryMin: parseInt(e.target.value) || undefined })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0 €</span>
              <span>4 000 €</span>
            </div>
            {/* Raccourcis rapides */}
            <div className="flex flex-wrap gap-1.5">
              {[1200, 1500, 2000, 2500].map((v) => (
                <button
                  key={v}
                  onClick={() => update({ salaryMin: local.salaryMin === v ? undefined : v })}
                  className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                    local.salaryMin === v
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  +{v} €
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── OPTIONS ───────────────────────────────────────────── */}
        <Section id="options" title="Options" count={(local.isUrgent ? 1 : 0) + (local.providesHousing ? 1 : 0)}>
          <div className="space-y-3">
            {/* Urgent */}
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
                  Recrutement urgent
                </span>
                <p className="text-xs text-gray-400">Afficher uniquement les offres urgentes</p>
              </div>
            </label>

            {/* Logement */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => update({ providesHousing: local.providesHousing ? undefined : true })}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                  local.providesHousing ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  local.providesHousing ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  <Home className="w-4 h-4 text-indigo-500" />
                  Logement fourni
                </span>
                <p className="text-xs text-gray-400">Offres avec logement inclus</p>
              </div>
            </label>
          </div>
        </Section>

      </div>
    </div>
  );
}
