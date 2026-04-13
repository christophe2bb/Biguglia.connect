/**
 * src/lib/monitoring/__tests__/sentry.test.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests unitaires du module src/lib/monitoring/sentry.ts
 *
 * Ce que ces tests vérifient :
 *   1. captureError  — envoie à Sentry les erreurs inattendues, ignore les attendues
 *   2. captureApiError — tag route/method/statusCode correctement
 *   3. captureAuthError — tag boundary=auth + niveau warning
 *   4. setUserContext / clearUserContext — setUser / setUser(null)
 *   5. addBreadcrumb — addBreadcrumb Sentry
 *   6. Filtrage des erreurs attendues (ZodError, NetworkError, fetch failed…)
 *   7. Robustesse si withScope lance une exception
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ── Mocks Sentry — doit utiliser vi.hoisted() pour éviter le problème de
//   "Cannot access before initialization" dû au hoisting de vi.mock ─────────

const {
  mockCaptureException,
  mockCaptureMessage,
  mockSetUser,
  mockAddBreadcrumb,
  mockWithScope,
  mockScope,
} = vi.hoisted(() => {
  const scope = {
    setUser:   vi.fn(),
    setTag:    vi.fn(),
    setTags:   vi.fn(),
    setExtras: vi.fn(),
    setLevel:  vi.fn(),
  };

  return {
    mockCaptureException: vi.fn(),
    mockCaptureMessage:   vi.fn(),
    mockSetUser:          vi.fn(),
    mockAddBreadcrumb:    vi.fn(),
    mockWithScope:        vi.fn((cb: (s: typeof scope) => void) => cb(scope)),
    mockScope:            scope,
  };
});

vi.mock('@sentry/nextjs', () => ({
  captureException: mockCaptureException,
  captureMessage:   mockCaptureMessage,
  setUser:          mockSetUser,
  addBreadcrumb:    mockAddBreadcrumb,
  withScope:        mockWithScope,
}));

// ── Import du module testé (après les mocks) ──────────────────────────────────

import {
  captureError,
  captureApiError,
  captureAuthError,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
} from '../sentry';

// ─── Classe utilitaire simulant ZodError ─────────────────────────────────────

class FakeZodError extends Error {
  name = 'ZodError';
  constructor() { super('Validation failed'); }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('captureError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Rétablir l'implémentation par défaut de withScope
    (mockWithScope as Mock).mockImplementation((cb: (s: typeof mockScope) => void) => cb(mockScope));
  });

  it('envoie les erreurs inattendues à Sentry', () => {
    const err = new Error('Unexpected DB connection failure');
    captureError(err, { userId: 'uuid-123' });

    expect(mockWithScope).toHaveBeenCalledOnce();
    expect(mockCaptureException).toHaveBeenCalledWith(err);
  });

  it('set le user scope si userId fourni', () => {
    captureError(new Error('boom'), { userId: 'uuid-abc', userRole: 'admin' });
    expect(mockScope.setUser).toHaveBeenCalledWith({ id: 'uuid-abc', role: 'admin' });
  });

  it('set les tags si fournis', () => {
    captureError(new Error('boom'), { tags: { section: 'forum', page: 1 } });
    expect(mockScope.setTags).toHaveBeenCalledWith({ section: 'forum', page: 1 });
  });

  it('ignore les ZodError (erreurs de validation utilisateur)', () => {
    captureError(new FakeZodError());
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('ignore "Failed to fetch" (utilisateur offline)', () => {
    captureError(new Error('Failed to fetch'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('ignore "NetworkError" (réseau indisponible)', () => {
    captureError(new Error('NetworkError when attempting to fetch resource'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('ignore "Load failed" (iOS Safari offline)', () => {
    captureError(new Error('Load failed'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('ignore "aborted" (requête annulée)', () => {
    captureError(new Error('The user aborted a request'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('ignore "unauthorized" (refus de sécurité attendu)', () => {
    captureError(new Error('unauthorized'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('ignore "forbidden" (refus de sécurité attendu)', () => {
    captureError(new Error('forbidden'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('capture les erreurs non-Error (string)', () => {
    captureError('string error');
    // Les strings ne matchent pas isExpectedError (instanceof Error = false)
    expect(mockCaptureException).toHaveBeenCalledWith('string error');
  });

  it('capture null sans lever d\'exception', () => {
    expect(() => captureError(null)).not.toThrow();
  });

  it('capture undefined sans lever d\'exception', () => {
    expect(() => captureError(undefined)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('captureApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockWithScope as Mock).mockImplementation((cb: (s: typeof mockScope) => void) => cb(mockScope));
  });

  it('envoie l\'erreur avec le tag route', () => {
    const err = new Error('DB query failed');
    captureApiError(err, { route: '/api/admin/stats', userId: 'uuid-admin' });

    expect(mockCaptureException).toHaveBeenCalledWith(err);
    expect(mockScope.setTag).toHaveBeenCalledWith('boundary', 'api-route');
    expect(mockScope.setTag).toHaveBeenCalledWith('route', '/api/admin/stats');
  });

  it('set le tag http.method si fourni', () => {
    captureApiError(new Error('err'), { route: '/api/test', method: 'POST' });
    expect(mockScope.setTag).toHaveBeenCalledWith('http.method', 'POST');
  });

  it('set le tag http.status_code si fourni', () => {
    captureApiError(new Error('err'), { route: '/api/test', statusCode: 500 });
    expect(mockScope.setTag).toHaveBeenCalledWith('http.status_code', 500);
  });

  it('ignore les ZodError même dans un contexte API', () => {
    captureApiError(new FakeZodError(), { route: '/api/admin/users' });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('set le niveau à error par défaut', () => {
    captureApiError(new Error('err'), { route: '/api/test' });
    expect(mockScope.setLevel).toHaveBeenCalledWith('error');
  });

  it('set le userId si fourni', () => {
    captureApiError(new Error('err'), { route: '/api/test', userId: 'uuid-admin', userRole: 'admin' });
    expect(mockScope.setUser).toHaveBeenCalledWith({ id: 'uuid-admin', role: 'admin' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('captureAuthError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockWithScope as Mock).mockImplementation((cb: (s: typeof mockScope) => void) => cb(mockScope));
  });

  it('envoie un message avec le boundary=auth', () => {
    captureAuthError('session_missing', {
      event:  'session_missing',
      userId: 'uuid-xyz',
    });

    expect(mockWithScope).toHaveBeenCalledOnce();
    expect(mockCaptureMessage).toHaveBeenCalledWith('Auth error: session_missing', 'warning');
    expect(mockScope.setTag).toHaveBeenCalledWith('boundary', 'auth');
    expect(mockScope.setTag).toHaveBeenCalledWith('auth.event', 'session_missing');
  });

  it('set le user scope si userId fourni', () => {
    captureAuthError('role_mismatch', {
      event:    'role_mismatch',
      userId:   'uuid-abc',
      userRole: 'resident',
    });
    expect(mockScope.setUser).toHaveBeenCalledWith({ id: 'uuid-abc', role: 'resident' });
  });

  it('utilise le niveau "warning" par défaut', () => {
    captureAuthError('admin_access_denied', { event: 'admin_access_denied' });
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'Auth error: admin_access_denied',
      'warning',
    );
  });

  it('permet de surcharger le niveau avec "error"', () => {
    captureAuthError('profile_load_failed', {
      event: 'profile_load_failed',
      level: 'error',
    });
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'Auth error: profile_load_failed',
      'error',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('setUserContext / clearUserContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('setUserContext appelle Sentry.setUser avec l\'UUID et le rôle', () => {
    setUserContext('uuid-user-123', 'artisan_verified');
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'uuid-user-123', role: 'artisan_verified' });
  });

  it('setUserContext sans role omet la clé role', () => {
    setUserContext('uuid-user-456');
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'uuid-user-456' });
  });

  it('clearUserContext appelle Sentry.setUser(null)', () => {
    clearUserContext();
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('addBreadcrumb', () => {
  beforeEach(() => vi.clearAllMocks());

  it('appelle Sentry.addBreadcrumb avec message et data', () => {
    addBreadcrumb('Artisan validation started', { artisanId: 'uuid-art-001' });

    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'app',
      message:  'Artisan validation started',
      data:     { artisanId: 'uuid-art-001' },
      level:    'info',
    });
  });

  it('utilise la catégorie par défaut "app"', () => {
    addBreadcrumb('User logged in');
    expect((mockAddBreadcrumb as Mock).mock.calls[0]?.[0]?.category).toBe('app');
  });

  it('accepte une catégorie personnalisée', () => {
    addBreadcrumb('Report submitted', undefined, 'user-action');
    expect((mockAddBreadcrumb as Mock).mock.calls[0]?.[0]?.category).toBe('user-action');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('robustesse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('captureError ne propage pas si withScope lance une exception', () => {
    (mockWithScope as Mock).mockImplementationOnce(() => {
      throw new Error('Sentry SDK unavailable');
    });
    // Ne doit PAS propager vers l'appelant
    expect(() => captureError(new Error('some error'))).not.toThrow();
  });

  it('captureApiError ne propage pas si withScope lance une exception', () => {
    (mockWithScope as Mock).mockImplementationOnce(() => {
      throw new Error('Sentry SDK unavailable');
    });
    expect(() => captureApiError(new Error('err'), { route: '/api/test' })).not.toThrow();
  });
});
