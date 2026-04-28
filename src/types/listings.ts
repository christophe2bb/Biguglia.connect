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
  /**
   * Colonne dénormalisée (trigger trg_listing_photos_cover, migration 20260428).
   * URL de la photo cover (display_order le plus bas) — disponible directement
   * sur la table listings, sans join listing_photos.
   * Utilisé par la vue liste /annonces pour éliminer le join photos.
   * Les contextes qui chargent la relation photos complète peuvent ignorer ce champ.
   */
  cover_url?: string | null;
  user?: Profile;
  category?: ListingCategory;
  photos?: ListingPhoto[];
}
