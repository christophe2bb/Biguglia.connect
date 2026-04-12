// ─── Forum [id] — shared types ─────────────────────────────────────────────────
import { ForumTopic, ForumReply, ForumSector, ForumCategory } from '@/types';

/** ForumTopic extended with v2-specific optional fields */
export type TopicExtended = ForumTopic & {
  post_type?: string;
  urgency?: string;
  is_resolved?: boolean;
  sector?: ForumSector | null;
  category?: (ForumCategory & { icon?: string }) | null;
};

/** Photo row from forum_topic_photos */
export interface TopicPhoto {
  url: string;
  display_order: number;
}

/** Return type of useTopicPage */
export interface UseTopicPageReturn {
  topic:          TopicExtended | null;
  replies:        ForumReply[];
  topicPhotos:    TopicPhoto[];
  loading:        boolean;
  newReply:       string;
  quotedReply:    ForumReply | null;
  submitting:     boolean;
  isFollowing:    boolean;
  copied:         boolean;
  lightboxIndex:  number | null;
  setNewReply:    (v: string) => void;
  setLightboxIndex: (v: number | null | ((prev: number | null) => number | null)) => void;
  submitReply:    (e: React.FormEvent) => Promise<void>;
  deleteReply:    (id: string) => Promise<void>;
  deleteTopic:    () => Promise<void>;
  moderateAction: (action: 'verrouiller' | 'deverrouiller' | 'epingler' | 'archiver') => Promise<void>;
  markSolution:   (replyId: string, val: boolean) => Promise<void>;
  quoteReply:     (reply: ForumReply) => void;
  cancelQuote:    () => void;
  toggleFollow:   () => Promise<void>;
  copyLink:       () => void;
  toggleResolved: () => Promise<void>;
  replyRef:       React.RefObject<HTMLTextAreaElement>;
}
