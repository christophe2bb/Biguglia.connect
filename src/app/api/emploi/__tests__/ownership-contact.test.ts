/**
 * Tests — GET  /api/emploi/ownership
 *         POST /api/emploi/contact
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * /api/emploi/ownership  (GET ?type=offer|demand&slug=xxx)
 *   Auth
 *     – non authentifié → { isOwner: false } (200, pas de 401 — design voulu)
 *   Validation query params
 *     – type invalide      → 400
 *     – slug invalide      → 400
 *     – slug trop court    → 400
 *   Ownership
 *     – userId = owner     → { isOwner: true }
 *     – userId ≠ owner     → { isOwner: false }
 *     – slug introuvable   → { isOwner: false }
 *   Type offer vs demand
 *     – type=demand        → requête sur job_demands
 *
 * /api/emploi/contact  (POST { type, slug })
 *   Auth
 *     – non authentifié    → 401 { status: 'guest' }
 *   Validation body
 *     – JSON invalide      → 400
 *     – type manquant      → 400
 *     – slug trop court    → 400
 *   Offer scenarios
 *     – owner de l'offre   → { status: 'owner' }
 *     – autre utilisateur  → { status: 'revealed', contact_email, … }
 *     – offre introuvable  → { status: 'not_found' } 404
 *     – DB error offre     → 500
 *   Demand scenarios
 *     – owner de la demande→ { status: 'owner' }
 *     – autre utilisateur  → { status: 'revealed', contact_email (depuis profiles) }
 *     – demande introuvable→ { status: 'not_found' } 404
 *     – profil sans contact→ { status: 'no_contact' }
 *     – DB error demand    → 500
 *
 * Architecture de mock :
 *   – @/lib/supabase/server mocké : createAdminClient → db factice
 *   – @/lib/supabase/auth-helper mocké : getUserFromRequest + getUserIdBearerFirst
 *   – Aucun appel réseau réel
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { type NextRequest } from 'next/server';
import { GET  as getOwnership  } from '@/app/api/emploi/ownership/route';
import { POST as postContact   } from '@/app/api/emploi/contact/route';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server',      () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserFromRequest:    vi.fn(),
  getUserIdBearerFirst:  vi.fn(),
}));

import { createAdminClient }                              from '@/lib/supabase/server';
import { getUserFromRequest, getUserIdBearerFirst }       from '@/lib/supabase/auth-helper';

const mockCreateAdmin = createAdminClient     as MockedFunction<typeof createAdminClient>;
const mockGetUser     = getUserFromRequest    as MockedFunction<typeof getUserFromRequest>;
const mockGetUserId   = getUserIdBearerFirst  as MockedFunction<typeof getUserIdBearerFirst>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OWNER_ID = 'uuid-owner-aaaa';
const OTHER_ID = 'uuid-other-bbbb';
const SLUG     = 'boulanger-confirme-2026';   // slug valide (≥ 3 chars, format ok, ASCII only)

// ─── Builders de mock DB ──────────────────────────────────────────────────────

/**
 * Construit un mock adminClient pour ownership / contact.
 *
 * Tables gérées :
 *   • job_offers  – renvoie { user_id, contact_email, … } ou null
 *   • job_demands – renvoie { user_id } ou null
 *   • profiles    – renvoie { email, phone } ou null
 */
function makeDb(opts: {
  ownerId?:       string;
  notFound?:      boolean;
  dbError?:       boolean;    // erreur générique sur la 1ère table
  profileError?:  boolean;    // erreur sur profiles (demand scenario)
  noProfile?:     boolean;    // profil existant mais email + phone null
} = {}) {
  const {
    ownerId      = OWNER_ID,
    notFound     = false,
    dbError      = false,
    profileError = false,
    noProfile    = false,
  } = opts;

  const fromMock = vi.fn((table: string) => {
    // ── job_offers ────────────────────────────────────────────────────────────
    if (table === 'job_offers') {
      const maybeSingle = vi.fn().mockResolvedValue(
        dbError
          ? { data: null,  error: { message: 'DB error offer' } }
          : notFound
            ? { data: null, error: null }
            : {
                data: {
                  user_id:              ownerId,
                  contact_email:        'owner@example.com',
                  contact_phone:        '+33600000000',
                  contact_instructions: 'Envoyer CV',
                  application_mode:     'email',
                },
                error: null,
              }
      );
      const eqSlug = vi.fn().mockReturnValue({ maybeSingle, single: maybeSingle });
      return {
        select: vi.fn().mockReturnValue({ eq: eqSlug }),
      };
    }

    // ── job_demands ───────────────────────────────────────────────────────────
    if (table === 'job_demands') {
      const maybeSingle = vi.fn().mockResolvedValue(
        dbError
          ? { data: null, error: { message: 'DB error demand' } }
          : notFound
            ? { data: null, error: null }
            : { data: { user_id: ownerId }, error: null }
      );
      const eqSlug = vi.fn().mockReturnValue({ maybeSingle, single: maybeSingle });
      return {
        select: vi.fn().mockReturnValue({ eq: eqSlug }),
      };
    }

    // ── profiles ──────────────────────────────────────────────────────────────
    if (table === 'profiles') {
      const maybeSingle = vi.fn().mockResolvedValue(
        profileError
          ? { data: null,  error: { message: 'DB error profile' } }
          : noProfile
            ? { data: { email: null, phone: null }, error: null }
            : { data: { email: 'candidate@example.com', phone: '+33611111111' }, error: null }
      );
      const eqId = vi.fn().mockReturnValue({ maybeSingle, single: maybeSingle });
      return {
        select: vi.fn().mockReturnValue({ eq: eqId }),
      };
    }

    return {};
  });

  return { from: fromMock } as unknown as ReturnType<typeof createAdminClient>;
}

// ─── Request builders ─────────────────────────────────────────────────────────

function ownershipUrl(type = 'offer', slug = SLUG) {
  return `https://app.test/api/emploi/ownership?type=${type}&slug=${encodeURIComponent(slug)}`;
}

function contactReq(body: unknown) {
  return new Request('https://app.test/api/emploi/contact', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

function asOwnershipUser(id: string) {
  mockGetUser.mockResolvedValue({ id } as Awaited<ReturnType<typeof getUserFromRequest>>);
}

function asContactUser(id: string | null) {
  mockGetUserId.mockResolvedValue(id);
}

// =============================================================================
// GET /api/emploi/ownership
// =============================================================================

describe('GET /api/emploi/ownership', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  // ── Validation des query params ────────────────────────────────────────────

  it('400 si type invalide', async () => {
    asOwnershipUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb());
    const res = await getOwnership(
      new Request(ownershipUrl('invalid_type')),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors?.type).toBeDefined();
  });

  it('400 si slug invalide (caractères spéciaux)', async () => {
    asOwnershipUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb());
    const res = await getOwnership(
      new Request(`https://app.test/api/emploi/ownership?type=offer&slug=../../etc/passwd`),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors?.slug).toBeDefined();
  });

  it('400 si slug trop court (< 3 chars)', async () => {
    asOwnershipUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb());
    const res = await getOwnership(
      new Request(`https://app.test/api/emploi/ownership?type=offer&slug=ab`),
    );
    expect(res.status).toBe(400);
  });

  // ── Non authentifié → isOwner false (design voulu : pas de 401) ────────────

  it('isOwner=false si non authentifié (design voulu)', async () => {
    asOwnershipUser('');                      // getUserFromRequest retourne { id: '' }
    mockGetUser.mockResolvedValue(null);      // override : null = non authentifié
    mockCreateAdmin.mockReturnValue(makeDb());
    const res = await getOwnership(
      new Request(ownershipUrl()),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isOwner).toBe(false);
  });

  // ── Ownership correct ─────────────────────────────────────────────────────

  it('isOwner=true si userId = owner', async () => {
    asOwnershipUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID }));
    const res = await getOwnership(new Request(ownershipUrl()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isOwner).toBe(true);
    // Ne JAMAIS exposer userId dans la réponse
    expect(json.userId).toBeUndefined();
  });

  it('isOwner=false si userId ≠ owner', async () => {
    asOwnershipUser(OTHER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID }));
    const res = await getOwnership(new Request(ownershipUrl()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isOwner).toBe(false);
  });

  it('isOwner=false si slug introuvable en DB', async () => {
    asOwnershipUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ notFound: true }));
    const res = await getOwnership(new Request(ownershipUrl()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isOwner).toBe(false);
  });

  // ── type=demand → table job_demands ───────────────────────────────────────

  it('isOwner=true pour type=demand', async () => {
    asOwnershipUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID }));
    const res = await getOwnership(new Request(ownershipUrl('demand')));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isOwner).toBe(true);
    // Vérification que la bonne table a été interrogée
    const admin = mockCreateAdmin.mock.results[0].value;
    expect(admin.from).toHaveBeenCalledWith('job_demands');
  });

  it('isOwner=false pour type=offer (bonne table job_offers)', async () => {
    asOwnershipUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID }));
    const res = await getOwnership(new Request(ownershipUrl('offer')));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isOwner).toBe(true);
    const admin = mockCreateAdmin.mock.results[0].value;
    expect(admin.from).toHaveBeenCalledWith('job_offers');
  });
});

// =============================================================================
// POST /api/emploi/contact
// =============================================================================

describe('POST /api/emploi/contact', () => {

  beforeEach(() => { vi.clearAllMocks(); });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it('401 si non authentifié', async () => {
    asContactUser(null);
    mockCreateAdmin.mockReturnValue(makeDb());
    const res = await postContact(
      contactReq({ type: 'offer', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.status).toBe('guest');
  });

  // ── Validation body ───────────────────────────────────────────────────────

  it('400 si JSON invalide', async () => {
    asContactUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb());
    const req = new Request('https://app.test/api/emploi/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    'not-json',
    });
    const res = await postContact(
      req as unknown as NextRequest,
    );
    expect(res.status).toBe(400);
  });

  it('400 si type absent', async () => {
    asContactUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb());
    const res = await postContact(
      contactReq({ slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details?.type).toBeDefined();
  });

  it('400 si slug trop court (< 3 chars)', async () => {
    asContactUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb());
    const res = await postContact(
      contactReq({ type: 'offer', slug: 'ab' }) as unknown as NextRequest,
    );
    expect(res.status).toBe(400);
  });

  // ── Offer : owner ─────────────────────────────────────────────────────────

  it('status=owner si userId = owner (offer)', async () => {
    asContactUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID }));
    const res = await postContact(
      contactReq({ type: 'offer', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('owner');
    // Pas de fuite des coordonnées vers le propriétaire lui-même
    expect(json.contact_email).toBeUndefined();
  });

  // ── Offer : autre utilisateur → revealed ─────────────────────────────────

  it('status=revealed avec contact si userId ≠ owner (offer)', async () => {
    asContactUser(OTHER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID }));
    const res = await postContact(
      contactReq({ type: 'offer', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('revealed');
    expect(json.contact_email).toBe('owner@example.com');
    expect(json.contact_phone).toBe('+33600000000');
    expect(json.application_mode).toBe('email');
  });

  // ── Offer : introuvable ────────────────────────────────────────────────────

  it('status=not_found 404 si slug inexistant (offer)', async () => {
    asContactUser(OTHER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ notFound: true }));
    const res = await postContact(
      contactReq({ type: 'offer', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.status).toBe('not_found');
  });

  // ── Offer : DB error ──────────────────────────────────────────────────────

  it('500 si DB error sur job_offers', async () => {
    asContactUser(OTHER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ dbError: true }));
    const res = await postContact(
      contactReq({ type: 'offer', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(500);
  });

  // ── Demand : owner ────────────────────────────────────────────────────────

  it('status=owner si userId = owner (demand)', async () => {
    asContactUser(OWNER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID }));
    const res = await postContact(
      contactReq({ type: 'demand', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('owner');
  });

  // ── Demand : autre utilisateur → revealed via profiles ───────────────────

  it('status=revealed avec profil candidat si userId ≠ owner (demand)', async () => {
    asContactUser(OTHER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID }));
    const res = await postContact(
      contactReq({ type: 'demand', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('revealed');
    expect(json.contact_email).toBe('candidate@example.com');
    expect(json.contact_phone).toBe('+33611111111');
  });

  // ── Demand : introuvable ──────────────────────────────────────────────────

  it('status=not_found 404 si slug inexistant (demand)', async () => {
    asContactUser(OTHER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ notFound: true }));
    const res = await postContact(
      contactReq({ type: 'demand', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.status).toBe('not_found');
  });

  // ── Demand : profil sans contact ──────────────────────────────────────────

  it('status=no_contact si profil n\'a ni email ni phone (demand)', async () => {
    asContactUser(OTHER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ ownerId: OWNER_ID, noProfile: true }));
    const res = await postContact(
      contactReq({ type: 'demand', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('no_contact');
  });

  // ── Demand : DB error ─────────────────────────────────────────────────────

  it('500 si DB error sur job_demands', async () => {
    asContactUser(OTHER_ID);
    mockCreateAdmin.mockReturnValue(makeDb({ dbError: true }));
    const res = await postContact(
      contactReq({ type: 'demand', slug: SLUG }) as unknown as NextRequest,
    );
    expect(res.status).toBe(500);
  });
});
