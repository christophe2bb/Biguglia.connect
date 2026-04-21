/**
 * services/jobs/queries/ownership.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vérification d'appartenance d'une offre ou d'une demande.
 *
 * Fonctions exportées :
 *  - checkJobOwnership(table, slug)   true si l'utilisateur connecté est auteur
 *
 * Stratégie en 3 niveaux (du plus sûr au plus permissif) :
 *
 *  1. Client admin (service role, bypass RLS)
 *     → Lit user_id directement, compare à l'uid courant
 *     → Disponible seulement si SUPABASE_SERVICE_ROLE_KEY est défini
 *
 *  2. Client utilisateur + count WHERE user_id = auth.uid()
 *     → Fonctionne si la politique RLS "own_crud" autorise SELECT sur ses lignes
 *     → count > 0 ↔ l'utilisateur est propriétaire
 *
 *  3. Client utilisateur + SELECT user_id (sans filtre user_id)
 *     → Dernier recours si la RLS retourne la ligne
 *     → Compare user_id à l'uid courant
 *
 * Aucun `any` : les données DB sont lues via `Record<string, unknown>`.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { asDbError, type DbError } from './shared';

// ─── Tables autorisées ────────────────────────────────────────────────────────

export type JobTable = 'job_offers' | 'job_demands';

// ─── Type minimal pour les rows lues ──────────────────────────────────────────

interface RowWithUserId {
  user_id: string;
}

function isRowWithUserId(v: unknown): v is RowWithUserId {
  return (
    typeof v === 'object' &&
    v !== null &&
    'user_id' in v &&
    typeof (v as Record<string, unknown>)['user_id'] === 'string'
  );
}

// ─── checkJobOwnership ────────────────────────────────────────────────────────

/**
 * Retourne true si l'utilisateur actuellement connecté est le créateur
 * de la ligne identifiée par `slug` dans `table`.
 *
 * Retourne false si :
 *  - Pas d'utilisateur connecté
 *  - Slug introuvable
 *  - Toutes les passes échouent
 */
export async function checkJobOwnership(
  table: JobTable,
  slug: string,
): Promise<boolean> {
  try {
    // ── 0. Récupérer l'utilisateur connecté ────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const userId = user.id;

    // ── 1. Client admin (bypass RLS total) ────────────────────────────────
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from(table)
        .select('user_id')
        .eq('slug', slug)
        .single();

      if (!error && isRowWithUserId(data)) {
        return data.user_id === userId;
      }
      // Si erreur admin (key absente, timeout…) → continuer vers passe 2
    } catch {
      // createAdminClient() peut lancer si SUPABASE_SERVICE_ROLE_KEY est absent
    }

    // ── 2. Count via RLS own_crud ──────────────────────────────────────────
    // SELECT count(*) WHERE slug=? AND user_id=auth.uid()
    // Retourne count > 0 si la politique autorise la lecture des propres lignes.
    const { count, error: countErr } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
      .eq('user_id', userId);

    if (!countErr && count !== null && count > 0) {
      return true;
    }

    // ── 3. Lecture directe de user_id (dernier recours) ───────────────────
    const { data: row, error: rowErr } = await supabase
      .from(table)
      .select('user_id')
      .eq('slug', slug)
      .single();

    if (!rowErr && isRowWithUserId(row)) {
      return row.user_id === userId;
    }

    return false;
  } catch (err) {
    // Erreur réseau ou inattendue — ne pas exposer
    const dbErr: DbError = asDbError(err);
    console.error('[jobs/ownership] checkJobOwnership unexpected error:', dbErr.message);
    return false;
  }
}
