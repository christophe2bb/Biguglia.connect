/**
 * Tests — PATCH/DELETE /api/admin/users/[id]
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture :
 *
 *  Auth & permissions
 *    – 401 si pas de session (guard fail)
 *    – 403 si rôle insuffisant (guard fail)
 *
 *  PATCH — set_status
 *    – 400 si self-target (admin modifie son propre compte)
 *    – 400 corps non-JSON
 *    – 400 action inconnue (Zod)
 *    – 400 statut invalide (ex. 'zombie')
 *    – 200 + notification si status = 'suspended' (admin)
 *    – 200 + notification si status = 'active' (moderator)
 *    – 500 si erreur DB update
 *
 *  PATCH — set_role
 *    – 403 si acteur = moderator (seul admin peut changer les rôles)
 *    – 400 rôle inconnu (Zod)
 *    – 200 + notification si rôle valide (admin)
 *    – 500 si erreur DB update
 *
 *  DELETE
 *    – 403 si acteur = moderator
 *    – 400 si self-delete
 *    – 200 succès (admin)
 *    – 500 si erreur DB delete
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { PATCH, DELETE } from '@/app/api/admin/users/[id]/route';
import {
  makeAdminGuardOk, makeAdminGuardFail,
  makeDb, makeReq,
  ADMIN_ID, MODERATOR_ID, TARGET_ID,
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

function makeParams(id = TARGET_ID) {
  return { params: { id } };
}

function patchReq(body: unknown) {
  return makeReq(`https://app.test/api/admin/users/${TARGET_ID}`, 'PATCH', body);
}
function deleteReq(id = TARGET_ID) {
  return makeReq(`https://app.test/api/admin/users/${id}`, 'DELETE');
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PATCH /api/admin/users/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrf.mockReturnValue(null);
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  it('401 si pas de session', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await PATCH(patchReq({ action: 'set_status', status: 'suspended' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si rôle insuffisant', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    const res = await PATCH(patchReq({ action: 'set_status', status: 'suspended' }), makeParams());
    expect(res.status).toBe(403);
  });

  // ── Self-target ────────────────────────────────────────────────────────────

  it('400 si admin tente de se modifier lui-même', async () => {
    const db = makeDb({ profiles: { update: () => ({ data: null, error: null }) } });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db, ADMIN_ID));
    // target = ADMIN_ID (même que l'acteur)
    const res = await PATCH(patchReq({ action: 'set_status', status: 'suspended' }), { params: { id: ADMIN_ID } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lui-même/);
  });

  // ── Validation Zod ────────────────────────────────────────────────────────

  it('400 si corps non-JSON', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const req = new Request(`https://app.test/api/admin/users/${TARGET_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: 'not-json',
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(400);
  });

  it('400 si action inconnue', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'nuke_user' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 si statut invalide (zombie)', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'set_status', status: 'zombie' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 si rôle invalide (superadmin)', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'set_role', role: 'superadmin' }), makeParams());
    expect(res.status).toBe(400);
  });

  // ── set_status success ─────────────────────────────────────────────────────

  it('200 suspend + notification (acteur admin)', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const db = makeDb({
      profiles:      { update: () => ({ data: null, error: null }) },
      notifications: { insert: () => ({ data: null, error: null }) },
    });
    // Override insert directement
    const origFrom = db.from.getMockImplementation();
    db.from.mockImplementation((table: string) => {
      const base = origFrom!(table);
      if (table === 'notifications') {
        return { ...base, insert: insertMock };
      }
      return base;
    });

    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'set_status', status: 'suspended' }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('suspended');
  });

  it('200 réactiver (acteur moderator)', async () => {
    const db = makeDb({
      profiles:      { update: () => ({ data: null, error: null }) },
      notifications: { insert: () => ({ data: null, error: null }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', db, MODERATOR_ID));
    const res = await PATCH(patchReq({ action: 'set_status', status: 'active' }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('active');
  });

  it('500 si DB update échoue sur set_status', async () => {
    const db = makeDb({
      profiles: { update: () => ({ data: null, error: { message: 'db boom' } }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'set_status', status: 'suspended' }), makeParams());
    expect(res.status).toBe(500);
  });

  // ── set_role ──────────────────────────────────────────────────────────────

  it('403 si moderator tente de changer un rôle', async () => {
    const db = makeDb({ profiles: { update: () => ({ data: null, error: null }) } });
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', db, MODERATOR_ID));
    const res = await PATCH(patchReq({ action: 'set_role', role: 'moderator' }), makeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/administrateur/);
  });

  it('200 set_role → artisan_verified (acteur admin)', async () => {
    const db = makeDb({
      profiles:      { update: () => ({ data: null, error: null }) },
      notifications: { insert: () => ({ data: null, error: null }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'set_role', role: 'artisan_verified' }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.role).toBe('artisan_verified');
  });

  it('500 si DB update échoue sur set_role', async () => {
    const db = makeDb({
      profiles: { update: () => ({ data: null, error: { message: 'db fail' } }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'set_role', role: 'resident' }), makeParams());
    expect(res.status).toBe(500);
  });
});

// =============================================================================

describe('DELETE /api/admin/users/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrf.mockReturnValue(null);
  });

  it('401 si pas de session', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await DELETE(deleteReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si moderator tente de supprimer un compte', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', db, MODERATOR_ID));
    const res = await DELETE(deleteReq(), makeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/administrateur/);
  });

  it('400 si admin tente de se supprimer lui-même', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db, ADMIN_ID));
    const res = await DELETE(deleteReq(ADMIN_ID), { params: { id: ADMIN_ID } });
    expect(res.status).toBe(400);
  });

  it('200 suppression réussie (admin)', async () => {
    const db = makeDb({
      profiles: { delete: () => ({ data: null, error: null }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await DELETE(deleteReq(), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('500 si DB delete échoue', async () => {
    const db = makeDb({
      profiles: { delete: () => ({ data: null, error: { message: 'constraint' } }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await DELETE(deleteReq(), makeParams());
    expect(res.status).toBe(500);
  });
});
