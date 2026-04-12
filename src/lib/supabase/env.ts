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
 *
 * Usage :
 *  import { getSupabaseEnv, getSupabaseAdminEnv } from '@/lib/supabase/env';
 *
 *  const { url, anonKey } = getSupabaseEnv();          // client + server SSR
 *  const { url, serviceRoleKey } = getSupabaseAdminEnv(); // server admin only
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SÉCURITÉ : ce fichier ne doit JAMAIS être importé dans un Client Component
 * qui exposerait SUPABASE_SERVICE_ROLE_KEY côté navigateur.
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

// ─── Constantes ───────────────────────────────────────────────────────────────

/** URL minimale attendue pour une instance Supabase */
const SUPABASE_URL_PREFIX = 'https://';

/**
 * Longueur minimale d'une clé JWT Supabase (anon ou service role).
 * Les vraies clés font ~140 caractères (en-tête JWT Base64 + payload + sig).
 * On accepte toute clé ≥ 20 chars pour rester flexible face aux clés de test.
 */
const MIN_KEY_LENGTH = 20;

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
 * @throws Error si les variables sont absentes, vides ou malformées.
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
