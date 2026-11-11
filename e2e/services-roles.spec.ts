/**
 * Recette manuelle stricte, non destructive, de trois rôles authentifiés.
 * Déclenchement : STRICT_E2E=true avec six secrets E2E_* (comptes de test).
 * En CI standard elle est explicitement ignorée. En recette stricte, une
 * absence de credentials est une erreur, jamais un faux succès/skip.
 * Aucune nouvelle demande, devis, photo ou message n'est publié.
 */
import { test, expect, loginAs } from './fixtures';

const credentials = {
  resident: { email: process.env.E2E_RESIDENT_EMAIL ?? '', password: process.env.E2E_RESIDENT_PASSWORD ?? '' },
  artisan:  { email: process.env.E2E_ARTISAN_EMAIL ?? '',  password: process.env.E2E_ARTISAN_PASSWORD ?? '' },
  admin:    { email: process.env.E2E_ADMIN_EMAIL ?? '',    password: process.env.E2E_ADMIN_PASSWORD ?? '' },
};

test.describe('Services — trois rôles authentifiés (recette stricte)', () => {
  test.skip(process.env.STRICT_E2E !== 'true',
    'Recette multi-comptes désactivée : nécessite STRICT_E2E=true et des comptes dédiés.');

  test.beforeAll(() => {
    const missing = Object.entries(credentials).flatMap(([role, user]) =>
      [
        ...(!user.email ? [`E2E_${role.toUpperCase()}_EMAIL`] : []),
        ...(!user.password ? [`E2E_${role.toUpperCase()}_PASSWORD`] : []),
      ]);
    if (missing.length > 0) {
      throw new Error(`Recette Services impossible : secrets de test absents : ${missing.join(', ')}`);
    }
    const addresses = Object.values(credentials).map(user => user.email.trim().toLowerCase());
    if (new Set(addresses).size !== 3) {
      throw new Error('Recette Services : utiliser trois comptes différents et réservés aux tests.');
    }
  });

  test('habitant : accès au formulaire et à ses devis privés', async ({ page }) => {
    await loginAs(page, credentials.resident.email, credentials.resident.password);
    const formResponse = await page.goto('/artisans/demande');
    expect(formResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /nouvelle demande de service/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /envoyer la demande/i })).toBeVisible();
    await page.goto('/demandes');
    await expect(page.getByRole('button', { name: /mes devis envoyés/i })).toBeVisible();
    // Un résident connecté ne peut pas consulter les documents administratifs.
    const adminResponse = await page.request.get('/api/admin/artisans');
    expect(adminResponse.status()).toBe(403);
    const foreignConversation = await page.request.get(
      '/api/messages/conversation/00000000-0000-4000-8000-000000000999',
    );
    expect(foreignConversation.status()).toBe(403);
  });

  test('artisan vérifié : accès à son espace et aux demandes', async ({ page }) => {
    await loginAs(page, credentials.artisan.email, credentials.artisan.password);
    await page.goto('/dashboard/artisan');
    await expect(page.getByRole('heading', { name: /espace artisan/i })).toBeVisible();
    await page.goto('/demandes');
    await expect(page.getByRole('button', { name: /mes devis reçus/i })).toBeVisible();
    const adminResponse = await page.request.get('/api/admin/artisans');
    expect(adminResponse.status()).toBe(403);
  });

  test('administrateur : accès à la gestion des artisans', async ({ page }) => {
    await loginAs(page, credentials.admin.email, credentials.admin.password);
    const response = await page.goto('/admin/artisans');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /gestion des artisans/i })).toBeVisible();
    // Le rôle administrateur est vérifié côté serveur (pas seulement dans l'interface).
    const artisansResponse = await page.request.get('/api/admin/artisans');
    expect(artisansResponse.status()).toBe(200);
    const usersResponse = await page.request.get('/api/admin/users');
    expect(usersResponse.status()).toBe(200);
  });
});
