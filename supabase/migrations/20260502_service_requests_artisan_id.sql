-- ============================================================
-- Migration : ajouter artisan_id sur service_requests (si absent)
-- ============================================================
-- La colonne artisan_id permet de distinguer :
--   • artisan_id IS NULL  → demande publique (visible dans /demandes)
--   • artisan_id IS NOT NULL → devis privé envoyé à un artisan spécifique
--
-- Cette colonne existait dans database.sql depuis la création du projet
-- mais n'avait jamais fait l'objet d'une migration explicite → elle peut
-- être absente sur certains environnements (prod créés avant ce fichier).
--
-- Idempotent : IF NOT EXISTS + DO $$...END garantissent que la migration
-- peut être rejouée sans erreur si la colonne existe déjà.
-- ============================================================

DO $$
BEGIN
  -- Ajouter la colonne artisan_id si elle n'existe pas encore
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'service_requests'
      AND  column_name  = 'artisan_id'
  ) THEN
    ALTER TABLE public.service_requests
      ADD COLUMN artisan_id UUID REFERENCES public.artisan_profiles(id) ON DELETE SET NULL;

    COMMENT ON COLUMN public.service_requests.artisan_id IS
      'NULL = demande publique visible dans /demandes. '
      'NOT NULL = devis privé adressé à cet artisan (exclu de la liste publique).';

    RAISE NOTICE 'service_requests.artisan_id ajouté avec succès.';
  ELSE
    RAISE NOTICE 'service_requests.artisan_id existe déjà — rien à faire.';
  END IF;
END $$;

-- Index pour le filtre IS NULL / IS NOT NULL (très fréquent dans /demandes)
CREATE INDEX IF NOT EXISTS idx_service_requests_artisan_id
  ON public.service_requests (artisan_id);

-- Mettre à jour les policies RLS pour que l'artisan ciblé puisse voir sa demande
-- (sans cela, l'artisan ne voit pas le devis qui lui est adressé)
DROP POLICY IF EXISTS "service_requests_select_parties_v2" ON public.service_requests;

CREATE POLICY "service_requests_select_parties_v2"
  ON public.service_requests
  FOR SELECT
  USING (
    -- Le résident auteur peut toujours voir sa demande
    auth.uid() = resident_id
    -- L'artisan ciblé peut voir le devis privé qui lui est adressé
    OR EXISTS (
      SELECT 1 FROM public.artisan_profiles ap
      WHERE ap.id = artisan_id
        AND ap.user_id = auth.uid()
    )
    -- Les admins voient tout
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'moderator')
    )
  );
