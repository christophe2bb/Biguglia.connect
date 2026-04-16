/**
 * scripts/audit-rls.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Audit RLS complet — Biguglia Connect
 *
 * Connexion : PostgreSQL direct via pg (service_role = superuser dans Supabase)
 * Lit pg_tables + pg_policies directement, aucune fonction RPC nécessaire.
 *
 * USAGE :
 *   node scripts/audit-rls.mjs
 *
 * VARIABLES REQUISES (.env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL     = https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    = eyJ...
 *   SUPABASE_DB_PASSWORD         = (optionnel — si absent, tentative sans mdp)
 *
 * Si la connexion directe échoue, le script affiche les requêtes SQL
 * à exécuter manuellement dans Supabase SQL Editor.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

// ── Charger .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8');
    const env = {};
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    }
    return env;
  } catch { return {}; }
}

const env      = loadEnv();
const SUPA_URL = (env['NEXT_PUBLIC_SUPABASE_URL'] ?? '').replace(/\/$/, '');
const DB_PASS  = env['SUPABASE_DB_PASSWORD'] ?? env['POSTGRES_PASSWORD'] ?? '';

// Extraire le project ref depuis l'URL
const PROJECT_REF = SUPA_URL.replace('https://', '').split('.')[0];

if (!PROJECT_REF) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL manquant');
  process.exit(1);
}

// Connection string Supabase (port 5432 = direct, 6543 = pooler)
// Password = DB password (distinct de la service-role key)
const DB_HOST = `db.${PROJECT_REF}.supabase.co`;
const DB_USER = 'postgres';
const DB_NAME = 'postgres';
const DB_PORT = 5432;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  red:    s => `\x1b[31m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
};

// ── Tables critiques ──────────────────────────────────────────────────────────
const CRITICAL = [
  'profiles', 'messages', 'conversations', 'conversation_participants',
  'listings', 'job_offers', 'job_demands', 'reports', 'signalements',
  'artisan_profiles', 'service_requests', 'help_requests',
  'notifications', 'events', 'forum_topics', 'forum_comments',
  'associations', 'collection_items', 'equipment_items', 'lost_found_items',
  'group_outings', 'outing_participants', 'theme_memberships',
  'artisan_reviews', 'help_request_participants',
];

// Tables dont USING(true) en SELECT est intentionnel
const PUBLIC_READ_OK = new Set([
  'artisan_profiles', 'associations', 'listings', 'events', 'forum_topics',
  'sectors', 'neighborhoods', 'categories', 'trade_categories',
  'collection_items', 'equipment_items', 'lost_found_items',
  'help_requests', 'group_outings', 'job_offers', 'job_demands',
  'artisan_reviews',
]);

function isTrue(expr) {
  if (!expr) return false;
  return ['true', '(true)'].includes(expr.trim().toLowerCase());
}
function isPublicReadOk(table, cmd) {
  return PUBLIC_READ_OK.has(table) && (cmd === 'SELECT' || cmd === 'ALL');
}

// ── Requêtes SQL ──────────────────────────────────────────────────────────────
const SQL_TABLES = `
  SELECT tablename::text, rowsecurity
  FROM   pg_tables
  WHERE  schemaname = 'public'
  ORDER  BY tablename;
`;

const SQL_POLICIES = `
  SELECT
    tablename::text,
    policyname::text,
    cmd::text,
    qual::text,
    with_check::text,
    roles::text[]
  FROM   pg_policies
  WHERE  schemaname = 'public'
  ORDER  BY tablename, policyname;
`;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(C.bold('\n══════════════════════════════════════════════════════════════'));
  console.log(C.bold('   🔒 AUDIT RLS SUPABASE — Biguglia Connect'));
  console.log(C.bold(`   📅 ${new Date().toISOString()}`));
  console.log(C.bold(`   🗄️  ${DB_HOST}`));
  console.log(C.bold('══════════════════════════════════════════════════════════════\n'));

  // ── Connexion PostgreSQL ───────────────────────────────────────────────────
  const client = new Client({
    host:     DB_HOST,
    port:     DB_PORT,
    user:     DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    ssl:      { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 10000,
  });

  let tables = [], policies = [];

  try {
    console.log(C.dim(`   ⚙️  Connexion à ${DB_HOST}:${DB_PORT}...`));
    await client.connect();
    console.log(C.dim('   ✔  Connecté\n'));

    const [tRes, pRes] = await Promise.all([
      client.query(SQL_TABLES),
      client.query(SQL_POLICIES),
    ]);

    tables   = tRes.rows;
    policies = pRes.rows;
    await client.end();
  } catch (connErr) {
    await client.end().catch(() => {});

    console.log(C.yellow(`   ⚠️  Connexion directe impossible : ${connErr.message}`));
    console.log(C.yellow('   → Le mot de passe DB (≠ service-role key) est requis pour la connexion directe.\n'));
    console.log(C.bold('   ► Exécutez ces requêtes dans Supabase SQL Editor et analysez les résultats :\n'));
    console.log(C.bold('   ── SECTION 1 — RLS activé (tout doit être true) ──────────'));
    console.log(C.cyan(`
SELECT tablename, rowsecurity
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER  BY tablename;
`));
    console.log(C.bold('   ── SECTION 2 — Policies (chercher USING(true) / WITH CHECK(true)) ──'));
    console.log(C.cyan(`
SELECT tablename, policyname, cmd, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
ORDER  BY tablename, policyname;
`));
    console.log(C.bold('   ── SECTION 3 — Tables critiques sans policy (dangereux si RLS ON) ──'));
    console.log(C.cyan(`
SELECT t.tablename, t.rowsecurity,
       count(p.policyname) AS policy_count
FROM   pg_tables t
LEFT JOIN pg_policies p
       ON p.schemaname = 'public' AND p.tablename = t.tablename
WHERE  t.schemaname = 'public'
GROUP  BY t.tablename, t.rowsecurity
HAVING t.rowsecurity = false
    OR count(p.policyname) = 0
ORDER  BY t.tablename;
`));
    console.log(C.bold('   ── SECTION 4 — Policies trop larges (risque cross-user) ──────────'));
    console.log(C.cyan(`
SELECT tablename, policyname, cmd, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
  AND (qual IN ('true', '(true)') OR with_check IN ('true', '(true)'))
ORDER  BY tablename;
`));
    console.log(C.dim('\n   Ajoutez SUPABASE_DB_PASSWORD dans .env.local pour automatiser cet audit.'));
    console.log(C.dim('   (Mot de passe DB visible dans Supabase Dashboard → Project Settings → Database)\n'));
    process.exit(4);
  }

  const byTable = {};
  for (const p of policies) (byTable[p.tablename] ??= []).push(p);

  let criticals = 0, warnings = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — RLS activé partout
  // ══════════════════════════════════════════════════════════════════════════
  console.log(C.bold(C.cyan('━━ SECTION 1 — RLS activé sur toutes les tables publiques')));

  const rlsOff = tables.filter(t => !t.rowsecurity);
  const rlsOn  = tables.filter(t =>  t.rowsecurity);

  console.log(`\n   Tables : ${C.bold(tables.length)}   RLS ON : ${C.green(rlsOn.length)}   RLS OFF : ${rlsOff.length > 0 ? C.red(rlsOff.length) : C.green('0')}\n`);

  if (rlsOff.length === 0) {
    console.log(C.green('   ✅ RLS activé sur toutes les tables\n'));
  } else {
    criticals++;
    console.log(C.red(`   🔴 CRITIQUE — ${rlsOff.length} table(s) SANS RLS :\n`));
    for (const t of rlsOff) {
      const crit = CRITICAL.includes(t.tablename);
      console.log(`      • ${crit ? C.red(t.tablename + '  ← TABLE CRITIQUE') : C.yellow(t.tablename)}`);
    }
    console.log(C.dim('\n   Correction :'));
    for (const t of rlsOff) {
      console.log(C.dim(`     ALTER TABLE public.${t.tablename} ENABLE ROW LEVEL SECURITY;`));
    }
    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — Tables critiques en détail
  // ══════════════════════════════════════════════════════════════════════════
  console.log(C.bold(C.cyan('━━ SECTION 2 — Tables critiques')));
  console.log(C.dim('     Vérifie : RLS ON + policies + USING/WITH CHECK\n'));

  for (const name of CRITICAL) {
    const tbl  = tables.find(t => t.tablename === name);
    const pols = byTable[name] ?? [];

    if (!tbl) {
      console.log(`   ${C.dim('⬜  ' + name + ' (absente)')}`);
      continue;
    }

    const issues = [];
    let sev = 'OK';

    if (!tbl.rowsecurity) {
      sev = 'CRITICAL';
      issues.push({ l: 'C', m: 'RLS DÉSACTIVÉ — accès total sans restriction' });
    } else if (pols.length === 0) {
      sev = 'WARNING';
      issues.push({ l: 'W', m: 'RLS ON mais 0 policy → accès bloqué pour tous' });
    }

    for (const p of pols) {
      const uT = isTrue(p.qual), cT = isTrue(p.with_check);
      if (!uT && !cT) continue;
      if (isPublicReadOk(name, p.cmd)) continue;
      const parts = [...(uT ? ['USING(true)'] : []), ...(cT ? ['WITH CHECK(true)'] : [])];
      const isWrite = ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(p.cmd);
      if (cT || isWrite) {
        sev = 'CRITICAL';
        issues.push({ l: 'C', m: `"${p.policyname}" [${p.cmd}]: ${parts.join(' + ')} → écriture sans restriction` });
      } else {
        if (sev !== 'CRITICAL') sev = 'WARNING';
        issues.push({ l: 'W', m: `"${p.policyname}" [${p.cmd}]: ${parts.join(' + ')} → lecture cross-user` });
      }
    }

    const icon = sev === 'CRITICAL' ? C.red('🔴') : sev === 'WARNING' ? C.yellow('🟡') : C.green('✅');
    const rlsStr = tbl.rowsecurity ? C.green('ON ') : C.red('OFF');
    console.log(`   ${icon} ${C.bold(name.padEnd(34))} RLS:${rlsStr}  policies:${pols.length}`);

    for (const p of pols) {
      const uT = isTrue(p.qual), cT = isTrue(p.with_check);
      const pubOk = isPublicReadOk(name, p.cmd) && uT;
      const flag = (uT || cT) ? (pubOk ? C.dim(' [public ✓]') : C.yellow(' ⚠️ true')) : '';
      console.log(`      ${C.dim('├')} [${p.cmd.padEnd(6)}] ${p.policyname}${flag}`);
    }

    for (const iss of issues) {
      const m = iss.l === 'C' ? C.red('🔴 ' + iss.m) : C.yellow('🟡 ' + iss.m);
      console.log(`      ${m}`);
      if (iss.l === 'C') criticals++; else warnings++;
    }
    if (issues.length) console.log();
  }
  console.log();

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — Scan global true policies
  // ══════════════════════════════════════════════════════════════════════════
  console.log(C.bold(C.cyan('━━ SECTION 3 — Scan global USING(true) / WITH CHECK(true)')));
  console.log(C.dim('     Hors tables publiques connues\n'));

  const danger = policies.filter(p =>
    (isTrue(p.qual) || isTrue(p.with_check)) && !isPublicReadOk(p.tablename, p.cmd)
  );

  if (danger.length === 0) {
    console.log(C.green('   ✅ Aucune policy USING(true)/WITH CHECK(true) non maîtrisée\n'));
  } else {
    const seen = new Set();
    for (const p of danger) {
      const key = `${p.tablename}:${p.policyname}:${p.cmd}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const parts = [...(isTrue(p.qual) ? ['USING(true)'] : []), ...(isTrue(p.with_check) ? ['WITH CHECK(true)'] : [])];
      const crit = CRITICAL.includes(p.tablename);
      console.log(`   ${crit ? C.red('🔴') : C.yellow('🟡')}  ${C.bold(p.tablename.padEnd(32))} "${p.policyname}" [${p.cmd}] : ${parts.join(' + ')}`);
    }
    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — Tables RLS ON sans policy
  // ══════════════════════════════════════════════════════════════════════════
  console.log(C.bold(C.cyan('━━ SECTION 4 — Tables RLS ON sans aucune policy')));
  console.log(C.dim('     RLS ON + 0 policy = accès bloqué pour tous\n'));

  const noPol = tables.filter(t => t.rowsecurity && !(byTable[t.tablename]?.length > 0));
  if (noPol.length === 0) {
    console.log(C.green('   ✅ Toutes les tables avec RLS ont au moins une policy\n'));
  } else {
    for (const t of noPol) {
      const crit = CRITICAL.includes(t.tablename);
      console.log(`   ${crit ? C.red('🔴') : C.yellow('🟡')}  ${t.tablename}${crit ? C.red(' ← CRITIQUE') : ''}`);
    }
    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RÉSUMÉ
  // ══════════════════════════════════════════════════════════════════════════
  console.log(C.bold('══════════════════════════════════════════════════════════════'));
  console.log(C.bold('   RÉSUMÉ'));
  console.log(C.bold('══════════════════════════════════════════════════════════════'));
  console.log(`   Tables analysées         : ${C.bold(tables.length)}`);
  console.log(`   Policies analysées        : ${C.bold(policies.length)}`);
  console.log(`   Tables sans RLS           : ${rlsOff.length > 0 ? C.red(rlsOff.length) : C.green('0')}`);
  console.log(`   ${C.red('🔴 Critiques')}              : ${criticals > 0 ? C.red(criticals) : C.green('0')}`);
  console.log(`   ${C.yellow('🟡 Warnings')}               : ${warnings  > 0 ? C.yellow(warnings)  : C.green('0')}`);

  if (criticals === 0 && warnings === 0) {
    console.log(C.green('\n   ✅ AUDIT RÉUSSI — RLS solide, aucun accès cross-user détecté\n'));
    process.exit(0);
  } else if (criticals > 0) {
    console.log(C.red(`\n   🔴 AUDIT ÉCHOUÉ — ${criticals} problème(s) critique(s)\n`));
    process.exit(2);
  } else {
    console.log(C.yellow(`\n   🟡 AUDIT PARTIEL — ${warnings} warning(s)\n`));
    process.exit(1);
  }
}

main().catch(e => {
  console.error(C.red(`\n❌  Erreur : ${e.message}\n`));
  process.exit(3);
});
