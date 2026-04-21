/**
 * Helpers partagés pour mocker getAdminUser() dans les tests des routes admin.
 *
 * Utilisation :
 *   vi.mock('@/lib/supabase/admin-guard', () => ({ getAdminUser: mockGetAdminUser }));
 *   // puis dans beforeEach :
 *   mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', mockDb));
 *
 * Architecture :
 *   - makeAdminGuardOk(role, db)  → AdminGuardOk  (guard passé)
 *   - makeAdminGuardFail(status)  → AdminGuardFail (guard refusé)
 *   - makeDb(tableMap)            → mock Supabase chainable par table
 */

import { vi } from 'vitest';
import { NextResponse } from 'next/server';
import type { AdminGuardResult } from '@/lib/supabase/admin-guard';

// ── IDs de fixtures ────────────────────────────────────────────────────────────

export const ADMIN_ID     = 'uuid-admin-aaaa';
export const MODERATOR_ID = 'uuid-mod-bbbb';
export const TARGET_ID    = 'uuid-target-cccc';

// ── Résultats de guard ─────────────────────────────────────────────────────────

export function makeAdminGuardOk(
  role: 'admin' | 'moderator',
  db: ReturnType<typeof makeDb>,
  id = ADMIN_ID,
): AdminGuardResult {
  return {
    ok:          true,
    actor:       { id, role },
    adminClient: db as unknown as ReturnType<typeof import('@/lib/supabase/server').createAdminClient>,
  };
}

export function makeAdminGuardFail(status: 401 | 403): AdminGuardResult {
  return {
    ok:       false,
    response: NextResponse.json({ error: 'Unauthorized' }, { status }),
  };
}

// ── Mock Supabase chainable ────────────────────────────────────────────────────

/**
 * Construit un mock Supabase `adminClient` qui dispatche par table.
 *
 * @param tables  Map { tableName → { select?, update?, delete?, insert?, upsert? } }
 *                Chaque handler retourne { data, error } ou une promesse.
 *
 * Exemple :
 *   makeDb({
 *     profiles: {
 *       select: () => ({ data: { id: TARGET_ID }, error: null }),
 *       update: () => ({ data: null, error: null }),
 *     },
 *   })
 */
export type TableHandlers = {
  select?:  (...args: unknown[]) => unknown;
  update?:  (...args: unknown[]) => unknown;
  delete?:  (...args: unknown[]) => unknown;
  insert?:  (...args: unknown[]) => unknown;
  upsert?:  (...args: unknown[]) => unknown;
};

export function makeDb(tables: Record<string, TableHandlers> = {}) {
  const from = vi.fn((table: string) => {
    const handlers = tables[table] ?? {};

    // Résout la valeur (sync ou async) dans une chaîne de mocks
    const resolve = (fn?: (...a: unknown[]) => unknown) =>
      fn ? vi.fn((...a: unknown[]) => Promise.resolve(fn(...a))) : vi.fn().mockResolvedValue({ data: null, error: null });

    const eqMock    = vi.fn().mockReturnThis();
    const neqMock   = vi.fn().mockReturnThis();
    const inMock    = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockReturnThis();
    const _headMock  = vi.fn().mockReturnThis();
    const orMock    = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    // select builder
    const selectChain = {
      eq:          eqMock,
      neq:         neqMock,
      in:          inMock,
      order:       orderMock,
      limit:       limitMock,
      or:          orMock,
      single:      singleMock,
      maybeSingle: maybeSingleMock,
      then:        undefined as unknown,
    };
    // Allow await on select chain directly (for count queries etc.)
    const selectResult = handlers.select
      ? Promise.resolve(handlers.select())
      : Promise.resolve({ data: [], error: null });

    const selectMock = vi.fn().mockReturnValue({
      ...selectChain,
      eq: vi.fn().mockReturnValue({
        ...selectChain,
        eq: vi.fn().mockReturnValue({
          ...selectChain,
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      // top-level await
      then: (r: (v: unknown) => unknown) => selectResult.then(r),
      catch: (r: (e: unknown) => unknown) => selectResult.catch(r),
    });

    // update / delete / insert / upsert builders
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(
        handlers.update ? handlers.update() : { data: null, error: null }
      ),
    });

    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(
        handlers.delete ? handlers.delete() : { data: null, error: null }
      ),
    });

    const insertMock = resolve(handlers.insert);
    const upsertMock = vi.fn().mockResolvedValue(
      handlers.upsert ? handlers.upsert() : { data: null, error: null }
    );

    return {
      select: selectMock,
      update: updateMock,
      delete: deleteMock,
      insert: insertMock,
      upsert: upsertMock,
    };
  });

  return { from };
}

// ── CSRF mock (passe toujours) ─────────────────────────────────────────────────

export function mockCsrfPass() {
  return null; // assertCsrfSafe retourne null = pas d'erreur
}

// ── Constructeur de NextRequest ────────────────────────────────────────────────

export function makeReq(
  url = 'https://app.test/api/admin/test',
  method = 'PATCH',
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://app.test',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
