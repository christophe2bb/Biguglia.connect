/**
 * Tests — src/lib/csp-nonce.ts + src/middleware.ts (buildCsp)
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Vérifie la génération des nonces CSP et la construction du header
 * Content-Security-Policy dynamique.
 *
 * Couverture :
 *   1. generateNonce() — entropie, unicité, format base64url, longueur
 *   2. buildCsp() — présence du nonce, absence de unsafe-inline (prod),
 *      strict-dynamic, directives obligatoires
 */

import { describe, it, expect, vi } from 'vitest';
import { generateNonce } from '../csp-nonce';
import { buildCsp } from '../../middleware';

// ─── generateNonce ─────────────────────────────────────────────────────────────

describe('generateNonce', () => {
  it('returns a non-empty string', () => {
    const nonce = generateNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('returns a base64url string (no +, /, = characters)', () => {
    const nonce = generateNonce();
    // base64url: only A-Z, a-z, 0-9, -, _
    expect(nonce).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('returns exactly 22 characters (128 bits → 16 bytes → base64url without padding)', () => {
    const nonce = generateNonce();
    // 16 bytes → base64 = ceil(16/3)*4 = 24 chars, minus 2 padding = 22
    expect(nonce.length).toBe(22);
  });

  it('generates unique nonces (no collision over 1000 iterations)', () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      nonces.add(generateNonce());
    }
    // All 1000 nonces must be unique
    expect(nonces.size).toBe(1000);
  });

  it('uses Web Crypto API (crypto.getRandomValues) — not Math.random', () => {
    // Verify getRandomValues is called
    const spy = vi.spyOn(crypto, 'getRandomValues');
    generateNonce();
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('generates cryptographically random bytes (not all zeros)', () => {
    // Generate many nonces and ensure they have entropy
    const nonces = Array.from({ length: 100 }, () => generateNonce());
    const uniqueChars = new Set(nonces.join('').split(''));
    // A base64url nonce should use many different characters
    expect(uniqueChars.size).toBeGreaterThan(10);
  });
});

// ─── buildCsp ──────────────────────────────────────────────────────────────────

describe('buildCsp', () => {
  const testNonce = 'abc123testNonce456XY';

  describe('nonce injection', () => {
    it("includes the nonce in script-src as 'nonce-{nonce}'", () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain(`'nonce-${testNonce}'`);
    });

    it("includes 'strict-dynamic' in script-src", () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain("'strict-dynamic'");
    });

    it("does NOT include 'unsafe-inline' in script-src", () => {
      // In test env (NODE_ENV=test), isDev is false → no unsafe-inline
      const csp = buildCsp(testNonce);
      const scriptSrcDirective = csp.split(';').find(d => d.trim().startsWith('script-src'));

      expect(scriptSrcDirective).toBeDefined();
      // unsafe-inline should NOT be in script-src (it's only in style-src for Tailwind)
      expect(scriptSrcDirective).not.toContain("'unsafe-inline'");
    });

    it("does NOT include 'unsafe-eval' in script-src (non-dev environment)", () => {
      // In vitest NODE_ENV=test, isDev=false, so no unsafe-eval in script-src
      const csp = buildCsp(testNonce);
      const scriptSrcDirective = csp.split(';').find(d => d.trim().startsWith('script-src'));
      // unsafe-eval should NOT be present when NODE_ENV !== 'development'
      expect(scriptSrcDirective).not.toContain("'unsafe-eval'");
    });
  });

  describe('required CSP directives', () => {
    it("includes default-src 'self'", () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain("default-src 'self'");
    });

    it("includes object-src 'none' (blocks plugins/flash)", () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain("object-src 'none'");
    });

    it("includes base-uri 'self' (prevents base tag injection)", () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain("base-uri 'self'");
    });

    it("includes form-action 'self' (prevents cross-origin form submission)", () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain("form-action 'self'");
    });

    it('includes upgrade-insecure-requests', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('upgrade-insecure-requests');
    });
  });

  describe('connect-src domains', () => {
    it('includes Supabase wildcard domains', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('*.supabase.co');
      expect(csp).toContain('*.supabase.in');
    });

    it('includes WebSocket support for Supabase realtime', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('wss://*.supabase.co');
    });

    it('includes Sentry error reporting domains', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('*.ingest.sentry.io');
      expect(csp).toContain('*.ingest.us.sentry.io');
      expect(csp).toContain('browser.sentry-cdn.com');
    });

    it('includes Vercel analytics', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('vitals.vercel-insights.com');
    });
  });

  describe('script-src domains', () => {
    it('includes vercel.live for Vercel preview toolbar', () => {
      const csp = buildCsp(testNonce);
      const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'));
      expect(scriptSrc).toContain('https://vercel.live');
    });

    it('includes Sentry CDN for lazy-loaded Replay integration', () => {
      const csp = buildCsp(testNonce);
      const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'));
      expect(scriptSrc).toContain('https://browser.sentry-cdn.com');
    });

    it('includes blob: for Sentry Replay workers', () => {
      const csp = buildCsp(testNonce);
      const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'));
      expect(scriptSrc).toContain('blob:');
    });
  });

  describe('style-src', () => {
    it("includes 'unsafe-inline' in style-src (Tailwind JIT inline styles)", () => {
      const csp = buildCsp(testNonce);
      const styleSrc = csp.split(';').find(d => d.trim().startsWith('style-src'));
      // style-src keeps unsafe-inline for Tailwind — intentional, documented in next.config.js
      expect(styleSrc).toContain("'unsafe-inline'");
    });

    it('includes Google Fonts in style-src', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('https://fonts.googleapis.com');
    });
  });

  describe('other directives', () => {
    it('includes worker-src with blob: for Sentry Replay workers', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain("worker-src 'self' blob:");
    });

    it('includes frame-src for vercel.live preview', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('frame-src https://vercel.live');
    });

    it('includes font-src with Google Fonts CDN', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('https://fonts.gstatic.com');
    });

    it('includes img-src for Supabase storage and external providers', () => {
      const csp = buildCsp(testNonce);
      expect(csp).toContain('*.supabase.co');
      // Google/GitHub avatars
      expect(csp).toContain('lh3.googleusercontent.com');
      expect(csp).toContain('avatars.githubusercontent.com');
    });
  });

  describe('nonce format safety', () => {
    it('uses different nonces for different requests — CSPs are unique', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);

      const csp1 = buildCsp(nonce1);
      const csp2 = buildCsp(nonce2);
      expect(csp1).not.toBe(csp2);
      expect(csp1).toContain(`'nonce-${nonce1}'`);
      expect(csp2).toContain(`'nonce-${nonce2}'`);
    });

    it('correctly quotes the nonce in the CSP value', () => {
      const nonce = generateNonce();
      const csp = buildCsp(nonce);
      // The nonce must be wrapped in single quotes as per CSP spec
      expect(csp).toContain(`'nonce-${nonce}'`);
      // But NOT in double quotes
      expect(csp).not.toContain(`"nonce-${nonce}"`);
    });
  });

  describe('CSP header format', () => {
    it('uses semicolons as directive separators', () => {
      const csp = buildCsp(testNonce);
      const directives = csp.split(';');
      expect(directives.length).toBeGreaterThan(8);
    });

    it('returns a single-line header (no newlines)', () => {
      const csp = buildCsp(testNonce);
      expect(csp).not.toContain('\n');
      expect(csp).not.toContain('\r');
    });

    it('does not contain double spaces', () => {
      const csp = buildCsp(testNonce);
      expect(csp).not.toContain('  ');
    });

    it('produces a valid header value for all 1000 nonces', () => {
      for (let i = 0; i < 100; i++) {
        const nonce = generateNonce();
        const csp = buildCsp(nonce);
        // Must always contain the nonce
        expect(csp).toContain(`'nonce-${nonce}'`);
        // Must always have these security fundamentals
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("'strict-dynamic'");
      }
    });
  });
});
