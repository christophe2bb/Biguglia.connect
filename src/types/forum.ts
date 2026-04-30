/**
 * src/types/forum.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types du module Forum v2 : secteurs, catégories, tags, sujets, réponses,
 * réactions, abonnements, signalements, logs de modération.
 *
 * ForumPost / ForumComment sont des alias legacy (compat backward).
 */

import type { Profile } from './user';

// ─── Taxonomie ────────────────────────────────────────────────────────────────

export interface ForumSector {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  topic_count?: number;
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  display_order: number;
  post_count?: number;
  topic_count?: number;
}

export interface ForumTag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

// ─── Sujets & réponses ────────────────────────────────────────────────────────

export type ForumTopicStatus = 'ouvert' | 'verrouille' | 'masque' | 'archive' | 'closed';

export interface ForumReply {
  id: string;
  topic_id: string;
  author_id: string;
  content: string;
  quote_reply_id: string | null;
  is_solution: boolean;
  reaction_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  author?: Profile;
  quoted_reply?: ForumReply;
  reactions?: ForumReaction[];
}

export interface ForumTopic {
  id: string;
  sector_id: string | null;
  category_id: string | null;
  author_id: string;
  title: string;
  content: string;
  status: ForumTopicStatus;
  is_pinned: boolean;
  is_hot: boolean;
  views: number;
  reply_count: number;
  reaction_count: number;
  last_reply_at: string | null;
  tags?: string[];
  visibility: 'public' | 'secteur' | 'membres';
  created_at: string;
  updated_at: string;
  // Relations
  author?: Profile;
  sector?: ForumSector;
  category?: ForumCategory;
  topic_tags?: { tag: ForumTag }[];
  replies?: ForumReply[];
}

// ─── Réactions, abonnements, signalements, modération ─────────────────────────

export interface ForumReaction {
  id: string;
  topic_id: string | null;
  reply_id: string | null;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ForumFollow {
  id: string;
  topic_id: string;
  user_id: string;
  notify_replies: boolean;
  created_at: string;
}

export interface ForumReport {
  id: string;
  reporter_id: string;
  topic_id: string | null;
  reply_id: string | null;
  reason:
    | 'hors_sujet'
    | 'insulte'
    | 'spam'
    | 'desinformation'
    | 'contenu_sensible'
    | 'autre';
  description: string | null;
  status: 'en_attente' | 'examine' | 'resolu' | 'rejete';
  created_at: string;
}

export interface ForumModerationLog {
  id: string;
  moderator_id: string;
  topic_id: string | null;
  reply_id: string | null;
  action:
    | 'masquer'
    | 'verrouiller'
    | 'deplacer'
    | 'epingler'
    | 'archiver'
    | 'supprimer'
    | 'fusionner'
    | 'suspendre';
  reason: string | null;
  created_at: string;
  moderator?: Profile;
}

// ─── Legacy aliases (backward compat) ─────────────────────────────────────────

/** @deprecated Utiliser ForumTopic */
export interface ForumPost {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_closed: boolean;
  views: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  category?: ForumCategory;
  comments?: ForumComment[];
  comment_count?: number;
}

/** @deprecated Utiliser ForumReply */
export interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}
