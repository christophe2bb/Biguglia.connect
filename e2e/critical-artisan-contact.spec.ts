/**
 * Recette métier stricte — contact artisan → messagerie.
 *
 * Nécessite deux comptes de test dédiés : un visiteur (E2E_TEST_*)
 * et un artisan de test existant (E2E_ARTISAN_ID).
 * Ne jamais utiliser un vrai artisan/client : cette recette envoie un message.
 *
 * La CI générale ne considère PAS cette recette comme validée : elle n'est
 * exécutée que par le workflow manuel avec STRICT_E2E=true.
 */
import { test, expect, loginAs } from './fixtures';

test('artisan → envoyer un message → conversation ouverte → réponse envoyée', async ({ page }) => {
  test.skip(process.env.STRICT_E2E !== 'true', 'Recette authentifiée distincte de la CI smoke.');

  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const artisanId = process.env.E2E_ARTISAN_ID;
  if (!email || !password || !artisanId) {
    throw new Error('Recette impossible : E2E_TEST_EMAIL, E2E_TEST_PASSWORD et E2E_ARTISAN_ID requis.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(artisanId)) {
    throw new Error('E2E_ARTISAN_ID doit être un UUID de fixture.');
  }

  const exceptions: string[] = [];
  page.on('pageerror', e => exceptions.push(e.name + ': ' + e.message));

  await loginAs(page, email, password);
  await page.goto(`/artisans/${artisanId}`, { waitUntil: 'domcontentloaded' });

  const contact = page.getByRole('button', { name: /envoyer un message/i });
  await expect(contact).toBeVisible({ timeout: 15_000 });
  await contact.click();

  await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/i, { timeout: 20_000 });
  await expect(page.getByText("Quelque chose s'est mal passé")).toHaveCount(0);

  const input = page.getByPlaceholder(/écrivez votre message/i);
  await expect(input).toBeVisible({ timeout: 15_000 });
  const content = 'Recette automatique contrôlée — ' + Date.now();
  await input.fill(content);
  await page.getByRole('button', { name: 'Envoyer le message' }).click();
  await expect(page.getByText(content)).toBeVisible({ timeout: 15_000 });
  expect(exceptions, 'Aucune exception JavaScript lors du parcours artisan').toEqual([]);
});
