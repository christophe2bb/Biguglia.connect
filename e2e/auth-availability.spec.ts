import { test, expect } from './fixtures';

test.describe('Connexion disponible en cas de dégradation réseau', () => {
  test('le formulaire apparaît sans attendre une validation Supabase', async ({ page }) => {
    const response = await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('textbox', { name: /adresse email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('une panne Supabase affiche un message clair et débloque le bouton', async ({ page }) => {
    // Toutes les requêtes Supabase sont simulées : aucun compte réel contacté.
    await page.route('**/*.supabase.co/**', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'temporarily_unavailable', error_description: 'Service unavailable' }),
      });
    });
    await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: /adresse email/i }).fill('test-connexion@example.invalid');
    await page.getByLabel('Mot de passe').fill('example-not-a-real-password');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText(/service de connexion est momentanément indisponible/i))
      .toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
  });

  test('la page d’accueil continue de s’afficher même si les données distantes ralentissent', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /biguglia connect/i }).first()).toBeVisible();
  });
});
