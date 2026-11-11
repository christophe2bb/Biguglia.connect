import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/supabase/auth-helper');

import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { DELETE } from './route';

const OWNER = '00000000-0000-0000-0000-000000000001';
const LISTING_ID = '00000000-0000-0000-0000-000000000002';
const OTHER = '00000000-0000-0000-0000-000000000003';
const mockId = vi.mocked(getUserIdBearerFirst);
const mockCsrf = vi.mocked(assertCsrfSafe);
const mockAdmin = vi.mocked(createAdminClient);

function request(paths: string[], bucket: 'photos' | 'service-quote-photos' = 'photos') {
  return new NextRequest('https://app.test/api/storage/photos', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://app.test' },
    body: JSON.stringify({ paths, bucket }),
  });
}

function adminClient(foundOwner: string = OWNER, quoteArtisan: string | null = null) {
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: {
    user_id: foundOwner, resident_id: foundOwner, artisan_id: quoteArtisan,
  }, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const storageFrom = vi.fn().mockReturnValue({ remove });
  mockAdmin.mockReturnValue({ from, storage: { from: storageFrom } } as unknown as ReturnType<typeof createAdminClient>);
  return { remove, from, storageFrom };
}

describe('DELETE /api/storage/photos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCsrf.mockReturnValue(null);
    mockId.mockResolvedValue(OWNER);
  });

  it('refuse un visiteur non connecté', async () => {
    mockId.mockResolvedValue(null);
    const res = await DELETE(request([`listings/${LISTING_ID}/photo.jpg`]));
    expect(res.status).toBe(401);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('refuse une origine CSRF', async () => {
    mockCsrf.mockReturnValue(new Response('Refusé', { status: 403 }) as ReturnType<typeof assertCsrfSafe>);
    expect((await DELETE(request([`listings/${LISTING_ID}/photo.jpg`]))).status).toBe(403);
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it('permet au propriétaire de supprimer une image de sa propre annonce', async () => {
    const client = adminClient();
    const path = `listings/${LISTING_ID}/photo.jpg`;
    const res = await DELETE(request([path]));
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('listings');
    expect(client.storageFrom).toHaveBeenCalledWith('photos');
    expect(client.remove).toHaveBeenCalledWith([path]);
  });

  it('refuse la suppression des photos d’autrui', async () => {
    const client = adminClient(OTHER);
    const res = await DELETE(request([`listings/${LISTING_ID}/photo.jpg`]));
    expect(res.status).toBe(403);
    expect(client.remove).not.toHaveBeenCalled();
  });

  it('rejette un préfixe inconnu', async () => {
    const client = adminClient();
    expect((await DELETE(request(['secret/dossier/photo.jpg']))).status).toBe(403);
    expect(client.remove).not.toHaveBeenCalled();
  });

  it('rejette les traversées de chemin', async () => {
    const client = adminClient();
    expect((await DELETE(request([`listings/${LISTING_ID}/../private.jpg`]))).status).toBe(403);
    expect(client.remove).not.toHaveBeenCalled();
  });

  it('autorise le dossier personnel uniquement pour son propriétaire', async () => {
    const client = adminClient();
    const path = `${OWNER}/avatar.jpg`;
    const res = await DELETE(request([path]));
    expect(res.status).toBe(200);
    expect(client.from).not.toHaveBeenCalled();
    expect(client.remove).toHaveBeenCalledWith([path]);
  });

  it('n’exécute aucune suppression si le lot contient une image non autorisée', async () => {
    const client = adminClient(OTHER);
    const res = await DELETE(request([
      `${OWNER}/avatar.jpg`, `listings/${LISTING_ID}/other.jpg`,
    ]));
    expect(res.status).toBe(403);
    expect(client.remove).not.toHaveBeenCalled();
  });

  it('autorise le résident à retirer une photo de son devis privé', async () => {
    const client = adminClient(OWNER, OTHER);
    const path = 'requests/' + LISTING_ID + '/devis.jpg';
    const result = await DELETE(request([path], 'service-quote-photos'));
    expect(result.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('service_requests');
    expect(client.storageFrom).toHaveBeenCalledWith('service-quote-photos');
    expect(client.remove).toHaveBeenCalledWith([path]);
  });

  it('refuse un bucket privé pour une demande publique', async () => {
    const client = adminClient(OWNER, null);
    const path = 'requests/' + LISTING_ID + '/devis.jpg';
    expect((await DELETE(request([path], 'service-quote-photos'))).status).toBe(403);
    expect(client.remove).not.toHaveBeenCalled();
  });

  it('refuse de supprimer un devis privé depuis le bucket public', async () => {
    const client = adminClient(OWNER, OTHER);
    const path = 'requests/' + LISTING_ID + '/devis.jpg';
    expect((await DELETE(request([path], 'photos'))).status).toBe(403);
    expect(client.remove).not.toHaveBeenCalled();
  });

  it('refuse un dossier personnel dans le bucket de devis privés', async () => {
    const client = adminClient();
    expect((await DELETE(request([OWNER + '/avatar.jpg'], 'service-quote-photos'))).status).toBe(403);
    expect(client.remove).not.toHaveBeenCalled();
  });

  it('refuse plus de 30 chemins dans une requête', async () => {
    const client = adminClient();
    const paths = Array.from({ length: 31 }, (_, i) => `${OWNER}/photo_${i}.jpg`);
    expect((await DELETE(request(paths))).status).toBe(400);
    expect(client.remove).not.toHaveBeenCalled();
  });
});
