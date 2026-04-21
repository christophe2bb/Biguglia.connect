/**
 * Route /test-sentry — wrapper serveur pour les métadonnées SEO.
 *
 * Règles :
 *  • noindex + nofollow toujours : page de diagnostic interne, jamais indexée.
 *  • En production sans SENTRY_TEST_ENABLED=true : redirige vers l'accueil
 *    (la route API renvoie déjà 403, mais on bloque aussi l'affichage de la page).
 *  • Le composant UI réel est dans _page.client.tsx (Client Component).
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TestSentryPageClient from './_page.client';

export const metadata: Metadata = {
  title: 'Test Sentry Monitoring — Biguglia Connect',
  description: 'Page de vérification interne du monitoring Sentry. Réservée aux développeurs.',
  // Jamais indexée : page de diagnostic, aucune valeur SEO.
  robots: { index: false, follow: false },
};

export default function TestSentryPage() {
  // Bloquer l'accès en production sauf si SENTRY_TEST_ENABLED est défini.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.SENTRY_TEST_ENABLED !== 'true'
  ) {
    redirect('/');
  }

  return <TestSentryPageClient />;
}
