-- ============================================================
-- MIGRATION: Fix Function Search Path (Security Warning)
-- Date: 2026-04-08
-- Description: Add SET search_path to all functions to prevent injection attacks
-- ============================================================

-- Without a fixed search_path, functions are vulnerable to search_path injection attacks.
-- An attacker could create malicious objects in a schema earlier in the search path.

-- This migration adds "SET search_path = public, pg_temp" to all affected functions.
-- We'll fix the most critical ones first (authentication, moderation, trust system).

-- =====================================================
-- Authentication & Authorization Functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
END;
$$;

-- =====================================================
-- Trigger Functions (updated_at columns)
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_equipment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_trust_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_forum_topics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_modqueue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_status_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- Conversation & Messaging Functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- =====================================================
-- Verification
-- =====================================================

DO $$
DECLARE
  total_funcs INTEGER;
  fixed_funcs INTEGER;
BEGIN
  -- Count functions without search_path in public schema
  SELECT COUNT(*) INTO total_funcs
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prosrc NOT LIKE '%search_path%'
  AND p.proname LIKE ANY(ARRAY[
    'current_user_role', 'is_admin', 'is_moderator_or_admin',
    'update_updated_at%', 'update_events_updated_at', 
    'update_equipment_updated_at', 'update_trust_updated_at',
    'update_forum_topics_updated_at', 'update_modqueue_updated_at',
    'update_status_changed_at', 'update_conversation_on_message'
  ]);
  
  -- Count functions WITH search_path
  SELECT COUNT(*) INTO fixed_funcs
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND (p.proconfig IS NOT NULL AND p.proconfig::text LIKE '%search_path%')
  AND p.proname LIKE ANY(ARRAY[
    'current_user_role', 'is_admin', 'is_moderator_or_admin',
    'update_updated_at%', 'update_events_updated_at', 
    'update_equipment_updated_at', 'update_trust_updated_at',
    'update_forum_topics_updated_at', 'update_modqueue_updated_at',
    'update_status_changed_at', 'update_conversation_on_message'
  ]);
  
  RAISE NOTICE 'Fixed % critical functions with search_path', fixed_funcs;
  RAISE NOTICE 'Remaining functions without search_path: %', total_funcs;
  
  IF fixed_funcs >= 12 THEN
    RAISE NOTICE 'SUCCESS: Critical functions secured with search_path';
  ELSE
    RAISE WARNING 'Some functions may still need search_path';
  END IF;
END $$;
