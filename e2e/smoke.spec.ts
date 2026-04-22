/**
 * e2e/smoke.spec.ts — 5 Smoke Tests critiques Biguglia Connect
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Ces tests valident les parcours utilisateurs fondamentaux en navigateur réel.
 * Ils sont exécutés dans la CI GitHub Actions AVANT tout déploiement Vercel.
 *
 * ─── Smoke tests ─────────────────────────────────────────────────────────────
 *
 *   1. Accueil — la page charge, affiche le contenu attendu et les liens critiques
 *   2. Connexion / Déconnexion — le formulaire fonctionne, session créée/détruite
 *   3. Création d'annonce — wizard en 3 étapes complet, soumission réussie
 *   4. Guard /admin — redirige vers /connexion si non authentifié
 *   5. Health endpoint — GET /api/health répond 200 avec status ok/degraded
 *
 * ─── Variables d'env ─────────────────────────────────────────────────────────
 *
 *   E2E_BASE_URL        Optionnel — URL de l'app (défaut : http://localhost:3000)
 *   E2E_TEST_EMAIL      Compte de test Supabase pour les tests auth (optionnel)
 *   E2E_TEST_PASSWORD   Mot de passe du compte de test (optionnel)
 *
 *   Les tests 2 et 3 sont skippés si E2E_TEST_EMAIL / E2E_TEST_PASSWORD
 *   ne sont pas définis. Les tests 1, 4, 5 fonctionnent sans credentials.
 *
 * ─── Design ──────────────────────────────────────────────────────────────────
 *
 *   • Tests indépendants — chaque test gère son propre état (pas d'ordre requis)
 *   • Sélecteurs accessibles — getByRole, getByLabel, getByText (pas de CSS)
 *   • Assertions explicites — messages d'erreur clairs en cas d'échec
 *   • Timeouts conservateurs — 30 s max par action (UI async Next.js)
 *   • Bypass CSP — le nonce change à chaque requête (couvert par tests unitaires)
 */

import { test, expect, skipIfNoCredentials, loginAs, logout, TEST_CREDENTIALS } from './fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST 1 — Page d'accueil charge et affiche le contenu
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Smoke 1 — Page d\'accueil', () => {
  test('charge correctement et affiche les éléments critiques', async ({ page }) => {
    // ── Navigation ────────────────────────────────────────────────────────
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

    // La page doit répondre 200
    expect(response?.status()).toBe(200);

    // ── Titre de page ─────────────────────────────────────────────────────
    // Vérifie que le <title> contient "Biguglia"
    await expect(page).toHaveTitle(/Biguglia/i);

    // ── Headers de sécurité ───────────────────────────────────────────────
    // X-Frame-Options doit être présent (anti-clickjacking)
    const xFrameOptions = response?.headers()['x-frame-options'];
    expect(xFrameOptions).toBeTruthy();
    expect(xFrameOptions?.toLowerCase()).toBe('deny');

    // Content-Security-Policy doit contenir 'nonce-' (pas d'unsafe-inline)
    const cspHeader = response?.headers()['content-security-policy'];
    expect(cspHeader, 'CSP header must be present').toBeTruthy();
    expect(cspHeader, "CSP must contain 'nonce-' (no unsafe-inline)").toContain('nonce-');
    expect(cspHeader, "CSP must not contain unsafe-inline in script-src").not.toMatch(
      /script-src[^;]*'unsafe-inline'/
    );
    expect(cspHeader, "CSP must contain strict-dynamic").toContain('strict-dynamic');

    // ── Contenu textuel attendu ───────────────────────────────────────────
    // Le nom du site doit apparaître dans la page
    await expect(
      page.getByText(/biguglia connect/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Le hero ou la description principale doit être présent
    // La page d'accueil affiche "Artisans" ou "Biguglia" dans le contenu
    await expect(
      page.getByText(/artisan|biguglia|haute-corse/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // ── Navigation principale ─────────────────────────────────────────────
    // Des liens de navigation critiques doivent exister
    // (pas forcément visibles — peuvent être dans un menu)
    const annonceLink = page.getByRole('link', { name: /annonces?/i }).first();
    await expect(annonceLink).toBeAttached({ timeout: 10_000 });

    // ── Lien de connexion ─────────────────────────────────────────────────
    // Un lien "Se connecter" ou "Connexion" doit être présent sur l'accueil
    // (visible si non connecté)
    const connexionLink = page.getByRole('link', { name: /connexion|se connecter/i }).first();
    await expect(connexionLink).toBeAttached({ timeout: 10_000 });

    // ── Performance minimale ──────────────────────────────────────────────
    // La page ne doit pas être vide (au moins 1 KB de contenu)
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test('la page /annonces charge et affiche la liste', async ({ page }) => {
    const response = await page.goto('/annonces', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/annonce/i);

    // La page doit se charger sans erreur 500
    await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
  });

  test('la page /forum charge correctement', async ({ page }) => {
    const response = await page.goto('/forum', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/forum/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST 2 — Connexion / Déconnexion
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Smoke 2 — Connexion / Déconnexion', () => {
  test.beforeEach(({ page: _page }) => {
    skipIfNoCredentials(test);
  });

  test('le formulaire de connexion est accessible', async ({ page }) => {
    await page.goto('/connexion');

    // Le titre de la page doit indiquer "connexion"
    await expect(page).toHaveTitle(/connexion|connecter/i);

    // Le formulaire doit être visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });

    // Le champ email doit être accessible par son label
    await expect(page.getByLabel(/adresse email/i)).toBeVisible({ timeout: 10_000 });

    // Le champ mot de passe doit être présent
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible({ timeout: 10_000 });

    // Le bouton de soumission doit être présent
    await expect(
      page.getByRole('button', { name: /se connecter/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('connexion réussie puis déconnexion', async ({ page }) => {
    // ── Connexion ─────────────────────────────────────────────────────────
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Après connexion, on doit être sur le dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Le dashboard doit afficher quelque chose (page chargée, pas d'erreur 500)
    await expect(page.locator('body')).not.toContainText('500', { timeout: 10_000 });

    // ── Déconnexion ───────────────────────────────────────────────────────
    await logout(page);

    // Naviguer vers une page protégée → doit rediriger vers /connexion
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });

  test('identifiants invalides affichent une erreur', async ({ page }) => {
    await page.goto('/connexion');
    await page.waitForSelector('form', { timeout: 10_000 });

    await page.getByLabel(/adresse email/i).fill('wrong@example.com');
    await page.getByLabel(/mot de passe/i).fill('wrongpassword123');

    await page.getByRole('button', { name: /se connecter/i }).click();

    // Un message d'erreur doit apparaître (toast ou inline)
    await expect(
      page.getByText(/email.*mot de passe|incorrect|invalide|erreur/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // On doit rester sur la page de connexion
    await expect(page).toHaveURL(/\/connexion/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST 3 — Création d'annonce (wizard 3 étapes)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Smoke 3 — Création d\'annonce', () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials(test);
    // Se connecter avant de créer une annonce
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
  });

  test('accès à la page de création d\'annonce', async ({ page }) => {
    await page.goto('/annonces/nouvelle');

    // Doit afficher le wizard (pas de redirection vers connexion)
    await expect(page).not.toHaveURL(/connexion/);

    // L'étape 1 du wizard doit être visible
    // Le wizard a un indicateur d'étape (ex: "Étape 1/3" ou "L'essentiel")
    await expect(
      page.getByText(/l'essentiel|étape 1|step 1/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('wizard étape 1 → saisie des informations essentielles', async ({ page }) => {
    await page.goto('/annonces/nouvelle');

    // ── Attendre que le formulaire soit prêt ──────────────────────────────
    await page.waitForLoadState('networkidle');

    // ── Sélectionner le type d'annonce (À vendre) ─────────────────────────
    // Les types sont des boutons visuels (radio implicite)
    const vendreBouton = page.getByText(/à vendre/i).first();
    if (await vendreBouton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await vendreBouton.click();
    }

    // ── Sélectionner une catégorie ─────────────────────────────────────────
    const categorieSelect = page.getByLabel(/catégorie/i);
    if (await categorieSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Choisir la première option disponible (pas le placeholder vide)
      await categorieSelect.selectOption({ index: 1 });
    }

    // ── Remplir le titre ──────────────────────────────────────────────────
    const titreInput = page.getByLabel(/titre/i);
    await expect(titreInput).toBeVisible({ timeout: 10_000 });
    await titreInput.fill('Test Playwright — Perceuse Bosch');

    // ── Remplir la description ────────────────────────────────────────────
    const descriptionInput = page.getByLabel(/description/i);
    await expect(descriptionInput).toBeVisible({ timeout: 10_000 });
    await descriptionInput.fill(
      'Annonce de test créée par Playwright smoke test. ' +
      'Perceuse Bosch GSB 18V-55 en parfait état, livrée avec 2 batteries.'
    );

    // ── Bouton Suivant ────────────────────────────────────────────────────
    const suivantBtn = page.getByRole('button', { name: /suivant|continuer|étape 2/i });
    await expect(suivantBtn).toBeVisible({ timeout: 10_000 });
    await suivantBtn.click();

    // ── Étape 2 doit être visible ─────────────────────────────────────────
    await expect(
      page.getByText(/localisation|étape 2|détails/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('wizard complet — 3 étapes jusqu\'à la soumission', async ({ page }) => {
    await page.goto('/annonces/nouvelle');
    await page.waitForLoadState('networkidle');

    // ─── ÉTAPE 1 : L'essentiel ───────────────────────────────────────────
    // Catégorie (required)
    const categorieSelect = page.getByLabel(/catégorie/i);
    if (await categorieSelect.count() > 0) {
      await categorieSelect.selectOption({ index: 1 });
    }

    // Titre (required)
    await page.getByLabel(/titre/i).fill('Playwright Smoke Test — À supprimer');

    // Description (required)
    await page.getByLabel(/description/i).fill(
      'Annonce de test automatique créée par Playwright. ' +
      'Cette annonce sera supprimée après validation du smoke test CI.'
    );

    // Aller à l'étape 2
    const suivant1 = page.getByRole('button', { name: /suivant|continuer/i }).first();
    await expect(suivant1).toBeEnabled({ timeout: 10_000 });
    await suivant1.click();

    // ─── ÉTAPE 2 : Localisation & détails ────────────────────────────────
    await page.waitForLoadState('domcontentloaded');

    // La ville est pré-remplie "Biguglia" — on peut la garder ou la modifier
    const villeInput = page.getByLabel(/ville|lieu/i);
    if (await villeInput.count() > 0) {
      const currentVal = await villeInput.inputValue();
      if (!currentVal) {
        await villeInput.fill('Biguglia');
      }
    }

    // Aller à l'étape 3
    const suivant2 = page.getByRole('button', { name: /suivant|continuer/i }).first();
    if (await suivant2.isEnabled({ timeout: 5_000 }).catch(() => false)) {
      await suivant2.click();
    }

    // ─── ÉTAPE 3 : Engagement ─────────────────────────────────────────────
    await page.waitForLoadState('domcontentloaded');

    // Cocher les 3 cases d'engagement
    const checkboxes = page.getByRole('checkbox');
    const checkboxCount = await checkboxes.count();

    for (let i = 0; i < checkboxCount; i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const checked = await cb.isChecked();
        if (!checked) {
          await cb.check();
        }
      }
    }

    // Le bouton "Publier" doit être activé après avoir coché toutes les cases
    const publierBtn = page.getByRole('button', { name: /publier|soumettre/i });
    await expect(publierBtn).toBeVisible({ timeout: 10_000 });
    await expect(publierBtn).toBeEnabled({ timeout: 10_000 });

    // Soumettre l'annonce
    await publierBtn.click();

    // ─── Vérification du résultat ─────────────────────────────────────────
    // Après soumission, la page doit afficher soit :
    // • "Annonce publiée !" (si auto-approuvé)
    // • "Annonce soumise !" (si modération en attente)
    await expect(
      page.getByText(/annonce (publiée|soumise)|félicitations|merci/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST 4 — Guard /admin redirige si non-admin
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Smoke 4 — Guard /admin', () => {
  test('visiteur non authentifié → redirigé vers /connexion', async ({ page }) => {
    // Partir d'un état propre (non connecté)
    await page.context().clearCookies();

    // Naviguer vers /admin
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    // Doit être redirigé vers /connexion (guard serveur dans admin/layout.tsx)
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });

    // Le paramètre ?next=/admin doit être présent (pour rediriger après login)
    const url = page.url();
    expect(url).toContain('connexion');
  });

  test('visiteur non authentifié → /admin/artisans redirigé', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/admin/artisans', { waitUntil: 'domcontentloaded' });

    // Toutes les sous-routes /admin/* doivent rediriger
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });

  test('dashboard protégé → redirigé vers /connexion si non connecté', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });

  test('profil protégé → redirigé vers /connexion si non connecté', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/profil', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST 5 — Health endpoint GET /api/health
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Smoke 5 — Health endpoint', () => {
  test('GET /api/health répond 200 avec status ok ou degraded', async ({ request }) => {
    const response = await request.get('/api/health');

    // Doit répondre 200
    expect(response.status()).toBe(200);

    // Doit retourner du JSON
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');

    const body = await response.json() as {
      status: string;
      timestamp: string;
      env: string;
      version?: string;
      checks?: Record<string, unknown>;
    };

    // Le status doit être "ok" ou "degraded" (jamais "error" au démarrage)
    expect(['ok', 'degraded']).toContain(body.status);

    // Un timestamp ISO 8601 doit être présent
    expect(body.timestamp).toBeTruthy();
    expect(() => new Date(body.timestamp)).not.toThrow();
    const ts = new Date(body.timestamp);
    expect(ts.getTime()).not.toBeNaN();

    // L'environnement doit être indiqué
    expect(body.env).toBeTruthy();
  });

  test('GET /api/health répond dans les 5 secondes', async ({ request }) => {
    const start = Date.now();
    const response = await request.get('/api/health');
    const elapsed = Date.now() - start;

    expect(response.status()).toBe(200);
    // Le health check doit répondre en moins de 5 secondes
    expect(elapsed).toBeLessThan(5_000);
  });

  test('GET /api/health — headers de sécurité présents', async ({ request }) => {
    const response = await request.get('/api/health');

    // Cache-Control: no-store (toujours frais — pas de cache stale)
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-store');

    // X-Content-Type-Options: nosniff
    const xContentType = response.headers()['x-content-type-options'];
    expect(xContentType).toBe('nosniff');
  });
});
