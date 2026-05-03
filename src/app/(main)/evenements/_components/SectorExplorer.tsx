'use client';

import React from 'react';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';

interface Props {
  sectorCounts: Record<string, number>;
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
  totalFiltered: number;
}

export default function SectorExplorer({ sectorCounts, filterSector, setFilterSector, totalFiltered }: Props) {
  const totalGeolocated = Object.values(sectorCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 mb-5">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-gray-900">🗺️ Explorer par quartier</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un secteur pour filtrer les événements</p>
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">
            {totalGeolocated} événement{totalGeolocated !== 1 ? 's' : ''} géolocalisé{totalGeolocated !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {/* Toute la ville */}
          <button
            type="button"
            onClick={() => setFilterSector(null)}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all duration-200 cursor-pointer ${
              !filterSector
                ? 'bg-purple-50 border-purple-300 shadow-md scale-105'
                : 'bg-white border-gray-100 hover:bg-purple-50 hover:border-purple-200'
            }`}
          >
            <span className="text-2xl">🗺️</span>
            <span className={`text-[10px] font-bold leading-tight text-center ${!filterSector ? 'text-purple-700' : 'text-gray-700'}`}>
              Toute la ville
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${!filterSector ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {totalFiltered}
            </span>
          </button>

          {/* Secteurs */}
          {SECTORS.map(sector => {
            const count  = sectorCounts[sector.id] || 0;
            const colors = SECTOR_COLORS[sector.color];
            const active = filterSector === sector.id;
            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => setFilterSector(active ? null : sector.id)}
                className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all duration-200 cursor-pointer select-none ${
                  active
                    ? `${colors.bg} ${colors.border} shadow-md scale-105`
                    : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <span className="text-2xl">{sector.icon}</span>
                <span className={`text-[10px] font-bold leading-tight text-center ${active ? colors.text : 'text-gray-700'}`}>
                  {sector.name}
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  active ? colors.badgeSolid : count > 0 ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-300'
                }`}>
                  {count > 0 ? count : '–'}
                </span>
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
