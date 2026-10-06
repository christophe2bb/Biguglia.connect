/**
 * Tests — src/lib/supabase/admin-layout-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture de verifyAdminLayout() :
 *
 *  1. Pas de session (getUser → null)
 *       → redirect('/connexion?next=/admin')
 *  2. Erreur auth (getUser → error)
 *       → redirect('/connexion?next=/admin')
 *  3. Session valide, profil introuvable (DB → data=null)
 *       → redirect('/')
 *  4. Session valide, erreur DB profil
 *       → redirect('/')
 *  5. Session valide, rôle = 'resident'
 *       → redirect('/')
 *  6. Session valide, rôle = 'artisan_verified'
 *       → redirect('/')
 *  7. Session valide, rôle = 'artisan_pending'
 *       → redirect('/')
 *  8. Session valide, rôle = 'admin'
 *       → retourne { actor: { id, role: 'admin' } }
 *  9. Session valide, rôle = 'moderator'
 *       → retourne { actor: { id, role: 'moderator' } }
 * 10. actor.id correspond à user.id (pas au profileRow.id si différent)
 *
 * ── Stratégie de mock ────────────────────────────────────────────────────────
 *
 *  - next/navigation → `redirect` capturé via une variable pour tester la cible.
 *  - next/headers    → mocké (cookie store vide) car importé par server.ts.
 *  - @/lib/supabase/server → createClient + createAdminClient mockés.
 *  - Aucun appel réseau réel.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// ── Mock next/navigation ───────────────────────────────────────────────────────

const redirectCalls: string[] = [];

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirectCalls.push(url);
    // next/navigation.redirect() lance une erreur spéciale interceptée par Next.js.
    // On simule ce comportement pour interrompre l'exécution du guard.
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// ── Mock next/headers (requis par createClient → createServerClient → cookies()) ──
//
// mockCookieGet est réassignable par chaque test :
//   • undefined (défaut) → pas de cookie → guard redirige vers /connexion
//   • { value: FAKE_JWT_COOKIE } → cookie valide factice → guard continue vers getUser/DB

let mockCookieGet: ((name: string) => { value: string } | undefined) = () => undefined;

// JWT factice : header.payload.sig — payload = base64url({ sub, exp })
// On construit manuellement pour éviter toute dépendance à Buffer/atob dans les tests
// sub = "uuid-user-0001", exp = 9999999999 (futur lointain)
const FAKE_JWT_PAYLOAD_OBJ = { sub: 'uuid-user-0001', exp: 9999999999 };
const FAKE_JWT_PAYLOAD = btoa(JSON.stringify(FAKE_JWT_PAYLOAD_OBJ))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const FAKE_JWT = `eyJhbGciOiJIUzI1NiJ9.${FAKE_JWT_PAYLOAD}.fake-signature`;
const FAKE_COOKIE_VALUE = JSON.stringify({ access_token: FAKE_JWT, refresh_token: 'fake-refresh', expires_at: 9999999999 });

/**
 * Active le faux cookie d'authentification pour le test courant.
 * Doit être appelée AVANT setup() dans chaque test qui requiert un userId valide.
 * Le guard cherche un cookie dont le nom contient 'auth-token' (ex: sb--auth-token).
 */
function withFakeCookie() {
  mockCookieGet = (name: string) => {
    if (name.includes('auth-token')) {
      return { value: FAKE_COOKIE_VALUE };
    }
    return undefined;
  };
}

vi.mock('next/headers', () => ({
  cookies: () => ({
    get:    (name: string) => mockCookieGet(name),
    getAll: () => [],
    set:    vi.fn(),
    delete: vi.fn(),
  }),
}));

// ── Mock @supabase/ssr (requis par createClient) ──────────────────────────────

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSsrClientInstance),
}));

// ── Mock @/lib/supabase/server ────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient:      vi.fn(() => mockSsrClientInstance),
  createAdminClient: vi.fn(() => mockAdminClientInstance),
}));

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyAdminLayout } from './admin-layout-guard';

const mockCreateClient      = createClient      as MockedFunction<typeof createClient>;
const mockCreateAdminClient = createAdminClient as MockedFunction<typeof createAdminClient>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'uuid-user-0001';

// Instances mockées (réassignées dans makeClients)
// eslint-disable-next-line prefer-const
let mockSsrClientInstance: Awaited<ReturnType<typeof createClient>>;
// eslint-disable-next-line prefer-const
let mockAdminClientInstance: ReturnType<typeof createAdminClient>;

// ── Helpers de construction ───────────────────────────────────────────────────

interface SsrOptions {
  user: { id: string } | null;
  error?: { message: string } | null;
}

interface AdminOptions {
  role: string | null;
  dbError?: boolean;
}

function makeSsrClient({ user, error = null }: SsrOptions) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error,
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>;
}

function makeAdminDb({ role, dbError = false }: AdminOptions) {
  const single = vi.fn().mockResolvedValue(
    dbError
      ? { data: null,  error: { message: 'DB error' } }
      : { data: role ? { id: USER_ID, role } : null, error: null }
  );
  const eqFn     = vi.fn(() => ({ single }));
  const selectFn = vi.fn(() => ({ eq: eqFn }));
  const fromFn   = vi.fn(() => ({ select: selectFn }));
  return { from: fromFn } as unknown as ReturnType<typeof createAdminClient>;
}

/** Configure les deux mocks pour un test donné. */
function setup(ssrOpts: SsrOptions, adminOpts: AdminOptions) {
  mockSsrClientInstance   = makeSsrClient(ssrOpts);
  mockAdminClientInstance = makeAdminDb(adminOpts);
  mockCreateClient.mockResolvedValue(mockSsrClientInstance);
  mockCreateAdminClient.mockReturnValue(mockAdminClientInstance);
}

/** Appelle verifyAdminLayout() et capture la redirection ou le résultat. */
async function callGuard() {
  try {
    const result = await verifyAdminLayout();
    return { redirected: false, result, redirectUrl: null as string | null };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('NEXT_REDIRECT:')) {
      return { redirected: true, result: null, redirectUrl: msg.replace('NEXT_REDIRECT:', '') };
    }
    throw err;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('verifyAdminLayout()', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    redirectCalls.length = 0;
    // Réinitialise le mock cookie à "pas de cookie" avant chaque test.
    // Les tests nécessitant un userId doivent appeler withFakeCookie() explicitement.
    mockCookieGet = () => undefined;
  });

  // ── 1. Pas de session ───────────────────────────────────────────────────────

  it('redirige vers /connexion?next=/admin si getUser retourne null', async () => {
    setup({ user: null }, { role: 'admin' });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/connexion?next=/admin');
  });

  // ── 2. Erreur d'authentification ────────────────────────────────────────────

  it('redirige vers /connexion?next=/admin si getUser retourne une erreur', async () => {
    setup({ user: null, error: { message: 'JWT expired' } }, { role: 'admin' });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/connexion?next=/admin');
  });

  // ── 3. Profil introuvable ───────────────────────────────────────────────────

  it('redirige vers / si le profil est introuvable (data=null)', async () => {
    withFakeCookie();
    setup({ user: { id: USER_ID } }, { role: null });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 4. Erreur DB profil ─────────────────────────────────────────────────────

  it('redirige vers / si la requête DB du profil échoue', async () => {
    withFakeCookie();
    setup({ user: { id: USER_ID } }, { role: 'admin', dbError: true });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 5. Rôle insuffisant : resident ─────────────────────────────────────────

  it('redirige vers / si le rôle est resident', async () => {
    withFakeCookie();
    setup({ user: { id: USER_ID } }, { role: 'resident' });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 6. Rôle insuffisant : artisan_verified ──────────────────────────────────

  it('redirige vers / si le rôle est artisan_verified', async () => {
    withFakeCookie();
    setup({ user: { id: USER_ID } }, { role: 'artisan_verified' });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 7. Rôle insuffisant : artisan_pending ──────────────────────────────────

  it('redirige vers / si le rôle est artisan_pending', async () => {
    withFakeCookie();
    setup({ user: { id: USER_ID } }, { role: 'artisan_pending' });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 8. Rôle admin ──────────────────────────────────────────────────────────

  it('retourne { actor: { id, role: "admin" } } pour le rôle admin', async () => {
    withFakeCookie();
    setup({ user: { id: USER_ID } }, { role: 'admin' });

    const { redirected, result } = await callGuard();

    expect(redirected).toBe(false);
    expect(result).not.toBeNull();
    expect(result!.actor.id).toBe(USER_ID);
    expect(result!.actor.role).toBe('admin');
  });

  // ── 9. Rôle moderator ──────────────────────────────────────────────────────

  it('retourne { actor: { id, role: "moderator" } } pour le rôle moderator', async () => {
    withFakeCookie();
    setup({ user: { id: USER_ID } }, { role: 'moderator' });

    const { redirected, result } = await callGuard();

    expect(redirected).toBe(false);
    expect(result).not.toBeNull();
    expect(result!.actor.id).toBe(USER_ID);
    expect(result!.actor.role).toBe('moderator');
  });

  it('ne fait pas confiance au sub du cookie si Supabase rejette la session', async () => {
    withFakeCookie();
    setup({ user: null, error: { message: 'Invalid JWT signature' } }, { role: 'admin' });
    const { redirectUrl } = await callGuard();
    expect(redirectUrl).toBe('/connexion?next=/admin');
    expect(mockSsrClientInstance.auth.getUser).toHaveBeenCalledOnce();
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('actor.id provient du compte vérifié même si le cookie indique un autre utilisateur', async () => {
    withFakeCookie();
    setup({ user: { id: 'verified-user-0002' } }, { role: 'admin' });
    const { result } = await callGuard();
    expect(result?.actor.id).toBe('verified-user-0002');
    const query = mockAdminClientInstance.from('profiles').select('id, role');
    expect(query.eq).toHaveBeenCalledWith('id', 'verified-user-0002');
  });

  it('redirige sans accès service-role quand la vérification de session lève une erreur', async () => {
    setup({ user: { id: USER_ID } }, { role: 'admin' });
    vi.mocked(mockSsrClientInstance.auth.getUser).mockRejectedValue(new Error('Network unavailable'));
    const { redirectUrl } = await callGuard();
    expect(redirectUrl).toBe('/connexion?next=/admin');
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });
});
