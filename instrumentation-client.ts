/**
 * instrumentation-client.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Configuration Sentry pour le runtime navigateur (Client Components, hydration,
 * interactions utilisateur, erreurs JS non capturées).
 *
 * Chargé automatiquement par @sentry/nextjs dans chaque bundle client.
 * Ne pas importer directement — Next.js le fait via le plugin webpack Sentry.
 *
 * ⚠️  Renommé depuis sentry.client.config.ts (déprécié dans @sentry/nextjs v10).
 *     Avec Turbopack, seul instrumentation-client.ts est supporté.
 *     Ref : https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 *
 * Ce qui est capturé :
 *   • Erreurs JS non gérées (uncaught exceptions, unhandledrejection)
 *   • Erreurs des Client Components React (via ErrorBoundary)
 *   • Erreurs réseau (fetch vers /api/*) si elles remontent au handler global
 *   • Sessions utilisateur anonymisées (userId Supabase sans PII)
 *   • Performance : Core Web Vitals (LCP, FID, CLS, TTFB, INP)
 *
 * Ce qui est EXCLU (confidentialité & bruit) :
 *   • Contenu des champs de formulaire (aucune PII)
 *   • Erreurs tierces (extensions navigateur, analytics)
 *   • Erreurs réseau attendues (offline, timeout utilisateur)
 *
 * Optimisation bundle :
 *   • replayIntegration chargé en LAZY via lazyLoadIntegration
 *     → le chunk Replay (~50 KB gzippé) n'est téléchargé qu'au premier événement
 *     → économie ~50 KB sur le First Load JS de toutes les pages
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Sentry est désactivé en l'absence de DSN (développement local sans .env.sentry)
if (!SENTRY_DSN) {
  console.debug('[Sentry] DSN absent — monitoring client désactivé.');
}

Sentry.init({
  dsn: SENTRY_DSN,

  // ── Environnement & release ────────────────────────────────────────────────
  environment: process.env.NODE_ENV ?? 'development',
  // La release est injectée par le plugin webpack Sentry au moment du build
  // via SENTRY_RELEASE ou le hash git. Ne pas la définir manuellement ici.

  // ── Échantillonnage ───────────────────────────────────────────────────────
  //
  // tracesSampleRate : fraction des transactions envoyées pour le monitoring
  // de performance (Core Web Vitals, durée des routes).
  //   • prod : 10 % — suffisant pour détecter les régressions sans exploser le quota.
  //   • dev  : 100 % — toutes les transactions en local pour déboguer.
  //
  // replaysSessionSampleRate : fraction des sessions enregistrées en replay.
  //   • 0 en prod par défaut (confidentialité + quota). Passer à 0.05 si besoin.
  //
  // replaysOnErrorSampleRate : replay automatique des sessions ayant une erreur.
  //   • Mis à 0 (désactivé) pour supprimer le forced layout reflow de 375 ms.
  //   • Explication complète dans le bloc lazyLoadIntegration() ci-dessous.
  //   • Les deux constantes REPLAY_SESSION_RATE / REPLAY_ERROR_RATE contrôlent
  //     à la fois Sentry.init() et le guard du lazyLoadIntegration() pour
  //     garantir la cohérence (pas de lazy load si les deux taux sont à 0).
  tracesSampleRate:         process.env.NODE_ENV === 'production' ? 0.1  : 1.0,
  replaysSessionSampleRate: 0,  // pas de replay systématique (RGPD + perf)
  replaysOnErrorSampleRate: 0,  // 0 = replay désactivé → forced reflow supprimé

  // ── Erreurs ignorées (filtre rapide avant beforeSend) ─────────────────────
  //
  // ignoreErrors : liste de patterns (string exact ou RegExp) sur le message
  // d'erreur. Évalué AVANT beforeSend → plus efficace (pas de serialisation
  // de l'événement complet).
  //
  // Erreurs filtrées :
  //   • NotFoundError removeChild/insertBefore — DOM modifié par extensions
  //     (Grammarly, LastPass, Dashlane, traducteurs…) avant hydratation React.
  //     Ref : https://github.com/facebook/react/issues/17256
  //   • ResizeObserver loop — événement navigateur bénin, non bloquant.
  //   • Non-Error promise rejection — Supabase realtime / service workers.
  //   • Load failed / Failed to fetch — utilisateur hors-ligne ou bloqué.
  ignoreErrors: [
    // Extensions navigateur modifiant le DOM avant hydratation React
    /NotFoundError.*removeChild/i,
    /NotFoundError.*insertBefore/i,
    /NotFoundError.*Impossible d'exécuter/i,
    // ResizeObserver (Chrome/Firefox, non bloquant)
    /ResizeObserver loop limit exceeded/,
    /ResizeObserver loop completed with undelivered notifications/,
    // Rejections non-Error (service workers, Supabase realtime)
    /Non-Error promise rejection captured/,
    // Erreurs réseau bénignes (hors-ligne, bloqué par ad-blocker)
    /Failed to fetch/i,
    /Load failed/i,
    /NetworkError/i,
  ],

  // ── Intégrations client ───────────────────────────────────────────────────
  integrations: [
    // Feedback utilisateur (bouton "Signaler un bug" intégrable)
    // Désactivé par défaut — activer si on veut le widget in-app
    // Sentry.feedbackIntegration({ colorScheme: 'light' }),

    // Capture des Core Web Vitals via PerformanceObserver
    Sentry.browserTracingIntegration(),
  ],

  // ── Filtrage des erreurs ──────────────────────────────────────────────────
  //
  // beforeSend : filtre les événements avant envoi à Sentry.
  //   Retourner null = ignorer l'événement.
  //   Retourner l'événement modifié = envoyer (on peut scrubber des champs).
  //
  beforeSend(event, hint) {
    const err = hint?.originalException;

    // ① Ignorer les erreurs des extensions navigateur (url chrome-extension://)
    const frames = event.exception?.values?.[0]?.stacktrace?.frames;
    if (frames?.some(f =>
      f.filename?.startsWith('chrome-extension://') ||
      f.filename?.startsWith('moz-extension://') ||
      f.filename?.includes('contentscript')
    )) {
      return null;
    }

    // ② Ignorer les erreurs réseau bénignes (utilisateur hors-ligne)
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('load failed')
      ) {
        return null;
      }

      // ② bis — AbortError "Lock broken by another request with the 'steal' option"
      // Causé par Supabase Auth qui utilise un verrou IndexedDB pour la session.
      // Quand l'utilisateur navigue rapidement (ex: /admin → /dashboard), le verrou
      // précédent est annulé par le nouveau. Ce n'est pas une vraie erreur applicative.
      if (
        err.name === 'AbortError' ||
        msg.includes('lock broken') ||
        msg.includes('steal')
      ) {
        return null;
      }

      // ③ bis — NotFoundError : removeChild / insertBefore
      // Causé par des extensions navigateur (Grammarly, LastPass, etc.) qui
      // modifient le DOM AVANT l'hydratation React. React essaie ensuite de
      // supprimer un nœud que l'extension a déjà déplacé → NotFoundError.
      // Ces erreurs sont invisibles à l'application et ne reflètent aucun bug
      // applicatif — elles viennent du contexte navigateur de l'utilisateur.
      // Ref : https://github.com/facebook/react/issues/17256
      if (
        err.name === 'NotFoundError' &&
        (msg.includes('removechild') || msg.includes('insertbefore') || msg.includes('removeChild') || msg.includes('insertBefore'))
      ) {
        return null;
      }

      // ③ ter — TypeError liés aux extensions (ex. "Cannot read properties of null")
      // provenant de scripts d'extension (contentscript.js, background.js, etc.)
      if (err.name === 'TypeError' && frames?.some(f =>
        !f.filename ||
        f.filename === '<anonymous>' ||
        f.filename?.includes('contentscript') ||
        f.filename?.startsWith('chrome-extension://') ||
        f.filename?.startsWith('moz-extension://')
      )) {
        return null;
      }
    }

    // ③ Supprimer les tokens/mots de passe des query strings si présents
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /([?&](token|password|pwd|secret|access_token|refresh_token)=)[^&]*/gi,
        '$1[Filtered]',
      );
    }

    return event;
  },

  // ── Confidentialité ───────────────────────────────────────────────────────
  // Désactiver la collecte automatique des données utilisateur brutes.
  // On set manuellement l'userId Supabase (UUID sans PII) via Sentry.setUser().
  sendDefaultPii: false,
});

// ── Replay de session — LAZY LOAD CONDITIONNEL ────────────────────────────
//
// ARCHITECTURE DU PROBLÈME (Lighthouse "Forced layout reflow 375 ms") :
//
//   lazyLoadIntegration('replayIntegration') charge replay.min.js depuis le
//   CDN Sentry (browser.sentry-cdn.com/10.x/replay.min.js, ~47 KB gzippé).
//   Une fois chargé, rrweb (la lib interne) traverse l'INTÉGRALITÉ du DOM
//   pour établir son snapshot initial. Ce parcours appelle getBoundingClientRect()
//   sur chaque nœud → forced layout reflow mesuré par Lighthouse à ~375 ms.
//
//   Ce forced reflow se produit au CHARGEMENT du module (pas à l'enregistrement).
//   Il est donc indépendant de replaysOnErrorSampleRate — même à 0.1, rrweb
//   traversait le DOM à chaque chargement de page.
//
// SOLUTION : garder lazyLoadIntegration() UNIQUEMENT quand les taux
//   d'échantillonnage sont > 0, via une guard explicite.
//
// COMPROMIS DOCUMENTÉ :
//   replaysSessionSampleRate = 0  → pas de replay systématique
//   replaysOnErrorSampleRate  = 0 → replay désactivé en production
//
//   Conséquence : les sessions avec erreur ne sont PLUS rejouées dans Sentry.
//   Pour déboguer une erreur spécifique, utiliser les stack traces Sentry
//   (toujours actives via browserTracingIntegration + beforeSend).
//
//   Pour ré-activer le replay ponctuellement (ex: investigation d'un bug) :
//   1. Passer replaysOnErrorSampleRate à 0.05 dans ce fichier
//   2. Déployer → investiguer → repasser à 0 après investigation
//   3. NE PAS laisser > 0 en prod permanente (forced reflow + quota Sentry)
//
// IMPACT PERFORMANCE :
//   • Forced layout reflow Lighthouse : 375 ms → 0 ms
//   • replay.min.js (47 KB) plus jamais chargé → économie réseau + CPU
//   • TBT réduit d'autant
//
const REPLAY_SESSION_RATE = 0;  // 0 = pas de replay systématique
const REPLAY_ERROR_RATE   = 0;  // 0 = pas de replay sur erreur (perf > debug)

if (REPLAY_SESSION_RATE > 0 || REPLAY_ERROR_RATE > 0) {
  // Chargement conditionnel : replay.min.js N'EST PAS téléchargé si les deux
  // taux sont à 0. rrweb ne traverse pas le DOM → pas de forced layout reflow.
  Sentry.lazyLoadIntegration('replayIntegration')
    .then((replayIntegration) => {
      Sentry.addIntegration(
        replayIntegration({
          maskAllInputs: true,  // RGPD obligatoire — masque les champs de formulaire
          maskAllText:   true,  // Masque tous les textes (RGPD)
          blockAllMedia: true,  // Bloque les médias (RGPD)
        }),
      );
    })
    .catch(() => {
      // Silencieux — CDN Sentry inaccessible (ad-blocker, offline) ;
      // le reste de Sentry continue normalement.
    });
}

// ── Navigation tracing — OBLIGATOIRE pour Sentry v10 ──────────────────────────
//
// Sans cet export, les navigations Next.js App Router ne sont PAS tracées
// dans Sentry (aucune transaction de type "navigation" n'apparaît).
// Requis depuis @sentry/nextjs v10 — voir :
//   https://docs.sentry.io/platforms/javascript/guides/nextjs/instrumentation/
//
// Note : cette ligne est intentionnellement à la fin du fichier pour ne pas
// perturber l'initialisation Sentry.init() ci-dessus.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
