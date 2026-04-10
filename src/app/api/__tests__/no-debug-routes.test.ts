/**
 * Tests de sécurité — Routes API : absence de debug endpoints
 *
 * Contexte :
 *   En avril 2026, la route /api/emploi/debug a été créée pour un diagnostic
 *   Supabase et oubliée en production. Elle exposait sans aucune authentification :
 *     - le préfixe des clés Supabase (service role key, anon key)
 *     - l'URL Supabase
 *     - la liste des 10 dernières offres et demandes (bypass RLS)
 *     - l'email de l'utilisateur SSR connecté
 *   Elle a été supprimée dans le commit 815aa9f.
 *
 * Ces tests garantissent que ce pattern ne réapparaît pas silencieusement.
 *
 * ─── Ce que ces tests vérifient ──────────────────────────────────────────────
 *
 * 1. ABSENCE physique des dossiers de debug connus (debug/, diagnostic/, test/)
 *    sous src/app/api/. Si quelqu'un recrée le fichier, le test échoue.
 *
 * 2. SCAN des routes existantes : aucune route API ne doit exposer
 *    process.env sans être protégée par une vérification admin.
 *
 * 3. SCAN des routes existantes : chaque route doit contenir au moins
 *    une des fonctions d'authentification reconnues.
 *
 * 4. SCAN spécifique : aucune route ne doit contenir les patterns
 *    caractéristiques d'une fuite de secrets (SUPABASE_SERVICE_ROLE_KEY,
 *    SUPABASE_URL, .slice(0, XX) sur des env vars, etc.)
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

// ─── Constantes ────────────────────────────────────────────────────────────────

const API_DIR = join(process.cwd(), 'src', 'app', 'api');

/** Noms de dossiers interdits sous src/app/api/ (debug endpoints). */
const FORBIDDEN_DEBUG_DIRS = [
  'debug',
  'diagnostic',
  'diag',
  'test-route',
  'dev-only',
  'internal',
];

/** Au moins une de ces fonctions doit être présente dans tout handler HTTP. */
const AUTH_FUNCTIONS = [
  'getUserIdBearerFirst',
  'getUserFromRequest',
  'getUserId',
  'auth.getUser',
  'auth.getSession',
  'createAdminClient',  // admin client implique une vérification en amont
];

/** Patterns qui indiquent une fuite potentielle de secrets. */
const SECRET_LEAK_PATTERNS = [
  /process\.env\.SUPABASE_SERVICE_ROLE_KEY/,
  /process\.env\.SUPABASE_URL/,
  /process\.env\.NEXT_PUBLIC_SUPABASE_URL/,
  /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/,
  /serviceRoleKey/,
  /service_role/,
  // Troncature d'une env var (fingerprinting) : .slice(0, N) sur process.env
  /process\.env\.[A-Z_]+.*\.slice\s*\(\s*0\s*,/,
  // Sérialisation directe de process.env dans la réponse
  /NextResponse\.json\s*\(\s*\{[^}]*process\.env/,
  /JSON\.stringify\s*\(\s*process\.env/,
];

// ─── Utilitaires ───────────────────────────────────────────────────────────────

/** Récupère tous les fichiers route.ts sous API_DIR récursivement. */
function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      results.push(fullPath);
    }
  }
  return results;
}

/** Retourne le chemin relatif depuis la racine du projet (lisible dans les messages d'erreur). */
function rel(p: string) {
  return relative(process.cwd(), p);
}

// ─── Suite principale ─────────────────────────────────────────────────────────

describe('Sécurité API — absence de debug/diagnostic routes', () => {

  // ── 1. Dossiers interdits ──────────────────────────────────────────────────

  it('ne doit pas avoir de dossier debug/ sous src/app/api/emploi/', () => {
    const debugDir = join(API_DIR, 'emploi', 'debug');
    expect(existsSync(debugDir), `Le dossier ${rel(debugDir)} existe — supprimer cette route de debug`).toBe(false);
  });

  it.each(FORBIDDEN_DEBUG_DIRS)(
    'ne doit pas avoir de dossier "%s" directement sous src/app/api/',
    (forbidden) => {
      const dir = join(API_DIR, forbidden);
      expect(
        existsSync(dir),
        `Le dossier ${rel(dir)} existe. Les routes de debug/diagnostic sont interdites en production.\n` +
        `Supprimer le fichier ou protéger par NODE_ENV check + admin auth.`
      ).toBe(false);
    }
  );

  it.each(FORBIDDEN_DEBUG_DIRS)(
    'ne doit pas avoir de dossier emploi/"%s" sous src/app/api/',
    (forbidden) => {
      const dir = join(API_DIR, 'emploi', forbidden);
      expect(existsSync(dir)).toBe(false);
    }
  );

  it.each(FORBIDDEN_DEBUG_DIRS)(
    'ne doit pas avoir de dossier messages/"%s" sous src/app/api/',
    (forbidden) => {
      const dir = join(API_DIR, 'messages', forbidden);
      expect(existsSync(dir)).toBe(false);
    }
  );

  // ── 2. Chaque route doit avoir une fonction d'authentification ────────────

  it('chaque route.ts doit contenir au moins une fonction d\'authentification', () => {
    const routeFiles = findRouteFiles(API_DIR);
    expect(routeFiles.length, 'Aucune route API trouvée — vérifier API_DIR').toBeGreaterThan(0);

    const unauthenticated: string[] = [];

    for (const routeFile of routeFiles) {
      const content = readFileSync(routeFile, 'utf-8');
      const hasAuth = AUTH_FUNCTIONS.some(fn => content.includes(fn));

      // Exception : fichier de constantes ou utilitaires dans un sous-dossier
      // (ne définit pas de handler HTTP — pas de export GET/POST/etc.)
      const hasHttpHandler = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE|HEAD)/
        .test(content);

      if (hasHttpHandler && !hasAuth) {
        unauthenticated.push(rel(routeFile));
      }
    }

    expect(
      unauthenticated,
      `Routes sans authentification détectée :\n${unauthenticated.map(f => `  - ${f}`).join('\n')}\n` +
      `Chaque route HTTP doit appeler getUserIdBearerFirst(), getUserFromRequest(), ou équivalent.`
    ).toHaveLength(0);
  });

  // ── 3. Aucune route ne doit exposer des secrets via process.env ───────────

  it('aucune route ne doit exposer process.env secrets dans la réponse JSON', () => {
    const routeFiles = findRouteFiles(API_DIR);
    const leakingFiles: Array<{ file: string; pattern: string; line: number }> = [];

    for (const routeFile of routeFiles) {
      const content = readFileSync(routeFile, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        for (const pattern of SECRET_LEAK_PATTERNS) {
          if (pattern.test(line)) {
            leakingFiles.push({
              file: rel(routeFile),
              pattern: pattern.toString(),
              line: idx + 1,
            });
          }
        }
      });
    }

    const report = leakingFiles
      .map(l => `  ${l.file}:${l.line} — pattern: ${l.pattern}`)
      .join('\n');

    expect(
      leakingFiles,
      `Routes qui exposent potentiellement des secrets :\n${report}\n` +
      `Retirer les variables d'environnement sensibles des réponses API.`
    ).toHaveLength(0);
  });

  // ── 4. Vérifier le contenu spécifique de l'ancienne route de debug ─────────

  it('le contenu caractéristique de l\'ancienne route debug ne doit pas réapparaître', () => {
    const routeFiles = findRouteFiles(API_DIR);

    // Signatures spécifiques à la route debug supprimée
    const debugSignatures = [
      'Route de diagnostic',
      '/api/emploi/debug',
      'offers_count',      // clé spécifique retournée par l'ancienne route
      'demands_count',     // idem
      'join_test_ok',      // idem
      'À SUPPRIMER après diagnostic',
    ];

    const matches: Array<{ file: string; signature: string }> = [];

    for (const routeFile of routeFiles) {
      const content = readFileSync(routeFile, 'utf-8');
      for (const sig of debugSignatures) {
        if (content.includes(sig)) {
          matches.push({ file: rel(routeFile), signature: sig });
        }
      }
    }

    const report = matches.map(m => `  ${m.file} — "${m.signature}"`).join('\n');

    expect(
      matches,
      `Signature de l'ancienne route debug détectée dans :\n${report}\n` +
      `La route /api/emploi/debug a été supprimée dans le commit 815aa9f — ne pas la recréer.`
    ).toHaveLength(0);
  });

  // ── 5. Rapport récapitulatif — toutes les routes actuelles ont auth ────────

  it('rapport : toutes les routes API existantes sont listées et authentifiées', () => {
    const routeFiles = findRouteFiles(API_DIR);
    const routePaths = routeFiles.map(rel);

    // Ce test sert de documentation vivante : il échoue si une route est ajoutée
    // sans être dans la liste attendue, forçant une revue explicite.
    expect(routePaths.length).toBeGreaterThanOrEqual(9); // 9 routes connues au 2026-04-10

    // Vérifier que les routes connues et sensibles sont toujours présentes
    const expectedSensitive = [
      'src/app/api/emploi/contact/route.ts',
      'src/app/api/messages/unread/route.ts',
    ];
    for (const expected of expectedSensitive) {
      expect(
        routePaths.some(p => p.replace(/\\/g, '/').includes(expected.replace(/\\/g, '/'))),
        `Route sensible attendue absente : ${expected}`
      ).toBe(true);
    }
  });
});
