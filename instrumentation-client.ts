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
  //   • 1.0 = toujours rejouer les sessions avec une erreur → très utile en prod.
  tracesSampleRate:         process.env.NODE_ENV === 'production' ? 0.1  : 1.0,
  replaysSessionSampleRate: 0,      // pas de replay systématique (RGPD)
  replaysOnErrorSampleRate: 1.0,    // replay complet si une erreur survient

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
    if (frames?.some(f => f.filename?.startsWith('chrome-extension://'))) {
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

// ── Replay de session — LAZY LOAD ──────────────────────────────────────────
//
// Le SDK Replay pèse ~50 KB gzippé. Chargé dans integrations[], il serait
// inclus dans TOUS les bundles clients. Avec lazyLoadIntegration() :
//   • Le chunk Replay N'EST PAS inclus dans le bundle initial
//   • Il est téléchargé depuis le CDN Sentry uniquement au premier événement
//   • Économie réelle : ~50 KB gzippé sur le First Load JS de toutes pages
//
// Doit être appelé APRÈS Sentry.init() pour que addIntegration() fonctionne.
Sentry.lazyLoadIntegration('replayIntegration')
  .then((replayIntegration) => {
    Sentry.addIntegration(
      replayIntegration({
        maskAllText:   true,  // Masque tous les textes (RGPD)
        blockAllMedia: true,  // Bloque les médias (RGPD)
      }),
    );
  })
  .catch(() => {
    // Silencieux — si le CDN Sentry est inaccessible (ad-blocker, offline),
    // le replay n'est simplement pas chargé ; le reste de Sentry continue.
  });
