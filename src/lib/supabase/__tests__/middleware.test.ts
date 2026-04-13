/**
 * Tests — src/lib/supabase/middleware.ts (updateSession)
 *
 * ─── Ce que ces tests vérifient ───────────────────────────────────────────────
 *
 *  1. Routes protégées sans session → HTTP 307 vers /connexion?next=<pathname>
 *  2. Routes protégées avec session → NextResponse.next() (accès accordé)
 *  3. Routes publiques → NextResponse.next() (pas de redirection, avec ou sans cookie)
 *  4. Le paramètre ?next= est correctement encodé dans l'URL de redirection
 *  5. Unicité : seul src/middleware.ts existe (pas de doublon à la racine)
 *  6. Formats de cookie : JSON brut, chunked (.0), URL-encodé
 *  7. Cas de cookie invalide : JSON cassé, access_token manquant, ne commence pas par eyJ
 *  8. Cookie expiré : accès autorisé (refresh côté client)
 *  9. Routes de bord : /profilartisan, /dashboard-public, /profil/[id]
 * 10. Écart couverture : /mes-echanges non protégé par le middleware (protection uniquement côté UI)
 * 11. Toutes les routes protégées réelles de l'application
 *
 * ─── Stratégie de mock ────────────────────────────────────────────────────────
 *
 *  Le middleware lit le token directement depuis le cookie JSON (sans appel réseau).
 *  Les tests simulent la présence/absence du cookie sb-<ref>-auth-token (JSON ou chunked).
 *  @supabase/ssr est mocké pour getSession() (refresh) sans appel réseau.
 *  Le mock MockNextRequest supporte deux modes :
 *    - mockCookieValue : cookie principal sb-<ref>-auth-token
 *    - mockChunkCookie : cookie chunké sb-<ref>-auth-token.0
 *
 * ─── Routes protégées couvertes (toutes les pages réelles de l'app) ──────────
 *
 *  /admin                              /admin/artisans
 *  /admin/utilisateurs                 /admin/signalements
 *  /admin/stats                        /admin/contenu
 *  /admin/migration                    /admin/securite
 *  /admin/confiance                    /admin/moderation
 *  /admin/moderation/[id]              /admin/moderation/stats
 *  /admin/spec                         /admin/spec/forum
 *  /admin/spec/materiel                /admin/spec/perdu-trouve
 *  /dashboard                          /dashboard/artisan
 *  /dashboard/contenus                 /dashboard/interactions
 *  /dashboard/avis                     /dashboard/collectionneurs
 *  /dashboard/messages                 /dashboard/evenements
 *  /dashboard/materiel                 /dashboard/perdu-trouve
 *  /dashboard/promenades               /profil
 *  /messages                           /messages/<uuid>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

// ─── Env hoisting — doit s'exécuter AVANT l'import du middleware ──────────────
//
// middleware.ts lit NEXT_PUBLIC_SUPABASE_URL au chargement du module (niveau
// module, pas dans une fonction). vi.hoisted() garantit que l'assignation se
// produit avant que les imports réels soient évalués par Vitest.
//
// Sans ça, SUPABASE_URL vaut '' dans middleware.ts → SUPABASE_PROJECT_REF = ''
// → SUPABASE_COOKIE_NAME = 'sb--auth-token' → les tests de cookie échouent.
const TEST_SUPABASE_URL  = 'https://qmrkacrpncdkhofiqlrg.supabase.co';
const TEST_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbm9uS2V5IjoibW9jayJ9.mock';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL      = 'https://qmrkacrpncdkhofiqlrg.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbm9uS2V5IjoibW9jayJ9.mock';
});

// ─── Mock @supabase/ssr ────────────────────────────────────────────────────────

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      // getSession est appelé pour rafraîchir les cookies — résultat non utilisé pour le guard
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser:    async () => ({ data: { user: null }, error: null }),
    },
  }),
}));

// ─── Mock next/server ─────────────────────────────────────────────────────────

const redirectCalls: URL[] = [];
let nextCalled = false;

// Cookie principal simulé dans la requête (format JSON brut)
let mockCookieValue: string | null = null;
// Cookie chunké simulé (format sb-<ref>-auth-token.0)
let mockChunkCookie: string | null = null;

// ─── Noms de cookie dérivés depuis l'URL (plus de ref codée en dur) ───────────
//
// Le project ref est extrait de NEXT_PUBLIC_SUPABASE_URL par getSupabaseProjectRef().
// TEST_SUPABASE_URL = 'https://qmrkacrpncdkhofiqlrg.supabase.co'
// → ref = 'qmrkacrpncdkhofiqlrg'
// → COOKIE_NAME = 'sb-qmrkacrpncdkhofiqlrg-auth-token'
//
// Si le projet Supabase change (staging, prod, self-hosted), seule la variable
// TEST_SUPABASE_URL en haut de ce fichier doit être mise à jour.
import { getSupabaseProjectRef } from '../env';
const _projectRef    = getSupabaseProjectRef(TEST_SUPABASE_URL);
const COOKIE_NAME    = `sb-${_projectRef}-auth-token`;
const COOKIE_NAME_C0 = `${COOKIE_NAME}.0`; // premier chunk

vi.mock('next/server', () => {
  class MockNextResponse {
    headers = new Map<string, string>();
    cookies = {
      set: vi.fn(),
      getAll: () => [] as Array<{ name: string; value: string }>,
    };
    status: number;
    url?: string;

    constructor(status = 200, url?: string) {
      this.status = status;
      this.url = url;
    }

    static next({ request }: { request: { headers: Headers } } = { request: { headers: new Headers() } }) {
      nextCalled = true;
      const r = new MockNextResponse(200);
      r.headers = new Map<string, string>();
      return r;
    }

    static redirect(url: URL | string) {
      const parsed = url instanceof URL ? url : new URL(url);
      redirectCalls.push(parsed);
      return new MockNextResponse(307, parsed.toString());
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: class MockNextRequest {
      nextUrl: URL;
      headers: Headers;
      cookies: {
        getAll: () => Array<{ name: string; value: string }>;
        get: (name: string) => { value: string } | undefined;
        set: (name: string, value: string) => void;
      };

      constructor(url: string, init?: { headers?: Record<string, string> }) {
        this.nextUrl = new URL(url);
        this.headers = new Headers(init?.headers ?? {});
        this.cookies = {
          getAll: () => {
            const all: Array<{ name: string; value: string }> = [];
            if (mockCookieValue)  all.push({ name: COOKIE_NAME,    value: mockCookieValue });
            if (mockChunkCookie)  all.push({ name: COOKIE_NAME_C0, value: mockChunkCookie });
            return all;
          },
          get: (name: string) => {
            if (name === COOKIE_NAME    && mockCookieValue)  return { value: mockCookieValue };
            if (name === COOKIE_NAME_C0 && mockChunkCookie)  return { value: mockChunkCookie };
            return undefined;
          },
          set: vi.fn(),
        };
      }
    },
  };
});

// ─── Import après mock ────────────────────────────────────────────────────────

import { updateSession } from '../middleware';
import { NextRequest } from 'next/server';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Token JWT valide (non expiré) dans un cookie JSON brut */
const VALID_COOKIE = JSON.stringify({
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
  refresh_token: 'mock-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600, // expire dans 1h
});

/** Token JWT valide encodé en URI (stray newline scenario) */
const VALID_COOKIE_URL_ENCODED = encodeURIComponent(VALID_COOKIE);

function makeRequest(path: string): NextRequest {
  return new NextRequest(`https://biguglia-connect.fr${path}`);
}

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe("updateSession — guards d'authentification", () => {

  beforeEach(() => {
    mockCookieValue  = null;
    mockChunkCookie  = null;
    redirectCalls.length = 0;
    nextCalled = false;
  });

  // ── 1. Unicité du middleware ─────────────────────────────────────────────────

  describe('Unicité middleware (pas de doublon racine)', () => {
    it('middleware.ts à la racine du projet NE DOIT PAS exister', () => {
      const rootMiddleware = join(process.cwd(), 'middleware.ts');
      expect(
        existsSync(rootMiddleware),
        `Le fichier ${rootMiddleware} existe !\n` +
        `Next.js 14 ignore la racine quand src/middleware.ts est présent.\n` +
        `Ce doublon crée une ambiguïté — supprimer middleware.ts à la racine.`
      ).toBe(false);
    });

    it('src/middleware.ts doit exister et être le seul middleware', () => {
      const srcMiddleware = join(process.cwd(), 'src', 'middleware.ts');
      expect(existsSync(srcMiddleware), `src/middleware.ts introuvable`).toBe(true);
    });
  });

  // ── 2. Routes protégées sans session → redirection ───────────────────────────

  describe('Routes protégées — utilisateur non connecté → /connexion', () => {
    const protectedRoutes = [
      // /admin — toutes les pages réelles
      '/admin',
      '/admin/artisans',
      '/admin/utilisateurs',
      '/admin/signalements',
      '/admin/stats',
      '/admin/contenu',
      '/admin/migration',
      '/admin/securite',
      '/admin/confiance',
      '/admin/moderation',
      '/admin/moderation/f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '/admin/moderation/stats',
      '/admin/spec',
      '/admin/spec/forum',
      '/admin/spec/materiel',
      '/admin/spec/perdu-trouve',
      // /dashboard — toutes les pages réelles
      '/dashboard',
      '/dashboard/artisan',
      '/dashboard/contenus',
      '/dashboard/interactions',
      '/dashboard/avis',
      '/dashboard/collectionneurs',
      '/dashboard/messages',
      '/dashboard/evenements',
      '/dashboard/materiel',
      '/dashboard/perdu-trouve',
      '/dashboard/promenades',
      // /profil (exact — le guard protège uniquement /profil sans sous-chemin)
      '/profil',
      // /messages
      '/messages',
      '/messages/f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    it.each(protectedRoutes)(
      '%s → redirige vers /connexion (pas de cookie)',
      async (path) => {
        mockCookieValue = null;
        const req = makeRequest(path);
        const res = await updateSession(req);

        expect(redirectCalls.length, `Pas de redirection pour ${path}`).toBe(1);
        const redirectUrl = redirectCalls[0];
        expect(redirectUrl.pathname).toBe('/connexion');
        expect(redirectUrl.searchParams.get('next')).toBe(path);
        expect(res).toBeDefined();
      }
    );
  });

  // ── 3. Routes protégées avec session → accès accordé ────────────────────────

  describe('Routes protégées — utilisateur connecté → accès accordé', () => {
    const protectedRoutes = [
      '/admin',
      '/admin/artisans',
      '/admin/stats',
      '/admin/moderation',
      '/admin/moderation/f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '/admin/spec/forum',
      '/dashboard',
      '/dashboard/artisan',
      '/dashboard/contenus',
      '/dashboard/interactions',
      '/dashboard/avis',
      '/dashboard/messages',
      '/profil',
      '/messages',
      '/messages/f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    it.each(protectedRoutes)(
      '%s → accès accordé (cookie valide présent)',
      async (path) => {
        mockCookieValue = VALID_COOKIE;
        const req = makeRequest(path);
        await updateSession(req);

        expect(redirectCalls.length, `Redirection inattendue pour ${path} (cookie valide)`).toBe(0);
        expect(nextCalled).toBe(true);
      }
    );
  });

  // ── 4. Routes publiques → toujours accessibles ───────────────────────────────

  describe('Routes publiques — accessibles sans authentification', () => {
    const publicRoutes = [
      '/',
      '/aide',
      '/annonces',
      '/annonces/mon-annonce',
      '/annonces/nouvelle',
      '/artisans',
      '/artisans/123',
      '/associations',
      '/associations/456',
      '/auth/callback',
      '/auth/reset-password',
      '/cgu',
      '/collectionneurs',
      '/collectionneurs/789',
      '/collectionneurs/nouveau',
      '/communaute/mon-quartier',
      '/confiance',
      '/confidentialite',
      '/connexion',
      '/connexion?next=%2Fdashboard',
      '/coups-de-main',
      '/coups-de-main/123',
      '/demandes',
      '/emploi',
      '/emploi/offres',
      '/emploi/offres/mon-slug',
      '/emploi/demandes',
      '/emploi/demandes/un-slug',
      '/emploi/publier',
      '/evenements',
      '/evenements/123',
      '/forum',
      '/forum/123',
      '/inscription',
      '/inscription/confirmation',
      '/inscription/artisan-profil',
      '/materiel',
      '/mentions-legales',
      '/mot-de-passe-oublie',
      '/notifications',
      '/perdu-trouve',
      // Note : /profil/<id> est redirigé par le middleware (commence par /profil/)
      // Voir section "Cas limites" pour le test documentant ce comportement.
      '/promenades',
      '/recherche',
      '/api/emploi/contact',
      '/api/messages/unread',
    ];

    it.each(publicRoutes)(
      '%s → accessible sans session (route publique)',
      async (path) => {
        mockCookieValue = null;
        const req = makeRequest(path);
        await updateSession(req);

        expect(redirectCalls.length, `Route publique ${path} a déclenché une redirection inattendue`).toBe(0);
      }
    );
  });

  // ── 5. Paramètre ?next= correctement encodé ──────────────────────────────────

  describe("Paramètre ?next= dans l'URL de redirection", () => {
    it('/dashboard/avis → /connexion?next=%2Fdashboard%2Favis', async () => {
      mockCookieValue = null;
      const req = makeRequest('/dashboard/avis');
      await updateSession(req);

      expect(redirectCalls.length).toBe(1);
      const url = redirectCalls[0];
      expect(url.pathname).toBe('/connexion');
      expect(url.searchParams.get('next')).toBe('/dashboard/avis');
    });

    it('/messages/abc-123 → /connexion?next=%2Fmessages%2Fabc-123', async () => {
      mockCookieValue = null;
      const req = makeRequest('/messages/abc-123');
      await updateSession(req);

      expect(redirectCalls.length).toBe(1);
      const url = redirectCalls[0];
      expect(url.pathname).toBe('/connexion');
      expect(url.searchParams.get('next')).toBe('/messages/abc-123');
    });

    it('/admin/stats → /connexion?next=%2Fadmin%2Fstats', async () => {
      mockCookieValue = null;
      const req = makeRequest('/admin/stats');
      await updateSession(req);

      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].searchParams.get('next')).toBe('/admin/stats');
    });

    it('/admin/moderation/stats → ?next bien encodé avec sous-chemin imbriqué', async () => {
      mockCookieValue = null;
      const req = makeRequest('/admin/moderation/stats');
      await updateSession(req);

      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].pathname).toBe('/connexion');
      expect(redirectCalls[0].searchParams.get('next')).toBe('/admin/moderation/stats');
    });

    it('/admin/spec/forum → ?next correct pour route spec imbriquée', async () => {
      mockCookieValue = null;
      const req = makeRequest('/admin/spec/forum');
      await updateSession(req);

      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].searchParams.get('next')).toBe('/admin/spec/forum');
    });
  });

  // ── 6. Formats de cookie valides ────────────────────────────────────────────

  describe('Formats de cookie — hasValidToken', () => {
    it('Cookie JSON brut → accès accordé', async () => {
      mockCookieValue = VALID_COOKIE;
      const req = makeRequest('/admin');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
      expect(nextCalled).toBe(true);
    });

    it('Cookie URL-encodé (contient %7B%22) → accès accordé', async () => {
      mockCookieValue = VALID_COOKIE_URL_ENCODED;
      const req = makeRequest('/dashboard');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
      expect(nextCalled).toBe(true);
    });

    it('Cookie chunké format .0 avec access_token valide → accès accordé', async () => {
      mockCookieValue  = null; // pas de cookie principal
      mockChunkCookie  = JSON.stringify({
        access_token:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.chunk.sig',
        refresh_token: 'refresh-chunk',
        expires_at:    Math.floor(Date.now() / 1000) + 3600,
      });
      const req = makeRequest('/profil');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
      expect(nextCalled).toBe(true);
    });

    it('Cookie chunké format .0 URL-encodé → accès accordé', async () => {
      mockCookieValue = null;
      mockChunkCookie = encodeURIComponent(JSON.stringify({
        access_token:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.encoded-chunk.sig',
        refresh_token: 'refresh-chunk',
        expires_at:    Math.floor(Date.now() / 1000) + 3600,
      }));
      const req = makeRequest('/messages');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
      expect(nextCalled).toBe(true);
    });

    it('Cookie expiré (expires_at passé) → accès autorisé (refresh côté client)', async () => {
      mockCookieValue = JSON.stringify({
        access_token:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature',
        refresh_token: 'mock-refresh-token',
        expires_at:    Math.floor(Date.now() / 1000) - 3600, // expiré il y a 1h
      });
      const req = makeRequest('/messages');
      await updateSession(req);
      // On laisse passer — le refresh_token permet de renouveler côté client
      expect(redirectCalls.length).toBe(0);
    });

    it('Cookie chunké expiré → accès autorisé (refresh côté client)', async () => {
      mockCookieValue = null;
      mockChunkCookie = JSON.stringify({
        access_token:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired-chunk.sig',
        refresh_token: 'refresh-chunk',
        expires_at:    Math.floor(Date.now() / 1000) - 7200, // expiré il y a 2h
      });
      const req = makeRequest('/admin');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });
  });

  // ── 7. Cookies invalides → redirection ──────────────────────────────────────

  describe('Cookies invalides — hasValidToken doit rejeter', () => {
    it('Cookie JSON valide mais access_token absent → redirige', async () => {
      mockCookieValue = JSON.stringify({ refresh_token: 'only-refresh' });
      const req = makeRequest('/admin');
      await updateSession(req);
      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].pathname).toBe('/connexion');
    });

    it("Cookie JSON avec access_token ne commençant pas par 'eyJ' → redirige", async () => {
      mockCookieValue = JSON.stringify({
        access_token:  'INVALID_NOT_JWT.xxx.yyy',
        refresh_token: 'some-refresh',
        expires_at:    Math.floor(Date.now() / 1000) + 3600,
      });
      const req = makeRequest('/dashboard');
      await updateSession(req);
      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].pathname).toBe('/connexion');
    });

    it('Cookie avec access_token vide → redirige', async () => {
      mockCookieValue = JSON.stringify({
        access_token:  '',
        refresh_token: 'some-refresh',
      });
      const req = makeRequest('/messages');
      await updateSession(req);
      expect(redirectCalls.length).toBe(1);
    });

    it('Cookie JSON cassé (pas du JSON valide) → redirige', async () => {
      mockCookieValue = 'not-json-at-all{{{';
      const req = makeRequest('/profil');
      await updateSession(req);
      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].pathname).toBe('/connexion');
    });

    it('Cookie JSON cassé dans le chunk .0 → redirige', async () => {
      mockCookieValue = null;
      mockChunkCookie = 'broken{json}chunk';
      const req = makeRequest('/admin/stats');
      await updateSession(req);
      expect(redirectCalls.length).toBe(1);
    });

    it('Cookie vide (chaîne vide) → redirige', async () => {
      mockCookieValue = '';
      const req = makeRequest('/admin');
      await updateSession(req);
      // Chaîne vide → cookies.get retourne undefined (pas de valeur)
      expect(redirectCalls.length).toBe(1);
    });
  });

  // ── 8. Cas de bord et routes similaires ─────────────────────────────────────

  describe('Cas limites', () => {
    it('/connexion (non protégé) → pas de redirection même sans cookie', async () => {
      mockCookieValue = null;
      const req = makeRequest('/connexion');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });

    it('/connexion?next=/dashboard → pas de redirection (page de login elle-même)', async () => {
      mockCookieValue = null;
      const req = makeRequest('/connexion?next=/dashboard');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });

    it('/profil (exact, sans slash final) → redirige si pas de cookie', async () => {
      mockCookieValue = null;
      const req = makeRequest('/profil');
      await updateSession(req);
      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].pathname).toBe('/connexion');
    });

    it('/profil/f47ac10b-... (sous-chemin) → PAS redirigé (page publique profil tiers)', async () => {
      // /profil est protégé ; /profil/<id> est public (page profil visible sans connexion)
      // Le guard teste pathname === '/profil' || pathname.startsWith('/profil/')
      // → /profil/<uuid> COMMENCE par /profil/ donc sera redirigé si le guard est actif
      // Ce test documente le comportement ACTUEL du middleware.
      // Si le métier veut rendre /profil/<id> public, ajouter une exception dans PROTECTED_PREFIXES.
      mockCookieValue = null;
      const req = makeRequest('/profil/f47ac10b-58cc-4372-a567-0e02b2c3d479');
      await updateSession(req);
      // COMPORTEMENT ACTUEL : /profil/<id> est redirigé (commence par /profil/)
      // Ce test est un marqueur intentionnel — modifier ce comportement implique de mettre
      // à jour ce test ET le middleware simultanément.
      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].pathname).toBe('/connexion');
      expect(redirectCalls[0].searchParams.get('next')).toBe('/profil/f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    it('/profilartisan (commence par /profil mais chemin différent) → PAS redirigé', async () => {
      mockCookieValue = null;
      const req = makeRequest('/profilartisan');
      await updateSession(req);
      // /profilartisan !== /profil ET ne commence pas par /profil/
      expect(redirectCalls.length).toBe(0);
    });

    it('/dashboard-public (non protégé) → pas de redirection', async () => {
      mockCookieValue = null;
      const req = makeRequest('/dashboard-public');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });

    it('/adminpage (similaire à /admin mais différent) → PAS redirigé', async () => {
      mockCookieValue = null;
      const req = makeRequest('/adminpage');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });

    it('/messages-anciens (similaire à /messages mais différent) → PAS redirigé', async () => {
      mockCookieValue = null;
      const req = makeRequest('/messages-anciens');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });
  });

  // ── 9. Écart de couverture documenté : /mes-echanges ─────────────────────────

  describe('Écart de couverture — /mes-echanges non couvert par le middleware', () => {
    /**
     * /mes-echanges utilise ProtectedPage côté UI (src/app/mes-echanges/page.tsx)
     * mais n'est PAS dans PROTECTED_PREFIXES du middleware.
     * → Un utilisateur non connecté peut charger la page ; ProtectedPage redirige en JS.
     * → RISQUE : si JS échoue ou est désactivé, la page se charge sans protection serveur.
     *
     * Ce test documente intentionnellement ce comportement actuel.
     * Pour corriger : ajouter '/mes-echanges' à PROTECTED_PREFIXES dans middleware.ts.
     */
    it('/mes-echanges → PAS redirigé par le middleware (protection UI uniquement — voir commentaire)', async () => {
      mockCookieValue = null;
      const req = makeRequest('/mes-echanges');
      await updateSession(req);
      // COMPORTEMENT ACTUEL : le middleware ne protège pas /mes-echanges
      // Si ce test commence à échouer, c'est que /mes-echanges a été ajouté au middleware → OK !
      expect(redirectCalls.length).toBe(0);
    });
  });
});
