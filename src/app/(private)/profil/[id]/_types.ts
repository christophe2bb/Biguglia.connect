/**
 * src/app/profil/[id]/_types.ts
 * Types and pure format helpers for the public profile page.
 * No React, no Supabase.
 */

// ── Domain types ──────────────────────────────────────────────────────────────

export interface PublicProfile {
  id: string;
  full_name: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  phone?: string | null;
  role: string;
  status?: string | null;
  created_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  event_date: string;
  start_time?: string | null;
  location?: string | null;
  status: string;
  category?: string | null;
  cover_photo_url?: string | null;
}

// ── Tab type ──────────────────────────────────────────────────────────────────

export type ProfileTab = 'info' | 'events' | 'trust';

// ── Format helpers ────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    month: 'long', year: 'numeric',
  });
}

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Minimal profile stub (used when profile table is unreachable via RLS) ─────

export function makeMinimalProfile(id: string, overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id,
    full_name: 'Membre',
    email: null,
    phone: null,
    avatar_url: null,
    bio: null,
    city: null,
    role: 'resident',
    status: 'active',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
