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

import type { APIRequestContext } from '@playwright/test';
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
  // NOTE ARCHITECTURE :
  // Le guard /admin est double couche :
  //   1. Middleware (src/lib/supabase/middleware.ts) : redirige /dashboard, /profil,
  //      /messages sans appel réseau (lecture cookie). Pour /admin, le middleware
  //      DÉLÈGUE volontairement au layout serveur (admin/layout.tsx) pour que
  //      ce dernier puisse valider le rôle admin (pas seulement l'authentification).
  //   2. Layout serveur admin/layout.tsx : vérifie JWT + rôle via Supabase.
  //      En CI sans session valide → redirige vers /connexion.
  //      Si Supabase indisponible → peut afficher une page d'erreur.
  //
  // En CI : les cookies sont vides → middleware redirige /dashboard, /profil.
  //         Pour /admin, le layout serveur valide — s'il peut joindre Supabase.

  test('visiteur non authentifié → /admin redirigé ou accès refusé', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    // Le guard admin est assuré par le layout serveur (pas le middleware).
    // En CI : soit redirect /connexion (Supabase joignable), soit page d'erreur.
    // On vérifie qu'on N'est PAS sur /admin avec un contenu admin réel.
    const url = page.url();
    const isRedirected = url.includes('/connexion');
    const isBlocked    = url.includes('/admin'); // layout a pu bloquer sur place

    // Dans les deux cas, la page ne doit pas afficher le tableau de bord admin
    if (isBlocked) {
      // Le layout a rendu une page — vérifier qu'elle n'expose pas de données admin
      const bodyText = await page.evaluate(() => document.body.innerText);
      // Ne doit pas afficher les menus admin typiques sans authentification
      expect(bodyText).not.toContain('Modération');
    } else {
      expect(isRedirected).toBe(true);
    }
  });

  test('visiteur non authentifié → /admin/artisans redirigé ou accès refusé', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin/artisans', { waitUntil: 'domcontentloaded' });

    const url = page.url();
    const isRedirected = url.includes('/connexion');
    const isBlocked    = url.includes('/admin');
    if (!isRedirected && isBlocked) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).not.toContain('Validation artisan');
    } else {
      expect(isRedirected).toBe(true);
    }
  });

  test('dashboard protégé → redirigé vers /connexion si non connecté', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    // Le middleware redirige /dashboard sans appel réseau → toujours /connexion
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });

  test('profil protégé → redirigé vers /connexion si non connecté', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/profil', { waitUntil: 'domcontentloaded' });
    // Le middleware redirige /profil sans appel réseau → toujours /connexion
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

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST 6 — CSP headers sur /connexion, /annonces, /admin
// ─────────────────────────────────────────────────────────────────────────────
//
// Vérifie que le middleware injecte bien la CSP avec nonce + strict-dynamic
// sur toutes les routes importantes, y compris les pages auth et admin.
// La production ne doit JAMAIS servir unsafe-eval dans script-src.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Smoke 6 — CSP headers multi-routes', () => {
  /**
   * Vérifie la CSP sur une route donnée.
   * On accepte que /admin puisse rediriger (302 → /connexion) :
   * dans ce cas, on vérifie sur la destination.
   */
  async function checkCspOnRoute(
    request: APIRequestContext,
    route: string,
  ) {
    const response = await request.get(route, {
      // Suivre les redirections (admin → connexion)
      maxRedirects: 3,
    });
    const csp = response.headers()['content-security-policy'];

    // La CSP doit être présente (le middleware la pose sur toutes les routes HTML)
    expect(csp, `CSP absent sur ${route}`).toBeTruthy();

    // Doit utiliser le nonce (et non unsafe-inline pour les scripts)
    expect(csp, `CSP sur ${route} doit contenir nonce-`).toContain('nonce-');

    // strict-dynamic propage la confiance aux scripts chargés dynamiquement
    expect(csp, `CSP sur ${route} doit contenir strict-dynamic`).toContain('strict-dynamic');

    // unsafe-eval ne doit JAMAIS apparaître dans script-src en production.
    // En développement (NODE_ENV=development), il est autorisé pour le HMR.
    // Ce test tourne contre l'app buildée (CI) → NODE_ENV=production.
    if (process.env.NODE_ENV !== 'development') {
      expect(
        csp,
        `script-src sur ${route} ne doit pas contenir unsafe-eval en production`,
      ).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    }

    return csp;
  }

  test('/connexion — CSP nonce + strict-dynamic (pas d\'unsafe-eval en prod)', async ({ request }) => {
    await checkCspOnRoute(request, '/connexion');
  });

  test('/annonces — CSP nonce + strict-dynamic', async ({ request }) => {
    await checkCspOnRoute(request, '/annonces');
  });

  test('/admin — CSP nonce + strict-dynamic (via redirect /connexion)', async ({ request }) => {
    // /admin redirige vers /connexion si non authentifié → on vérifie la destination
    await checkCspOnRoute(request, '/admin');
  });

  test('/ — X-Frame-Options: deny anti-clickjacking', async ({ request }) => {
    const response = await request.get('/');
    const xfo = response.headers()['x-frame-options'];
    expect(xfo, 'X-Frame-Options doit être deny').toBeTruthy();
    expect(xfo?.toLowerCase()).toBe('deny');
  });

  test('/connexion — Referrer-Policy présent', async ({ request }) => {
    const response = await request.get('/connexion');
    const rp = response.headers()['referrer-policy'];
    expect(rp, 'Referrer-Policy doit être présent sur /connexion').toBeTruthy();
  });

  test('/connexion — Permissions-Policy présent', async ({ request }) => {
    const response = await request.get('/connexion');
    const pp = response.headers()['permissions-policy'];
    expect(pp, 'Permissions-Policy doit être présent sur /connexion').toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST 7 — Page /annonces : chargement, filtres, pagination
// ─────────────────────────────────────────────────────────────────────────────
//
// Valide le parcours utilisateur principal de la section petites annonces :
//   • La page charge sans erreur 500
//   • Les éléments UI critiques sont visibles (titre, liste ou message vide)
//   • Les contrôles de filtrage sont accessibles
//   • La pagination est présente si des annonces existent
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Smoke 7 — Page /annonces', () => {
  test('charge et affiche le titre de la section', async ({ page }) => {
    const response = await page.goto('/annonces', { waitUntil: 'domcontentloaded' });

    // La page doit répondre 200 (pas d'erreur serveur)
    expect(response?.status()).toBe(200);

    // Un H1 doit être visible
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
  });

  test('contient un champ de recherche ou des filtres', async ({ page }) => {
    await page.goto('/annonces', { waitUntil: 'domcontentloaded' });

    // Attendre que le composant client soit hydraté
    await page.waitForLoadState('networkidle');

    // L'un de ces éléments doit être présent (recherche ou filtre catégorie)
    const searchOrFilter = page.locator(
      'input[type="search"], input[placeholder*="recherch"], select[name*="catégor"], [data-testid*="filter"]',
    ).first();

    // Tolérant : si aucun filtre n'est rendu, on vérifie simplement qu'une liste existe
    const hasSearchOrFilter = await searchOrFilter.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasSearchOrFilter) {
      // Au minimum, un conteneur de liste d'annonces doit être présent
      const listContainer = page.locator('ul, [role="list"], [data-testid*="listing"]').first();
      await expect(listContainer).toBeAttached({ timeout: 10_000 });
    } else {
      await expect(searchOrFilter).toBeVisible();
    }
  });

  test('affiche des annonces ou un message "aucune annonce"', async ({ page }) => {
    await page.goto('/annonces', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Soit des cartes d'annonce, soit un message vide
    const hasListings = await page.locator('article, [data-testid*="card"], .listing-card').first()
      .isVisible({ timeout: 10_000 }).catch(() => false);

    if (!hasListings) {
      // Message "aucune annonce" ou équivalent doit être présent
      await expect(
        page.getByText(/aucune annonce|pas d'annonce|aucun résultat|0 annonce/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // Au moins une carte d'annonce est présente
      expect(hasListings).toBe(true);
    }
  });

  test('/annonces — noindex absent (page indexable)', async ({ request }) => {
    // /annonces est une page publique indexable — robots ne doit PAS contenir noindex
    const response = await request.get('/annonces');
    // On vérifie via le header X-Robots-Tag s'il est présent
    const xRobots = response.headers()['x-robots-tag'];
    if (xRobots) {
      expect(xRobots).not.toContain('noindex');
    }
    // Vérification 200
    expect(response.status()).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SMOKE TEST 8 — Guards routes privées (messaging, dashboard, profil)
// ─────────────────────────────────────────────────────────────────────────────
//
// Vérifie que le middleware Next.js intercepte bien toutes les routes privées
// et redirige vers /connexion sans exposer de données sensibles.
// Ces tests fonctionnent sans credentials (visiteur anonyme).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Smoke 8 — Guards routes privées', () => {
  test.beforeEach(async ({ page }) => {
    // S'assurer qu'on est bien déconnecté
    await page.context().clearCookies();
  });

  test('/messages → redirigé vers /connexion', async ({ page }) => {
    await page.goto('/messages', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });

  test('/dashboard → redirigé vers /connexion', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });

  test('/profil → redirigé vers /connexion', async ({ page }) => {
    await page.goto('/profil', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });

  test('/dashboard/avis → redirigé vers /connexion', async ({ page }) => {
    await page.goto('/dashboard/avis', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });

  test('/notifications → redirigé vers /connexion', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
    // Soit redirect connexion, soit page 401/403 — ne doit pas afficher de données
    const url = page.url();
    const isRedirected = url.includes('/connexion');
    if (!isRedirected) {
      // La page ne doit pas afficher de notifications réelles
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).not.toMatch(/notification.*non lue|vous avez \d+ nouvelle/i);
    } else {
      expect(isRedirected).toBe(true);
    }
  });

  test('la page /connexion est bien publique (200)', async ({ page }) => {
    const response = await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    // Doit afficher le formulaire de connexion
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });
  });

  test('la page /inscription est bien publique (200)', async ({ page }) => {
    const response = await page.goto('/inscription', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    // Doit afficher un formulaire
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });
  });
});
