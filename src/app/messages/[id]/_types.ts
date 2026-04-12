/**
 * Types partagés — module conversation
 * Utilisés par le hook, les composants et la page.
 */

import { Message, Profile } from '@/types';

/** Profile enrichi avec l'email retourné par l'API (fallback si full_name null ou vide) */
export type ProfileWithEmail = Profile & { email?: string | null };

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
