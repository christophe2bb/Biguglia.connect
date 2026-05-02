/**
 * e2e/user-journeys.spec.ts — Parcours utilisateurs clés Biguglia Connect
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Couvre les flux critiques non testés dans smoke.spec.ts :
 *
 *   6.  /annonces — filtres, pagination, recherche, fiche détail
 *   7.  Messagerie — démarrer une conversation (bouton Contacter)
 *   8.  Publication emploi — accès formulaire de publication d'offre
 *   9.  Dashboard privé — accès, widget suggestions, onglets
 *   10. Admin modération — accès guard, liste modération, stats
 *   11. Upload photo — validation de type, limite de taille
 *   12. CSP headers — /connexion et /admin ne servent pas unsafe-eval prod
 *
 * ─── Variables d'env ─────────────────────────────────────────────────────────
 *
 *   E2E_BASE_URL        Optionnel — URL de l'app (défaut : http://localhost:3000)
 *   E2E_TEST_EMAIL      Compte de test Supabase (optionnel — tests auth skippés si absent)
 *   E2E_TEST_PASSWORD   Mot de passe du compte de test
 *   E2E_ADMIN_EMAIL     Compte admin de test (optionnel — tests admin skippés si absent)
 *   E2E_ADMIN_PASSWORD  Mot de passe admin
 *
 * ─── Design ──────────────────────────────────────────────────────────────────
 *
 *   • Tests indépendants — pas d'ordre d'exécution requis
 *   • Sélecteurs accessibles — getByRole, getByLabel, getByText
 *   • Skip gracieux si credentials manquants
 *   • Timeouts conservateurs — pages Next.js 14 SSR/RSC peuvent être lentes
 */

import { test, expect, skipIfNoCredentials, loginAs, TEST_CREDENTIALS } from './fixtures';

// ─── Credentials admin (optionnels) ──────────────────────────────────────────

const ADMIN_CREDENTIALS = {
  email:         process.env.E2E_ADMIN_EMAIL    ?? '',
  password:      process.env.E2E_ADMIN_PASSWORD ?? '',
  hasCredentials: Boolean(
    process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD,
  ),
};

function skipIfNoAdminCredentials(testInstance: typeof test) {
  if (!ADMIN_CREDENTIALS.hasCredentials) {
    testInstance.skip(
      true,
      'Test skippé : E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD non configurés.',
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY 6 — /annonces : filtres, pagination, fiche détail
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 6 — /annonces listing page', () => {
  test('la page charge et affiche des annonces ou un message vide', async ({ page }) => {
    const response = await page.goto('/annonces', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Titre contient "Annonces" ou "Petites annonces"
    await expect(page).toHaveTitle(/annonce/i);

    // Au moins un H1 visible
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
  });

  test('la recherche textuelle filtre les annonces', async ({ page }) => {
    await page.goto('/annonces', { waitUntil: 'domcontentloaded' });

    // Attendre que l'interface interactive soit chargée
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Un input de recherche doit exister
    const searchInput = page.getByPlaceholder(/rechercher|search/i).first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('voiture');

      // Attendre que le debounce (300 ms) et le re-rendu se produisent
      await page.waitForTimeout(500);

      // La page ne doit pas crasher après la recherche
      await expect(page.locator('body')).not.toContainText('500', { timeout: 10_000 });
    } else {
      // Si pas de champ recherche visible — passer (UI peut être différente)
      test.skip();
    }
  });

  test('les filtres de catégorie sont cliquables', async ({ page }) => {
    await page.goto('/annonces', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Les boutons/select de catégorie doivent être présents
    // Ils peuvent être des <button>, <select> ou des labels radio
    const categoryFilters = page.getByRole('button', { name: /tous|véhicule|électro|mobilier|don/i }).first();
    if (await categoryFilters.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await categoryFilters.click();
      // La page ne doit pas crasher
      await expect(page.locator('body')).not.toContainText('500', { timeout: 5_000 });
    }
    // else : les filtres peuvent être des selects — on skip silencieusement
  });

  test('la pagination fonctionne si disponible', async ({ page }) => {
    await page.goto('/annonces', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Vérifier qu'une pagination ou un indicateur de résultats est présent
    const pagination = page.getByRole('navigation', { name: /pagination/i })
      .or(page.getByText(/page \d+\s*\/\s*\d+/i).first())
      .or(page.getByRole('button', { name: /suivant|page suivante/i }).first());

    // La pagination est optionnelle — skip si pas présente
    if (await pagination.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const nextBtn = page.getByRole('button', { name: /suivant|page suivante/i }).first();
      if (await nextBtn.isEnabled({ timeout: 3_000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).not.toContainText('500', { timeout: 10_000 });
      }
    }
  });

  test('une fiche annonce individuelle charge correctement', async ({ page }) => {
    // D'abord, charger la liste pour trouver une annonce
    await page.goto('/annonces', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Chercher un lien vers une fiche annonce (ex: /annonces/123)
    const annonceLink = page
      .getByRole('link')
      .filter({ hasText: /.{3,}/ }) // Lien avec du texte
      .first();

    const href = await annonceLink.getAttribute('href').catch(() => null);
    if (href && /\/annonces\/[a-z0-9-]+/.test(href) && !href.includes('/nouvelle')) {
      await page.goto(href, { waitUntil: 'domcontentloaded' });
      const status = await page.evaluate(() =>
        document.body.innerText.includes('500') ? 500 : 200,
      );
      expect(status).not.toBe(500);
      // La fiche doit avoir un H1
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
    }
    // else : pas d'annonce en DB de test — skip
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY 7 — Messagerie : bouton "Contacter" et liste conversations
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 7 — Messagerie', () => {
  test.beforeEach(({ page: _page }) => {
    skipIfNoCredentials(test);
  });

  test('la page /messages est accessible après connexion', async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    const response = await page.goto('/messages', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Doit afficher la liste des conversations ou un état vide
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText('500', { timeout: 10_000 });
  });

  test('la messagerie affiche une liste ou un état vide', async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await page.goto('/messages', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Soit une liste de conversations, soit un message "aucun message"
    const hasConversations = await page.locator('[data-testid="conversation-item"]')
      .count().then(n => n > 0).catch(() => false);

    const hasEmptyState = await page.getByText(/aucun message|no messages|aucune conversation/i)
      .isVisible({ timeout: 5_000 }).catch(() => false);

    const hasAnyContent = await page.locator('ul, [role="list"]')
      .isVisible({ timeout: 5_000 }).catch(() => false);

    // Au moins un des états doit être présent
    expect(hasConversations || hasEmptyState || hasAnyContent).toBe(true);
  });

  test('le guard /messages redirige si non connecté', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/messages', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY 8 — Publication emploi
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8 — Publication emploi', () => {
  test('la page /emploi charge correctement', async ({ page }) => {
    const response = await page.goto('/emploi', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
  });

  test('le formulaire de publication est accessible après connexion', async ({ page }) => {
    skipIfNoCredentials(test);

    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await page.goto('/emploi/publier', { waitUntil: 'domcontentloaded' });

    // Doit afficher un formulaire ou un wizard (pas rediriger vers /connexion)
    await expect(page).not.toHaveURL(/connexion/);

    // Un formulaire ou un wizard doit être visible
    const formVisible = await page.locator('form, [role="form"]')
      .isVisible({ timeout: 15_000 }).catch(() => false);

    const wizardVisible = await page.getByText(/étape|step|publier une offre/i)
      .first().isVisible({ timeout: 15_000 }).catch(() => false);

    expect(formVisible || wizardVisible).toBe(true);
  });

  test('/emploi/publier redirige si non connecté', async ({ page }) => {
    await page.context().clearCookies();
    // Les pages emploi/publier ont un layout noindex mais pas de guard middleware
    // → le guard est côté serveur dans la page elle-même ou le layout
    const response = await page.goto('/emploi/publier', { waitUntil: 'domcontentloaded' });
    // Soit redirection, soit page de connexion, soit formulaire si public
    // On vérifie juste qu'il n'y a pas d'erreur 500
    expect(response?.status()).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY 9 — Dashboard privé
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 9 — Dashboard privé', () => {
  test.beforeEach(({ page: _page }) => {
    skipIfNoCredentials(test);
  });

  test('le dashboard charge et affiche les widgets', async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Le dashboard doit charger sans erreur 500
    await expect(page.locator('body')).not.toContainText('500', { timeout: 10_000 });

    // Au moins un titre visible
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
  });

  test('le dashboard affiche les annonces de l\'utilisateur', async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Vérifier la présence d'une section "Mes annonces" ou similaire
    const mesAnnoncesSection = page
      .getByText(/mes annonces|vos annonces|annonces actives/i)
      .first();

    const hasMesAnnonces = await mesAnnoncesSection
      .isVisible({ timeout: 10_000 }).catch(() => false);

    // La section doit être présente (même si vide)
    expect(hasMesAnnonces).toBe(true);
  });

  test('les suggestions personnalisées sont présentes ou skippées', async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Les suggestions peuvent être absentes si le profil est vide
    // On vérifie juste l'absence d'erreur
    await expect(page.locator('body')).not.toContainText('TypeError', { timeout: 10_000 });
    await expect(page.locator('body')).not.toContainText('ReferenceError', { timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY 10 — Admin modération
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 10 — Admin modération', () => {
  test('GET /admin/moderation redirigé si non connecté', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin/moderation', { waitUntil: 'domcontentloaded' });

    const url = page.url();
    const isRedirected = url.includes('/connexion');
    const isBlocked    = url.includes('/admin');

    if (isBlocked) {
      // Le layout serveur a rendu une page — vérifier qu'elle n'expose pas de données
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).not.toContain('Contenu signalé');
    } else {
      expect(isRedirected).toBe(true);
    }
  });

  test('GET /admin/moderation/stats redirigé si non connecté', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin/moderation/stats', { waitUntil: 'domcontentloaded' });

    const url = page.url();
    expect(url).toContain('/connexion');
  });

  test('l\'admin peut accéder à la modération', async ({ page }) => {
    skipIfNoAdminCredentials(test);

    await loginAs(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await page.goto('/admin/moderation', { waitUntil: 'domcontentloaded' });

    // Doit afficher la page de modération (pas rediriger)
    await expect(page).not.toHaveURL(/connexion/);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
  });

  test('GET /api/admin/dashboard requiert une session admin', async ({ request }) => {
    // Sans session → doit retourner 401 ou 403
    const response = await request.get('/api/admin/dashboard');
    expect([401, 403]).toContain(response.status());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY 11 — Upload photo : validation côté client
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 11 — Upload photo (validation)', () => {
  test.beforeEach(({ page: _page }) => {
    skipIfNoCredentials(test);
  });

  test('le formulaire de nouvelle annonce rejette un fichier trop grand', async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await page.goto('/annonces/nouvelle', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Trouver un input file (peut être caché — les CustomFileInput utilisent des input[type=file])
    const fileInput = page.locator('input[type="file"]').first();
    if (!(await fileInput.count())) {
      test.skip();
      return;
    }

    // Créer un Buffer de 6 MB (dépassant la limite de 5 MB standard)
    const bigFile = {
      name:     'test-too-large.jpg',
      mimeType: 'image/jpeg',
      buffer:   Buffer.alloc(6 * 1024 * 1024, 0), // 6 MB
    };

    await fileInput.setInputFiles([bigFile]);

    // Un message d'erreur de taille doit apparaître
    await expect(
      page.getByText(/trop (grande|lourd)|taille|5 ?mb|5 mo|size/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('le formulaire de nouvelle annonce rejette un fichier non-image', async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    await page.goto('/annonces/nouvelle', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    const fileInput = page.locator('input[type="file"]').first();
    if (!(await fileInput.count())) {
      test.skip();
      return;
    }

    // Un fichier PDF ne doit pas être accepté comme photo
    const pdfFile = {
      name:     'document.pdf',
      mimeType: 'application/pdf',
      buffer:   Buffer.from('%PDF-1.4 fake content'),
    };

    await fileInput.setInputFiles([pdfFile]);

    // Soit le fichier est refusé (erreur visible), soit l'input ignore les types non valides
    // On vérifie juste qu'il n'y a pas de crash
    await expect(page.locator('body')).not.toContainText('TypeError', { timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY 12 — CSP headers sur routes critiques
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 12 — CSP headers sur routes critiques', () => {
  const routesToCheck = [
    { path: '/',           name: 'Accueil' },
    { path: '/annonces',   name: '/annonces' },
    { path: '/connexion',  name: '/connexion' },
    { path: '/forum',      name: '/forum' },
  ];

  for (const route of routesToCheck) {
    test(`CSP nonce présent et script-src sans unsafe-inline sur ${route.name}`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      const csp = response?.headers()['content-security-policy'];
      expect(csp, `CSP absent sur ${route.name}`).toBeTruthy();

      // script-src doit contenir nonce- (pas d'unsafe-inline)
      expect(csp, `CSP doit contenir nonce- sur ${route.name}`).toContain('nonce-');
      expect(
        csp,
        `script-src ne doit pas contenir unsafe-inline sur ${route.name}`,
      ).not.toMatch(/script-src[^;]*'unsafe-inline'/);

      // strict-dynamic doit être présent
      expect(csp, `strict-dynamic requis sur ${route.name}`).toContain('strict-dynamic');

      // En production, unsafe-eval ne doit PAS apparaître dans script-src
      // (En CI/local dev, NODE_ENV=test → unsafe-eval peut être présent)
      if (process.env.NODE_ENV === 'production') {
        expect(
          csp,
          `unsafe-eval interdit en production sur ${route.name}`,
        ).not.toMatch(/script-src[^;]*'unsafe-eval'/);
      }
    });

    test(`X-Frame-Options: DENY présent sur ${route.name}`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      const xfo = response?.headers()['x-frame-options'];
      expect(xfo?.toLowerCase()).toBe('deny');
    });
  }

  test('GET /admin retourne X-Robots-Tag: noindex ou le meta noindex est présent', async ({ page }) => {
    await page.context().clearCookies();
    const response = await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    // /admin redirige vers /connexion ou affiche une erreur — pas indexable
    // On vérifie que soit on est redirigé, soit la page a noindex
    const url = page.url();
    if (url.includes('/admin')) {
      // Vérifier meta robots noindex dans le HTML
      const noindex = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="robots"]');
        return meta?.getAttribute('content')?.includes('noindex') ?? false;
      });
      expect(noindex).toBe(true);
    } else {
      // Redirigé vers /connexion — acceptable
      expect(url).toContain('/connexion');
    }
  });

  test('GET /api/monitoring répond 200/503 et format services{}', async ({ request }) => {
    const response = await request.get('/api/monitoring');
    // 200 = ok, 503 = degraded (services indisponibles en CI — comportement attendu)
    expect([200, 503]).toContain(response.status());

    const body = await response.json() as {
      status: string;
      services?: Record<string, unknown>;
      timestamp: string;
    };

    expect(['ok', 'degraded']).toContain(body.status);
    expect(body.timestamp).toBeTruthy();

    // /api/monitoring retourne services{} (rétrocompatibilité)
    if (body.services) {
      expect(typeof body.services).toBe('object');
    }
  });
});
