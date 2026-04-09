/**
 * Page: Détail d'une demande d'emploi
 * Route: /emploi/demandes/[slug]
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Euro,
  Clock,
  Calendar,
  Search,
  User,
  Car,
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { getJobDemandBySlug } from '@/services/jobs/queries';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  EXPERIENCE_LEVEL_LABELS,
  formatSalaryRange,
} from '@/types/jobs/constants';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const demand = await getJobDemandBySlug(params.slug);

  if (!demand) {
    return { title: 'Demande non trouvée - Biguglia Connect' };
  }

  return {
    title: `${demand.title} – ${demand.location_label} | Biguglia Connect`,
    description: demand.short_description,
  };
}

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: '🟢 Disponible immédiatement',
  week:      '📅 Dès la semaine prochaine',
  month:     '📅 Dans le mois',
  date:      '📅 À partir d\'une date précise',
  flexible:  '⚡ Flexible / À discuter',
};

export default async function DemandDetailPage({ params }: PageProps) {
  const demand = await getJobDemandBySlug(params.slug);

  if (!demand) {
    notFound();
  }

  const categoryIcon = JOB_CATEGORY_ICONS[demand.job_category] || '💼';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Barre retour ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/emploi/demandes"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Retour aux demandes</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne principale ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Carte en-tête */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              {/* Badges contrats */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {demand.desired_contract_types?.slice(0, 4).map((contractType) => (
                  <span
                    key={contractType}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-purple-100 text-purple-700 border border-purple-200"
                  >
                    {CONTRACT_TYPE_LABELS[contractType]}
                  </span>
                ))}
                {demand.is_urgent && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                    🔥 Disponible rapidement
                  </span>
                )}
              </div>

              {/* Titre */}
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {categoryIcon} {demand.title}
              </h1>

              {/* Catégorie + meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">{JOB_CATEGORY_LABELS[demand.job_category]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{demand.location_label}</span>
                  {demand.mobility_radius && (
                    <span className="text-gray-400">· Rayon {demand.mobility_radius} km</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span>{demand.views_count} vue{demand.views_count > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span suppressHydrationWarning>
                    Publié le {new Date(demand.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              {/* Badges atouts */}
              <div className="flex flex-wrap gap-2">
                {demand.cv_url && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <FileText className="w-4 h-4" />
                    CV disponible
                  </span>
                )}
                {demand.has_driving_license && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    🪪 Permis de conduire
                  </span>
                )}
                {demand.has_vehicle && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                    <Car className="w-4 h-4" />
                    Véhicule personnel
                  </span>
                )}
              </div>
            </div>

            {/* Présentation */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                Présentation du candidat
              </h2>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {demand.full_description || demand.short_description}
              </p>
            </div>

            {/* Compétences */}
            {demand.skills && demand.skills.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Compétences</h2>
                <div className="flex flex-wrap gap-2">
                  {demand.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Types de contrat complets */}
            {demand.desired_contract_types?.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contrats recherchés</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {demand.desired_contract_types.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl"
                    >
                      <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-purple-800">
                        {CONTRACT_TYPE_LABELS[type]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar droite ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">

              {/* Boîte "Contacter ce candidat" */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
                <h3 className="text-lg font-bold mb-1">Intéressé par ce profil ?</h3>
                <p className="text-purple-100 text-sm mb-5">
                  Contactez directement ce candidat pour lui proposer un poste.
                </p>
                <div className="space-y-3">
                  {demand.contact_email && (
                    <a
                      href={`mailto:${demand.contact_email}?subject=Opportunité d'emploi – ${demand.title}`}
                      className="flex items-center gap-2 w-full px-4 py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-colors justify-center"
                    >
                      <Mail className="w-4 h-4" />
                      Envoyer un email
                    </a>
                  )}
                  {demand.contact_phone && (
                    <a
                      href={`tel:${demand.contact_phone}`}
                      className="flex items-center gap-2 w-full px-4 py-3 bg-white/20 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-colors justify-center backdrop-blur-sm"
                    >
                      <Phone className="w-4 h-4" />
                      Appeler
                    </a>
                  )}
                  {demand.cv_url && (
                    <a
                      href={demand.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full px-4 py-3 bg-white/20 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-colors justify-center backdrop-blur-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Voir le CV
                    </a>
                  )}
                </div>
              </div>

              {/* Infos essentielles */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Informations clés</h3>
                <div className="space-y-4">

                  {/* Disponibilité */}
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="font-medium">Disponibilité</span>
                    </div>
                    <p className="text-gray-900 ml-6 text-sm">
                      {AVAILABILITY_LABELS[demand.availability_type] || demand.availability_type}
                    </p>
                    {demand.available_from && (
                      <p className="text-gray-500 ml-6 text-xs mt-0.5" suppressHydrationWarning>
                        À partir du {new Date(demand.available_from).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>

                  {/* Expérience */}
                  {demand.experience_level && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <User className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">Expérience</span>
                      </div>
                      <p className="text-gray-900 ml-6 text-sm">
                        {EXPERIENCE_LEVEL_LABELS[demand.experience_level]}
                      </p>
                    </div>
                  )}

                  {/* Prétentions salariales */}
                  {(demand.salary_expectation_min || demand.salary_expectation_max) && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Euro className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">Prétentions salariales</span>
                      </div>
                      <p className="text-green-700 font-semibold ml-6 text-sm">
                        {formatSalaryRange(demand.salary_expectation_min, demand.salary_expectation_max)}
                        {demand.salary_period && (
                          <span className="text-gray-500 font-normal ml-1">
                            /{demand.salary_period === 'hourly' ? 'h' : demand.salary_period === 'monthly' ? 'mois' : 'an'}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Horaires souhaités */}
                  {demand.weekly_hours_desired && (
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">Horaires souhaités</span>
                      </div>
                      <p className="text-gray-900 ml-6 text-sm">
                        {demand.weekly_hours_desired}h/semaine
                        {demand.is_flexible_schedule && (
                          <span className="text-gray-500 ml-1">· Flexible</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Localisation */}
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span className="font-medium">Zone de recherche</span>
                    </div>
                    <p className="text-gray-900 ml-6 text-sm">
                      {demand.location_label}
                      {demand.mobility_radius && (
                        <span className="text-gray-500 ml-1">· {demand.mobility_radius} km max</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auteur */}
              {demand.author_profile && (
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Profil publié par</h3>
                  <div className="flex items-center gap-3">
                    {demand.author_profile.avatar_url ? (
                      <img
                        src={demand.author_profile.avatar_url}
                        alt={demand.author_profile.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                        {demand.author_profile.display_name[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {demand.author_profile.display_name}
                        {demand.author_profile.is_verified && (
                          <span className="ml-1 text-purple-500">✓</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500" suppressHydrationWarning>
                        Membre depuis {new Date(demand.author_profile.created_at).getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lien retour offres */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-600 mb-3">Vous recrutez ?</p>
                <Link
                  href="/emploi/offres"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm"
                >
                  Voir les offres d&apos;emploi
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
