/**
 * sentry.edge.config.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Configuration Sentry pour le runtime Edge (middleware Next.js, API Routes
 * marquées `runtime = 'edge'`).
 *
 * Le runtime Edge n'est PAS Node.js : il n'a pas accès aux modules Node
 * natifs (fs, crypto, net…). La config est donc minimaliste par rapport
 * à sentry.server.config.ts.
 *
 * Ce qui est capturé :
 *   • Erreurs dans le middleware (src/middleware.ts) — redirections, auth checks
 *   • Erreurs dans les API Routes edge
 *   • Performances des routes edge (très rapides, utile pour détecter les régressions)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',

  // Faible taux d'échantillonnage pour le edge (très haute fréquence)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // ── Filtrage ──────────────────────────────────────────────────────────────
  beforeSend(event) {
    // Supprimer les tokens d'URL si présents
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /([?&](token|access_token|refresh_token)=)[^&]*/gi,
        '$1[Filtered]',
      );
    }
    return event;
  },

  sendDefaultPii: false,
});
