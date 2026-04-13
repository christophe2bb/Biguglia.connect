/**
 * Tests — src/lib/rate-limit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture :
 *
 *  resolveRouteGroup()
 *    1.  POST /api/messages/start-conversation → messages-write
 *    2.  GET  /api/messages/start-conversation → api (fallback, non spécialisé)
 *    3.  PATCH /api/emploi/offres/<slug>  → emploi-write
 *    4.  DELETE /api/emploi/offres/<slug> → emploi-write
 *    5.  GET   /api/emploi/offres/<slug>  → emploi-read
 *    6.  PATCH /api/emploi/demandes/<slug> → emploi-write
 *    7.  DELETE /api/emploi/demandes/<slug> → emploi-write
 *    8.  GET   /api/emploi/contact         → emploi-read
 *    9.  GET   /api/emploi/ownership       → emploi-read
 *   10.  PATCH /api/admin/users/<id>       → admin-api
 *   11.  GET   /api/admin/users/<id>       → admin-api
 *   12.  GET   /api/messages/conversations → api (fallback)
 *   13.  /dashboard/artisan                → default
 *   14.  /                                 → default
 *   15.  POST  /api/autre                  → api
 *
 *  shouldBypassRateLimit()
 *   16.  IP 127.0.0.1 → bypass
 *   17.  IP ::1        → bypass
 *   18.  IP unknown    → bypass
 *   19.  /api/auth/callback → bypass
 *   20.  IP normale, /api/messages → pas de bypass
 *
 *  checkRateLimit()
 *   21.  Première requête → allowed
 *   22.  Requêtes sous la limite → allowed
 *   23.  Requête au seuil exact → allowed (count = maxRequests)
 *   24.  Requête au-delà du seuil → blocked (429)
 *   25.  Requête pendant le blocage → blocked, retryAfterSecs correct
 *   26.  Requête après expiration du blocage → reset et allowed
 *   27.  Requête après expiration de la fenêtre → reset et allowed
 *   28.  Groupes différents pour la même IP → compteurs indépendants
 *   29.  IPs différentes pour le même groupe → compteurs indépendants
 *   30.  IP locale → toujours allowed (bypass)
 *   31.  Limites messages-write (10) plus strictes que api (200)
 *   32.  retryAfterSecs = 0 quand allowed
 *   33.  retryAfterSecs > 0 quand bloqué (valeur correcte)
 *
 *  cleanBuckets()
 *   34.  N'efface pas les buckets récents
 *   35.  Efface les buckets périmés (> 10 min après firstReq)
 *
 * ── Stratégie ────────────────────────────────────────────────────────────────
 *
 *  - `now` est injecté en paramètre dans checkRateLimit() et cleanBuckets()
 *    pour contrôler le temps sans patch global de Date.now().
 *  - `_buckets` est exporté pour reset entre tests (beforeEach).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveRouteGroup,
  shouldBypassRateLimit,
  checkRateLimit,
  cleanBuckets,
  RATE_CONFIGS,
  _buckets,
  _resetCleanupTimer,
} from './rate-limit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const T0 = 1_700_000_000_000; // timestamp fictif stable pour les tests

/** Vide la Map entre chaque test pour éviter toute contamination. */
function resetBuckets() {
  _buckets.clear();
}

// =============================================================================
// resolveRouteGroup()
// =============================================================================

describe('resolveRouteGroup()', () => {

  // ── Messages ────────────────────────────────────────────────────────────────

  it('1. POST /api/messages/start-conversation → messages-write', () => {
    expect(resolveRouteGroup('/api/messages/start-conversation', 'POST'))
      .toBe('messages-write');
  });

  it('2. GET /api/messages/start-conversation → api (méthode non-POST)', () => {
    expect(resolveRouteGroup('/api/messages/start-conversation', 'GET'))
      .toBe('api');
  });

  // ── Emploi écriture ─────────────────────────────────────────────────────────

  it('3. PATCH /api/emploi/offres/<slug> → emploi-write', () => {
    expect(resolveRouteGroup('/api/emploi/offres/mon-offre', 'PATCH'))
      .toBe('emploi-write');
  });

  it('4. DELETE /api/emploi/offres/<slug> → emploi-write', () => {
    expect(resolveRouteGroup('/api/emploi/offres/mon-offre', 'DELETE'))
      .toBe('emploi-write');
  });

  it('5. GET /api/emploi/offres/<slug> → emploi-read', () => {
    expect(resolveRouteGroup('/api/emploi/offres/mon-offre', 'GET'))
      .toBe('emploi-read');
  });

  it('6. PATCH /api/emploi/demandes/<slug> → emploi-write', () => {
    expect(resolveRouteGroup('/api/emploi/demandes/ma-demande', 'PATCH'))
      .toBe('emploi-write');
  });

  it('7. DELETE /api/emploi/demandes/<slug> → emploi-write', () => {
    expect(resolveRouteGroup('/api/emploi/demandes/ma-demande', 'DELETE'))
      .toBe('emploi-write');
  });

  // ── Emploi lecture ──────────────────────────────────────────────────────────

  it('8. GET /api/emploi/contact → emploi-read', () => {
    expect(resolveRouteGroup('/api/emploi/contact', 'GET')).toBe('emploi-read');
  });

  it('9. GET /api/emploi/ownership → emploi-read', () => {
    expect(resolveRouteGroup('/api/emploi/ownership', 'GET')).toBe('emploi-read');
  });

  // ── Admin API ───────────────────────────────────────────────────────────────

  it('10. PATCH /api/admin/users/<id> → admin-api', () => {
    expect(resolveRouteGroup('/api/admin/users/uuid-001', 'PATCH')).toBe('admin-api');
  });

  it('11. GET /api/admin/users/<id> → admin-api', () => {
    expect(resolveRouteGroup('/api/admin/users/uuid-001', 'GET')).toBe('admin-api');
  });

  // ── Messages lecture (fallback API) ─────────────────────────────────────────

  it('12. GET /api/messages/conversations → api (lecture, pas de groupe spécialisé)', () => {
    expect(resolveRouteGroup('/api/messages/conversations', 'GET')).toBe('api');
  });

  // ── Pages HTML ──────────────────────────────────────────────────────────────

  it('13. /dashboard/artisan → default', () => {
    expect(resolveRouteGroup('/dashboard/artisan', 'GET')).toBe('default');
  });

  it('14. / (accueil) → default', () => {
    expect(resolveRouteGroup('/', 'GET')).toBe('default');
  });

  // ── API fallback ─────────────────────────────────────────────────────────────

  it('15. POST /api/autre → api (fallback)', () => {
    expect(resolveRouteGroup('/api/autre', 'POST')).toBe('api');
  });

});

// =============================================================================
// shouldBypassRateLimit()
// =============================================================================

describe('shouldBypassRateLimit()', () => {

  it('16. IP 127.0.0.1 → bypass', () => {
    expect(shouldBypassRateLimit('127.0.0.1', '/api/messages/start-conversation')).toBe(true);
  });

  it('17. IP ::1 → bypass', () => {
    expect(shouldBypassRateLimit('::1', '/api/emploi/offres/offre')).toBe(true);
  });

  it('18. IP unknown → bypass', () => {
    expect(shouldBypassRateLimit('unknown', '/api/admin/users/x')).toBe(true);
  });

  it('19. /api/auth/callback → bypass (quelle que soit l\'IP)', () => {
    expect(shouldBypassRateLimit('1.2.3.4', '/api/auth/callback')).toBe(true);
  });

  it('20. IP réelle + /api/messages/… → pas de bypass', () => {
    expect(shouldBypassRateLimit('1.2.3.4', '/api/messages/conversations')).toBe(false);
  });

});

// =============================================================================
// checkRateLimit()
// =============================================================================

describe('checkRateLimit()', () => {

  beforeEach(resetBuckets);

  // ── Comportement de base ───────────────────────────────────────────────────

  it('21. Première requête → allowed', () => {
    const result = checkRateLimit('1.1.1.1', 'api', T0);
    expect(result.allowed).toBe(true);
  });

  it('22. Requêtes sous la limite → allowed', () => {
    const max = RATE_CONFIGS['messages-write'].maxRequests;
    let last;
    for (let i = 0; i < max - 1; i++) {
      last = checkRateLimit('2.2.2.2', 'messages-write', T0 + i);
    }
    expect(last!.allowed).toBe(true);
  });

  it('23. Requête au seuil exact (count = maxRequests) → allowed', () => {
    const max = RATE_CONFIGS['messages-write'].maxRequests;
    let last;
    for (let i = 0; i < max; i++) {
      last = checkRateLimit('3.3.3.3', 'messages-write', T0 + i);
    }
    expect(last!.allowed).toBe(true);
  });

  it('24. Requête au-delà du seuil → blocked', () => {
    const max = RATE_CONFIGS['messages-write'].maxRequests;
    for (let i = 0; i <= max; i++) {
      checkRateLimit('4.4.4.4', 'messages-write', T0 + i);
    }
    const result = checkRateLimit('4.4.4.4', 'messages-write', T0 + max + 1);
    expect(result.allowed).toBe(false);
  });

  it('25. Requête pendant le blocage → blocked avec retryAfterSecs correct', () => {
    const max = RATE_CONFIGS['messages-write'].maxRequests;
    const blockMs = RATE_CONFIGS['messages-write'].blockMs;
    for (let i = 0; i <= max; i++) {
      checkRateLimit('5.5.5.5', 'messages-write', T0 + i);
    }
    // première requête bloquée
    checkRateLimit('5.5.5.5', 'messages-write', T0 + max + 1);
    // requête suivante 5s après le début du blocage
    const result = checkRateLimit('5.5.5.5', 'messages-write', T0 + max + 5_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSecs).toBeLessThanOrEqual(Math.ceil(blockMs / 1000));
    expect(result.retryAfterSecs).toBeGreaterThan(0);
  });

  it('26. Requête après expiration du blocage → reset et allowed', () => {
    const max = RATE_CONFIGS['messages-write'].maxRequests;
    const blockMs = RATE_CONFIGS['messages-write'].blockMs;
    for (let i = 0; i <= max; i++) {
      checkRateLimit('6.6.6.6', 'messages-write', T0 + i);
    }
    // déclencher le blocage
    checkRateLimit('6.6.6.6', 'messages-write', T0 + max + 1);
    // requête bien après la fin du blocage
    const result = checkRateLimit('6.6.6.6', 'messages-write', T0 + blockMs + 2_000);
    expect(result.allowed).toBe(true);
  });

  it('27. Requête après expiration de la fenêtre → reset et allowed', () => {
    const max = RATE_CONFIGS['emploi-write'].maxRequests;
    const windowMs = RATE_CONFIGS['emploi-write'].windowMs;
    for (let i = 0; i < max; i++) {
      checkRateLimit('7.7.7.7', 'emploi-write', T0 + i);
    }
    // juste au-delà de la fenêtre de 1 min
    const result = checkRateLimit('7.7.7.7', 'emploi-write', T0 + windowMs + 1_000);
    expect(result.allowed).toBe(true);
  });

  // ── Isolation des compteurs ────────────────────────────────────────────────

  it('28. Groupes différents pour la même IP → compteurs indépendants', () => {
    const maxWrite = RATE_CONFIGS['messages-write'].maxRequests;
    // Épuiser messages-write
    for (let i = 0; i <= maxWrite; i++) {
      checkRateLimit('8.8.8.8', 'messages-write', T0 + i);
    }
    const writeBlocked = checkRateLimit('8.8.8.8', 'messages-write', T0 + maxWrite + 2);
    expect(writeBlocked.allowed).toBe(false);

    // Le groupe 'api' doit toujours être allowed pour la même IP
    const apiResult = checkRateLimit('8.8.8.8', 'api', T0 + maxWrite + 2);
    expect(apiResult.allowed).toBe(true);
  });

  it('29. IPs différentes pour le même groupe → compteurs indépendants', () => {
    const max = RATE_CONFIGS['emploi-write'].maxRequests;
    // Épuiser l'IP A
    for (let i = 0; i <= max; i++) {
      checkRateLimit('9.9.9.9', 'emploi-write', T0 + i);
    }
    checkRateLimit('9.9.9.9', 'emploi-write', T0 + max + 1);
    const ipABlocked = checkRateLimit('9.9.9.9', 'emploi-write', T0 + max + 2);
    expect(ipABlocked.allowed).toBe(false);

    // IP B jamais vue → doit être allowed
    const ipBResult = checkRateLimit('10.0.0.1', 'emploi-write', T0 + max + 2);
    expect(ipBResult.allowed).toBe(true);
  });

  // ── IPs locales ─────────────────────────────────────────────────────────────

  it('30. IP locale (127.0.0.1) → toujours allowed, même après des milliers de requêtes', () => {
    for (let i = 0; i < 1000; i++) {
      checkRateLimit('127.0.0.1', 'messages-write', T0 + i);
    }
    const result = checkRateLimit('127.0.0.1', 'messages-write', T0 + 1000);
    expect(result.allowed).toBe(true);
  });

  // ── Comparaison des limites ──────────────────────────────────────────────────

  it('31. messages-write (10) est plus strict que api (200)', () => {
    expect(RATE_CONFIGS['messages-write'].maxRequests)
      .toBeLessThan(RATE_CONFIGS['api'].maxRequests);
    expect(RATE_CONFIGS['emploi-write'].maxRequests)
      .toBeLessThan(RATE_CONFIGS['api'].maxRequests);
    expect(RATE_CONFIGS['emploi-read'].maxRequests)
      .toBeLessThan(RATE_CONFIGS['api'].maxRequests);
  });

  // ── retryAfterSecs ──────────────────────────────────────────────────────────

  it('32. retryAfterSecs = 0 quand allowed', () => {
    const result = checkRateLimit('11.1.1.1', 'default', T0);
    expect(result.retryAfterSecs).toBe(0);
  });

  it('33. retryAfterSecs > 0 quand bloqué, = ceil(blockMs/1000) sur premier blocage', () => {
    const max = RATE_CONFIGS['messages-write'].maxRequests;
    const blockMs = RATE_CONFIGS['messages-write'].blockMs;
    for (let i = 0; i <= max; i++) {
      checkRateLimit('12.1.1.1', 'messages-write', T0 + i);
    }
    // premier blocage à T0 + max + 1
    const blocked = checkRateLimit('12.1.1.1', 'messages-write', T0 + max + 1);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSecs).toBe(Math.ceil(blockMs / 1000));
  });

});

// =============================================================================
// cleanBuckets()
// =============================================================================

describe('cleanBuckets()', () => {

  beforeEach(resetBuckets);

  it('34. Ne supprime pas les buckets récents', () => {
    _buckets.set('1.1.1.1:api', { count: 5, firstReq: T0, blockedUntil: 0 });
    // nettoyage avec un "now" qui simule 3 min après T0
    cleanBuckets(T0 + 3 * 60_000 + 1); // déclenche le nettoyage (lastCleanup reset simulé)
    // Le bucket ne devrait PAS être supprimé (firstReq il y a 3 min < 10 min)
    // Note : le cleanup se déclenche uniquement si > 5 min depuis lastCleanup
    // → ce test vérifie que si le bucket est récent, il est conservé
    expect(_buckets.has('1.1.1.1:api')).toBe(true);
  });

  it('35. Supprime les buckets périmés après déclenchement', () => {
    // Simuler un bucket très ancien (> 10 min après firstReq, blockedUntil = 0)
    const oldTime = T0 - 15 * 60_000; // 15 minutes avant T0
    _buckets.set('old:api', { count: 5, firstReq: oldTime, blockedUntil: 0 });

    // Réinitialiser le timer de nettoyage pour forcer le déclenchement
    // (sans ça, la garde `now - _lastCleanup < 5 min` empêche l'exécution)
    _resetCleanupTimer(0);

    // futureNow - oldTime = T0 + 6min - (T0 - 15min) = 21 min > 10 min → bucket supprimé
    const futureNow = T0 + 6 * 60_000;
    cleanBuckets(futureNow);

    expect(_buckets.has('old:api')).toBe(false);
  });

});
