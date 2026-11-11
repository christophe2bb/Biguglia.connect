import { test, expect } from './fixtures';

test.describe('Connexion disponible en cas de dégradation réseau', () => {
  test('le formulaire apparaît sans attendre une validation Supabase', async ({ page }) => {
    const response = await page.goto('/connexion', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('textbox', { name: /adresse email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('la page d’accueil continue de s’afficher même si les données distantes ralentissent', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /biguglia connect/i }).first()).toBeVisible();
  });
});
