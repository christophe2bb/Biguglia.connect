/**
 * Types partagés — module conversation
 * Utilisés par le hook, les composants et la page.
 */

import { Message, Profile } from '@/types';

/** Profile enrichi avec l'email retourné par l'API (fallback si full_name null ou vide) */
export type ProfileWithEmail = Profile & { email?: string | null };

// ─── Contrat de réponse GET /api/messages/conversation/[id] ──────────────────
// Ce type est la source de vérité partagée entre le serveur (route.ts) et le
// client (useConversationPage). Toute modification du shape JSON DOIT passer ici.

/** Un participant de la conversation tel que retourné par l'API */
export interface ConversationParticipantApi {
  /** UUID Supabase */
  id: string;
  /** Nom affiché calculé côté serveur : full_name → partie locale email → "Utilisateur" */
  display_name: string;
  avatar_url: string | null;
  email: string | null;
}

/** La conversation elle-même */
export interface ConversationApi {
  id: string;
  subject: string | null;
  related_type: string | null;
  related_id: string | null;
  exchange_status: string | null;
  exchange_confirmed_by: string[] | null;
  exchange_confirmed_at: string | null;
  owner_id: string | null;
  created_by: string | null;
  updated_at: string | null;
}

/** Participation de l'utilisateur courant */
export interface MyParticipationApi {
  user_id: string;
  last_read_at: string | null;
  joined_at: string;
}

/** Message brut tel que retourné par l'API */
export interface MessageApi {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

/**
 * Réponse complète et typée de GET /api/messages/conversation/[id].
 *
 * Invariants garantis par la route :
 *  - `profiles` contient TOUJOURS l'entrée de l'utilisateur courant ET de l'autre participant
 *  - `other_user_id` est null uniquement si la conversation n'a qu'un participant (anomalie)
 *  - `display_name` est toujours une chaîne non vide (jamais null)
 */
export interface ConversationApiResponse {
  conversation: ConversationApi;
  /** UUIDs de tous les participants */
  participants: string[];
  /** Profils enrichis avec display_name calculé serveur */
  profiles: ConversationParticipantApi[];
  /** UUID de l'autre participant (non-courant) — null si non trouvé */
  other_user_id: string | null;
  messages: MessageApi[];
  myParticipation: MyParticipationApi;
}

/** Statut de l'échange bipartite */
export type ExchangeStatus = 'pending_confirmation' | 'done' | null;

/** Données de suivi d'échange portées par la conversation */
export interface ExchangeInfo {
  status: ExchangeStatus;
  confirmedBy: string[];
  confirmedAt: string | null;
  relatedType: string | null;
  relatedId: string | null;
  otherUserId: string | null;
}

/** Message enrichi avec le profil de l'expéditeur (optionnel, chargé async) */
export type MessageWithSender = Message & {
  sender?: Profile;
  is_system?: boolean;
};

/** Entrée d'un groupe de messages (pour les séparateurs de date) */
export interface GroupedMessage {
  msg: MessageWithSender;
  showSep: boolean;
}
