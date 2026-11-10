/**
 * Tests de non-regression pour la recuperation d'un profil Supabase manquant.
 * Aucun appel a la vraie base ni creation d'un compte de production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/supabase/auth-helper');

import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { POST } from './route';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const mockIdentity = vi.mocked(getUserIdBearerFirst);
const mockCsrf = vi.mocked(assertCsrfSafe);
const mockAdmin = vi.mocked(createAdminClient);

function request(body: unknown = { role: 'admin', id: 'someone-else' }) {
  return new Request('https://app.test/api/auth/ensure-profile', {
    method: 'POST',
    headers: { Origin: 'https://app.test', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
}

function db({
  existing = null,
  selectError = null,
  insertError = null,
  userMetadata = { role: 'admin', full_name: 'Compte Test', legal_consent: true },
}: {
  existing?: { id: string } | null;
  selectError?: { code: string } | null;
  insertError?: { code: string } | null;
  userMetadata?: Record<string, unknown>;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: selectError });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const from = vi.fn().mockReturnValue({ select, insert });
  const getUserById = vi.fn().mockResolvedValue({
    data: {
      user: {
        id: USER_ID,
        email: 'test@example.invalid',
        user_metadata: userMetadata,
        created_at: '2026-01-02T09:00:00.000Z',
      },
    },
    error: null,
  });
  mockAdmin.mockReturnValue({ from, auth: { admin: { getUserById } } } as unknown as ReturnType<typeof createAdminClient>);
  return { from, insert, getUserById, maybeSingle };
}

describe('POST /api/auth/ensure-profile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCsrf.mockReturnValue(null);
    mockIdentity.mockResolvedValue(USER_ID);
  });

  it('refuse un utilisateur non authentifie sans interroger la base', async () => {
    mockIdentity.mockResolvedValue(null);
    const result = await POST(request());
    expect(result.status).toBe(401);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('rejette une requete CSRF sans interroger la base', async () => {
    mockCsrf.mockReturnValue(new Response('Refuse', { status: 403 }) as ReturnType<typeof assertCsrfSafe>);
    const result = await POST(request());
    expect(result.status).toBe(403);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('ne cree pas de doublon si le profil existe deja', async () => {
    const client = db({ existing: { id: USER_ID } });
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ok: true, created: false });
    expect(client.insert).not.toHaveBeenCalled();
  });

  it('cree uniquement le profil du demandeur, avec role non privilegie', async () => {
    const client = db();
    const result = await POST(request({ id: 'autrui', role: 'admin', status: 'active' }));
    expect(result.status).toBe(201);
    expect(client.getUserById).toHaveBeenCalledWith(USER_ID);
    expect(client.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: USER_ID,
      email: 'test@example.invalid',
      role: 'resident',
      legal_consent: true,
      status: 'active',
    }));
    expect(client.insert).not.toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
  });

  it('accepte artisan_pending mais jamais administrateur', async () => {
    const client = db({ userMetadata: { role: 'artisan_pending' } });
    const result = await POST(request());
    expect(result.status).toBe(201);
    expect(client.insert).toHaveBeenCalledWith(expect.objectContaining({ role: 'artisan_pending' }));
  });

  it('refuse la creation si une lecture de profils echoue', async () => {
    const client = db({ selectError: { code: '42501' } });
    const result = await POST(request());
    expect(result.status).toBe(503);
    expect(client.insert).not.toHaveBeenCalled();
  });

  it('renvoie une erreur si la creation echoue', async () => {
    db({ insertError: { code: '23503' } });
    const result = await POST(request());
    expect(result.status).toBe(503);
  });
});
