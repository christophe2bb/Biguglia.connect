/**
 * sentry.server.config.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Configuration Sentry pour le runtime Node.js serveur (API Routes, Server
 * Components, Server Actions, middleware Node.js).
 *
 * Chargé automatiquement par @sentry/nextjs au démarrage du serveur Next.js.
 * Ne pas importer directement.
 *
 * Ce qui est capturé :
 *   • Exceptions non gérées dans les API Routes (/api/**)
 *   • Erreurs des Server Components (RSC rendering)
 *   • Erreurs d'authentification Supabase côté serveur
 *   • Erreurs de connexion DB (Supabase service-role)
 *   • Violations de l'admin-guard (tentatives d'accès non autorisées)
 *   • Performance : durée des API Routes, durée des requêtes DB
 *
 * Ce qui est EXCLU :
 *   • 401/403 attendus (par design, pas des bugs)
 *   • Erreurs de validation Zod (ce sont des erreurs utilisateur, pas des bugs)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!SENTRY_DSN) {
  console.debug('[Sentry] DSN absent — monitoring serveur désactivé.');
}

Sentry.init({
  dsn: SENTRY_DSN,

  // ── Environnement & release ────────────────────────────────────────────────
  environment: process.env.NODE_ENV ?? 'development',

  // ── Échantillonnage ───────────────────────────────────────────────────────
  //   prod : 20 % des transactions API pour le monitoring de performance.
  //   dev  : 100 % pour déboguer localement.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // ── Intégrations serveur ──────────────────────────────────────────────────
  integrations: [
    // Suivi automatique des requêtes HTTP sortantes (fetch vers Supabase).
    // En Sentry v10, httpIntegration active les spans par défaut — pas besoin
    // de l'option 'tracing' (supprimée dans cette version).
    Sentry.httpIntegration({ spans: true }),

    // Propagation automatique des traces entre server/client via fetch natif Node.
    Sentry.nativeNodeFetchIntegration(),
  ],

  // ── Filtrage des événements ───────────────────────────────────────────────
  //
  // beforeSend : appelé pour chaque événement erreur avant envoi.
  //
  beforeSend(event, hint) {
    const err = hint?.originalException;

    if (err instanceof Error) {
      // ① Ignorer les 401/403 volontaires de l'admin-guard
      //    (ce sont des refus de sécurité attendus, pas des bugs)
      if (
        err.message === 'UNAUTHORIZED' ||
        err.message === 'FORBIDDEN' ||
        err.message.startsWith('Admin guard:')
      ) {
        return null;
      }

      // ② Ignorer les erreurs de validation Zod (mauvaises données client)
      if (err.name === 'ZodError') {
        return null;
      }

      // ③ Ne pas fuiter les valeurs de champs sensibles dans les messages
      //    (au cas où un message d'erreur contiendrait un token JWT par ex.)
      event.exception?.values?.forEach(exc => {
        if (exc.value) {
          exc.value = exc.value
            .replace(/eyJ[A-Za-z0-9._-]{20,}/g, '[JWT]')
            .replace(/Bearer\s+\S+/gi, 'Bearer [Filtered]');
        }
      });
    }

    return event;
  },

  // Pas de PII automatique — on set manuellement l'userId Supabase (UUID)
  sendDefaultPii: false,
});
