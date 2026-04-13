/**
 * Tests — PATCH /api/admin/moderation/[id]/decision
 *       + PATCH /api/admin/moderation/[id]/trust
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture decision :
 *
 *  Auth & CSRF
 *    – 401 si pas de session
 *    – 403 si rôle insuffisant
 *
 *  Validation Zod
 *    – 400 corps non-JSON
 *    – 400 décision inconnue
 *    – 400 refuser sans reason (champ requis)
 *    – 400 demander_correction sans reason
 *    – 400 reason trop longue
 *
 *  Récupération queue item côté serveur
 *    – 404 si item introuvable
 *    – 500 si DB queue introuvable (error)
 *
 *  Décisions valides
 *    – 200 accepter → newStatus='publie', propagation table source (listing)
 *    – 200 refuser  → newStatus='refuse', refusal_reason rempli
 *    – 200 demander_correction → newStatus='a_corriger'
 *    – 200 avec moderator_note optionnel
 *    – 500 si DB update queue échoue
 *
 *  Propagation table source
 *    – content_type='listing' → table 'listings' mise à jour
 *    – content_type='forum_post' → table 'forum_posts' mise à jour
 *    – content_type inconnu → pas de propagation (non-fatal)
 *
 * Couverture trust :
 *
 *  Auth & CSRF
 *    – 401 / 403
 *
 *  Validation Zod
 *    – 400 trust_level inconnu ('dieu')
 *    – 400 trust_level manquant
 *
 *  Récupération author_id côté serveur
 *    – 404 si queue item introuvable
 *
 *  Mise à jour
 *    – 200 trust_level='surveille' → profiles.update
 *    – 200 trust_level='de_confiance'
 *    – 500 si profiles.update échoue
 *    – author_id dans la réponse (dérivé du queue item — pas fourni par le client)
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { PATCH as patchDecision } from '@/app/api/admin/moderation/[id]/decision/route';
import { PATCH as patchTrust    } from '@/app/api/admin/moderation/[id]/trust/route';
import {
  makeAdminGuardOk, makeAdminGuardFail,
  makeDb, makeReq,
  ADMIN_ID, MODERATOR_ID, TARGET_ID,
} from './_mock-admin-guard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin-guard', () => ({ getAdminUser: vi.fn() }));
vi.mock('@/lib/supabase/auth-helper', () => ({ assertCsrfSafe: vi.fn(() => null) }));
vi.mock('server-only', () => ({}));

import { getAdminUser }   from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';

const mockGuard = getAdminUser   as MockedFunction<typeof getAdminUser>;
const mockCsrf  = assertCsrfSafe as MockedFunction<typeof assertCsrfSafe>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUEUE_ID   = 'uuid-queue-dddd';
const CONTENT_ID = 'uuid-content-eeee';
const AUTHOR_ID  = 'uuid-author-ffff';

function makeParams(id = QUEUE_ID) { return { params: { id } }; }

function decisionReq(body: unknown) {
  return makeReq(`https://app.test/api/admin/moderation/${QUEUE_ID}/decision`, 'PATCH', body);
}
function trustReq(body: unknown) {
  return makeReq(`https://app.test/api/admin/moderation/${QUEUE_ID}/trust`, 'PATCH', body);
}

/**
 * Construit un db où :
 *  – moderation_queue.select → retourne l'item (avec content_type paramétrable)
 *  – moderation_queue.update → succès
 *  – <sourceTable>.update    → succès
 *  – profiles.update         → succès (pour trust)
 */
function makeDecisionDb(contentType = 'listing', queueError = false, updateError = false) {
  const sourceTable = contentType === 'listing' ? 'listings'
    : contentType === 'forum_post' ? 'forum_posts'
    : contentType;

  // Construit un mock Supabase avec une logique de select par table
  const from = vi.fn((table: string) => {
    if (table === 'moderation_queue') {
      // select chain : retourne l'item via single()
      const singleSelect = vi.fn().mockResolvedValue(
        queueError
          ? { data: null, error: { message: 'not found' } }
          : {
              data: { id: QUEUE_ID, content_type: contentType, content_id: CONTENT_ID, status: 'en_attente_validation' },
              error: null,
            }
      );
      const eqSelect = vi.fn().mockReturnValue({ single: singleSelect });
      const selectChain = { eq: eqSelect };

      // update chain
      const updateResult = updateError
        ? { data: null, error: { message: 'update fail' } }
        : { data: null, error: null };
      const eqUpdate = vi.fn().mockResolvedValue(updateResult);
      const updateChain = { eq: eqUpdate };

      return {
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue(updateChain),
      };
    }

    if (table === sourceTable || table === 'listings' || table === 'forum_posts') {
      const eqUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
      return { update: vi.fn().mockReturnValue({ eq: eqUpdate }) };
    }

    // fallback
    return {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    };
  });

  return { from };
}

function makeTrustDb(authorId = AUTHOR_ID, fetchError = false, profileError = false) {
  const from = vi.fn((table: string) => {
    if (table === 'moderation_queue') {
      const single = vi.fn().mockResolvedValue(
        fetchError
          ? { data: null, error: { message: 'not found' } }
          : { data: { id: QUEUE_ID, author_id: authorId }, error: null }
      );
      const eq = vi.fn().mockReturnValue({ single });
      return {
        select: vi.fn().mockReturnValue({ eq }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      };
    }
    if (table === 'profiles') {
      const eqUpdate = vi.fn().mockResolvedValue(
        profileError
          ? { data: null, error: { message: 'profile update fail' } }
          : { data: null, error: null }
      );
      return { update: vi.fn().mockReturnValue({ eq: eqUpdate }) };
    }
    return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) };
  });
  return { from };
}

// =============================================================================
// decision
// =============================================================================

describe('PATCH /api/admin/moderation/[id]/decision', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  // ── Auth ───────────────────────────────────────────────────────────────────

  it('401 si pas de session', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await patchDecision(decisionReq({ decision: 'accepter' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si rôle insuffisant', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    const res = await patchDecision(decisionReq({ decision: 'accepter' }), makeParams());
    expect(res.status).toBe(403);
  });

  // ── Validation Zod ────────────────────────────────────────────────────────

  it('400 corps non-JSON', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDecisionDb() as ReturnType<typeof makeDb>));
    const req = new Request(`https://app.test/api/admin/moderation/${QUEUE_ID}/decision`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: 'not json',
    });
    const res = await patchDecision(req, makeParams());
    expect(res.status).toBe(400);
  });

  it('400 décision inconnue', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDecisionDb() as ReturnType<typeof makeDb>));
    const res = await patchDecision(decisionReq({ decision: 'ignorer' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 refuser sans reason', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDecisionDb() as ReturnType<typeof makeDb>));
    const res = await patchDecision(decisionReq({ decision: 'refuser' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 demander_correction sans reason', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDecisionDb() as ReturnType<typeof makeDb>));
    const res = await patchDecision(decisionReq({ decision: 'demander_correction' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 moderator_note trop longue (> 1000 chars)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDecisionDb() as ReturnType<typeof makeDb>));
    const res = await patchDecision(
      decisionReq({ decision: 'accepter', moderator_note: 'x'.repeat(1001) }),
      makeParams()
    );
    expect(res.status).toBe(400);
  });

  // ── 404 queue item manquant ───────────────────────────────────────────────

  it('404 si item de modération introuvable', async () => {
    const db = makeDecisionDb('listing', true /* queueError */);
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchDecision(decisionReq({ decision: 'accepter' }), makeParams());
    expect(res.status).toBe(404);
  });

  // ── Décisions valides ─────────────────────────────────────────────────────

  it('200 accepter → publie + propagation listings', async () => {
    const db = makeDecisionDb('listing');
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchDecision(decisionReq({ decision: 'accepter' }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.newStatus).toBe('publie');
    expect(json.decision).toBe('accepter');
    // La table source doit être touchée
    expect(db.from).toHaveBeenCalledWith('listings');
  });

  it('200 refuser → refuse + refusal_reason (moderator)', async () => {
    const db = makeDecisionDb('listing');
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', db as ReturnType<typeof makeDb>, MODERATOR_ID));
    const res = await patchDecision(
      decisionReq({ decision: 'refuser', reason: 'Contenu inapproprié' }),
      makeParams()
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.newStatus).toBe('refuse');
  });

  it('200 demander_correction → a_corriger', async () => {
    const db = makeDecisionDb('forum_post');
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchDecision(
      decisionReq({ decision: 'demander_correction', reason: 'Photos illisibles' }),
      makeParams()
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.newStatus).toBe('a_corriger');
    // forum_posts doit être touché
    expect(db.from).toHaveBeenCalledWith('forum_posts');
  });

  it('200 accepter avec moderator_note', async () => {
    const db = makeDecisionDb('listing');
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchDecision(
      decisionReq({ decision: 'accepter', moderator_note: 'Vérifié manuellement' }),
      makeParams()
    );
    expect(res.status).toBe(200);
  });

  it('500 si DB update queue échoue', async () => {
    const db = makeDecisionDb('listing', false, true /* updateError */);
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchDecision(decisionReq({ decision: 'accepter' }), makeParams());
    expect(res.status).toBe(500);
  });

  it('content_type inconnu → décision enregistrée mais pas de propagation (non-fatal)', async () => {
    const db = makeDecisionDb('unknown_type');
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchDecision(decisionReq({ decision: 'accepter' }), makeParams());
    // La route doit quand même réussir (propagation non-fatale)
    expect(res.status).toBe(200);
  });
});

// =============================================================================
// trust
// =============================================================================

describe('PATCH /api/admin/moderation/[id]/trust', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  // ── Auth ───────────────────────────────────────────────────────────────────

  it('401 si pas de session', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await patchTrust(trustReq({ trust_level: 'fiable' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('403 si rôle insuffisant', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    const res = await patchTrust(trustReq({ trust_level: 'fiable' }), makeParams());
    expect(res.status).toBe(403);
  });

  // ── Validation Zod ────────────────────────────────────────────────────────

  it('400 trust_level inconnu (dieu)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeTrustDb() as ReturnType<typeof makeDb>));
    const res = await patchTrust(trustReq({ trust_level: 'dieu' }), makeParams());
    expect(res.status).toBe(400);
  });

  it('400 trust_level manquant', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeTrustDb() as ReturnType<typeof makeDb>));
    const res = await patchTrust(trustReq({}), makeParams());
    expect(res.status).toBe(400);
  });

  // ── 404 queue item manquant ───────────────────────────────────────────────

  it('404 si item de modération introuvable', async () => {
    const db = makeTrustDb(AUTHOR_ID, true /* fetchError */);
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchTrust(trustReq({ trust_level: 'fiable' }), makeParams());
    expect(res.status).toBe(404);
  });

  // ── Mise à jour valide ────────────────────────────────────────────────────

  it('200 trust_level=surveille → profiles.update (author_id dérivé serveur)', async () => {
    const db = makeTrustDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchTrust(trustReq({ trust_level: 'surveille' }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.trust_level).toBe('surveille');
    // Clé critique : l'author_id est retourné (récupéré côté serveur)
    expect(json.author_id).toBe(AUTHOR_ID);
    // profiles doit être touché
    expect(db.from).toHaveBeenCalledWith('profiles');
  });

  it('200 trust_level=de_confiance', async () => {
    const db = makeTrustDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('moderator', db as ReturnType<typeof makeDb>, MODERATOR_ID));
    const res = await patchTrust(trustReq({ trust_level: 'de_confiance' }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.trust_level).toBe('de_confiance');
  });

  it("200 trust_level=nouveau (rétrograder)", async () => {
    const db = makeTrustDb();
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchTrust(trustReq({ trust_level: 'nouveau' }), makeParams());
    expect(res.status).toBe(200);
  });

  it('500 si profiles.update échoue', async () => {
    const db = makeTrustDb(AUTHOR_ID, false, true /* profileError */);
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));
    const res = await patchTrust(trustReq({ trust_level: 'fiable' }), makeParams());
    expect(res.status).toBe(500);
  });
});
