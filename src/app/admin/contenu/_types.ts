// ─── Types partagés – admin/contenu ─────────────────────────────────────────

export interface ContentListing {
  id: string;
  title: string;
  description: string;
  status: string;
  listing_type: string;
  condition?: string | null;
  price?: number | null;
  location: string;
  created_at: string;
  updated_at: string;
  owner?: { id: string; full_name: string; email: string; avatar_url: string };
  category?: { name: string; icon: string };
  _photo_count?: number;
}

export interface ContentForumPost {
  id: string;
  title: string;
  content: string;
  is_closed: boolean;
  is_pinned: boolean;
  views: number;
  created_at: string;
  author?: { id: string; full_name: string; email: string; avatar_url: string };
  category?: { name: string; icon: string };
  _comment_count?: number;
}

export interface ContentEquipment {
  id: string;
  title: string;
  description: string;
  is_available: boolean;
  condition: string;
  created_at: string;
  owner?: { id: string; full_name: string; email: string; avatar_url: string };
  category?: { name: string; icon: string };
}

export interface ContentReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: { id: string; full_name: string; email: string; avatar_url: string };
  artisan?: { id: string; business_name: string };
}

export type TabId = 'listings' | 'forum' | 'equipment' | 'reviews';

/** Cible de la modale de confirmation (id + libellé affiché) */
export interface ConfirmTarget {
  id: string;
  label: string;
}
