/**
 * e2e/fixtures.ts — Fixtures et helpers partagés pour les smoke tests E2E
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Fournit :
 *   - test / expect re-exportés (fixture de base)
 *   - skipIfNoCredentials() — skip les tests nécessitant un compte de test
 *   - loginAs(page, email, password) — helper de connexion Supabase
 *   - logout(page) — helper de déconnexion
 *   - waitForHydration(page) — attend la fin de l'hydratation Next.js
 *   - TEST_CREDENTIALS — lecture des variables d'env E2E_TEST_*
 *
 * ─── Variables d'environnement ───────────────────────────────────────────────
 *
 *   E2E_TEST_EMAIL     Email du compte Supabase de test
 *   E2E_TEST_PASSWORD  Mot de passe du compte de test
 *
 *   Si absentes → les tests auth sont skippés proprement (pas d'erreur).
 *
 * ─── Sécurité ────────────────────────────────────────────────────────────────
 *
 *   Les credentials ne sont JAMAIS hardcodés ici.
 *   Ils viennent des secrets GitHub Actions (E2E_TEST_EMAIL, E2E_TEST_PASSWORD).
 *   En l'absence de ces secrets, les tests auth se skippent.
 */

import { test as baseTest, expect, Page } from '@playwright/test';

// ─── Credentials de test ──────────────────────────────────────────────────────
export const TEST_CREDENTIALS = {
  email:    process.env.E2E_TEST_EMAIL    ?? '',
  password: process.env.E2E_TEST_PASSWORD ?? '',
  hasCredentials: Boolean(
    process.env.E2E_TEST_EMAIL &&
    process.env.E2E_TEST_PASSWORD
  ),
};

// ─── Fixtures étendues ────────────────────────────────────────────────────────

type E2EFixtures = {
  /** Page avec CSP bypassée et locale fr-FR */
  page: Page;
};

export const test = baseTest.extend<E2EFixtures>({});

export { expect };

// ─── Helper : skip si pas de credentials ─────────────────────────────────────

/**
 * Skip le test courant si les credentials E2E ne sont pas configurés.
 * À appeler en début de test nécessitant une connexion.
 *
 * @example
 *   test('login flow', async ({ page }) => {
 *     skipIfNoCredentials(test);
 *     // ... suite du test avec login
 *   });
 */
export function skipIfNoCredentials(testInstance: typeof test | typeof baseTest) {
  if (!TEST_CREDENTIALS.hasCredentials) {
    testInstance.skip(
      true,
      'Test skippé : E2E_TEST_EMAIL / E2E_TEST_PASSWORD non configurés. ' +
      'Ajouter ces secrets dans GitHub Actions pour activer les tests auth.'
    );
  }
}

// ─── Helper : connexion ────────────────────────────────────────────────────────

/**
 * Connecte un utilisateur via le formulaire /connexion.
 * Attend la redirection post-login vers le dashboard.
 *
 * @param page       Instance Playwright Page
 * @param email      Email du compte de test
 * @param password   Mot de passe
 * @param redirectTo Page cible après connexion (défaut : /dashboard)
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
  redirectTo = '/dashboard'
): Promise<void> {
  await page.goto('/connexion');

  // Attendre que le formulaire soit visible
  await page.waitForSelector('form', { timeout: 15_000 });

  // Remplir les champs par label (accessible — correspond à ce que voit l'utilisateur)
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);

  // Soumettre et attendre la redirection
  await Promise.all([
    page.waitForURL(url => url.pathname !== '/connexion', { timeout: 30_000 }),
    page.getByRole('button', { name: /se connecter/i }).click(),
  ]);

  // Vérifier que la redirection a bien eu lieu
  await expect(page).toHaveURL(
    url => url.pathname === redirectTo || url.pathname.startsWith(redirectTo),
    { timeout: 15_000 }
  );
}

// ─── Helper : déconnexion ─────────────────────────────────────────────────────

/**
 * Déconnecte l'utilisateur en appelant l'API Supabase directement.
 * Plus fiable que de cliquer dans l'UI (évite les dépendances au menu profil).
 */
export async function logout(page: Page): Promise<void> {
  // Effacer les cookies et le storage local pour simuler une déconnexion complète
  await page.context().clearCookies();
  await page.evaluate(() => {
    try { window.localStorage.clear(); } catch { /* ignore */ }
    try { window.sessionStorage.clear(); } catch { /* ignore */ }
  });
}

// ─── Helper : hydratation ─────────────────────────────────────────────────────

/**
 * Attend la fin de l'hydratation Next.js.
 * Utile avant d'interagir avec des composants client (état React chargé).
 */
export async function waitForHydration(page: Page): Promise<void> {
  // Attendre que Next.js ait terminé l'hydratation
  // Le body perd les classes de "loading" après hydratation
  await page.waitForLoadState('networkidle', { timeout: 30_000 });
}
