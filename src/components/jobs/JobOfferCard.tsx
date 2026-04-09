/**
 * JobOfferCard - Carte d'affichage d'une offre d'emploi
 * Utilisé dans : listing offres, fil Home, résultats de recherche
 */

import Link from 'next/link';
import { MapPin, Clock, Euro, TrendingUp, Home, Utensils } from 'lucide-react';
import type { JobOfferSearchResult } from '@/types/jobs';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  getContractTypeColor,
  formatSalaryRange,
  isUrgent,
} from '@/types/jobs/constants';

interface JobOfferCardProps {
  offer: JobOfferSearchResult;
  showDistance?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export function JobOfferCard({
  offer,
  showDistance = false,
  variant = 'default',
}: JobOfferCardProps) {
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';
  const urgent = isUrgent(offer.start_date, offer.is_urgent);

  // Contract color mapping to Tailwind classes
  const contractColorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    pink: 'bg-pink-100 text-pink-700 border-pink-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    lime: 'bg-lime-100 text-lime-700 border-lime-200',
    teal: 'bg-teal-100 text-teal-700 border-teal-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const contractColor = getContractTypeColor(offer.contract_type);
  const contractClass = contractColorClasses[contractColor] || contractColorClasses.gray;

  const categoryIcon = JOB_CATEGORY_ICONS[offer.job_category] || '💼';

  return (
    <Link
      href={`/emploi/offres/${offer.slug}`}
      className={`
        block bg-white rounded-lg border-2 transition-all duration-200
        hover:shadow-lg hover:border-brand-400 hover:-translate-y-0.5
        ${isFeatured ? 'border-amber-300 shadow-md' : 'border-gray-200'}
        ${isCompact ? 'p-3' : 'p-4 md:p-5'}
      `}
    >
      {/* Header: badges et meta */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge contrat */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${contractClass}`}
          >
            {CONTRACT_TYPE_LABELS[offer.contract_type]}
          </span>

          {/* Badge urgent */}
          {urgent && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              🔥 Urgent
            </span>
          )}

          {/* Badge logement */}
          {offer.provides_housing && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Home className="w-3 h-3 mr-1" />
              Logement
            </span>
          )}

          {/* Badge repas */}
          {offer.provides_meals && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <Utensils className="w-3 h-3 mr-1" />
              Repas
            </span>
          )}
        </div>

        {/* Score de complétude (si > 80) */}
        {!isCompact && offer.completeness_score >= 80 && (
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            {offer.completeness_score}%
          </div>
        )}
      </div>

      {/* Titre */}
      <h3
        className={`font-bold text-gray-900 mb-2 line-clamp-2 hover:text-brand-600 transition-colors ${
          isCompact ? 'text-base' : 'text-lg md:text-xl'
        }`}
      >
        {categoryIcon} {offer.title}
      </h3>

      {/* Description courte */}
      {!isCompact && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {offer.short_description}
        </p>
      )}

      {/* Infos principales : lieu, salaire, horaires */}
      <div className="space-y-2 mb-3">
        {/* Lieu */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {offer.location_label}
            {showDistance && offer.distance_km && (
              <span className="text-gray-500 ml-1">
                · {offer.distance_km.toFixed(1)} km
              </span>
            )}
          </span>
        </div>

        {/* Salaire */}
        {(offer.salary_range_min || offer.salary_range_max) && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Euro className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium text-green-700">
              {formatSalaryRange(offer.salary_range_min, offer.salary_range_max)}
              {offer.salary_period && (
                <span className="text-gray-500 ml-1">
                  /{offer.salary_period === 'hourly' ? 'h' : offer.salary_period === 'monthly' ? 'mois' : 'an'}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Horaires */}
        {offer.weekly_hours && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              {offer.weekly_hours}h/semaine
              {offer.is_flexible_schedule && (
                <span className="text-gray-500 ml-1">· Flexible</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Footer: catégorie, date, stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span className="font-medium">{JOB_CATEGORY_LABELS[offer.job_category]}</span>
          {offer.experience_level && (
            <span className="capitalize">{offer.experience_level}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {offer.views_count > 0 && (
            <span>{offer.views_count} vue{offer.views_count > 1 ? 's' : ''}</span>
          )}
          <span suppressHydrationWarning>
            {new Date(offer.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>

      {/* Badge Premium/Featured (si applicable) */}
      {isFeatured && (
        <div className="absolute top-0 right-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
          ⭐ À la une
        </div>
      )}
    </Link>
  );
}
