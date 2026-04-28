/**
 * src/app/api/test-sentry/__tests__/test-sentry-auth.test.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests de contrôle d'accès pour GET /api/test-sentry.
 *
 * Ce que ces tests vérifient :
 *
 *   Principe fail-closed — l'état sûr est le refus :
 *     [TS-01] development     → toujours autorisé (sans token)
 *     [TS-02] production      → 403 sans SENTRY_TEST_ENABLED=true
 *     [TS-03] production      → 403 si SENTRY_TEST_ENABLED=true mais SENTRY_TEST_TOKEN absent
 *     [TS-04] production      → 403 si token fourni ≠ token attendu
 *     [TS-05] production      → 200 si SENTRY_TEST_ENABLED=true + bon token
 *     [TS-06] preview/staging → 403 sans SENTRY_TEST_TOKEN configuré (fail-closed)
 *     [TS-07] preview/staging → 403 si SENTRY_TEST_TOKEN configuré mais header absent
 *     [TS-08] preview/staging → 403 si header incorrect
 *     [TS-09] preview/staging → 200 si bon token dans le header
 *
 *   Comportement de la route :
 *     [TS-10] scénario ping   → sent=false (ne déclenche pas d'erreur Sentry)
 *     [TS-11] scénario inconnu → 400 avec liste des scénarios disponibles
 *     [TS-12] POST             → 405 avec liste des scénarios
 *     [TS-13] réponse          → contient testId, scenario, environment, dsnConfigured
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Sentry SDK — on ne veut pas envoyer de vrais événements pendant les tests
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(() => 'mock-event-id'),
  withScope:        vi.fn((cb: (s: object) => void) => {
    cb({ setTag: vi.fn(), setTags: vi.fn(), setExtras: vi.fn() });
    return 'mock-event-id';
  }),
}));

// Helpers de monitoring internes
vi.mock('@/lib/monitoring/sentry', () => ({
  captureApiError:  vi.fn(),
  captureAuthError: vi.fn(),
  captureError:     vi.fn(),
  addBreadcrumb:    vi.fn(),
}));

// ── Import du handler (après les mocks) ───────────────────────────────────────

import { GET, POST } from '../route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_TOKEN = 'super-secret-hex-token-32chars-ok';

/** Construit un NextRequest minimal avec les paramètres de test. */
function makeReq(
  scenario = 'ping',
  headers: Record<string, string> = {},
): NextRequest {
  const url = `https://example.com/api/test-sentry?scenario=${scenario}`;
  return new NextRequest(url, { headers });
}

function withToken(token: string): Record<string, string> {
  return { 'x-sentry-test-token': token };
}

// ── Snapshot de process.env — restauré après chaque test ─────────────────────

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
});

afterEach(() => {
  // Restore — supprimer les clés ajoutées, rétablir les supprimées
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
  vi.clearAllMocks();
});

// ─── Suite principale ─────────────────────────────────────────────────────────

describe('GET /api/test-sentry — contrôle d\'accès (isAuthorized)', () => {

  // ── [TS-01] Développement : accès libre ──────────────────────────────────

  it('[TS-01] development → autorisé sans token', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    delete process.env.SENTRY_TEST_ENABLED;
    delete process.env.SENTRY_TEST_TOKEN;

    const res = await GET(makeReq('ping'));
    expect(res.status).toBe(200);
  });

  // ── [TS-02] Production sans opt-in : 403 ─────────────────────────────────

  it('[TS-02] production sans SENTRY_TEST_ENABLED → 403', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    delete process.env.SENTRY_TEST_ENABLED;
    delete process.env.SENTRY_TEST_TOKEN;

    const res = await GET(makeReq('ping'));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/désactivée en production/i);
  });

  // ── [TS-03] Production opt-in mais sans token configuré : 403 ────────────

  it('[TS-03] production + SENTRY_TEST_ENABLED=true mais SENTRY_TEST_TOKEN absent → 403', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.SENTRY_TEST_ENABLED = 'true';
    delete process.env.SENTRY_TEST_TOKEN;

    const res = await GET(makeReq('ping'));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/SENTRY_TEST_TOKEN non configuré/i);
  });

  // ── [TS-04] Production, bon opt-in, mauvais token : 403 ──────────────────

  it('[TS-04] production + SENTRY_TEST_ENABLED=true + mauvais token → 403', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.SENTRY_TEST_ENABLED = 'true';
    process.env.SENTRY_TEST_TOKEN = VALID_TOKEN;

    const res = await GET(makeReq('ping', withToken('wrong-token')));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/token.*invalide|invalide.*token/i);
  });

  // ── [TS-05] Production, opt-in complet, bon token : 200 ──────────────────

  it('[TS-05] production + SENTRY_TEST_ENABLED=true + bon token → 200', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.SENTRY_TEST_ENABLED = 'true';
    process.env.SENTRY_TEST_TOKEN = VALID_TOKEN;

    const res = await GET(makeReq('ping', withToken(VALID_TOKEN)));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  // ── [TS-06] Preview sans token configuré : fail-closed → 403 ────────────

  it('[TS-06] preview (non-production) sans SENTRY_TEST_TOKEN configuré → 403 (fail-closed)', async () => {
    // Simuler un environnement preview Vercel : NODE_ENV = 'production'
    // mais SENTRY_TEST_ENABLED non défini — la logique preview correspond
    // à NODE_ENV non-production (ex: test ou undefined sur certains hosts).
    // On simule ici en forçant le chemin "ni dev ni prod bloqué" via
    // un NODE_ENV fictif non reconnu comme 'production'.
    (process.env as Record<string, string>).NODE_ENV = 'staging' as 'production';
    delete process.env.SENTRY_TEST_ENABLED;
    delete process.env.SENTRY_TEST_TOKEN;

    const res = await GET(makeReq('ping'));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/SENTRY_TEST_TOKEN non configuré/i);
  });

  // ── [TS-07] Preview avec token configuré mais header absent : 403 ────────

  it('[TS-07] preview + SENTRY_TEST_TOKEN configuré + header absent → 403', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'staging' as 'production';
    delete process.env.SENTRY_TEST_ENABLED;
    process.env.SENTRY_TEST_TOKEN = VALID_TOKEN;

    const res = await GET(makeReq('ping')); // pas de header token
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/token.*invalide|invalide.*token/i);
  });

  // ── [TS-08] Preview, token configuré, mauvais header : 403 ───────────────

  it('[TS-08] preview + SENTRY_TEST_TOKEN configuré + mauvais header → 403', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'staging' as 'production';
    delete process.env.SENTRY_TEST_ENABLED;
    process.env.SENTRY_TEST_TOKEN = VALID_TOKEN;

    const res = await GET(makeReq('ping', withToken('not-the-right-token')));
    expect(res.status).toBe(403);
  });

  // ── [TS-09] Preview, token configuré, bon header : 200 ───────────────────

  it('[TS-09] preview + SENTRY_TEST_TOKEN configuré + bon header → 200', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'staging' as 'production';
    delete process.env.SENTRY_TEST_ENABLED;
    process.env.SENTRY_TEST_TOKEN = VALID_TOKEN;

    const res = await GET(makeReq('ping', withToken(VALID_TOKEN)));
    expect(res.status).toBe(200);
  });
});

// ─── Comportement de la route ─────────────────────────────────────────────────

describe('GET /api/test-sentry — comportement (scénarios)', () => {

  // Toujours en développement pour ces tests : on ne teste pas l'auth ici
  beforeEach(() => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    delete process.env.SENTRY_TEST_ENABLED;
    delete process.env.SENTRY_TEST_TOKEN;
  });

  // ── [TS-10] Ping ne déclenche pas d'événement Sentry ─────────────────────

  it('[TS-10] scenario=ping → sent=false (aucun événement Sentry)', async () => {
    const res = await GET(makeReq('ping'));
    expect(res.status).toBe(200);
    const body = await res.json() as { sentryEventSent: boolean; scenario: string };
    expect(body.sentryEventSent).toBe(false);
    expect(body.scenario).toBe('ping');
  });

  // ── [TS-11] Scénario inconnu → 400 ───────────────────────────────────────

  it('[TS-11] scénario inconnu → 400 avec liste des scénarios', async () => {
    const res = await GET(makeReq('not_a_real_scenario'));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; available: string[] };
    expect(body.error).toMatch(/scénario inconnu/i);
    expect(Array.isArray(body.available)).toBe(true);
    expect(body.available.length).toBeGreaterThan(0);
  });

  // ── [TS-12] POST → 405 ───────────────────────────────────────────────────

  it('[TS-12] POST → 405 avec liste des scénarios disponibles', async () => {
    const res = await POST();
    expect(res.status).toBe(405);
    const body = await res.json() as { scenarios: { name: string }[] };
    expect(Array.isArray(body.scenarios)).toBe(true);
    expect(body.scenarios.length).toBeGreaterThan(0);
    expect(body.scenarios[0]).toHaveProperty('name');
    expect(body.scenarios[0]).toHaveProperty('description');
    expect(body.scenarios[0]).toHaveProperty('url');
  });

  // ── [TS-13] Structure de la réponse 200 ──────────────────────────────────

  it('[TS-13] réponse 200 contient les champs de contrôle attendus', async () => {
    const res = await GET(makeReq('ping'));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    expect(body).toHaveProperty('ok', true);
    expect(body).toHaveProperty('testId');
    expect(typeof body.testId).toBe('string');
    expect((body.testId as string).length).toBeGreaterThan(0);

    expect(body).toHaveProperty('scenario', 'ping');
    expect(body).toHaveProperty('environment');
    expect(body).toHaveProperty('dsnConfigured');
    expect(body).toHaveProperty('sentryEventSent');
    expect(body).toHaveProperty('checklist');
    expect(body).toHaveProperty('nextSteps');
    expect(Array.isArray(body.nextSteps)).toBe(true);
  });

  // ── [TS-14] server_error → sent=true avec eventId ────────────────────────

  it('[TS-14] scenario=server_error → sent=true, eventId présent', async () => {
    const res = await GET(makeReq('server_error'));
    expect(res.status).toBe(200);
    const body = await res.json() as { sentryEventSent: boolean; eventId: string | null };
    expect(body.sentryEventSent).toBe(true);
    expect(body.eventId).not.toBeNull();
  });
});
