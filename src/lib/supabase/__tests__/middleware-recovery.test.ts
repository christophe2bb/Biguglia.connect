import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CookieOptions } from '@supabase/ssr';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://recovery-test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'recovery-test-public-anon-key';
  return { getSession: vi.fn(), createServerClient: vi.fn() };
});

type Options = {
  global: { fetch: typeof fetch };
  cookies: { setAll: (cookies: Array<{ name: string; value: string; options?: CookieOptions }>) => void };
};
let options: Options;

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient.mockImplementation((_url, _key, config: Options) => {
    options = config;
    return { auth: { getSession: mocks.getSession } };
  }),
}));

import { updateSession } from '../middleware';

const COOKIE_NAME = 'sb-recovery-test-auth-token';
const cookie = JSON.stringify({ access_token: 'eyJ.test.signature' });
function request(path = '/annonces') {
  return new NextRequest(`https://biguglia-connect.fr${path}`, { headers: { cookie: `${COOKIE_NAME}=${cookie}` } });
}

describe('opening pages when session refresh fails', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
    mocks.createServerClient.mockClear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens anonymous pages without starting a session refresh', async () => {
    const response = await updateSession(new NextRequest('https://biguglia-connect.fr/'));
    expect(response.status).toBe(200);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('still redirects anonymous visitors away from private pages', async () => {
    const response = await updateSession(new NextRequest('https://biguglia-connect.fr/messages'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://biguglia-connect.fr/connexion?next=%2Fmessages');
  });

  it('opens a public page when the auth service throws', async () => {
    mocks.getSession.mockRejectedValue(new Error('Service unavailable'));
    expect((await updateSession(request())).status).toBe(200);
  });

  it('aborts a stuck refresh after five seconds and ignores late cookie writes', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    mocks.getSession.mockImplementation(() => options.global.fetch('https://recovery-test.supabase.co/auth/v1/token'));
    const pending = updateSession(request());
    await vi.advanceTimersByTimeAsync(5_000);
    const response = await pending;
    expect(response.status).toBe(200);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal?.aborted).toBe(true);
    options.cookies.setAll([{ name: COOKIE_NAME, value: 'late' }]);
    expect(response.cookies.get(COOKIE_NAME)).toBeUndefined();
  });

  it('forwards refreshed cookies and extra headers to Server Components', async () => {
    mocks.getSession.mockImplementation(async () => {
      options.cookies.setAll([{ name: COOKIE_NAME, value: 'refreshed-session' }]);
      return { data: { session: null }, error: null };
    });
    const response = await updateSession(request(), new Headers({ 'x-nonce': 'request-nonce' }));
    expect(response.headers.get('x-middleware-request-cookie')).toContain('refreshed-session');
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe('request-nonce');
    expect(response.cookies.get(COOKIE_NAME)?.value).toBe('refreshed-session');
  });

  it('preserves cookie deletion when redirecting to the login page', async () => {
    mocks.getSession.mockImplementation(async () => {
      options.cookies.setAll([{ name: COOKIE_NAME, value: '', options: { maxAge: 0, path: '/' } }]);
      return { data: { session: null }, error: null };
    });
    const response = await updateSession(request('/messages'));
    expect(response.status).toBe(307);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
