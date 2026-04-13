/**
 * Tests unitaires — src/lib/supabase/admin-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture :
 *
 *  getAdminUser(req)
 *    – Pas de session (getUserFromRequest → null) → 401
 *    – Session valide, profil introuvable (DB error) → 401
 *    – Session valide, profil trouvé, role = 'resident' → 403
 *    – Session valide, profil trouvé, role = 'artisan_verified' → 403
 *    – Session valide, profil trouvé, role = 'admin' → ok=true, actor.role='admin'
 *    – Session valide, profil trouvé, role = 'moderator' → ok=true, actor.role='moderator'
 *    – Session valide, profil trouvé, role = 'admin' → adminClient fourni (non-null)
 *    – DB query sur profiles échoue avec error → 401
 *
 * Architecture :
 *  – @/lib/supabase/auth-helper mocké (getUserFromRequest)
 *  – @/lib/supabase/server mocké (createAdminClient → mock DB)
 *  – Aucun appel réseau réel
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks modules ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserFromRequest: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

import { getUserFromRequest } from '@/lib/supabase/auth-helper';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUser } from './admin-guard';

const mockGetUserFromRequest = getUserFromRequest as MockedFunction<typeof getUserFromRequest>;
const mockCreateAdminClient  = createAdminClient  as MockedFunction<typeof createAdminClient>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_ID     = 'uuid-admin-0001';
const MODERATOR_ID = 'uuid-mod-0002';
const RESIDENT_ID  = 'uuid-res-0003';

// ─── Mock DB builder ──────────────────────────────────────────────────────────

function makeAdminClient(role: string | null, dbError = false) {
  const single = vi.fn().mockResolvedValue(
    dbError
      ? { data: null, error: { message: 'DB error' } }
      : { data: role ? { id: ADMIN_ID, role } : null, error: null }
  );
  const eqFn = vi.fn(() => ({ single }));
  const selectFn = vi.fn(() => ({ eq: eqFn }));
  const fromFn = vi.fn(() => ({ select: selectFn }));
  return { from: fromFn } as unknown as ReturnType<typeof createAdminClient>;
}

function makeReq() {
  return new NextRequest('https://biguglia-connect.vercel.app/api/admin/test');
}

// =============================================================================
// getAdminUser()
// =============================================================================

describe('getAdminUser()', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Pas de session ────────────────────────────────────────────────────────

  it('retourne ok=false + 401 si getUserFromRequest retourne null', async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    mockCreateAdminClient.mockReturnValue(makeAdminClient('admin'));

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('n\'appelle pas createAdminClient si aucune session', async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    await getAdminUser(makeReq());

    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  // ── Profil introuvable ────────────────────────────────────────────────────

  it('retourne ok=false + 401 si le profil est introuvable (data=null)', async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: ADMIN_ID });
    mockCreateAdminClient.mockReturnValue(makeAdminClient(null));

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('retourne ok=false + 401 si la requête DB échoue (error non-null)', async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: ADMIN_ID });
    mockCreateAdminClient.mockReturnValue(makeAdminClient('admin', true));

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  // ── Rôle insuffisant ──────────────────────────────────────────────────────

  it('retourne ok=false + 403 si le rôle est resident', async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: RESIDENT_ID });
    mockCreateAdminClient.mockReturnValue(makeAdminClient('resident'));

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('retourne ok=false + 403 si le rôle est artisan_verified', async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: RESIDENT_ID });
    mockCreateAdminClient.mockReturnValue(makeAdminClient('artisan_verified'));

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('retourne ok=false + 403 si le rôle est artisan_pending', async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: RESIDENT_ID });
    mockCreateAdminClient.mockReturnValue(makeAdminClient('artisan_pending'));

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  // ── Rôle admin autorisé ───────────────────────────────────────────────────

  it('retourne ok=true + actor.role=admin pour le rôle admin', async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: ADMIN_ID });
    mockCreateAdminClient.mockReturnValue(makeAdminClient('admin'));

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actor.id).toBe(ADMIN_ID);
      expect(result.actor.role).toBe('admin');
    }
  });

  it('retourne ok=true + actor.role=moderator pour le rôle moderator', async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: MODERATOR_ID });
    mockCreateAdminClient.mockReturnValue(
      (() => {
        const single = vi.fn().mockResolvedValue({
          data: { id: MODERATOR_ID, role: 'moderator' }, error: null,
        });
        const eqFn = vi.fn(() => ({ single }));
        const selectFn = vi.fn(() => ({ eq: eqFn }));
        const fromFn = vi.fn(() => ({ select: selectFn }));
        return { from: fromFn } as unknown as ReturnType<typeof createAdminClient>;
      })()
    );

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actor.id).toBe(MODERATOR_ID);
      expect(result.actor.role).toBe('moderator');
    }
  });

  it('fournit un adminClient non-null quand ok=true', async () => {
    const fakeClient = makeAdminClient('admin');
    mockGetUserFromRequest.mockResolvedValue({ id: ADMIN_ID });
    mockCreateAdminClient.mockReturnValue(fakeClient);

    const result = await getAdminUser(makeReq());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.adminClient).toBeDefined();
  });

  // ── Messages d'erreur structurés ──────────────────────────────────────────

  it('le body 401 contient { error: "..." } pour session manquante', async () => {
    mockGetUserFromRequest.mockResolvedValue(null);
    mockCreateAdminClient.mockReturnValue(makeAdminClient('admin'));

    const result = await getAdminUser(makeReq());
    if (!result.ok) {
      const body = await result.response.json();
      expect(body).toHaveProperty('error');
    }
  });

  it('le body 403 contient { error: "..." } pour rôle insuffisant', async () => {
    mockGetUserFromRequest.mockResolvedValue({ id: RESIDENT_ID });
    mockCreateAdminClient.mockReturnValue(makeAdminClient('resident'));

    const result = await getAdminUser(makeReq());
    if (!result.ok) {
      const body = await result.response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/administrateur/i);
    }
  });
});
