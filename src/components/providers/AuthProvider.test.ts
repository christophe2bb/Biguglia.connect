import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: { phase: 'initializing', userId: null as string | null, profile: null as unknown },
  setAuth: vi.fn(), getSession: vi.fn(), getProfile: vi.fn(), unsubscribe: vi.fn(),
}));
type Session = { user: { id: string } } | null;
let emit: (event: string, session: Session) => void;
let cleanups: Array<() => void> = [];

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => (() => void) | void) => {
    const cleanup = effect();
    if (cleanup) cleanups.push(cleanup);
  },
}));
vi.mock('@/lib/auth-store', () => {
  const useAuthStore = Object.assign(() => ({ _setAuth: mocks.setAuth }), {
    getState: () => mocks.state,
  });
  return { useAuthStore };
});
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (callback: typeof emit) => {
        emit = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
    },
    from: () => ({ select: () => ({ eq: (_key: string, userId: string) => ({ maybeSingle: () => mocks.getProfile(userId) }) }) }),
  }),
}));

import AuthProvider from './AuthProvider';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('authentication lifecycle during slow or unavailable responses', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('React', React);
    cleanups = [];
    mocks.state = { phase: 'initializing', userId: null, profile: null };
    mocks.setAuth.mockReset().mockImplementation((phase, userId, profile) => {
      mocks.state = { phase, userId, profile };
    });
    mocks.getSession.mockReset();
    mocks.getProfile.mockReset();
    mocks.unsubscribe.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanups.forEach(cleanup => cleanup());
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('releases initialization even when the SDK session lock never resolves', async () => {
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    AuthProvider({ children: null });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(mocks.state.phase).toBe('unauthenticated');
  });

  it('ignores an old profile response after sign-out', async () => {
    const profile = deferred<{ data: { id: string }; error: null }>();
    mocks.getProfile.mockReturnValue(profile.promise);
    AuthProvider({ children: null });
    emit('SIGNED_IN', { user: { id: 'user-a' } });
    emit('SIGNED_OUT', null);
    profile.resolve({ data: { id: 'user-a' }, error: null });
    await tick();
    expect(mocks.state.phase).toBe('unauthenticated');
    expect(mocks.state.userId).toBeNull();
  });

  it('does not replace the new account with a previous account profile', async () => {
    const oldProfile = deferred<{ data: { id: string }; error: null }>();
    mocks.getProfile.mockImplementation((id) => id === 'user-a' ? oldProfile.promise : Promise.resolve({ data: { id }, error: null }));
    AuthProvider({ children: null });
    emit('SIGNED_IN', { user: { id: 'user-a' } });
    emit('SIGNED_IN', { user: { id: 'user-b' } });
    await tick();
    oldProfile.resolve({ data: { id: 'user-a' }, error: null });
    await tick();
    expect(mocks.state.userId).toBe('user-b');
    expect(mocks.state.profile).toEqual({ id: 'user-b' });
  });

  it('cancels the initialization fallback once a session is known', async () => {
    mocks.getProfile.mockReturnValue(new Promise(() => {}));
    AuthProvider({ children: null });
    emit('INITIAL_SESSION', { user: { id: 'user-a' } });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(mocks.state.phase).toBe('authenticated');
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});
