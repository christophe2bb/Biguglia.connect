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
//
// Fix performance violations ('message' handler 248 ms, 'setTimeout' 193 ms) :
//   Les callbacks Realtime s'exécutent dans le handler WebSocket « message »
//   sur le thread principal. Appeler setCounts() directement déclenche un
//   re-render React synchrone dans ce handler — Chrome le signale comme
//   violation de performance.
//   Correction : envelopper les mises à jour React dans startTransition pour
//   les rendre non-urgentes et permettre au navigateur de les différer après
//   avoir rendu le frame courant.

import { startTransition } from 'react';
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
 *
 * ── Fix « cannot add postgres_changes callbacks after subscribe() » ────────────
 * Supabase lève cette exception quand `.on()` est appelé sur un canal dont
 * `.subscribe()` a déjà été invoqué. Cela arrive en React Strict Mode (double
 * invoke des effets) ou lors d'un re-montage rapide :
 *
 *   1. Mount 1  → channel A créé + subscribe() appelé
 *   2. Cleanup  → abort signal déclenché, removeChannel(A) lancé (async)
 *   3. Mount 2  → connectRealtime() tente de créer channel B
 *                 OR Supabase réutilise le même objet canal (bug interne)
 *                 → .on() après subscribe() → exception
 *
 * Solution à 3 niveaux :
 *   a. try/catch global : toute exception de la chaîne channel/on/subscribe
 *      est catchée — aucune erreur ne remonte au composant React.
 *   b. Attente async (50 ms) avant de créer le canal si un canal précédent
 *      existait — laisse Supabase finaliser removeChannel() côté WebSocket.
 *   c. Vérification signal après l'attente : si démonté entre-temps, on abandonne.
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

  // Nettoyage du canal précédent.
  // removeChannel() est async côté WebSocket — on null la ref immédiatement
  // pour éviter qu'un autre chemin tente de supprimer le même canal deux fois.
  const hadPreviousChannel = !!refs.channelRef.current;
  if (refs.channelRef.current) {
    const old = refs.channelRef.current;
    refs.channelRef.current = null;
    supabase.removeChannel(old).catch(() => null);
  }

  /**
   * Crée effectivement le canal après un éventuel délai.
   * Wrappé dans un try/catch pour absorber l'exception Supabase
   * « cannot add postgres_changes callbacks after subscribe() ».
   */
  const doConnect = () => {
    // Re-vérifier le signal après l'éventuelle attente async.
    if (signal?.aborted || !refs.mountedRef.current) return;

    try {
      const channel = supabase
        .channel(`unread-counts-${userId}-${Date.now()}`)

        // ── Nouveau message ────────────────────────────────────────────────
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: import('@supabase/realtime-js').RealtimePostgresChangesPayload<Record<string, unknown>>) => {
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
            // startTransition : mise à jour non-urgente → sort du handler WS
            // « message » synchrone → élimine la violation de performance 248 ms.
            startTransition(() => {
              setCounts(prev => ({ messages: n, notifications: prev.notifications, total: n + prev.notifications }));
            });
          }
        })

        // ── Nouvelle notification ──────────────────────────────────────────
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => {
          startTransition(() => {
            setCounts(prev => ({ ...prev, notifications: prev.notifications + 1, total: prev.total + 1 }));
          });
        })

        // ── Notification mise à jour (ex. lu) → refetch debounced ───────────
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => {
          scheduleRealtimeFetch(supabase, userId, refs, setCounts);
        })

        // ── Statut du canal ────────────────────────────────────────────────
        .subscribe((status: string) => {
          // Signal déclenché entre la création du canal et la réponse Realtime :
          // retirer le canal orphelin immédiatement.
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
            // Debounce au SUBSCRIBED : évite un double-fetch si le canal se
            // reconnecte en rafale (ex. réseau instable).
            scheduleRealtimeFetch(supabase, userId, refs, setCounts);

          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Reconnexion exponentielle
            const delay = RECONNECT_DELAYS[Math.min(refs.reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
            refs.reconnectIdx.current = Math.min(refs.reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
            if (refs.reconnectRef.current) clearTimeout(refs.reconnectRef.current);
            refs.reconnectRef.current = setTimeout(() => {
              if (refs.mountedRef.current) connectRealtime(supabase, userId, refs, setCounts);
            }, delay);
            // Polling de secours pendant la reconnexion
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

    } catch (err) {
      // Absorber l'exception Supabase « cannot add postgres_changes callbacks
      // after subscribe() » — peut survenir lors du double-invoke React Strict
      // Mode ou d'un re-montage rapide. Le canal sera recréé à la prochaine
      // tentative (reconnexion exponentielle ou re-montage du composant).
      console.warn('[unreadRealtime] connectRealtime error (ignoré, sera retenté) :', err);

      // Planifier une reconnexion après un court délai pour laisser Supabase
      // finaliser le nettoyage du canal précédent.
      if (refs.mountedRef.current) {
        const retryDelay = RECONNECT_DELAYS[0]; // 1 s
        if (refs.reconnectRef.current) clearTimeout(refs.reconnectRef.current);
        refs.reconnectRef.current = setTimeout(() => {
          if (refs.mountedRef.current) connectRealtime(supabase, userId, refs, setCounts);
        }, retryDelay);
      }
    }
  };

  if (hadPreviousChannel) {
    // Laisser 50 ms à Supabase pour finaliser le removeChannel() WebSocket
    // avant de créer un nouveau canal. Évite le « cannot add callbacks after
    // subscribe() » lors des re-montages rapides (React Strict Mode, fast-refresh).
    setTimeout(doConnect, 50);
  } else {
    doConnect();
  }
}
