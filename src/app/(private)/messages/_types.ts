import { Conversation, Profile } from '@/types';
import React from 'react';

// ─── Types partagés — Messages list page ─────────────────────────────────────

/** Conversation enrichie avec infos de l'autre participant et prévisualisation */
export interface ConvWithOther extends Conversation {
  other_user?: Profile;
  last_message_text?: string;
  last_message_at?: string;
  unread_count?: number;
}

/** Onglets principaux + onglets dynamiques par type de contenu */
export type TabId = 'all' | 'unread' | 'to_handle' | string;

/** Configuration d'un onglet principal */
export interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

/** Configuration d'un type de contenu lié */
export interface RelatedTypeConfig {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
  tab: string;
}

/** Paramètres passés au hook useConversationList */
export interface UseConversationListParams {
  /** Profil de l'utilisateur connecté (null tant que authLoading=true) */
  profileId: string | null;
  /** authLoading — on n'agit pas tant que l'auth est en cours d'initialisation */
  authLoading: boolean;
}

/** Valeur retournée par useConversationList */
export interface ConversationListState {
  conversations: ConvWithOther[];
  loading: boolean;
  deletingConv: string | null;
  confirmConv: string | null;
  setConfirmConv: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  handleDeleteConversation: (convId: string) => Promise<void>;
  handleConvClick: (conv: ConvWithOther, localReadMapRef: React.MutableRefObject<Record<string, number>>) => void;
  localReadMapRef: React.MutableRefObject<Record<string, number>>;
}
