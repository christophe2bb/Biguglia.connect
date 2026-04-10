# 🚨 GUIDE DE CORRECTION DES VULNÉRABILITÉS SUPABASE RLS

## Problème identifié

Supabase a détecté que **Row-Level Security (RLS) n'est pas activée** sur plusieurs tables publiques :
- ❌ `trade_categories` (catégories métiers/artisans)
- ❌ `forum_categories` (catégories forum)
- ❌ Et potentiellement d'autres tables...

**Impact** : N'importe qui avec l'URL de votre projet Supabase peut lire, modifier et supprimer toutes les données de ces tables.

---

## Solution : Exécuter la migration SQL

### Étape 1 : Aller sur Supabase Dashboard

1. Se connecter sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner le projet **christophe2bb's Project** (qmrkacrpncdkhofiqlrg)
3. Aller dans le menu latéral → **SQL Editor**

### Étape 2 : Exécuter la migration critique

1. Cliquer sur **New query**
2. Copier-coller le contenu du fichier **`migration_rls_critical_fix.sql`** (ci-dessous)
3. Cliquer sur **Run** (ou Ctrl/Cmd + Enter)

---

## Code SQL à exécuter

```sql
-- ============================================================
-- MIGRATION CRITIQUE: Enable RLS on ALL category tables
-- Date: 2026-04-08
-- Description: Fix Supabase security vulnerabilities
-- ============================================================

-- Enable RLS on category tables
ALTER TABLE IF EXISTS public.trade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collection_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Catégories métiers publiques" ON public.trade_categories;
DROP POLICY IF EXISTS "Admin gère catégories métiers" ON public.trade_categories;
DROP POLICY IF EXISTS "Catégories forum publiques" ON public.forum_categories;
DROP POLICY IF EXISTS "Admin gère catégories forum" ON public.forum_categories;
DROP POLICY IF EXISTS "Catégories annonces publiques" ON public.listing_categories;
DROP POLICY IF EXISTS "Admin gère catégories annonces" ON public.listing_categories;
DROP POLICY IF EXISTS "Catégories équipement publiques" ON public.equipment_categories;
DROP POLICY IF EXISTS "Admin gère catégories équipement" ON public.equipment_categories;
DROP POLICY IF EXISTS "Catégories collection publiques" ON public.collection_categories;
DROP POLICY IF EXISTS "Admin gère catégories collection" ON public.collection_categories;

-- Create SELECT policies (public read)
CREATE POLICY "Catégories métiers publiques" ON public.trade_categories
  FOR SELECT USING (true);

CREATE POLICY "Catégories forum publiques" ON public.forum_categories
  FOR SELECT USING (true);

CREATE POLICY "Catégories annonces publiques" ON public.listing_categories
  FOR SELECT USING (true);

CREATE POLICY "Catégories équipement publiques" ON public.equipment_categories
  FOR SELECT USING (true);

CREATE POLICY "Catégories collection publiques" ON public.collection_categories
  FOR SELECT USING (true);

-- Create admin policies (admin can do ALL operations)
CREATE POLICY "Admin gère catégories métiers" ON public.trade_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin gère catégories forum" ON public.forum_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin gère catégories annonces" ON public.listing_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin gère catégories équipement" ON public.equipment_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin gère catégories collection" ON public.collection_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Verification
DO $$
DECLARE
  tables_checked INTEGER := 0;
  tables_ok INTEGER := 0;
  table_rec RECORD;
BEGIN
  FOR table_rec IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'trade_categories', 'forum_categories', 'listing_categories',
      'equipment_categories', 'collection_categories'
    )
  LOOP
    tables_checked := tables_checked + 1;
    IF (SELECT relrowsecurity FROM pg_class WHERE relname = table_rec.tablename AND relnamespace = 'public'::regnamespace) THEN
      tables_ok := tables_ok + 1;
      RAISE NOTICE 'RLS OK: %', table_rec.tablename;
    ELSE
      RAISE WARNING 'RLS NOT ENABLED: %', table_rec.tablename;
    END IF;
  END LOOP;
  
  IF tables_ok < tables_checked THEN
    RAISE EXCEPTION 'RLS not enabled on all category tables! (% / % OK)', tables_ok, tables_checked;
  ELSE
    RAISE NOTICE 'SUCCESS: RLS enabled on all % category tables', tables_ok;
  END IF;
END $$;
```

---

## Résultat attendu

Vous devriez voir dans les logs SQL Editor :

```
NOTICE: RLS OK: trade_categories
NOTICE: RLS OK: forum_categories
NOTICE: RLS OK: listing_categories
NOTICE: RLS OK: equipment_categories
NOTICE: RLS OK: collection_categories
NOTICE: SUCCESS: RLS enabled on all 5 category tables
```

---

## Vérification post-migration

1. Aller dans **Database** → **Tables** (menu latéral)
2. Sélectionner `trade_categories`
3. Onglet **Policies** → vérifier que **RLS is enabled** ✅
4. Vérifier qu'il y a 2 policies :
   - `Catégories métiers publiques` (SELECT)
   - `Admin gère catégories métiers` (ALL)

Répéter pour `forum_categories`, `listing_categories`, etc.

---

## Impact sur l'application

✅ **Aucun impact négatif** — les policies créées permettent :
- Lecture publique (`SELECT`) → tous les utilisateurs peuvent voir les catégories
- Modification admin (`ALL`) → seuls les admins (role='admin') peuvent modifier/supprimer

L'application continue de fonctionner normalement.

---

## Si l'erreur Supabase persiste

Attendre **24h** après l'exécution de la migration — Supabase scanne les vulnérabilités périodiquement. Si l'alerte persiste, contacter le support Supabase avec :
- Nom du projet : `christophe2bb's Project`
- ID projet : `qmrkacrpncdkhofiqlrg`
- Message : "RLS enabled on all category tables via SQL Editor, but Supabase Advisors still showing warnings."
