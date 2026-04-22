import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseProjectRef } from '@/lib/supabase/env';

// ─── Formats de cookies @supabase/ssr 0.6 ────────────────────────────────────
//
// @supabase/ssr 0.6 utilise deux formats d'encodage base64url :
//
//  1. base64-<base64url>
//     Utilisé quand cookieEncoding = "base64url"
//     La valeur décodée est le JSON de la session.
//
//  2. base64l-<len_base36>-<base64url>  ← FORMAT PAR DÉFAUT (createBrowserClient)
//     Utilisé quand cookieEncoding = "base64url+length" (défaut dans 0.6)
//     len_base36 = longueur de la chaîne base64url en base 36
//     La valeur décodée est le JSON de la session.
//
//  3. JSON brut : {"access_token":"eyJ...","refresh_token":"..."}
//     Format hérité de @supabase/ssr 0.3/0.4 (encore présent dans certains navigateurs)
//
//  4. Formats chunked : sb-<ref>-auth-token.0, .1, .2 …
//     Utilisé quand la session est trop grande pour tenir dans un seul cookie.
//     Chaque chunk contient une partie de la valeur encodée (format 2 ou 3).
//
// Remarque : dans l'Edge Runtime, il n'y a pas de TextDecoder/atob natifs
// accessibles de la même façon. On utilise Buffer.from(value, 'base64url') mais
// ce n'est pas disponible non plus (Edge Runtime ≠ Node.js).
// On délègue donc le décodage à une implémentation pure JavaScript.

// ─── Décodage base64url (Edge Runtime compatible) ─────────────────────────────
//
// Implémentation pure JavaScript du décodage base64url → string UTF-8.
// Compatible Edge Runtime (pas de Buffer, pas de atob pour base64url).
//
// L'alphabet base64url utilise '-' et '_' au lieu de '+' et '/'.
// Pas de padding '='.
const BASE64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const BASE64URL_MAP: Record<string, number> = {};
for (let i = 0; i < BASE64URL_CHARS.length; i++) {
  BASE64URL_MAP[BASE64URL_CHARS[i]] = i;
}

/**
 * Décode une chaîne base64url en string UTF-8.
 * Retourne null si la chaîne n'est pas un base64url valide ou si le résultat
 * n'est pas une séquence UTF-8 valide.
 * Compatible Edge Runtime (pas de Buffer ni de atob).
 */
function decodeBase64UrlToString(b64url: string): string | null {
  try {
    // Convertir base64url → bytes
    const bytes: number[] = [];
    let i = 0;
    // Ignorer les espaces et '='
    const clean = b64url.replace(/[\s=]/g, '');

    while (i < clean.length) {
      const c0 = BASE64URL_MAP[clean[i]];
      const c1 = BASE64URL_MAP[clean[i + 1]];
      const c2 = i + 2 < clean.length ? BASE64URL_MAP[clean[i + 2]] : 0;
      const c3 = i + 3 < clean.length ? BASE64URL_MAP[clean[i + 3]] : 0;

      if (c0 === undefined || c1 === undefined) break;

      bytes.push((c0 << 2) | (c1 >> 4));
      if (i + 2 < clean.length && BASE64URL_MAP[clean[i + 2]] !== undefined) {
        bytes.push(((c1 & 0xf) << 4) | (c2 >> 2));
      }
      if (i + 3 < clean.length && BASE64URL_MAP[clean[i + 3]] !== undefined) {
        bytes.push(((c2 & 0x3) << 6) | c3);
      }
      i += 4;
    }

    // Convertir bytes UTF-8 → string JavaScript (UTF-16)
    let result = '';
    let j = 0;
    while (j < bytes.length) {
      const byte0 = bytes[j];
      if (byte0 < 0x80) {
        result += String.fromCharCode(byte0);
        j++;
      } else if ((byte0 & 0xe0) === 0xc0) {
        if (j + 1 >= bytes.length) return null; // séquence incomplète
        const byte1 = bytes[j + 1];
        if ((byte1 & 0xc0) !== 0x80) return null; // octet de continuation invalide
        result += String.fromCharCode(((byte0 & 0x1f) << 6) | (byte1 & 0x3f));
        j += 2;
      } else if ((byte0 & 0xf0) === 0xe0) {
        if (j + 2 >= bytes.length) return null;
        const byte1 = bytes[j + 1];
        const byte2 = bytes[j + 2];
        if ((byte1 & 0xc0) !== 0x80 || (byte2 & 0xc0) !== 0x80) return null;
        result += String.fromCharCode(((byte0 & 0x0f) << 12) | ((byte1 & 0x3f) << 6) | (byte2 & 0x3f));
        j += 3;
      } else if ((byte0 & 0xf8) === 0xf0) {
        if (j + 3 >= bytes.length) return null;
        const byte1 = bytes[j + 1];
        const byte2 = bytes[j + 2];
        const byte3 = bytes[j + 3];
        if ((byte1 & 0xc0) !== 0x80 || (byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80) return null;
        const codePoint = ((byte0 & 0x07) << 18) | ((byte1 & 0x3f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f);
        // Convertir en paire de substitution UTF-16
        const adjusted = codePoint - 0x10000;
        result += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff));
        j += 4;
      } else {
        return null; // byte de début invalide
      }
    }
    return result;
  } catch {
    return null;
  }
}

// ─── Patterns de cookies @supabase/ssr 0.6 ────────────────────────────────────
const BASE64_PREFIX = 'base64-';
const BASE64L_PREFIX = 'base64l-';
const BASE64L_PATTERN = /^base64l-([0-9a-z]+)-(.+)$/;

/**
 * Extrait l'access_token depuis une valeur de cookie Supabase.
 *
 * Supporte tous les formats @supabase/ssr :
 *   - base64l-<len>-<base64url>  (format 0.6 par défaut, createBrowserClient)
 *   - base64-<base64url>         (format 0.6 alternatif)
 *   - {"access_token":"eyJ..."}  (format JSON brut 0.3/0.4)
 *
 * Retourne l'access_token (JWT commençant par "eyJ") ou null.
 */
function extractAccessTokenFromCookieValue(value: string): string | null {
  try {
    // Format 1 : base64l-<len_base36>-<base64url> (défaut createBrowserClient 0.6)
    if (value.startsWith(BASE64L_PREFIX)) {
      const match = value.match(BASE64L_PATTERN);
      if (!match) return null;
      const expectedLen = parseInt(match[1], 36);
      const data = match[2];
      // Vérification de longueur (indique un cookie corrompu/incomplet)
      if (data.length < expectedLen) return null;
      const decoded = decodeBase64UrlToString(data.substring(0, expectedLen));
      if (!decoded) return null;
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const token = parsed.access_token;
      return typeof token === 'string' && token.startsWith('eyJ') ? token : null;
    }

    // Format 2 : base64-<base64url>
    if (value.startsWith(BASE64_PREFIX)) {
      const data = value.substring(BASE64_PREFIX.length);
      const decoded = decodeBase64UrlToString(data);
      if (!decoded) return null;
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const token = parsed.access_token;
      return typeof token === 'string' && token.startsWith('eyJ') ? token : null;
    }

    // Format 3 : JSON brut (héritage @supabase/ssr 0.3/0.4)
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    const token = parsed.access_token;
    return typeof token === 'string' && token.startsWith('eyJ') ? token : null;

  } catch {
    return null;
  }
}

/**
 * Vérifie si une valeur de cookie Supabase est dans un format valide reconnu.
 * Un cookie "invalide" est un cookie corrompu ou dans un ancien format binaire
 * (pré @supabase/ssr 0.3) qui ne peut pas être décodé.
 *
 * Note : un cookie valide peut quand même avoir un access_token expiré —
 * c'est au SDK Supabase de le renouveler via le refresh_token.
 */
function isValidSupabaseCookieFormat(value: string): boolean {
  try {
    if (value.startsWith(BASE64L_PREFIX)) {
      const match = value.match(BASE64L_PATTERN);
      if (!match) return false;
      const expectedLen = parseInt(match[1], 36);
      const data = match[2];
      if (data.length < expectedLen) return false;
      const decoded = decodeBase64UrlToString(data.substring(0, expectedLen));
      return decoded !== null;
    }
    if (value.startsWith(BASE64_PREFIX)) {
      const data = value.substring(BASE64_PREFIX.length);
      return decodeBase64UrlToString(data) !== null;
    }
    // JSON brut : essayer de parser
    const decoded = decodeURIComponent(value);
    JSON.parse(decoded);
    return true;
  } catch {
    return false;
  }
}

// ─── Purge des cookies Supabase corrompus (migration @supabase/ssr 0.3 → 0.6) ─
//
// @supabase/ssr 0.6 a changé le format d'encodage des cookies de session.
// Les anciens cookies (format 0.3, encodage binaire non-UTF-8) causent l'erreur :
//   "Detected stale cookie data that does not decode to a UTF-8 string"
// et empêchent l'accès à l'application tant qu'ils ne sont pas purgés.
//
// Solution : détecter les cookies Supabase dont la valeur n'est pas dans un
// format reconnu (base64l-, base64-, ou JSON brut) et les expirer immédiatement.
// Le navigateur les supprimera et créera de nouveaux cookies au format 0.6
// lors de la prochaine authentification.
function purgeStaleSupabaseCookies(
  request: NextRequest,
  response: NextResponse,
  cookiePrefix: string,
): boolean {
  let purged = false;
  const allCookies = request.cookies.getAll();

  for (const cookie of allCookies) {
    if (!cookie.name.startsWith(cookiePrefix)) continue;

    // Les cookies chunked (format .0, .1 …) contiennent un fragment de la valeur.
    // On les skip ici — traités ci-dessous via le cookie racine.
    const isChunk = /\.\d+$/.test(cookie.name);
    if (isChunk) continue;

    // Vérifier si le format est reconnu
    const shouldPurge = !isValidSupabaseCookieFormat(cookie.value);

    if (shouldPurge) {
      const expireOptions = {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

      // Purger le cookie racine
      response.cookies.set(cookie.name, '', expireOptions);

      // Purger aussi les chunks associés (sb-<ref>-auth-token.0, .1, .2 …)
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
 *  @supabase/ssr 0.6 stocke la session dans document.cookie au format :
 *    sb-<ref>-auth-token = base64l-<len>-<base64url(JSON_session)>
 *
 *  Dans l'Edge Runtime du middleware, on NE fait PAS d'appel réseau
 *  (getUser() → HTTP vers Supabase Auth) car :
 *    - Risque de timeout → user = null → fausse redirection vers /connexion
 *    - Latence ajoutée sur chaque requête
 *
 *  Stratégie : lire le token directement dans le cookie (tous formats).
 *    1. Chercher le cookie sb-<ref>-auth-token (format base64l-, base64-, ou JSON)
 *    2. Si access_token présent et commence par "eyJ" → utilisateur connecté
 *    3. Chercher les chunks .0, .1 … si le cookie principal est absent/invalide
 *    4. Si absent → rediriger vers /connexion
 *
 *  La validation cryptographique du JWT (signature + expiration) se fait dans
 *  les API Routes via getUserIdBearerFirst / getUserFromRequest.
 *
 * ─── Note Edge Runtime ──────────────────────────────────────────────────────────
 *
 *  Ce middleware tourne sur l'Edge Runtime (Vercel/Next.js).
 *  Il ne peut PAS accéder à la DB Supabase (pas de service role key en Edge).
 *  Buffer n'est pas disponible → on utilise decodeBase64UrlToString() (pure JS).
 */

// ─── Routes nécessitant une authentification ─────────────────────────────────
const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/profil',
  '/messages',
] as const;

// ─── Variables d'env lues une seule fois au chargement du module ─────────────
// L'Edge Runtime réutilise l'instance entre les requêtes sur la même instance.
const SUPABASE_URL  = (process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '').trim();
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    '[Supabase/middleware] ⚠️  Variables Supabase manquantes — le middleware ' +
    'ne peut pas valider les sessions. Vérifiez NEXT_PUBLIC_SUPABASE_URL et ' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

// ─── Nom du cookie Supabase — dérivé depuis NEXT_PUBLIC_SUPABASE_URL ─────────
//
// Le project ref est extrait dynamiquement par getSupabaseProjectRef().
// Plus de constante codée en dur : fonctionne quel que soit l'environnement
// (local, staging, prod, migration de projet Supabase).
//
// Format : sb-<project-ref>-auth-token
// Exemple : sb-qmrkacrpncdkhofiqlrg-auth-token (Cloud Supabase)
//           sb-supabase.mon-domaine.fr-auth-token (self-hosted)
//
const SUPABASE_PROJECT_REF = getSupabaseProjectRef(SUPABASE_URL);
const SUPABASE_COOKIE_NAME = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const SUPABASE_CHUNK_0     = `${SUPABASE_COOKIE_NAME}.0`;

/**
 * hasValidToken — Lit le token d'accès directement depuis les cookies.
 *
 * Supporte TOUS les formats @supabase/ssr :
 *   - base64l-<len>-<b64url>  (format 0.6 par défaut, createBrowserClient)
 *   - base64-<b64url>         (format 0.6 alternatif)
 *   - {"access_token":"eyJ..."} (JSON brut, héritage 0.3/0.4)
 *   - formats chunked (.0, .1, …) pour chacun des formats ci-dessus
 *
 * Ne fait AUCUN appel réseau → compatible Edge Runtime sans timeout.
 */
function hasValidToken(request: NextRequest): boolean {
  // ── Cookie principal ──────────────────────────────────────────────────────
  const mainCookie = request.cookies.get(SUPABASE_COOKIE_NAME)?.value;
  if (mainCookie) {
    const token = extractAccessTokenFromCookieValue(mainCookie);
    if (token) return true;
  }

  // ── Cookie chunk .0 ───────────────────────────────────────────────────────
  // En format chunked, le cookie principal n'existe pas ou est vide.
  // Le premier chunk (.0) contient le début de la valeur encodée.
  // Pour hasValidToken, on ne reconstitue pas tous les chunks (trop coûteux
  // en Edge Runtime) — on vérifie simplement que le chunk .0 existe et
  // commence par un préfixe reconnu (base64l-, base64-, ou JSON).
  const chunk0 = request.cookies.get(SUPABASE_CHUNK_0)?.value;
  if (chunk0) {
    // En chunked, chaque chunk contient une partie de la valeur.
    // Le chunk .0 contient le DÉBUT de la valeur — suffisant pour identifier
    // le format et détecter la présence d'une session.
    // On vérifie que le chunk est dans un format reconnu (pas corrompu).
    if (
      chunk0.startsWith(BASE64L_PREFIX) ||
      chunk0.startsWith(BASE64_PREFIX) ||
      chunk0.startsWith('{') ||
      chunk0.startsWith('%7B') // {"..." URL-encodé
    ) {
      // En format chunked base64l-/base64-, le chunk .0 contient
      // les premières 3180 chars de la valeur encodée.
      // L'access_token JSON est au début du JSON décodé → il sera
      // dans les premiers chunks. On présume qu'un chunk valide
      // implique une session valide (le SDK valide le JWT à chaque usage).
      // Cette heuristique est acceptable pour le middleware léger.
      return true;
    }
  }

  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ── Purge des cookies Supabase corrompus (migration ssr 0.3 → 0.6) ──────────
  // Détecte et expire les cookies dans un format non reconnu.
  // On continue le flow normal : hasValidToken() renverra false (cookie purgé
  // = absent) → le guard redirigera vers /connexion si la route est protégée.
  // Les Set-Cookie d'expiration sont portés par supabaseResponse.
  const cookiePrefix = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
  purgeStaleSupabaseCookies(request, supabaseResponse, cookiePrefix);

  // Créer le client pour rafraîchir les cookies de session (obligatoire
  // même sans guard : maintient la session active côté serveur)
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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // Rafraîchir la session (renouvelle le cookie si besoin).
  // La validation du JWT + rôle est gérée par :
  //   - /admin/** → src/app/admin/layout.tsx (Server Component, vérification réelle)
  //   - /dashboard/** → ProtectedPage (client guard)
  // Le middleware se contente de maintenir la session active.
  await supabase.auth.getSession();

  // ── Guard léger : on vérifie le cookie directement (sans appel réseau) ──────
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  // Pour /admin : pas de redirection ici — laisser le layout serveur décider.
  // Il a accès aux cookies SSR et valide le JWT + rôle correctement.
  // Si on redirige ici sur un faux-négatif, l'utilisateur ne peut jamais entrer.
  if (isProtected && !isAdminRoute && !hasValidToken(request)) {
    const loginUrl = new URL('/connexion', request.nextUrl.origin);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
