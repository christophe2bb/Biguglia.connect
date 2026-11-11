import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('post-login destinations', () => {
  it.each([
    undefined, null, '', 'https://example.com', '//example.com',
    '/\\example.com', '/\n/example.com', 'javascript:alert(1)',
    '/connexion', '/connexion/?next=/admin', '/auth/callback?code=test',
    '/dashboard/../connexion',
  ])('rejects an external or looping destination: %s', (value) => {
    expect(safeRedirectPath(value)).toBe('/dashboard');
  });

  it.each(['/', '/messages/123', '/admin', '/annonces?q=outils#resultats'])('keeps an internal destination: %s', (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });
});
