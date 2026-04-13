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
 * onRequestError — Next.js 15+ hook (optionnel, rétrocompatible).
 *
 * Appelé par Next.js pour chaque erreur de requête non gérée.
 * Permet de capturer les erreurs de Server Components et de routing
 * qui n'atteignent pas forcément un handler d'erreur standard.
 *
 * En Next.js 14, ce hook n'existe pas encore mais l'import est
 * sans effet — pas d'erreur au démarrage.
 */
export const onRequestError = async (
  err: unknown,
  request: { path: string; method: string },
  context: { routeType: string },
) => {
  // Import dynamique pour éviter de charger Sentry si non configuré
  const { captureRequestError } = await import('@sentry/nextjs').catch(() => ({
    captureRequestError: null,
  }));

  if (captureRequestError) {
    captureRequestError(err, request, context);
  }
};
