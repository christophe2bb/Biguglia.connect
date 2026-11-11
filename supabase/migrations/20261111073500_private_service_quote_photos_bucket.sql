-- Devis privés : bucket séparé des annonces publiques.
-- Les opérations Storage passent exclusivement par les routes serveur
-- authentifiées (service_role), après vérification des participants.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('service-quote-photos','service-quote-photos',false,5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[])
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
