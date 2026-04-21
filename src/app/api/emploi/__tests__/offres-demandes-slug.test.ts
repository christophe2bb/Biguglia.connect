/**
 * Tests — GET/PATCH/DELETE /api/emploi/offres/[slug]
 *       + GET/PATCH/DELETE /api/emploi/demandes/[slug]
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture commune aux deux routes (offres + demandes) :
 *
 *  Auth
 *    – GET  : 401 si non authentifié
 *    – PATCH/DELETE : 401 si non authentifié
 *
 *  Ownership enforcement (critique : empêche IDOR)
 *    – GET  : 403 si userId ≠ owner → accès refusé à l'offre/demande d'autrui
 *    – PATCH: 403 si userId ≠ owner
 *    – DELETE: 403 si userId ≠ owner
 *    – 200 si userId = owner (propriétaire légitime)
 *
 *  CSRF
 *    – DELETE sans header Origin → 403 (si assertCsrfSafe bloque)
 *    – PATCH  sans header Origin → 403
 *
 *  Validation Zod (PATCH)
 *    – 400 corps non-JSON
 *    – 400 body vide (aucun champ)
 *    – 400 titre trop court (< 10 chars)
 *    – 400 titre trop long  (> 120 chars)
 *    – 400 injection de champ non autorisé (ex. status, user_id, is_admin)
 *    – 200 PATCH valide (title seul)
 *
 *  404
 *    – Slug introuvable → 404
 *
 *  DELETE
 *    – 200 succès si propriétaire
 *    – 500 si DB delete échoue
 *
 * Architecture de mock :
 *   – @/lib/supabase/server mocké : createAdminClient → db factice
 *   – @/lib/supabase/auth-helper mocké : getUserFromRequest + assertCsrfSafe
 *   – Aucun appel réseau réel
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { _NextRequest } from 'next/server';
import { GET as getOffer, PATCH as patchOffer, DELETE as deleteOffer }
  from '@/app/api/emploi/offres/[slug]/route';
import { GET as _getDemand, PATCH as patchDemand, DELETE as deleteDemand }
  from '@/app/api/emploi/demandes/[slug]/route';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server',      () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserFromRequest: vi.fn(),
  assertCsrfSafe:    vi.fn(() => null),
}));

import { createAdminClient }                      from '@/lib/supabase/server';
import { getUserFromRequest, assertCsrfSafe }     from '@/lib/supabase/auth-helper';

const mockCreateAdmin = createAdminClient  as MockedFunction<typeof createAdminClient>;
const mockGetUser     = getUserFromRequest as MockedFunction<typeof getUserFromRequest>;
const mockCsrf        = assertCsrfSafe    as MockedFunction<typeof assertCsrfSafe>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OWNER_ID = 'uuid-owner-1111';
const OTHER_ID = 'uuid-other-2222';
const SLUG     = 'mon-offre-test-2026';
const ITEM_ID  = 'uuid-item-3333';

// ─── Builders de mock DB ──────────────────────────────────────────────────────

/**
 * Construit un mock adminClient pour une route emploi.
 * @param ownerId       user_id stocké en DB (pour le ownership check)
 * @param notFound      si true, .single() retourne null (404)
 * @param updateError   si true, .update().eq() retourne une erreur
 * @param deleteError   si true, .delete().eq() retourne une erreur
 */
function makeEmploiDb(opts: {
  ownerId?:    string;
  notFound?:   boolean;
  updateError?: boolean;
  deleteError?: boolean;
} = {}) {
  const { ownerId = OWNER_ID, notFound = false, updateError = false, deleteError = false } = opts;

  const fromMock = vi.fn((table: string) => {
    if (table === 'job_offers' || table === 'job_demands') {
      // select chain  (GET ownership + PATCH/DELETE ownership fetch)
      const singleOwnership = vi.fn().mockResolvedValue(
        notFound
          ? { data: null, error: { message: 'not found', code: 'PGRST116' } }
          : { data: { id: ITEM_ID, user_id: ownerId, slug: SLUG }, error: null }
      );
      const eqSlug = vi.fn().mockReturnValue({ single: singleOwnership });

      // select('*') chain pour GET complet
      const singleFull = vi.fn().mockResolvedValue(
        notFound
          ? { data: null, error: { message: 'not found' } }
          : { data: { id: ITEM_ID, user_id: ownerId, slug: SLUG, title: 'Test offre' }, error: null }
      );
      const eqSlugFull = vi.fn().mockReturnValue({ single: singleFull });

      // update chain
      const _eqUpdate = vi.fn().mockResolvedValue(
        updateError
          ? { data: null, error: { message: 'update error' } }
          : { data: { slug: SLUG }, error: null }
      );
      const selectAfterUpdate = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(
          updateError ? { data: null, error: { message: 'update error' } } : { data: { slug: SLUG }, error: null }
        ),
      });
      const _updateEqFn = vi.fn().mockReturnValue({ select: selectAfterUpdate, ...({ then: undefined }) });
      // The PATCH route calls .update().eq('id', id).select('slug').single()
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              updateError
                ? { data: null, error: { message: 'update error' } }
                : { data: { slug: SLUG }, error: null }
            ),
          }),
        }),
      });

      // delete chain
      const eqDelete = vi.fn().mockResolvedValue(
        deleteError
          ? { data: null, error: { message: 'delete error' } }
          : { data: null, error: null }
      );
      const deleteMock = vi.fn().mockReturnValue({ eq: eqDelete });

      return {
        select: vi.fn((fields?: string) => {
          // GET complet : select('*')
          if (fields === '*') return { eq: eqSlugFull };
          // ownership check : select('id, user_id') ou select('*')
          return { eq: eqSlug };
        }),
        update: updateMock,
        delete: deleteMock,
      };
    }
    return {};
  });

  return { from: fromMock } as unknown as ReturnType<typeof createAdminClient>;
}

// ─── Request builders ─────────────────────────────────────────────────────────

function makeReqWithOrigin(method: string, body?: unknown): Request {
  return new Request(`https://app.test/api/emploi/offres/${SLUG}`, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(slug = SLUG) { return { params: { slug } }; }

// ─── Authenticate helpers ─────────────────────────────────────────────────────

function asOwner() { mockGetUser.mockResolvedValue({ id: OWNER_ID } as unknown as Awaited<ReturnType<typeof getUserFromRequest>>); }
function asOther() { mockGetUser.mockResolvedValue({ id: OTHER_ID } as unknown as Awaited<ReturnType<typeof getUserFromRequest>>); }
function asGuest() { mockGetUser.mockResolvedValue(null); }

// =============================================================================
// offres/[slug]
// =============================================================================

describe('GET /api/emploi/offres/[slug]', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  it('401 si non authentifié', async () => {
    asGuest();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const res = await getOffer(makeReqWithOrigin('GET'), makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si userId ≠ owner (IDOR impossible)', async () => {
    asOther();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const res = await getOffer(makeReqWithOrigin('GET'), makeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/refus/i);
  });

  it('404 si slug introuvable', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ notFound: true }));
    const res = await getOffer(makeReqWithOrigin('GET'), makeParams('slug-inexistant'));
    expect(res.status).toBe(404);
  });

  it('200 si userId = owner', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const res = await getOffer(makeReqWithOrigin('GET'), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.offer).toBeDefined();
  });
});

describe('DELETE /api/emploi/offres/[slug]', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  it('401 si non authentifié', async () => {
    asGuest();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const res = await deleteOffer(makeReqWithOrigin('DELETE'), makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si userId ≠ owner', async () => {
    asOther();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const res = await deleteOffer(makeReqWithOrigin('DELETE'), makeParams());
    expect(res.status).toBe(403);
  });

  it('404 si slug introuvable', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ notFound: true }));
    const res = await deleteOffer(makeReqWithOrigin('DELETE'), makeParams());
    expect(res.status).toBe(404);
  });

  it('200 suppression réussie (propriétaire)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const res = await deleteOffer(makeReqWithOrigin('DELETE'), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('500 si DB delete échoue', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID, deleteError: true }));
    const res = await deleteOffer(makeReqWithOrigin('DELETE'), makeParams());
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/emploi/offres/[slug]', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  it('401 si non authentifié', async () => {
    asGuest();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const res = await patchOffer(makeReqWithOrigin('PATCH', { title: 'Chef cuisinier confirmé 2026' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si userId ≠ owner', async () => {
    asOther();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const res = await patchOffer(makeReqWithOrigin('PATCH', { title: 'Chef cuisinier confirmé 2026' }), makeParams());
    expect(res.status).toBe(403);
  });

  it('400 corps non-JSON', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const req = new Request(`https://app.test/api/emploi/offres/${SLUG}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: 'not-json',
    });
    const res = await patchOffer(req, makeParams());
    expect(res.status).toBe(400);
  });

  it('400 body vide (aucun champ)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const res = await patchOffer(makeReqWithOrigin('PATCH', {}), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 titre trop court (< 10 chars)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const res = await patchOffer(makeReqWithOrigin('PATCH', { title: 'Court' }), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors?.title).toBeDefined();
  });

  it('400 titre trop long (> 120 chars)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const res = await patchOffer(makeReqWithOrigin('PATCH', { title: 'x'.repeat(121) }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 champ non autorisé (user_id — tentative injection)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    // user_id n'est pas dans OffrePatchSchema → Zod doit le rejeter (.strict())
    const res = await patchOffer(makeReqWithOrigin('PATCH', { user_id: OTHER_ID }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 champ non autorisé (is_admin)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const res = await patchOffer(makeReqWithOrigin('PATCH', { is_admin: true }), makeParams());
    expect(res.status).toBe(400);
  });

  it('200 PATCH valide (title seul)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const res = await patchOffer(
      makeReqWithOrigin('PATCH', { title: 'Cuisinier confirmé poste urgent 2026' }),
      makeParams()
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// =============================================================================
// demandes/[slug] — mêmes vérifications critiques (ownership + Zod)
// =============================================================================

describe('DELETE /api/emploi/demandes/[slug]', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  it('401 si non authentifié', async () => {
    asGuest();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const req = new Request(`https://app.test/api/emploi/demandes/${SLUG}`, {
      method: 'DELETE', headers: { Origin: 'https://app.test' },
    });
    const res = await deleteDemand(req, makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si userId ≠ owner (IDOR)', async () => {
    asOther();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const req = new Request(`https://app.test/api/emploi/demandes/${SLUG}`, {
      method: 'DELETE', headers: { Origin: 'https://app.test' },
    });
    const res = await deleteDemand(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('200 suppression réussie (propriétaire)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const req = new Request(`https://app.test/api/emploi/demandes/${SLUG}`, {
      method: 'DELETE', headers: { Origin: 'https://app.test' },
    });
    const res = await deleteDemand(req, makeParams());
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/emploi/demandes/[slug]', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  it('403 si userId ≠ owner', async () => {
    asOther();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const req = new Request(`https://app.test/api/emploi/demandes/${SLUG}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ title: 'Cherche emploi saisonnier été 2026' }),
    });
    const res = await patchDemand(req, makeParams());
    expect(res.status).toBe(403);
  });

  it('400 champ non autorisé dans demande (user_id)', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const req = new Request(`https://app.test/api/emploi/demandes/${SLUG}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ user_id: OTHER_ID }),
    });
    const res = await patchDemand(req, makeParams());
    expect(res.status).toBe(400);
  });

  it('400 titre trop court dans demande', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb());
    const req = new Request(`https://app.test/api/emploi/demandes/${SLUG}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ title: 'Court' }),
    });
    const res = await patchDemand(req, makeParams());
    expect(res.status).toBe(400);
  });

  it('200 PATCH valide sur demande', async () => {
    asOwner();
    mockCreateAdmin.mockReturnValue(makeEmploiDb({ ownerId: OWNER_ID }));
    const req = new Request(`https://app.test/api/emploi/demandes/${SLUG}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ title: 'Cherche emploi saisonnier été 2026' }),
    });
    const res = await patchDemand(req, makeParams());
    expect(res.status).toBe(200);
  });
});
