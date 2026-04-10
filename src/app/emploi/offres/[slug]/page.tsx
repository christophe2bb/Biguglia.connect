/**
 * Page: Détail d'une offre d'emploi
 * Route: /emploi/offres/[slug]
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Euro, Clock, Calendar, Briefcase, User, Home, Utensils,
  Car, ArrowLeft, Eye, Flame, CheckCircle,
  Star, GraduationCap, Wifi, Building2, ChevronRight, FileText,
} from 'lucide-react';
import { getJobOfferBySlug, checkJobOwnership } from '@/services/jobs/queries';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  EXPERIENCE_LEVEL_LABELS,
  formatSalaryRange,
  getContractTypeColor,
  SECTOR_LABELS,
} from '@/types/jobs/constants';
import ProtectedContact from '@/components/jobs/ProtectedContact';
import OwnerActions from '@/components/jobs/OwnerActions';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const offer = await getJobOfferBySlug(params.slug);
  if (!offer) return { title: 'Offre non trouvée - Biguglia Connect' };
  return {
    title: `${offer.title}${offer.employer_name ? ` – ${offer.employer_name}` : ''} | Biguglia Connect`,
    description: offer.short_description,
  };
}

const CONTRACT_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
  cyan:   { bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'border-cyan-200'   },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200'   },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200'  },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200'   },
};


export default async function OffreDetailPage({ params }: PageProps) {
  const [offer, isOwner] = await Promise.all([
    getJobOfferBySlug(params.slug),
    checkJobOwnership('job_offers', params.slug),
  ]);

  /* ── Table DB pas encore créée OU annonce introuvable ── */
  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">🔧</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Annonce introuvable</h1>
        <p className="text-gray-500 mb-2 max-w-sm">
          Cette offre n&apos;existe pas encore, a été retirée, ou la base de données
          n&apos;a pas encore été initialisée.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Si vous venez de publier une offre, exécutez la migration SQL dans Supabase puis revenez.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/emploi/offres"
            className="px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm">
            ← Voir toutes les offres
          </Link>
          <Link href="/emploi/publier"
            className="px-5 py-2.5 bg-white border-2 border-brand-200 text-brand-700 font-semibold rounded-xl hover:bg-brand-50 transition-colors text-sm">
            Publier une offre
          </Link>
        </div>
      </div>
    );
  }

  const contractColorKey = getContractTypeColor(offer.contract_type);
  const contractCls = CONTRACT_COLOR_MAP[contractColorKey] ?? CONTRACT_COLOR_MAP.gray;
  const categoryIcon = JOB_CATEGORY_ICONS[offer.job_category] || '💼';

  const hasSalary = offer.salary_range_min || offer.salary_range_max;
  const salaryLabel = formatSalaryRange(offer.salary_range_min, offer.salary_range_max);
  const periodLabel = offer.salary_period === 'hourly' ? '/h' : offer.salary_period === 'yearly' ? '/an' : '/mois';

  // Détecter les avantages éventuellement stockés dans other_benefits (texte) ou dans full_description
  const hasAdvantages = offer.provides_housing || offer.provides_meals || offer.requires_vehicle || offer.has_driving_license;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Breadcrumb ───────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-brand-600 transition-colors">Accueil</Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <Link href="/emploi/offres" className="hover:text-brand-600 transition-colors">Offres d&apos;emploi</Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{offer.title}</span>
          </nav>
        </div>
      </div>

      {/* ── Hero de l'offre ──────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/emploi/offres"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-brand-600 transition-colors text-sm mb-5">
            <ArrowLeft className="w-4 h-4" /> Retour aux offres
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border ${contractCls.bg} ${contractCls.text} ${contractCls.border}`}>
                  {CONTRACT_TYPE_LABELS[offer.contract_type]}
                </span>
                {offer.is_urgent && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-700 border border-red-200">
                    <Flame className="w-4 h-4" /> Urgent
                  </span>
                )}
                {offer.provides_housing && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Home className="w-4 h-4" /> Logement fourni
                  </span>
                )}
                {offer.provides_meals && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                    <Utensils className="w-4 h-4" /> Repas fournis
                  </span>
                )}
              </div>

              {/* Titre */}
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 leading-tight">
                <span className="mr-2">{categoryIcon}</span>{offer.title}
              </h1>

              {/* Employeur */}
              {offer.employer_name && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{offer.employer_name}</p>
                    {offer.location_address && (
                      <p className="text-sm text-gray-500">{offer.location_address}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Meta ligne */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-400" />
                  <span className="font-medium">
                    {offer.location_city || offer.location_label}
                    {offer.sector_id && SECTOR_LABELS[offer.sector_id] && (
                      <span className="ml-1 text-gray-400">· {SECTOR_LABELS[offer.sector_id]}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{JOB_CATEGORY_LABELS[offer.job_category]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span>{offer.views_count} vue{offer.views_count > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span suppressHydrationWarning>
                    Publié le {new Date(offer.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloc salaire hero */}
            {hasSalary && (
              <div className="lg:w-64 flex-shrink-0 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 text-center">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Rémunération</p>
                <p className="text-3xl font-extrabold text-green-700">{salaryLabel}</p>
                <p className="text-sm text-green-600">{periodLabel}</p>
                {offer.salary_is_negotiable && (
                  <p className="text-xs text-green-500 mt-1 font-medium">✓ Négociable</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Corps ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Colonne principale ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Description du poste */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" />
                Description du poste
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                {offer.full_description || offer.short_description}
              </div>
            </div>

            {/* Conditions de travail – bloc résumé */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-brand-500" />
                Conditions de travail
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Salaire */}
                {hasSalary && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Euro className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Salaire</p>
                      <p className="font-bold text-gray-900">{salaryLabel} <span className="text-gray-500 font-normal text-sm">{periodLabel}</span></p>
                      {offer.salary_is_negotiable && <p className="text-xs text-green-600">Négociable selon profil</p>}
                    </div>
                  </div>
                )}

                {/* Horaires */}
                {offer.weekly_hours && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Horaires</p>
                      <p className="font-bold text-gray-900">{offer.weekly_hours}h / semaine</p>
                      {offer.is_flexible_schedule && <p className="text-xs text-blue-600">⚡ Horaires flexibles</p>}
                      {offer.schedule_details && <p className="text-xs text-gray-600 mt-0.5">{offer.schedule_details}</p>}
                    </div>
                  </div>
                )}

                {/* Date de début */}
                {offer.start_date && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Début</p>
                      <p className="font-bold text-gray-900" suppressHydrationWarning>
                        {new Date(offer.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {offer.availability_type === 'immediate' && <p className="text-xs text-amber-600">Poste à pourvoir immédiatement</p>}
                    </div>
                  </div>
                )}

                {/* Expérience */}
                {offer.experience_level && (
                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Expérience</p>
                      <p className="font-bold text-gray-900">{EXPERIENCE_LEVEL_LABELS[offer.experience_level]}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Horaires textuels si pas de weekly_hours */}
              {!offer.weekly_hours && offer.schedule_details && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Horaires</p>
                  <p className="text-gray-700 text-sm">{offer.schedule_details}</p>
                </div>
              )}
            </div>

            {/* Avantages */}
            {hasAdvantages && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Avantages &amp; Conditions spéciales
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {offer.provides_housing && (
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                      <Home className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-indigo-800 text-sm">Logement fourni</p>
                        {offer.housing_details && <p className="text-xs text-indigo-600">{offer.housing_details}</p>}
                      </div>
                    </div>
                  )}
                  {offer.provides_meals && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                      <Utensils className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-800 text-sm">Repas fournis</p>
                        <p className="text-xs text-green-600">Repas de service inclus</p>
                      </div>
                    </div>
                  )}
                  {offer.has_driving_license && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="text-xl flex-shrink-0">🪪</span>
                      <div>
                        <p className="font-semibold text-blue-800 text-sm">Permis de conduire requis</p>
                        <p className="text-xs text-blue-600">Obligatoire pour ce poste</p>
                      </div>
                    </div>
                  )}
                  {offer.requires_vehicle && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <Car className="w-6 h-6 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">Véhicule personnel requis</p>
                        <p className="text-xs text-gray-600">Non remboursé sauf accord</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Avantages textuels (stockés en string) */}
                {offer.other_benefits && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Autres avantages</p>
                    <p className="text-sm text-gray-700">{offer.other_benefits}</p>
                  </div>
                )}
              </div>
            )}

            {/* Compétences requises */}
            {offer.required_skills && offer.required_skills.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-brand-500" />
                  Compétences requises
                </h2>
                <div className="flex flex-wrap gap-2">
                  {offer.required_skills.map((skill, idx) => (
                    <span key={idx}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-50 text-brand-700 border border-brand-200">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Compétences appréciées */}
            {offer.nice_to_have_skills && offer.nice_to_have_skills.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Compétences appréciées <span className="text-gray-400 font-normal text-base">(un plus)</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {offer.nice_to_have_skills.map((skill, idx) => (
                    <span key={idx}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      + {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA mobile (visible uniquement sur petit écran) */}
            <div className="lg:hidden bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl border-0 shadow-sm p-5">
              <h3 className="text-base font-bold text-white mb-1">Postuler à cette offre</h3>
              <p className="text-brand-100 text-xs mb-4">Connectez-vous pour voir les coordonnées.</p>
              <ProtectedContact
                type="offer"
                slug={offer.slug}
                hasEmail={!!(offer.application_mode === 'email' || offer.application_mode === 'mixed' || offer.contact_email)}
                hasPhone={!!(offer.application_mode === 'phone' || offer.application_mode === 'mixed' || offer.contact_phone)}
                colorScheme="brand"
                jobTitle={offer.title}
                ctaLabel="Voir les coordonnées"
              />
            </div>
          </div>

          {/* ── Sidebar droite ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-5">

              {/* CTA Postuler */}
              <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white shadow-lg">
                <h3 className="text-lg font-bold mb-1">Intéressé(e) ?</h3>
                <p className="text-brand-100 text-sm mb-4">
                  Connectez-vous pour voir les coordonnées de {offer.employer_name || 'l\'employeur'}.
                </p>
                <ProtectedContact
                  type="offer"
                  slug={offer.slug}
                  hasEmail={!!(offer.application_mode === 'email' || offer.application_mode === 'mixed' || offer.contact_email)}
                  hasPhone={!!(offer.application_mode === 'phone' || offer.application_mode === 'mixed' || offer.contact_phone)}
                  colorScheme="brand"
                  jobTitle={offer.title}
                  ctaLabel="Voir les coordonnées"
                />
              </div>

              {/* Fiche poste */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Fiche du poste</h3>
                <dl className="space-y-3">

                  {offer.employer_name && (
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Employeur</dt>
                        <dd className="text-sm font-semibold text-gray-900">{offer.employer_name}</dd>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-500">Localisation</dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {offer.location_city || offer.location_label}
                        {offer.location_address && <span className="block text-xs text-gray-500 font-normal">{offer.location_address}</span>}
                        {offer.sector_id && SECTOR_LABELS[offer.sector_id] && (
                          <span className="block text-xs text-brand-600 font-normal mt-0.5">{SECTOR_LABELS[offer.sector_id]}</span>
                        )}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-500">Type de contrat</dt>
                      <dd className="text-sm font-semibold text-gray-900">{CONTRACT_TYPE_LABELS[offer.contract_type]}</dd>
                    </div>
                  </div>

                  {hasSalary && (
                    <div className="flex items-start gap-2">
                      <Euro className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Rémunération</dt>
                        <dd className="text-sm font-bold text-green-700">
                          {salaryLabel} <span className="text-gray-500 font-normal">{periodLabel}</span>
                        </dd>
                        {offer.salary_is_negotiable && <dd className="text-xs text-green-600">Négociable</dd>}
                      </div>
                    </div>
                  )}

                  {offer.weekly_hours && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Durée de travail</dt>
                        <dd className="text-sm font-semibold text-gray-900">
                          {offer.weekly_hours}h / semaine
                          {offer.is_flexible_schedule && <span className="text-xs text-blue-600 ml-1">· Flexible</span>}
                        </dd>
                      </div>
                    </div>
                  )}

                  {offer.start_date && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Date de début</dt>
                        <dd className="text-sm font-semibold text-gray-900" suppressHydrationWarning>
                          {new Date(offer.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </dd>
                      </div>
                    </div>
                  )}

                  {offer.experience_level && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Expérience</dt>
                        <dd className="text-sm font-semibold text-gray-900">{EXPERIENCE_LEVEL_LABELS[offer.experience_level]}</dd>
                      </div>
                    </div>
                  )}

                  {offer.is_remote_possible && (
                    <div className="flex items-start gap-2">
                      <Wifi className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Télétravail</dt>
                        <dd className="text-sm font-semibold text-gray-900">Possible</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              {/* Auteur */}
              {offer.author_profile && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Publiée par</p>
                  <div className="flex items-center gap-3">
                    {offer.author_profile.avatar_url ? (
                      <img src={offer.author_profile.avatar_url} alt={offer.author_profile.display_name}
                        className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                        {offer.author_profile.display_name[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {offer.author_profile.display_name}
                        {offer.author_profile.is_verified && <span className="ml-1 text-brand-500 text-sm">✓</span>}
                      </p>
                      <p className="text-xs text-gray-500" suppressHydrationWarning>
                        Membre depuis {new Date(offer.author_profile.created_at).getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons Modifier / Supprimer (propriétaire uniquement) */}
              {isOwner && (
                <OwnerActions
                  type="offer"
                  slug={offer.slug}
                  editHref={`/emploi/offres/${offer.slug}/modifier`}
                  colorScheme="cyan"
                />
              )}

              {/* Voir les demandes */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-600 mb-3">Vous cherchez un emploi ?</p>
                <Link href="/emploi/demandes"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-colors text-sm">
                  Déposer ma candidature
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


