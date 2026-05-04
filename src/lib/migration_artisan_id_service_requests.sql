-- ============================================================
-- Migration : ajout de la colonne artisan_id sur service_requests
-- Permet de lier une demande directement à un artisan (devis privé)
-- et de filtrer les demandes publiques (.is('artisan_id', null))
-- ============================================================
-- Idempotent : IF NOT EXISTS + CONCURRENTLY safe en prod

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS artisan_id UUID REFERENCES artisan_profiles(id) ON DELETE SET NULL;

-- Index pour les requêtes de filtrage (.is('artisan_id', null)) et jointures
CREATE INDEX IF NOT EXISTS idx_service_requests_artisan_id
  ON public.service_requests (artisan_id)
  WHERE artisan_id IS NOT NULL;

-- Commentaire d'audit
COMMENT ON COLUMN public.service_requests.artisan_id IS
  'Artisan ciblé par cette demande (devis privé). NULL = demande publique visible dans /demandes.';
