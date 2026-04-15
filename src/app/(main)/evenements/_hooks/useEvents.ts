'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { LocalEvent } from '../_types';

export function useEvents(profileId?: string) {
  const supabase = useMemo(() => createClient(), []);

  const [events, setEvents]             = useState<LocalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [dbReady, setDbReady]           = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let data: LocalEvent[] | null = null;
      let error: unknown = null;

      // Try enriched schema first (price_type, capacity, start_time columns)
      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select(`*, author:profiles(full_name, avatar_url), participants:event_participants(count), participants_list:event_participants(user_id, user:profiles(full_name, avatar_url))`)
        .in('status', ['a_venir', 'complet', 'reporte'])
        .gte('event_date', today)
        .order('event_date', { ascending: true });

      if (!evErr && evData) {
        data = evData.map((e: Record<string, unknown>) => ({
          ...e,
          is_free: e.price_type === 'gratuit',
          event_time: e.start_time ?? '18:00',
          max_participants: e.capacity ?? null,
        })) as LocalEvent[];
      } else {
        // Legacy schema fallback
        const { data: legData, error: legErr } = await supabase
          .from('events')
          .select(`*, author:profiles(full_name, avatar_url), participants:event_participants(count), participants_list:event_participants(user_id, user:profiles(full_name, avatar_url))`)
          .in('status', ['active', 'publie', 'a_venir', 'complet', 'reporte'])
          .gte('event_date', today)
          .order('event_date', { ascending: true });
        if (!legErr) {
          data = legData as LocalEvent[] | null;
        } else {
          // Minimal fallback without profiles
          const { data: oldData, error: oldErr } = await supabase
            .from('events')
            .select(`*, participants:event_participants(count), participants_list:event_participants(user_id, user:profiles(full_name, avatar_url))`)
            .in('status', ['active', 'publie', 'a_venir', 'complet', 'reporte'])
            .gte('event_date', today)
            .order('event_date', { ascending: true });
          data = oldData as LocalEvent[] | null;
          error = oldErr;
        }
      }

      if (error) {
        const err = error as { code?: string; message?: string };
        if (err.code === '42P01' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingEvents(false);
        return;
      }
      setDbReady(true);

      let enriched = (data || []).map((e: LocalEvent & { participants?: { count: number }[] }) => ({
        ...e,
        participants_count: e.participants?.[0]?.count ?? 0,
        participants_list: (e as LocalEvent).participants_list ?? [],
        user_joined: false,
      }));

      // Mark joined events for authenticated user
      if (profileId && enriched.length > 0) {
        const ids = enriched.map(e => e.id);
        const { data: joins } = await supabase
          .from('event_participants')
          .select('event_id')
          .in('event_id', ids)
          .eq('user_id', profileId);
        const joinedSet = new Set((joins || []).map((j: { event_id: string }) => j.event_id));
        enriched = enriched.map(e => ({ ...e, user_joined: joinedSet.has(e.id) }));
      }

      // Attach cover photos
      if (enriched.length > 0) {
        const ids = enriched.map(e => e.id);
        const { data: photos } = await supabase
          .from('event_photos')
          .select('event_id, url, display_order')
          .in('event_id', ids)
          .order('display_order', { ascending: true });
        if (photos && photos.length > 0) {
          const coverMap: Record<string, string> = {};
          (photos as { event_id: string; url: string }[]).forEach(p => {
            if (!coverMap[p.event_id]) coverMap[p.event_id] = p.url;
          });
          enriched = enriched.map(e => ({ ...e, cover_photo: coverMap[e.id] ?? null }));
        }
      }

      setEvents(enriched);
    } catch (err) {
      console.error('fetchEvents error:', err);
      setDbReady(false);
    }
    setLoadingEvents(false);
  }, [profileId, supabase]);

  const handleJoin = async (eventId: string, joined: boolean) => {
    if (!profileId) { toast.error('Connectez-vous pour participer'); return; }
    if (joined) {
      await supabase.from('event_participants').delete().eq('event_id', eventId).eq('user_id', profileId);
      toast.success('Inscription annulée');
    } else {
      const { error } = await supabase
        .from('event_participants')
        .insert({ event_id: eventId, user_id: profileId, status: 'inscrit' });
      if (error) {
        const { error: e2 } = await supabase
          .from('event_participants')
          .insert({ event_id: eventId, user_id: profileId });
        if (e2) { toast.error("Erreur lors de l'inscription"); return; }
      }
      toast.success('✅ Inscription enregistrée !');
    }
    fetchEvents();
  };

  const handleEventStatusChange = async (eventId: string, newStatus: string) => {
    await supabase
      .from('events')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', eventId);
    const labels: Record<string, string> = {
      a_venir: 'À venir', complet: 'Complet', reporte: 'Reporté', annule: 'Annulé', archive: 'Archivé',
    };
    toast.success(`✅ Statut : ${labels[newStatus] || newStatus}`);
    fetchEvents();
  };

  return {
    events,
    loadingEvents,
    dbReady,
    fetchEvents,
    handleJoin,
    handleEventStatusChange,
  };
}
