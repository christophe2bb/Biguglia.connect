/**
 * Vérifie la protection du layout /admin :
 * aucune donnée administrative n'est lue avant validation de la session Auth.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  adminFrom: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error('NEXT_REDIRECT:' + url); },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
  createAdminClient: mocks.createAdminClient,
}));

import { verifyAdminLayout } from './admin-layout-guard';

const USER_ID = '00000000-0000-0000-0000-000000000001';

function setup(profile: Record<string, unknown> | null, options: {
  userId?: string | null;
  authError?: { message: string } | null;
  dbError?: { message: string } | null;
} = {}) {
  const userId = options.userId === undefined ? USER_ID : options.userId;
  mocks.getUser.mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
    error: options.authError || null,
  });
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
  mocks.maybeSingle.mockResolvedValue({ data: profile, error: options.dbError || null });
  const eq = vi.fn(() => ({ maybeSingle: mocks.maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  mocks.adminFrom.mockReturnValue({ select });
  mocks.createAdminClient.mockReturnValue({ from: mocks.adminFrom });
  return { eq, select };
}

function profile(role: string, status = 'active', isActive = true) {
  return { id: USER_ID, role, status, is_active: isActive };
}

describe('verifyAdminLayout - droits administration', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('refuse un visiteur sans session et ne lit pas la base privilégiée', async () => {
    setup(profile('admin'), { userId: null });
    await expect(verifyAdminLayout()).rejects.toThrow('NEXT_REDIRECT:/connexion?next=/admin');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('refuse un JWT non valide avant tout accès privilégié', async () => {
    setup(profile('admin'), { authError: { message: 'Invalid JWT' } });
    await expect(verifyAdminLayout()).rejects.toThrow('NEXT_REDIRECT:/connexion?next=/admin');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('refuse les comptes sans profil', async () => {
    setup(null);
    await expect(verifyAdminLayout()).rejects.toThrow('NEXT_REDIRECT:/');
  });

  it('refuse les erreurs de lecture de profil', async () => {
    setup(profile('admin'), { dbError: { message: 'DB unavailable' } });
    await expect(verifyAdminLayout()).rejects.toThrow('NEXT_REDIRECT:/');
  });

  it.each(['resident', 'artisan_pending', 'artisan_verified'])('refuse le rôle %s', async role => {
    setup(profile(role));
    await expect(verifyAdminLayout()).rejects.toThrow('NEXT_REDIRECT:/');
  });

  it('refuse un administrateur suspendu', async () => {
    setup(profile('admin', 'suspended'));
    await expect(verifyAdminLayout()).rejects.toThrow('NEXT_REDIRECT:/');
  });

  it('refuse un administrateur désactivé', async () => {
    setup(profile('admin', 'active', false));
    await expect(verifyAdminLayout()).rejects.toThrow('NEXT_REDIRECT:/');
  });

  it('refuse un profil qui ne correspond pas à la session vérifiée', async () => {
    setup({ ...profile('admin'), id: '00000000-0000-0000-0000-000000000099' });
    await expect(verifyAdminLayout()).rejects.toThrow('NEXT_REDIRECT:/');
  });

  it.each(['admin', 'moderator'])('autorise un profil actif %s', async role => {
    const query = setup(profile(role));
    const result = await verifyAdminLayout();
    expect(result.actor).toEqual({ id: USER_ID, role });
    expect(query.eq).toHaveBeenCalledWith('id', USER_ID);
  });
});
