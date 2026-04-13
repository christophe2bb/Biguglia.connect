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

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    set: vi.fn(),
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
let mockSsrClientInstance: ReturnType<typeof createClient>;
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
  } as unknown as ReturnType<typeof createClient>;
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
  mockCreateClient.mockReturnValue(mockSsrClientInstance);
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
    setup({ user: { id: USER_ID } }, { role: null });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 4. Erreur DB profil ─────────────────────────────────────────────────────

  it('redirige vers / si la requête DB du profil échoue', async () => {
    setup({ user: { id: USER_ID } }, { role: 'admin', dbError: true });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 5. Rôle insuffisant : resident ─────────────────────────────────────────

  it('redirige vers / si le rôle est resident', async () => {
    setup({ user: { id: USER_ID } }, { role: 'resident' });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 6. Rôle insuffisant : artisan_verified ──────────────────────────────────

  it('redirige vers / si le rôle est artisan_verified', async () => {
    setup({ user: { id: USER_ID } }, { role: 'artisan_verified' });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 7. Rôle insuffisant : artisan_pending ──────────────────────────────────

  it('redirige vers / si le rôle est artisan_pending', async () => {
    setup({ user: { id: USER_ID } }, { role: 'artisan_pending' });

    const { redirected, redirectUrl } = await callGuard();

    expect(redirected).toBe(true);
    expect(redirectUrl).toBe('/');
  });

  // ── 8. Rôle admin ──────────────────────────────────────────────────────────

  it('retourne { actor: { id, role: "admin" } } pour le rôle admin', async () => {
    setup({ user: { id: USER_ID } }, { role: 'admin' });

    const { redirected, result } = await callGuard();

    expect(redirected).toBe(false);
    expect(result).not.toBeNull();
    expect(result!.actor.id).toBe(USER_ID);
    expect(result!.actor.role).toBe('admin');
  });

  // ── 9. Rôle moderator ──────────────────────────────────────────────────────

  it('retourne { actor: { id, role: "moderator" } } pour le rôle moderator', async () => {
    setup({ user: { id: USER_ID } }, { role: 'moderator' });

    const { redirected, result } = await callGuard();

    expect(redirected).toBe(false);
    expect(result).not.toBeNull();
    expect(result!.actor.id).toBe(USER_ID);
    expect(result!.actor.role).toBe('moderator');
  });

  // ── 10. actor.id = user.id (pas profileRow.id) ─────────────────────────────

  it("actor.id provient de user.id (auth), pas uniquement de profileRow", async () => {
    const SPECIFIC_USER_ID = 'uuid-specific-9999';
    mockSsrClientInstance   = makeSsrClient({ user: { id: SPECIFIC_USER_ID } });
    mockAdminClientInstance = makeAdminDb({ role: 'admin' });
    mockCreateClient.mockReturnValue(mockSsrClientInstance);
    mockCreateAdminClient.mockReturnValue(mockAdminClientInstance);

    const { result } = await callGuard();

    expect(result!.actor.id).toBe(SPECIFIC_USER_ID);
  });

  // ── 11. createAdminClient non appelé si pas de session ─────────────────────

  it("ne charge pas le profil DB si la session est absente", async () => {
    setup({ user: null }, { role: 'admin' });

    await callGuard().catch(() => {/* redirect */});

    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  // ── 12. Unicité du fichier layout ──────────────────────────────────────────

  it('src/app/admin/layout.tsx existe bien (layout Server Component en place)', async () => {
    const { existsSync } = await import('fs');
    const { join }       = await import('path');
    const layoutPath = join(process.cwd(), 'src/app/admin/layout.tsx');
    expect(existsSync(layoutPath)).toBe(true);
  });

});
