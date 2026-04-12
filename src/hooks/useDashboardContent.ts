'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useDashboardContent
// Responsabilité unique : charger les contenus récents (listings, matériel)
// et l'activité récente (coups de main, événements, promenades, perdu/trouvé).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ContentItem, ActivityItem, ParticipationItem, TodoItem,
} from './useDashboardData';

// ─── Types de résultat ────────────────────────────────────────────────────────

export interface UseDashboardContentResult {
  recentContents:   ContentItem[];
  recentActivity:   ActivityItem[];
  participations:   ParticipationItem[];
  loading: boolean;
  error:   string | null;
  fetch:   (profileId: string, listingsRaw: Record<string, unknown>[]) => Promise<void>;
}

// ─── Mappers internes ─────────────────────────────────────────────────────────

function mapListingsToContent(listings: Record<string, unknown>[]): ContentItem[] {
  return listings.slice(0, 5).map(l => ({
    id:       l.id as string,
    type:     'listing' as const,
    title:    l.title as string,
    status:   l.status as string,
    createdAt: l.created_at as string,
    views:    (l.views as number) || 0,
    href:     `/annonces/${l.id}`,
    editHref: `/annonces/${l.id}/modifier`,
    isClosed: ['sold', 'archived', 'expired'].includes(l.status as string),
  }));
}

function mapEquipmentToContent(equipment: Record<string, unknown>[]): ContentItem[] {
  return equipment.slice(0, 3).map(e => ({
    id:       e.id as string,
    type:     'equipment' as const,
    title:    e.title as string,
    status:   (e.is_available ? 'available' : 'unavailable') as string,
    createdAt: e.created_at as string,
    href:     `/materiel/${e.id}`,
    editHref: `/materiel/${e.id}/modifier`,
    isClosed: !(e.is_available as boolean),
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardContent(): UseDashboardContentResult {
  const [recentContents,  setRecentContents]  = useState<ContentItem[]>([]);
  const [recentActivity,  setRecentActivity]  = useState<ActivityItem[]>([]);
  const [participations,  setParticipations]  = useState<ParticipationItem[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  const fetch = useCallback(async (
    profileId: string,
    listingsRaw: Record<string, unknown>[],
  ) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const today    = new Date().toISOString().split('T')[0];

      // ── Contenus récents ─────────────────────────────────────────────────
      const { data: equipment } = await supabase
        .from('equipment_items')
        .select('id, title, is_available, pickup_location, created_at')
        .eq('owner_id', profileId)
        .order('created_at', { ascending: false })
        .limit(6);

      const contents: ContentItem[] = [
        ...mapListingsToContent(listingsRaw),
        ...mapEquipmentToContent((equipment || []) as Record<string, unknown>[]),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRecentContents(contents);

      // ── Activité récente ─────────────────────────────────────────────────
      const activity: ActivityItem[] = [];

      const [
        { data: helpData },
        { data: eventsData },
        { data: outingsData },
      ] = await Promise.all([
        supabase.from('help_requests')
          .select('id, title, status, created_at')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('events')
          .select('id, title, event_date, status')
          .eq('author_id', profileId)
          .gte('event_date', today)
          .order('event_date')
          .limit(3),
        supabase.from('group_outings')
          .select('id, title, outing_date, status')
          .eq('organizer_id', profileId)
          .gte('outing_date', today)
          .order('outing_date')
          .limit(3),
      ]);

      (helpData || []).forEach((h: Record<string, unknown>) => {
        activity.push({
          id:       `help-${h.id}`,
          type:     'help',
          title:    h.title as string,
          subtitle: 'Coup de main',
          href:     `/coups-de-main#${h.id}`,
          date:     h.created_at as string,
          badge:    h.status as string,
          badgeColor: h.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600',
        });
      });

      (eventsData || []).forEach((e: Record<string, unknown>) => {
        activity.push({
          id:       `event-${e.id}`,
          type:     'event',
          title:    e.title as string,
          subtitle: `Le ${new Date(e.event_date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
          href:     `/evenements`,
          date:     e.event_date as string,
          badge:    'À venir',
          badgeColor: 'bg-purple-100 text-purple-700',
        });
      });

      (outingsData || []).forEach((o: Record<string, unknown>) => {
        activity.push({
          id:       `outing-${o.id}`,
          type:     'outing',
          title:    o.title as string,
          subtitle: `Le ${new Date(o.outing_date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
          href:     `/promenades`,
          date:     o.outing_date as string,
          badge:    'Promenade',
          badgeColor: 'bg-emerald-100 text-emerald-700',
        });
      });

      // Perdu/Trouvé (table optionnelle)
      try {
        const { data: lfData } = await supabase
          .from('lost_found_items')
          .select('id, title, status, type, created_at')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false })
          .limit(2);

        (lfData || []).forEach((lf: Record<string, unknown>) => {
          activity.push({
            id:       `lf-${lf.id}`,
            type:     'lost_found',
            title:    lf.title as string,
            subtitle: lf.type === 'perdu' ? 'Objet perdu' : 'Objet trouvé',
            href:     `/perdu-trouve`,
            date:     lf.created_at as string,
            badge:    lf.status === 'resolved'
              ? 'Résolu'
              : (lf.type === 'perdu' ? 'Perdu' : 'Trouvé'),
            badgeColor: lf.status === 'resolved'
              ? 'bg-emerald-100 text-emerald-700'
              : lf.type === 'perdu'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700',
          });
        });
      } catch { /* table may not exist yet */ }

      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 8));

      // ── Participations ───────────────────────────────────────────────────
      const participationItems: ParticipationItem[] = [];
      try {
        const [{ data: eventParts }, { data: outingParts }] = await Promise.all([
          supabase.from('event_participants')
            .select('id, event_id, event:events(id, title, event_date, status)')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('outing_participants')
            .select('id, outing_id, outing:group_outings(id, title, outing_date, status)')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        (eventParts || []).forEach((p: Record<string, unknown>) => {
          const ev = p.event as Record<string, unknown> | null;
          if (ev) participationItems.push({
            id:       `ep-${p.id}`,
            type:     'event',
            title:    ev.title as string,
            date:     ev.event_date as string,
            status:   (ev.status as string) || 'active',
            href:     `/evenements`,
            sourceId: p.event_id as string,
          });
        });

        (outingParts || []).forEach((p: Record<string, unknown>) => {
          const ot = p.outing as Record<string, unknown> | null;
          if (ot) participationItems.push({
            id:       `op-${p.id}`,
            type:     'outing',
            title:    ot.title as string,
            date:     ot.outing_date as string,
            status:   (ot.status as string) || 'active',
            href:     `/promenades`,
            sourceId: p.outing_id as string,
          });
        });
      } catch { /* tables may not exist yet */ }

      setParticipations(participationItems);

    } catch (err) {
      console.error('[useDashboardContent]', err);
      setError('Erreur lors du chargement des contenus');
    } finally {
      setLoading(false);
    }
  }, []);

  return { recentContents, recentActivity, participations, loading, error, fetch };
}

// ─── Builder todos liés aux contenus ─────────────────────────────────────────
// Exporté pour être appelé depuis l'orchestrateur useDashboardData.

export function buildContentTodos(
  listingsRaw: Record<string, unknown>[],
): Pick<TodoItem, 'id' | 'type' | 'priority' | 'title' | 'subtitle' | 'href' | 'icon'>[] {
  const todos: Pick<TodoItem, 'id' | 'type' | 'priority' | 'title' | 'subtitle' | 'href' | 'icon'>[] = [];
  const expiredListings = listingsRaw.filter(l =>
    l.status === 'expired' || l.status === 'archived'
  );
  if (expiredListings.length > 0) {
    todos.push({
      id:       'todo-relist',
      type:     'listing',
      priority: 'low',
      title:    `${expiredListings.length} annonce${expiredListings.length > 1 ? 's' : ''} expirée${expiredListings.length > 1 ? 's' : ''}`,
      subtitle: 'Republier pour rester visible',
      href:     '/dashboard/contenus',
      icon:     '📦',
    });
  }
  return todos;
}
