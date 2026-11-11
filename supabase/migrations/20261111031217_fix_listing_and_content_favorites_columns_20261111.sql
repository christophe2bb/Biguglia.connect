-- Déjà appliqué sur Supabase le 11 novembre 2026 :
-- version officielle 20261111031217.
-- Favoris utilisateurs : target_user_id ; favoris contenus : target_type+target_id.
ALTER TABLE public.user_favorites ALTER COLUMN target_user_id DROP NOT NULL;
DO $fix$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid='public.user_favorites'::regclass
                   AND conname='user_favorites_target_present') THEN
    ALTER TABLE public.user_favorites
    ADD CONSTRAINT user_favorites_target_present
    CHECK (target_user_id IS NOT NULL OR (target_type IS NOT NULL AND target_id IS NOT NULL));
  END IF;
END;
$fix$;
CREATE UNIQUE INDEX IF NOT EXISTS user_favorites_content_unique
ON public.user_favorites(user_id,target_type,target_id)
WHERE target_id IS NOT NULL;
-- Test authentifié en transaction annulée : ajout, lecture, anti-doublon, retrait.
