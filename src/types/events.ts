/**
 * src/types/events.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types du module Événements : événements, photos, participants,
 * historique de statut et d'dates.
 */

export type EventStatusFr =
  | 'a_venir'
  | 'complet'
  | 'reporte'
  | 'annule'
  | 'passe'
  | 'archive';

export type EventParticipantStatusFr =
  | 'inscrit'
  | 'confirme'
  | 'annule'
  | 'present'
  | 'absent'
  | 'liste_attente';

export interface EventPhoto {
  id: string;
  event_id: string;
  url: string;
  display_order: number;
  is_cover: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: EventParticipantStatusFr;
  joined_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  attendance_marked_at?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: { full_name: string; avatar_url?: string | null } | null;
  event?: Event;
}

export interface Event {
  id: string;
  author_id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  sector_id?: string | null;        // couche territoriale (facultatif / multi possible)
  is_citywide?: boolean;            // true = concerne toute la ville
  event_date: string;
  event_end_date?: string | null;
  start_time: string;
  end_time?: string | null;
  location: string;
  location_area: string;
  location_city: string;
  location_detail: string;
  organizer_name: string;
  price_type: 'gratuit' | 'payant' | 'libre';
  price_amount?: number | null;
  capacity?: number | null;
  is_unlimited: boolean;
  status: EventStatusFr | string;
  registration_open: boolean;
  cover_photo_url?: string | null;
  tags: string[];
  is_official: boolean;
  report_reason?: string | null;
  cancel_reason?: string | null;
  postpone_reason?: string | null;
  original_event_date?: string | null;
  accessibility: string;
  contact_info: string;
  external_link: string;
  target_audience: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  // Relations
  author?: { full_name: string; avatar_url?: string | null } | null;
  photos?: EventPhoto[];
  participants?: EventParticipant[];
  participants_count?: number;
  user_joined?: boolean;
  user_participant_status?: EventParticipantStatusFr | null;
  remaining_places?: number | null;
  fill_percentage?: number | null;
}

export interface EventStatusHistory {
  id: string;
  event_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  changed_by_profile?: { full_name: string; avatar_url?: string | null } | null;
}

export interface EventDateHistory {
  id: string;
  event_id: string;
  old_event_date: string | null;
  new_event_date: string | null;
  old_start_time: string | null;
  new_start_time: string | null;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  changed_by_profile?: { full_name: string; avatar_url?: string | null } | null;
}
