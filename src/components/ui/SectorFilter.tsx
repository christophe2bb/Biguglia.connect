'use client';

/**
 * SectorFilter — Composant transversal de filtre par secteur
 *
 * Utilisable dans tous les modules (Forum, Perdu/Trouvé, Coups de main,
 * Événements, Promenades, Associations, Collectionneurs, Matériel…)
 *
 * Props :
 *  - value        : secteur sélectionné (null = tous)
 *  - onChange     : callback secteur sélectionné
 *  - showAll      : afficher le bouton "Tous les secteurs" (défaut true)
 *  - allowCitywide: afficher l'option "Toute la ville" (pour Événements)
 *  - compact      : mode compact (scroll horizontal, moins de padding)
 *  - required     : met en évidence qu'un secteur est requis
 *  - className    : classes CSS additionnelles
 */

import { SECTORS, SECTOR_COLORS, Sector } from '@/lib/sectors';
import { MapPin } from 'lucide-react';

interface SectorFilterProps {
  value: string | null;
  onChange: (sectorId: string | null) => void;
  showAll?: boolean;
  allowCitywide?: boolean;
  compact?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
}

export default function SectorFilter({
  value,
  onChange,
  showAll = true,
  allowCitywide = false,
  compact = false,
  required = false,
  className = '',
  label,
}: SectorFilterProps) {
  const handleClick = (sectorId: string | null) => {
    if (value === sectorId) {
      // Désélectionner si on reclique (sauf si required)
      if (required) return;
      onChange(null);
    } else {
      onChange(sectorId);
    }
  };

  const btnBase = compact
    ? 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap flex-shrink-0'
    : 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors';

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {label}
          </span>
          {required && !value && (
            <span className="text-xs text-red-500 font-normal">(requis)</span>
          )}
        </div>
      )}

      <div className={compact ? 'flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide' : 'flex flex-wrap gap-2'}>
        {/* Tous les secteurs */}
        {showAll && (
          <button
            type="button"
            onClick={() => handleClick(null)}
            className={`${btnBase} ${
              !value
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>🗺️</span>
            <span>Tous</span>
          </button>
        )}

        {/* Toute la ville (Événements) */}
        {allowCitywide && (
          <button
            type="button"
            onClick={() => handleClick('ville')}
            className={`${btnBase} ${
              value === 'ville'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>🏙️</span>
            <span>Toute la ville</span>
          </button>
        )}

        {/* Secteurs */}
        {SECTORS.map(sector => {
          const colors = SECTOR_COLORS[sector.color];
          const isActive = value === sector.id || value === sector.slug;
          return (
            <button
              type="button"
              key={sector.id}
              onClick={() => handleClick(sector.id)}
              title={sector.description}
              className={`${btnBase} ${
                isActive
                  ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ${colors.ring} ring-offset-1`
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{sector.icon}</span>
              <span>{sector.name}</span>
            </button>
          );
        })}
      </div>

      {/* Message d'aide si requis et aucun secteur sélectionné */}
      {required && !value && (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Sélectionnez votre secteur pour continuer
        </p>
      )}
    </div>
  );
}

/** Badge secteur compact (pour les cartes) */
export function SectorBadge({
  sectorId,
  size = 'sm',
}: {
  sectorId: string | null | undefined;
  size?: 'xs' | 'sm';
}) {
  if (!sectorId) return null;
  const sector = SECTORS.find(s => s.id === sectorId || s.slug === sectorId);
  if (!sector) return null;
  const colors = SECTOR_COLORS[sector.color];

  const cls = size === 'xs'
    ? `inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md font-medium ${colors.badge}`
    : `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`;

  return (
    <span className={cls}>
      {sector.icon} {sector.name}
    </span>
  );
}

/** Sélecteur secteur pour formulaire (select HTML) */
export function SectorSelect({
  value,
  onChange,
  required = false,
  allowCitywide = false,
  placeholder = 'Sélectionner un secteur',
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  allowCitywide?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className={`w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 ${
          !value ? 'text-gray-400' : 'text-gray-800'
        } ${className}`}
      >
        <option value="">{placeholder}</option>
        {allowCitywide && <option value="ville">🏙️ Toute la ville</option>}
        {SECTORS.map(s => (
          <option key={s.id} value={s.id}>
            {s.icon} {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
