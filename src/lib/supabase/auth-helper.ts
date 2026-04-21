/**
 * Utilitaires d'authentification pour les API Routes Next.js (Node.js, server-side).
 * Compatible avec @supabase/ssr (cookies SSR) + Bearer token (clients SPA/mobile).
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  SCOPE : API Routes uniquement  (src/app/api/**)                    ║
 * ║                                                                      ║
 * ║  NE PAS utiliser dans :                                              ║
 * ║  • Server Components  → utiliser await createClient() de server.ts        ║
 * ║  • Client Components  → utiliser await createClient() de client.ts        ║
 * ║  • Middleware         → utiliser createServerClient() de middleware  ║
 * ║  • Services client-side (trust.ts, publish-*.ts)                    ║
 * ║    → ils appellent await createClient() navigateur, pas des API Routes     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Trois fonctions d'auth :
 *
 *  getUserFromRequest(req)          — SSR-first  (cookies → Bearer)
 *    Usage : routes emploi appelées depuis SSR ou formulaires Next.js.
 *    Retourne { id, email, … } | null
 *
 *  getUserIdBearerFirst(req)        — Bearer-first (Bearer → cookies)
 *    Usage : routes messages appelées via fetch() client-side avec
 *            Authorization: Bearer <access_token>.
 *    Retourne string | null  (UUID uniquement — suffisant pour les guards)
 *
 * Protection CSRF :
 *
 *  assertCsrfSafe(req)             — À appeler sur TOUTE mutation cookie-authée
 *    Règles (ordre d'évaluation) :
 *      1. Si la requête porte un Bearer token → risque CSRF nul, on passe.
 *      2. Sinon (cookie-only) → vérifier l'en-tête Origin ou Referer :
 *         • Doit être présent.
 *         • Son hostname doit correspondre à l'hostname de l'app
 *           (NEXT_PUBLIC_SITE_URL ou, à défaut, Host de la requête).
 *    Retourne null si la requête est safe, ou une Response 403 prête à renvoyer.
 *
 *    Appel type dans un handler PATCH/DELETE/POST sensible :
 *      const csrfError = assertCsrfSafe(req);
 *      if (csrfError) return csrfError;
 *
 * Couverture actuelle (9 routes) :
 *   emploi/contact · emploi/demandes/[slug] · emploi/offres/[slug]
 *   emploi/ownership · messages/conversations · messages/conversation/[id]
 *   messages/unread · messages/start-conversation · messages/check-conversation
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@/lib/supabase/env';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Crée un client anon éphémère pour valider un Bearer token */
function anonClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Extrait le token depuis "Authorization: Bearer <token>" */
function extractBearer(req: Request): string | null {
  const header = req.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

/**
 * Résout l'hostname attendu (lowercase) depuis NEXT_PUBLIC_SITE_URL
 * ou, en dernier recours, depuis l'en-tête Host de la requête elle-même.
 */
function resolveAppHostname(req: Request): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      return new URL(siteUrl).hostname.toLowerCase();
    } catch { /* fallback ci-dessous */ }
  }
  // Fallback : Host header (supprime le port éventuel)
  const host = req.headers.get('host') ?? '';
  return host.split(':')[0].toLowerCase();
}

// ─── CSRF guard ───────────────────────────────────────────────────────────────

/**
 * Vérifie qu'une requête mutante (PATCH / DELETE / POST sensible) ne peut pas
 * être déclenchée depuis un site tiers par un cookie de session.
 *
 * Stratégie « strict origin check » :
 *   - Si un Bearer token est présent → safe (XHR/fetch client-side explicite).
 *   - Sinon → obligatoire d'avoir Origin ou Referer correspondant à l'app.
 *
 * @returns null        — requête sûre, le handler peut continuer.
 * @returns NextResponse — 403 Forbidden à retourner immédiatement.
 */
export function assertCsrfSafe(req: Request): NextResponse | null {
  // Les requêtes avec Bearer token ne sont pas vulnérables au CSRF
  // (un attaquant cross-site ne peut pas lire le token JS de la victime)
  if (extractBearer(req)) return null;

  const appHostname = resolveAppHostname(req);

  // Tenter Origin d'abord, puis Referer en fallback
  const originHeader  = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');
  const raw           = originHeader ?? refererHeader;

  if (!raw) {
    // Pas d'Origin ni de Referer → requête potentiellement cross-site
    return NextResponse.json(
      { error: 'Requête refusée : en-tête Origin manquant (protection CSRF).' },
      { status: 403 },
    );
  }

  let requestHostname: string;
  try {
    requestHostname = new URL(raw).hostname.toLowerCase();
  } catch {
    return NextResponse.json(
      { error: 'Requête refusée : en-tête Origin invalide (protection CSRF).' },
      { status: 403 },
    );
  }

  if (requestHostname !== appHostname) {
    return NextResponse.json(
      { error: 'Requête refusée : origine cross-site détectée (protection CSRF).' },
      { status: 403 },
    );
  }

  return null; // safe
}

// ─── Auth functions ───────────────────────────────────────────────────────────

/**
 * SSR-first (cookies → Bearer).
 * Retourne l'objet user complet { id, email, … } ou null.
 * Utilisé par les routes emploi (offres, demandes, contact, ownership).
 */
export async function getUserFromRequest(
  req: Request
): Promise<{ id: string; email?: string } | null> {
  // Méthode 1 : cookies SSR
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch { /* ignore */ }

  // Méthode 2 : Bearer token
  const token = extractBearer(req);
  if (token) {
    try {
      const { data: { user } } = await anonClient().auth.getUser(token);
      if (user) return user;
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Bearer-first (Bearer → SSR cookies).
 * Retourne uniquement l'UUID (string | null).
 * Utilisé par les routes messages où le client envoie Authorization: Bearer <token>.
 */
export async function getUserIdBearerFirst(req: Request): Promise<string | null> {
  // Méthode 1 : Bearer token
  const token = extractBearer(req);
  if (token) {
    try {
      const { data: { user } } = await anonClient().auth.getUser(token);
      if (user?.id) return user.id;
    } catch { /* ignore */ }
  }

  // Méthode 2 : cookies SSR (fallback)
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch { /* ignore */ }

  return null;
}
