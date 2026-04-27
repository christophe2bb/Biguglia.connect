/**
 * Tests d'intégration — GET/PATCH/POST/DELETE /api/messages/conversation/[id]
 * + Tests unitaires des helpers purs (_helpers.ts)
 *
 * Couverture ciblée :
 *  GET
 *    – Auth : 401 (non authentifié), 403 (non participant), 500 (erreur DB verify)
 *    – Shape de la réponse : tous les champs ConversationApiResponse
 *    – display_name : full_name → partie locale email → fallback "Utilisateur"
 *    – Cas limites display_name : full_name vide, email sans partie locale, valeur null
 *    – other_user_id : résolu côté serveur, null si seul participant
 *    – avatar_url transmis tel quel dans les profils
 *    – Fallback profil : fetch direct si other absent, conv retournée si fallback null
 *    – Dégradation messages : messages=[] + messages_fetch_error, null si ok
 *    – participantsError : userId toujours dans participants, USER_B absent
 *    – Erreur profils DB : conv retournée avec profiles=[]
 *    – Shape des messages : chaque champ attendu présent
 *    – Shape de conversation : tous les champs CONVERSATION_SELECT présents
 *    – myParticipation : last_read_at peut être null
 *  PATCH
 *    – Auth 401
 *    – Corps non-JSON → 400
 *    – Validation Zod : action inconnue, lastReadAt invalide, exchangeStatus invalide
 *    – zodError renvoie un objet { error, details }
 *    – mark_read : ISO valide → 200 ok:true, sans lastReadAt → 200, erreur DB → 500
 *    – update_exchange_status : pending_confirmation → 200, done → 200
 *    – update_exchange_status : non-participant → 403, erreur DB verify → 500, erreur DB update → 500
 *  POST
 *    – Auth 401
 *    – Corps non-JSON → 400
 *    – Validation : content vide, content trop long (10001), contenu maximal (10000 ok)
 *    – Non-participant → 403, erreur DB verify → 500
 *    – Erreur DB insert → 500
 *    – Succès : shape complète du message retourné
 *  DELETE
 *    – messageId absent → 400
 *    – Auth 401
 *    – Message introuvable → 404
 *    – Auteur différent → 403
 *    – Erreur DB delete → 500
 *    – Succès auteur → 200 ok:true
 *  Helpers purs (_helpers.ts)
 *    computeDisplayName
 *    getParticipantIds
 *    sendNewMessageNotifications
 *
 * Architecture :
 *  – createAdminClient et getUserIdBearerFirst entièrement mockés
 *  – Supabase chainable simulé table par table via buildAdminMock()
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, POST, DELETE } from './route';
import {
  computeDisplayName,
  getParticipantIds,
  sendNewMessageNotifications,
} from './_helpers';

// ─── Mocks modules ────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserIdBearerFirst: vi.fn(),
  // assertCsrfSafe : retourne null par défaut (requête safe)
  assertCsrfSafe: vi.fn().mockReturnValue(null),
}));

import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';

const mockGetUserId       = getUserIdBearerFirst as MockedFunction<typeof getUserIdBearerFirst>;
const mockCreateAdmin     = createAdminClient as MockedFunction<typeof createAdminClient>;
const mockAssertCsrfSafe  = assertCsrfSafe as MockedFunction<typeof assertCsrfSafe>;

/** Réponse 403 CSRF prête à retourner dans les tests de rejet cross-site */
function makeCsrf403(): Response {
  return new Response(
    JSON.stringify({ error: 'Requête refusée : en-tête Origin manquant (protection CSRF).' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONV_ID = 'conv-aaa-111';
const USER_A  = 'user-aaa-000';
const USER_B  = 'user-bbb-000';
const MSG_ID  = 'msg-ccc-111';

const PARTICIPATION = {
  user_id:      USER_A,
  last_read_at: '2024-01-01T10:00:00Z',
  joined_at:    '2024-01-01T09:00:00Z',
};

const CONVERSATION = {
  id:                    CONV_ID,
  subject:               'Test conv',
  related_type:          'listing',
  related_id:            'listing-111',
  exchange_status:       null,
  exchange_confirmed_by: null,
  exchange_confirmed_at: null,
  owner_id:              USER_A,
  created_by:            USER_A,
  updated_at:            '2024-01-01T10:00:00Z',
};

const MESSAGES = [
  {
    id:              MSG_ID,
    conversation_id: CONV_ID,
    sender_id:       USER_B,
    content:         'Hello',
    created_at:      '2024-01-01T10:01:00Z',
  },
];

// ─── Types internes du mock ───────────────────────────────────────────────────

interface ProfileRow {
  id:         string;
  full_name:  string | null;
  avatar_url: string | null;
  email:      string | null;
}

type ParticipationRow = Omit<typeof PARTICIPATION, 'last_read_at'> & { last_read_at: string | null };

interface AdminMockOptions {
  participationRow?:    ParticipationRow | null;
  participationError?:  { message: string } | null;
  participantRows?:     Array<{ user_id: string }>;
  participantsError?:   { message: string } | null;
  conversation?:        typeof CONVERSATION | null;
  convError?:           { message: string } | null;
  messages?:            typeof MESSAGES;
  messagesError?:       { message: string } | null;
  profiles?:            ProfileRow[];
  profileError?:        { message: string } | null;
  fallbackProfile?:     ProfileRow | null;
  patchError?:          { message: string } | null;
  insertMsgResult?:     { data: unknown; error: unknown };
  deleteError?:         { message: string } | null;
  msgForDelete?:        { id: string; sender_id: string; conversation_id: string } | null;
  notifError?:          { message: string } | null;
}

// ─── Builder de mock admin ────────────────────────────────────────────────────

/**
 * Construit un mock d'admin client Supabase simulant les requêtes chaînées.
 *
 * conversation_participants est appelée jusqu'à 3 fois selon le handler :
 *   GET  : appel 1 = verifyParticipant (maybeSingle), appel 2 = bulk participants
 *   PATCH mark_read : appel 1 = update
 *   PATCH exchange  : appel 1 = verifyParticipant
 *   POST            : appel 1 = verifyParticipant, appel 2 = sendNotif (neq)
 */
function buildAdminMock(opts: AdminMockOptions = {}) {
  const {
    participationRow   = PARTICIPATION,
    participationError = null,
    participantRows    = [{ user_id: USER_A }, { user_id: USER_B }],
    participantsError  = null,
    conversation       = CONVERSATION,
    convError          = null,
    messages           = MESSAGES,
    messagesError      = null,
    profiles           = [
      { id: USER_A, full_name: 'Alice', avatar_url: null,        email: 'alice@example.com' },
      { id: USER_B, full_name: null,    avatar_url: 'http://b.jpg', email: 'bob@example.com' },
    ],
    profileError       = null,
    fallbackProfile    = null,
    patchError         = null,
    insertMsgResult    = {
      data:  { id: MSG_ID, conversation_id: CONV_ID, sender_id: USER_A, content: 'Hi', created_at: '2024-01-01T11:00:00Z' },
      error: null,
    },
    deleteError        = null,
    msgForDelete       = { id: MSG_ID, sender_id: USER_A, conversation_id: CONV_ID },
    notifError         = null,
  } = opts;

  const fromMock = vi.fn().mockImplementation((table: string) => {
    // ── conversation_participants ─────────────────────────────────────────
    if (table === 'conversation_participants') {
      /**
       * Le mock doit distinguer trois usages de cette table :
       *  A) verifyParticipant  — .select().eq().eq().maybeSingle()
       *  B) mark_read update  — .update().eq().eq()  (then direct)
       *  C) bulk participants — .select().eq()       (then direct, GET appel 2)
       *  D) sendNotif neq     — .select().eq().neq() (then direct)
       *
       * On inspecte si .update() a été appelé sur la chaîne pour distinguer B de A/C/D.
       */
      let isUpdate = false;
      let isVerify = false; // devient true dès qu'on appelle .maybeSingle()

      const chain: Record<string, unknown> = {};

      chain['update'] = () => {
        isUpdate = true;
        return chain;
      };
      ['select', 'eq', 'neq'].forEach(m => { chain[m] = () => chain; });

      chain['maybeSingle'] = () => {
        isVerify = true;
        return Promise.resolve({
          data:  participationError ? null : participationRow,
          error: participationError,
        });
      };

      chain['then'] = (cb: (v: unknown) => void) => {
        if (isUpdate) {
          // mark_read update — on expose patchError si défini
          cb({ data: null, error: patchError ?? null });
        } else if (!isVerify) {
          // bulk participants (GET) ou sendNotif neq
          cb({ data: participantsError ? null : participantRows, error: participantsError ?? null });
        } else {
          // verifyParticipant résolu via maybeSingle() : then ne devrait pas être appelé ici
          cb({ data: participationError ? null : participationRow, error: participationError });
        }
        return chain; // permet un chaînage éventuel
      };

      return chain;
    }

    // ── conversations ─────────────────────────────────────────────────────
    if (table === 'conversations') {
      const chain: Record<string, unknown> = {};
      ['select', 'eq', 'update'].forEach(m => { chain[m] = () => chain; });
      chain['single'] = () => Promise.resolve({
        data:  convError ? null : conversation,
        error: convError,
      });
      chain['then'] = (cb: (v: unknown) => void) =>
        cb({ data: conversation, error: null });
      return chain;
    }

    // ── messages ──────────────────────────────────────────────────────────
    if (table === 'messages') {
      const chain: Record<string, unknown> = {};
      ['select', 'eq', 'order', 'delete', 'insert'].forEach(m => { chain[m] = () => chain; });
      chain['maybeSingle'] = () => Promise.resolve({ data: msgForDelete, error: null });
      chain['single']      = () => Promise.resolve(insertMsgResult);
      chain['then']        = (cb: (v: unknown) => void) => {
        if (deleteError) {
          cb({ data: null, error: deleteError });
        } else {
          cb({ data: messagesError ? null : messages, error: messagesError });
        }
      };
      return chain;
    }

    // ── profiles ──────────────────────────────────────────────────────────
    if (table === 'profiles') {
      const chain: Record<string, unknown> = {};
      ['select', 'eq', 'in'].forEach(m => { chain[m] = () => chain; });
      chain['maybeSingle'] = () => Promise.resolve({ data: fallbackProfile, error: null });
      chain['then']        = (cb: (v: unknown) => void) =>
        cb({ data: profileError ? null : profiles, error: profileError });
      return chain;
    }

    // ── notifications ─────────────────────────────────────────────────────
    if (table === 'notifications') {
      const chain: Record<string, unknown> = {};
      ['insert'].forEach(m => { chain[m] = () => chain; });
      chain['then'] = (cb: (v: unknown) => void) =>
        cb({ data: null, error: notifError ?? null });
      return chain;
    }

    // ── table générique ───────────────────────────────────────────────────
    const generic: Record<string, unknown> = {};
    ['select', 'eq', 'delete', 'insert'].forEach(m => { generic[m] = () => generic; });
    generic['maybeSingle'] = () => Promise.resolve({ data: null, error: null });
    generic['then']        = (cb: (v: unknown) => void) => cb({ data: null, error: null });
    return generic;
  });

  return { from: fromMock };
}

// ─── Factories de requêtes ────────────────────────────────────────────────────

const AUTH_HEADERS = { Authorization: 'Bearer tok-test' };
const JSON_HEADERS = { 'Content-Type': 'application/json', ...AUTH_HEADERS };

function makeGetReq(convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/messages/conversation/${convId}`,
    { method: 'GET', headers: AUTH_HEADERS },
  );
}

function makePatchReq(body: unknown, convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/messages/conversation/${convId}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
  );
}

function makeRawPatchReq(raw: string, convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/messages/conversation/${convId}`,
    { method: 'PATCH', headers: AUTH_HEADERS, body: raw },
  );
}

function makePostReq(body: unknown, convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/messages/conversation/${convId}`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
  );
}

function makeRawPostReq(raw: string, convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/messages/conversation/${convId}`,
    { method: 'POST', headers: AUTH_HEADERS, body: raw },
  );
}

function makeDeleteReq(msgId: string, convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/messages/conversation/${convId}?messageId=${msgId}`,
    { method: 'DELETE', headers: AUTH_HEADERS },
  );
}

const routeParams = (convId = CONV_ID) => ({ params: Promise.resolve({ id: convId }) });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _adminMock(opts?: AdminMockOptions) {
  return buildAdminMock(opts) as unknown as ReturnType<typeof createAdminClient>;
}

// =============================================================================
// GET
// =============================================================================

describe('GET /api/messages/conversation/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockResolvedValue(USER_A);
    mockCreateAdmin.mockReturnValue(buildAdminMock() as unknown as ReturnType<typeof createAdminClient>);
  });

  // ── Authentification ──────────────────────────────────────────────────────

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Non authentifi/);
  });

  it('retourne 403 si l\'utilisateur n\'est pas participant', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participationRow: null }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Acc[eè]s refus/);
  });

  it('retourne 500 si la vérification de participation échoue côté DB', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participationError: { message: 'db connection reset' } }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('db connection reset');
  });

  // ── Shape de la réponse ───────────────────────────────────────────────────

  it('retourne 200 avec tous les champs ConversationApiResponse', async () => {
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('conversation');
    expect(body).toHaveProperty('participants');
    expect(body).toHaveProperty('profiles');
    expect(body).toHaveProperty('other_user_id');
    expect(body).toHaveProperty('messages');
    expect(body).toHaveProperty('myParticipation');
    expect(body).toHaveProperty('messages_fetch_error');
  });

  it('conversation contient tous les champs sélectionnés', async () => {
    const res = await GET(makeGetReq(), routeParams());
    const { conversation } = await res.json();
    expect(conversation).toMatchObject({
      id:                    CONV_ID,
      subject:               'Test conv',
      related_type:          'listing',
      exchange_status:       null,
      exchange_confirmed_by: null,
      exchange_confirmed_at: null,
      owner_id:              USER_A,
      created_by:            USER_A,
    });
    expect(conversation).toHaveProperty('updated_at');
  });

  it('myParticipation contient user_id, last_read_at et joined_at', async () => {
    const res = await GET(makeGetReq(), routeParams());
    const { myParticipation } = await res.json();
    expect(myParticipation.user_id).toBe(USER_A);
    expect(myParticipation).toHaveProperty('last_read_at');
    expect(myParticipation).toHaveProperty('joined_at');
  });

  it('myParticipation.last_read_at peut être null', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      participationRow: { user_id: USER_A, last_read_at: null, joined_at: '2024-01-01T09:00:00Z' },
    }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await GET(makeGetReq(), routeParams());
    const { myParticipation } = await res.json();
    expect(myParticipation.last_read_at).toBeNull();
  });

  it('messages contient les bons champs et est un tableau', async () => {
    const res = await GET(makeGetReq(), routeParams());
    const { messages } = await res.json();
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(1);
    const msg = messages[0];
    expect(msg).toMatchObject({
      id:              MSG_ID,
      conversation_id: CONV_ID,
      sender_id:       USER_B,
      content:         'Hello',
    });
    expect(msg).toHaveProperty('created_at');
  });

  // ── display_name calculé serveur ──────────────────────────────────────────

  it('calcule display_name depuis full_name quand disponible', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles: [
        { id: USER_A, full_name: 'Alice Martin', avatar_url: null, email: 'alice@example.com' },
        { id: USER_B, full_name: 'Bob Dupont',   avatar_url: null, email: 'bob@example.com'   },
      ],
    }) as unknown as ReturnType<typeof createAdminClient>);
    const { profiles } = await (await GET(makeGetReq(), routeParams())).json();
    const alice = profiles.find((p: { id: string }) => p.id === USER_A);
    const bob   = profiles.find((p: { id: string }) => p.id === USER_B);
    expect(alice?.display_name).toBe('Alice Martin');
    expect(bob?.display_name).toBe('Bob Dupont');
  });

  it('calcule display_name depuis la partie locale de l\'email quand full_name est null/vide', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles: [
        { id: USER_A, full_name: null, avatar_url: null, email: 'alice.dupont@example.com' },
        { id: USER_B, full_name: '',   avatar_url: null, email: 'bob123@example.com'       },
      ],
    }) as unknown as ReturnType<typeof createAdminClient>);
    const { profiles } = await (await GET(makeGetReq(), routeParams())).json();
    expect(profiles.find((p: { id: string }) => p.id === USER_A)?.display_name).toBe('alice.dupont');
    expect(profiles.find((p: { id: string }) => p.id === USER_B)?.display_name).toBe('bob123');
  });

  it('utilise le fallback "Utilisateur" quand full_name et email sont tous les deux null', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles: [
        { id: USER_A, full_name: null, avatar_url: null, email: null },
        { id: USER_B, full_name: null, avatar_url: null, email: null },
      ],
    }) as unknown as ReturnType<typeof createAdminClient>);
    const { profiles } = await (await GET(makeGetReq(), routeParams())).json();
    profiles.forEach((p: { display_name: string }) => {
      expect(p.display_name).toBe('Utilisateur');
    });
  });

  it('display_name n\'est jamais null ou vide', async () => {
    const { profiles } = await (await GET(makeGetReq(), routeParams())).json();
    for (const p of profiles) {
      expect(p.display_name).toBeTruthy();
      expect(typeof p.display_name).toBe('string');
    }
  });

  it('avatar_url est transmis tel quel (null ou string)', async () => {
    const { profiles } = await (await GET(makeGetReq(), routeParams())).json();
    const alice = profiles.find((p: { id: string }) => p.id === USER_A);
    const bob   = profiles.find((p: { id: string }) => p.id === USER_B);
    // alice : avatar null dans le mock par défaut
    expect(alice?.avatar_url).toBeNull();
    // bob : avatar 'http://b.jpg' dans le mock par défaut
    expect(bob?.avatar_url).toBe('http://b.jpg');
  });

  // ── other_user_id ─────────────────────────────────────────────────────────

  it('retourne other_user_id = UUID de l\'autre participant', async () => {
    const { other_user_id } = await (await GET(makeGetReq(), routeParams())).json();
    expect(other_user_id).toBe(USER_B);
  });

  it('retourne other_user_id = null si seul l\'utilisateur courant est participant', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participantRows: [{ user_id: USER_A }] }) as unknown as ReturnType<typeof createAdminClient>);
    const { other_user_id } = await (await GET(makeGetReq(), routeParams())).json();
    expect(other_user_id).toBeNull();
  });

  // ── Fallback profil manquant ──────────────────────────────────────────────

  it('effectue un fallback fetch si le profil de l\'autre participant est absent', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles:        [{ id: USER_A, full_name: 'Alice', avatar_url: null, email: 'alice@example.com' }],
      fallbackProfile: { id: USER_B, full_name: 'Bob Fallback', avatar_url: null, email: 'bob@example.com' },
    }) as unknown as ReturnType<typeof createAdminClient>);
    const { profiles } = await (await GET(makeGetReq(), routeParams())).json();
    const bob = profiles.find((p: { id: string }) => p.id === USER_B);
    expect(bob).toBeDefined();
    expect(bob?.display_name).toBe('Bob Fallback');
  });

  it('retourne la conv même si le profil fallback est null (profil manquant toléré)', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles:        [{ id: USER_A, full_name: 'Alice', avatar_url: null, email: 'alice@example.com' }],
      fallbackProfile: null,
    }) as unknown as ReturnType<typeof createAdminClient>);
    const res  = await GET(makeGetReq(), routeParams());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.conversation.id).toBe(CONV_ID);
  });

  // ── Erreur profils DB ─────────────────────────────────────────────────────

  it('retourne la conv avec profiles=[] si la requête profils échoue', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ profileError: { message: 'profiles unavailable' } }) as unknown as ReturnType<typeof createAdminClient>);
    const res  = await GET(makeGetReq(), routeParams());
    const body = await res.json();
    expect(res.status).toBe(200);
    // Pas de profil chargé mais la conversation est retournée
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.conversation.id).toBe(CONV_ID);
  });

  // ── Dégradation gracieuse messages ────────────────────────────────────────

  it('retourne messages=[] et messages_fetch_error si la requête messages échoue', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      messages:      [],
      messagesError: { message: 'relation messages does not exist' },
    }) as unknown as ReturnType<typeof createAdminClient>);
    const res  = await GET(makeGetReq(), routeParams());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.messages).toEqual([]);
    expect(body.messages_fetch_error).toBe('relation messages does not exist');
  });

  it('messages_fetch_error est null quand le chargement réussit', async () => {
    const body = await (await GET(makeGetReq(), routeParams())).json();
    expect(body.messages_fetch_error).toBeNull();
  });

  it('retourne 500 si la requête conversations échoue', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ convError: { message: 'table locked' } }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('table locked');
  });

  // ── Isolation participants ────────────────────────────────────────────────

  it('userId courant est toujours inclus dans participants même si participantsError', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participantsError: { message: 'RLS recursion' } }) as unknown as ReturnType<typeof createAdminClient>);
    const { participants } = await (await GET(makeGetReq(), routeParams())).json();
    expect(participants).toContain(USER_A);
  });

  it('USER_B absent de participants si participantsError (DB a échoué)', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participantsError: { message: 'RLS recursion' } }) as unknown as ReturnType<typeof createAdminClient>);
    const { participants } = await (await GET(makeGetReq(), routeParams())).json();
    expect(participants).not.toContain(USER_B);
  });
});

// =============================================================================
// PATCH
// =============================================================================

describe('PATCH /api/messages/conversation/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockResolvedValue(USER_A);
    mockAssertCsrfSafe.mockReturnValue(null); // safe par défaut
    mockCreateAdmin.mockReturnValue(buildAdminMock() as unknown as ReturnType<typeof createAdminClient>);
  });

  // ── CSRF ──────────────────────────────────────────────────────────────────

  it('🔒 CSRF : retourne 403 si assertCsrfSafe rejette la requête cross-site', async () => {
    mockAssertCsrfSafe.mockReturnValueOnce(makeCsrf403() as never);
    const res = await PATCH(makePatchReq({ action: 'mark_read' }), routeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('CSRF');
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await PATCH(makePatchReq({ action: 'mark_read' }), routeParams());
    expect(res.status).toBe(401);
  });

  // ── Validation corps ──────────────────────────────────────────────────────

  it('retourne 400 si le corps n\'est pas du JSON valide', async () => {
    const res = await PATCH(makeRawPatchReq('not-json'), routeParams());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Corps invalide/);
  });

  it('retourne 400 avec un champ details si action est invalide', async () => {
    const res = await PATCH(makePatchReq({ action: 'unknown_action' }), routeParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
  });

  it('retourne 400 si lastReadAt n\'est pas un datetime ISO offset', async () => {
    const res = await PATCH(makePatchReq({ action: 'mark_read', lastReadAt: 'not-a-date' }), routeParams());
    expect(res.status).toBe(400);
  });

  it('retourne 400 si exchangeStatus est invalide', async () => {
    const res = await PATCH(makePatchReq({ action: 'update_exchange_status', exchangeStatus: 'bad_value' }), routeParams());
    expect(res.status).toBe(400);
  });

  // ── mark_read ─────────────────────────────────────────────────────────────

  it('mark_read avec lastReadAt ISO valide → 200 { ok: true }', async () => {
    const res  = await PATCH(makePatchReq({ action: 'mark_read', lastReadAt: '2024-01-01T10:00:00.000Z' }), routeParams());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('mark_read sans lastReadAt utilise now() → 200', async () => {
    const res = await PATCH(makePatchReq({ action: 'mark_read' }), routeParams());
    expect(res.status).toBe(200);
  });

  it('mark_read → 500 si le update DB échoue', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ patchError: { message: 'update failed' } }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await PATCH(makePatchReq({ action: 'mark_read' }), routeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('update failed');
  });

  // ── update_exchange_status ────────────────────────────────────────────────

  it('update_exchange_status → done retourne 200 { ok: true }', async () => {
    const res  = await PATCH(makePatchReq({ action: 'update_exchange_status', exchangeStatus: 'done' }), routeParams());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('update_exchange_status → pending_confirmation retourne 200 { ok: true }', async () => {
    const res  = await PATCH(makePatchReq({ action: 'update_exchange_status', exchangeStatus: 'pending_confirmation' }), routeParams());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('update_exchange_status → 403 si l\'utilisateur n\'est pas participant', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participationRow: null }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await PATCH(makePatchReq({ action: 'update_exchange_status', exchangeStatus: 'done' }), routeParams());
    expect(res.status).toBe(403);
  });

  it('update_exchange_status → 500 si verifyParticipant lève une erreur DB', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participationError: { message: 'connection lost' } }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await PATCH(makePatchReq({ action: 'update_exchange_status', exchangeStatus: 'done' }), routeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('connection lost');
  });

  it('update_exchange_status → 500 si le update conversations échoue', async () => {
    // On simule une erreur sur la mise à jour de la conversation.
    // La participation est valide, mais le update conversations retourne une erreur.
    const adminWithConvUpdateError = buildAdminMock();
    // On surcharge from() : conversations.update().eq() doit retourner une erreur
    const originalFrom = adminWithConvUpdateError.from;
    adminWithConvUpdateError.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'conversations') {
        const chain: Record<string, unknown> = {};
        ['select', 'eq', 'update'].forEach(m => { chain[m] = () => chain; });
        chain['single'] = () => Promise.resolve({ data: CONVERSATION, error: null });
        chain['then']   = (cb: (v: unknown) => void) =>
          cb({ data: null, error: { message: 'conversations update error' } });
        return chain;
      }
      return originalFrom(table);
    });
    mockCreateAdmin.mockReturnValue(adminWithConvUpdateError as unknown as ReturnType<typeof createAdminClient>);
    const res = await PATCH(makePatchReq({ action: 'update_exchange_status', exchangeStatus: 'done' }), routeParams());
    expect(res.status).toBe(500);
  });
});

// =============================================================================
// POST
// =============================================================================

describe('POST /api/messages/conversation/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockResolvedValue(USER_A);
    mockAssertCsrfSafe.mockReturnValue(null); // safe par défaut
    mockCreateAdmin.mockReturnValue(buildAdminMock() as unknown as ReturnType<typeof createAdminClient>);
  });

  // ── CSRF ──────────────────────────────────────────────────────────────────

  it('🔒 CSRF : retourne 403 si assertCsrfSafe rejette la requête cross-site', async () => {
    mockAssertCsrfSafe.mockReturnValueOnce(makeCsrf403() as never);
    const res = await POST(makePostReq({ content: 'Test message' }), routeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('CSRF');
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await POST(makePostReq({ content: 'Hi' }), routeParams());
    expect(res.status).toBe(401);
  });

  // ── Validation corps ──────────────────────────────────────────────────────

  it('retourne 400 si le corps n\'est pas du JSON valide', async () => {
    const res = await POST(makeRawPostReq('not-json'), routeParams());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Corps invalide/);
  });

  it('retourne 400 si content est vide ou uniquement des espaces', async () => {
    const res = await POST(makePostReq({ content: '   ' }), routeParams());
    expect(res.status).toBe(400);
  });

  it('retourne 400 si content dépasse 10 000 caractères', async () => {
    const res = await POST(makePostReq({ content: 'a'.repeat(10_001) }), routeParams());
    expect(res.status).toBe(400);
  });

  it('accepte content de exactement 10 000 caractères (limite)', async () => {
    const res = await POST(makePostReq({ content: 'a'.repeat(10_000) }), routeParams());
    expect(res.status).toBe(200);
  });

  // ── Participation ─────────────────────────────────────────────────────────

  it('retourne 403 si l\'utilisateur n\'est pas participant', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participationRow: null }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await POST(makePostReq({ content: 'Bonjour' }), routeParams());
    expect(res.status).toBe(403);
  });

  it('retourne 500 si verifyParticipant lève une erreur DB', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ participationError: { message: 'db down' } }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await POST(makePostReq({ content: 'Bonjour' }), routeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('db down');
  });

  // ── Erreur insert message ─────────────────────────────────────────────────

  it('retourne 500 si l\'insert du message échoue', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      insertMsgResult: { data: null, error: { message: 'insert failed' } },
    }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await POST(makePostReq({ content: 'Bonjour' }), routeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('insert failed');
  });

  // ── Succès ────────────────────────────────────────────────────────────────

  it('retourne 200 avec la shape complète du message inséré', async () => {
    const res  = await POST(makePostReq({ content: 'Bonjour' }), routeParams());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('message');
    expect(body.message).toMatchObject({
      id:              MSG_ID,
      conversation_id: CONV_ID,
      sender_id:       USER_A,
      content:         'Hi',
    });
    expect(body.message).toHaveProperty('created_at');
  });
});

// =============================================================================
// DELETE
// =============================================================================

describe('DELETE /api/messages/conversation/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockResolvedValue(USER_A);
    mockAssertCsrfSafe.mockReturnValue(null); // safe par défaut
    mockCreateAdmin.mockReturnValue(buildAdminMock() as unknown as ReturnType<typeof createAdminClient>);
  });

  // ── CSRF ──────────────────────────────────────────────────────────────────

  it('🔒 CSRF : retourne 403 si assertCsrfSafe rejette la requête cross-site', async () => {
    mockAssertCsrfSafe.mockReturnValueOnce(makeCsrf403() as never);
    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('CSRF');
  });

  it('retourne 400 si messageId est absent de la query string', async () => {
    const req = new NextRequest(
      `http://localhost/api/messages/conversation/${CONV_ID}`,
      { method: 'DELETE', headers: AUTH_HEADERS },
    );
    const res = await DELETE(req, routeParams());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/messageId/);
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(401);
  });

  it('retourne 404 si le message est introuvable', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ msgForDelete: null }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/introuvable/);
  });

  it('retourne 403 si l\'utilisateur n\'est pas l\'auteur', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      msgForDelete: { id: MSG_ID, sender_id: USER_B, conversation_id: CONV_ID },
    }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(403);
  });

  it('retourne 500 si le delete DB échoue', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({ deleteError: { message: 'delete failed' } }) as unknown as ReturnType<typeof createAdminClient>);
    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('delete failed');
  });

  it('retourne 200 { ok: true } quand l\'auteur supprime son message', async () => {
    const res  = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

// =============================================================================
// Helpers purs — computeDisplayName
// =============================================================================

describe('computeDisplayName()', () => {

  it('retourne full_name trimmé quand non vide', () => {
    expect(computeDisplayName('  Alice Martin  ', 'a@b.com')).toBe('Alice Martin');
  });

  it('retourne la partie locale de l\'email quand full_name est null', () => {
    expect(computeDisplayName(null, 'alice.dupont@example.com')).toBe('alice.dupont');
  });

  it('retourne la partie locale de l\'email quand full_name est une chaîne vide', () => {
    expect(computeDisplayName('', 'alice@example.com')).toBe('alice');
  });

  it('retourne la partie locale quand full_name est uniquement des espaces', () => {
    expect(computeDisplayName('   ', 'bob@example.com')).toBe('bob');
  });

  it('retourne le fallback quand full_name et email sont null', () => {
    expect(computeDisplayName(null, null)).toBe('Utilisateur');
  });

  it('retourne le fallback quand full_name null et email vide', () => {
    expect(computeDisplayName(null, '')).toBe('Utilisateur');
  });

  it('retourne le fallback quand l\'email n\'a pas de partie locale (commence par @)', () => {
    // split('@')[0] donne '' → local vide → fallback
    expect(computeDisplayName(null, '@domain.com')).toBe('Utilisateur');
  });

  it('respecte un fallback personnalisé', () => {
    expect(computeDisplayName(null, null, "Quelqu'un")).toBe("Quelqu'un");
  });

  it('full_name prend la priorité sur email', () => {
    expect(computeDisplayName('Charlie', 'charlie@example.com')).toBe('Charlie');
  });
});

// =============================================================================
// Helpers purs — getParticipantIds
// =============================================================================

describe('getParticipantIds()', () => {

  it('retourne [userId] quand participantRows est null', () => {
    expect(getParticipantIds(null, USER_A)).toEqual([USER_A]);
  });

  it('retourne [userId] quand participantRows est vide', () => {
    expect(getParticipantIds([], USER_A)).toEqual([USER_A]);
  });

  it('inclut userId ET les autres participants', () => {
    const ids = getParticipantIds([{ user_id: USER_B }], USER_A);
    expect(ids).toContain(USER_A);
    expect(ids).toContain(USER_B);
  });

  it('déduplique si userId est déjà dans participantRows', () => {
    const ids = getParticipantIds([{ user_id: USER_A }, { user_id: USER_B }], USER_A);
    expect(ids.filter(id => id === USER_A)).toHaveLength(1);
  });

  it('déduplique les doublons dans participantRows', () => {
    const ids = getParticipantIds([{ user_id: USER_B }, { user_id: USER_B }], USER_A);
    expect(ids.filter(id => id === USER_B)).toHaveLength(1);
  });

  it('userId est toujours en première position', () => {
    const ids = getParticipantIds([{ user_id: USER_B }], USER_A);
    expect(ids[0]).toBe(USER_A);
  });
});

// =============================================================================
// Helpers purs — sendNewMessageNotifications
// =============================================================================

describe('sendNewMessageNotifications()', () => {

  function buildNotifAdmin(opts: {
    recipients?: Array<{ user_id: string }>;
    senderProfile?: { full_name: string | null; email: string | null } | null;
    insertFn?: (notifications: unknown[]) => void;
  } = {}) {
    const {
      recipients    = [{ user_id: USER_B }],
      senderProfile = { full_name: 'Alice', email: 'alice@example.com' },
      insertFn      = vi.fn(),
    } = opts;

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'conversation_participants') {
        const chain: Record<string, unknown> = {};
        ['select', 'eq', 'neq'].forEach(m => { chain[m] = () => chain; });
        chain['then'] = (cb: (v: unknown) => void) => cb({ data: recipients, error: null });
        return chain;
      }
      if (table === 'profiles') {
        const chain: Record<string, unknown> = {};
        ['select', 'eq'].forEach(m => { chain[m] = () => chain; });
        chain['maybeSingle'] = () => Promise.resolve({ data: senderProfile, error: null });
        return chain;
      }
      if (table === 'notifications') {
        const chain: Record<string, unknown> = {};
        chain['insert'] = (notifications: unknown[]) => {
          insertFn(notifications);
          return { then: (cb: (v: unknown) => void) => cb({ data: null, error: null }) };
        };
        return chain;
      }
      return { then: (cb: (v: unknown) => void) => cb({ data: null, error: null }) };
    });

    return { from: fromMock } as unknown as ReturnType<typeof createAdminClient>;
  }

  it('n\'envoie pas de notification pour un message système 👋', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ insertFn });
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, '👋 Message système');
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('n\'envoie pas de notification pour un message système ✅', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ insertFn });
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, '✅ Confirmé');
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('n\'envoie pas de notification pour un message système 🤝', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ insertFn });
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, '🤝 Accord');
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('envoie une notification pour un message normal', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ insertFn });
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, 'Bonjour');
    expect(insertFn).toHaveBeenCalledOnce();
    const [notifications] = insertFn.mock.calls[0] as [Array<{ user_id: string; title: string; message: string }>];
    expect(notifications).toHaveLength(1);
    expect(notifications[0].user_id).toBe(USER_B);
    expect(notifications[0].title).toBe('Message de Alice');
    expect(notifications[0].message).toBe('Bonjour');
  });

  it('tronque le contenu à 60 caractères avec … dans la notification', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ insertFn });
    const longMsg = 'a'.repeat(70);
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, longMsg);
    const [notifications] = insertFn.mock.calls[0] as [Array<{ message: string }>];
    expect(notifications[0].message).toBe('a'.repeat(60) + '…');
  });

  it('conserve le message intégralement quand il fait exactement 60 caractères', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ insertFn });
    const msg60 = 'a'.repeat(60);
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, msg60);
    const [notifications] = insertFn.mock.calls[0] as [Array<{ message: string }>];
    expect(notifications[0].message).toBe(msg60);
  });

  it('n\'envoie pas de notification s\'il n\'y a pas d\'autres participants', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ recipients: [], insertFn });
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, 'Bonjour');
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('utilise la partie locale de l\'email comme senderName si full_name null', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({
      senderProfile: { full_name: null, email: 'bob@example.com' },
      insertFn,
    });
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, 'Hello');
    const [notifications] = insertFn.mock.calls[0] as [Array<{ title: string }>];
    expect(notifications[0].title).toBe('Message de bob');
  });

  it('utilise "Quelqu\'un" comme senderName si profil introuvable', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ senderProfile: null, insertFn });
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, 'Hello');
    const [notifications] = insertFn.mock.calls[0] as [Array<{ title: string }>];
    expect(notifications[0].title).toBe("Message de Quelqu'un");
  });

  it('le lien de notification pointe vers /messages/{conversationId}', async () => {
    const insertFn = vi.fn();
    const admin = buildNotifAdmin({ insertFn });
    await sendNewMessageNotifications(admin, CONV_ID, USER_A, 'Hello');
    const [notifications] = insertFn.mock.calls[0] as [Array<{ link: string }>];
    expect(notifications[0].link).toBe(`/messages/${CONV_ID}`);
  });
});
