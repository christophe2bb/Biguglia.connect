// ─── unreadRealtime — canal Supabase + reconnexion exponentielle ──────────────
//
// Souscrit aux INSERT sur `messages` et `notifications` pour incrémenter le
// compteur instantanément sans refaire de SELECT lourd.
// En cas d'erreur de canal, une reconnexion exponentielle est tentée, et un
// polling de secours (15 s) est activé en attendant la reconnexion.
//
// Intervalles :
//   RECONNECT_DELAYS   : [1 s, 2 s, 5 s, 10 s, 30 s] — backoff exponentiel
//   REALTIME_POLL_MS   : 15 s — polling de secours quand le canal est DOWN
//   (le polling de sécurité global dans useUnreadCounts est à 60 s)
//
// Fix BIGUGLIA-CONNECT-NEXTJS-6 (v2) :
//   - AbortController signal : chaque invocation de connectRealtime reçoit un
//     signal. Si le signal est déclenché (cleanup React Strict Mode, changement
//     d'utilisateur) avant que le canal ne soit souscrit, le callback subscribe
//     s'arrête et le canal orphelin est immédiatement supprimé.
//   - connectingRef supprimé : le verrou n'est plus nécessaire — le signal
//     garantit que seule la dernière invocation prend effet.

import { createClient } from '@/lib/supabase/client';
import { isSystem, totalUnreadMsgs } from './unreadHelpers';
import { fetchCounts, type UnreadRefs } from './unreadFetch';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

/** Intervalle du polling de secours quand le canal Realtime est indisponible. */
const REALTIME_POLL_MS = 15_000;

/** Délai de debounce pour les refetch déclenchés par événements Realtime (ms). */
const REALTIME_DEBOUNCE_MS = 1_000;

/** Map debounce par userId pour éviter les rafales d'événements CDC. */
const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Planifie un fetchCounts avec debounce pour un utilisateur donné.
 * Absorbe les rafales d'événements Postgres CDC (ex. UPDATE notifications
 * en cascade) en ne déclenchant qu'un seul fetch après REALTIME_DEBOUNCE_MS.
 */
function scheduleRealtimeFetch(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refs: RealtimeRefs,
  setCounts: SetCounts,
): void {
  const existing = _debounceTimers.get(userId);
  if (existing) clearTimeout(existing);
  _debounceTimers.set(userId, setTimeout(() => {
    _debounceTimers.delete(userId);
    if (refs.mountedRef.current) {
      refs.fetchingRef.current = false;
      fetchCounts(supabase, userId, refs, setCounts as Parameters<typeof fetchCounts>[3]);
    }
  }, REALTIME_DEBOUNCE_MS));
}

type SetCounts = (
  updater: { messages: number; notifications: number; total: number } |
           ((prev: { messages: number; notifications: number; total: number }) =>
             { messages: number; notifications: number; total: number }),
) => void;

export type RealtimeRefs = UnreadRefs & {
  channelRef:      React.MutableRefObject<ReturnType<ReturnType<typeof createClient>['channel']> | null>;
  reconnectRef:    React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  reconnectIdx:    React.MutableRefObject<number>;
  realtimePollRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  hookStartRef:    React.MutableRefObject<number>;
};

/**
 * Crée (ou recrée) le canal Supabase Realtime.
 *
 * Le paramètre `signal` (AbortSignal) permet au hook appelant d'annuler la
 * souscription si le composant se démonte avant que le canal ne soit établi.
 * C'est le mécanisme principal contre le bug React Strict Mode
 * « cannot add postgres_changes callbacks after subscribe() » : si le signal
 * est déclenché pendant le callback subscribe(), on retire immédiatement le
 * canal orphelin sans rien faire d'autre.
 *
 * - INSERT messages  → incrément local immédiat (sans DB round-trip)
 * - INSERT notifications → incrément notifications
 * - UPDATE notifications → refetch complet (debounced)
 * - CHANNEL_ERROR / TIMED_OUT / CLOSED → reconnexion exponentielle + polling fallback
 */
export function connectRealtime(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refs: RealtimeRefs,
  setCounts: SetCounts,
  signal?: AbortSignal,
): void {
  // Si le signal est déjà déclenché (ex. double appel synchrone), ne rien faire.
  if (signal?.aborted) return;

  // Nettoyage du canal précédent (fire-and-forget : removeChannel est async
  // mais on null immédiatement la ref pour qu'aucun autre chemin ne tente
  // de supprimer le même canal deux fois).
  if (refs.channelRef.current) {
    const old = refs.channelRef.current;
    refs.channelRef.current = null;
    supabase.removeChannel(old).catch(() => null);
  }

  const channel = supabase
    .channel(`unread-counts-${userId}-${Date.now()}`)

    // ── Nouveau message ──────────────────────────────────────────────────────
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new as {
        id: string; sender_id: string; conversation_id: string;
        content: string; created_at: string;
      };
      if (msg.sender_id === userId) return;

      const msgAt       = new Date(msg.created_at).getTime();
      const readAt      = refs.readMapRef.current[msg.conversation_id] ?? 0;
      const convKnown   = msg.conversation_id in refs.readMapRef.current;
      const replayed    = msgAt < refs.hookStartRef.current;
      const alreadyRead = msgAt <= readAt;

      if (!convKnown || isSystem(msg.content || '') || replayed || alreadyRead) return;

      if (!refs.unreadMapRef.current[msg.conversation_id]) {
        refs.unreadMapRef.current[msg.conversation_id] = new Set();
      }
      refs.unreadMapRef.current[msg.conversation_id].add(msg.id);

      const n = totalUnreadMsgs(refs.unreadMapRef.current);
      if (refs.mountedRef.current) {
        setCounts(prev => ({ messages: n, notifications: prev.notifications, total: n + prev.notifications }));
      }
    })

    // ── Nouvelle notification ────────────────────────────────────────────────
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, () => {
      setCounts(prev => ({ ...prev, notifications: prev.notifications + 1, total: prev.total + 1 }));
    })

    // ── Notification mise à jour (ex. lu) → refetch debounced ─────────────────
    // IMPORTANT : on passe par scheduleRealtimeFetch (debounce 1 s) pour absorber
    // les rafales d'événements UPDATE CDC (ex. mark-all-read déclenche N updates
    // simultanés qui sinon lanceraient N fetchCounts en parallèle).
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, () => {
      scheduleRealtimeFetch(supabase, userId, refs, setCounts);
    })

    // ── Statut du canal ──────────────────────────────────────────────────────
    .subscribe(status => {
      // Si le signal a été déclenché (composant démonté entre la création du
      // canal et la réponse du serveur Realtime), retirer immédiatement le
      // canal orphelin et ne rien faire d'autre. Cela évite le bug React Strict
      // Mode : le canal créé lors du premier mount (déjà SUBSCRIBED) est retiré
      // proprement avant que le second mount ne tente d'en créer un nouveau.
      if (signal?.aborted) {
        supabase.removeChannel(channel).catch(() => null);
        return;
      }

      if (!refs.mountedRef.current) return;

      if (status === 'SUBSCRIBED') {
        refs.reconnectIdx.current = 0;
        if (refs.realtimePollRef.current) {
          clearInterval(refs.realtimePollRef.current);
          refs.realtimePollRef.current = null;
        }
        // Debounce au SUBSCRIBED aussi : évite un double-fetch si le canal
        // se reconnecte en rafale (ex. réseau instable).
        scheduleRealtimeFetch(supabase, userId, refs, setCounts);

      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        // Reconnexion exponentielle
        const delay = RECONNECT_DELAYS[Math.min(refs.reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
        refs.reconnectIdx.current = Math.min(refs.reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
        if (refs.reconnectRef.current) clearTimeout(refs.reconnectRef.current);
        refs.reconnectRef.current = setTimeout(() => {
          if (refs.mountedRef.current) connectRealtime(supabase, userId, refs, setCounts);
        }, delay);
        // Polling de secours pendant la reconnexion (15 s — moins agressif que 10 s)
        if (!refs.realtimePollRef.current) {
          refs.realtimePollRef.current = setInterval(() => {
            if (refs.mountedRef.current) {
              fetchCounts(supabase, userId, refs, setCounts as Parameters<typeof fetchCounts>[3]);
            }
          }, REALTIME_POLL_MS);
        }
      }
    });

  refs.channelRef.current = channel;
}
