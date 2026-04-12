// ─── unreadFetch — récupération et mapping de l'état non-lu ──────────────────
//
// Appelle /api/messages/unread (admin client côté serveur, bypass RLS) pour
// obtenir participations + messages candidats + count notifications.
// Met à jour readMap et unreadMap, puis appelle setCounts.

import { createClient } from '@/lib/supabase/client';
import { isSystem, totalUnreadMsgs } from './unreadHelpers';

type SetCounts = (c: { messages: number; notifications: number; total: number }) => void;

export type UnreadRefs = {
  fetchingRef:  React.MutableRefObject<boolean>;
  mountedRef:   React.MutableRefObject<boolean>;
  readMapRef:   React.MutableRefObject<Record<string, number>>;
  unreadMapRef: React.MutableRefObject<Record<string, Set<string>>>;
};

/**
 * Interroge l'API /api/messages/unread, reconstruit readMap + unreadMap,
 * puis met à jour les compteurs via setCounts.
 *
 * Un verrou `fetchingRef` évite les appels concurrents ; un timeout de 15 s
 * libère automatiquement le verrou en cas de blocage réseau.
 */
export async function fetchCounts(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refs: UnreadRefs,
  setCounts: SetCounts,
): Promise<void> {
  if (refs.fetchingRef.current) return;
  refs.fetchingRef.current = true;
  const lockTimeout = setTimeout(() => { refs.fetchingRef.current = false; }, 15000);

  try {
    // Calculer la date la plus ancienne dans readMap pour filtrer les messages
    const convIds = Object.keys(refs.readMapRef.current);
    const oldestTs  = convIds.length > 0
      ? Math.min(...convIds.map(cid => refs.readMapRef.current[cid]))
      : 0;
    const oldestISO = new Date(Math.max(oldestTs, 0)).toISOString();

    // Token Bearer pour l'auth côté API route
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/messages/unread?since=${encodeURIComponent(oldestISO)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => null);

    if (!res || !res.ok) {
      if (res?.status === 401 && refs.mountedRef.current) {
        setCounts({ messages: 0, notifications: 0, total: 0 });
      }
      return;
    }

    const data = await res.json().catch(() => null);
    if (!data) return;

    const {
      participations = [],
      messages: candidateMsgs = [],
      notifications: unreadNotifs = 0,
    } = data as {
      participations: Array<{ conversation_id: string; last_read_at: string | null; joined_at: string | null }>;
      messages:       Array<{ id: string; conversation_id: string; created_at: string; content: string; sender_id: string }>;
      notifications:  number;
    };

    // ── Mettre à jour readMap depuis la BDD (prend le max : DB vs mémoire) ──
    participations.forEach(c => {
      const ref      = c.last_read_at || c.joined_at || '1970-01-01T00:00:00Z';
      const tsFromDB = new Date(ref).getTime();
      const tsInMem  = refs.readMapRef.current[c.conversation_id] ?? 0;
      refs.readMapRef.current[c.conversation_id] = Math.max(tsFromDB, tsInMem);
    });

    // ── Reconstruire unreadMap ───────────────────────────────────────────────
    const newUnreadMap: Record<string, Set<string>> = {};
    participations.forEach(c => { newUnreadMap[c.conversation_id] = new Set(); });

    for (const m of candidateMsgs) {
      const readAt = refs.readMapRef.current[m.conversation_id] ?? 0;
      const msgAt  = new Date(m.created_at).getTime();
      if (msgAt > readAt && !isSystem(m.content || '')) {
        if (!newUnreadMap[m.conversation_id]) newUnreadMap[m.conversation_id] = new Set();
        newUnreadMap[m.conversation_id].add(m.id);
      }
    }
    refs.unreadMapRef.current = newUnreadMap;

    const msgCount = totalUnreadMsgs(refs.unreadMapRef.current);
    if (refs.mountedRef.current) {
      setCounts({ messages: msgCount, notifications: unreadNotifs, total: msgCount + unreadNotifs });
    }
  } catch (err) {
    console.warn('[useUnreadCounts] fetchCounts error:', err);
  } finally {
    clearTimeout(lockTimeout);
    refs.fetchingRef.current = false;
  }
}
