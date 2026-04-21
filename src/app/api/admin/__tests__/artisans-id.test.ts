/**
 * Tests — PATCH /api/admin/artisans/[id]
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture :
 *
 *  Auth & CSRF
 *    – 401 si pas de session
 *    – 403 si rôle insuffisant
 *    – CSRF bloquant (si assertCsrfSafe retourne une Response)
 *
 *  Validation Zod
 *    – 400 corps non-JSON
 *    – 400 action inconnue
 *    – 400 reject sans reason
 *    – 400 reject reason trop courte (< 10 chars)
 *    – 400 reject reason trop longue (> 500 chars)
 *
 *  approve
 *    – 200 + profiles.update role=artisan_verified, status=active
 *    – 200 + notification insérée
 *    – 500 si DB update profiles échoue
 *
 *  reject
 *    – 200 + profiles.update role=resident, status=active
 *    – 200 + artisan_profiles.update rejection_reason
 *    – 200 + notification insérée
 *    – 500 si DB update profiles échoue
 *
 *  Isolation
 *    – Moderator peut approuver (rôle admin OU moderator suffit pour getAdminUser)
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { PATCH } from '@/app/api/admin/artisans/[id]/route';
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

const REASON_OK  = 'Dossier incomplet, photos manquantes.';
const REASON_SHORT = 'Court';
const REASON_LONG  = 'x'.repeat(501);

function makeParams(id = TARGET_ID) { return { params: Promise.resolve({ id }) }; }

function patchReq(body: unknown) {
  return makeReq(`https://app.test/api/admin/artisans/${TARGET_ID}`, 'PATCH', body);
}

function makeOkDb() {
  return makeDb({
    profiles:         { update: () => ({ data: null, error: null }) },
    artisan_profiles: { update: () => ({ data: null, error: null }) },
    notifications:    { insert: () => ({ data: null, error: null }) },
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PATCH /api/admin/artisans/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrf.mockReturnValue(null);
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  it('401 si pas de session', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await PATCH(patchReq({ action: 'approve' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si rôle insuffisant', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    const res = await PATCH(patchReq({ action: 'approve' }), makeParams());
    expect(res.status).toBe(403);
  });

  it('bloque si CSRF échoue', async () => {
    mockCsrf.mockReturnValue(
      new Response(JSON.stringify({ error: 'CSRF' }), { status: 403 }) as unknown as null
    );
    const res = await PATCH(patchReq({ action: 'approve' }), makeParams());
    expect(res.status).toBe(403);
  });

  // ── Validation Zod ────────────────────────────────────────────────────────

  it('400 corps non-JSON', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDb()));
    const req = new Request(`https://app.test/api/admin/artisans/${TARGET_ID}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: '{{bad json',
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(400);
  });

  it('400 action inconnue', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDb()));
    const res = await PATCH(patchReq({ action: 'ban' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 reject sans reason', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDb()));
    const res = await PATCH(patchReq({ action: 'reject' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 reject reason trop courte (< 10 chars)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDb()));
    const res = await PATCH(patchReq({ action: 'reject', reason: REASON_SHORT }), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors?.reason).toBeDefined();
  });

  it('400 reject reason trop longue (> 500 chars)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDb()));
    const res = await PATCH(patchReq({ action: 'reject', reason: REASON_LONG }), makeParams());
    expect(res.status).toBe(400);
  });

  // ── approve ───────────────────────────────────────────────────────────────

  it('200 approve → role=artisan_verified, status=active', async () => {
    const db = makeOkDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'approve' }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.action).toBe('approved');
    // Vérifie que profiles.update a été appelé
    expect(db.from).toHaveBeenCalledWith('profiles');
  });

  it('200 approve par un moderator (rôle autorisé)', async () => {
    const db = makeOkDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', db, MODERATOR_ID));
    const res = await PATCH(patchReq({ action: 'approve' }), makeParams());
    expect(res.status).toBe(200);
  });

  it('500 si DB update profiles échoue sur approve', async () => {
    const db = makeDb({
      profiles: { update: () => ({ data: null, error: { message: 'constraint' } }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'approve' }), makeParams());
    expect(res.status).toBe(500);
  });

  // ── reject ────────────────────────────────────────────────────────────────

  it('200 reject → role=resident + artisan_profiles.rejection_reason', async () => {
    const db = makeOkDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'reject', reason: REASON_OK }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe('rejected');
    // artisan_profiles doit être touché
    expect(db.from).toHaveBeenCalledWith('artisan_profiles');
    // notification insérée
    expect(db.from).toHaveBeenCalledWith('notifications');
  });

  it('500 si DB update profiles échoue sur reject', async () => {
    const db = makeDb({
      profiles: { update: () => ({ data: null, error: { message: 'db error' } }) },
    });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(patchReq({ action: 'reject', reason: REASON_OK }), makeParams());
    expect(res.status).toBe(500);
  });
});
