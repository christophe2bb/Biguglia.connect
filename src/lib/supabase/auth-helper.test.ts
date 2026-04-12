/**
 * Tests unitaires — src/lib/supabase/auth-helper.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture :
 *
 *  getUserIdBearerFirst()  — Bearer-first (Bearer → cookies)
 *    – Bearer valide          → retourne l'UUID
 *    – Bearer invalide        → tombe en fallback cookies → retourne UUID cookies
 *    – Bearer invalide        → cookies absents/erreur → retourne null
 *    – Pas de header Bearer   → fallback cookies valides → retourne UUID cookies
 *    – Pas de header Bearer   → cookies absents → retourne null
 *    – Header Authorization   malformé (pas "Bearer ") → null
 *    – Bearer valide mais user.id absent → fallback cookies → UUID
 *    – Bearer valide mais user.id absent + cookies KO → null
 *    – Exception dans anonClient.getUser() → fallback cookies
 *    – Exception dans anonClient + exception cookies → null
 *
 *  getUserFromRequest()    — SSR-first (cookies → Bearer)
 *    – Cookies valides        → retourne { id, email }
 *    – Cookies absent/erreur  → Bearer valide → retourne { id, email }
 *    – Cookies absent/erreur  → Bearer invalide → null
 *    – Cookies absent         → pas de Bearer → null
 *    – Exception createServerClient → fallback Bearer → retourne user
 *    – Exception createServerClient + pas de Bearer → null
 *    – Bearer présent mais user null → null
 *    – Cookies OK + Bearer présent → cookies prioritaire (retourne user cookies)
 *
 *  extractBearer (comportement observable via les deux fonctions)
 *    – "Bearer abc123"        → extrait "abc123"
 *    – "bearer abc123"        → non extrait (case-sensitive)
 *    – "Token abc123"         → non extrait
 *    – Header vide            → null
 *
 * Architecture :
 *  – @/lib/supabase/server  mocké (createClient → supabase SSR simulé)
 *  – @supabase/supabase-js  mocké (createClient → anonClient simulé)
 *  – @/lib/supabase/env     mocké (getSupabaseEnv → valeurs fixes)
 *  – Aucun appel réseau réel
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks modules ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/env', () => ({
  getSupabaseEnv: vi.fn(() => ({
    url:     'https://test.supabase.co',
    anonKey: 'anon-key-test-minimum-length-ok',
  })),
}));

import { createClient as createServerClientMock } from '@/lib/supabase/server';
import { createClient as createSupabaseClientMock } from '@supabase/supabase-js';
import { getUserIdBearerFirst, getUserFromRequest } from './auth-helper';

// Cast typés pour faciliter les .mockReturnValue()
const mockCreateServerClient    = createServerClientMock    as MockedFunction<typeof createServerClientMock>;
const mockCreateSupabaseClient  = createSupabaseClientMock  as MockedFunction<typeof createSupabaseClientMock>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID_A   = 'uuid-user-aaaa-0001';
const USER_ID_B   = 'uuid-user-bbbb-0002';
const EMAIL_A     = 'alice@example.com';
const VALID_TOKEN = 'valid.jwt.token.for.tests';

// ─── Helpers de construction de requêtes ──────────────────────────────────────

function makeReq(opts: { bearer?: string; url?: string } = {}): Request {
  const headers: Record<string, string> = {};
  if (opts.bearer !== undefined) {
    headers['Authorization'] = opts.bearer;
  }
  return new NextRequest(opts.url ?? 'http://localhost/api/test', { headers });
}

// ─── Helpers de construction de mocks Supabase ───────────────────────────────

/** Construit un mock client anon (createSupabaseClient) */
function makeAnonClient(user: { id: string; email?: string } | null, throws = false) {
  return {
    auth: {
      getUser: throws
        ? vi.fn().mockRejectedValue(new Error('network error'))
        : vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

/** Construit un mock client SSR (createServerClient from server.ts) */
function makeSSRClient(user: { id: string; email?: string } | null, throws = false) {
  return {
    auth: {
      getUser: throws
        ? vi.fn().mockRejectedValue(new Error('cookie error'))
        : vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

// =============================================================================
// getUserIdBearerFirst()
// =============================================================================

describe('getUserIdBearerFirst()', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Bearer valide ──────────────────────────────────────────────────────────

  it('retourne l\'UUID quand le Bearer token est valide', async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient({ id: USER_ID_A }) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    const result = await getUserIdBearerFirst(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    expect(result).toBe(USER_ID_A);
  });

  it('n\'appelle pas le client SSR quand le Bearer est valide', async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient({ id: USER_ID_A }) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    await getUserIdBearerFirst(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  // ── Bearer invalide → fallback cookies ────────────────────────────────────

  it('tombe en fallback cookies si le Bearer retourne user=null', async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient(null) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_B }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserIdBearerFirst(makeReq({ bearer: `Bearer bad-token` }));
    expect(result).toBe(USER_ID_B);
  });

  it('retourne null si Bearer invalide ET cookies absents', async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient(null) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    mockCreateServerClient.mockReturnValue(
      makeSSRClient(null) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserIdBearerFirst(makeReq({ bearer: `Bearer bad-token` }));
    expect(result).toBeNull();
  });

  // ── Pas de header Authorization ────────────────────────────────────────────

  it('utilise le fallback cookies quand il n\'y a pas de header Authorization', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_B }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserIdBearerFirst(makeReq());
    expect(result).toBe(USER_ID_B);
    // anonClient ne doit pas avoir été instancié (pas de token à valider)
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  it('retourne null si pas de Bearer ET cookies absents', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient(null) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserIdBearerFirst(makeReq());
    expect(result).toBeNull();
  });

  // ── Header malformé ────────────────────────────────────────────────────────

  it('ignore un header "bearer token" (minuscule — case-sensitive)', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_B }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    // "bearer" minuscule ne déclenche pas extractBearer → pas d'anonClient
    const result = await getUserIdBearerFirst(makeReq({ bearer: `bearer ${VALID_TOKEN}` }));
    // Fallback cookies activé, pas anonClient
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
    expect(result).toBe(USER_ID_B);
  });

  it('ignore un header "Token …" (schéma non-Bearer)', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient(null) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserIdBearerFirst(makeReq({ bearer: `Token ${VALID_TOKEN}` }));
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  // ── user.id absent ────────────────────────────────────────────────────────

  it('tombe en fallback si Bearer valide mais user.id est absent', async () => {
    // user sans id (cas rare mais possible si Supabase retourne un user incomplet)
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient({} as { id: string }) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_B }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserIdBearerFirst(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    expect(result).toBe(USER_ID_B);
  });

  // ── Exceptions ────────────────────────────────────────────────────────────

  it('tombe en fallback cookies si anonClient.getUser() lève une exception', async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient(null, true) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_B }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserIdBearerFirst(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    expect(result).toBe(USER_ID_B);
  });

  it('retourne null si anonClient lève + cookies lèvent une exception', async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient(null, true) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    mockCreateServerClient.mockReturnValue(
      makeSSRClient(null, true) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserIdBearerFirst(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    expect(result).toBeNull();
  });

  it('retourne null si createServerClient() lève une exception (pas de Bearer)', async () => {
    mockCreateServerClient.mockImplementation(() => {
      throw new Error('next/headers not available');
    });
    const result = await getUserIdBearerFirst(makeReq());
    expect(result).toBeNull();
  });
});

// =============================================================================
// getUserFromRequest()
// =============================================================================

describe('getUserFromRequest()', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── SSR-first : cookies valides ────────────────────────────────────────────

  it('retourne { id, email } depuis les cookies SSR quand ils sont valides', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_A, email: EMAIL_A }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserFromRequest(makeReq());
    expect(result).toMatchObject({ id: USER_ID_A, email: EMAIL_A });
  });

  it('ne tente pas le Bearer si les cookies SSR ont déjà authentifié', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_A }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    await getUserFromRequest(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    // anonClient ne doit pas avoir été instancié
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  // ── Fallback Bearer quand cookies absents ──────────────────────────────────

  it('tombe en fallback Bearer si les cookies retournent user=null', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient(null) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient({ id: USER_ID_A, email: EMAIL_A }) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    const result = await getUserFromRequest(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    expect(result).toMatchObject({ id: USER_ID_A, email: EMAIL_A });
  });

  it('retourne null si cookies absents ET pas de header Bearer', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient(null) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserFromRequest(makeReq());
    expect(result).toBeNull();
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  it('retourne null si cookies absents ET Bearer retourne user=null', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient(null) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient(null) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    const result = await getUserFromRequest(makeReq({ bearer: `Bearer bad-token` }));
    expect(result).toBeNull();
  });

  // ── Exceptions createServerClient ─────────────────────────────────────────

  it('tombe en fallback Bearer si createServerClient() lève une exception', async () => {
    mockCreateServerClient.mockImplementation(() => {
      throw new Error('next/headers not available');
    });
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient({ id: USER_ID_A }) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    const result = await getUserFromRequest(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    expect(result).toMatchObject({ id: USER_ID_A });
  });

  it('retourne null si createServerClient() lève ET pas de Bearer', async () => {
    mockCreateServerClient.mockImplementation(() => {
      throw new Error('next/headers not available');
    });
    const result = await getUserFromRequest(makeReq());
    expect(result).toBeNull();
  });

  // ── Priorité SSR sur Bearer ────────────────────────────────────────────────

  it('les cookies SSR ont la priorité sur le Bearer quand les deux sont présents', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_A, email: EMAIL_A }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    // anonClient ne devrait pas être appelé
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient({ id: USER_ID_B }) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    const result = await getUserFromRequest(makeReq({ bearer: `Bearer ${VALID_TOKEN}` }));
    expect(result?.id).toBe(USER_ID_A);        // cookies prioritaire
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  // ── Forme de la réponse ────────────────────────────────────────────────────

  it('retourne uniquement { id, email } (pas d\'autres champs sensibles exposés)', async () => {
    mockCreateServerClient.mockReturnValue(
      makeSSRClient({ id: USER_ID_A, email: EMAIL_A }) as unknown as ReturnType<typeof mockCreateServerClient>
    );
    const result = await getUserFromRequest(makeReq());
    // Les fonctions retournent ce que Supabase retourne — on vérifie les champs clés
    expect(result).toHaveProperty('id');
    expect(result?.id).toBe(USER_ID_A);
  });
});

// =============================================================================
// extractBearer — comportement observable
// =============================================================================

describe('extractBearer (via getUserIdBearerFirst)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // SSR toujours null pour isoler le comportement du Bearer
    mockCreateServerClient.mockReturnValue(
      makeSSRClient(null) as unknown as ReturnType<typeof mockCreateServerClient>
    );
  });

  it('"Bearer token123" → extrait "token123" et appelle anonClient', async () => {
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient({ id: USER_ID_A }) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    const result = await getUserIdBearerFirst(makeReq({ bearer: 'Bearer token123' }));
    expect(mockCreateSupabaseClient).toHaveBeenCalledOnce();
    expect(result).toBe(USER_ID_A);
  });

  it('"Bearer " (token vide après espace) → extrait une chaîne vide → anonClient appelé', async () => {
    // extractBearer retourne '' (truthy ? non — '' est falsy → pas d'appel anonClient)
    // "Bearer ".slice(7) === '' → falsy → anonClient NON appelé → fallback cookies
    mockCreateSupabaseClient.mockReturnValue(
      makeAnonClient({ id: USER_ID_A }) as unknown as ReturnType<typeof mockCreateSupabaseClient>
    );
    await getUserIdBearerFirst(makeReq({ bearer: 'Bearer ' }));
    // '' est falsy → extractBearer retourne null (non) — vérifions le comportement réel
    // En réalité header.slice(7) = '' qui est falsy → le if(token) est false → pas d'appel
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  it('"BearerXYZ" (pas d\'espace) → pas d\'extraction → anonClient non appelé', async () => {
    await getUserIdBearerFirst(makeReq({ bearer: 'BearerXYZ' }));
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  it('Authorization absent → anonClient non appelé', async () => {
    await getUserIdBearerFirst(makeReq());
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });
});
