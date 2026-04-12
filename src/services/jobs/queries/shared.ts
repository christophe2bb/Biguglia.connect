/**
 * services/jobs/queries/shared.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitaires partagés entre les modules offers, demands et ownership.
 *
 * Exports :
 *  - DbError              Type Supabase minimal (message + code optionnels)
 *  - isMissingTableError  Détecte "table inexistante" (migration en attente)
 *  - toAuthorProfile      Mappe une row profiles → JobUserProfile | undefined
 *  - buildPagination      Calcule from/to/page/limit depuis les filtres
 */

import type { JobUserProfile } from '@/types/jobs';

// ─── Type d'erreur Supabase ───────────────────────────────────────────────────

/** Sous-ensemble des champs retournés par les erreurs Supabase PostgREST */
export interface DbError {
  message?: string;
  code?: string;
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

// ─── Mapper author profile ────────────────────────────────────────────────────

/**
 * Mappe la valeur de la jointure `profiles!user_id` vers `JobUserProfile`.
 *
 * La jointure peut être :
 *  - Un objet `{ id, display_name, avatar_url, is_verified, created_at }`
 *  - Un tableau (jointure multi-rows) → on prend le premier élément
 *  - null / undefined → retourne undefined
 *
 * Aucun `any` : on reçoit `unknown` et on valide les champs clés.
 */
export function toAuthorProfile(raw: unknown): JobUserProfile | undefined {
  // Jointure multi-rows → prendre le premier
  const obj: unknown = Array.isArray(raw) ? raw[0] : raw;

  if (!obj || typeof obj !== 'object') return undefined;

  const r = obj as Record<string, unknown>;

  // id est obligatoire
  if (typeof r['id'] !== 'string') return undefined;

  return {
    id: r['id'],
    display_name: typeof r['display_name'] === 'string' ? r['display_name'] : '',
    avatar_url: typeof r['avatar_url'] === 'string' ? r['avatar_url'] : null,
    is_verified: r['is_verified'] === true,
    created_at: typeof r['created_at'] === 'string' ? r['created_at'] : '',
  };
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
