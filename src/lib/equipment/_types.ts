/**
 * equipment/_types.ts — Interfaces TypeScript du module matériel
 *
 * Contient uniquement des types et interfaces, sans logique ni constantes.
 * Importable côté serveur et client sans effet de bord.
 */

import type { AvailabilityMode, PickupMode, LendDurationHint, ConditionLabel } from './_availability';
import type { EquipmentStatus, LoanRequestStatus, LoanStatus } from './_status';

// ─── Re-export des union types utilisés en dehors du module ───────────────────
export type { AvailabilityMode, PickupMode, LendDurationHint, ConditionLabel } from './_availability';
export type { EquipmentStatus, LoanRequestStatus, LoanStatus } from './_status';

// ─── Interfaces entités ───────────────────────────────────────────────────────

export interface EquipmentItemFull {
  id: string;
  owner_id: string;
  category_id: string;
  title: string;
  description: string;
  condition: ConditionLabel;
  status: EquipmentStatus;
  is_available: boolean;        // legacy, sync avec status via trigger
  is_free: boolean;
  daily_rate?: number;
  deposit_amount?: number;
  deposit_note?: string;        // CDC §3.3 : note sur la caution
  pickup_location: string;
  location_area?: string;
  rules?: string;
  availability_notes?: string;

  // ── Champs CDC §3.3 / §11 ────────────────────────────────────────────────────
  availability_mode?: AvailabilityMode;   // toujours / sur_demande / creneaux
  pickup_mode?: PickupMode;               // remise_en_main / retrait_prêteur / point_rdv
  lend_duration_hint?: LendDurationHint;  // 2h / journee / week-end / semaine / libre
  usage_instructions?: string;            // instructions d'utilisation (CDC §6.2)
  included_accessories?: string;          // accessoires inclus (CDC §6.2 / §11)
  requires_explanation?: boolean;         // signal « nécessite explication » (CDC §3.3)
  min_notice_hours?: number;              // délai de préavis minimum en heures

  created_at: string;
  updated_at: string;
  archived_at?: string;
  status_changed_at?: string;

  // Relations
  owner?: { id: string; full_name: string; avatar_url?: string; created_at?: string; role?: string };
  category?: { id: string; name: string; icon: string; slug: string };
  photos?: EquipmentPhotoFull[];
  sector?: { id: string; name: string } | null;
}

export interface EquipmentPhotoFull {
  id: string;
  item_id: string;
  url: string;
  display_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface EquipmentRequest {
  id: string;
  equipment_id: string;
  requester_id: string;
  message?: string;
  requested_start_date?: string;
  requested_end_date?: string;
  status: LoanRequestStatus;
  created_at: string;
  updated_at: string;
  // Relations
  equipment?: EquipmentItemFull;
  requester?: { id: string; full_name: string; avatar_url?: string };
}

export interface EquipmentLoan {
  id: string;
  equipment_id: string;
  owner_id: string;
  borrower_id: string;
  request_id?: string;
  status: LoanStatus;
  reserved_at?: string;
  loan_started_at?: string;
  returned_at?: string;
  notes_owner?: string;
  notes_borrower?: string;
  created_at: string;
  updated_at: string;
  // Relations
  equipment?: EquipmentItemFull;
  borrower?: { id: string; full_name: string; avatar_url?: string };
  owner?: { id: string; full_name: string; avatar_url?: string };
}

export interface EquipmentStatusHistory {
  id: string;
  equipment_id: string;
  old_status?: string;
  new_status: string;
  changed_by: string;
  reason?: string;
  created_at: string;
  changed_by_profile?: { full_name: string; avatar_url?: string };
}
