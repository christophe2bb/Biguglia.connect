/**
 * src/types/messages.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Types du module Messagerie : conversations, participants, messages.
 */

import type { Profile } from './user';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  created_at: string;
  sender?: Profile;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at?: string;
  profile?: Profile;
}

export interface Conversation {
  id: string;
  subject?: string;
  related_type?:
    | 'service_request'
    | 'listing'
    | 'equipment'
    | 'general'
    | 'help_request'
    | 'collection_item'
    | 'lost_found'
    | 'association'
    | 'outing'
    | null;
  related_id?: string | null;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  participants?: ConversationParticipant[];
  unread_count?: number;
}
