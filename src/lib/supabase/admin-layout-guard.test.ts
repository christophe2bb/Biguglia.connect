import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyAdminLayout } from './admin-layout-guard';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const mockSsr = vi.mocked(createClient);
const mockAdmin = vi.mocked(createAdminClient);

function setup({
  user = { id: USER_ID } as { id: string } | null,
  authError = null as { message: string } | null,
  role = 'admin' as string | null,
  status = 'active',
  isActive = true,
  profileId = USER_ID,
  dbError = null as { code: string } | null,
} = {}) {
  const getUser = vi.fn().mockResolvedValue({
    data: { user },
    error: authError,
  });
  mockSsr.mockResolvedValue({ auth: { getUser } } as unknown as Awaited<ReturnType<typeof createClient>>);
  const maybeSingle = vi.fn().mockResolvedValue({
    data: role ? {
      id: profileId, role, status, is_active: isActive,
    } : null,
    error: dbError,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  mockAdmin.mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);
  return { getUser, from, select, eq };
}

async function result() {
  try {
    const data = await verifyAdminLayout();
    return { data, redirect: null as string | null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (!msg.startsWith('NEXT_REDIRECT:')) throw error;
    return { data: null, redirect: msg.slice('NEXT_REDIRECT:'.length) };
  }
}

describe('verifyAdminLayout — identité et privilèges réellement vérifiés', () => {
  beforeEach(() => vi.resetAllMocks());

  it('redirige un visiteur sans session vers la connexion', async () => {
    setup({ user: null });
    expect((await result()).redirect).toBe('/connexion?next=/admin');
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('refuse une session avec JWT rejeté même si un profil admin existe', async () => {
    setup({ user: null, authError: { message: 'invalid JWT' } });
    expect((await result()).redirect).toBe('/connexion?next=/admin');
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('refuse un profil manquant après authentification', async () => {
    setup({ role: null });
    expect((await result()).redirect).toBe('/');
  });

  it('refuse une erreur de base, sans ouvrir le tableau de bord', async () => {
    setup({ dbError: { code: '42501' } });
    expect((await result()).redirect).toBe('/');
  });

  it.each(['resident', 'artisan_verified', 'artisan_pending', 'unknown'])(
    'refuse le rôle %s', async role => {
      setup({ role });
      expect((await result()).redirect).toBe('/');
    },
  );

  it('refuse un compte administrateur suspendu', async () => {
    setup({ status: 'suspended' });
    expect((await result()).redirect).toBe('/');
  });

  it('refuse un administrateur désactivé malgré son rôle', async () => {
    setup({ isActive: false });
    expect((await result()).redirect).toBe('/');
  });

  it('refuse un profil dont l’identifiant ne correspond pas à Auth', async () => {
    setup({ profileId: '00000000-0000-0000-0000-000000000099' });
    expect((await result()).redirect).toBe('/');
  });

  it.each(['admin', 'moderator'] as const)(
    'autorise le rôle %s uniquement après getUser()', async role => {
      const mocks = setup({ role });
      const r = await result();
      expect(r.redirect).toBeNull();
      expect(r.data?.actor).toEqual({ id: USER_ID, role });
      expect(mocks.getUser).toHaveBeenCalledTimes(1);
      expect(mocks.from).toHaveBeenCalledWith('profiles');
      expect(mocks.select).toHaveBeenCalledWith('id, role, status, is_active');
      expect(mocks.eq).toHaveBeenCalledWith('id', USER_ID);
    },
  );
});
