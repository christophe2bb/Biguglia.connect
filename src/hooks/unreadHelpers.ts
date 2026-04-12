// ─── unreadHelpers — fonctions pures partagées ────────────────────────────────

/**
 * Détecte les messages système (auto-générés à la création de conversation).
 * Ces messages ne doivent PAS incrémenter le compteur non-lu.
 */
export function isSystem(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    content.startsWith('👋') ||
    content.startsWith('✅') ||
    content.startsWith('🤝') ||
    lower.includes('je vous contacte') ||
    lower.includes('échange confirmé') ||
    lower.includes('echange confirme') ||
    lower.includes('conversation créée') ||
    lower.includes('conversation creee') ||
    lower.includes('via biguglia connect')
  );
}

/**
 * Somme le nombre total de messages non lus depuis unreadMap.
 * unreadMap : conv_id → Set<msg_id>
 */
export function totalUnreadMsgs(unreadMap: Record<string, Set<string>>): number {
  return Object.values(unreadMap).reduce((sum, set) => sum + set.size, 0);
}
