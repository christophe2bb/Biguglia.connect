'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type PublicProfile, type EventItem, makeMinimalProfile } from '../_types';

// ── Return type ───────────────────────────────────────────────────────────────

export interface UsePublicProfileReturn {
  loading: boolean;
  notFound: boolean;
  publicProfile: PublicProfile | null;
  events: EventItem[];
  upcomingEvents: EventItem[];
  pastEvents: EventItem[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Loads a public profile by userId with three progressive fallbacks:
 *   1. Full profile row (columns incl. email/phone — succeeds if RLS allows)
 *   2. Public-only columns (no email/phone)
 *   3. Synthetic profile derived from events / listings / collection_items author rows
 *
 * Also loads the user's organised events (with status filter fallback).
 */
export function usePublicProfile(userId: string): UsePublicProfileReturn {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading]             = useState(true);
  const [notFound, setNotFound]           = useState(false);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [events, setEvents]               = useState<EventItem[]>([]);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);

      // ── Step 1: fetch profile ─────────────────────────────────────────────

      let p: PublicProfile | null = null;

      // Attempt A: full row (works when connected + permissive RLS)
      const { data: pFull } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, bio, city, phone, role, status, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (pFull) {
        p = pFull as PublicProfile;
      } else {
        // Attempt B: public columns only (no sensitive fields)
        const { data: pPublic } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, city, role, status, created_at')
          .eq('id', userId)
          .maybeSingle();
        if (pPublic) {
          p = { ...pPublic, email: null, phone: null } as PublicProfile;
        }
      }

      // Attempt C: synthetic from author tables (events → listings → collection_items)
      if (!p) {
        const { data: evCheck } = await supabase
          .from('events')
          .select('author_id, organizer_name')
          .eq('author_id', userId)
          .limit(1)
          .maybeSingle();

        if (evCheck) {
          p = makeMinimalProfile(userId, {
            full_name: evCheck.organizer_name || 'Organisateur',
          });
        }
      }

      if (!p) {
        const { data: listingCheck } = await supabase
          .from('listings')
          .select('user_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        if (listingCheck) p = makeMinimalProfile(userId);
      }

      if (!p) {
        const { data: collCheck } = await supabase
          .from('collection_items')
          .select('author_id')
          .eq('author_id', userId)
          .limit(1)
          .maybeSingle();
        if (collCheck) p = makeMinimalProfile(userId);
      }

      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPublicProfile(p);

      // ── Step 2: fetch organised events ────────────────────────────────────

      let evData: EventItem[] = [];
      try {
        const { data } = await supabase
          .from('events')
          .select('id, title, event_date, start_time, location, status, category, cover_photo_url')
          .eq('author_id', userId)
          .not('status', 'in', '(archive)')
          .order('event_date', { ascending: false })
          .limit(12);
        evData = data ?? [];
      } catch {
        try {
          // Fallback without status filter (older schema may not support the operator)
          const { data } = await supabase
            .from('events')
            .select('id, title, event_date, start_time, location, status, category, cover_photo_url')
            .eq('author_id', userId)
            .order('event_date', { ascending: false })
            .limit(12);
          evData = data ?? [];
        } catch {
          evData = [];
        }
      }

      setEvents(evData);
      setLoading(false);
    };

    load();
  }, [userId, supabase]);

  const upcomingEvents = events.filter(e =>
    ['a_venir', 'complet', 'reporte'].includes(e.status)
  );
  const pastEvents = events.filter(e =>
    ['passe', 'annule', 'archive'].includes(e.status)
  );

  return { loading, notFound, publicProfile, events, upcomingEvents, pastEvents };
}
