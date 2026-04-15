/**
 * src/lib/admin/action-logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helper server-only : écrit une ligne dans admin_action_logs après chaque
 * mutation sensible réalisée par une API Route admin.
 *
 * Design :
 *   • Non-bloquant — l'échec du log ne fait JAMAIS échouer l'action principale.
 *   • Fire-and-forget avec await (on attend la fin mais on swallow l'erreur).
 *   • Utilise adminClient (service role) — même client que la mutation source.
 *
 * SQL de création (à exécuter dans Supabase > SQL Editor) :
 *
 *   create table if not exists public.admin_action_logs (
 *     id           uuid        primary key default gen_random_uuid(),
 *     actor_id     uuid        not null,
 *     actor_role   text        not null,
 *     action       text        not null,
 *     target_table text,
 *     target_id    text,
 *     reason       text,
 *     meta         jsonb       not null default '{}'::jsonb,
 *     created_at   timestamptz not null default now()
 *   );
 *
 *   -- Index pour les filtres les plus fréquents
 *   create index if not exists admin_action_logs_actor_id_idx  on public.admin_action_logs (actor_id);
 *   create index if not exists admin_action_logs_action_idx    on public.admin_action_logs (action);
 *   create index if not exists admin_action_logs_created_at_idx on public.admin_action_logs (created_at desc);
 *   create index if not exists admin_action_logs_target_idx    on public.admin_action_logs (target_table, target_id);
 *
 *   -- RLS : seuls les admins peuvent lire les logs
 *   alter table public.admin_action_logs enable row level security;
 *   create policy "admins_read_logs" on public.admin_action_logs
 *     for select using (
 *       exists (
 *         select 1 from public.profiles
 *         where id = auth.uid() and role in ('admin', 'moderator')
 *       )
 *     );
 *   -- Pas de policy INSERT/UPDATE/DELETE public : les logs ne sont écrits
 *   -- que via le service role (adminClient). Aucun utilisateur ne peut
 *   -- insérer ou modifier les logs depuis le navigateur.
 *
 * IMPORTANT : Ne pas importer ce fichier dans des Client Components.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminActor } from '@/lib/supabase/admin-guard';

// ─── Types publics ────────────────────────────────────────────────────────────

/**
 * Actions standardisées reconnues par l'écran /admin/logs.
 * Préfixe = domaine, suffixe = verbe (snake_case).
 */
export type AdminActionKind =
  // Modération
  | 'moderation_decision'
  | 'moderation_trust_update'
  // Utilisateurs
  | 'user_status_set'
  | 'user_role_set'
  | 'user_delete'
  | 'user_password_reset'
  // Artisans
  | 'artisan_approve'
  | 'artisan_reject'
  // Contenu
  | 'content_status_set'
  | 'content_delete'
  | 'content_close_set'
  | 'content_pin_set'
  | 'content_available_set'
  // Confiance / avis
  | 'review_moderate'
  | 'badge_award'
  // Signalements
  | 'report_status_set'
  | 'report_ban_user';

/**
 * Paramètres d'un événement de log.
 */
export interface LogActionParams {
  /** Client Supabase service role issu de guard.adminClient */
  adminClient: SupabaseClient;
  /** Acteur admin identifié par le guard */
  actor: AdminActor;
  /** Action effectuée (voir AdminActionKind) */
  action: AdminActionKind;
  /** Table cible de la mutation (optionnel) */
  targetTable?: string;
  /** ID de la ressource modifiée (optionnel) */
  targetId?: string;
  /** Raison fournie par l'admin (motif de refus, suspension, etc.) */
  reason?: string;
  /** Métadonnées complémentaires libres (avant/après, statuts, etc.) */
  meta?: Record<string, unknown>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Écrit un log d'action admin dans `admin_action_logs`.
 *
 * ⚠️  Non-bloquant : l'erreur est avalée (swallowed) — l'action principale
 *     n'est jamais annulée à cause d'un échec de logging.
 *     Ceci est intentionnel : la traçabilité ne doit pas dégrader la fiabilité.
 *
 * Usage :
 *   await logAdminAction({
 *     adminClient,
 *     actor,
 *     action: 'user_status_set',
 *     targetTable: 'profiles',
 *     targetId: userId,
 *     reason: 'Compte suspendu suite à signalement',
 *     meta: { old_status: 'active', new_status: 'suspended' },
 *   });
 */
export async function logAdminAction({
  adminClient,
  actor,
  action,
  targetTable,
  targetId,
  reason,
  meta = {},
}: LogActionParams): Promise<void> {
  try {
    await adminClient.from('admin_action_logs').insert({
      actor_id:     actor.id,
      actor_role:   actor.role,
      action,
      target_table: targetTable ?? null,
      target_id:    targetId   ?? null,
      reason:       reason     ?? null,
      meta,
    });
  } catch {
    // Intentionnellement swallowed — le log est best-effort.
    // L'action principale a déjà été exécutée avec succès.
  }
}
