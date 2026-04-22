/**
 * playwright.config.ts — Configuration des tests E2E Playwright
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Smoke tests critiques pour Biguglia Connect.
 * Exécutés dans la CI GitHub Actions AVANT le déploiement Vercel.
 *
 * ─── Stratégie ───────────────────────────────────────────────────────────────
 *
 *   • Chromium uniquement (CI rapide — couvre 70% des utilisateurs)
 *   • webServer : démarre `next build && next start` automatiquement
 *   • baseURL : http://localhost:3000 (configurable via E2E_BASE_URL pour Vercel)
 *   • Pas de retries en CI — un flap = un bug réel à corriger
 *   • Screenshots + traces uniquement en cas d'échec (artifacts CI)
 *   • Timeout 30 s par test (smoke tests → rapides ou mort)
 *
 * ─── Variables d'environnement ───────────────────────────────────────────────
 *
 *   E2E_BASE_URL           URL de l'app testée (défaut : http://localhost:3000)
 *   E2E_TEST_EMAIL         Email du compte de test Supabase (optionnel)
 *   E2E_TEST_PASSWORD      Mot de passe du compte de test Supabase (optionnel)
 *
 *   Si E2E_TEST_EMAIL / E2E_TEST_PASSWORD sont absents, les smoke tests
 *   qui nécessitent une authentification sont automatiquement skippés.
 *
 * ─── Commandes ───────────────────────────────────────────────────────────────
 *
 *   npm run test:e2e           Lancer tous les smoke tests (avec build)
 *   npm run test:e2e:headed    Mode visible (debug)
 *   npm run test:e2e:ui        Mode interactif Playwright UI
 *   npm run test:e2e:report    Ouvrir le dernier rapport HTML
 *
 * Ref : https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

// URL de base — production Vercel ou localhost selon l'environnement
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// En CI (GITHUB_ACTIONS=true), on utilise le build statique via next start.
// En local, on peut pointer vers un serveur déjà démarré (E2E_BASE_URL défini).
const USE_WEB_SERVER = !process.env.E2E_BASE_URL;

export default defineConfig({
  // ── Répertoire des tests ──────────────────────────────────────────────────
  testDir: './e2e',

  // ── Fichiers de tests ─────────────────────────────────────────────────────
  testMatch: ['**/*.spec.ts'],

  // ── Parallélisme ─────────────────────────────────────────────────────────
  // Les smoke tests sont rapides — exécution en série pour éviter les conflits
  // de session (login/logout partagé). Augmenter si les tests deviennent
  // indépendants avec des comptes isolés.
  fullyParallel: false,
  workers: 1,

  // ── Retries ───────────────────────────────────────────────────────────────
  // 0 en CI : un flap = un bug réel.
  // 1 en local : tolérance pour les effets de bord réseaux.
  retries: process.env.CI ? 0 : 1,

  // ── Reporter ─────────────────────────────────────────────────────────────
  reporter: [
    ['list'],                                                    // Sortie console lisible
    ['html', { outputFolder: 'playwright-report', open: 'never' }], // Rapport HTML
    ['json', { outputFile: 'playwright-report/results.json' }], // Résultats JSON (GitHub Actions)
  ],

  // ── Configuration globale des tests ───────────────────────────────────────
  use: {
    baseURL: BASE_URL,

    // ── Traces & Screenshots ───────────────────────────────────────────────
    // Uniquement en cas d'échec → artifacts CI sans surcharger le stockage
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',

    // ── Timeouts ──────────────────────────────────────────────────────────
    // 30 s par action (navigation, click, fill) — smoke tests doivent être rapides
    actionTimeout:     30_000,
    navigationTimeout: 30_000,

    // ── Headless ──────────────────────────────────────────────────────────
    headless: true,

    // ── Locale ────────────────────────────────────────────────────────────
    locale: 'fr-FR',
  },

  // ── Timeout global par test ───────────────────────────────────────────────
  timeout: 60_000,

  // ── Timeout expect ────────────────────────────────────────────────────────
  expect: {
    timeout: 15_000,
  },

  // ── Projets (navigateurs) ─────────────────────────────────────────────────
  // Chromium uniquement pour la CI — couvre ~70% des utilisateurs.
  // Ajouter firefox/webkit pour une couverture complète en local.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Bypass CSP nonce dans les tests E2E — le nonce change à chaque requête
        // et n'est pas un vecteur de test ici (couvert par les tests unitaires).
        bypassCSP: true,
      },
    },
  ],

  // ── Serveur web (démarrage automatique) ───────────────────────────────────
  // Démarre le serveur Next.js avant les tests et le coupe après.
  // Uniquement si E2E_BASE_URL n'est pas défini (pas de serveur externe).
  ...(USE_WEB_SERVER
    ? {
        webServer: {
          command: 'npm run build && npm run start',
          url: 'http://localhost:3000',
          timeout: 300_000,     // 5 min — build Next.js peut être lent
          reuseExistingServer: !process.env.CI,
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            // Transmettre les variables nécessaires au build/start
            NODE_ENV: 'production',
            ...(process.env.NEXT_PUBLIC_SUPABASE_URL
              ? { NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL }
              : {}),
            ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
              : {}),
            ...(process.env.NEXT_PUBLIC_SITE_URL
              ? { NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL }
              : {}),
          },
        },
      }
    : {}),
});
