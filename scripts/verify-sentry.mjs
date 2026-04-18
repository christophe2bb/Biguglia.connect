#!/usr/bin/env node
/**
 * scripts/verify-sentry.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Script de vérification automatisée du monitoring Sentry.
 *
 * Exécute tous les scénarios de test contre une instance en cours d'exécution
 * et produit un rapport de conformité détaillé.
 *
 * USAGE :
 *   node scripts/verify-sentry.mjs                         # localhost:3000
 *   node scripts/verify-sentry.mjs --url=https://staging.example.com
 *   node scripts/verify-sentry.mjs --token=mon-secret      # avec token de protection
 *   node scripts/verify-sentry.mjs --scenario=server_error # un seul scénario
 *   node scripts/verify-sentry.mjs --quiet                 # résumé uniquement
 *
 * PRÉREQUIS :
 *   • Le serveur Next.js doit être en cours d'exécution (npm run dev ou build)
 *   • Pour les environnements non-dev : SENTRY_TEST_ENABLED=true doit être défini
 */

import { parseArgs } from 'node:util';

// ─── Configuration ────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    url:      { type: 'string',  short: 'u', default: 'http://localhost:3000' },
    token:    { type: 'string',  short: 't', default: '' },
    scenario: { type: 'string',  short: 's', default: '' },
    quiet:    { type: 'boolean', short: 'q', default: false },
    timeout:  { type: 'string',  default: '10000' },
  },
  strict: false,
});

const BASE_URL = args.url.replace(/\/$/, '');
const TOKEN    = args.token;
const TIMEOUT  = parseInt(args.timeout, 10);
const QUIET    = args.quiet;

// ─── Scénarios à tester ───────────────────────────────────────────────────────

const ALL_SCENARIOS = [
  'ping',
  'server_error',
  'captureApiError',
  'captureAuthError',
  'custom_context',
  'breadcrumb_chain',
  'unhandled_rejection',
];

const SCENARIOS_TO_RUN = args.scenario
  ? [args.scenario]
  : ALL_SCENARIOS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

function log(msg)       { if (!QUIET) console.log(msg); }
function logAlways(msg) { console.log(msg); }
function logSection(title) {
  log('');
  log(c('bold', c('cyan', `── ${title} ${'─'.repeat(Math.max(0, 60 - title.length - 4))}`)));
}

// ─── Fetch avec timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Test d'un scénario ───────────────────────────────────────────────────────

async function testScenario(scenario) {
  const url = `${BASE_URL}/api/test-sentry?scenario=${scenario}`;
  const headers = TOKEN ? { 'X-Sentry-Test-Token': TOKEN } : {};

  const startAt = Date.now();
  let result = null;
  let httpStatus = null;
  let error = null;

  try {
    const res = await fetchWithTimeout(url, { headers });
    httpStatus = res.status;
    result = await res.json();
  } catch (err) {
    error = err.message;
  }

  const duration = Date.now() - startAt;

  return { scenario, url, httpStatus, result, error, duration };
}

// ─── Validation d'un résultat ─────────────────────────────────────────────────

function validate(scenario, httpStatus, result, error) {
  const issues = [];
  const passes = [];

  if (error) {
    issues.push(`Erreur réseau : ${error}`);
    return { passes, issues, score: 0 };
  }

  if (httpStatus === 403) {
    issues.push('Route bloquée (403). Définir SENTRY_TEST_ENABLED=true en staging.');
    return { passes, issues, score: 0 };
  }

  if (httpStatus !== 200) {
    issues.push(`HTTP ${httpStatus} inattendu`);
    return { passes, issues, score: 0 };
  }

  // Validations communes
  if (result?.ok === true)              passes.push('ok=true');
  else                                  issues.push('ok !== true dans la réponse');

  if (result?.testId)                   passes.push(`testId présent : ${result.testId}`);
  else                                  issues.push('testId absent');

  if (result?.environment)              passes.push(`environment = ${result.environment}`);
  else                                  issues.push('environment absent');

  if (result?.dsnConfigured === true)   passes.push('DSN configuré');
  else if (result?.dsnConfigured === false)
    issues.push('⚠️  DSN non configuré — Sentry désactivé sur ce serveur');

  // Validations spécifiques au scénario
  switch (scenario) {
    case 'ping':
      if (result?.sentryEventSent === false) passes.push('ping correct (pas d\'événement envoyé)');
      break;

    case 'server_error':
    case 'breadcrumb_chain':
    case 'unhandled_rejection':
      if (result?.sentryEventSent === true) passes.push('événement Sentry envoyé');
      else issues.push('sentryEventSent = false');
      if (result?.eventId)  passes.push(`eventId présent : ${result.eventId}`);
      else                  issues.push('eventId absent (DSN configuré ?)');
      break;

    case 'captureApiError':
    case 'captureAuthError':
    case 'custom_context':
      if (result?.sentryEventSent === true) passes.push('événement Sentry envoyé via helper');
      else issues.push('sentryEventSent = false');
      break;
  }

  const total = passes.length + issues.length;
  const score = total > 0 ? Math.round((passes.length / total) * 100) : 0;

  return { passes, issues, score };
}

// ─── Rapport final ────────────────────────────────────────────────────────────

function printReport(results) {
  logSection('RAPPORT DE VÉRIFICATION SENTRY');

  let totalPass = 0;
  let totalFail = 0;
  let totalSkipped = 0;

  for (const r of results) {
    const { passes, issues, score } = validate(r.scenario, r.httpStatus, r.result, r.error);

    const statusIcon = issues.length === 0 ? c('green', '✅') :
                       passes.length > 0    ? c('yellow', '⚠️ ') :
                                              c('red', '❌');

    logAlways(`${statusIcon} ${c('bold', r.scenario.padEnd(22))} [${r.duration}ms] HTTP ${r.httpStatus ?? 'ERR'} — Score: ${score}%`);

    if (!QUIET) {
      passes.forEach(p => log(`     ${c('green', '+')} ${p}`));
      issues.forEach(i => log(`     ${c('red', '!')} ${i}`));
    }

    if (issues.length === 0)           totalPass++;
    else if (passes.length > 0)        totalSkipped++; // partiel
    else                               totalFail++;
  }

  log('');
  logSection('RÉSUMÉ');
  logAlways(`  ${c('green', `✅ ${totalPass} scénarios OK`)}`);
  if (totalSkipped > 0)
    logAlways(`  ${c('yellow', `⚠️  ${totalSkipped} scénarios partiels (DSN ou accès manquant)`)}`);
  if (totalFail > 0)
    logAlways(`  ${c('red', `❌ ${totalFail} scénarios en échec`)}`);

  log('');
  logAlways(c('bold', '  Prochaines étapes :'));
  log(`  1. Ouvrir https://sentry.io → Issues → chercher "SentryTestError"`);
  log(`  2. Vérifier : route, environment, tags, stack trace`);
  log(`  3. Onglet Breadcrumbs sur l'issue breadcrumb_chain (4 entrées)`);
  log(`  4. Section User sur l'issue custom_context (UUID fictif)`);
  log('');

  // DSN check
  const hasDsnIssue = results.some(r => r.result?.dsnConfigured === false);
  if (hasDsnIssue) {
    logAlways(c('yellow', '  ⚠️  DSN non configuré — aucun événement réellement envoyé à Sentry.'));
    logAlways(c('dim', '     Définir NEXT_PUBLIC_SENTRY_DSN dans .env.local et redémarrer.'));
    log('');
  }

  return totalFail === 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  logSection('VÉRIFICATION SENTRY MONITORING');
  log(`  URL cible   : ${c('cyan', BASE_URL)}`);
  log(`  Scénarios   : ${c('cyan', SCENARIOS_TO_RUN.join(', '))}`);
  log(`  Token       : ${TOKEN ? c('green', '✓ défini') : c('dim', 'absent')}`);
  log(`  Timeout     : ${TIMEOUT}ms`);
  log('');

  // Ping de connectivité
  log(c('dim', '  Vérification de la connectivité…'));
  try {
    await fetchWithTimeout(`${BASE_URL}/api/test-sentry?scenario=ping`);
    log(c('green', '  ✓ Serveur accessible\n'));
  } catch {
    logAlways(c('red', `  ❌ Serveur inaccessible : ${BASE_URL}`));
    logAlways(c('dim', '     Démarrer d\'abord le serveur Next.js (npm run dev)\n'));
    process.exit(1);
  }

  // Exécution des scénarios
  const results = [];
  for (const scenario of SCENARIOS_TO_RUN) {
    log(c('dim', `  → ${scenario}…`));
    const r = await testScenario(scenario);
    results.push(r);
  }

  const allOk = printReport(results);
  process.exit(allOk ? 0 : 1);
}

main().catch(err => {
  console.error(c('red', `Erreur fatale : ${err.message}`));
  process.exit(1);
});
