-- Biguglia Connect | PROPOSITION DE RESTRICTION STORAGE
-- PRÉPRODUCTION UNIQUEMENT : NE PAS EXÉCUTER SUR LA BASE ACTIVE
-- avant validation des parcours uploads/suppressions (deux comptes de test).
-- État constaté le 10/11/2026 :
--   photos : public, 71 objets ; documents : privé, aucun objet ;
--   job-documents : public, aucun objet.
--
-- IMPORTANT : cette migration ne rend PAS privées les anciennes URL
-- publiques de photos. Ne pas modifier le bucket photos sans stratégie
-- complète de compatibilité / URLs signées.
--
-- PRECONDITIONS :
-- 1. Tous les uploads de fichiers passent par POST /api/upload et son
--    contrôle d'appartenance ; les suppressions par DELETE /api/storage/photos.
-- 2. Le bouton de diagnostic migration/admin n'emploie pas directement
--    storage.from('photos').remove() avec une session navigateur.
-- 3. Une sauvegarde restaurable, une base isolée et tests A/B sont disponibles.
-- 4. Aucune intégration tierce légitime n'exige les policies retirées.
--
-- Pour rendre le bucket legacy job-documents privé : faire le changement
-- dans les paramètres du bucket Supabase *après* avoir vérifié que le bucket
-- est toujours vide et qu'aucun client ne l'utilise. Cette étape n'est
-- volontairement pas automatisée par ce script SQL.

BEGIN;

-- Empêcher une session utilisateur de supprimer / écraser n'importe quelle
-- photo du bucket public ; conserver photos_owner_delete pour compatibilité
-- avec les vrais propriétaires et service_role pour les routes contrôlées.
DROP POLICY IF EXISTS photos_delete ON storage.objects;
DROP POLICY IF EXISTS photos_auth_update ON storage.objects;
DROP POLICY IF EXISTS photos_update ON storage.objects;

-- Les créations directes dans des chemins arbitraires doivent cesser :
-- un endpoint serveur vérifie l'entité concernée et le type de fichier.
DROP POLICY IF EXISTS photos_auth_insert ON storage.objects;
DROP POLICY IF EXISTS photos_insert ON storage.objects;
DROP POLICY IF EXISTS artisan_photos_upload ON storage.objects;

-- Ancien bucket de CV : empêcher les INSERT et lectures anonymes directes.
-- Les nouveaux documents se trouvent dans le bucket privé "documents".
DROP POLICY IF EXISTS job_docs_auth_insert ON storage.objects;
DROP POLICY IF EXISTS job_docs_public_read ON storage.objects;

-- Dans le bucket privé "documents", conserver les politiques existantes
-- de propriétaire/artisan. Retirer l'autorisation globale d'insertion
-- à tout membre authentifié.
DROP POLICY IF EXISTS documents_insert_auth ON storage.objects;

COMMIT;

-- POSTCONDITIONS :
-- Vérifier qu'aucune policy INSERT/UPDATE/DELETE du bucket photos n'autorise
-- n'importe quel membre (auth.uid() sans vérification de chemin ne suffit pas).
-- Tester upload image JPEG/HEIC, photo ancienne owner null, suppression de ses
-- photos et refus de suppression d'une photo d'un autre utilisateur.
-- Vérifier GET/POST du CV : aucun accès public permanent et URLs temporaires.
-- Les photos publiques existantes restent téléchargeables par URL connue.
