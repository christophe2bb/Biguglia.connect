/**
 * JobDemandCard - Carte d'affichage d'une demande d'emploi
 * Utilisé dans : listing demandes, fil Home
 */

import Link from 'next/link';
import { MapPin, Clock, Euro, FileText, Car, TrendingUp } from 'lucide-react';
import type { JobDemandSearchResult } from '@/types/jobs';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  formatSalaryRange,
  isUrgent,
} from '@/types/jobs/constants';

interface JobDemandCardProps {
  demand: JobDemandSearchResult;
  showDistance?: boolean;
  variant?: 'default' | 'compact';
}

export function JobDemandCard({
  demand,
  showDistance = false,
  variant = 'default',
}: JobDemandCardProps) {
  const isCompact = variant === 'compact';
  const urgent = isUrgent(demand.available_from, demand.is_urgent);
  const categoryIcon = JOB_CATEGORY_ICONS[demand.job_category] || '💼';

  return (
    <Link
      href={`/emploi/demandes/${demand.slug}`}
      className={`
        block bg-white rounded-lg border-2 border-gray-200 transition-all duration-200
        hover:shadow-lg hover:border-brand-400 hover:-translate-y-0.5
        ${isCompact ? 'p-3' : 'p-4 md:p-5'}
      `}
    >
      {/* Header: badges */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Badges types de contrat recherchés */}
          {demand.desired_contract_types.slice(0, 3).map((contractType) => (
            <span
              key={contractType}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200"
            >
              {CONTRACT_TYPE_LABELS[contractType]}
            </span>
          ))}
          {demand.desired_contract_types.length > 3 && (
            <span className="text-xs text-gray-500">
              +{demand.desired_contract_types.length - 3}
            </span>
          )}

          {/* Badge urgent */}
          {urgent && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              🔥 Disponible rapidement
            </span>
          )}
        </div>

        {/* Score de complétude */}
        {!isCompact && demand.completeness_score >= 80 && (
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            {demand.completeness_score}%
          </div>
        )}
      </div>

      {/* Titre */}
      <h3
        className={`font-bold text-gray-900 mb-2 line-clamp-2 hover:text-brand-600 transition-colors ${
          isCompact ? 'text-base' : 'text-lg md:text-xl'
        }`}
      >
        {categoryIcon} {demand.title}
      </h3>

      {/* Description courte */}
      {!isCompact && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {demand.short_description}
        </p>
      )}

      {/* Infos principales */}
      <div className="space-y-2 mb-3">
        {/* Lieu et mobilité */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {demand.location_label}
            {demand.mobility_radius && (
              <span className="text-gray-500 ml-1">
                · Rayon {demand.mobility_radius} km
              </span>
            )}
            {showDistance && demand.distance_km && (
              <span className="text-gray-500 ml-1">
                · {demand.distance_km.toFixed(1)} km
              </span>
            )}
          </span>
        </div>

        {/* Salaire attendu */}
        {(demand.salary_expectation_min || demand.salary_expectation_max) && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Euro className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-green-700">
              Attend {formatSalaryRange(demand.salary_expectation_min, demand.salary_expectation_max)}
              {demand.salary_period && (
                <span className="text-gray-500 ml-1">
                  /{demand.salary_period === 'hourly' ? 'h' : demand.salary_period === 'monthly' ? 'mois' : 'an'}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Disponibilité */}
        {demand.weekly_hours_desired && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              Souhaite {demand.weekly_hours_desired}h/semaine
              {demand.is_flexible_schedule && (
                <span className="text-gray-500 ml-1">· Horaires flexibles</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Assets: CV, permis, véhicule */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {demand.cv_url && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <FileText className="w-3 h-3 mr-1" />
            CV disponible
          </span>
        )}
        {demand.has_driving_license && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            🪪 Permis
          </span>
        )}
        {demand.has_vehicle && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <Car className="w-3 h-3 mr-1" />
            Véhicule
          </span>
        )}
      </div>

      {/* Compétences (max 3) */}
      {!isCompact && demand.skills && demand.skills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {demand.skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
            >
              {skill}
            </span>
          ))}
          {demand.skills.length > 3 && (
            <span className="text-xs text-gray-500">
              +{demand.skills.length - 3} compétence{demand.skills.length - 3 > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span className="font-medium">{JOB_CATEGORY_LABELS[demand.job_category]}</span>
          {demand.experience_level && (
            <span className="capitalize">{demand.experience_level}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {demand.views_count > 0 && (
            <span>{demand.views_count} vue{demand.views_count > 1 ? 's' : ''}</span>
          )}
          <span suppressHydrationWarning>
            {new Date(demand.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}
