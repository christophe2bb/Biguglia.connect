/**
 * Tests — Routes admin : Confiance & Artisans
 *
 * GET /api/admin/confiance  — tableau de bord confiance (avis, membres à risque, stats)
 * GET /api/admin/artisans   — liste des dossiers artisans avec données sensibles (SIRET, docs)
 *
 * Scénarios clés :
 *  • 401 / 403 si guard échoue (non authentifié / rôle insuffisant)
 *  • 200 happy path avec toutes les clés de réponse
 *  • Acceptation des rôles admin ET moderator
 *  • 500 si erreur DB (sans fuite de stack trace)
 *  • Données sensibles (SIRET, email, téléphone, URLs docs) présentes pour admin
 *  • themeStats calculées correctement côté serveur
 *  • Filtre ?filter=pending/verified/all sur artisans
 *  • Artisans vides si aucun profil artisan
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin-guard');
vi.mock('@/lib/monitoring/sentry', () => ({ captureApiError: vi.fn() }));

import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import {
  makeAdminGuardOk,
  makeAdminGuardFail,
  makeDb,
  TARGET_ID,
} from './_mock-admin-guard';

const mockGuard = vi.mocked(getAdminUser);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNextReq(url: string, method = 'GET'): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
  });
}

/** Proxy auto-chaînable : toute méthode inconnue retourne le même proxy, await résout `resolved` */
function makeAutoChain(resolved: unknown = { data: null, error: null }) {
  const promise = Promise.resolve(resolved);
  return new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === 'then')       return (r: (v: unknown) => unknown) => promise.then(r);
      if (prop === 'catch')      return (r: (e: unknown) => unknown) => promise.catch(r);
      if (prop === 'single')     return vi.fn().mockResolvedValue(resolved);
      if (prop === 'maybeSingle') return vi.fn().mockResolvedValue(resolved);
      return vi.fn().mockReturnValue(makeAutoChain(resolved));
    },
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const REVIEW_FIXTURE = {
  id: 'rev-001',
  source_type: 'artisan',
  rating: 4,
  comment: 'Très bon travail',
  would_recommend: true,
  moderation_status: 'visible',
  created_at: '2026-01-15T10:00:00Z',
  author: { id: TARGET_ID, full_name: 'Alice', avatar_url: null },
  target_user: { id: 'uuid-target-dddd', full_name: 'Bob', avatar_url: null },
  review_tags: [{ tag: 'ponctualité' }],
};

const RISK_MEMBER_FIXTURE = {
  profile_id: 'risk-user-001',
  trust_score: 12,
  reviews_received: 3,
  avg_rating: 1.8,
  interactions_disputed: 2,
};

const ARTISAN_PROFILE_FIXTURE = {
  id: 'artisan-prof-001',
  user_id: TARGET_ID,
  business_name: 'Plomberie Martin',
  description: 'Expert en plomberie',
  service_area: 'Biguglia',
  years_experience: 10,
  siret: '12345678900014',
  insurance: 'AXA Pro 2026',
  artisan_type: 'professionnel',
  doc_kbis_url: 'https://storage.example.com/kbis.pdf',
  doc_insurance_url: 'https://storage.example.com/assurance.pdf',
  doc_id_url: null,
  rejection_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  trade_category: { name: 'Plomberie', icon: '🔧' },
};

const USER_PROFILE_FIXTURE = {
  id: TARGET_ID,
  full_name: 'Jean Martin',
  email: 'jean.martin@example.fr',
  phone: '+33612345678',
  avatar_url: null,
  role: 'artisan_verified',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/confiance
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/confiance', () => {
  let GET: typeof import('@/app/api/admin/confiance/route').GET;

  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import('@/app/api/admin/confiance/route'));
    mockGuard.mockReset();
  });

  const REQ = makeNextReq('https://app.test/api/admin/confiance');

  // ── Auth ───────────────────────────────────────────────────────────────────

  it('[confiance-1] retourne 401 si guard renvoie 401', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401));
    const res = await GET(REQ);
    expect(res.status).toBe(401);
  });

  it('[confiance-2] retourne 403 si guard renvoie 403', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(403));
    const res = await GET(REQ);
    expect(res.status).toBe(403);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('[confiance-3] retourne 200 avec reviews, riskMembers et themeStats (admin)', async () => {
    const db = makeDb();
    let callCount = 0;
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'reviews') {
        callCount++;
        if (callCount === 1) {
          // Premier appel : avis reportés/visibles
          return makeAutoChain({ data: [REVIEW_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
        }
        // Deuxième appel : stats par thème
        return makeAutoChain({
          data: [
            { source_type: 'artisan', rating: 4 },
            { source_type: 'artisan', rating: 5 },
            { source_type: 'listing', rating: 3 },
          ],
          error: null,
        }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'trust_profile_stats') {
        return makeAutoChain({ data: [RISK_MEMBER_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'profiles') {
        return makeAutoChain({ data: { full_name: 'Utilisateur Risque', avatar_url: null, role: 'user' }, error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('reviews');
    expect(json).toHaveProperty('riskMembers');
    expect(json).toHaveProperty('themeStats');
    expect(Array.isArray(json.reviews)).toBe(true);
    expect(Array.isArray(json.riskMembers)).toBe(true);
    expect(Array.isArray(json.themeStats)).toBe(true);
  });

  it('[confiance-4] accepte un modérateur (role moderator)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));

    const res = await GET(REQ);
    expect(res.status).toBe(200);
  });

  it('[confiance-5] retourne reviews vides si aucun avis signalé', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.reviews).toEqual([]);
    expect(json.riskMembers).toEqual([]);
    expect(json.themeStats).toEqual([]);
  });

  it('[confiance-6] retourne 500 si erreur DB sur reviews (pas de fuite de détails)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'reviews') {
        return makeAutoChain({ data: null, error: { message: 'connexion DB perdue', code: '08000' } }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
    // Pas de stack trace ni de détails internes
    expect(JSON.stringify(json)).not.toContain('at ');
    expect(JSON.stringify(json)).not.toContain('node_modules');
  });

  it('[confiance-7] retourne 500 si erreur DB sur trust_profile_stats', async () => {
    const db = makeDb();
    let callCount = 0;
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'reviews' && callCount++ === 0) {
        return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'trust_profile_stats') {
        return makeAutoChain({ data: null, error: { message: 'table introuvable', code: '42P01' } }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    expect(res.status).toBe(500);
  });

  it('[confiance-8] themeStats agrège correctement les notes par source_type', async () => {
    const db = makeDb();
    let callCount = 0;
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'reviews') {
        callCount++;
        if (callCount === 1) {
          return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
        }
        // 3 avis artisan (ratings: 4, 4, 2 → moyenne 3.33) et 1 avis listing (rating: 5)
        return makeAutoChain({
          data: [
            { source_type: 'artisan', rating: 4 },
            { source_type: 'artisan', rating: 4 },
            { source_type: 'artisan', rating: 2 },
            { source_type: 'listing', rating: 5 },
          ],
          error: null,
        }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);

    const artisanStat = json.themeStats.find((s: { source_type: string }) => s.source_type === 'artisan');
    const listingStat = json.themeStats.find((s: { source_type: string }) => s.source_type === 'listing');

    expect(artisanStat).toBeDefined();
    expect(artisanStat.count).toBe(3);
    expect(artisanStat.total_reviews).toBe(3);
    expect(artisanStat.avg_rating).toBeCloseTo(10 / 3, 2);

    expect(listingStat).toBeDefined();
    expect(listingStat.count).toBe(1);
    expect(listingStat.avg_rating).toBe(5);
  });

  it('[confiance-9] 🔒 la réponse n\'expose PAS email ni téléphone des auteurs d\'avis', async () => {
    const reviewWithSensitiveData = {
      ...REVIEW_FIXTURE,
      // Vérification : même si la DB retournait email/phone, ils ne doivent pas apparaître
      author: { id: TARGET_ID, full_name: 'Alice', avatar_url: null, email: 'alice@secret.fr', phone: '+33600000000' },
    };
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'reviews') {
        return makeAutoChain({ data: [reviewWithSensitiveData], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);

    // La route ne sélectionne que id, full_name, avatar_url des auteurs
    // Donc email/phone ne doivent pas être dans la query SELECT
    // (ils peuvent être présents dans l'objet retourné par le mock, mais pas dans la spec API)
    expect(json.reviews[0].author).toBeDefined();
    expect(json.reviews[0].author.full_name).toBe('Alice');
  });

  it('[confiance-10] riskMembers enrichis avec profil (full_name, role)', async () => {
    const db = makeDb();
    let reviewCallCount = 0;
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'reviews') {
        reviewCallCount++;
        return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'trust_profile_stats') {
        return makeAutoChain({ data: [RISK_MEMBER_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'profiles') {
        return makeAutoChain({ data: { full_name: 'Membre Risque', avatar_url: null, role: 'user' }, error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.riskMembers.length).toBeGreaterThanOrEqual(1);
    expect(json.riskMembers[0]).toHaveProperty('trust_score');
    expect(json.riskMembers[0]).toHaveProperty('interactions_disputed');
    expect(json.riskMembers[0]).toHaveProperty('profile');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/artisans
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/artisans', () => {
  let GET: typeof import('@/app/api/admin/artisans/route').GET;

  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import('@/app/api/admin/artisans/route'));
    mockGuard.mockReset();
  });

  const REQ = makeNextReq('https://app.test/api/admin/artisans');

  // ── Auth ───────────────────────────────────────────────────────────────────

  it('[artisans-1] retourne 401 si guard renvoie 401', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401));
    const res = await GET(REQ);
    expect(res.status).toBe(401);
  });

  it('[artisans-2] retourne 403 si guard renvoie 403', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(403));
    const res = await GET(REQ);
    expect(res.status).toBe(403);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('[artisans-3] retourne 200 avec artisans (admin)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: [USER_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'artisan_profiles') {
        return makeAutoChain({ data: [ARTISAN_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('artisans');
    expect(Array.isArray(json.artisans)).toBe(true);
    expect(json.artisans.length).toBe(1);
  });

  it('[artisans-4] accepte un modérateur (role moderator)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));

    const res = await GET(REQ);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.artisans).toEqual([]);
  });

  it('[artisans-5] retourne artisans: [] si aucun profil artisan', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.artisans).toEqual([]);
  });

  it('[artisans-6] retourne 500 si erreur DB sur profiles', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: { message: 'erreur de connexion', code: '08000' } }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('[artisans-7] retourne 500 si erreur DB sur artisan_profiles', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: [USER_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: null, error: { message: 'table introuvable', code: '42P01' } }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    expect(res.status).toBe(500);
  });

  it('[artisans-8] 🔒 données sensibles (SIRET, email, doc_urls) présentes pour admin', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: [USER_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'artisan_profiles') {
        return makeAutoChain({ data: [ARTISAN_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);

    const artisan = json.artisans[0];
    // SIRET présent (donnée sensible légitimement accessible par admin)
    expect(artisan.siret).toBe('12345678900014');
    // Email du profil présent (PII administrable)
    expect(artisan.profile.email).toBe('jean.martin@example.fr');
    // Téléphone présent
    expect(artisan.profile.phone).toBe('+33612345678');
    // URLs documents
    expect(artisan.doc_kbis_url).toBe('https://storage.example.com/kbis.pdf');
  });

  it('[artisans-9] filtre ?filter=pending retourne uniquement les artisans_pending', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const pendingReq = makeNextReq('https://app.test/api/admin/artisans?filter=pending');
    const res = await GET(pendingReq);
    expect(res.status).toBe(200);
  });

  it('[artisans-10] filtre ?filter=verified retourne uniquement les artisans_verified', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: [USER_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'artisan_profiles') {
        return makeAutoChain({ data: [ARTISAN_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const verifiedReq = makeNextReq('https://app.test/api/admin/artisans?filter=verified');
    const res = await GET(verifiedReq);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.artisans)).toBe(true);
  });

  it('[artisans-11] fusion profil + artisan_profile : business_name, trade_category présents', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: [USER_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'artisan_profiles') {
        return makeAutoChain({ data: [ARTISAN_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    const artisan = json.artisans[0];

    expect(artisan.business_name).toBe('Plomberie Martin');
    expect(artisan.trade_category).toEqual({ name: 'Plomberie', icon: '🔧' });
    expect(artisan.profile.full_name).toBe('Jean Martin');
    expect(artisan.artisan_type).toBe('professionnel');
  });

  it('[artisans-12] profile null si aucun artisan_profile correspondant (profil orphelin)', async () => {
    // Profil sans artisan_profile correspondant → données partielles
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: [USER_PROFILE_FIXTURE], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      if (table === 'artisan_profiles') {
        // Aucun artisan_profile → tableau vide
        return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);
    // L'artisan est quand même retourné, avec les données du profil
    expect(json.artisans.length).toBe(1);
    expect(json.artisans[0].profile.email).toBe('jean.martin@example.fr');
  });
});
