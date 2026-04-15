import { displayName as libDisplayName } from '@/lib/utils';
import { Profile } from '@/types';
import { ConvWithOther, TabId } from './_types';
import { RELATED_CONFIG, MAIN_TAB_IDS } from './_config';

// ─── Détection messages système ────────────────────────────────────────────────
/**
 * Renvoie true si le message est un message système automatique
 * (intro, confirmation d'échange, etc.) qui ne doit pas compter dans les non-lus.
 */
export function isSystemMsg(content: string): boolean {
  if (!content) return false;
  const l = content.toLowerCase();
  return (
    content.startsWith('👋') ||
    content.startsWith('✅') ||
    content.startsWith('🤝') ||
    l.includes('échange confirmé') ||
    l.includes('echange confirme') ||
    l.includes('je vous contacte') ||
    l.includes('via biguglia connect') ||
    l.includes('conversation créée') ||
    l.includes('conversation creee')
  );
}

// ─── Résolution du nom affiché ─────────────────────────────────────────────────
/**
 * Retourne le nom affiché pour un participant :
 *   1. full_name si présent
 *   2. partie locale de l'email
 *   3. fallback (sujet de la conversation ou "Conversation")
 *
 * Délègue à `displayName` de lib/utils (source unique de vérité).
 */
export function resolveDisplayName(
  user: Profile | null | undefined,
  fallback: string
): string {
  return libDisplayName(user ?? null, fallback || 'Conversation');
}

// ─── Filtrage de la liste ──────────────────────────────────────────────────────
export interface FilterParams {
  activeTab: TabId;
  typeFilter: string | null;
  search: string;
}

/**
 * Filtre la liste des conversations selon l'onglet, le filtre de type et la recherche.
 * Extrait hors du composant pour être testable indépendamment.
 */
export function filterConversations(
  conversations: ConvWithOther[],
  { activeTab, typeFilter, search }: FilterParams
): ConvWithOther[] {
  return conversations.filter(c => {
    // Filtre onglet principal
    if (activeTab === 'unread' && !(c.unread_count && c.unread_count > 0)) return false;
    if (activeTab === 'to_handle') {
      if (!(c.unread_count && c.unread_count > 0)) return false;
      if (!c.related_type || c.related_type === 'general') return false;
    }

    // Filtre onglet par type de contenu (ex: activeTab === 'event')
    if (!MAIN_TAB_IDS.includes(activeTab as typeof MAIN_TAB_IDS[number])) {
      if (c.related_type !== activeTab) return false;
    }

    // Filtre type de contenu (menu déroulant)
    if (typeFilter && c.related_type !== typeFilter) return false;

    // Filtre recherche
    if (search) {
      const q = search.toLowerCase();
      const relatedLabel = c.related_type ? RELATED_CONFIG[c.related_type]?.label?.toLowerCase() : '';
      return !!(
        c.other_user?.full_name?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.last_message_text?.toLowerCase().includes(q) ||
        relatedLabel?.includes(q)
      );
    }

    return true;
  });
}

// ─── Calcul des compteurs d'onglets ───────────────────────────────────────────
export function computeCounts(conversations: ConvWithOther[]) {
  const totalUnread   = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  const unreadCount   = conversations.filter(c => (c.unread_count || 0) > 0).length;
  const toHandleCount = conversations.filter(
    c => (c.unread_count || 0) > 0 && c.related_type && c.related_type !== 'general'
  ).length;
  const presentTypes  = Array.from(
    new Set(conversations.map(c => c.related_type).filter(Boolean) as string[])
  );
  return { totalUnread, unreadCount, toHandleCount, presentTypes };
}
