/**
 * trust/_types.ts — Types & interfaces du moteur de confiance
 *
 * Architecture en 4 couches :
 *   A – Contenu source (listing, événement, matériel, etc.)
 *   B – Interaction réelle (trust_interactions)
 *   C – Avis vérifié (reviews)
 *   D – Réputation agrégée (trust_profile_stats + profile_badges)
 */

// ─── Unions de types primitifs ────────────────────────────────────────────────

export type InteractionSourceType =
  | 'listing' | 'equipment' | 'help_request' | 'lost_found'
  | 'association' | 'outing' | 'collection_item' | 'event'
  | 'promenade' | 'service_request';

export type InteractionStatus =
  | 'requested' | 'pending' | 'accepted' | 'rejected'
  | 'in_progress' | 'done' | 'cancelled' | 'disputed';

export type InteractionType =
  | 'transaction' | 'material_request' | 'help_match'
  | 'participation' | 'contact' | 'service_request';

export type BadgeCode =
  | 'new_member' | 'profile_complete' | 'email_verified' | 'phone_verified'
  | 'active_member' | 'fast_responder' | 'reliable_organizer' | 'reliable_vendor'
  | 'reliable_helper' | 'reliable_borrower' | 'trusted_member' | 'top_rated'
  | 'veteran' | 'admin_validated'
  // ── Badges dynamique communautaire (v2) ─────────────────────────────────
  | 'local_contributor'    // 5+ publications (forum, annonces, événements, coups-de-main…)
  | 'solidarity_neighbor'  // 3+ coups-de-main accomplis
  | 'active_organizer'     // 2+ événements ou promenades organisés avec participants
  | 'reliable_profile'     // Score confiance ≥ 55 + profil complet + ancienneté ≥ 30j
  | 'welcome_ambassador'   // A laissé 5+ avis positifs (≥ 4 étoiles)
  | 'community_pillar';    // Critères multiples haut niveau (score ≥ 80, ancienneté ≥ 6 mois)

// ─── Entités métier ───────────────────────────────────────────────────────────

export interface TrustInteraction {
  id: string;
  source_type: InteractionSourceType;
  source_id: string;
  requester_id: string;
  receiver_id: string;
  interaction_type: InteractionType;
  status: InteractionStatus;
  review_unlocked: boolean;
  review_requester_done: boolean;
  review_receiver_done: boolean;
  conversation_id: string | null;
  status_history: Array<{ status: string; changed_at: string; note?: string }>;
  started_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface Review {
  id: string;
  interaction_id: string | null;
  source_type: InteractionSourceType;
  source_id: string;
  author_id: string;
  target_user_id: string;
  rating: number;
  dim_communication?: number | null;
  dim_reliability?: number | null;
  dim_punctuality?: number | null;
  dim_quality?: number | null;
  comment?: string | null;
  would_recommend?: boolean | null;
  moderation_status: 'visible' | 'reported' | 'hidden' | 'deleted';
  created_at: string;
  // Joined
  author?: { id: string; full_name: string; avatar_url?: string | null };
  target_user?: { id: string; full_name: string; avatar_url?: string | null };
  tags?: string[];
}

export interface TrustProfileStats {
  profile_id: string;
  interactions_total: number;
  interactions_done: number;
  interactions_cancelled: number;
  interactions_disputed: number;
  reviews_received: number;
  avg_rating: number;
  avg_communication?: number | null;
  avg_reliability?: number | null;
  avg_punctuality?: number | null;
  avg_quality?: number | null;
  recommend_pct?: number | null;
  dist_1: number; dist_2: number; dist_3: number; dist_4: number; dist_5: number;
  trust_score: number;
  last_computed_at: string;
}

export interface ProfileBadge {
  id: string;
  profile_id: string;
  badge_code: BadgeCode;
  awarded_at: string;
  awarded_by: 'system' | 'admin';
}
