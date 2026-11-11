import { describe, expect, it } from 'vitest';
import { formatSignInError } from './auth-error-message';

describe('Connexion — messages d’erreur sans HTML distant', () => {
  it('indique les identifiants incorrects sans accusation de panne', () => {
    expect(formatSignInError({ message: 'Invalid login credentials', status: 400 })).toContain('mot de passe');
  });
  it('identifie les erreurs réseau /auth/v1/token', () => {
    expect(formatSignInError({ message: 'Unexpected error', status: 522 })).toContain('momentanément indisponible');
    expect(formatSignInError({ message: 'Failed to fetch' })).toContain('momentanément indisponible');
  });
  it('ne montre pas une réponse HTML Cloudflare dans un toast', () => {
    const message = formatSignInError({ message: '<!DOCTYPE html><html><title>524</title></html>', status: 0 });
    expect(message).not.toContain('<html>');
    expect(message).toContain('momentanément indisponible');
  });
  it('explique une limitation du nombre de tentatives', () => {
    expect(formatSignInError({ message: 'rate limit', status: 429 })).toContain('Trop de tentatives');
  });
});
