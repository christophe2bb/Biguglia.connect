-- Déjà appliqué le 10/11/2026 à Supabase de production (migration
-- 20261110174317). Reflète les catégories utilisées par ReportButton.
-- Avant la correction, l'enum ne contenait que user/post/listing/message/
-- equipment : les signalements de contenus ci-dessous échouaient en SQL.
--
-- Extension NON destructive. Aucune donnée, aucun signalement supprimé.

ALTER TYPE public.report_target ADD VALUE IF NOT EXISTS 'event';
ALTER TYPE public.report_target ADD VALUE IF NOT EXISTS 'promenade';
ALTER TYPE public.report_target ADD VALUE IF NOT EXISTS 'outing';
ALTER TYPE public.report_target ADD VALUE IF NOT EXISTS 'association';
ALTER TYPE public.report_target ADD VALUE IF NOT EXISTS 'lost_found';
ALTER TYPE public.report_target ADD VALUE IF NOT EXISTS 'collection_item';
ALTER TYPE public.report_target ADD VALUE IF NOT EXISTS 'help_request';

-- Vérifié via INSERT de sept signalements en transaction ROLLBACK.
-- Le nombre de signalements réels est resté inchangé.
