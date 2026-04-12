// ─── Types partagés pour le compositeur de sujet forum ───────────────────────
import type { ForumSector, ForumCategory } from '@/types';

export type Step = 1 | 2 | 3 | 4;

export type UrgencyValue  = 'basse' | 'normal' | 'haute';
export type VisibilityValue = 'public' | 'membres' | 'secteur';

export interface FormState {
  sector_id:   string;
  category_id: string;
  post_type:   string;
  urgency:     UrgencyValue;
  title:       string;
  content:     string;
  tags:        string[];
  visibility:  VisibilityValue;
}

export interface PostTypeOption {
  value:  string;
  icon:   React.ElementType;
  label:  string;
  desc:   string;
  color:  string;
  bg:     string;
  border: string;
}

export interface UrgencyLevel {
  value: UrgencyValue;
  emoji: string;
  label: string;
  desc:  string;
}

export interface VisibilityOption {
  value:       VisibilityValue;
  icon:        React.ElementType;
  label:       string;
  description: string;
}

export interface SimilarTopic {
  id:         string;
  title:      string;
  created_at: string;
}

// Re-export for convenience
export type { ForumSector, ForumCategory };
