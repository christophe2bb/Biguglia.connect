import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/auth-helper');
vi.mock('@/lib/supabase/server');

import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { createAdminClient } from '@/lib/supabase/server';
import { GET } from './route';

const resident = '00000000-0000-4000-8000-000000000101';
const artisanUser = '00000000-0000-4000-8000-000000000102';
const stranger = '00000000-0000-4000-8000-000000000103';
const requestId = '00000000-0000-4000-8000-000000000104';
const artisanProfile = '00000000-0000-4000-8000-000000000105';
const file = 'photo_2026.jpg';

const mockAuth = vi.mocked(getUserIdBearerFirst);
const mockAdmin = vi.mocked(createAdminClient);
const ctx = (name = file, id = requestId) => ({ params: Promise.resolve({ id, filename: name }) });
const req = () => new NextRequest('https://biguglia.test/api/service-requests/' + requestId + '/photos/' + file);

function setup(options: {
  request?: { id: string; resident_id: string; artisan_id: string | null } | null;
  role?: string;
  accountStatus?: string;
  isActive?: boolean;
  linked?: boolean;
  storageError?: boolean;
  databaseError?: boolean;
} = {}) {
  const quote = options.request === undefined
    ? { id: requestId, resident_id: resident, artisan_id: artisanProfile }
    : options.request;
  const download = vi.fn().mockResolvedValue(options.storageError
    ? { data: null, error: { message: 'not found' } }
    : { data: new Blob([new Uint8Array([0xff, 0xd8, 0xff])]), error: null });
  const from = vi.fn((table: string) => {
    let data: unknown = null;
    if (table === 'service_requests') data = quote;
    if (table === 'artisan_profiles') data = { user_id: artisanUser };
    if (table === 'profiles') data = {
      role: options.role ?? 'resident',
      status: options.accountStatus ?? 'active',
      is_active: options.isActive ?? true,
    };
    if (table === 'service_request_photos') data = options.linked === false ? null : { id: 'link-id' };
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data, error: options.databaseError ? { message: 'DB error' } : null,
          }),
          eq: () => ({
            maybeSingle: async () => ({
              data, error: options.databaseError ? { message: 'DB error' } : null,
            }),
          }),
        }),
      }),
    };
  });
  mockAdmin.mockReturnValue({
    from, storage: { from: () => ({ download }) },
  } as unknown as ReturnType<typeof createAdminClient>);
  return { from, download };
}

describe('Services — GET photo devis privé', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(resident);
  });

  it('401 : ne lit aucune image pour un visiteur non connecté', async () => {
    mockAuth.mockResolvedValue(null);
    const db = setup();
    const response = await GET(req(), ctx());
    expect(response.status).toBe(401);
    expect(db.download).not.toHaveBeenCalled();
  });

  it('404 : invalide ou tentative de traversée de chemin', async () => {
    const db = setup();
    expect((await GET(req(), ctx('../photo.jpg'))).status).toBe(404);
    expect((await GET(req(), ctx('photo.svg'))).status).toBe(404);
    expect(db.from).not.toHaveBeenCalled();
  });

  it('200 : résident propriétaire, photo enregistrée et privée', async () => {
    const db = setup();
    const response = await GET(req(), ctx());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(db.download).toHaveBeenCalledWith('requests/' + requestId + '/' + file);
  });

  it('200 : artisan du devis destinataire', async () => {
    mockAuth.mockResolvedValue(artisanUser);
    expect((await GET(req(), ctx())).status).toBe(200);
  });

  it('403 : tiers étranger au devis', async () => {
    mockAuth.mockResolvedValue(stranger);
    const db = setup();
    expect((await GET(req(), ctx())).status).toBe(403);
    expect(db.download).not.toHaveBeenCalled();
  });

  it('200 : modération autorisée', async () => {
    mockAuth.mockResolvedValue(stranger);
    setup({ role: 'moderator' });
    expect((await GET(req(), ctx('photo_2026.jpg'))).status).toBe(200);
  });

  it('200 : administrateur autorisé', async () => {
    mockAuth.mockResolvedValue(stranger);
    setup({ role: 'admin' });
    expect((await GET(req(), ctx())).status).toBe(200);
  });

  it('403 : compte désactivé ne peut pas lire ses anciennes photos', async () => {
    const db = setup({ accountStatus: 'suspended' });
    expect((await GET(req(), ctx())).status).toBe(403);
    expect(db.download).not.toHaveBeenCalled();
  });

  it('403 : compte sans activation ne peut pas lire les photos', async () => {
    const db = setup({ isActive: false });
    expect((await GET(req(), ctx())).status).toBe(403);
    expect(db.download).not.toHaveBeenCalled();
  });

  it('404 : aucune photo privée pour une demande publique', async () => {
    const db = setup({ request: { id: requestId, resident_id: resident, artisan_id: null } });
    expect((await GET(req(), ctx())).status).toBe(404);
    expect(db.download).not.toHaveBeenCalled();
  });

  it('404 : nom non lié à la demande, même pour le propriétaire', async () => {
    const db = setup({ linked: false });
    expect((await GET(req(), ctx())).status).toBe(404);
    expect(db.download).not.toHaveBeenCalled();
  });

  it('503 : une erreur DB n’autorise aucune lecture Storage', async () => {
    const db = setup({ databaseError: true });
    expect((await GET(req(), ctx())).status).toBe(503);
    expect(db.download).not.toHaveBeenCalled();
  });

  it('404 : fichier absent de Storage', async () => {
    setup({ storageError: true });
    expect((await GET(req(), ctx())).status).toBe(404);
  });
});
