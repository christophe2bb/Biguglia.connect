/**
 * src/types/artisans.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types du module Artisans : profils artisans, catégories de métier,
 * demandes de prestation, photos, rendez-vous et avis.
 */

import type { Profile } from './user';

export type ArtisanType = 'professionnel' | 'particulier';

export interface TradeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  display_order: number;
}

export interface ArtisanPhoto {
  id: string;
  artisan_id: string;
  url: string;
  caption?: string;
  display_order: number;
  created_at: string;
}

export interface Review {
  id: string;
  artisan_id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: Profile;
}

export interface ArtisanProfile {
  id: string;
  user_id: string;
  business_name: string;
  trade_category_id: string;
  description: string;
  service_area: string;
  years_experience?: number;
  siret?: string;
  insurance?: string;
  artisan_type?: ArtisanType;
  doc_kbis_url?: string;
  doc_insurance_url?: string;
  doc_id_url?: string;
  rejection_reason?: string;
  verification_notes?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  profile?: Profile;
  trade_category?: TradeCategory;
  gallery?: ArtisanPhoto[];
  reviews?: Review[];
  avg_rating?: number;
  review_count?: number;
}

export interface ServiceRequestPhoto {
  id: string;
  request_id: string;
  url: string;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  resident_id: string;
  artisan_id?: string;
  category_id: string;
  title: string;
  description: string;
  urgency: 'normal' | 'urgent' | 'tres_urgent';
  preferred_date?: string;
  preferred_time?: string;
  address: string;
  status: 'submitted' | 'viewed' | 'replied' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Relations
  resident?: Profile;
  artisan?: ArtisanProfile;
  category?: TradeCategory;
  photos?: ServiceRequestPhoto[];
}

export interface Appointment {
  id: string;
  request_id?: string;
  resident_id: string;
  artisan_id: string;
  proposed_date: string;
  proposed_time: string;
  notes?: string;
  status: 'pending' | 'accepted' | 'declined' | 'rescheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  resident?: Profile;
  artisan?: ArtisanProfile;
}
