/**
 * Utilitaires — module conversation
 *
 * getDisplayName  : délègue à lib/utils displayName (full_name → email local → fallback)
 * getQuickReplies : suggestions contextuelles selon related_type
 * groupByDay      : insère un booléen showSep pour les séparateurs de date
 */

import { displayName as libDisplayName } from '@/lib/utils';
import { ProfileWithEmail, MessageWithSender, GroupedMessage } from './_types';

// ─── Nom d'affichage ──────────────────────────────────────────────────────────

/**
 * Alias stable exposé aux composants.
 * Gère full_name = '' (DEFAULT BDD), null, et email partial-fallback.
 * Centralise la logique : n'utiliser que cette fonction, jamais user.full_name direct.
 */
export const getDisplayName = (
  user: ProfileWithEmail | null | undefined,
  fallback = 'Utilisateur',
): string => libDisplayName(user, fallback);

// ─── Réponses rapides contextuelles ──────────────────────────────────────────

const QUICK_REPLIES: Record<string, string[]> = {
  listing:         ['Je suis intéressé(e) 🛒', 'Est-il encore disponible ?', 'Quel est votre dernier prix ?', 'Quand peut-on se rencontrer ?'],
  equipment:       ['Je voudrais emprunter ce matériel 🔧', 'Pour quelle durée est-il disponible ?', 'À quel endroit peut-on se retrouver ?', 'Je vous le rends en bon état, promis !'],
  help_request:    ['Je peux vous aider ! 🙋', 'À quelle heure êtes-vous disponible ?', 'Donnez-moi votre adresse.', "J'arrive dès que possible."],
  outing:          ['Je participe avec plaisir ! 🐾', 'Quel est le point de rendez-vous ?', 'Combien de chiens maximum ?', 'J\'ai une question sur le parcours.'],
  service_request: ['Je peux intervenir 🔨', 'Je viendrai estimer le travail.', 'Pouvez-vous partager des photos ?', 'Quel est votre délai souhaité ?'],
};

const DEFAULT_QUICK_REPLIES = ['Bonjour ! 👋', 'Merci pour votre message.', 'À très bientôt !', 'Bien reçu, je reviens vers vous.'];

export function getQuickReplies(relatedType: string | null): string[] {
  if (!relatedType) return ['Bonjour ! 👋', 'Merci pour votre message.', 'Je suis intéressé(e).', "Pouvez-vous me donner plus d'infos ?"];
  return QUICK_REPLIES[relatedType] ?? DEFAULT_QUICK_REPLIES;
}

// ─── Groupement par jour ─────────────────────────────────────────────────────

/**
 * Associe à chaque message un booléen `showSep` indiquant si un séparateur
 * de date doit s'afficher au-dessus.
 */
export function groupByDay(messages: MessageWithSender[]): GroupedMessage[] {
  return messages.map((msg, i) => {
    const msgDate = new Date(msg.created_at).toDateString();
    const prevDate = i > 0 ? new Date(messages[i - 1].created_at).toDateString() : null;
    return { msg, showSep: msgDate !== prevDate };
  });
}
