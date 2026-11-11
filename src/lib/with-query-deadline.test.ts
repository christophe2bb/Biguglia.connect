import { afterEach, describe, expect, it, vi } from 'vitest';
import { withQueryDeadline } from './with-query-deadline';

afterEach(() => vi.useRealTimers());

describe('Streaming accueil — limite d’attente des widgets', () => {
  it('renvoie la réponse lorsqu’elle arrive à temps', async () => {
    await expect(withQueryDeadline(Promise.resolve(42), 100)).resolves.toBe(42);
  });

  it('interrompt l’attente si le backend ne répond jamais', async () => {
    vi.useFakeTimers();
    const pending = withQueryDeadline(new Promise<string>(() => {}), 3500);
    const expectation = expect(pending).rejects.toThrow('Home widget query deadline exceeded');
    await vi.advanceTimersByTimeAsync(3500);
    await expectation;
  });

  it('transmet une erreur authentique de la requête', async () => {
    await expect(withQueryDeadline(Promise.reject(new Error('indisponible')), 3000))
      .rejects.toThrow('indisponible');
  });
});
