/**
 * src/types/community.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types des modules communautaires :
 *  - Perdu/Trouvé
 *  - Coups de main
 *  - Promenades
 *  - Associations
 *  - Collectionneurs
 *  - Secteurs (couche territoriale transversale)
 *  - Signalements génériques
 *  - Notifications
 */

// ── Couche territoriale transversale ─────────────────────────────────────────

/** Secteur de Biguglia — miroir du type Sector de lib/sectors.ts */
export interface Sector {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  display_order: number;
  description?: string;
  is_active?: boolean;
}

// ── Module Perdu/Trouvé ───────────────────────────────────────────────────────

export interface LostFoundItem {
  id: string;
  author_id: string;
  type: 'perdu' | 'trouve';
  status: 'active' | 'resolved' | 'draft';
  title: string;
  category: string;
  description: string;
  sector_id: string;              // obligatoire
  location_area?: string;
  location_detail?: string;
  lost_date: string;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string; avatar_url?: string | null };
  photos?: { url: string; display_order: number }[];
}

// ── Module Coups de main ──────────────────────────────────────────────────────

export interface HelpRequest {
  id: string;
  author_id: string;
  help_type: 'demande' | 'offre' | 'echange';
  status: 'active' | 'paused' | 'resolved' | 'draft';
  title: string;
  category: string;
  description: string;
  sector_id: string;              // obligatoire
  urgency: 'flexible' | 'cette_semaine' | 'rapidement' | 'urgent';
  location_area?: string;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string; avatar_url?: string | null };
}

// ── Module Promenades ─────────────────────────────────────────────────────────

export interface Promenade {
  id: string;
  author_id: string;
  title: string;
  description: string;
  distance_km?: number;
  duration_min?: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
  type: 'balade' | 'randonnee' | 'velo' | 'plage' | 'nature';
  tags: string[];
  start_point?: string;
  sector_id?: string | null;      // fortement recommandé
  status: 'active' | 'archived';
  views: number;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string; avatar_url?: string | null };
  photos?: { url: string; display_order: number }[];
  likes_count?: number;
}

// ── Module Associations ───────────────────────────────────────────────────────

export interface Association {
  id: string;
  author_id: string;
  name: string;
  category: string;
  description_short: string;
  description_full?: string;
  location: string;
  sector_id?: string | null;      // fortement recommandé
  is_citywide?: boolean;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string; avatar_url?: string | null };
  photos?: { url: string; display_order: number }[];
}

// ── Module Collectionneurs ────────────────────────────────────────────────────

export interface CollectionItem {
  id: string;
  author_id: string;
  category_id?: string;
  title: string;
  description: string;
  item_type: 'vente' | 'troc' | 'don' | 'recherche';
  price?: number;
  condition: 'neuf' | 'excellent' | 'bon' | 'passable';
  tags: string[];
  sector_id?: string | null;      // fortement recommandé
  status: 'active' | 'sold' | 'archived';
  views: number;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string; avatar_url?: string | null };
  photos?: { url: string; display_order: number }[];
}

// ── Signalements génériques ───────────────────────────────────────────────────

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'user' | 'post' | 'listing' | 'message' | 'equipment';
  target_id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: import('./user').Profile;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}
