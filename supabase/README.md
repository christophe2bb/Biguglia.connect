# Supabase — Migrations & Sécurité RLS

## Organisation

Toutes les migrations sont dans `supabase/migrations/` au format `YYYYMMDD_description.sql`.
Elles sont **idempotentes** (utilisent `IF NOT EXISTS` / `IF EXISTS`) et peuvent être
relancées sans risque.

## Politique RLS (Row Level Security)

**RLS activé sur toutes les tables** contenant des données utilisateur.
118 policies versionnées dans 25 fichiers de migration.

### Principes appliqués

| Principe | Implémentation |
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
| `listings` | ✅ | Voir les annonces actives (public), créer/modifier les siennes |
| `service_requests` | ✅ | Voir ses demandes, créer (résident), répondre (artisan), admin |
| `messages` | ✅ | Voir uniquement les conversations où on est participant |
| `artisan_profiles` | ✅ | Voir les profils vérifiés (public), modifier le sien |
| `moderation_queue` | ✅ | Admin uniquement |
| `job_offers` / `job_demands` | ✅ | Voir les publiées (public), modifier les siennes |
| `associations` | ✅ | Voir les actives (public), modifier les siennes |
| `help_requests` | ✅ | Voir les ouvertes (public), modifier les siennes |
| `lost_found` | ✅ | Voir les actives (public), modifier les siennes |

## Exécution des migrations

Voir `docs/DEPLOY.md` pour la procédure complète d'exécution dans Supabase SQL Editor.

**Ordre obligatoire** : les fichiers sont préfixés par date (`YYYYMMDD`) — trier par nom = ordre correct.

## Ajouter une migration

1. Créer un fichier `supabase/migrations/YYYYMMDD_description.sql`
2. Utiliser `IF NOT EXISTS` / `IF EXISTS` pour l'idempotence
3. Documenter le contexte en commentaire en tête de fichier
4. Ajouter l'entrée dans `docs/DEPLOY.md` (tableau des migrations)
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
