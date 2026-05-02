'use client';

/**
 * SectorExplorerClient — Bandeau "Explorer par quartier" pour /emploi/offres
 *
 * Identique visuellement au bandeau des annonces :
 *  - bouton "Toute la ville" + 7 fenêtres secteur cliquables
 *  - comptages par secteur chargés depuis Supabase (sans filtre secteur)
 *  - navigation via URL (sectorId=...) pour compatibilité SSR/filtres existants
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';

interface Props {
  /** Nombre total d'offres (sans filtre secteur) pour le bouton "Toute la ville" */
  totalOffers: number;
  /** Filtre secteur actif venant de l'URL (peut être undefined) */
  currentSectorId?: string;
  /** Autres paramètres URL à conserver lors du changement de secteur */
  currentParams: Record<string, string>;
}

export function SectorExplorerClient({ totalOffers, currentSectorId, currentParams }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sectorCounts, setSectorCounts] = useState<Record<string, number>>({});

  // ── Charge les comptages par secteur (sans filtre secteur) ────────────────
  useEffect(() => {
    const supabase = createClient();
    // Requête légère : seulement sector_id, status=published, sans filtre secteur
    supabase
      .from('job_offers')
      .select('sector_id')
      .eq('status', 'published')
      .limit(500)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        for (const row of (data || []) as Array<{ sector_id?: string | null }>) {
          if (row.sector_id) counts[row.sector_id] = (counts[row.sector_id] || 0) + 1;
        }
        setSectorCounts(counts);
      });
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigate = (sectorId: string | null) => {
    const p = new URLSearchParams(searchParams.toString());
    // Conserver les autres params de currentParams (query, contractTypes, etc.)
    Object.entries(currentParams).forEach(([k, v]) => {
      if (k !== 'sectorId' && k !== 'page') p.set(k, v);
    });
    p.delete('page'); // reset pagination
    if (sectorId) {
      p.set('sectorId', sectorId);
    } else {
      p.delete('sectorId');
    }
    router.push(`/emploi/offres?${p.toString()}`);
  };

  const totalGeolocalized = Object.values(sectorCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-gray-900">🗺️ Explorer par quartier</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un secteur pour filtrer les offres</p>
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">
            {totalGeolocalized} offre{totalGeolocalized !== 1 ? 's' : ''} géolocalisée{totalGeolocalized !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {/* Toute la ville */}
          <button
            type="button"
            onClick={() => navigate(null)}
            className={`
              flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
              transition-all duration-200 cursor-pointer
              ${!currentSectorId
                ? 'bg-brand-50 border-brand-300 shadow-md scale-105'
                : 'bg-white border-gray-100 hover:bg-brand-50 hover:border-brand-200'
              }
            `}
          >
            <span className="text-2xl">🗺️</span>
            <span className={`text-[10px] font-bold leading-tight text-center ${
              !currentSectorId ? 'text-brand-700' : 'text-gray-700'
            }`}>
              Toute la ville
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              !currentSectorId ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {totalOffers}
            </span>
          </button>

          {/* Fenêtres par secteur */}
          {SECTORS.map(sector => {
            const count  = sectorCounts[sector.id] || 0;
            const colors = SECTOR_COLORS[sector.color];
            const active = currentSectorId === sector.id;

            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => navigate(active ? null : sector.id)}
                className={`
                  relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
                  transition-all duration-200 cursor-pointer select-none
                  ${active
                    ? `${colors.bg} ${colors.border} shadow-md scale-105`
                    : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                  }
                `}
              >
                <span className="text-2xl">{sector.icon}</span>
                <span className={`text-[10px] font-bold leading-tight text-center ${
                  active ? colors.text : 'text-gray-700'
                }`}>
                  {sector.name}
                </span>

                {/* Badge comptage — toujours visible */}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  active
                    ? colors.badgeSolid
                    : count > 0
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-gray-50 text-gray-300'
                }`}>
                  {count > 0 ? count : '–'}
                </span>

                {/* Check mark quand actif */}
                {active && (
                  <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${colors.badgeSolid} flex items-center justify-center`}>
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
