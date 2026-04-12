/**
 * src/types/listings.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types du module Annonces : catégories, annonces, photos.
 */

import type { Profile } from './user';

export interface ListingCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  url: string;
  display_order: number;
}

export interface Listing {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string;
  listing_type: 'sale' | 'wanted' | 'free' | 'service' | 'exchange' | 'rental';
  price?: number;
  condition?: 'neuf' | 'tres_bon' | 'bon' | 'usage' | 'a_reparer' | 'lot' | 'excellent' | 'passable';
  location: string;
  sector_id?: string | null;        // couche territoriale (recommandé)
  status: 'draft' | 'active' | 'reserved' | 'sold' | 'given' | 'exchanged' | 'closed' | 'expired' | 'archived' | 'hidden';
  views?: number;
  created_at: string;
  updated_at: string;
  user?: Profile;
  category?: ListingCategory;
  photos?: ListingPhoto[];
}
