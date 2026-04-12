/**
 * src/types/equipment.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types du module Matériel en prêt : catégories, objets, photos, demandes.
 */

import type { Profile } from './user';

export interface EquipmentCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
}

export interface EquipmentPhoto {
  id: string;
  item_id: string;
  url: string;
  display_order: number;
}

export interface EquipmentItem {
  id: string;
  owner_id: string;
  category_id: string;
  title: string;
  description: string;
  condition: 'neuf' | 'tres_bon' | 'excellent' | 'bon' | 'usage';
  deposit_amount?: number;
  is_free: boolean;
  daily_rate?: number;
  pickup_location: string;
  location_area?: string;
  sector_id?: string | null;        // couche territoriale (recommandé)
  rules?: string;
  availability_notes?: string;
  is_available: boolean;
  status?: string; // disponible | reserve | prete | rendu | indisponible | archive
  status_changed_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  category?: EquipmentCategory;
  photos?: EquipmentPhoto[];
}

export interface BorrowRequest {
  id: string;
  item_id: string;
  borrower_id: string;
  start_date: string;
  end_date: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned' | 'cancelled';
  created_at: string;
  updated_at: string;
  item?: EquipmentItem;
  borrower?: Profile;
}
