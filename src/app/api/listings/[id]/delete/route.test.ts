import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/supabase/auth-helper');

import { createAdminClient } from '@/lib/supabase/server';
import { assertCsrfSafe, getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { DELETE } from './route';

const ID = '00000000-0000-0000-0000-000000000123';
const USER = '00000000-0000-0000-0000-000000000456';
const PHOTO = 'https://project.supabase.co/storage/v1/object/public/photos/listings/' + ID + '/one.jpg';
const request = () => new Request('https://biguglia-connect.test/api/listings/' + ID + '/delete', {
  method: 'DELETE', headers: { Origin: 'https://biguglia-connect.test' },
});
const context = () => ({ params: Promise.resolve({ id: ID }) });

describe('suppression d’annonce protégée', () => {
  beforeEach(() => {
    vi.mocked(assertCsrfSafe).mockReset();
    vi.mocked(assertCsrfSafe).mockReturnValue(null);
    vi.mocked(getUserIdBearerFirst).mockReset();
    vi.mocked(getUserIdBearerFirst).mockResolvedValue(USER);
    vi.mocked(createAdminClient).mockReset();
  });

  it('refuse un utilisateur non connecté', async () => {
    vi.mocked(getUserIdBearerFirst).mockResolvedValueOnce(null);
    const res = await DELETE(request() as never, context());
    expect(res.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('refuse un autre propriétaire sans supprimer de données', async () => {
    const remove = vi.fn();
    const deleteRow = vi.fn();
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: () => ({ eq: () => ({
          maybeSingle: async () => ({ data: { id: ID, user_id: 'different-user', cover_url: null }, error: null }),
        }) }),
        delete: deleteRow,
      })),
      storage: { from: () => ({ remove }) },
    } as never);
    const res = await DELETE(request() as never, context());
    expect(res.status).toBe(403);
    expect(deleteRow).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('supprime d’abord en DB, puis nettoie uniquement les photos de cette annonce', async () => {
    const order: string[] = [];
    const remove = vi.fn(async (paths: string[]) => {
      order.push('storage');
      expect(paths).toEqual(['listings/' + ID + '/one.jpg']);
      return { error: null };
    });
    const deleteListings = vi.fn(() => ({
      eq: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: async () => { order.push('database'); return { data: { id: ID }, error: null }; },
          }),
        }),
      }),
    }));
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'listings') return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({
            data: { id: ID, user_id: USER, cover_url: null }, error: null,
          }) }) }),
          delete: deleteListings,
        };
        if (table === 'listing_photos') return {
          select: () => ({ eq: async () => ({
            data: [{ url: PHOTO },
              { url: 'https://project.supabase.co/storage/v1/object/public/photos/listings/other/photo.jpg' }],
            error: null,
          }) }),
        };
        return {
          delete: () => ({
            eq: () => ({ eq: async () => ({ error: null }) }),
          }),
        };
      }),
      storage: { from: () => ({ remove }) },
    } as never);
    const res = await DELETE(request() as never, context());
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(order).toEqual(['database', 'storage']);
  });

  it('ne supprime jamais Storage si le DELETE SQL échoue', async () => {
    const remove = vi.fn();
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => table === 'listing_photos'
        ? { select: () => ({ eq: async () => ({ data: [{ url: PHOTO }], error: null }) }) }
        : {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({
            data: { id: ID, user_id: USER, cover_url: null }, error: null,
          }) }) }),
          delete: () => ({ eq: () => ({ eq: () => ({ select: () => ({
            maybeSingle: async () => ({ data: null, error: { code: '23503' } }),
          }) }) }) }),
        }),
      storage: { from: () => ({ remove }) },
    } as never);
    const res = await DELETE(request() as never, context());
    expect(res.status).toBe(503);
    expect(remove).not.toHaveBeenCalled();
  });
});
