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
// ── Pourquoi « cannot add postgres_changes callbacks after subscribe() » ──────
//
// supabase.channel(name) est un REGISTRE par nom (topic). Si un canal portant
// ce nom existe déjà dans supabase.getChannels(), il retourne le MÊME objet —
// même s'il est encore en état « joined ». Appeler .on() sur cet objet après
// que .subscribe() a été invoqué lève l'exception ci-dessus.
//
// Cela se produit lors du cycle :
//   1. Mount 1  → canal créé + subscribe() appelé → état joined
//   2. Cleanup  → removeChannel() lancé (async — le canal reste dans la liste
//                 interne de Supabase jusqu'à confirmation WebSocket)
//   3. Mount 2  → supabase.channel(même nom) → MÊME objet, déjà joined
//               → .on() → exception
//   4. catch    → retry dans 1 s → même situation → BOUCLE INFINIE
//
// Solution en 3 points :
//   A. Vérifier via supabase.getChannels() si un canal actif (joined/joining)
//      porte déjà le topic cible → le stocker dans channelRef sans le recréer.
//   B. Supprimer le retry dans le catch : ce retry était la source de la boucle
//      infinie. Sans reconnexion immédiate, l'exception est absorbée et le
//      polling de secours prend le relais.
//   C. Délai 200 ms (au lieu de 50) après removeChannel pour laisser Supabase
//      retirer le canal de son registre interne avant toute tentative de recréation.

import { startTransition } from 'react';
import { createClient, safeRemoveChannel } from '@/lib/supabase/client';
import { isSystem, totalUnreadMsgs } from './unreadHelpers';
import { fetchCounts, type UnreadRefs } from './unreadFetch';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

/** Intervalle du polling de secours quand le canal Realtime est indisponible. */
const REALTIME_POLL_MS = 15_000;

/** Délai de debounce pour les refetch déclenchés par événements Realtime (ms). */
const REALTIME_DEBOUNCE_MS = 1_000;

/**
 * Délai d'attente après removeChannel() avant de tenter de recréer le canal.
 * 200 ms > 50 ms : laisse Supabase retirer le canal de son registre interne
 * (supabase.channels[]) après la confirmation WebSocket du leave.
 */
const RECREATE_DELAY_MS = 200;

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
 * @param signal AbortSignal — si déclenché avant SUBSCRIBED, le canal orphelin
 *               est supprimé et la souscription abandonnée silencieusement.
 */
export function connectRealtime(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refs: RealtimeRefs,
  setCounts: SetCounts,
  signal?: AbortSignal,
): void {
  // Si le signal est déjà déclenché (cleanup React Strict Mode), ne rien faire.
  if (signal?.aborted) return;

  const channelName = `unread-counts-${userId}`;

  // ── Vérifier si un canal actif porte déjà ce nom ────────────────────────────
  // supabase.channel(name) retourne TOUJOURS le même objet si le topic existe
  // dans le registre interne. Si ce canal est déjà joined/joining, l'utiliser
  // directement sans recréer (évite le « cannot add callbacks after subscribe() »).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingChannels = (supabase as unknown as { getChannels?: () => Array<{ topic: string; state?: string }> }).getChannels?.() ?? [];
  const existingActive = existingChannels.find(
    (c) => c.topic === `realtime:${channelName}` &&
           (c.state === 'joined' || c.state === 'joining')
  );

  if (existingActive) {
    // Canal actif trouvé — le stocker dans la ref et attendre SUBSCRIBED.
    // Les callbacks sont déjà enregistrés depuis la souscription précédente.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    refs.channelRef.current = existingActive as unknown as ReturnType<ReturnType<typeof createClient>['channel']>;
    return;
  }

  // ── Nettoyage du canal précédent ─────────────────────────────────────────────
  // safeRemoveChannel() attend que l'état ne soit plus 'joining' avant de
  // supprimer — évite « WebSocket is closed before the connection is established ».
  const hadPreviousChannel = !!refs.channelRef.current;
  if (refs.channelRef.current) {
    const old = refs.channelRef.current;
    refs.channelRef.current = null;
    safeRemoveChannel(supabase, old).catch(() => null);
  }

  /**
   * Crée effectivement le canal Realtime.
   * Le try/catch absorbe toute exception (ex. race condition résiduelle) mais
   * NE PLANIFIE PAS de retry — le polling de secours suffit, et un retry
   * immédiat recréerait la boucle infinie.
   */
  const doConnect = () => {
    if (signal?.aborted || !refs.mountedRef.current) return;

    // Double-vérification : si entre le setTimeout et maintenant un canal actif
    // a été recréé (ex. double-invoke React Strict Mode), l'utiliser.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channels = (supabase as unknown as { getChannels?: () => Array<{ topic: string; state?: string }> }).getChannels?.() ?? [];
    const alreadyActive = channels.find(
      (c) => c.topic === `realtime:${channelName}` &&
             (c.state === 'joined' || c.state === 'joining')
    );
    if (alreadyActive) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      refs.channelRef.current = alreadyActive as unknown as ReturnType<ReturnType<typeof createClient>['channel']>;
      return;
    }

    try {
      const channel = supabase
        .channel(channelName)

        // ── Nouveau message ──────────────────────────────────────────────────
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
            startTransition(() => {
              setCounts(prev => ({ messages: n, notifications: prev.notifications, total: n + prev.notifications }));
            });
          }
        })

        // ── Nouvelle notification ────────────────────────────────────────────
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => {
          startTransition(() => {
            setCounts(prev => ({ ...prev, notifications: prev.notifications + 1, total: prev.total + 1 }));
          });
        })

        // ── Notification mise à jour → refetch debounced ─────────────────────
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => {
          scheduleRealtimeFetch(supabase, userId, refs, setCounts);
        })

        // ── Statut du canal ──────────────────────────────────────────────────
        .subscribe((status: string) => {
          // Signal déclenché avant SUBSCRIBED → retirer le canal orphelin.
          if (signal?.aborted) {
            safeRemoveChannel(supabase, channel).catch(() => null);
            return;
          }

          if (!refs.mountedRef.current) return;

          if (status === 'SUBSCRIBED') {
            refs.reconnectIdx.current = 0;
            if (refs.realtimePollRef.current) {
              clearInterval(refs.realtimePollRef.current);
              refs.realtimePollRef.current = null;
            }
            scheduleRealtimeFetch(supabase, userId, refs, setCounts);

          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Arrêt si max tentatives atteint → polling seul
            if (refs.reconnectIdx.current >= RECONNECT_DELAYS.length - 1) {
              console.warn('[unreadRealtime] max reconnexions atteint, fallback polling uniquement');
              return;
            }
            const delay = RECONNECT_DELAYS[refs.reconnectIdx.current];
            refs.reconnectIdx.current = refs.reconnectIdx.current + 1;
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
      // Absorber l'exception sans planifier de retry.
      // IMPORTANT : ne PAS appeler setTimeout(() => connectRealtime(...)) ici —
      // cela recrée la boucle infinie « cannot add callbacks after subscribe() ».
      // Le polling de secours (REALTIME_POLL_MS) assure la continuité des données.
      console.warn('[unreadRealtime] connectRealtime error (absorbé, polling actif) :', err);

      // Activer le polling de secours si pas encore actif
      if (refs.mountedRef.current && !refs.realtimePollRef.current) {
        refs.realtimePollRef.current = setInterval(() => {
          if (refs.mountedRef.current) {
            fetchCounts(supabase, userId, refs, setCounts as Parameters<typeof fetchCounts>[3]);
          }
        }, REALTIME_POLL_MS);
      }
    }
  };

  if (hadPreviousChannel) {
    // Délai 200 ms pour laisser Supabase retirer le canal de son registre
    // interne (supabase.channels[]) après le leave WebSocket.
    setTimeout(doConnect, RECREATE_DELAY_MS);
  } else {
    doConnect();
  }
}
