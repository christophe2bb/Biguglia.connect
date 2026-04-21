/**
 * Page: Détail d'une demande d'emploi
 * Route: /emploi/demandes/[slug]
 */

import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin, Euro, Clock, Calendar, Search, User, Car, ArrowLeft,
  FileText, Eye, CheckCircle, Star, GraduationCap,
  ChevronRight, Flame, Briefcase,
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import type { JobDemandSearchResult } from '@/types/jobs';

async function getDemand(slug: string): Promise<JobDemandSearchResult | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('job_demands')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error || !data) return null;
    const d = data as Record<string, unknown>;
    if (!['published', 'active'].includes(d.status as string)) return null;
    return d as unknown as JobDemandSearchResult;
  } catch {
    return null;
  }
}
import OwnerActions from '@/components/jobs/OwnerActions';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  EXPERIENCE_LEVEL_LABELS,
  formatSalaryRange,
  SECTOR_LABELS,
} from '@/types/jobs/constants';
import ProtectedContact from '@/components/jobs/ProtectedContact';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const demand = await getDemand(slug);
  if (!demand) return { title: 'Demande non trouvée - Biguglia Connect' };
  return {
    title: `${demand.title} – ${demand.location_label} | Biguglia Connect`,
    description: demand.short_description,
  };
}

const AVAILABILITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  immediate: { label: 'Disponible immédiatement',    color: 'text-green-700',  bg: 'bg-green-50 border-green-200'  },
  week:      { label: 'Dès la semaine prochaine',     color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200'    },
  month:     { label: 'Dans le mois',                 color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200'  },
  date:      { label: 'À partir d\'une date précise', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200'},
  flexible:  { label: 'Flexible / À discuter',        color: 'text-gray-700',   bg: 'bg-gray-50 border-gray-200'    },
};


export default async function DemandDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const demand = await getDemand(slug);

  /* ── Table DB pas encore créée OU demande introuvable ── */
  if (!demand) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">🔧</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Demande introuvable</h1>
        <p className="text-gray-500 mb-2 max-w-sm">
          Cette demande n&apos;existe pas encore, a été retirée, ou la base de données
          n&apos;a pas encore été initialisée.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Si vous venez de publier une demande, exécutez la migration SQL dans Supabase puis revenez.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/emploi/demandes"
            className="px-5 py-2.5 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-colors text-sm">
            ← Voir toutes les demandes
          </Link>
          <Link href="/emploi/demandes/publier"
            className="px-5 py-2.5 bg-white border-2 border-purple-200 text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-colors text-sm">
            Déposer une demande
          </Link>
        </div>
      </div>
    );
  }

  const categoryIcon = JOB_CATEGORY_ICONS[demand.job_category] || '💼';
  const avail = AVAILABILITY_LABELS[demand.availability_type] ?? AVAILABILITY_LABELS.flexible;
  const hasSalary = demand.salary_expectation_min || demand.salary_expectation_max;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-purple-600 transition-colors">Accueil</Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <Link href="/emploi/demandes" className="hover:text-purple-600 transition-colors">Demandes d&apos;emploi</Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{demand.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/emploi/demandes"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors text-sm mb-5">
            <ArrowLeft className="w-4 h-4" /> Retour aux demandes
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              {/* Badges contrats */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {demand.desired_contract_types?.map((ct) => (
                  <span key={ct}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-purple-100 text-purple-700 border border-purple-200">
                    {CONTRACT_TYPE_LABELS[ct]}
                  </span>
                ))}
                {demand.is_urgent && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-700 border border-red-200">
                    <Flame className="w-4 h-4" /> Disponible rapidement
                  </span>
                )}
              </div>

              {/* Titre */}
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                <span className="mr-2">{categoryIcon}</span>{demand.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">{JOB_CATEGORY_LABELS[demand.job_category]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>
                    {demand.location_label}
                    {demand.mobility_radius && <span className="text-gray-400 ml-1">· Rayon {demand.mobility_radius} km</span>}
                    {demand.sector_id && SECTOR_LABELS[demand.sector_id] && (
                      <span className="text-purple-500 ml-1">· {SECTOR_LABELS[demand.sector_id]}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span>{demand.views_count} vue{demand.views_count > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span suppressHydrationWarning>
                    Publié le {new Date(demand.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloc disponibilité hero */}
            <div className={`lg:w-60 flex-shrink-0 rounded-2xl p-5 text-center border-2 ${avail.bg}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">Disponibilité</p>
              <p className={`text-lg font-extrabold ${avail.color}`}>{avail.label}</p>
              {demand.available_from && (
                <p className="text-xs text-gray-500 mt-1" suppressHydrationWarning>
                  À partir du {new Date(demand.available_from).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">

            {/* Présentation */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" /> Présentation du candidat
              </h2>
              <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                {demand.full_description || demand.short_description}
              </div>
            </div>

            {/* Ce que je recherche */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-500" /> Ce que je recherche
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Contrats */}
                {demand.desired_contract_types?.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3">Contrats visés</p>
                    <div className="flex flex-wrap gap-2">
                      {demand.desired_contract_types.map((ct) => (
                        <span key={ct}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
                          {CONTRACT_TYPE_LABELS[ct]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disponibilité */}
                <div className={`p-4 rounded-xl border-2 ${avail.bg}`}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-500">Disponibilité</p>
                  <p className={`font-bold text-sm ${avail.color}`}>{avail.label}</p>
                  {demand.available_from && (
                    <p className="text-xs text-gray-500 mt-1" suppressHydrationWarning>
                      {new Date(demand.available_from).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>

                {/* Salaire souhaité */}
                {hasSalary && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Prétentions salariales</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {formatSalaryRange(demand.salary_expectation_min, demand.salary_expectation_max)}
                    </p>
                    {demand.salary_period && (
                      <p className="text-xs text-green-600">
                        {demand.salary_period === 'hourly' ? 'par heure' : demand.salary_period === 'monthly' ? 'par mois' : 'par an'}
                      </p>
                    )}
                  </div>
                )}

                {/* Horaires souhaités */}
                {(demand.weekly_hours_desired || demand.is_flexible_schedule) && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Horaires souhaités</p>
                    {demand.weekly_hours_desired && (
                      <p className="font-bold text-gray-900">{demand.weekly_hours_desired}h / semaine</p>
                    )}
                    {demand.is_flexible_schedule && (
                      <p className="text-xs text-blue-600 mt-0.5">⚡ Horaires flexibles acceptés</p>
                    )}
                  </div>
                )}

                {/* Mobilité */}
                {(demand.location_label || demand.mobility_radius) && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Zone de recherche</p>
                    <p className="font-semibold text-gray-900">{demand.location_label}</p>
                    {demand.sector_id && SECTOR_LABELS[demand.sector_id] && (
                      <p className="text-xs text-purple-600">{SECTOR_LABELS[demand.sector_id]}</p>
                    )}
                    {demand.mobility_radius && (
                      <p className="text-xs text-gray-500 mt-0.5">Rayon max : {demand.mobility_radius} km</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Profil & Atouts */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" /> Profil &amp; Atouts
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {demand.cv_url && (
                  <a href={demand.cv_url} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors">
                    <FileText className="w-8 h-8 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-800">CV disponible</span>
                    <span className="text-xs text-indigo-500">Cliquer pour voir</span>
                  </a>
                )}
                {demand.has_driving_license && (
                  <div className="flex flex-col items-center gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <span className="text-3xl">🪪</span>
                    <span className="text-xs font-bold text-blue-800">Permis de conduire</span>
                  </div>
                )}
                {demand.has_vehicle && (
                  <div className="flex flex-col items-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                    <Car className="w-8 h-8 text-green-500" />
                    <span className="text-xs font-bold text-green-800">Véhicule personnel</span>
                  </div>
                )}
              </div>

              {demand.experience_level && (
                <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl mb-3">
                  <GraduationCap className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Niveau d&apos;expérience</p>
                    <p className="font-bold text-gray-900">{EXPERIENCE_LEVEL_LABELS[demand.experience_level]}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Compétences */}
            {demand.skills && demand.skills.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500" /> Compétences
                </h2>
                <div className="flex flex-wrap gap-2">
                  {demand.skills.map((skill, idx) => (
                    <span key={idx}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA mobile */}
            <div className="lg:hidden bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl border-0 shadow-sm p-5">
              <h3 className="text-base font-bold text-white mb-1">Contacter ce candidat</h3>
              {/* contact_email/phone/mode n'existent pas sur job_demands — l'API
                  récupère automatiquement email+phone depuis profiles */}
              <ProtectedContact
                type="demand"
                slug={demand.slug}
                hasEmail={true}
                hasPhone={true}
                colorScheme="purple"
                jobTitle={demand.title}
                ctaLabel="Voir les coordonnées"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-5">

              {/* CTA Contact */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
                <h3 className="text-lg font-bold mb-2">Intéressé(e) par ce profil ?</h3>
                {/* contact_email/phone/mode n'existent pas sur job_demands — l'API
                    récupère automatiquement email+phone depuis profiles */}
                <ProtectedContact
                  type="demand"
                  slug={demand.slug}
                  hasEmail={true}
                  hasPhone={true}
                  colorScheme="purple"
                  jobTitle={demand.title}
                  ctaLabel="Voir les coordonnées"
                />
                {demand.cv_url && (
                  <div className="mt-3">
                    <a href={demand.cv_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full px-4 py-3 bg-white/20 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-colors justify-center">
                      <FileText className="w-4 h-4" /> Voir le CV
                    </a>
                  </div>
                )}
              </div>

              {/* Fiche candidat */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Fiche candidat</h3>
                <dl className="space-y-3">

                  <div className="flex items-start gap-2">
                    <Search className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-500">Métier recherché</dt>
                      <dd className="text-sm font-semibold text-gray-900">{JOB_CATEGORY_LABELS[demand.job_category]}</dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-500">Zone de recherche</dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {demand.location_label}
                        {demand.mobility_radius && (
                          <span className="block text-xs text-gray-500 font-normal">Rayon : {demand.mobility_radius} km</span>
                        )}
                        {demand.sector_id && SECTOR_LABELS[demand.sector_id] && (
                          <span className="block text-xs text-purple-600 font-normal mt-0.5">{SECTOR_LABELS[demand.sector_id]}</span>
                        )}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-gray-500">Disponibilité</dt>
                      <dd className={`text-sm font-semibold ${avail.color}`}>{avail.label}</dd>
                      {demand.available_from && (
                        <dd className="text-xs text-gray-500" suppressHydrationWarning>
                          {new Date(demand.available_from).toLocaleDateString('fr-FR')}
                        </dd>
                      )}
                    </div>
                  </div>

                  {demand.experience_level && (
                    <div className="flex items-start gap-2">
                      <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Expérience</dt>
                        <dd className="text-sm font-semibold text-gray-900">{EXPERIENCE_LEVEL_LABELS[demand.experience_level]}</dd>
                      </div>
                    </div>
                  )}

                  {hasSalary && (
                    <div className="flex items-start gap-2">
                      <Euro className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Prétentions salariales</dt>
                        <dd className="text-sm font-bold text-green-700">
                          {formatSalaryRange(demand.salary_expectation_min, demand.salary_expectation_max)}
                          {demand.salary_period && (
                            <span className="text-gray-500 font-normal ml-1">
                              /{demand.salary_period === 'hourly' ? 'h' : demand.salary_period === 'monthly' ? 'mois' : 'an'}
                            </span>
                          )}
                        </dd>
                      </div>
                    </div>
                  )}

                  {demand.weekly_hours_desired && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-gray-500">Horaires souhaités</dt>
                        <dd className="text-sm font-semibold text-gray-900">
                          {demand.weekly_hours_desired}h/semaine
                          {demand.is_flexible_schedule && <span className="text-xs text-blue-600 ml-1">· Flexible</span>}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              {/* Auteur */}
              {demand.author_profile && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Profil publié par</p>
                  <div className="flex items-center gap-3">
                    {demand.author_profile.avatar_url ? (
                      <Image src={demand.author_profile.avatar_url} alt={demand.author_profile.display_name} fill className="rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                        {demand.author_profile.display_name[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {demand.author_profile.display_name}
                        {demand.author_profile.is_verified && <span className="ml-1 text-purple-500 text-sm">✓</span>}
                      </p>
                      <p className="text-xs text-gray-500" suppressHydrationWarning>
                        Membre depuis {new Date(demand.author_profile.created_at).getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons Modifier / Supprimer — vérification propriété côté client */}
              <OwnerActions
                type="demand"
                slug={demand.slug}
                editHref={`/emploi/demandes/${demand.slug}/modifier`}
                colorScheme="purple"
              />

              {/* Lien retour offres */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-600 mb-3">Vous recrutez ?</p>
                <Link href="/emploi/offres"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm">
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
