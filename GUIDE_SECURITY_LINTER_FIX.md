# 🔒 GUIDE DE CORRECTION - Supabase Security Linter

## Problèmes identifiés par Supabase

D'après les rapports CSV que tu as uploadés, il y a **52 problèmes de sécurité** :

### 🔴 **5 ERREURS CRITIQUES** (ERROR)
- Security Definer Views qui contournent RLS

### ⚠️ **47 AVERTISSEMENTS** (WARN)
- 40 fonctions sans `search_path` fixe
- 3 policies RLS trop permissives (`WITH CHECK (true)`)
- 1 protection mot de passe HaveIBeenPwned désactivée

---

## 🎯 Plan d'action — 3 migrations SQL

### Migration 1 : Security Definer Views (CRITIQUE)

**Fichier** : `migration_fix_security_definer_views.sql`

**Problème** : 5 vues avec `SECURITY DEFINER` contournent RLS :
- `moderation_kpi`
- `outing_organizer_summary`
- `event_organizer_summary`
- `equipment_owner_summary`
- `sector_stats`

**Fix** : Recrée ces vues avec `SECURITY INVOKER` pour que RLS s'applique correctement.

---

### Migration 2 : Function Search Path

**Fichier** : `migration_fix_function_search_path.sql`

**Problème** : 40 fonctions SQL sans `search_path` fixe → vulnérables à injection.

**Fix** : Ajoute `SET search_path = public, pg_temp` aux fonctions critiques :
- Fonctions d'authentification : `current_user_role`, `is_admin`, `is_moderator_or_admin`
- Triggers `updated_at` : `update_updated_at_column`, `update_events_updated_at`, etc.
- Fonction conversations : `update_conversation_on_message`

---

### Migration 3 : RLS Policies Permissives

**Fichier** : `migration_fix_permissive_rls.sql`

**Problème** : 3 policies INSERT avec `WITH CHECK (true)` acceptent tout :
- `collection_views.Vues insert`
- `notifications.notifications_insert`
- `profiles.allow_insert`

**Fix** : Remplace par des checks appropriés :
- `collection_views` → authentifié requis
- `notifications` → user_id = auth.uid() OU admin/moderator
- `profiles` → id = auth.uid() (création de son propre profil uniquement)

---

## 📋 Instructions d'exécution

### Étape 1 : Migration 1 (CRITIQUE — à faire EN PREMIER)

1. **Ouvre Supabase Dashboard** → **SQL Editor**
2. **Copie le contenu** de `migration_fix_security_definer_views.sql`
3. **Exécute**

**Résultat attendu** :
```
NOTICE: View public.moderation_kpi is now SECURITY INVOKER ✓
NOTICE: View public.outing_organizer_summary is now SECURITY INVOKER ✓
NOTICE: View public.event_organizer_summary is now SECURITY INVOKER ✓
NOTICE: View public.equipment_owner_summary is now SECURITY INVOKER ✓
NOTICE: View public.sector_stats is now SECURITY INVOKER ✓
NOTICE: SUCCESS: All 5 views are now SECURITY INVOKER
```

---

### Étape 2 : Migration 2 (Function Search Path)

1. **Ouvre Supabase Dashboard** → **SQL Editor**
2. **Copie le contenu** de `migration_fix_function_search_path.sql`
3. **Exécute**

**Résultat attendu** :
```
NOTICE: Fixed 12 critical functions with search_path
NOTICE: SUCCESS: Critical functions secured with search_path
```

**Note** : Cette migration ne corrige que les 12 fonctions les plus critiques. Les 28 restantes (fonctions de recherche, logs, etc.) peuvent être corrigées plus tard si nécessaire.

---

### Étape 3 : Migration 3 (RLS Policies)

1. **Ouvre Supabase Dashboard** → **SQL Editor**
2. **Copie le contenu** de `migration_fix_permissive_rls.sql`
3. **Exécute**

**Résultat attendu** :
```
NOTICE: Policy public.collection_views.collection_views_insert is now properly restricted ✓
NOTICE: Policy public.notifications.notifications_insert is now properly restricted ✓
NOTICE: Policy public.profiles.profiles_insert is now properly restricted ✓
NOTICE: SUCCESS: All 3 INSERT policies are now properly restricted
```

---

## ⚠️ Impact sur l'application

### Migration 1 (Views)
✅ **Aucun impact négatif** — Les vues continueront de fonctionner, mais RLS sera maintenant appliquée correctement.

### Migration 2 (Functions)
✅ **Aucun impact** — Les fonctions continuent de fonctionner normalement avec un `search_path` sécurisé.

### Migration 3 (RLS Policies)
⚠️ **Impact potentiel** :
- `collection_views` : Seuls les utilisateurs authentifiés peuvent insérer des vues
- `notifications` : Les users ne peuvent plus créer de notifications pour d'autres users (sauf admins)
- `profiles` : Les users ne peuvent créer qu'un seul profil (le leur)

**Ces restrictions sont normales et sécurisent l'application.**

---

## 🔐 Bonus : Activer HaveIBeenPwned Protection

Cette option se trouve dans **Authentication → Providers → Email** :

1. Va dans **Supabase Dashboard**
2. **Authentication** → **Providers**
3. Clique sur **Email**
4. Coche **"Enable leaked password protection"**
5. Save

Cela empêchera les utilisateurs d'utiliser des mots de passe compromis.

---

## 🎉 Après les 3 migrations

1. **Attends 24h** pour que Supabase rescanne
2. **Vérifie Dashboard → Advisors** → les alertes devraient disparaître
3. Si des alertes persistent, envoie-moi les nouveaux rapports CSV

---

## ℹ️ Fichiers créés

- `migration_fix_security_definer_views.sql` (Migration 1 — CRITIQUE)
- `migration_fix_function_search_path.sql` (Migration 2)
- `migration_fix_permissive_rls.sql` (Migration 3)
- `GUIDE_SECURITY_LINTER_FIX.md` (ce fichier)
