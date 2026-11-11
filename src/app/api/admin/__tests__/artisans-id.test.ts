/**
 * Services — validation/refus d'un artisan : transaction atomique.
 *
 * Les changements profiles + artisan_profiles doivent réussir ensemble.
 * Aucun avis de succès ni notification si la fonction PostgreSQL échoue.
 */
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { PATCH } from '@/app/api/admin/artisans/[id]/route';
import {
  makeAdminGuardOk, makeAdminGuardFail, makeDb, makeReq, MODERATOR_ID,
} from './_mock-admin-guard';

vi.mock('@/lib/supabase/admin-guard', () => ({ getAdminUser: vi.fn() }));
vi.mock('@/lib/supabase/auth-helper', () => ({ assertCsrfSafe: vi.fn(() => null) }));
vi.mock('server-only', () => ({}));

import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';

const mockGuard = getAdminUser as MockedFunction<typeof getAdminUser>;
const mockCsrf = assertCsrfSafe as MockedFunction<typeof assertCsrfSafe>;

const ARTISAN_USER = '00000000-0000-4000-8000-000000000123';
const ARTISAN_PROFILE = '00000000-0000-4000-8000-000000000124';
const REASON_OK = 'Dossier incomplet, justificatifs manquants.';
const params = (id = ARTISAN_USER) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) => makeReq(
  `https://app.test/api/admin/artisans/${ARTISAN_USER}`, 'PATCH', body,
);

function reviewDb(result: { data: string | null; error: { code?: string; message?: string } | null } = {
  data: ARTISAN_PROFILE,
  error: null,
}) {
  const db = makeDb({
    notifications: { insert: () => ({ data: null, error: null }) },
  });
  return Object.assign(db, { rpc: vi.fn().mockResolvedValue(result) });
}

describe('PATCH /api/admin/artisans/[id] — atomique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrf.mockReturnValue(null);
  });

  it('401 si utilisateur non authentifié', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    expect((await PATCH(req({ action: 'approve' }), params())).status).toBe(401);
  });

  it('403 si rôle insuffisant', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    expect((await PATCH(req({ action: 'approve' }), params())).status).toBe(403);
  });

  it('403 si la protection CSRF rejette', async () => {
    mockCsrf.mockReturnValueOnce(new Response('CSRF', { status: 403 }) as never);
    const db = reviewDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    expect((await PATCH(req({ action: 'approve' }), params())).status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('400 si JSON invalide', async () => {
    const db = reviewDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const raw = new Request(`https://app.test/api/admin/artisans/${ARTISAN_USER}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: '{{bad json',
    });
    expect((await PATCH(raw, params())).status).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('400 si action invalide, refus sans motif ou motif trop court', async () => {
    const db = reviewDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    expect((await PATCH(req({ action: 'ban' }), params())).status).toBe(400);
    expect((await PATCH(req({ action: 'reject' }), params())).status).toBe(400);
    expect((await PATCH(req({ action: 'reject', reason: 'court' }), params())).status).toBe(400);
    expect((await PATCH(req({ action: 'reject', reason: 'x'.repeat(501) }), params())).status).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('400 si UUID artisan invalide', async () => {
    const db = reviewDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    expect((await PATCH(req({ action: 'approve' }), params('un-uuid-invalide'))).status).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('200 approve : la fonction atomique est appelée et la notification seulement après', async () => {
    const db = reviewDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(req({ action: 'approve' }), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, action: 'approved' });
    expect(db.rpc).toHaveBeenCalledWith('admin_review_artisan_profile', {
      p_user_id: ARTISAN_USER, p_approve: true, p_reason: null,
    });
    expect(db.from).toHaveBeenCalledWith('notifications');
  });

  it('200 approve : un moderator autorisé peut valider', async () => {
    const db = reviewDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', db, MODERATOR_ID));
    expect((await PATCH(req({ action: 'approve' }), params())).status).toBe(200);
  });

  it('200 reject : conserve le motif et effectue une transaction unique', async () => {
    const db = reviewDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(req({ action: 'reject', reason: REASON_OK }), params());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, action: 'rejected' });
    expect(db.rpc).toHaveBeenCalledWith('admin_review_artisan_profile', {
      p_user_id: ARTISAN_USER, p_approve: false, p_reason: REASON_OK,
    });
    expect(db.from).toHaveBeenCalledWith('notifications');
  });

  it('503 : refus d'une transaction échouée, aucune notification ni faux succès', async () => {
    const db = reviewDb({ data: null, error: { code: '42501', message: 'DB error' } });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    const res = await PATCH(req({ action: 'reject', reason: REASON_OK }), params());
    expect(res.status).toBe(503);
    expect((await res.json()).success).not.toBe(true);
    expect(db.from).not.toHaveBeenCalledWith('notifications');
  });

  it('503 : résultat vide de RPC ne vaut pas validation', async () => {
    const db = reviewDb({ data: null, error: null });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    expect((await PATCH(req({ action: 'approve' }), params())).status).toBe(503);
    expect(db.from).not.toHaveBeenCalledWith('notifications');
  });

  it('404 : dossier absent, aucune notification', async () => {
    const db = reviewDb({ data: null, error: { code: 'P0002', message: 'not found' } });
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db));
    expect((await PATCH(req({ action: 'approve' }), params())).status).toBe(404);
    expect(db.from).not.toHaveBeenCalledWith('notifications');
  });
});
