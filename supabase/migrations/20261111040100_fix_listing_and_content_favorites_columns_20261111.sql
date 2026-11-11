-- Déjà appliqué sur Supabase le 11 novembre 2026.
-- L'ancien favori utilisateur utilise target_user_id.
-- Le favori de contenu (annonce) utilise target_type + target_id.
-- L'ancien champ NOT NULL bloquait tous les favoris de contenus.
ALTER TABLE public.user_favorites ALTER COLUMN target_user_id DROP NOT NULL;
ALTER TABLE public.user_favorites ADD CONSTRAINT user_favorites_target_present
CHECK (target_user_id IS NOT NULL OR (target_type IS NOT NULL AND target_id IS NOT NULL));
CREATE UNIQUE INDEX user_favorites_content_unique
ON public.user_favorites(user_id,target_type,target_id)
WHERE target_id IS NOT NULL;
-- Vérifié en transaction rollback comme utilisateur authenticated :
-- insertion, lecture, refus doublon et suppression fonctionnent.
