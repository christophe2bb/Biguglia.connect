'use client';

/**
 * useUnreadCounts — Badge de messages non lus + notifications.
 *
 * Utilise l'API /api/messages/unread (admin client) pour contourner la
 * récursion infinie dans les politiques RLS de conversation_participants
 * et messages. Le realtime Supabase fonctionne en parallèle (incrément
 * immédiat sans SELECT lourd).
 *
 * Modules extraits :
 *   unreadHelpers.ts  — isSystem(), totalUnreadMsgs()
 *   unreadFetch.ts    — fetchCounts() via API admin + cache token Bearer
 *   unreadRealtime.ts — connectRealtime() + reconnexion exponentielle
 *
 * ── Optimisations v2 ──────────────────────────────────────────────────────────
 *   1. SAFE_POLL_MS : 30 s → 60 s (le realtime couvre les mises à jour temps réel ;
 *      le polling est uniquement un filet de sécurité).
 *   2. Debounce 500 ms sur fetchCounts déclenché par événements (visibilitychange,
 *      messages-read, new-notification) pour absorber les rafales d'événements
 *      sans empiler les requêtes HTTP.
 *   3. invalidateBearerCache() appelé à l'unmount pour forcer un refresh du token
 *      à la prochaine connexion (changement d'utilisateur).
 *
 * ── Fix BIGUGLIA-CONNECT-NEXTJS-6 v2 (AbortController) ───────────────────────
 *   Remplacement du verrou connectingRef par un AbortController créé à chaque
 *   invocation de l'effet. En React Strict Mode le cleanup avorte le signal
 *   avant que le second mount ne lance connectRealtime — garantissant qu'un seul
 *   canal actif existe à la fois sans aucune condition de course.
 *
 * ── Dépendances de l'effet intentionnellement limitées à [profileId] ──────────
 *   L'effet ne dépend que de `profileId` car :
 *   - `scheduleFetch` est définie inline dans l'effet → stable, pas besoin de
 *     l'extraire en useCallback (évite une dépendance circulaire).
 *   - Les refs (channelRef, reconnectRef, etc.) sont des objets stables par
 *     définition (useRef) : leur identité ne change jamais entre les renders,
 *     seul leur .current évolue. ESLint ne peut pas le savoir statiquement.
 *   - Ajouter ces valeurs dans le tableau de dépendances créerait des cycles
 *     d'effet infinis ou des reconnexions realtime inutiles.
 *   Conserver ce commentaire pour justifier l'absence de disable inline.
 */

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { fetchCounts, invalidateBearerCache } from './unreadFetch';
import { connectRealtime }                     from './unreadRealtime';
import { totalUnreadMsgs }                     from './unreadHelpers';

interface UnreadCounts {
  messages:      number;
  notifications: number;
  total:         number;
}

/** Intervalle du polling de sécurité (filet de sécurité — le realtime est prioritaire). */
const SAFE_POLL_MS = 60_000;

/** Délai de debounce pour les refetch déclenchés par événements (ms). */
const DEBOUNCE_MS = 500;

const ZERO: UnreadCounts = { messages: 0, notifications: 0, total: 0 };

export function useUnreadCounts(): UnreadCounts {
  const { profile } = useAuthStore();
  const profileId = profile?.id ?? null;
  const [counts, setCounts] = useState<UnreadCounts>(ZERO);

  // ── Refs partagées entre fetch, realtime et l'effet ──────────────────────
  // Toutes ces refs sont intentionnellement stables (useRef) : leur identité
  // ne change jamais entre les renders. Seul leur .current évolue.
  // Elles ne doivent PAS figurer dans le tableau de dépendances de useEffect.
  const mountedRef       = useRef(true);
  const fetchingRef      = useRef(false);
  const hookStartRef     = useRef(Date.now());
  const readMapRef       = useRef<Record<string, number>>({});
  const unreadMapRef     = useRef<Record<string, Set<string>>>({});
  const channelRef       = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const reconnectRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx     = useRef(0);
  const realtimePollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const safePollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Debounce : évite d'empiler les appels déclenchés par rafales d'événements. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleFetch = (supabase: ReturnType<typeof createClient>, userId: string, refs: Parameters<typeof fetchCounts>[2]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      fetchingRef.current = false;
      fetchCounts(supabase, userId, refs, setCounts);
    }, DEBOUNCE_MS);
  };

  // Dépendance unique : profileId.
  // Voir le JSDoc du module pour la justification complète.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    mountedRef.current    = true;
    fetchingRef.current   = false;
    hookStartRef.current  = Date.now();
    readMapRef.current    = {};
    unreadMapRef.current  = {};

    if (!profileId) { setCounts(ZERO); return; }

    const supabase = createClient();
    const userId   = profileId;

    // ── AbortController : annule la souscription si le composant se démonte
    // avant que le canal ne soit établi (React Strict Mode double-invoke).
    // Contrairement à connectingRef, ce mécanisme ne peut pas être court-circuité
    // par un reset explicite : le signal reste aborted une fois déclenché.
    const abortController = new AbortController();

    // Capturer les refs de timers au début de l'effet pour le cleanup.
    // reconnectRef et realtimePollRef sont des handles de timer (setTimeout/setInterval)
    // assignés par connectRealtime(). La capture ici garantit que le cleanup
    // annule bien les timers créés dans cette invocation de l'effet,
    // même si les refs ont été réassignées depuis (ex. React Strict Mode).
    // Note : ces captures sont lues dans le cleanup return ci-dessous.
    const reconnectSnapshot    = reconnectRef;
    const realtimePollSnapshot = realtimePollRef;

    const refs = {
      fetchingRef, mountedRef, readMapRef, unreadMapRef,
      channelRef, reconnectRef, reconnectIdx, realtimePollRef, hookStartRef,
    };

    // Chargement initial + realtime
    fetchCounts(supabase, userId, refs, setCounts);
    connectRealtime(supabase, userId, refs, setCounts, abortController.signal);

    // Polling de sécurité toutes les 60 s (filet de sécurité uniquement)
    safePollRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      fetchingRef.current = false;
      fetchCounts(supabase, userId, refs, setCounts);
    }, SAFE_POLL_MS);

    // Refetch au retour sur l'onglet (debounced pour éviter les rafales)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleFetch(supabase, userId, refs);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── Événement 'messages-read' (depuis markAsRead dans [id]/page.tsx) ────
    const handleMessagesRead = (e: Event) => {
      const { conversationId: convId, readAt = Date.now() } =
        (e as CustomEvent<{ conversationId?: string; readAt?: number }>).detail ?? {};
      if (convId) {
        const effective = Math.max(readAt, readMapRef.current[convId] ?? 0);
        readMapRef.current[convId]   = effective;
        unreadMapRef.current[convId] = new Set();
        // Persister via l'API admin (bypass RLS) — fire & forget
        supabase.auth.getSession().then(({ data: { session } }) => {
          fetch('/api/messages/unread', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ conversationId: convId, lastReadAt: new Date(effective).toISOString() }),
          }).catch(() => null);
        });
      }
      const n = totalUnreadMsgs(unreadMapRef.current);
      if (mountedRef.current) {
        setCounts(prev => ({ messages: n, notifications: prev.notifications, total: n + prev.notifications }));
      }
      // Confirmation BDD après 5 s (debounced — absorbe les lectures rapides)
      scheduleFetch(supabase, userId, refs);
    };
    window.addEventListener('messages-read', handleMessagesRead);

    // ── Événement 'new-notification' ─────────────────────────────────────────
    const handleNewNotif = () => {
      scheduleFetch(supabase, userId, refs);
    };
    window.addEventListener('new-notification', handleNewNotif);

    return () => {
      // Avorter le signal en premier : si connectRealtime n'a pas encore reçu
      // le statut SUBSCRIBED, son callback subscribe() verra signal.aborted===true
      // et retirera le canal orphelin lui-même, sans que le cleanup ait besoin
      // de connaître la ref du canal.
      abortController.abort();

      mountedRef.current = false;

      // Capturer les .current en variables locales avant de les utiliser dans le cleanup.
      // Bonne pratique React : la valeur de ref.current peut changer entre le moment
      // où le cleanup est enregistré et celui où il s'exécute.
      const activeChannel      = channelRef.current;
      const activeReconnect    = reconnectSnapshot.current;
      const activeRealtimePoll = realtimePollSnapshot.current;
      const activeSafePoll     = safePollRef.current;
      const activeDebounce     = debounceRef.current;

      // Nettoyage du canal actif (si la souscription était déjà établie).
      if (activeChannel) {
        channelRef.current = null;
        supabase.removeChannel(activeChannel).catch(() => null);
      }
      if (activeReconnect)    clearTimeout(activeReconnect);
      if (activeRealtimePoll) clearInterval(activeRealtimePoll);
      if (activeSafePoll)     clearInterval(activeSafePoll);
      if (activeDebounce)     clearTimeout(activeDebounce);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('messages-read',    handleMessagesRead);
      window.removeEventListener('new-notification', handleNewNotif);
      // Invalide le cache token pour le prochain utilisateur
      invalidateBearerCache();
    };
  }, [profileId]); // dépendance unique — voir JSDoc du module

  return counts;
}
