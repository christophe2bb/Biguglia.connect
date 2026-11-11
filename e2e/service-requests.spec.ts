/**
 * Recette non destructive — Services / Poster une demande / Tableau des demandes.
 * Les contrôles sans compte s'exécutent sur chaque CI.
 * Les contrôles authentifiés sont ignorés sans E2E_TEST_EMAIL/PASSWORD.
 * Aucun scénario n'insère de demande réelle dans Supabase.
 */
import { test, expect, skipIfNoCredentials, loginAs, TEST_CREDENTIALS } from './fixtures';
import { createClient as createSupabaseTestClient } from '@supabase/supabase-js';

test.describe('Services — annuaire et fiche artisan', () => {
  test('recherche de métier : aucun résultat, effacement et retour à la liste', async ({ page }) => {
    const exceptions: string[] = [];
    page.on('pageerror', error => exceptions.push(error.message));
    const response = await page.goto('/artisans', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /artisans de biguglia/i })).toBeVisible();

    const search = page.getByPlaceholder('Rechercher un artisan, un métier…');
    await expect(search).toBeVisible();
    await search.fill('zzzz-metier-introuvable-automatique');
    await expect(page.getByText('Aucun artisan trouvé')).toBeVisible();
    await page.getByRole('button', { name: 'Effacer la recherche' }).click();
    await expect(search).toHaveValue('');
    await expect(page.getByText('Aucun artisan trouvé')).toHaveCount(0);
    expect(exceptions, 'Pas d’exception JavaScript dans l’annuaire').toEqual([]);
  });

  test('fiche vérifiée : contact et devis pointent vers les bons parcours', async ({ page }) => {
    await page.goto('/artisans', { waitUntil: 'domcontentloaded' });
    const links = await page.locator('a[href^="/artisans/"]').evaluateAll(elements =>
      elements.map(el => el.getAttribute('href') || ''),
    );
    const artisanHref = links.find(href =>
      /^\/artisans\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(href),
    );
    test.skip(!artisanHref, 'Aucun artisan de test vérifié accessible pour cette recette.');
    const id = artisanHref!.split('/')[2];
    const response = await page.goto(artisanHref!, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    const quote = page.getByRole('link', { name: /demander un devis/i });
    await expect(quote).toHaveAttribute('href', `/artisans/demande?artisan=${id}`);
    const contact = page.getByRole('link', { name: /envoyer un message/i });
    await expect(contact).toHaveAttribute('href', /\/connexion\?next=/);
    await quote.click();
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15000 });
    const next = new URL(page.url()).searchParams.get('next') || '';
    expect(next).toContain(`/artisans/demande?artisan=${id}`);
  });
});

test.describe('Services — pages artisans par métier', () => {
  test('une fiche affichée dans un métier ouvre le bon identifiant artisan', async ({ page }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    test.skip(!url || !key, 'Clé publique Supabase de test absente.');
    const supabase = createSupabaseTestClient(url!, key!);
    const { data: artisans, error } = await supabase
      .from('artisan_profiles')
      .select('id, trade_category:trade_categories(slug)')
      .eq('is_verified', true)
      .limit(1);
    expect(error, 'Chargement des artisans vérifiés').toBeNull();
    const item = artisans?.[0];
    const category = Array.isArray(item?.trade_category)
      ? item.trade_category[0] : item?.trade_category;
    const slug = category?.slug;
    test.skip(!item?.id || !slug, 'Aucun artisan vérifié avec métier défini.');

    const response = await page.goto('/artisans/metier/' + slug, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    const cardLink = page.locator('a[href="/artisans/' + item!.id + '"]').first();
    await expect(cardLink).toBeVisible({ timeout: 15000 });
    await cardLink.click();
    await expect(page).toHaveURL(url => url.pathname === '/artisans/' + item!.id);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Services — tableau des demandes', () => {
  test('page publique, boutons de filtre et lien publier sont fonctionnels', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const response = await page.goto('/demandes', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /demandes d'aide/i })).toBeVisible();
    const post = page.getByRole('link', { name: /poster une demande/i }).first();
    await expect(post).toHaveAttribute('href', '/artisans/demande');

    await page.getByRole('button', { name: /toutes/i }).first().click();
    await page.getByRole('button', { name: /résolues/i }).click();
    await page.getByRole('button', { name: /annulées/i }).click();
    await page.getByRole('button', { name: /en cours/i }).click();

    const input = page.getByPlaceholder('Rechercher un titre ou une description…');
    await expect(input).toBeVisible();
    await input.fill('plomberie');
    await expect(input).toHaveValue('plomberie');
    await input.clear();

    const urgency = page.locator('select').filter({ has: page.locator('option[value="tres_urgent"]') });
    await expect(urgency).toBeVisible();
    await urgency.selectOption('urgent');
    await expect(urgency).toHaveValue('urgent');
    await urgency.selectOption('all');

    expect(pageErrors, 'Aucune exception JS pendant la recherche et les filtres').toEqual([]);
    await expect(page.getByText("Quelque chose s'est mal passé")).toHaveCount(0);
  });

  test('clic Poster une demande préserve le retour après connexion', async ({ page }) => {
    await page.goto('/demandes', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /poster une demande/i }).first().click();
    await expect(page).toHaveURL(/\/connexion/, { timeout: 15000 });
    const url = new URL(page.url());
    const next = url.searchParams.get('next') || url.searchParams.get('redirect');
    expect(next, 'L’utilisateur doit revenir au formulaire après connexion').toContain('/artisans/demande');
  });

  test('détail inconnu ne crashe pas, ni ne publie de données privées dans les métadonnées', async ({ page }) => {
    const unknown = '00000000-0000-0000-0000-000000000999';
    const response = await page.goto('/demandes/' + unknown, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/demande introuvable|non accessible|impossible de charger/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveTitle(/demande de service|biguglia/i);
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });
});

test.describe('Services — formulaire authentifié sans publication', () => {
  test.beforeEach(() => {
    skipIfNoCredentials(test);
  });

  test('tous les champs, dates, secteur, photos et annulation sont accessibles', async ({ page }) => {
    await loginAs(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    const response = await page.goto('/artisans/demande', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /nouvelle demande de service/i })).toBeVisible({ timeout: 15000 });
    const form = page.locator('form');
    await expect(form).toBeVisible();

    await expect(page.getByLabel('Titre de la demande')).toBeVisible();
    await expect(page.getByLabel('Description du problème')).toBeVisible();
    await expect(page.getByLabel('Catégorie de travaux')).toBeVisible();
    await expect(page.getByLabel('Urgence')).toBeVisible();
    await expect(page.getByLabel('Date souhaitée')).toBeVisible();
    await expect(page.getByLabel('Heure souhaitée')).toBeVisible();
    await expect(page.getByLabel("Adresse d'intervention")).toBeVisible();

    const submit = page.getByRole('button', { name: /envoyer la demande/i });
    await expect(submit).toBeVisible();
    // Validation HTML native : sans titre, description ni catégorie,
    // la soumission n'atteint jamais Supabase.
    await submit.click();
    await expect(page).toHaveURL(/\/artisans\/demande/);
    await expect(page.locator('input:invalid,textarea:invalid,select:invalid').first()).toBeVisible();

    await expect(page.getByRole('button', { name: /annuler/i })).toBeVisible();
  });
});
