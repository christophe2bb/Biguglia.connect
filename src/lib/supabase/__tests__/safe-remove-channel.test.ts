import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// La validation d'environnement est exécutée lors de l'import de client.ts.
// Les tests n'utilisent aucune vraie connexion Supabase.
vi.mock('../env', () => ({
  assertSupabaseClientEnv: () => ({
    url: 'https://test.supabase.co',
    anonKey: 'anon-test-key-long-enough-for-unit-tests',
  }),
}));

import { safeRemoveChannel } from '../client';

type Client = Parameters<typeof safeRemoveChannel>[0];
type Channel = Parameters<typeof safeRemoveChannel>[1];

describe('safeRemoveChannel — cycle de vie Realtime', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('ne rappelle jamais subscribe() sur un canal déjà en joining', async () => {
    const channel = { state: 'joining', subscribe: vi.fn() };
    const removeChannel = vi.fn().mockResolvedValue('ok');
    const finished = safeRemoveChannel(
      { removeChannel } as unknown as Client,
      channel as unknown as Channel,
    );

    expect(removeChannel).not.toHaveBeenCalled();
    channel.state = 'joined';
    await vi.advanceTimersByTimeAsync(100);
    await finished;

    expect(channel.subscribe).not.toHaveBeenCalled();
    expect(removeChannel).toHaveBeenCalledOnce();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  it('retire immédiatement un canal déjà actif', async () => {
    const channel = { state: 'joined', subscribe: vi.fn() };
    const removeChannel = vi.fn().mockResolvedValue('ok');

    await safeRemoveChannel(
      { removeChannel } as unknown as Client,
      channel as unknown as Channel,
    );

    expect(channel.subscribe).not.toHaveBeenCalled();
    expect(removeChannel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('libère au bout de 5 secondes un canal restant bloqué en joining', async () => {
    const channel = { state: 'joining', subscribe: vi.fn() };
    const removeChannel = vi.fn().mockResolvedValue('ok');
    const finished = safeRemoveChannel(
      { removeChannel } as unknown as Client,
      channel as unknown as Channel,
    );

    await vi.advanceTimersByTimeAsync(5_000);
    await finished;

    expect(channel.subscribe).not.toHaveBeenCalled();
    expect(removeChannel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
