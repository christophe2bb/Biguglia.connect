/**
 * admin/migration/_sql/admin-logs.ts
 *
 * Script SQL de création de la table admin_action_logs.
 * À exécuter dans Supabase > SQL Editor une seule fois.
 *
 * Cette table stocke la traçabilité de toutes les actions sensibles
 * réalisées par les administrateurs et modérateurs via les API Routes
 * sous /api/admin/**.
 *
 * Fonctionnement :
 *   • Écriture UNIQUEMENT via le service role (logAdminAction helper)
 *   • Lecture autorisée aux admins et modérateurs via RLS
 *   • Pas de policy INSERT/UPDATE/DELETE publique → les logs sont immutables
 *     depuis le navigateur
 */

export const ADMIN_LOGS_SQL = `-- ============================================================
-- 🔒 TRAÇABILITÉ ADMIN — table admin_action_logs
-- Exécutez ce script UNE SEULE FOIS dans Supabase > SQL Editor
-- ============================================================

-- ─── 1. Création de la table ────────────────────────────────
create table if not exists public.admin_action_logs (
  id           uuid        primary key default gen_random_uuid(),
  actor_id     uuid        not null,
  actor_role   text        not null,
  action       text        not null,
  target_table text,
  target_id    text,
  reason       text,
  meta         jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

comment on table public.admin_action_logs is
  'Journal immuable des actions sensibles réalisées par les admins/modérateurs.';

comment on column public.admin_action_logs.actor_id     is 'UUID du compte admin ayant réalisé l''action.';
comment on column public.admin_action_logs.actor_role   is 'Rôle de l''acteur au moment de l''action (admin | moderator).';
comment on column public.admin_action_logs.action       is 'Code de l''action (ex : user_suspend, moderation_decision, …).';
comment on column public.admin_action_logs.target_table is 'Table cible de la mutation (ex : profiles, listings, …).';
comment on column public.admin_action_logs.target_id    is 'Identifiant de la ressource modifiée.';
comment on column public.admin_action_logs.reason       is 'Raison fournie par l''admin (motif de refus, suspension, …).';
comment on column public.admin_action_logs.meta         is 'Métadonnées complémentaires libres (avant/après, statuts, …).';

-- ─── 2. Index pour les filtres les plus fréquents ──────────
create index if not exists admin_action_logs_actor_id_idx
  on public.admin_action_logs (actor_id);

create index if not exists admin_action_logs_action_idx
  on public.admin_action_logs (action);

create index if not exists admin_action_logs_created_at_idx
  on public.admin_action_logs (created_at desc);

create index if not exists admin_action_logs_target_idx
  on public.admin_action_logs (target_table, target_id);

-- ─── 3. Row Level Security ──────────────────────────────────
alter table public.admin_action_logs enable row level security;

-- Seuls les admins et modérateurs peuvent lire les logs
drop policy if exists "admins_read_logs" on public.admin_action_logs;
create policy "admins_read_logs"
  on public.admin_action_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'moderator')
    )
  );

-- ⚠️  Pas de policy INSERT / UPDATE / DELETE publique.
--     Les logs ne sont écrits QUE via le service role (logAdminAction).
--     Aucun utilisateur — même admin — ne peut insérer, modifier
--     ou supprimer des logs depuis le navigateur.
`;
