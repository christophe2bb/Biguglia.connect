/**
 * Recette Services sans compte ni écriture : sécurité des routes et mobile.
 * Exécutée en CI dans un vrai navigateur, contre Next.js démarré localement.
 * N'utilise ni données réelles, ni identifiants Supabase, ni service_role.
 */
import { test, expect } from './fixtures';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000999';

test.describe('Services — accès privé en utilisateur déconnecté', () => {
  test('les listes de conversations et les messages non lus exigent une connexion', async ({ request }) => {
    for (const path of ['/api/messages/conversations', '/api/messages/unread']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), `${path} doit refuser un visiteur anonyme`).toBe(401);
      const body = await response.json() as Record<string, unknown>;
      expect(body.error).toBeTruthy();
      expect(body).not.toHaveProperty('messages');
      expect(body).not.toHaveProperty('participations');
    }
  });

  test('les dossiers administratifs artisans et utilisateurs sont inaccessibles sans connexion', async ({ request }) => {
    for (const path of ['/api/admin/artisans', '/api/admin/users']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), 'Accès anonyme interdit : ' + path).toBe(401);
      const body = await response.json() as Record<string, unknown>;
      expect(body.error).toBeTruthy();
      expect(body).not.toHaveProperty('artisans');
      expect(body).not.toHaveProperty('users');
    }
  });

  test('ouvrir une conversation privée ou envoyer un message exige une session', async ({ request }) => {
    const origin = new URL(test.info().project.use.baseURL ?? 'http://localhost:3000').origin;
    const attempts = [
      { path: '/api/messages/start-conversation', body: { ownerId: UNKNOWN_ID, relatedType: 'artisan', relatedId: UNKNOWN_ID, initialMsg: 'QA sans session' } },
      { path: '/api/messages/conversation/' + UNKNOWN_ID, body: { content: 'QA sans session' } },
    ];
    for (const attempt of attempts) {
      const response = await request.post(attempt.path, {
        data: attempt.body,
        headers: { Origin: origin },
        maxRedirects: 0,
      });
      expect(response.status(), attempt.path + ' doit refuser tout envoi anonyme').toBe(401);
      const body = await response.json() as Record<string, unknown>;
      expect(body.error).toBeTruthy();
      expect(body).not.toHaveProperty('conversationId');
    }
  });

  test('une origine externe ne peut pas déclencher un démarrage de conversation', async ({ request }) => {
    const response = await request.post('/api/messages/start-conversation', {
      data: { ownerId: UNKNOWN_ID, relatedType: 'artisan', relatedId: UNKNOWN_ID },
      headers: { Origin: 'https://site-etranger-invalide.example' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
    const body = await response.json() as Record<string, unknown>;
    expect(body.error).toBeTruthy();
  });
  test('le détail d’une conversation exige une authentification', async ({ request }) => {
    const response = await request.get(`/api/messages/conversation/${UNKNOWN_ID}`, { maxRedirects: 0 });
    expect(response.status()).toBe(401);
    const body = await response.json() as Record<string, unknown>;
    expect(body).not.toHaveProperty('participants');
    expect(body).not.toHaveProperty('messages');
  });

  test('une photo de devis privé est protégée, sans stockage navigateur', async ({ request }) => {
    const response = await request.get(
      `/api/service-requests/${UNKNOWN_ID}/photos/photo-essai.jpg`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(401);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    const body = await response.json() as Record<string, unknown>;
    expect(body.error).toBeTruthy();
    expect(body).not.toHaveProperty('url');
  });

  test('une tentative de traversée de dossier photo ne doit pas accéder au stockage', async ({ request }) => {
    const response = await request.get(
      `/api/service-requests/${UNKNOWN_ID}/photos/%2e%2e%2fsecret.jpg`,
      { maxRedirects: 0 },
    );
    expect([400, 404]).toContain(response.status());
    expect(response.headers()['content-type']).toContain('application/json');
  });
});

test.describe('Services — navigation mobile et ergonomie', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('le tableau des demandes reste accessible sur petit écran', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto('/demandes', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /demandes d'aide/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /poster une demande/i }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Rechercher un titre ou une description…')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('l’annuaire reste consultable sur un écran de téléphone', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto('/artisans', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /artisans de biguglia/i })).toBeVisible();
    await expect(page.getByPlaceholder('Rechercher un artisan, un métier…')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
