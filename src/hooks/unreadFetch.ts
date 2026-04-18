// ─── unreadFetch — récupération et mapping de l'état non-lu ──────────────────
//
// Appelle /api/messages/unread (admin client côté serveur, bypass RLS) pour
// obtenir participations + messages candidats + count notifications.
// Met à jour readMap et unreadMap, puis appelle setCounts.
//
// ── Optimisations v2 ──────────────────────────────────────────────────────────
//   1. Token Bearer mis en cache module-level (évite un getSession() réseau
//      à chaque appel de fetchCounts — économie ~150-200 ms / appel).
//   2. `is_system` calculé côté serveur → payload JSON réduit (plus de `content`).
//   3. `since` construit depuis readMap → borne inférieure correcte dès le 1er appel.

import { createClient } from '@/lib/supabase/client';
import { totalUnreadMsgs } from './unreadHelpers';

type SetCounts = (c: { messages: number; notifications: number; total: number }) => void;

export type UnreadRefs = {
  fetchingRef:  React.MutableRefObject<boolean>;
  mountedRef:   React.MutableRefObject<boolean>;
  readMapRef:   React.MutableRefObject<Record<string, number>>;
  unreadMapRef: React.MutableRefObject<Record<string, Set<string>>>;
};

// ── Cache module-level du token Bearer ───────────────────────────────────────
// Évite un aller-retour réseau vers Supabase Auth à chaque appel de fetchCounts.
// Le token est rafraîchi automatiquement à l'expiration (< Date.now()).
let _cachedToken: string | null    = null;
let _tokenExpiresAt: number        = 0;    // ms

async function getBearerToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const now = Date.now();
  // Marge de 60 s avant expiration pour éviter d'envoyer un token expirant
  if (_cachedToken && _tokenExpiresAt - now > 60_000) return _cachedToken;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    _cachedToken    = null;
    _tokenExpiresAt = 0;
    return null;
  }
  _cachedToken    = session.access_token;
  // expires_at est en secondes (standard JWT)
  _tokenExpiresAt = (session.expires_at ?? 0) * 1000;
  return _cachedToken;
}

/** Invalide le cache de token (ex. à la déconnexion). */
export function invalidateBearerCache(): void {
  _cachedToken    = null;
  _tokenExpiresAt = 0;
}

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
  const lockTimeout = setTimeout(() => { refs.fetchingRef.current = false; }, 15_000);

  try {
    // ── Calculer `since` depuis le readMap (timestamp le plus ancien) ────────
    // Si readMap est vide (1er appel), on n'envoie pas since=1970 : l'API
    // utilisera alors le joined_at minimal des participations comme borne basse.
    const convIds = Object.keys(refs.readMapRef.current);
    let sinceParam = '';
    if (convIds.length > 0) {
      const oldestTs  = Math.min(...convIds.map(cid => refs.readMapRef.current[cid]));
      // 60 s de marge pour absorber les messages arrivés juste avant la lecture
      const effectiveTs = Math.max(oldestTs - 60_000, 0);
      sinceParam = `&since=${encodeURIComponent(new Date(effectiveTs).toISOString())}`;
    }

    // ── Token Bearer mis en cache (évite getSession() réseau à chaque appel) ─
    const token = await getBearerToken(supabase);

    const res = await fetch(`/api/messages/unread?v=2${sinceParam}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Permet au navigateur de réutiliser la réponse mise en cache (max-age=5 s)
      // sans recréer de connexion TCP inutile.
      cache: 'default',
    }).catch(() => null);

    if (!res || !res.ok) {
      if (res?.status === 401) {
        // Token expiré — invalider le cache et forcer un refresh
        invalidateBearerCache();
        if (refs.mountedRef.current) {
          setCounts({ messages: 0, notifications: 0, total: 0 });
        }
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
      // v2 : is_system calculé côté serveur (plus de `content` dans le payload)
      messages:       Array<{ id: string; conversation_id: string; created_at: string; sender_id: string; is_system: boolean }>;
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
      if (m.is_system) continue;                                   // filtré côté serveur
      const readAt = refs.readMapRef.current[m.conversation_id] ?? 0;
      const msgAt  = new Date(m.created_at).getTime();
      if (msgAt > readAt) {
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
