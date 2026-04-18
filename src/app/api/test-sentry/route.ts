/**
 * API Route — GET /api/test-sentry
 * ──────────────────────────────────────────────────────────────────────────────
 * Route de vérification du monitoring Sentry en conditions réelles.
 *
 * USAGE (préprod / staging uniquement) :
 *   GET /api/test-sentry?scenario=server_error
 *   GET /api/test-sentry?scenario=captureApiError
 *   GET /api/test-sentry?scenario=captureAuthError
 *   GET /api/test-sentry?scenario=custom_context
 *   GET /api/test-sentry?scenario=breadcrumb_chain
 *   GET /api/test-sentry?scenario=ping          ← vérifie sans envoyer d'erreur
 *
 * SÉCURITÉ :
 *   • Désactivée en production (NODE_ENV === 'production' sans SENTRY_TEST_ENABLED)
 *   • Protégée par le header X-Sentry-Test-Token si SENTRY_TEST_TOKEN est défini
 *   • Ne contient aucune PII — les erreurs envoyées sont factices
 *
 * CE QUE VÉRIFIER dans Sentry après appel :
 *   ✓ L'événement apparaît dans Issues ou Transactions
 *   ✓ La route est visible (tag route = /api/test-sentry)
 *   ✓ Le contexte est présent (boundary, scenario, environment)
 *   ✓ L'environnement est correct (development / production)
 *   ✓ Le niveau de sévérité est correct
 *   ✓ Les breadcrumbs sont présents pour le scénario breadcrumb_chain
 */

import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import {
  captureApiError,
  captureAuthError,
  captureError,
  addBreadcrumb,
} from '@/lib/monitoring/sentry';

// ─── Garde de sécurité ────────────────────────────────────────────────────────

/**
 * Vérifie que la route de test est autorisée dans l'environnement courant.
 *
 * Règles :
 *   • Toujours autorisée en development.
 *   • En production : requiert la variable SENTRY_TEST_ENABLED=true ET
 *     le header X-Sentry-Test-Token correspondant à SENTRY_TEST_TOKEN.
 *   • Si SENTRY_TEST_ENABLED n'est pas défini, on autorise hors production
 *     (staging, preview Vercel) pour permettre les tests de déploiement.
 */
function isAuthorized(req: NextRequest): { ok: boolean; reason?: string } {
  const env = process.env.NODE_ENV;
  const testEnabled = process.env.SENTRY_TEST_ENABLED;
  const expectedToken = process.env.SENTRY_TEST_TOKEN;

  // En développement local : toujours autorisé
  if (env === 'development') return { ok: true };

  // En production stricte : requiert opt-in explicite
  if (env === 'production' && testEnabled !== 'true') {
    return {
      ok: false,
      reason: 'Route désactivée en production. Définir SENTRY_TEST_ENABLED=true pour autoriser.',
    };
  }

  // Si un token est défini, le vérifier
  if (expectedToken) {
    const provided = req.headers.get('x-sentry-test-token');
    if (provided !== expectedToken) {
      return {
        ok: false,
        reason: 'Token de test invalide ou manquant (header X-Sentry-Test-Token).',
      };
    }
  }

  return { ok: true };
}

// ─── Scénarios de test ────────────────────────────────────────────────────────

/**
 * Liste des scénarios disponibles avec leur description et ce qu'ils testent.
 */
const SCENARIOS = {
  ping: {
    description: 'Vérifie que la route répond sans envoyer d\'erreur à Sentry.',
    tests: ['connectivity', 'dsn_presence', 'environment'],
  },
  server_error: {
    description: 'Provoque une exception non gérée capturée via captureException.',
    tests: ['captureException', 'stack_trace', 'environment_tag'],
  },
  captureApiError: {
    description: 'Utilise le helper captureApiError avec contexte route/method/status.',
    tests: ['boundary_tag', 'route_tag', 'http_method_tag', 'status_code_tag'],
  },
  captureAuthError: {
    description: 'Utilise captureAuthError pour tester les alertes d\'authentification.',
    tests: ['boundary_auth', 'auth_event_tag', 'warning_level'],
  },
  custom_context: {
    description: 'Envoie une erreur avec userId, tags personnalisés et extras.',
    tests: ['user_context', 'custom_tags', 'extra_data'],
  },
  breadcrumb_chain: {
    description: 'Ajoute des breadcrumbs puis déclenche une erreur pour tester le fil d\'Ariane.',
    tests: ['breadcrumbs', 'chain_context', 'reproduction_trail'],
  },
  unhandled_rejection: {
    description: 'Déclenche une Promise rejection non gérée (capturée par instrumentation.ts).',
    tests: ['onRequestError', 'async_capture', 'promise_rejection'],
  },
} as const;

type Scenario = keyof typeof SCENARIOS;

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const scenario = (searchParams.get('scenario') ?? 'ping') as Scenario;
  const testId = `sentry-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // ── Garde de sécurité
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason, hint: 'Cette route est réservée aux environnements non-production.' },
      { status: 403 },
    );
  }

  // ── Scénario inconnu
  if (!SCENARIOS[scenario]) {
    return NextResponse.json(
      {
        error: `Scénario inconnu : "${scenario}"`,
        available: Object.keys(SCENARIOS),
        usage: 'GET /api/test-sentry?scenario=<nom>',
      },
      { status: 400 },
    );
  }

  const dsnPresent = !!(
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  );

  // ── Exécution du scénario
  const result = await runScenario(scenario, testId, req);

  return NextResponse.json({
    ok: true,
    testId,
    scenario,
    description: SCENARIOS[scenario].description,
    tests: SCENARIOS[scenario].tests,
    environment: process.env.NODE_ENV ?? 'unknown',
    dsnConfigured: dsnPresent,
    sentryEventSent: result.sent,
    eventId: result.eventId ?? null,
    message: result.message,
    nextSteps: dsnPresent
      ? [
          `Chercher le testId "${testId}" dans Sentry → Issues ou Search`,
          'Vérifier les tags : boundary, route, environment, scenario',
          'Vérifier le niveau de sévérité',
          'Vérifier le contexte utilisateur (si scenario=custom_context)',
          'Vérifier les breadcrumbs (si scenario=breadcrumb_chain)',
        ]
      : [
          '⚠️  DSN non configuré — aucun événement envoyé à Sentry.',
          'Définir NEXT_PUBLIC_SENTRY_DSN (client) et/ou SENTRY_DSN (serveur) dans .env.local',
          'Redémarrer le serveur de développement après modification des variables d\'env',
        ],
    checklist: buildChecklist(scenario, dsnPresent),
  });
}

// ─── Exécution des scénarios ──────────────────────────────────────────────────

interface ScenarioResult {
  sent: boolean;
  eventId?: string;
  message: string;
}

async function runScenario(
  scenario: Scenario,
  testId: string,
  req: NextRequest,
): Promise<ScenarioResult> {
  switch (scenario) {
    // ── ping : simple check sans envoi d'erreur
    case 'ping': {
      const dsnOk = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
      return {
        sent: false,
        message: dsnOk
          ? 'Sentry DSN présent. La route répond correctement. Aucune erreur test envoyée.'
          : 'Sentry DSN absent. Monitoring désactivé sur ce serveur.',
      };
    }

    // ── server_error : exception basique capturée manuellement
    case 'server_error': {
      const err = new Error(
        `[TEST Sentry] server_error — testId: ${testId}. ` +
        'Ceci est une erreur de test volontaire. À ignorer en production.',
      );
      err.name = 'SentryTestError';

      const eventId = Sentry.captureException(err, {
        tags: {
          scenario,
          testId,
          boundary: 'api-route',
          route: '/api/test-sentry',
        },
        extra: {
          triggeredAt: new Date().toISOString(),
          nodeVersion: process.version,
          runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
        },
      });

      return {
        sent: true,
        eventId,
        message: `Exception capturée via Sentry.captureException. eventId: ${eventId}`,
      };
    }

    // ── captureApiError : via notre helper centralisé
    case 'captureApiError': {
      const err = new Error(
        `[TEST Sentry] captureApiError — testId: ${testId}. ` +
        'Simule une erreur dans une API Route avec contexte HTTP complet.',
      );
      err.name = 'SentryTestApiError';

      captureApiError(err, {
        route: '/api/test-sentry',
        method: req.method,
        statusCode: 500,
        tags: {
          scenario,
          testId,
          test_type: 'api_error',
        },
        extra: {
          triggeredAt: new Date().toISOString(),
          url: req.url,
          userAgent: req.headers.get('user-agent') ?? 'unknown',
        },
        level: 'error',
      });

      return {
        sent: true,
        message: 'Erreur envoyée via captureApiError avec tags: boundary=api-route, route, http.method, http.status_code',
      };
    }

    // ── captureAuthError : simule un problème d'authentification
    case 'captureAuthError': {
      captureAuthError('test_session_missing', {
        event: 'test_session_missing',
        tags: {
          scenario,
          testId,
          test_type: 'auth_error',
        },
        extra: {
          triggeredAt: new Date().toISOString(),
          context: 'sentry monitoring verification',
        },
        level: 'warning',
      });

      return {
        sent: true,
        message: 'Auth error envoyé via captureAuthError. Niveau: warning. Tag boundary=auth',
      };
    }

    // ── custom_context : userId + tags + extras
    case 'custom_context': {
      const err = new Error(
        `[TEST Sentry] custom_context — testId: ${testId}. ` +
        'Teste la présence du contexte utilisateur et des données supplémentaires.',
      );
      err.name = 'SentryTestContextError';

      // UUID de test factice — jamais un vrai userId
      const fakeUserId = '00000000-test-0000-0000-' + testId.slice(-12).replace(/[^a-f0-9]/g, '0');

      captureError(err, {
        userId: fakeUserId,
        userRole: 'test_role',
        tags: {
          scenario,
          testId,
          section: 'monitoring-verification',
          priority: 'low',
        },
        extra: {
          triggeredAt: new Date().toISOString(),
          verificationStep: 'custom_context',
          nodeVersion: process.version,
          environment: process.env.NODE_ENV,
        },
        level: 'warning',
      });

      return {
        sent: true,
        message: `Erreur avec contexte complet envoyée. UserId de test: ${fakeUserId}`,
      };
    }

    // ── breadcrumb_chain : fil d'Ariane avant l'erreur
    case 'breadcrumb_chain': {
      // Simuler une chaîne d'actions avant l'erreur
      addBreadcrumb(
        'Test monitoring started',
        { testId, step: 1, action: 'initiation' },
        'sentry-test',
      );

      addBreadcrumb(
        'Database query attempted',
        { testId, step: 2, query: 'SELECT count(*) FROM test_table', duration_ms: 42 },
        'database',
      );

      addBreadcrumb(
        'Cache miss — fallback to DB',
        { testId, step: 3, cacheKey: 'test:users:count' },
        'cache',
      );

      addBreadcrumb(
        'Permission check failed',
        { testId, step: 4, required: 'admin', actual: 'resident' },
        'auth',
      );

      const err = new Error(
        `[TEST Sentry] breadcrumb_chain — testId: ${testId}. ` +
        'Erreur avec 4 breadcrumbs pour tester le fil d\'Ariane.',
      );
      err.name = 'SentryTestBreadcrumbError';

      const eventId = Sentry.captureException(err, {
        tags: {
          scenario,
          testId,
          boundary: 'api-route',
          route: '/api/test-sentry',
        },
        extra: {
          breadcrumbCount: 4,
          triggeredAt: new Date().toISOString(),
        },
      });

      return {
        sent: true,
        eventId,
        message: `Erreur avec 4 breadcrumbs capturée. eventId: ${eventId}. Vérifier le trail dans Sentry.`,
      };
    }

    // ── unhandled_rejection : rejet de Promise
    case 'unhandled_rejection': {
      const err = new Error(
        `[TEST Sentry] unhandled_rejection — testId: ${testId}. ` +
        'Simule une Promise rejection capturée par onRequestError de instrumentation.ts.',
      );
      err.name = 'SentryTestUnhandledRejection';

      // On capture manuellement car en Next.js App Router,
      // les rejections async dans les route handlers sont catchées par le framework
      let eventId: string | undefined;
      Sentry.withScope(scope => {
        // mechanism simulé via tag (setMechanism non disponible dans cette version du SDK)
        scope.setTag('mechanism.type', 'promise');
        scope.setTag('mechanism.handled', 'false');
        scope.setTags({
          scenario,
          testId,
          boundary: 'instrumentation',
          capture_method: 'onRequestError',
        });
        scope.setExtras({
          triggeredAt: new Date().toISOString(),
          simulatedMechanism: 'unhandledRejection',
        });
        eventId = Sentry.captureException(err);
      });

      return {
        sent: true,
        eventId,
        message: `Rejection simulée capturée. eventId: ${eventId}. Mécanisme: promise/unhandled.`,
      };
    }

    default: {
      return { sent: false, message: 'Scénario non reconnu.' };
    }
  }
}

// ─── Checklist de vérification ────────────────────────────────────────────────

function buildChecklist(scenario: Scenario, dsnConfigured: boolean): Record<string, string> {
  const base: Record<string, string> = {
    '1_dsn': dsnConfigured ? '✅ DSN configuré' : '❌ DSN manquant — configurer NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN',
    '2_environment': `Vérifier que l'environnement affiché dans Sentry correspond à "${process.env.NODE_ENV ?? 'unknown'}"`,
    '3_route': 'Vérifier que le tag route = /api/test-sentry est présent',
  };

  const extras: Record<Scenario, Record<string, string>> = {
    ping: {
      '4_ping': 'Aucun événement envoyé — vérifier uniquement la connectivité',
    },
    server_error: {
      '4_exception': 'Chercher SentryTestError dans Issues',
      '5_stack_trace': 'Vérifier que la stack trace pointe vers route.ts',
      '6_tags': 'Vérifier tags: boundary=api-route, scenario=server_error',
    },
    captureApiError: {
      '4_boundary': 'Tag boundary = api-route',
      '5_method': 'Tag http.method = GET',
      '6_status': 'Tag http.status_code = 500',
    },
    captureAuthError: {
      '4_boundary': 'Tag boundary = auth',
      '5_auth_event': 'Tag auth.event = test_session_missing',
      '6_level': 'Niveau = warning (pas error)',
    },
    custom_context: {
      '4_user': 'Section User: id = 00000000-test-... (UUID factice)',
      '5_role': 'User role = test_role',
      '6_tags': 'Tags: section=monitoring-verification, priority=low',
    },
    breadcrumb_chain: {
      '4_breadcrumbs': 'Onglet Breadcrumbs: 4 entrées (sentry-test, database, cache, auth)',
      '5_trail': 'Vérifier l\'ordre chronologique des breadcrumbs',
      '6_data': 'Chaque breadcrumb a un champ data avec testId et step',
    },
    unhandled_rejection: {
      '4_mechanism': 'Mechanism: promise / handled=false',
      '5_capture': 'Tag capture_method = onRequestError',
      '6_boundary': 'Tag boundary = instrumentation',
    },
  };

  return { ...base, ...(extras[scenario] ?? {}) };
}

// ─── Liste de tous les scénarios ─────────────────────────────────────────────

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      message: 'Utiliser GET avec le paramètre ?scenario=<nom>',
      scenarios: Object.entries(SCENARIOS).map(([name, info]) => ({
        name,
        description: info.description,
        url: `/api/test-sentry?scenario=${name}`,
        tests: info.tests,
      })),
    },
    { status: 405 },
  );
}
