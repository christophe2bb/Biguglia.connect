// ─────────────────────────────────────────────────────────────────────────────
// JobHomeCard — Carte légère emploi pour la page d'accueil
// Design horizontal aéré : icône | titre + badges essentiels | localisation + date
// Conçu pour être lisible dans une liste 1-colonne, pas dans une grille dense
// ─────────────────────────────────────────────────────────────────────────────


import Link from 'next/link';
import { MapPin, ArrowRight, Flame, Home, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_ICONS,
  formatSalaryRange,
  isUrgent,
} from '@/types/jobs/constants';
import type { JobOfferSearchResult, JobDemandSearchResult } from '@/types/jobs';

// ─── Carte Offre ─────────────────────────────────────────────────────────────

interface JobOfferHomeCardProps {
  offer: JobOfferSearchResult;
}

export function JobOfferHomeCard({ offer }: JobOfferHomeCardProps) {
  const urgent = isUrgent(offer.start_date, offer.is_urgent);
  const categoryIcon = JOB_CATEGORY_ICONS[offer.job_category] ?? '💼';
  const salaryLabel = formatSalaryRange(offer.salary_range_min, offer.salary_range_max);
  const periodLabel =
    offer.salary_period === 'hourly' ? '/h'
    : offer.salary_period === 'yearly' ? '/an'
    : '/mois';

  return (
    <Link
      href={`/emploi/offres/${offer.slug}`}
      className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-cyan-200 hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      {/* Icône catégorie */}
      <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center flex-shrink-0 text-2xl shadow-sm">
        {categoryIcon}
      </div>

      {/* Corps */}
      <div className="flex-1 min-w-0">
        {/* Badges + date */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
            💼 Offre · {CONTRACT_TYPE_LABELS[offer.contract_type] ?? offer.contract_type}
          </span>
          {urgent && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              <Flame className="w-3 h-3" />Urgent
            </span>
          )}
          {offer.provides_housing && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Home className="w-3 h-3" />Logement
            </span>
          )}
          <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0" suppressHydrationWarning>
            {new Date(offer.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Titre */}
        <h3 className="text-[15px] font-black text-gray-900 leading-snug line-clamp-1 group-hover:text-cyan-700 transition-colors">
          {offer.title}
        </h3>

        {/* Méta : lieu + salaire */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {(offer.location_city || offer.location_label) && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              {offer.location_city || offer.location_label}
            </span>
          )}
          {offer.employer_name && (
            <span className="text-xs text-cyan-700 font-semibold truncate max-w-[120px]">
              {offer.employer_name}
            </span>
          )}
          {salaryLabel && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
              <Euro className="w-3 h-3" />{salaryLabel}{periodLabel}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}

// ─── Carte Demande ────────────────────────────────────────────────────────────

interface JobDemandHomeCardProps {
  demand: JobDemandSearchResult;
}

export function JobDemandHomeCard({ demand }: JobDemandHomeCardProps) {
  const urgent = isUrgent(demand.available_from, demand.is_urgent);
  const categoryIcon = JOB_CATEGORY_ICONS[demand.job_category] ?? '🙋';
  const salaryLabel = formatSalaryRange(
    demand.salary_expectation_min,
    demand.salary_expectation_max
  );

  return (
    <Link
      href={`/emploi/demandes/${demand.slug}`}
      className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      {/* Icône catégorie */}
      <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-2xl shadow-sm">
        {categoryIcon}
      </div>

      {/* Corps */}
      <div className="flex-1 min-w-0">
        {/* Badges + date */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
            🙋 Candidature
          </span>
          {urgent && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              <Flame className="w-3 h-3" />Dispo rapide
            </span>
          )}
          {demand.desired_contract_types.slice(0, 1).map(ct => (
            <span key={ct} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              {CONTRACT_TYPE_LABELS[ct] ?? ct}
            </span>
          ))}
          <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0" suppressHydrationWarning>
            {new Date(demand.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Titre */}
        <h3 className="text-[15px] font-black text-gray-900 leading-snug line-clamp-1 group-hover:text-purple-700 transition-colors">
          {demand.title}
        </h3>

        {/* Méta : lieu + salaire attendu */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {demand.location_label && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              {demand.location_label}
            </span>
          )}
          {salaryLabel && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
              <Euro className="w-3 h-3" />{salaryLabel}/mois
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}

// ─── Carte générique feed emploi (pour HomeSection) ──────────────────────────
// Utilisée quand on n'a que les données HomeFeedItem (pas le JobOffer complet)

import type { HomeFeedItem } from '@/services/home/types';

interface JobFeedCardProps {
  item: HomeFeedItem;
}

export function JobFeedCard({ item }: JobFeedCardProps) {
  const isOffer = item.type === 'job_offer';

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 transition-all hover:shadow-md hover:-translate-y-0.5',
        isOffer ? 'hover:border-cyan-200' : 'hover:border-purple-200'
      )}
    >
      {/* Icône */}
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl shadow-sm border',
        isOffer
          ? 'bg-cyan-50 border-cyan-100'
          : 'bg-purple-50 border-purple-100'
      )}>
        {isOffer ? '💼' : '🙋'}
      </div>

      {/* Corps */}
      <div className="flex-1 min-w-0">
        {/* Badge + fraîcheur */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn(
            'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border',
            isOffer
              ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
              : 'bg-purple-100 text-purple-700 border-purple-200'
          )}>
            {isOffer ? '💼 Offre d\'emploi' : '🙋 Candidature'}
          </span>
          {item.isUrgent && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              <Flame className="w-3 h-3" />Urgent
            </span>
          )}
          <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0" suppressHydrationWarning>
            {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Titre */}
        <h3 className={cn(
          'text-[15px] font-black text-gray-900 leading-snug line-clamp-1 transition-colors',
          isOffer ? 'group-hover:text-cyan-700' : 'group-hover:text-purple-700'
        )}>
          {item.title}
        </h3>

        {/* Résumé condensé */}
        {item.summary && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1 leading-relaxed">
            {item.summary}
          </p>
        )}

        {/* Footer méta */}
        <div className="flex items-center gap-3 mt-1.5">
          {item.locationLabel && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {item.locationLabel}
            </span>
          )}
          {item.badges && item.badges.slice(0, 2).map(b => (
            <span key={b} className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{b}</span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <ArrowRight className={cn(
        'w-4 h-4 text-gray-300 group-hover:translate-x-0.5 transition-all flex-shrink-0',
        isOffer ? 'group-hover:text-cyan-500' : 'group-hover:text-purple-500'
      )} />
    </Link>
  );
}
