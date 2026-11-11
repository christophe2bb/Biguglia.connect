# Supabase — Migrations & Sécurité RLS

## Organisation

Toutes les migrations sont dans `supabase/migrations/` au format `YYYYMMDD_description.sql`.
Leur présence dans GitHub ne prouve pas leur application sur un projet donné.
**Ne pas les rejouer en bloc : plusieurs fichiers supposent des tables préexistantes
ou modifient/suppriment des politiques RLS.** Contrôler l'historique Supabase,
les dépendances et les effets de chaque migration avant exécution.

## Politique RLS (Row Level Security)

**RLS activé sur toutes les tables** contenant des données utilisateur.
Les politiques ont évolué : utiliser l'inventaire et les audits de la base cible
plutôt que des nombres historiques de fichiers ou de politiques.

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

Voir `docs/DEPLOY.md` pour la procédure complète d'exécution dans Supabase SQL Editor.

**Attention : l'ordre alphabétique n'est pas un bootstrap valide sur une base vierge.**
Les essais GitHub Actions du 11/11/2026 ont échoué sur des dépendances de tables
(`appointments`, `asso_comments`, `job_demands`) absentes au moment des migrations.
Voir l'[incident de reconstruction](https://github.com/christophe2bb/Biguglia.connect/issues/579).
Ne pas corriger l'historique des migrations déjà appliquées en production.

## Ajouter une migration

1. Créer un fichier `supabase/migrations/YYYYMMDD_description.sql`
2. Vérifier les dépendances, les effets et le comportement lors d'une relance (un `IF EXISTS` ne garantit pas la sécurité)
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

La politique de sauvegarde dépend du **plan Supabase** et de ses options activées.
Ne pas la déduire du plan Vercel ; vérifier la sauvegarde et la restauration sur le projet Supabase.
Pour un export manuel du schéma :

```bash
# Depuis la machine avec supabase CLI configuré
supabase db dump --schema public > supabase/schema_backup_$(date +%Y%m%d).sql
```
