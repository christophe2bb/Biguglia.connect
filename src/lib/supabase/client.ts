import { createBrowserClient } from '@supabase/ssr';
import { assertSupabaseClientEnv, type SupabasePublicEnv } from './env';

/**
 * Client navigateur Supabase (anon key, côté browser).
 *
 * ── Validation au boot (eager) ───────────────────────────────────────────────
 * `assertSupabaseClientEnv()` est appelée UNE SEULE FOIS à l'import du module,
 * avant tout appel à `createClient()`. Elle :
 *  1. Lit et trim() NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
 *  2. Émet un console.warn si trim() a eu un effet (saut de ligne parasite)
 *  3. Vérifie que l'URL commence par "https://"
 *  4. Vérifie que la clé fait au moins 20 caractères
 *  5. En cas d'erreur, affiche un bloc d'erreur structuré dans la console
 *     puis lève une Error explicite — le module ne s'initialise pas.
 *
 * Symptôme typique sans validation :
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY contient un \n final
 *   → clé encodée %0A dans l'URL WebSocket Supabase Realtime
 *   → toutes les connexions WS échouent en boucle sans message clair.
 *
 * ── Cache ─────────────────────────────────────────────────────────────────────
 * Le résultat de la validation est mis en cache dans `_bootEnv` afin que les
 * appels répétés à `createClient()` n'exécutent pas de validation redondante.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Env validée et nettoyée une fois pour toutes au chargement du module.
 * `null` uniquement dans des contextes de test (module non initialisé).
 */
let _bootEnv: SupabasePublicEnv | null = null;

// ── Boot-time validation ──────────────────────────────────────────────────────
// Exécutée au premier import du module. Toute erreur ici stoppe l'application
// avec un message clair plutôt qu'un échec silencieux de l'auth/Realtime.
try {
  _bootEnv = assertSupabaseClientEnv();
} catch (err) {
  // Re-throw pour que Next.js / le bundler remonte l'erreur correctement.
  // Le message structuré a déjà été loggué par assertSupabaseClientEnv().
  throw err;
}

// ── Singleton navigateur ──────────────────────────────────────────────────────
//
// PROBLÈME résolu : chaque appel à createBrowserClient() crée un objet client
// avec sa propre connexion WebSocket Supabase Realtime. Si plusieurs composants
// (Navbar, useUnreadCounts, handleSignOut…) appellent createClient()
// indépendamment, plusieurs sockets WS sont ouvertes simultanément → storm
// de reconnexions « WebSocket is closed before the connection is established ».
//
// SOLUTION : mémoriser l'instance au niveau du module. Tous les appels à
// createClient() reçoivent le même objet — une seule connexion WS globale.
//
// SÉCURITÉ SSR : le singleton n'est créé que si window est défini (navigateur).
// Côté serveur (SSR/RSC), chaque appel retourne un client frais — le cache
// module-level serait partagé entre les requêtes et constituerait une fuite.
//
// TEST : les tests unitaires tournent dans jsdom (window défini) ou Node
// (window absent). Dans les deux cas le comportement est correct :
//   - jsdom  → singleton partagé entre les tests du même fichier (mock reset OK)
//   - Node   → pas de singleton, chaque test reçoit un client frais
//
let _browserClientSingleton: ReturnType<typeof createBrowserClient> | null = null;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne le client Supabase navigateur (singleton côté browser).
 *
 * ── Garanties ────────────────────────────────────────────────────────────────
 *  • Browser  : même instance partagée → une seule connexion WebSocket.
 *  • SSR/RSC  : nouvelle instance à chaque appel (pas de fuite inter-requêtes).
 *  • Env      : variables validées et nettoyées au chargement du module.
 *
 * ── Config Realtime ──────────────────────────────────────────────────────────
 *  • timeout 20 s : laisse plus de temps au canal pour s'établir avant de
 *    déclencher TIMED_OUT — réduit les faux-positifs sur connexion lente.
 *  • eventsPerSecond 10 : throttle léger pour éviter les rafales CDC.
 */
export function createClient() {
  // _bootEnv est garanti non-null si le module a été initialisé sans erreur.
  const { url, anonKey } = _bootEnv!;

  // Côté serveur (SSR/RSC) : toujours un client frais pour éviter les fuites.
  if (typeof window === 'undefined') {
    return createBrowserClient(url, anonKey);
  }

  // Côté navigateur : retourner le singleton (une seule connexion WS).
  if (!_browserClientSingleton) {
    _browserClientSingleton = createBrowserClient(url, anonKey, {
      realtime: {
        timeout: 20000,
        params: { eventsPerSecond: 10 },
      },
    });
  }
  return _browserClientSingleton;
}

// ── safeRemoveChannel ─────────────────────────────────────────────────────────
//
// PROBLÈME : quand un composant se démonte pendant que le canal WebSocket est
// encore en cours d'établissement (état « joining »), appeler removeChannel()
// force Supabase à appeler unsubscribe() → leave() → disconnect() sur un
// socket pas encore ouvert → erreur Chrome :
//   « WebSocket is closed before the connection is established »
//
// SOLUTION : vérifier l'état interne du canal avant de l'enlever.
//   • Si le canal est en état « joining » (connexion en vol), on attend que
//     le statut SUBSCRIBED ou CHANNEL_ERROR arrive (max 5 s) avant d'appeler
//     removeChannel — cela laisse le socket finir de s'ouvrir proprement.
//   • Dans tous les autres états (joined, closed, errored, leaving),
//     removeChannel() est appelé immédiatement.
//   • Toutes les erreurs sont silencieusement ignorées (.catch(() => null))
//     pour ne jamais laisser remonter une exception de cleanup vers React.
//
// Usage :
//   safeRemoveChannel(supabase, channelRef.current).catch(() => null);
//   channelRef.current = null;
//
// ─────────────────────────────────────────────────────────────────────────────

/** Délai max (ms) avant de forcer removeChannel même si le canal est encore en joining. */
const SAFE_REMOVE_TIMEOUT_MS = 5_000;

type SupabaseChannel = ReturnType<ReturnType<typeof createBrowserClient>['channel']>;
type SupabaseClient  = ReturnType<typeof createBrowserClient>;

/**
 * Retire un canal Supabase Realtime de manière sécurisée.
 *
 * Si le canal est encore en cours de connexion (état « joining »), la fonction
 * attend que la souscription se termine (SUBSCRIBED ou erreur) avant d'appeler
 * `removeChannel()`. Cela évite l'erreur Chrome/Safari :
 * « WebSocket is closed before the connection is established »
 *
 * @param supabase - Le client Supabase singleton
 * @param channel  - Le canal à retirer (peut être null)
 */
export function safeRemoveChannel(
  supabase: SupabaseClient,
  channel: SupabaseChannel | null,
): Promise<void> {
  if (!channel) return Promise.resolve();

  return new Promise<void>((resolve) => {
    // Accéder à l'état interne du canal (propriété publique de RealtimeChannel)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state: string = (channel as unknown as Record<string, unknown>).state as string ?? 'closed';

    const doRemove = () => {
      supabase.removeChannel(channel).catch(() => null).finally(resolve);
    };

    if (state !== 'joining') {
      // Canal déjà établi, en erreur, fermé ou en cours de fermeture :
      // removeChannel() est sans danger, l'appeler immédiatement.
      doRemove();
      return;
    }

    // Canal encore en vol (joining) : attendre la réponse du serveur.
    // On s'abonne temporairement au statut pour détecter la fin de la
    // connexion, avec un timeout de sécurité pour ne pas bloquer indéfiniment.
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; doRemove(); }
    }, SAFE_REMOVE_TIMEOUT_MS);

    // subscribe() accepte un callback additionnel qui est appelé à chaque
    // changement de statut. On l'utilise ici uniquement pour détecter la fin
    // de la phase « joining » — peu importe si c'est SUBSCRIBED ou une erreur.
    try {
      channel.subscribe((status: string) => {
        if (!settled && (
          status === 'SUBSCRIBED'     ||
          status === 'CHANNEL_ERROR'  ||
          status === 'TIMED_OUT'      ||
          status === 'CLOSED'
        )) {
          settled = true;
          clearTimeout(timer);
          doRemove();
        }
      });
    } catch {
      // subscribe() peut lever si le canal est dans un état incohérent
      // (ex. double-invoke React Strict Mode). Forcer la suppression.
      if (!settled) { settled = true; clearTimeout(timer); doRemove(); }
    }
  });
}
