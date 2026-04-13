// ─── Types partagés – RatingWidget ───────────────────────────────────────────

export type RatingTargetType =
  | 'listing' | 'equipment' | 'help_request' | 'lost_found'
  | 'association' | 'outing' | 'collection_item' | 'event'
  | 'promenade' | 'service_request';

export interface RatingData {
  avg: number;
  count: number;
  myRating: number | null;
  distribution: number[]; // index 0 = 1 étoile … index 4 = 5 étoiles
}

export interface PollOption {
  label: string;
  emoji: string;
}

/** Ligne renvoyée par la query item_ratings avec join profil */
export interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { full_name: string | null; avatar_url: string | null } | null;
}

/** Props du composant principal */
export interface RatingWidgetProps {
  targetType: RatingTargetType;
  targetId: string;
  authorId?: string;
  userId?: string | null;
  compact?: boolean;
  showPoll?: boolean;
  className?: string;
}
