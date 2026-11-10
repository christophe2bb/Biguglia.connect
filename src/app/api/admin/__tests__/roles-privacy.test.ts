/**
 * Vérifie l'isolation entre administrateur et modérateur, sans connexion DB.
 * Le rôle modérateur n'autorise ni la lecture globale des messages privés,
 * ni la consultation des dossiers personnels ou des journaux administratifs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin-guard');

import { getAdminUser } from '@/lib/supabase/admin-guard';
import { GET as listMessages } from '@/app/api/admin/messages/route';
import { GET as getConversation } from '@/app/api/admin/messages/[id]/route';
import { GET as listUsers } from '@/app/api/admin/users/route';
import { GET as userActivity } from '@/app/api/admin/users/[id]/activity/route';
import { GET as getLogs } from '@/app/api/admin/logs/route';

const mockGuard = vi.mocked(getAdminUser);
const ID = '00000000-0000-0000-0000-000000000001';

function req(path: string) {
  return new NextRequest('https://app.test' + path);
}

describe('Administration — séparation des permissions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGuard.mockResolvedValue({
      ok: true,
      actor: { id: ID, role: 'moderator' },
      adminClient: { from: vi.fn() } as unknown as Extract<Awaited<ReturnType<typeof getAdminUser>>, { ok: true }>['adminClient'],
    });
  });

  it('le modérateur ne lit pas les conversations privées en liste', async () => {
    const r = await listMessages(req('/api/admin/messages'));
    expect(r.status).toBe(403);
  });

  it('le modérateur ne lit pas les messages d’une conversation par son ID', async () => {
    const r = await getConversation(req('/api/admin/messages/' + ID), {
      params: Promise.resolve({ id: ID }),
    });
    expect(r.status).toBe(403);
  });

  it('le modérateur ne lit pas la liste des profils et numéros privés', async () => {
    const r = await listUsers(req('/api/admin/users'));
    expect(r.status).toBe(403);
  });

  it('le modérateur ne consulte pas les activités détaillées des habitants', async () => {
    const r = await userActivity(req('/api/admin/users/' + ID + '/activity'), {
      params: Promise.resolve({ id: ID }),
    });
    expect(r.status).toBe(403);
  });

  it('le modérateur ne consulte pas le journal global des administrateurs', async () => {
    const r = await getLogs(req('/api/admin/logs'));
    expect(r.status).toBe(403);
  });
});
