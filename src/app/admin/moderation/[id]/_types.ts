/**
 * Types partagés – page de modération détaillée /admin/moderation/[id]
 */

import type { ModerationStatus, ContentType, TrustLevel } from '@/lib/moderation';

export type { ModerationStatus, ContentType, TrustLevel };

export type DecisionKey = 'accepter' | 'refuser' | 'demander_correction';

export interface QueueDetail {
  id: string;
  content_type: ContentType;
  content_id: string;
  content_title: string;
  content_excerpt: string;
  content_photos: string[];
  author_id: string;
  author_trust: TrustLevel;
  status: ModerationStatus;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  completeness: number;
  validation_errors: { field: string; label: string; message: string; weight: number }[];
  reviewed_by?: string;
  reviewed_at?: string;
  decision?: string;
  refusal_reason?: string;
  correction_reason?: string;
  moderator_note?: string;
  resubmit_count: number;
  submitted_at: string;
  created_at: string;
  author?: AuthorProfile;
}

export interface AuthorProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  email?: string;
  phone?: string;
  publication_count?: number;
  reports_received?: number;
  trust_level?: string;
  role?: string;
}

export interface ModerationHistoryEntry {
  id: string;
  action: string;
  old_status?: string;
  new_status?: string;
  decision?: string;
  reason?: string;
  moderator_note?: string;
  created_at: string;
  moderator?: { full_name: string; avatar_url?: string };
}

export interface AuthorStats {
  total: number;
  pending: number;
  refused: number;
}
