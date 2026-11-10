import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/auth-helper', () => ({
  assertCsrfSafe: vi.fn(() => null),
  getUserIdBearerFirst: vi.fn(async () => null),
}));

import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { POST } from './route';

const auth = vi.mocked(getUserIdBearerFirst);
const csrf = vi.mocked(assertCsrfSafe);

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://biguglia-connect.vercel.app/api/diagnostics/messaging-client-error', {
    method: 'POST',
    headers: { Origin: 'https://biguglia-connect.vercel.app', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const sample = {
  path: '/messages/00000000-0000-0000-0000-000000000123',
  name: 'TypeError',
  message: "Cannot read properties of undefined (reading 'id')",
  digest: null,
};

describe('Diagnostic erreurs messagerie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    csrf.mockReturnValue(null);
    auth.mockResolvedValue(null);
  });

  it('refuse un utilisateur non connecté', async () => {
    const res = await POST(request(sample) as never);
    expect(res.status).toBe(401);
  });

  it('refuse une origine interdite', async () => {
    csrf.mockReturnValueOnce(new Response(null, { status: 403 }) as never);
    const res = await POST(request(sample) as never);
    expect(res.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
  });

  it('refuse les diagnostics hors messagerie', async () => {
    auth.mockResolvedValueOnce('00000000-0000-0000-0000-000000000001');
    const res = await POST(request({ ...sample, path: '/dashboard' }) as never);
    expect(res.status).toBe(400);
  });

  it('enregistre un diagnostic minimal sans erreur de rendu', async () => {
    auth.mockResolvedValueOnce('00000000-0000-0000-0000-000000000001');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const res = await POST(request(sample) as never);
      expect(res.status).toBe(204);
      const log = spy.mock.calls[0]?.[1] as { path: string } | undefined;
      expect(log?.path).toBe('/messages/:id');
    } finally {
      spy.mockRestore();
    }
  });
});
