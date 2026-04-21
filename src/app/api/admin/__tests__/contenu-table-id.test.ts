/**
 * Tests — PATCH/DELETE /api/admin/contenu/[table]/[id]
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture :
 *
 *  Auth & permissions
 *    – 401 si pas de session
 *    – 403 si rôle insuffisant
 *
 *  Validation de la table (allowlist)
 *    – 400 si table non autorisée ('profiles', 'admin_secrets', etc.)
 *    – 200 pour chaque table autorisée (listings, forum_posts, equipment_items, reviews)
 *
 *  PATCH — actions autorisées par table
 *    – 400 action inconnue ('nuke')
 *    – 400 corps non-JSON
 *    – 200 set_status → listings (active / inactive)
 *    – 400 set_status avec valeur invalide ('zombie')
 *    – 200 set_closed → forum_posts (true / false)
 *    – 200 set_pinned → forum_posts (true / false)
 *    – 200 set_available → equipment_items (true / false)
 *    – 500 si DB update échoue
 *
 *  DELETE
 *    – 200 suppression réussie (admin)
 *    – 200 suppression réussie (moderator)
 *    – 400 si table non autorisée
 *    – 500 si DB delete échoue
 *
 *  Isolation critique — injection de table
 *    – Table 'pg_roles' → 400 (non dans allowlist)
 *    – Table 'auth.users' → 400
 *    – Table '../../../secrets' → 400
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { PATCH, DELETE } from '@/app/api/admin/contenu/[table]/[id]/route';
import {
  makeAdminGuardOk, makeAdminGuardFail,
  makeDb, makeReq,
  MODERATOR_ID, TARGET_ID,
} from './_mock-admin-guard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin-guard', () => ({ getAdminUser: vi.fn() }));
vi.mock('@/lib/supabase/auth-helper', () => ({ assertCsrfSafe: vi.fn(() => null) }));
vi.mock('server-only', () => ({}));

import { getAdminUser }   from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';

const mockGuard = getAdminUser   as MockedFunction<typeof getAdminUser>;
const mockCsrf  = assertCsrfSafe as MockedFunction<typeof assertCsrfSafe>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeParams(table: string, id = TARGET_ID) {
  return { params: Promise.resolve({ table, id }) };
}

function patchReq(body: unknown, table = 'listings') {
  return makeReq(`https://app.test/api/admin/contenu/${table}/${TARGET_ID}`, 'PATCH', body);
}
function deleteReq(table = 'listings') {
  return makeReq(`https://app.test/api/admin/contenu/${table}/${TARGET_ID}`, 'DELETE');
}

function makeOkDb() {
  return makeDb({
    listings:        { update: () => ({ data: null, error: null }), delete: () => ({ data: null, error: null }) },
    forum_posts:     { update: () => ({ data: null, error: null }), delete: () => ({ data: null, error: null }) },
    equipment_items: { update: () => ({ data: null, error: null }), delete: () => ({ data: null, error: null }) },
    reviews:         { update: () => ({ data: null, error: null }), delete: () => ({ data: null, error: null }) },
  });
}

// ─── Suite PATCH ─────────────────────────────────────────────────────────────

describe('PATCH /api/admin/contenu/[table]/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrf.mockReturnValue(null);
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  it('401 si pas de session', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }), makeParams('listings'));
    expect(res.status).toBe(401);
  });

  it('403 si rôle insuffisant', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }), makeParams('listings'));
    expect(res.status).toBe(403);
  });

  // ── Allowlist des tables ───────────────────────────────────────────────────

  it('400 si table non autorisée : profiles', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }, 'profiles'), makeParams('profiles'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/non autorisée/i);
  });

  it('400 injection de table : pg_roles', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }, 'pg_roles'), makeParams('pg_roles'));
    expect(res.status).toBe(400);
  });

  it('400 injection de table : ../../../secrets', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const tbl = '../../../secrets';
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }, tbl), makeParams(tbl));
    expect(res.status).toBe(400);
  });

  it('400 injection de table : auth.users', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }, 'auth.users'), makeParams('auth.users'));
    expect(res.status).toBe(400);
  });

  // ── Validation Zod ────────────────────────────────────────────────────────

  it('400 corps non-JSON', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const req = new Request(`https://app.test/api/admin/contenu/listings/${TARGET_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: 'not json at all',
    });
    const res = await PATCH(req, makeParams('listings'));
    expect(res.status).toBe(400);
  });

  it('400 action inconnue (nuke)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'nuke' }), makeParams('listings'));
    expect(res.status).toBe(400);
  });

  it('400 set_status avec valeur invalide (zombie)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'zombie' }), makeParams('listings'));
    expect(res.status).toBe(400);
  });

  // ── Actions valides ───────────────────────────────────────────────────────

  it('200 set_status → listings (active)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }), makeParams('listings'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.table).toBe('listings');
  });

  it('200 set_status → listings (inactive)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'inactive' }), makeParams('listings'));
    expect(res.status).toBe(200);
  });

  it('200 set_closed → forum_posts (fermer)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_closed', value: true }, 'forum_posts'), makeParams('forum_posts'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.table).toBe('forum_posts');
  });

  it('200 set_pinned → forum_posts (épingler)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_pinned', value: true }, 'forum_posts'), makeParams('forum_posts'));
    expect(res.status).toBe(200);
  });

  it('200 set_available → equipment_items', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await PATCH(patchReq({ action: 'set_available', value: false }, 'equipment_items'), makeParams('equipment_items'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.table).toBe('equipment_items');
  });

  it('200 moderator peut modifier le contenu', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', makeOkDb(), MODERATOR_ID));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }), makeParams('listings'));
    expect(res.status).toBe(200);
  });

  it('500 si DB update échoue', async () => {
    const db = makeDb({
      listings: { update: () => ({ data: null, error: { message: 'DB down' } }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'set_status', value: 'active' }), makeParams('listings'));
    expect(res.status).toBe(500);
  });
});

// ─── Suite DELETE ────────────────────────────────────────────────────────────

describe('DELETE /api/admin/contenu/[table]/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrf.mockReturnValue(null);
  });

  it('401 si pas de session', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await DELETE(deleteReq(), makeParams('listings'));
    expect(res.status).toBe(401);
  });

  it('400 si table non autorisée', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await DELETE(deleteReq('admin_logs'), makeParams('admin_logs'));
    expect(res.status).toBe(400);
  });

  it('200 suppression listing réussie (admin)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await DELETE(deleteReq('listings'), makeParams('listings'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.table).toBe('listings');
  });

  it('200 suppression forum_post (moderator)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', makeOkDb(), MODERATOR_ID));
    const res = await DELETE(deleteReq('forum_posts'), makeParams('forum_posts'));
    expect(res.status).toBe(200);
  });

  it('200 suppression review', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeOkDb()));
    const res = await DELETE(deleteReq('reviews'), makeParams('reviews'));
    expect(res.status).toBe(200);
  });

  it('500 si DB delete échoue', async () => {
    const db = makeDb({
      listings: { delete: () => ({ data: null, error: { message: 'foreign key' } }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await DELETE(deleteReq('listings'), makeParams('listings'));
    expect(res.status).toBe(500);
  });
});
