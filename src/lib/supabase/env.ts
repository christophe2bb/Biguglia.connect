/**
 * supabase/env.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Source unique de vérité pour la validation des variables d'environnement
 * Supabase utilisées dans toute l'application (client, server, middleware,
 * auth-helper).
 *
 * Problèmes résolus :
 *  1. `cleanEnv()` était dupliquée dans client.ts et server.ts avec des
 *     messages d'erreur différents et un comportement légèrement divergent.
 *  2. middleware.ts utilisait `(value ?? '').trim()` — silencieux sur env vide.
 *  3. auth-helper.ts utilisait `process.env.X!` sans aucune validation.
 *  4. client.ts ne validait les env qu'au premier appel à createClient()
 *     (lazy) — auth et Realtime échouaient silencieusement avant que l'erreur
 *     ne remonte. Correction : assertSupabaseClientEnv() valide au boot.
 *
 * Usage :
 *  import { getSupabaseEnv, getSupabaseAdminEnv } from '@/lib/supabase/env';
 *
 *  const { url, anonKey } = getSupabaseEnv();             // client + server SSR
 *  const { url, serviceRoleKey } = getSupabaseAdminEnv(); // server admin only
 *  assertSupabaseClientEnv();                             // boot-time check (client.ts)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SÉCURITÉ — getSupabaseAdminEnv() retourne SUPABASE_SERVICE_ROLE_KEY.
 * Ne JAMAIS appeler getSupabaseAdminEnv() dans un Client Component.
 *
 * Pourquoi ce fichier n'a PAS 'server-only' :
 *   client.ts (navigateur) importe assertSupabaseClientEnv() et SupabasePublicEnv
 *   depuis ce même fichier. Ajouter 'server-only' ici casserait l'initialisation
 *   du client Supabase côté navigateur.
 *   La garde 'server-only' est placée dans server.ts, auth-helper.ts,
 *   admin-guard.ts et admin-layout-guard.ts — les seuls modules qui appellent
 *   effectivement getSupabaseAdminEnv() ou exposent la clé service-role.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

export interface SupabaseAdminEnv {
  url: string;
  serviceRoleKey: string;
}

/** Résultat d'une validation au boot (sans lever d'exception) */
export interface EnvValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Env nettoyée si ok=true, null sinon */
  env: SupabasePublicEnv | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** URL minimale attendue pour une instance Supabase */
const SUPABASE_URL_PREFIX = 'https://';

/**
 * Suffixe de domaine attendu pour les projets hébergés sur Supabase Cloud.
 * Les instances self-hosted n'ont pas ce suffixe — voir getSupabaseProjectRef().
 */
const SUPABASE_CLOUD_SUFFIX = '.supabase.co';

/**
 * Longueur minimale d'une clé JWT Supabase (anon ou service role).
 * Les vraies clés font ~140 caractères (en-tête JWT Base64 + payload + sig).
 * On accepte toute clé ≥ 20 chars pour rester flexible face aux clés de test.
 */
export const MIN_KEY_LENGTH = 20;

// ─── Validation interne ───────────────────────────────────────────────────────

/**
 * Nettoie et valide une variable d'environnement.
 *
 * @param value   Valeur brute de process.env
 * @param name    Nom de la variable (pour les messages d'erreur)
 * @param opts    Options de validation supplémentaires
 * @returns       Valeur nettoyée (trim())
 * @throws        Error si la variable est absente, vide ou invalide
 */
export function cleanEnv(
  value: string | undefined,
  name: string,
  opts: {
    /** Préfixe que la valeur DOIT avoir (ex: 'https://') */
    mustStartWith?: string;
    /** Longueur minimale après trim */
    minLength?: number;
    /** Nom du contexte pour le message d'erreur (ex: '[Supabase/server]') */
    context?: string;
  } = {},
): string {
  const ctx = opts.context ?? '[Supabase]';

  if (!value || value.trim().length === 0) {
    throw new Error(
      `${ctx} Variable d'environnement manquante ou vide : ${name}\n` +
      `  → Vérifiez votre .env.local et votre dashboard Vercel/Netlify.`,
    );
  }

  const cleaned = value.trim();

  // Avertir si un nettoyage a été nécessaire (espaces ou \n parasites)
  if (cleaned !== value) {
    console.warn(
      `${ctx} ⚠️  ${name} contenait des espaces/sauts de ligne — nettoyé automatiquement.\n` +
      `  → Corrigez la variable dans votre dashboard Vercel / .env.local.`,
    );
  }

  if (opts.mustStartWith && !cleaned.startsWith(opts.mustStartWith)) {
    throw new Error(
      `${ctx} ${name} est invalide : doit commencer par "${opts.mustStartWith}".\n` +
      `  → Valeur reçue (tronquée) : "${cleaned.slice(0, 30)}…"`,
    );
  }

  if (opts.minLength !== undefined && cleaned.length < opts.minLength) {
    throw new Error(
      `${ctx} ${name} est trop courte (${cleaned.length} chars, min ${opts.minLength}).\n` +
      `  → Valeur reçue (tronquée) : "${cleaned.slice(0, 20)}…"`,
    );
  }

  return cleaned;
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Retourne les variables d'environnement publiques Supabase validées.
 * Utilisable dans : client.ts, server.ts, middleware.ts, auth-helper.ts.
 *
 * @throws Error si NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY
 *         sont absentes, vides ou malformées.
 */
export function getSupabaseEnv(): SupabasePublicEnv {
  return {
    url: cleanEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL',
      {
        context: '[Supabase]',
        mustStartWith: SUPABASE_URL_PREFIX,
      },
    ),
    anonKey: cleanEnv(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      {
        context: '[Supabase]',
        minLength: MIN_KEY_LENGTH,
      },
    ),
  };
}

/**
 * Retourne les variables d'environnement admin Supabase validées.
 * À utiliser UNIQUEMENT côté serveur (Server Components, API Routes).
 * Ne jamais exposer SUPABASE_SERVICE_ROLE_KEY côté client.
 *
 * @throws Error si les variables sont absentes, vides ou malformées.\
 */
export function getSupabaseAdminEnv(): SupabaseAdminEnv {
  return {
    url: cleanEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL',
      {
        context: '[Supabase/admin]',
        mustStartWith: SUPABASE_URL_PREFIX,
      },
    ),
    serviceRoleKey: cleanEnv(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      'SUPABASE_SERVICE_ROLE_KEY',
      {
        context: '[Supabase/admin]',
        minLength: MIN_KEY_LENGTH,
      },
    ),
  };
}

/**
 * Variante silencieuse pour le middleware Edge Runtime :
 * retourne des chaînes vides si les variables sont manquantes au lieu de
 * lever une exception (le middleware ne peut pas se crasher au boot).
 *
 * Le client Supabase créé avec des valeurs vides se comportera correctement
 * (les appels échoueront individuellement, sans casser le routing).
 */
export function getSupabaseEnvSafe(): SupabasePublicEnv {
  const raw = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };

  // Nettoyer sans jeter d'exception
  const url = raw.url.trim();
  const anonKey = raw.anonKey.trim();

  if (!url || !anonKey) {
    // En production, ce warning doit être visible dans les logs Vercel
    console.error(
      '[Supabase/middleware] ⚠️  Variables d\'environnement Supabase manquantes. ' +
      'Le middleware ne peut pas valider les sessions. ' +
      'Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return { url, anonKey };
}

// ─── Project ref ──────────────────────────────────────────────────────────────

/**
 * Dérive le project ref Supabase depuis NEXT_PUBLIC_SUPABASE_URL.
 *
 * Format Supabase Cloud :
 *   https://<project-ref>.supabase.co  →  '<project-ref>'
 *
 * Self-hosted (domaine custom) :
 *   https://supabase.mon-domaine.fr    →  'supabase.mon-domaine.fr'
 *   (le hostname entier est retourné — le nom du cookie sera différent)
 *
 * Le nom du cookie de session Supabase est :
 *   sb-<project-ref>-auth-token
 *
 * Cette fonction remplace la constante codée en dur précédemment présente
 * dans middleware.ts (SUPABASE_PROJECT_REF = 'qmrkacrpncdkhofiqlrg').
 * Le ref est maintenant dérivé dynamiquement à chaque démarrage, ce qui
 * garantit la cohérence en staging, prod, ou après migration de projet.
 *
 * @param url  URL Supabase (défaut : NEXT_PUBLIC_SUPABASE_URL).
 *             Paramètre injectable pour les tests.
 * @returns    Le project ref extrait, ou '' si l'URL est absente/malformée.
 */
export function getSupabaseProjectRef(
  url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
): string {
  if (!url) return '';

  try {
    const hostname = new URL(url).hostname;   // 'qmrkacrpncdkhofiqlrg.supabase.co'

    if (hostname.endsWith(SUPABASE_CLOUD_SUFFIX)) {
      // Cloud Supabase : premier segment = project ref
      return hostname.slice(0, -SUPABASE_CLOUD_SUFFIX.length);
    }

    // Self-hosted : retourner le hostname complet (le cookie sera sb-<hostname>-auth-token)
    return hostname;
  } catch {
    // URL malformée — pas de throw car cette fonction est appelée au boot du module
    console.warn(
      '[Supabase/env] ⚠️  Impossible de dériver le project ref depuis ' +
      `NEXT_PUBLIC_SUPABASE_URL="${url}". ` +
      'Le nom du cookie Supabase sera incorrect. ' +
      'Vérifiez que la variable commence bien par https://.',
    );
    return '';
  }
}

// ─── Validation au boot (client-side) ─────────────────────────────────────────

/**
 * Valide les variables d'environnement publiques Supabase de façon complète,
 * **sans lever d'exception**, en retournant un rapport structuré.
 *
 * Utilisé par client.ts pour effectuer une vérification exhaustive
 * au chargement du module (boot-time) :
 *  - Collecte TOUTES les erreurs en un seul passage (pas de fail-fast)
 *  - Retourne { ok, errors[], warnings[], env | null }
 *  - L'appelant décide de la stratégie (throw, console.error, fallback…)
 */
export function validateSupabaseClientEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let url = '';
  let anonKey = '';

  // ── NEXT_PUBLIC_SUPABASE_URL ─────────────────────────────────────────────
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!rawUrl || rawUrl.trim().length === 0) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL est manquante ou vide.');
  } else {
    url = rawUrl.trim();
    if (url !== rawUrl) {
      warnings.push(
        'NEXT_PUBLIC_SUPABASE_URL contenait des espaces/sauts de ligne — nettoyé.' +
        ' Corrigez la variable dans Vercel / .env.local.',
      );
    }
    if (!url.startsWith(SUPABASE_URL_PREFIX)) {
      errors.push(
        `NEXT_PUBLIC_SUPABASE_URL est invalide : doit commencer par "${SUPABASE_URL_PREFIX}".` +
        ` Valeur : "${url.slice(0, 40)}"`,
      );
    }
  }

  // ── NEXT_PUBLIC_SUPABASE_ANON_KEY ────────────────────────────────────────
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawKey || rawKey.trim().length === 0) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY est manquante ou vide.');
  } else {
    anonKey = rawKey.trim();
    if (anonKey !== rawKey) {
      warnings.push(
        'NEXT_PUBLIC_SUPABASE_ANON_KEY contenait des espaces/sauts de ligne — nettoyé.' +
        ' Corrigez la variable dans Vercel / .env.local.',
      );
    }
    if (anonKey.length < MIN_KEY_LENGTH) {
      errors.push(
        `NEXT_PUBLIC_SUPABASE_ANON_KEY est trop courte` +
        ` (${anonKey.length} chars, min ${MIN_KEY_LENGTH}).`,
      );
    }
  }

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    warnings,
    env: ok ? { url, anonKey } : null,
  };
}

/**
 * Vérifie les variables d'environnement client Supabase au boot.
 * Doit être appelée une seule fois, à l'initialisation du module client.ts.
 *
 * Comportement :
 *  - Loggue les avertissements (trim appliqué) dans console.warn
 *  - En cas d'erreur :
 *    • console.error avec un message structuré et lisible
 *    • Lève une Error pour stopper l'initialisation du client
 *
 * En développement, le message d'erreur indique précisément :
 *  • Quelle variable est en cause
 *  • Quel est le problème (manquante / invalide / trop courte)
 *  • Où la corriger (.env.local ou dashboard Vercel)
 *
 * @returns SupabasePublicEnv nettoyé si toutes les variables sont valides
 * @throws  Error au premier problème détecté (env invalide)
 */
export function assertSupabaseClientEnv(): SupabasePublicEnv {
  const result = validateSupabaseClientEnv();

  // Émettre les warnings non-bloquants (trim appliqué)
  for (const w of result.warnings) {
    console.warn(`[Supabase/client] ⚠️  ${w}`);
  }

  if (!result.ok) {
    const isDev = process.env.NODE_ENV !== 'production';

    // Message structuré visible dans la console navigateur / logs Vercel
    const errorBlock = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║  [Supabase/client] ERREUR DE CONFIGURATION — BOOT ÉCHOUÉ    ║',
      '╠══════════════════════════════════════════════════════════════╣',
      ...result.errors.map(e => `║  ✗ ${e.padEnd(58)}║`),
      '╠══════════════════════════════════════════════════════════════╣',
      isDev
        ? '║  → Corrigez votre .env.local puis relancez `npm run dev`     ║'
        : '║  → Corrigez les variables dans votre dashboard Vercel        ║',
      '╚══════════════════════════════════════════════════════════════╝',
    ].join('\n');

    console.error(errorBlock);

    throw new Error(
      `[Supabase/client] Configuration invalide — ${result.errors.length} erreur(s) détectée(s) au boot.\n` +
      result.errors.map(e => `  • ${e}`).join('\n') + '\n' +
      (isDev
        ? '  → Corrigez votre .env.local puis relancez `npm run dev`.'
        : '  → Corrigez les variables dans votre dashboard Vercel.'),
    );
  }

  return result.env!;
}
