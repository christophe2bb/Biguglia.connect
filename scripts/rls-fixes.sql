-- =============================================================
-- RLS FIXES - Generated from live audit 2026-04-16
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================

-- ============================================================
-- FIX 1 (CRITICAL): profiles - email/phone/role/moderation data exposed to anon
-- Current state: USING(true) allows all rows to be read by anyone
-- Fix: Require authentication for SELECT; restrict sensitive columns via view
-- ============================================================

-- Step 1a: Drop existing permissive SELECT policy on profiles
-- First check name in Supabase Dashboard > Authentication > Policies > profiles
-- Common names: "Public profiles are viewable by everyone", "profiles_select_policy", etc.
-- DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
-- DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Step 1b: Add safe SELECT policy - authenticated users only
-- (App uses profiles to show names/avatars - authenticated is the right scope)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- ALTERNATIVE: If some profile data must be public (e.g. artist/artisan pages),
-- create a public VIEW that excludes sensitive columns:
-- CREATE VIEW public_profiles AS
--   SELECT id, full_name, avatar_url, home_sector_id
--   FROM profiles;
-- Then grant anon SELECT on public_profiles only.

-- ============================================================
-- FIX 2 (HIGH): service_requests - private service requests (address, etc.) exposed
-- ============================================================
-- Drop any existing permissive SELECT policy
-- DROP POLICY IF EXISTS "service_requests_select_policy" ON service_requests;

-- Residents see their own requests; artisans see requests assigned to them
CREATE POLICY "service_requests_select_own"
  ON service_requests FOR SELECT
  USING (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
  );

-- ============================================================
-- FIX 3 (MEDIUM): item_ratings - user/author IDs linkable
-- ============================================================
-- Ratings should only be visible to authenticated users (for community features)
-- DROP POLICY IF EXISTS "item_ratings_select_policy" ON item_ratings;

CREATE POLICY "item_ratings_select_authenticated"
  ON item_ratings FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- FIX 4 (BUG / DoS): Infinite recursion in conversation_participants policy
-- This causes HTTP 500 errors on any query to:
--   conversations, messages, message_attachments, conversation_participants
-- Root cause: policy on conversation_participants references conversations
--             which references conversation_participants -> infinite loop
-- ============================================================

-- Step 4a: View current policies (run in SQL Editor to see exact names):
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'conversation_participants';

-- Step 4b: Drop the recursive policy and replace with a safe version
-- The typical pattern that causes this:
-- USING (conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()))
-- This is self-referential!

-- Safe fix: use EXISTS with direct join to conversations, NOT a sub-query on conversation_participants
-- DROP POLICY IF EXISTS "conversation_participants_select_policy" ON conversation_participants;

CREATE POLICY "conversation_participants_select_own"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- Step 4c: Fix messages policy if it also references conversation_participants recursively
-- DROP POLICY IF EXISTS "messages_select_policy" ON messages;

CREATE POLICY "messages_select_participants"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Step 4d: Fix conversations policy
-- DROP POLICY IF EXISTS "conversations_select_policy" ON conversations;

CREATE POLICY "conversations_select_participants"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- Step 4e: Fix message_attachments
-- DROP POLICY IF EXISTS "message_attachments_select_policy" ON message_attachments;

CREATE POLICY "message_attachments_select_participants"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
        AND cp.user_id = auth.uid()
    )
  );

-- ============================================================
-- VERIFICATION: Run after applying fixes
-- ============================================================
-- 1. Check profiles no longer accessible anon:
--    From browser console (no login): fetch('/api/supabase-test') or curl with anon key
--    Should return [] or 401

-- 2. Check conversations no longer recursive:
--    SELECT * FROM conversations LIMIT 1;  -- Should work without recursion

-- 3. Check service_requests:
--    Anon query should return []

