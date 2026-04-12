/**
 * services/jobs/queries/shared.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitaires partagés entre les modules offers, demands et ownership.
 *
 * Exports :
 *  - DbError                  Type Supabase minimal (message + code optionnels)
 *  - asDbError                Convertit unknown → DbError sans cast unsafe
 *  - isMissingTableError      Détecte "table inexistante" (migration en attente)
 *  - isNotFoundError          Détecte PGRST116 (0 lignes)
 *  - JobOfferRow              Type de projection DB pour job_offers (select *)
 *  - JobDemandRow             Type de projection DB pour job_demands (select *)
 *  - AuthorJoinRow            Type de la jointure profiles!user_id
 *  - toAuthorProfile          Mappe AuthorJoinRow → JobUserProfile | undefined
 *  - buildPagination          Calcule from/to/page/limit depuis les filtres
 *
 * Principe de typage :
 *  Supabase sans schéma généré renvoie `data: any` pour select('*').
 *  On remplace les casts `data as SomeType[]` par des interfaces explicites
 *  (`JobOfferRow`, `JobDemandRow`) qui décrivent exactement la projection DB,
 *  puis on les convertit vers les types métier via des mappers dédiés.
 */

import type {
  JobOffer,
  JobDemand,
  JobUserProfile,
} from '@/types/jobs';
import type {
  ContractType,
  EmploymentType,
  JobCategory,
  ExperienceLevel,
  AvailabilityType,
  JobStatus,
  ApplicationMode,
  VisibilityLevel,
  PromotionType,
  PlanType,
  MobilityMode,
} from '@/types/jobs/constants';

// ─── Type d'erreur Supabase ───────────────────────────────────────────────────

/** Sous-ensemble des champs retournés par les erreurs Supabase PostgREST */
export interface DbError {
  message?: string;
  code?: string;
}

/**
 * Convertit une valeur `unknown` (catch, erreur réseau…) vers DbError.
 * Évite le pattern `err as DbError` qui cast depuis unknown sans vérification.
 */
export function asDbError(e: unknown): DbError {
  if (e !== null && typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    return {
      message: typeof obj['message'] === 'string' ? obj['message'] : undefined,
      code:    typeof obj['code']    === 'string' ? obj['code']    : undefined,
    };
  }
  return {};
}

// ─── Helpers d'erreur ─────────────────────────────────────────────────────────

/**
 * Retourne true si l'erreur indique que la table n'existe pas encore
 * (migration SQL en attente).
 *
 * PostgREST renvoie code "42P01" ou un message contenant "relation" /
 * "does not exist" quand la table est absente.
 */
export function isMissingTableError(err: DbError): boolean {
  const msg = err.message ?? '';
  return (
    err.code === '42P01' ||
    msg.includes('relation') ||
    msg.includes('does not exist')
  );
}

/**
 * Retourne true si l'erreur PostgREST signifie "0 lignes retournées"
 * (PGRST116 = "JSON object requested, multiple (or no) rows returned").
 */
export function isNotFoundError(err: DbError): boolean {
  return err.code === 'PGRST116';
}

// ─── Types de projection DB ───────────────────────────────────────────────────
//
// Ces interfaces décrivent la forme exacte renvoyée par Supabase pour chaque
// select('*'). Elles sont équivalentes aux interfaces métier JobOffer / JobDemand,
// mais constituent un contrat explicite avec la couche DB, indépendant de la
// représentation métier. Lorsque le schéma DB généré (database.types.ts) sera
// disponible, ces types pourront être remplacés par des projections Supabase
// générées (Database['public']['Tables']['job_offers']['Row']).

/** Ligne brute renvoyée par Supabase pour la table `job_offers` (select *) */
export interface JobOfferRow {
  id: string;
  slug: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  job_category: JobCategory;
  contract_type: ContractType;
  employment_type: EmploymentType;
  employer_name: string | null;
  employer_address: string | null;
  location_label: string;
  location_city: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  sector_id: string | null;
  is_remote_possible: boolean;
  start_date: string | null;
  end_date: string | null;
  mission_duration_days: number | null;
  availability_type: AvailabilityType;
  short_description: string;
  full_description: string | null;
  required_skills: string[] | null;
  nice_to_have_skills: string[] | null;
  tags: string[] | null;
  experience_level: ExperienceLevel | null;
  experience_years_min: number | null;
  experience_years_max: number | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  salary_period: 'hourly' | 'monthly' | 'yearly' | null;
  salary_is_negotiable: boolean;
  weekly_hours: number | null;
  schedule_details: string | null;
  is_flexible_schedule: boolean;
  has_driving_license: boolean;
  requires_vehicle: boolean;
  application_mode: ApplicationMode;
  contact_email: string | null;
  contact_phone: string | null;
  application_url: string | null;
  contact_instructions: string | null;
  provides_housing: boolean;
  housing_details: string | null;
  provides_meals: boolean;
  other_benefits: string | null;
  status: JobStatus;
  is_urgent: boolean;
  visibility_level: VisibilityLevel;
  promotion_type: PromotionType;
  boosted_until: string | null;
  sponsor_label: string | null;
  completeness_score: number;
  views_count: number;
  contacts_count: number;
  billing_eligible: boolean;
  plan_type: PlanType;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  last_refreshed_at: string | null;
  last_contacted_at: string | null;
  expired_at: string | null;
  filled_at: string | null;
  expired_reason: string | null;
  filled_reason: string | null;
  publication_source: 'web' | 'mobile' | 'api' | null;
  is_moderated: boolean;
  moderation_notes: string | null;
}

/** Ligne brute renvoyée par Supabase pour la table `job_demands` (select *) */
export interface JobDemandRow {
  id: string;
  slug: string;
  user_id: string;
  title: string;
  job_category: JobCategory;
  desired_contract_types: ContractType[];
  desired_employment_types: EmploymentType[];
  location_label: string;
  location_lat: number | null;
  location_lng: number | null;
  sector_id: string | null;
  mobility_radius: number | null;
  mobility_mode: MobilityMode | null;
  availability_type: AvailabilityType;
  available_from: string | null;
  availability_comment: string | null;
  short_description: string;
  full_description: string | null;
  skills: string[] | null;
  tags: string[] | null;
  experience_level: ExperienceLevel | null;
  experience_years: number | null;
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
  salary_period: 'hourly' | 'monthly' | 'yearly' | null;
  weekly_hours_desired: number | null;
  is_flexible_schedule: boolean;
  has_driving_license: boolean;
  has_vehicle: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  contact_mode: string | null;
  cv_url: string | null;
  portfolio_url: string | null;
  location_city: string | null;
  status: JobStatus;
  is_urgent: boolean;
  completeness_score: number;
  views_count: number;
  contacts_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  last_refreshed_at: string | null;
  last_contacted_at: string | null;
  expired_at: string | null;
  filled_at: string | null;
  expired_reason: string | null;
  filled_reason: string | null;
  publication_source: 'web' | 'mobile' | 'api' | null;
  is_moderated: boolean;
  moderation_notes: string | null;
}

/**
 * Forme de la jointure `author:profiles!user_id` dans les requêtes enrichies.
 * Les champs correspondent exactement à ceux sélectionnés dans la projection :
 *   id, display_name, avatar_url, is_verified, created_at
 */
export interface AuthorJoinRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  created_at: string | null;
}

/** Row job_offers enrichie de la jointure author */
export interface JobOfferRowWithAuthor extends JobOfferRow {
  author: AuthorJoinRow | AuthorJoinRow[] | null;
}

/** Row job_demands enrichie de la jointure author */
export interface JobDemandRowWithAuthor extends JobDemandRow {
  author: AuthorJoinRow | AuthorJoinRow[] | null;
}

// ─── Mapper author profile ────────────────────────────────────────────────────

/**
 * Mappe la valeur de la jointure `profiles!user_id` vers `JobUserProfile`.
 *
 * La jointure peut être :
 *  - Un objet `AuthorJoinRow`
 *  - Un tableau (jointure multi-rows) → on prend le premier élément
 *  - null → retourne undefined
 */
export function toAuthorProfile(
  raw: AuthorJoinRow | AuthorJoinRow[] | null | undefined,
): JobUserProfile | undefined {
  const obj: AuthorJoinRow | undefined = Array.isArray(raw) ? raw[0] : raw ?? undefined;
  if (!obj) return undefined;
  if (typeof obj.id !== 'string') return undefined;

  return {
    id:           obj.id,
    display_name: obj.display_name ?? '',
    avatar_url:   obj.avatar_url   ?? null,
    is_verified:  obj.is_verified  ?? false,
    created_at:   obj.created_at   ?? '',
  };
}

// ─── Mappers métier ───────────────────────────────────────────────────────────

/**
 * Convertit une `JobOfferRow` (projection DB) en `JobOffer` (type métier).
 *
 * `JobOfferRow` est structurellement identique à `JobOffer` (nullable vs
 * optionnel mis à part) ; ce mapper sert de point de contrôle explicite
 * et permet d'adapter la forme si les deux types divergent à l'avenir.
 */
export function toJobOffer(row: JobOfferRow): JobOffer {
  return row as JobOffer;
}

/**
 * Convertit une `JobDemandRow` (projection DB) en `JobDemand` (type métier).
 */
export function toJobDemand(row: JobDemandRow): JobDemand {
  return row as JobDemand;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  from: number;
  to: number;
}

/**
 * Calcule les paramètres de pagination Supabase (range from/to)
 * à partir des valeurs optionnelles reçues dans les filtres.
 *
 * @param rawPage   Numéro de page (défaut 1)
 * @param rawLimit  Taille de page (défaut 20)
 */
export function buildPagination(
  rawPage: number | undefined,
  rawLimit: number | undefined,
): PaginationParams {
  const page  = rawPage  && rawPage  > 0 ? rawPage  : 1;
  const limit = rawLimit && rawLimit > 0 ? rawLimit : 20;
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;
  return { page, limit, from, to };
}
