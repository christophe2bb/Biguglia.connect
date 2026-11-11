import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/supabase/auth-helper');

import { createAdminClient } from '@/lib/supabase/server';
import { assertCsrfSafe, getUserIdBearerFirst } from '@/lib/supabase/auth-helper';
import { DELETE } from './route';

const id = '00000000-0000-0000-0000-000000000123';
const user = '00000000-0000-0000-0000-000000000456';
const url = 'https://project.supabase.co/storage/v1/object/public/photos/requests/' + id + '/photo.jpg';
const request = () => new Request('https://biguglia-connect.test/api/service-requests/' + id + '/delete', { method: 'DELETE' });
const ctx = () => ({ params: Promise.resolve({ id }) });

describe('Suppression demande : sécurité', () => {
  beforeEach(() => {
    vi.mocked(assertCsrfSafe).mockReset().mockReturnValue(null);
    vi.mocked(getUserIdBearerFirst).mockReset().mockResolvedValue(user);
    vi.mocked(createAdminClient).mockReset();
  });
  it('refuse un visiteur', async () => {
    vi.mocked(getUserIdBearerFirst).mockResolvedValueOnce(null);
    expect((await DELETE(request() as never, ctx())).status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it('refuse le compte qui ne possède pas la demande', async () => {
    const deleteRow = vi.fn();
    const remove = vi.fn();
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: () => ({ eq: () => ({ maybeSingle: async () =>
          ({ data: { id, resident_id: 'different-owner' }, error: null }) }) }),
        delete: deleteRow,
      })),
      storage: { from: () => ({ remove }) },
    } as never);
    const denied = await DELETE(request() as never, ctx());
    expect(denied.status, await denied.clone().text()).toBe(403);
    expect(deleteRow).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
  it('supprime la base avant Storage, uniquement dans le dossier de cette demande', async () => {
    const order: string[] = [];
    const remove = vi.fn(async (paths: string[]) => {
      order.push('storage');
      expect(paths).toEqual(['requests/' + id + '/photo.jpg', 'requests/' + id + '/orphan.jpg']);
      return { error: null };
    });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => table === 'service_request_photos'
        ? { select: () => ({ eq: async () => ({ data: [{ url }, { url: 'https://project.supabase.co/storage/v1/object/public/photos/requests/other/photo.jpg' }], error: null }) }) }
        : {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id, resident_id: user }, error: null }) }) }),
          delete: () => ({ eq: () => ({ eq: () => ({ select: () => ({
            maybeSingle: async () => { order.push('database'); return { data: { id }, error: null }; },
          }) }) }) }),
        }),
      storage: { from: () => ({
        list: async () => ({ data: [
          { id: 'stored-linked', name: 'photo.jpg' },
          { id: 'stored-orphan', name: 'orphan.jpg' },
          { id: null, name: 'nested-folder' },
          { id: 'malicious', name: '../elsewhere.jpg' },
        ], error: null }),
        remove,
      }) },
    } as never);
    const result = await DELETE(request() as never, ctx());
    expect(result.status, await result.clone().text()).toBe(200);
    expect((await result.json()).cleanupWarning).toBe(true);
    expect(order).toEqual(['database', 'storage']);
  });
  it('ne supprime pas les photos si DELETE SQL échoue', async () => {
    const remove = vi.fn();
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => table === 'service_request_photos'
        ? { select: () => ({ eq: async () => ({ data: [{ url }], error: null }) }) }
        : {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id, resident_id: user }, error: null }) }) }),
          delete: () => ({ eq: () => ({ eq: () => ({ select: () => ({
            maybeSingle: async () => ({ data: null, error: { code: '42501' } }),
          }) }) }) }),
        }),
      storage: { from: () => ({
        list: async () => ({ data: [{ id: 'stored-orphan', name: 'orphan.jpg' }], error: null }),
        remove,
      }) },
    } as never);
    const failed = await DELETE(request() as never, ctx());
    expect(failed.status, await failed.clone().text()).toBe(503);
    expect(remove).not.toHaveBeenCalled();
  });
});
