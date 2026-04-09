/**
 * Page: Détail d'une offre d'emploi
 * Route: /emploi/offres/[slug]
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Euro,
  Clock,
  Calendar,
  Briefcase,
  User,
  Home,
  Utensils,
  Car,
  ArrowLeft,
  Send,
  Eye,
} from 'lucide-react';
import { getJobOfferBySlug } from '@/services/jobs/queries';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  EXPERIENCE_LEVEL_LABELS,
  formatSalaryRange,
  getContractTypeColor,
} from '@/types/jobs/constants';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const offer = await getJobOfferBySlug(params.slug);

  if (!offer) {
    return {
      title: 'Offre non trouvée - Biguglia Connect',
    };
  }

  return {
    title: `${offer.title} - ${offer.location_label} | Biguglia Connect`,
    description: offer.short_description,
  };
}

export default async function OffreDetailPage({ params }: PageProps) {
  const offer = await getJobOfferBySlug(params.slug);

  if (!offer) {
    notFound();
  }

  const contractColor = getContractTypeColor(offer.contract_type);
  const categoryIcon = JOB_CATEGORY_ICONS[offer.job_category] || '💼';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-4">
          <Link
            href="/emploi/offres"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Retour aux offres</span>
          </Link>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-${contractColor}-100 text-${contractColor}-700 border border-${contractColor}-200`}>
                  {CONTRACT_TYPE_LABELS[offer.contract_type]}
                </span>
                {offer.is_urgent && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                    🔥 Urgent
                  </span>
                )}
                {offer.provides_housing && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Home className="w-4 h-4 mr-1" />
                    Logement fourni
                  </span>
                )}
                {offer.provides_meals && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                    <Utensils className="w-4 h-4 mr-1" />
                    Repas fournis
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {categoryIcon} {offer.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{offer.location_label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span>{JOB_CATEGORY_LABELS[offer.job_category]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{offer.views_count} vue{offer.views_count > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span suppressHydrationWarning>
                    Publié le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Description du poste</h2>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {offer.full_description || offer.short_description}
              </p>
            </div>

            {/* Required skills */}
            {offer.required_skills && offer.required_skills.length > 0 && (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Compétences requises</h2>
                <div className="flex flex-wrap gap-2">
                  {offer.required_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-50 text-brand-700 border border-brand-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nice to have skills */}
            {offer.nice_to_have_skills && offer.nice_to_have_skills.length > 0 && (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Compétences appréciées (optionnel)
                </h2>
                <div className="flex flex-wrap gap-2">
                  {offer.nice_to_have_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Essential info card */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Informations essentielles</h3>
                <div className="space-y-4">
                  {/* Salary */}
                  {(offer.salary_range_min || offer.salary_range_max) && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Euro className="w-4 h-4" />
                        <span className="font-medium">Salaire</span>
                      </div>
                      <p className="text-lg font-bold text-green-700 ml-6">
                        {formatSalaryRange(offer.salary_range_min, offer.salary_range_max)}
                        {offer.salary_period && (
                          <span className="text-sm text-gray-600 ml-1 font-normal">
                            /{offer.salary_period === 'hourly' ? 'h' : offer.salary_period === 'monthly' ? 'mois' : 'an'}
                          </span>
                        )}
                      </p>
                      {offer.salary_is_negotiable && (
                        <p className="text-xs text-gray-500 ml-6 mt-1">Négociable</p>
                      )}
                    </div>
                  )}

                  {/* Hours */}
                  {offer.weekly_hours && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Horaires</span>
                      </div>
                      <p className="text-gray-900 ml-6">
                        {offer.weekly_hours}h/semaine
                        {offer.is_flexible_schedule && (
                          <span className="text-sm text-gray-600 ml-1">· Flexible</span>
                        )}
                      </p>
                      {offer.schedule_details && (
                        <p className="text-sm text-gray-600 ml-6 mt-1">{offer.schedule_details}</p>
                      )}
                    </div>
                  )}

                  {/* Start date */}
                  {offer.start_date && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Début</span>
                      </div>
                      <p className="text-gray-900 ml-6" suppressHydrationWarning>
                        {new Date(offer.start_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}

                  {/* Experience */}
                  {offer.experience_level && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <User className="w-4 h-4" />
                        <span className="font-medium">Expérience</span>
                      </div>
                      <p className="text-gray-900 ml-6">
                        {EXPERIENCE_LEVEL_LABELS[offer.experience_level]}
                      </p>
                    </div>
                  )}

                  {/* Requirements */}
                  {(offer.has_driving_license || offer.requires_vehicle) && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Car className="w-4 h-4" />
                        <span className="font-medium">Requis</span>
                      </div>
                      <div className="ml-6 space-y-1">
                        {offer.has_driving_license && (
                          <p className="text-gray-900 text-sm">🪪 Permis de conduire</p>
                        )}
                        {offer.requires_vehicle && (
                          <p className="text-gray-900 text-sm">🚗 Véhicule personnel</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact card */}
              <div className="bg-brand-50 border-2 border-brand-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Postuler à cette offre</h3>
                <div className="space-y-3">
                  {offer.contact_email && (
                    <a
                      href={`mailto:${offer.contact_email}?subject=Candidature - ${offer.title}`}
                      className="flex items-center gap-2 w-full px-4 py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors justify-center"
                    >
                      <Send className="w-4 h-4" />
                      Envoyer un email
                    </a>
                  )}
                  {offer.contact_phone && (
                    <a
                      href={`tel:${offer.contact_phone}`}
                      className="flex items-center gap-2 w-full px-4 py-3 bg-white text-brand-600 font-semibold rounded-lg border-2 border-brand-200 hover:bg-brand-50 transition-colors justify-center"
                    >
                      📞 Appeler
                    </a>
                  )}
                  {offer.application_url && (
                    <a
                      href={offer.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full px-4 py-3 bg-white text-brand-600 font-semibold rounded-lg border-2 border-brand-200 hover:bg-brand-50 transition-colors justify-center"
                    >
                      🌐 Site web
                    </a>
                  )}
                </div>
                {offer.contact_instructions && (
                  <p className="text-sm text-gray-600 mt-4 p-3 bg-white rounded border border-gray-200">
                    {offer.contact_instructions}
                  </p>
                )}
              </div>

              {/* Author card */}
              {offer.author_profile && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Publié par</h3>
                  <div className="flex items-center gap-3">
                    {offer.author_profile.avatar_url ? (
                      <img
                        src={offer.author_profile.avatar_url}
                        alt={offer.author_profile.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                        {offer.author_profile.display_name[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {offer.author_profile.display_name}
                        {offer.author_profile.is_verified && (
                          <span className="ml-1 text-brand-500">✓</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500" suppressHydrationWarning>
                        Membre depuis {new Date(offer.author_profile.created_at).getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
