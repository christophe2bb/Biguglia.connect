/**
 * src/instrumentation.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Point d'entrée Next.js 14 pour l'initialisation de Sentry côté serveur.
 *
 * Next.js charge ce fichier automatiquement au démarrage du serveur, avant
 * tout traitement de requête. Il est idéal pour initialiser des outils de
 * monitoring (Sentry, OpenTelemetry, DataDog…).
 *
 * Référence : https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Note : ce fichier doit être à la racine de `src/` (ou à la racine du projet
 * si pas de répertoire src). Il n'est PAS un module standard — Next.js le
 * résout via l'option `instrumentationHook` dans next.config.js (activée
 * automatiquement depuis Next.js 14.0.4).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Runtime Node.js : API Routes, Server Components, Server Actions
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Runtime Edge : middleware, API Routes edge
    await import('../sentry.edge.config');
  }
}

/**
 * onRequestError — Next.js 14.1+ hook pour capturer les erreurs de requête.
 *
 * Appelé par Next.js pour chaque erreur de requête non gérée (Server Components,
 * route handlers, etc.). Permet de capturer des erreurs qui n'atteignent pas
 * forcément le handler d'erreur standard.
 *
 * Types exacts extraits de @sentry/nextjs build/types/common/captureRequestError.d.ts :
 *   RequestInfo  = { path: string; method: string; headers: Record<string, string|string[]|undefined> }
 *   ErrorContext = { routerKind: string; routePath: string; routeType: string }
 */
export const onRequestError = async (
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context:  { routerKind: string; routePath: string; routeType: string },
) => {
  try {
    // Import dynamique pour éviter de charger Sentry si non configuré
    const sentry = await import('@sentry/nextjs');
    if (typeof sentry.captureRequestError === 'function') {
      sentry.captureRequestError(err, request, context);
    }
  } catch {
    // Si Sentry n'est pas disponible ou configuré, on ignore silencieusement
  }
};
