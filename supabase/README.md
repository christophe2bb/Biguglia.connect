# Supabase — Migrations & Sécurité RLS

## Organisation

Toutes les migrations versionnées sont dans `supabase/migrations/` au format `YYYYMMDD_description.sql`.
Leur présence dans le dépôt ne prouve pas qu'elles ont été appliquées à un environnement. Ne pas supposer qu'un fichier est répétable sans risque : vérifier son SQL, ses dépendances et l'état de la base cible avant exécution.

## Politique RLS (Row Level Security)

Les migrations versionnent des changements RLS, mais ce dépôt ne prouve pas l'état effectif des policies sur Supabase. L'inventaire du dépôt est dans [`docs/db/SCHEMA.md`](../docs/db/SCHEMA.md); vérifier la couverture réelle sur chaque environnement avec une requête ou un audit connecté à la base.

### Principes visés par les migrations

| Principe | Intention |
|---|---|
| Least privilege | Chaque rôle n'a accès qu'aux données dont il a besoin |
| Isolation utilisateur | `auth.uid()` vérifié dans chaque policy SELECT/INSERT/UPDATE/DELETE |
| Isolation admin | Rôle `admin` vérifié via `profiles.role` dans les policies admin |
| Pas de policy ouverte | Toutes les tables ont des policies explicites — pas de `USING (true)` |
| Index sur `auth.uid()` FK | Chaque FK vers `profiles(id)` est indexée (performances + plan de requête) |

### Tables et policies clés

| Table | RLS | Policies principales |
|---|---|---|
| `profiles` | ✅ | Voir son profil, modifier son profil, admin peut tout voir |
| `listings` | ✅ | Voir les annonces actives (public), créer/modifier/supprimer les siennes, admin |
| `service_requests` | ✅ | Voir ses demandes, créer (résident), répondre (artisan), supprimer/mettre à jour, admin |
| `request_comments` | ✅ | Auteur, résident de la demande, ou admin peuvent supprimer |
| `messages` | ✅ | Voir uniquement les conversations où on est participant |
| `artisan_profiles` | ✅ | Voir les profils vérifiés (public), modifier le sien |
| `moderation_queue` | ✅ | Admin uniquement |
| `job_offers` / `job_demands` | ✅ | Voir les publiées (public), modifier les siennes |
| `associations` | ✅ | Voir les actives (public), modifier les siennes |
| `help_requests` | ✅ | Voir les ouvertes (public), modifier les siennes |
| `lost_found` | ✅ | Voir les actives (public), modifier les siennes |

## Exécution des migrations

Voir `docs/DEPLOY.md` pour les précautions de vérification avant toute exécution dans Supabase SQL Editor.

**Ordre suggéré pour l'examen** : les fichiers sont préfixés par date (`YYYYMMDD`). L'ordre alphabétique aide à les lire, mais ne remplace pas la vérification de leurs dépendances et de l'historique réel de la base. Voir [`docs/DEPLOY.md`](../docs/DEPLOY.md) avant toute exécution.

## Ajouter une migration

1. Créer un fichier `supabase/migrations/YYYYMMDD_description.sql`
2. Utiliser `IF NOT EXISTS` / `IF EXISTS` pour l'idempotence
3. Documenter le contexte en commentaire en tête de fichier
4. Mettre à jour l'inventaire `docs/db/SCHEMA.md` et les consignes de `docs/DEPLOY.md`
5. Tester en staging avant production

## Vérification de la couverture RLS

Pour vérifier qu'aucune table n'a oublié son RLS, exécuter dans Supabase SQL Editor :

```sql
-- Tables sans RLS activé (doit retourner 0 lignes en production)
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relrowsecurity = true
  )
ORDER BY tablename;
```

## Backup et restauration

Les backups automatiques sont gérés par Supabase (tier Pro : PITR sur 7 jours).
Pour un export manuel du schéma :

```bash
# Depuis la machine avec supabase CLI configuré
supabase db dump --schema public > supabase/schema_backup_$(date +%Y%m%d).sql
```
