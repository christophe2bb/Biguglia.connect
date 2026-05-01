import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseProjectRef } from '@/lib/supabase/env';

// ─── Format des cookies @supabase/ssr 0.9 ────────────────────────────────────
//
// @supabase/ssr 0.9 utilise par défaut cookieEncoding = "base64url" :
//
//   sb-<ref>-auth-token = base64-<base64url(JSON.stringify(session))>
//
// Exemples de formats rencontrés (selon la version du SDK utilisée) :
//
//  1. base64-<base64url>                ← FORMAT ACTUEL (0.9+, défaut)
//     La valeur décodée est le JSON de la session.
//
//  2. {"access_token":"eyJ...","refresh_token":"..."}
//     Format hérité de @supabase/ssr 0.3/0.4 (toujours présent dans certains
//     navigateurs qui n'ont pas encore vidé leurs cookies).
//
//  3. Formats chunked : sb-<ref>-auth-token.0, .1, .2 …
//     Utilisé quand la session est trop grande pour tenir dans un seul cookie.
//
// Le format "base64l-" utilisé par @supabase/ssr 0.6 avait un bug :
//   setItem stockait le JSON brut mais decodeCookie essayait de le décoder
//   en base64url → warning "Detected stale cookie data" à chaque requête.
//   Ce bug est corrigé dans 0.9 (le format base64l- est abandonné).
//
// ─── Décodage base64url (Edge Runtime compatible) ────────────────────────────
//
// Implémentation pure JavaScript compatible Edge Runtime (pas de Buffer, ni
// de atob/btoa pour base64url). Utilise le même alphabet que @supabase/ssr.

const BASE64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const BASE64URL_MAP: Record<string, number> = {};
for (let i = 0; i < BASE64URL_CHARS.length; i++) {
  BASE64URL_MAP[BASE64URL_CHARS[i]] = i;
}

/**
 * Décode une chaîne base64url en string UTF-8.
 * Compatible Edge Runtime (pas de Buffer ni de atob).
 * Retourne null si la chaîne n'est pas du base64url valide.
 */
function decodeBase64Url(b64url: string): string | null {
  try {
    const clean = b64url.replace(/[\s=]/g, '');
    const bytes: number[] = [];
    let i = 0;

    while (i < clean.length) {
      const c0 = BASE64URL_MAP[clean[i]];
      const c1 = BASE64URL_MAP[clean[i + 1]];
      if (c0 === undefined || c1 === undefined) break;

      bytes.push((c0 << 2) | (c1 >> 4));
      if (i + 2 < clean.length && BASE64URL_MAP[clean[i + 2]] !== undefined) {
        const c2 = BASE64URL_MAP[clean[i + 2]];
        bytes.push(((c1 & 0xf) << 4) | (c2 >> 2));
      }
      if (i + 3 < clean.length && BASE64URL_MAP[clean[i + 3]] !== undefined) {
        const c2 = BASE64URL_MAP[clean[i + 2]] ?? 0;
        const c3 = BASE64URL_MAP[clean[i + 3]];
        bytes.push(((c2 & 0x3) << 6) | c3);
      }
      i += 4;
    }

    // Convertir bytes UTF-8 → string JavaScript
    let result = '';
    let j = 0;
    while (j < bytes.length) {
      const b0 = bytes[j];
      if (b0 < 0x80) {
        result += String.fromCharCode(b0);
        j++;
      } else if ((b0 & 0xe0) === 0xc0 && j + 1 < bytes.length) {
        const b1 = bytes[j + 1];
        if ((b1 & 0xc0) !== 0x80) return null;
        result += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
        j += 2;
      } else if ((b0 & 0xf0) === 0xe0 && j + 2 < bytes.length) {
        const b1 = bytes[j + 1], b2 = bytes[j + 2];
        if ((b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80) return null;
        result += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
        j += 3;
      } else if ((b0 & 0xf8) === 0xf0 && j + 3 < bytes.length) {
        const b1 = bytes[j + 1], b2 = bytes[j + 2], b3 = bytes[j + 3];
        if ((b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80 || (b3 & 0xc0) !== 0x80) return null;
        const cp = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
        const adj = cp - 0x10000;
        result += String.fromCharCode(0xd800 + (adj >> 10), 0xdc00 + (adj & 0x3ff));
        j += 4;
      } else {
        return null;
      }
    }
    return result;
  } catch {
    return null;
  }
}

const BASE64_PREFIX = 'base64-';

/**
 * Extrait l'access_token depuis une valeur de cookie Supabase.
 *
 * Supporte les formats @supabase/ssr :
 *   - base64-<base64url>           (format 0.9+ par défaut)
 *   - {"access_token":"eyJ..."}    (JSON brut, héritage 0.3/0.4)
 *
 * Retourne l'access_token (JWT commençant par "eyJ") ou null.
 */
function extractAccessToken(value: string): string | null {
  try {
    // Format 0.9 : base64-<base64url(JSON)>
    if (value.startsWith(BASE64_PREFIX)) {
      const b64 = value.substring(BASE64_PREFIX.length);
      const json = decodeBase64Url(b64);
      if (!json) return null;
      const parsed = JSON.parse(json) as Record<string, unknown>;
      const token = parsed.access_token;
      return typeof token === 'string' && token.startsWith('eyJ') ? token : null;
    }

    // Format héritage : JSON brut (0.3/0.4)
    const json = decodeURIComponent(value);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const token = parsed.access_token;
    return typeof token === 'string' && token.startsWith('eyJ') ? token : null;

  } catch {
    return null;
  }
}

/**
 * Vérifie si une valeur de cookie est dans un format reconnu.
 * Retourne false uniquement pour les cookies corrompus/au format binaire
 * (héritage pré-0.3) qui ne peuvent pas être décodés du tout.
 */
function isKnownCookieFormat(value: string): boolean {
  if (!value) return false;

  // Format 0.9+ : base64-...
  if (value.startsWith(BASE64_PREFIX)) {
    // Vérifier que le payload est du base64url valide
    const b64 = value.substring(BASE64_PREFIX.length);
    return b64.length > 0 && /^[A-Za-z0-9\-_=\s]+$/.test(b64);
  }

  // Format héritage 0.6 : base64l-... (ne devrait plus être créé par 0.9
  // mais peut encore exister dans les cookies d'anciens utilisateurs)
  if (value.startsWith('base64l-')) {
    // Accepter sans valider — l'ancienne session sera remplacée après login
    return true;
  }

  // Format héritage JSON : {"access_token":"eyJ..."}
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('{')) {
      JSON.parse(decoded);
      return true;
    }
  } catch {
    // fallthrough
  }

  // Format inconnu / binaire pré-0.3
  return false;
}

// ─── Purge des cookies Supabase au format inconnu ────────────────────────────
//
// Supprime les cookies Supabase dont la valeur n'est pas dans un format
// reconnu par @supabase/ssr 0.9 (format binaire des versions très anciennes).
// Ne purge PAS les cookies base64-, base64l- ou JSON brut valides.
//
// Les cookies "stale" de @supabase/ssr 0.6 (base64l-<len>-<rawJSON>) sont
// considérés comme valides ici pour ne pas déconnecter les utilisateurs
// à la mise à jour. Ils seront remplacés par base64- lors du prochain login.
function purgeStaleSupabaseCookies(
  request: NextRequest,
  response: NextResponse,
  cookiePrefix: string,
): boolean {
  let purged = false;
  const allCookies = request.cookies.getAll();

  for (const cookie of allCookies) {
    if (!cookie.name.startsWith(cookiePrefix)) continue;

    // Skip les chunks (.0, .1, …) — traités via le cookie racine
    if (/\.\d+$/.test(cookie.name)) continue;

    if (!isKnownCookieFormat(cookie.value)) {
      const expireOptions = {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

      response.cookies.set(cookie.name, '', expireOptions);

      // Purger les chunks associés
      for (const c of allCookies) {
        if (c.name.startsWith(`${cookie.name}.`)) {
          response.cookies.set(c.name, '', expireOptions);
        }
      }

      purged = true;
    }
  }
  return purged;
}

/**
 * updateSession — Rafraîchit la session Supabase et applique les guards de navigation.
 *
 * ─── Guards actifs ──────────────────────────────────────────────────────────────
 *
 *  /admin/**     → redirige vers /connexion si non authentifié.
 *  /dashboard/** → redirige vers /connexion si non authentifié.
 *  /profil       → redirige vers /connexion si non authentifié.
 *  /messages/**  → redirige vers /connexion si non authentifié.
 *
 * ─── Stratégie d'authentification ──────────────────────────────────────────────
 *
 *  @supabase/ssr 0.9 stocke la session dans document.cookie au format :
 *    sb-<ref>-auth-token = base64-<base64url(JSON_session)>
 *
 *  Dans l'Edge Runtime du middleware, on NE fait PAS d'appel réseau
 *  (getUser() → HTTP vers Supabase Auth) car :
 *    - Risque de timeout → user = null → fausse redirection vers /connexion
 *    - Latence ajoutée sur chaque requête
 *
 *  Stratégie : lire le token directement dans le cookie.
 *    1. Chercher le cookie sb-<ref>-auth-token (format base64- ou JSON)
 *    2. Si access_token présent et commence par "eyJ" → utilisateur connecté
 *    3. Chercher les chunks .0, .1 … si le cookie principal est absent
 *    4. Si absent → rediriger vers /connexion
 *
 *  La validation cryptographique du JWT (signature + expiration) se fait dans
 *  les API Routes via getUserIdBearerFirst / getUserFromRequest.
 *
 * ─── Note Edge Runtime ──────────────────────────────────────────────────────────
 *
 *  Ce middleware tourne sur l'Edge Runtime (Vercel/Next.js).
 *  Il ne peut PAS accéder à la DB Supabase (pas de service role key en Edge).
 *  Buffer n'est pas disponible → on utilise decodeBase64Url() (pure JS).
 */

// ─── Routes nécessitant une authentification ─────────────────────────────────
const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/profil',
  '/messages',
] as const;

// ─── Variables d'env lues une seule fois au chargement du module ─────────────
const SUPABASE_URL  = (process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '').trim();
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    '[Supabase/middleware] ⚠️  Variables Supabase manquantes — le middleware ' +
    'ne peut pas valider les sessions. Vérifiez NEXT_PUBLIC_SUPABASE_URL et ' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

// ─── Nom du cookie Supabase ───────────────────────────────────────────────────
const SUPABASE_PROJECT_REF = getSupabaseProjectRef(SUPABASE_URL);
const SUPABASE_COOKIE_NAME = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const SUPABASE_CHUNK_0     = `${SUPABASE_COOKIE_NAME}.0`;

/**
 * hasValidToken — Lit le token d'accès directement depuis les cookies.
 *
 * Supporte les formats @supabase/ssr :
 *   - base64-<base64url>  (0.9+ par défaut)
 *   - JSON brut           (héritage 0.3/0.4)
 *   - chunks .0, .1, …   (sessions volumineuses)
 *
 * Ne fait AUCUN appel réseau → compatible Edge Runtime sans timeout.
 */
function hasValidToken(request: NextRequest): boolean {
  // ── Cookie principal ─────────────────────────────────────────────────────
  const mainCookie = request.cookies.get(SUPABASE_COOKIE_NAME)?.value;
  if (mainCookie) {
    if (extractAccessToken(mainCookie)) return true;
  }

  // ── Chunk .0 (sessions volumineuses) ────────────────────────────────────
  // En format chunked, le cookie principal est absent.
  // Le chunk .0 contient le début de la valeur encodée.
  // Pour hasValidToken, on vérifie que le chunk est dans un format reconnu —
  // suffisant pour détecter la présence d'une session sans reconstituer
  // tous les chunks (trop coûteux en Edge Runtime).
  const chunk0 = request.cookies.get(SUPABASE_CHUNK_0)?.value;
  if (chunk0) {
    // Un chunk valide commence par 'base64-', '{', ou '%7B' (JSON URL-encodé)
    if (
      chunk0.startsWith(BASE64_PREFIX) ||
      chunk0.startsWith('{') ||
      chunk0.startsWith('%7B')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * updateSession — Rafraîchit la session Supabase et applique les guards de navigation.
 *
 * @param request         La requête entrante (NextRequest original — body stream intact).
 * @param extraReqHeaders Headers supplémentaires à injecter dans la request vue par les
 *                        Server Components (ex: x-nonce pour la CSP). Ces headers sont
 *                        passés à NextResponse.next({ request: { headers } }) sans jamais
 *                        reconstruire le NextRequest ni toucher au body stream.
 */
export async function updateSession(
  request: NextRequest,
  extraReqHeaders?: Headers,
) {
  // Construire les headers de request à transmettre aux Server Components.
  // Si des headers supplémentaires sont fournis (ex: x-nonce), on les fusionne
  // avec les headers originaux via NextResponse.next({ request: { headers } }).
  // Cette API Next.js propage les headers SANS reconstruire la Request et
  // SANS consommer le body stream → sûr pour les requêtes POST avec body JSON.
  const requestHeaders: Headers = extraReqHeaders
    ? (() => {
        const merged = new Headers(request.headers);
        extraReqHeaders.forEach((value, key) => merged.set(key, value));
        return merged;
      })()
    : request.headers;

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ── Purge des cookies au format inconnu (héritage binaire pré-0.3) ──────────
  const cookiePrefix = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
  purgeStaleSupabaseCookies(request, supabaseResponse, cookiePrefix);

  // ── Client Supabase pour rafraîchir la session ────────────────────────────
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // Rafraîchir la session côté serveur (renouvelle le cookie si expiré).
  await supabase.auth.getSession();

  // ── Guard léger (sans appel réseau) ──────────────────────────────────────
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  // Pour /admin : pas de redirection ici — laisser le layout serveur décider
  // (il valide le JWT + rôle avec les cookies SSR). Une fausse redirection
  // ici bloquerait l'accès des admins.
  if (isProtected && !isAdminRoute && !hasValidToken(request)) {
    const loginUrl = new URL('/connexion', request.nextUrl.origin);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
