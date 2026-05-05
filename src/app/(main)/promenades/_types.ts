// ─── Types ────────────────────────────────────────────────────────────────────

export type Promenade = {
  id: string;
  title: string;
  description: string;
  distance_km: number | null;
  duration_min: number | null;
  difficulty: 'facile' | 'moyen' | 'difficile';
  tags: string[];
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  likes_count?: number;
  user_liked?: boolean;
  user_saved?: boolean;
  views: number;
  created_at: string;
  type: 'balade' | 'randonnee' | 'velo' | 'plage' | 'nature' | 'moto' | 'famille' | 'photo';
  photos?: { url: string }[];
  dogs_allowed?: boolean;
  stroller_friendly?: boolean;
  shade_level?: 'none' | 'partial' | 'full';
  water_access?: boolean;
  parking_available?: boolean;
  best_time_of_day?: 'morning' | 'sunset' | 'anytime';
  best_season?: string;
  safety_notes?: string;
  practical_tips?: string;
  start_point?: string;
  route_loop?: boolean;
  sector_id?: string;
  avg_rating?: number;
  ratings_count?: number;
  last_report_date?: string;
  last_report_status?: 'good' | 'degraded' | 'closed';
};

export type ForumPost = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  created_at: string;
  comment_count?: number;
  theme?: string;
  /** Metadata for custom themes (stored on the post row) */
  theme_label?: string | null;
  theme_emoji?: string | null;
  theme_sub?:   string | null;
};

export type GroupOuting = {
  id: string;
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
  status: string;
  organizer_id: string;
  organizer?: { full_name: string } | null;
  participants_count?: number;
  user_joined?: boolean;
  cover_photo?: string | null;
  sector_id?: string | null;
};

export type OutingComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

export type AdvFilters = {
  dogs: boolean;
  stroller: boolean;
  parking: boolean;
  water: boolean;
  shade: boolean;
  sunset: boolean;
  duration_max: string;
  loop: boolean;
};

export type OutingFormState = {
  title: string;
  description: string;
  outing_date: string;
  outing_time: string;
  max_participants: string;
  meeting_point: string;
  parking_info: string;
  parking_available: boolean;
  stroller_accessible: boolean;
  difficulty: 'facile' | 'moyen' | 'difficile';
  kids_friendly: boolean;
  dogs_allowed: boolean;
  sector_id: string;
};

export type PromenadeFormState = {
  title: string;
  description: string;
  distance_km: string;
  duration_min: string;
  difficulty: string;
  type: string;
  tags: string;
  start_point: string;
  dogs_allowed: boolean;
  stroller_friendly: boolean;
  parking_available: boolean;
  water_access: boolean;
  shade_level: 'none' | 'partial' | 'full';
  best_time_of_day: 'morning' | 'sunset' | 'anytime';
  route_loop: boolean;
  practical_tips: string;
  safety_notes: string;
  sector_id: string;
};
