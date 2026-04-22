/**
 * Page de vérification du monitoring Sentry — /test-sentry
 * ──────────────────────────────────────────────────────────────────────────────
 * Permet de déclencher chaque scénario de test Sentry depuis le navigateur
 * et de voir en temps réel :
 *   • Si le DSN est configuré
 *   • Si l'événement a été envoyé (eventId)
 *   • La checklist de vérification dans Sentry
 *   • Un test client-side (erreur JS dans le navigateur)
 *
 * ACCÈS : désactivée automatiquement si SENTRY_TEST_ENABLED n'est pas défini
 *         en production (la route API renvoie 403).
 *
 * Cette page est un Client Component pour permettre :
 *   • Le déclenchement d'erreurs côté navigateur (test client Sentry)
 *   • Le suivi d'état des appels API (loading, résultats)
 */

'use client';

import * as Sentry from '@sentry/nextjs';
import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestResult {
  ok: boolean;
  testId: string;
  scenario: string;
  description: string;
  environment: string;
  dsnConfigured: boolean;
  sentryEventSent: boolean;
  eventId: string | null;
  message: string;
  nextSteps: string[];
  checklist: Record<string, string>;
  error?: string;
}

interface ScenarioConfig {
  name: string;
  label: string;
  description: string;
  icon: string;
  side: 'server' | 'client';
  severity: 'error' | 'warning' | 'info';
}

// ─── Configuration des scénarios ──────────────────────────────────────────────

const SCENARIOS: ScenarioConfig[] = [
  {
    name: 'ping',
    label: 'Ping (sans erreur)',
    description: 'Vérifie que la route API répond et que le DSN est configuré. Aucun événement envoyé.',
    icon: '🏓',
    side: 'server',
    severity: 'info',
  },
  {
    name: 'server_error',
    label: 'Erreur serveur (exception)',
    description: 'Déclenche une exception Node.js côté serveur capturée par captureException.',
    icon: '💥',
    side: 'server',
    severity: 'error',
  },
  {
    name: 'captureApiError',
    label: 'captureApiError (helper)',
    description: 'Teste notre helper centralisé avec les tags route / method / status_code.',
    icon: '🔌',
    side: 'server',
    severity: 'error',
  },
  {
    name: 'captureAuthError',
    label: 'captureAuthError (auth)',
    description: 'Teste le helper pour les erreurs d\'authentification. Niveau: warning.',
    icon: '🔐',
    side: 'server',
    severity: 'warning',
  },
  {
    name: 'custom_context',
    label: 'Contexte utilisateur + tags',
    description: 'Envoie une erreur avec userId, rôle, tags et extras pour vérifier le contexte.',
    icon: '👤',
    side: 'server',
    severity: 'warning',
  },
  {
    name: 'breadcrumb_chain',
    label: 'Fil d\'Ariane (breadcrumbs)',
    description: 'Ajoute 4 breadcrumbs (database, cache, auth) puis déclenche une erreur.',
    icon: '🍞',
    side: 'server',
    severity: 'error',
  },
  {
    name: 'unhandled_rejection',
    label: 'Promise rejection non gérée',
    description: 'Simule une rejection non gérée capturée par instrumentation.ts.',
    icon: '⚡',
    side: 'server',
    severity: 'error',
  },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TestSentryPageClient() {
  const [results, setResults] = useState<Record<string, TestResult | { error: string }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [clientTestSent, setClientTestSent] = useState(false);
  const [clientEventId, setClientEventId] = useState<string | null>(null);

  // ── Appel à la route API serveur
  const runServerScenario = useCallback(async (scenario: string) => {
    setLoading(prev => ({ ...prev, [scenario]: true }));
    try {
      const res = await fetch(`/api/test-sentry?scenario=${scenario}`);
      const data = await res.json() as TestResult;
      setResults(prev => ({ ...prev, [scenario]: data }));
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [scenario]: { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      }));
    } finally {
      setLoading(prev => ({ ...prev, [scenario]: false }));
    }
  }, []);

  // ── Erreur côté client (navigateur)
  const runClientTest = useCallback(() => {
    const testId = `sentry-client-test-${Date.now()}`;

    // Breadcrumb avant l'erreur
    Sentry.addBreadcrumb({
      category: 'sentry-test',
      message: 'Client-side test triggered from test-sentry page',
      data: { testId, action: 'button_click' },
      level: 'info',
    });

    const err = new Error(
      `[TEST Sentry] Client-side error — testId: ${testId}. ` +
      'Ceci est une erreur de test volontaire depuis le navigateur. À ignorer.',
    );
    err.name = 'SentryTestClientError';

    const eventId = Sentry.captureException(err, {
      tags: {
        scenario: 'client_error',
        testId,
        boundary: 'client-component',
        page: '/test-sentry',
      },
      extra: {
        triggeredAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    });

    setClientEventId(eventId ?? null);
    setClientTestSent(true);
  }, []);

  // ── Run all server scenarios
  const runAll = useCallback(async () => {
    for (const s of SCENARIOS) {
      if (s.side === 'server') {
        await runServerScenario(s.name);
        // Petit délai pour ne pas saturer
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }, [runServerScenario]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* ── En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔬</span>
            <h1 className="text-2xl font-bold text-gray-900">
              Vérification Sentry Monitoring
            </h1>
          </div>
          <p className="text-gray-600">
            Déclenche des erreurs de test pour vérifier que Sentry remonte les bonnes
            informations : route, contexte, type d&apos;erreur, environnement.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono">
              Env: {process.env.NODE_ENV ?? 'unknown'}
            </span>
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
              📍 /test-sentry
            </span>
          </div>
        </div>

        {/* ── Avertissement */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Environnement de test uniquement</p>
              <p className="text-amber-700 text-sm mt-1">
                Ces boutons envoient de vraies erreurs à Sentry. En production, les scénarios serveur
                sont bloqués (403) sauf si <code className="bg-amber-100 px-1 rounded">SENTRY_TEST_ENABLED=true</code>.
                Le test client fonctionne toujours si le DSN est configuré.
              </p>
            </div>
          </div>
        </div>

        {/* ── Test client (navigateur) */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>🌐</span> Test côté navigateur (Client)
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Déclenche une erreur JavaScript capturée par le SDK Sentry client.
                Vérifie la configuration <code className="bg-gray-100 px-1 rounded">instrumentation-client.ts</code>.
              </p>
            </div>
            <button
              onClick={runClientTest}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Déclencher erreur client
            </button>
          </div>

          {clientTestSent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium text-sm">✅ Erreur client envoyée</p>
              {clientEventId && (
                <p className="text-green-700 text-sm mt-1">
                  Event ID : <code className="bg-green-100 px-1 rounded font-mono">{clientEventId}</code>
                </p>
              )}
              <div className="mt-3 text-sm text-green-700">
                <p className="font-medium mb-1">Vérifier dans Sentry :</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Issue avec le nom <strong>SentryTestClientError</strong></li>
                  <li>Tags : <code>boundary=client-component</code>, <code>page=/test-sentry</code></li>
                  <li>Breadcrumb &quot;Client-side test triggered&quot;</li>
                  <li>Environnement : <strong>{process.env.NODE_ENV}</strong></li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* ── Bouton "Tout tester" */}
        <div className="flex justify-end mb-4">
          <button
            onClick={runAll}
            className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>🚀</span> Lancer tous les scénarios serveur
          </button>
        </div>

        {/* ── Scénarios serveur */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🖥️</span> Scénarios serveur (API Route)
          </h2>

          <div className="space-y-4">
            {SCENARIOS.map(scenario => {
              const result = results[scenario.name];
              const isLoading = loading[scenario.name];

              return (
                <div
                  key={scenario.name}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{scenario.icon}</span>
                        <h3 className="font-semibold text-gray-900">{scenario.label}</h3>
                        <SeverityBadge severity={scenario.severity} />
                      </div>
                      <p className="text-sm text-gray-500">{scenario.description}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        GET /api/test-sentry?scenario={scenario.name}
                      </p>
                    </div>
                    <button
                      onClick={() => runServerScenario(scenario.name)}
                      disabled={isLoading}
                      className={`shrink-0 text-sm font-medium px-4 py-2 rounded-lg transition-colors
                        ${isLoading
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-800 hover:bg-gray-900 text-white'
                        }`}
                    >
                      {isLoading ? '⏳ En cours…' : 'Tester'}
                    </button>
                  </div>

                  {result && <ScenarioResult result={result} />}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Guide de vérification Sentry */}
        <section className="mt-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📋</span> Guide de vérification dans Sentry
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <CheckGuideCard
              title="1. Issues — Erreurs"
              icon="🐛"
              steps={[
                'Aller dans Issues → All Issues',
                'Chercher "SentryTestError" ou le testId',
                'Vérifier : route, environment, niveau',
                'Cliquer sur l\'issue → voir la stack trace',
                'Onglet Tags → vérifier boundary, scenario',
              ]}
            />
            <CheckGuideCard
              title="2. Contexte utilisateur"
              icon="👤"
              steps={[
                'Ouvrir l\'issue custom_context',
                'Section User → id doit être l\'UUID test',
                'role = test_role',
                'Jamais d\'email ni de nom réel',
              ]}
            />
            <CheckGuideCard
              title="3. Breadcrumbs"
              icon="🍞"
              steps={[
                'Ouvrir l\'issue breadcrumb_chain',
                'Onglet Breadcrumbs',
                '4 entrées : sentry-test, database, cache, auth',
                'Chaque breadcrumb a step + data',
                'Ordre chronologique correct',
              ]}
            />
            <CheckGuideCard
              title="4. Environnement & Performance"
              icon="⚡"
              steps={[
                'Filter par Environment (development/production)',
                'Aller dans Performance → Transactions',
                'Chercher /api/test-sentry',
                'Vérifier durée, status, traces',
              ]}
            />
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  const styles = {
    error:   'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info:    'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function ScenarioResult({ result }: { result: TestResult | { error: string } }) {
  if ('error' in result) {
    return (
      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-red-700 text-sm">❌ Erreur réseau : {result.error}</p>
      </div>
    );
  }

  const isBlocked = !result.ok && result.scenario;

  return (
    <div className={`mt-3 rounded-lg p-4 border ${
      isBlocked
        ? 'bg-amber-50 border-amber-200'
        : result.sentryEventSent
        ? 'bg-green-50 border-green-200'
        : 'bg-blue-50 border-blue-200'
    }`}>
      {/* Résumé */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className={`font-medium text-sm ${
            isBlocked ? 'text-amber-800' : result.sentryEventSent ? 'text-green-800' : 'text-blue-800'
          }`}>
            {isBlocked ? '⚠️ Bloqué (protection production)' :
             result.sentryEventSent ? '✅ Événement envoyé à Sentry' :
             'ℹ️ Résultat'}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">{result.message}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded font-mono ${
            result.dsnConfigured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            DSN {result.dsnConfigured ? '✓' : '✗'}
          </span>
          {result.environment && (
            <p className="text-xs text-gray-500 mt-1">{result.environment}</p>
          )}
        </div>
      </div>

      {/* Event ID */}
      {result.eventId && (
        <div className="bg-white rounded px-3 py-2 border border-gray-200 mb-3">
          <p className="text-xs text-gray-500">Event ID Sentry</p>
          <code className="text-sm font-mono text-gray-800">{result.eventId}</code>
        </div>
      )}

      {/* Test ID */}
      {result.testId && (
        <div className="text-xs text-gray-500 mb-3">
          Test ID : <code className="font-mono">{result.testId}</code>
        </div>
      )}

      {/* Checklist */}
      {result.checklist && Object.keys(result.checklist).length > 0 && (
        <details className="mb-3">
          <summary className="text-xs font-medium text-gray-700 cursor-pointer">
            📋 Checklist de vérification ({Object.keys(result.checklist).length} points)
          </summary>
          <ul className="mt-2 space-y-1">
            {Object.entries(result.checklist).map(([key, value]) => (
              <li key={key} className="text-xs text-gray-600 flex items-start gap-1">
                <span className="mt-0.5 shrink-0">→</span>
                <span>{value}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Next steps */}
      {result.nextSteps && result.nextSteps.length > 0 && (
        <details>
          <summary className="text-xs font-medium text-gray-700 cursor-pointer">
            🔍 Prochaines étapes ({result.nextSteps.length})
          </summary>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            {result.nextSteps.map((step, i) => (
              <li key={i} className="text-xs text-gray-600">{step}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function CheckGuideCard({
  title,
  icon,
  steps,
}: {
  title: string;
  icon: string;
  steps: string[];
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <ol className="space-y-1.5 list-decimal list-inside">
        {steps.map((step, i) => (
          <li key={i} className="text-xs text-gray-600">{step}</li>
        ))}
      </ol>
    </div>
  );
}
