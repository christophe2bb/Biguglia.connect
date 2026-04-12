/**
 * src/types/outings.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types du module Sorties groupées / Promenades organisées.
 */

import type { Profile } from './user';

export type OutingStatusFr =
  | 'ouverte'
  | 'complete'
  | 'terminee'
  | 'annulee'
  | 'archivee';

/** Alias de compatibilité (lib/outings.ts) */
export type OutingStatus = OutingStatusFr;

export type OutingParticipantStatus =
  | 'inscrit'
  | 'confirme'
  | 'annule'
  | 'present'
  | 'absent';

export interface OutingPhoto {
  id: string;
  outing_id: string;
  url: string;
  display_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface GroupOuting {
  id: string;
  organizer_id: string;
  promenade_id?: string | null;
  sector_id?: string | null;        // couche territoriale (recommandé)
  title: string;
  description: string | null;
  outing_date: string;
  outing_time: string;
  max_participants: number;
  meeting_point: string | null;
  parking_info: string | null;
  parking_available: boolean;
  stroller_accessible: boolean;
  difficulty: 'facile' | 'moyen' | 'difficile' | null;
  kids_friendly: boolean;
  dogs_allowed: boolean;
  status: OutingStatusFr | string; // string fallback for legacy values
  is_registration_open: boolean;
  location_area: string | null;
  location_city: string | null;
  duration_estimate: string | null;
  cover_photo_url: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  organizer?: { full_name: string; avatar_url?: string } | null;
  photos?: OutingPhoto[];
  participants_count?: number;
  user_joined?: boolean;
}

export interface OutingParticipant {
  id: string;
  outing_id: string;
  user_id: string;
  status: OutingParticipantStatus;
  joined_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  attendance_marked_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  profile?: Profile;
  outing?: GroupOuting;
}

export interface OutingStatusHistory {
  id: string;
  outing_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  // Relations
  changed_by_profile?: Profile;
}
