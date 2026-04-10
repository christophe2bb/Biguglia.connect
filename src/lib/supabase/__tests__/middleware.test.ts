/**
 * Tests — src/lib/supabase/middleware.ts (updateSession)
 *
 * ─── Ce que ces tests vérifient ───────────────────────────────────────────────
 *
 *  1. Routes protégées sans session → HTTP 307 vers /connexion?next=<pathname>
 *  2. Routes protégées avec session → NextResponse.next() (accès accordé)
 *  3. Routes publiques sans session → NextResponse.next() (pas de redirection)
 *  4. Le paramètre ?next= est bien encodé dans l'URL de redirection
 *  5. Unicité : seul src/middleware.ts existe (pas de doublon à la racine)
 *
 * ─── Stratégie de mock ────────────────────────────────────────────────────────
 *
 *  @supabase/ssr est mocké pour simuler auth.getUser() avec ou sans session.
 *  NextResponse est partiellement mocké pour capturer redirect() et next().
 *
 * ─── Routes protégées couvertes ───────────────────────────────────────────────
 *
 *  /admin, /admin/artisans, /admin/utilisateurs, /admin/stats
 *  /dashboard, /dashboard/contenus, /dashboard/avis
 *  /profil
 *  /messages, /messages/<uuid>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

// ─── Mock @supabase/ssr ────────────────────────────────────────────────────────

let mockUser: { id: string; email: string } | null = null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null }),
    },
  }),
}));

// ─── Mock next/server ─────────────────────────────────────────────────────────

// Capture les appels à NextResponse.redirect() et NextResponse.next()
const redirectCalls: URL[] = [];
let nextCalled = false;

vi.mock('next/server', () => {
  class MockNextResponse {
    headers = new Map<string, string>();
    cookies = {
      set: vi.fn(),
      getAll: () => [],
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
      cookies: { getAll: () => Array<{ name: string; value: string }> };

      constructor(url: string, init?: { headers?: Record<string, string> }) {
        this.nextUrl = new URL(url);
        this.headers = new Headers(init?.headers ?? {});
        this.cookies = { getAll: () => [] };
      }
    },
  };
});

// ─── Import après mock ────────────────────────────────────────────────────────

import { updateSession } from '../middleware';
import { NextRequest } from 'next/server';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(path: string): NextRequest {
  return new NextRequest(`https://biguglia-connect.fr${path}`);
}

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('updateSession — guards d\'authentification', () => {

  beforeEach(() => {
    mockUser = null;
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
      '/admin',
      '/admin/artisans',
      '/admin/utilisateurs',
      '/admin/stats',
      '/admin/securite',
      '/admin/moderation',
      '/dashboard',
      '/dashboard/contenus',
      '/dashboard/avis',
      '/dashboard/materiel',
      '/dashboard/promenades',
      '/dashboard/collectionneurs',
      '/profil',
      '/messages',
      '/messages/f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    it.each(protectedRoutes)(
      '%s → redirige vers /connexion (non authentifié)',
      async (path) => {
        mockUser = null;
        const req = makeRequest(path);
        const res = await updateSession(req);

        // Doit avoir déclenché une redirection
        expect(redirectCalls.length, `Pas de redirection pour ${path}`).toBe(1);

        const redirectUrl = redirectCalls[0];
        expect(redirectUrl.pathname).toBe('/connexion');
        expect(redirectUrl.searchParams.get('next')).toBe(path);
      }
    );
  });

  // ── 3. Routes protégées avec session → accès accordé ────────────────────────

  describe('Routes protégées — utilisateur connecté → accès accordé', () => {
    const protectedRoutes = [
      '/admin',
      '/admin/artisans',
      '/dashboard',
      '/dashboard/contenus',
      '/profil',
      '/messages',
      '/messages/f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    it.each(protectedRoutes)(
      '%s → accès accordé (authentifié)',
      async (path) => {
        mockUser = { id: 'user-123', email: 'test@example.com' };
        const req = makeRequest(path);
        await updateSession(req);

        expect(redirectCalls.length, `Redirection inattendue pour ${path} (utilisateur connecté)`).toBe(0);
        expect(nextCalled).toBe(true);
      }
    );
  });

  // ── 4. Routes publiques → toujours accessibles ───────────────────────────────

  describe('Routes publiques — accessibles sans authentification', () => {
    const publicRoutes = [
      '/',
      '/annonces',
      '/annonces/mon-annonce',
      '/emploi',
      '/emploi/offres',
      '/emploi/demandes/un-slug',
      '/forum',
      '/forum/123',
      '/artisans',
      '/materiel',
      '/connexion',
      '/inscription',
      '/inscription/confirmation',
      '/auth/callback',
      '/api/emploi/contact',
      '/api/messages/unread',
    ];

    it.each(publicRoutes)(
      '%s → accessible sans session (route publique)',
      async (path) => {
        mockUser = null;
        const req = makeRequest(path);
        await updateSession(req);

        expect(redirectCalls.length, `Route publique ${path} a déclenché une redirection inattendue`).toBe(0);
      }
    );
  });

  // ── 5. Paramètre ?next= correctement encodé ──────────────────────────────────

  describe('Paramètre ?next= dans l\'URL de redirection', () => {
    it('/dashboard/avis → /connexion?next=%2Fdashboard%2Favis', async () => {
      mockUser = null;
      const req = makeRequest('/dashboard/avis');
      await updateSession(req);

      expect(redirectCalls.length).toBe(1);
      const url = redirectCalls[0];
      expect(url.pathname).toBe('/connexion');
      expect(url.searchParams.get('next')).toBe('/dashboard/avis');
    });

    it('/messages/abc-123 → /connexion?next=%2Fmessages%2Fabc-123', async () => {
      mockUser = null;
      const req = makeRequest('/messages/abc-123');
      await updateSession(req);

      expect(redirectCalls.length).toBe(1);
      const url = redirectCalls[0];
      expect(url.pathname).toBe('/connexion');
      expect(url.searchParams.get('next')).toBe('/messages/abc-123');
    });

    it('/admin/stats → /connexion?next=%2Fadmin%2Fstats', async () => {
      mockUser = null;
      const req = makeRequest('/admin/stats');
      await updateSession(req);

      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].searchParams.get('next')).toBe('/admin/stats');
    });
  });

  // ── 6. Cas limites ───────────────────────────────────────────────────────────

  describe('Cas limites', () => {
    it('/connexion (non protégé) → pas de redirection même sans session', async () => {
      mockUser = null;
      const req = makeRequest('/connexion');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });

    it('/connexion?next=/dashboard → pas de redirection (page de login elle-même)', async () => {
      mockUser = null;
      const req = makeRequest('/connexion?next=/dashboard');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });

    it('/profil (exact, sans slash final) → redirige si non authentifié', async () => {
      mockUser = null;
      const req = makeRequest('/profil');
      await updateSession(req);
      expect(redirectCalls.length).toBe(1);
      expect(redirectCalls[0].pathname).toBe('/connexion');
    });

    it('/profilartisan (commence par /profil mais différent) → PAS redirigé', async () => {
      // /profilartisan n'est pas dans la liste protégée
      // Ce test garantit que le préfixe matching est précis (= + startsWith('/'))
      mockUser = null;
      const req = makeRequest('/profilartisan');
      await updateSession(req);
      // Pas de redirection car /profilartisan !== /profil et ne commence pas par /profil/
      expect(redirectCalls.length).toBe(0);
    });

    it('/dashboard-public (non protégé) → pas de redirection', async () => {
      mockUser = null;
      const req = makeRequest('/dashboard-public');
      await updateSession(req);
      expect(redirectCalls.length).toBe(0);
    });
  });
});
