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
 *  - JobOfferRow              Alias de Database['public']['Tables']['job_offers']['Row']
 *  - JobDemandRow             Alias de Database['public']['Tables']['job_demands']['Row']
 *  - AuthorJoinRow            Type de la jointure profiles!user_id (5 champs nommés)
 *  - JobOfferRowWithAuthor    JobOfferRow + champ author typé
 *  - JobDemandRowWithAuthor   JobDemandRow + champ author typé
 *  - toAuthorProfile          Mappe AuthorJoinRow → JobUserProfile | undefined
 *  - toJobOffer               Mappe JobOfferRow → JobOffer (cast structurel sûr)
 *  - toJobDemand              Mappe JobDemandRow → JobDemand (cast structurel sûr)
 *  - buildPagination          Calcule from/to/page/limit depuis les filtres
 *
 * Typage :
 *  JobOfferRow et JobDemandRow sont désormais dérivés de src/types/supabase.ts
 *  (Database['public']['Tables'][...]['Row']), qui est aussi le paramètre
 *  générique de createJobsClient<Database>(). Ainsi :
 *  — createJobsClient().from('job_offers').select('*') retourne JobOfferRow[]
 *  — createJobsClient().from('job_demands').select('*') retourne JobDemandRow[]
 *  Aucun cast `data as XRow` n'est nécessaire dans offers.ts / demands.ts.
 */

import type { Database } from '@/types/supabase';
import type { JobOffer, JobDemand, JobUserProfile } from '@/types/jobs';

// ─── Aliases de projection DB ─────────────────────────────────────────────────
// Source unique de vérité : les types Row viennent de src/types/supabase.ts,
// qui sera remplacé par le schéma généré `supabase gen types typescript`.

export type JobOfferRow  = Database['public']['Tables']['job_offers']['Row'];
export type JobDemandRow = Database['public']['Tables']['job_demands']['Row'];
export type ProfileRow   = Database['public']['Tables']['profiles']['Row'];

// ─── Type de la jointure profiles!user_id ─────────────────────────────────────

/**
 * Champs sélectionnés dans la jointure author:profiles!user_id.
 * Sous-ensemble de ProfileRow correspondant à la projection
 * `id, full_name, avatar_url, role, created_at`.
 * Note : display_name et is_verified n'existent pas sur profiles en base.
 */
export type AuthorJoinRow = Pick<
  ProfileRow,
  'id' | 'full_name' | 'avatar_url' | 'role' | 'created_at'
>;

/** Row job_offers enrichie de la jointure author */
export interface JobOfferRowWithAuthor extends JobOfferRow {
  author: AuthorJoinRow | AuthorJoinRow[] | null;
}

/** Row job_demands enrichie de la jointure author */
export interface JobDemandRowWithAuthor extends JobDemandRow {
  author: AuthorJoinRow | AuthorJoinRow[] | null;
}

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
 * (PGRST116).
 */
export function isNotFoundError(err: DbError): boolean {
  return err.code === 'PGRST116';
}

// ─── Mapper author profile ────────────────────────────────────────────────────

/**
 * Mappe la valeur de la jointure `profiles!user_id` vers `JobUserProfile`.
 * La jointure peut être un objet, un tableau (multi-row), ou null.
 */
export function toAuthorProfile(
  raw: AuthorJoinRow | AuthorJoinRow[] | null | undefined,
): JobUserProfile | undefined {
  const obj: AuthorJoinRow | undefined = Array.isArray(raw) ? raw[0] : raw ?? undefined;
  if (!obj) return undefined;
  if (typeof obj.id !== 'string') return undefined;

  return {
    id:           obj.id,
    display_name: obj.full_name   ?? '',
    avatar_url:   obj.avatar_url  ?? null,
    is_verified:  obj.role === 'artisan_verified',
    created_at:   obj.created_at  ?? '',
  };
}

// ─── Mappers DB → métier ──────────────────────────────────────────────────────
//
// JobOfferRow et JobOffer sont structurellement identiques (les champs optionnels
// de JobOffer correspondent aux nullable de JobOfferRow). Le cast structurel
// ci-dessous est sûr : TypeScript a déjà vérifié les types via le client typé.
// Ces fonctions servent de point de contrôle explicite et permettent d'ajouter
// une transformation si les deux types divergent à l'avenir.

export function toJobOffer(row: JobOfferRow): JobOffer {
  // JobOfferRow dérivé de Database est structurellement compatible avec JobOffer.
  // Le cast est délibéré et documenté : nullable DB ↔ optionnel métier.
  return row as unknown as JobOffer;
}

export function toJobDemand(row: JobDemandRow): JobDemand {
  return row as unknown as JobDemand;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  from: number;
  to: number;
}

/**
 * Calcule les paramètres de pagination Supabase (range from/to).
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
