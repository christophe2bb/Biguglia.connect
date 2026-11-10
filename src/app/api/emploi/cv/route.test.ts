import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/supabase/auth-helper');

import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { GET } from './route';

const DEMAND = '00000000-0000-0000-0000-000000000020';
const READER = '00000000-0000-0000-0000-000000000001';
const OWNER = '00000000-0000-0000-0000-000000000002';
const CV_PATH = `cv/${DEMAND}/1700000000000.pdf`;

const mockUser = vi.mocked(getUserIdBearerFirst);
const mockAdmin = vi.mocked(createAdminClient);

function req(id = DEMAND) {
  return new NextRequest(`https://app.test/api/emploi/cv?demandId=${id}`);
}

function db({
  demand = { id: DEMAND, user_id: OWNER, status: 'published', cv_url: CV_PATH },
  user = { status: 'active', is_active: true },
  signedUrl = 'https://storage.example.test/private/signed.pdf',
  signingError = null as { message: string } | null,
}: {
  demand?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  signedUrl?: string;
  signingError?: { message: string } | null;
} = {}) {
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl }, error: signingError,
  });
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: table === 'profiles' ? user : table === 'job_demands' ? demand : null,
          error: null,
        }),
      }),
    }),
  }));
  mockAdmin.mockReturnValue({
    from,
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
  } as unknown as ReturnType<typeof createAdminClient>);
  return { from, createSignedUrl };
}

describe('GET /api/emploi/cv', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUser.mockResolvedValue(READER);
  });

  it('refuse les identifiants de demande invalides', async () => {
    expect((await GET(req('pas-uuid'))).status).toBe(400);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('redirige un visiteur non connecté vers la connexion', async () => {
    mockUser.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/connexion?');
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('autorise un membre actif par URL signée expirant après 60 secondes', async () => {
    const client = db();
    const res = await GET(req());
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('storage.example.test');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
    expect(client.createSignedUrl).toHaveBeenCalledWith(CV_PATH, 60);
  });

  it('refuse un compte suspendu', async () => {
    const client = db({ user: { status: 'suspended', is_active: false } });
    expect((await GET(req())).status).toBe(403);
    expect(client.createSignedUrl).not.toHaveBeenCalled();
  });

  it('ne révèle pas le CV d’une demande non publiée à une autre personne', async () => {
    const client = db({ demand: {
      id: DEMAND, user_id: OWNER, status: 'draft', cv_url: CV_PATH,
    } });
    expect((await GET(req())).status).toBe(404);
    expect(client.createSignedUrl).not.toHaveBeenCalled();
  });

  it('ne signe pas un chemin de stockage appartenant à une autre annonce', async () => {
    const client = db({ demand: {
      id: DEMAND, user_id: OWNER, status: 'published',
      cv_url: 'cv/00000000-0000-0000-0000-000000000099/other.pdf',
    } });
    expect((await GET(req())).status).toBe(404);
    expect(client.createSignedUrl).not.toHaveBeenCalled();
  });

  it('ne signe pas de chemin traversant', async () => {
    const client = db({ demand: {
      id: DEMAND, user_id: OWNER, status: 'published',
      cv_url: `cv/${DEMAND}/../private.pdf`,
    } });
    expect((await GET(req())).status).toBe(404);
    expect(client.createSignedUrl).not.toHaveBeenCalled();
  });

  it('renvoie 503 si la création du lien privé échoue', async () => {
    db({ signingError: { message: 'Storage unavailable' } });
    expect((await GET(req())).status).toBe(503);
  });
});
