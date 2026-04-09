/**
 * JobOfferCard - Carte d'affichage d'une offre d'emploi
 * Affiche : titre, employeur, adresse, téléphone, salaire, contrat, urgence
 */

import Link from 'next/link';
import {
  MapPin,
  Clock,
  Euro,
  Home,
  Utensils,
  Building2,
  Phone,
  Mail,
  Star,
  Flame,
  Car,
} from 'lucide-react';
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

const CONTRACT_COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-100   text-blue-700   border-blue-200',
  cyan:   'bg-cyan-100   text-cyan-700   border-cyan-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  pink:   'bg-pink-100   text-pink-700   border-pink-200',
  amber:  'bg-amber-100  text-amber-700  border-amber-200',
  green:  'bg-green-100  text-green-700  border-green-200',
  lime:   'bg-lime-100   text-lime-700   border-lime-200',
  teal:   'bg-teal-100   text-teal-700   border-teal-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  gray:   'bg-gray-100   text-gray-700   border-gray-200',
};

export function JobOfferCard({
  offer,
  showDistance = false,
  variant = 'default',
}: JobOfferCardProps) {
  const isCompact  = variant === 'compact';
  const isFeatured = variant === 'featured';
  const urgent     = isUrgent(offer.start_date, offer.is_urgent);

  const contractColor = getContractTypeColor(offer.contract_type);
  const contractClass = CONTRACT_COLOR_MAP[contractColor] ?? CONTRACT_COLOR_MAP.gray;
  const categoryIcon  = JOB_CATEGORY_ICONS[offer.job_category] ?? '💼';

  const salaryLabel = formatSalaryRange(offer.salary_range_min, offer.salary_range_max);
  const periodLabel =
    offer.salary_period === 'hourly' ? '/h'
    : offer.salary_period === 'yearly' ? '/an'
    : '/mois';

  return (
    <Link
      href={`/emploi/offres/${offer.slug}`}
      className={`
        relative block bg-white rounded-xl border-2 transition-all duration-200
        hover:shadow-lg hover:border-brand-400 hover:-translate-y-0.5
        ${isFeatured ? 'border-amber-300 shadow-md' : 'border-gray-200'}
        ${isCompact ? 'p-3' : 'p-5'}
      `}
    >
      {/* ── Bandeau Featured ──────────────────────────────────────── */}
      {isFeatured && (
        <div className="absolute top-0 right-0 flex items-center gap-1 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
          <Star className="w-3 h-3 fill-white" />
          À la une
        </div>
      )}

      {/* ── Ligne 1 : badges contrat + urgence + avantages ──────── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${contractClass}`}>
          {CONTRACT_TYPE_LABELS[offer.contract_type]}
        </span>

        {urgent && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
            <Flame className="w-3 h-3" />
            Urgent
          </span>
        )}

        {offer.provides_housing && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Home className="w-3 h-3" />
            Logement
          </span>
        )}

        {offer.provides_meals && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <Utensils className="w-3 h-3" />
            Repas
          </span>
        )}

        {offer.requires_vehicle && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            <Car className="w-3 h-3" />
            Véhicule
          </span>
        )}
      </div>

      {/* ── Ligne 2 : icône catégorie + titre ───────────────────── */}
      <h3 className={`font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors leading-snug ${
        isCompact ? 'text-base' : 'text-lg'
      }`}>
        <span className="mr-1.5">{categoryIcon}</span>
        {offer.title}
      </h3>

      {/* ── Ligne 3 : nom de l'entreprise ───────────────────────── */}
      {offer.employer_name && (
        <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 mb-2">
          <Building2 className="w-4 h-4 text-brand-400 flex-shrink-0" />
          {offer.employer_name}
        </div>
      )}

      {/* ── Description courte ──────────────────────────────────── */}
      {!isCompact && offer.short_description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
          {offer.short_description}
        </p>
      )}

      {/* ── Infos clés ──────────────────────────────────────────── */}
      <div className="space-y-1.5 mb-3">

        {/* Adresse / Lieu */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {offer.location_address
              ? `${offer.location_address}${offer.location_city ? ', ' + offer.location_city : ''}`
              : offer.location_city || offer.location_label}
            {showDistance && offer.distance_km != null && (
              <span className="text-gray-400 ml-1">· {offer.distance_km.toFixed(1)} km</span>
            )}
          </span>
        </div>

        {/* Salaire */}
        {salaryLabel && (
          <div className="flex items-center gap-2 text-sm">
            <Euro className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-semibold text-green-700">
              {salaryLabel}
              <span className="text-gray-500 font-normal ml-1">{periodLabel}</span>
            </span>
            {offer.salary_is_negotiable && (
              <span className="text-xs text-gray-400">(négociable)</span>
            )}
          </div>
        )}

        {/* Horaires */}
        {offer.weekly_hours && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              {offer.weekly_hours}h/semaine
              {offer.is_flexible_schedule && <span className="text-gray-400 ml-1">· Horaires flexibles</span>}
            </span>
          </div>
        )}

        {/* Téléphone */}
        {!isCompact && offer.contact_phone && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium tracking-wide">{offer.contact_phone}</span>
          </div>
        )}

        {/* Email (seulement si pas de téléphone ou en mode non-compact) */}
        {!isCompact && !offer.contact_phone && offer.contact_email && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{offer.contact_email}</span>
          </div>
        )}
      </div>

      {/* ── Footer : catégorie + date ────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">
            {JOB_CATEGORY_LABELS[offer.job_category]}
          </span>
          {offer.experience_level && (
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 capitalize">
              {offer.experience_level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-400">
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
    </Link>
  );
}
