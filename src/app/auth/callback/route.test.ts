import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }),
}));
import { GET } from './route';

describe('authentication callback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.exchange.mockReset().mockResolvedValue({ error: null });
  });
  afterEach(() => vi.useRealTimers());

  it('keeps a successful callback on the site when next is external', async () => {
    const response = await GET(new Request('https://biguglia-connect.fr/auth/callback?code=test&next=//example.com'));
    expect(response.headers.get('location')).toBe('https://biguglia-connect.fr/dashboard');
  });

  it('preserves an internal destination after verification', async () => {
    const response = await GET(new Request('https://biguglia-connect.fr/auth/callback?code=test&next=/messages/123'));
    expect(response.headers.get('location')).toBe('https://biguglia-connect.fr/messages/123');
  });

  it('returns to the login form if the service fails', async () => {
    mocks.exchange.mockRejectedValue(new Error('Network unavailable'));
    const response = await GET(new Request('https://biguglia-connect.fr/auth/callback?code=test'));
    expect(response.headers.get('location')).toBe('https://biguglia-connect.fr/connexion?error=auth');
  });

  it('does not leave a slow callback loading indefinitely', async () => {
    mocks.exchange.mockReturnValue(new Promise(() => {}));
    const pending = GET(new Request('https://biguglia-connect.fr/auth/callback?code=test'));
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await pending;
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/connexion?error=auth');
  });
});
