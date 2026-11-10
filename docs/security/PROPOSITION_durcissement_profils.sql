-- Biguglia Connect | PROPOSITION DE DURCISSEMENT DES PROFILS
-- AUDIT / PRÉPRODUCTION UNIQUEMENT. NE PAS APPLIQUER EN PRODUCTION SANS
-- SAUVEGARDE RESTAURABLE ET TESTS DE TOUS LES PARCOURS.
--
-- Constat : les rôles PostgreSQL anon et authenticated disposent actuellement
-- d'UPDATE sur role, status, is_active et INSERT sur profiles. Une policy
-- RLS "auth.uid() = id" ne protège PAS les colonnes privilégiées.
--
-- La création de profils doit désormais passer EXCLUSIVEMENT par le trigger
-- handle_new_user() et la route serveur /api/auth/ensure-profile (service_role).
-- Les mises à jour administratives passent par des routes serveur vérifiées.
--
-- Contrôles obligatoires avant application :
-- 1. Profil de nouvel utilisateur créé et récupérable après confirmation mail.
-- 2. Profil personnel : nom, avatar, téléphone, secteur modifiables.
-- 3. Utilisateur standard : INSERT direct profiles -> refusé.
-- 4. Utilisateur standard : UPDATE role/status/is_active/trust_level -> refusé.
-- 5. Admin API : changer rôle/statut avec service_role -> autorisé.
-- 6. Essayer avec deux JWT authentiques sur une base isolée.
--
BEGIN;

REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT UPDATE (full_name, avatar_url, phone, home_sector_id)
  ON TABLE public.profiles TO authenticated;

-- La lecture existante est conservée. Les politiques RLS doivent rester
-- activées et les policies de modification doivent inclure auth.uid() = id.
-- NE PAS accorder UPDATE sur id,email,role,status,is_active,trust_level,
-- moderation_note, created_at, legal_consent* et les compteurs serveur.

COMMIT;

-- POSTCONDITIONS (exécuter après migration, lecture seule) :
-- SELECT
--   has_column_privilege('authenticated','public.profiles','full_name','UPDATE') AS editable_name,
--   has_column_privilege('authenticated','public.profiles','role','UPDATE') AS forbidden_role,
--   has_column_privilege('authenticated','public.profiles','status','UPDATE') AS forbidden_status,
--   has_column_privilege('authenticated','public.profiles','is_active','UPDATE') AS forbidden_active,
--   has_table_privilege('authenticated','public.profiles','INSERT') AS forbidden_insert;
-- Attendu : true, false, false, false, false.
--
-- IMPORTANT : ce script ne ferme pas encore les permissions de la table
-- listings (dont moderation_status) ni les permissions Storage des photos.
-- Ces parties font l'objet de scripts et de tests séparés avant production.
