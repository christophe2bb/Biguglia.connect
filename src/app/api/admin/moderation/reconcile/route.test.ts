import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin-guard');
vi.mock('@/lib/supabase/auth-helper');

import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { POST } from './route';

const ADMIN = '00000000-0000-0000-0000-000000000001';
const AUTHOR = '00000000-0000-0000-0000-000000000002';
const LISTING = '00000000-0000-0000-0000-000000000003';
const guardMock = vi.mocked(getAdminUser);
const csrfMock = vi.mocked(assertCsrfSafe);

function req() {
  return new NextRequest('https://app.test/api/admin/moderation/reconcile', {
    method: 'POST',
    headers: { Origin: 'https://app.test' },
  });
}

const pendingListing = {
  id: LISTING,
  user_id: AUTHOR,
  title: 'Chaise disponible',
  description: 'Une annonce en attente',
  created_at: '2026-11-10T08:00:00.000Z',
  updated_at: '2026-11-10T08:00:00.000Z',
};

function setup({
  pending = [pendingListing] as typeof pendingListing[],
  known = [] as Array<{ content_id: string }>,
  pendingError = null as { code: string } | null,
  existingError = null as { code: string } | null,
  insertError = null as { code: string } | null,
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const from = vi.fn((table: string) => {
    if (table === 'listings') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: pending, error: pendingError }),
            }),
          }),
        }),
      };
    }
    if (table === 'moderation_queue') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: async () => ({ data: known, error: existingError }),
            }),
          }),
        }),
        insert,
      };
    }
    throw new Error('unexpected table');
  });
  const db = { from };
  guardMock.mockResolvedValue({
    ok: true, actor: { id: ADMIN, role: 'admin' },
    adminClient: db as unknown as Extract<Awaited<ReturnType<typeof getAdminUser>>, { ok: true }>['adminClient'],
  });
  return { from, insert };
}

describe('POST /api/admin/moderation/reconcile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    csrfMock.mockReturnValue(null);
  });

  it('401 pour un visiteur, sans accès à la base', async () => {
    guardMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Connexion requise' }, { status: 401 }),
    });
    expect((await POST(req())).status).toBe(401);
  });

  it('403 pour un modérateur, sans création de tickets', async () => {
    const db = setup();
    guardMock.mockResolvedValue({
      ok: true, actor: { id: AUTHOR, role: 'moderator' },
      adminClient: { from: db.from } as unknown as Extract<Awaited<ReturnType<typeof getAdminUser>>, { ok: true }>['adminClient'],
    });
    expect((await POST(req())).status).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
  });

  it('403 si le contrôle CSRF refuse la requête', async () => {
    const db = setup();
    csrfMock.mockReturnValue(NextResponse.json({ error: 'CSRF' }, { status: 403 }));
    expect((await POST(req())).status).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
  });

  it('n’insère rien lorsque toutes les annonces ont déjà un ticket', async () => {
    const db = setup({ known: [{ content_id: LISTING }] });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toBe(1);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('récupère une annonce en attente sans publier celle-ci', async () => {
    const db = setup();
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).created).toBe(1);
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
      content_type: 'listing',
      content_id: LISTING,
      author_id: AUTHOR,
      status: 'en_attente_validation',
    }));
    expect(db.from).not.toHaveBeenCalledWith('profiles');
  });

  it('ignore un conflit concurrent au lieu de dupliquer le ticket', async () => {
    const db = setup({ insertError: { code: '23505' } });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toBe(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('renvoie 503 si la lecture des annonces échoue', async () => {
    setup({ pendingError: { code: '42501' } });
    expect((await POST(req())).status).toBe(503);
  });
});
