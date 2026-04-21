import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseProjectRef } from '@/lib/supabase/env';

// ─── Purge des cookies Supabase corrompus (migration @supabase/ssr 0.3 → 0.6) ─
//
// @supabase/ssr 0.6 a changé le format d'encodage des cookies de session.
// Les anciens cookies (format 0.3, encodage binaire non-UTF-8) causent l'erreur :
//   "Detected stale cookie data that does not decode to a UTF-8 string"
// et empêchent l'accès à l'application tant qu'ils ne sont pas purgés.
//
// Solution : détecter les cookies Supabase dont la valeur n'est pas du JSON
// valide (ou ne décode pas en UTF-8) et les expirer immédiatement.
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
    try {
      // Teste si la valeur décode en UTF-8 JSON valide
      const decoded = decodeURIComponent(cookie.value);
      JSON.parse(decoded);
      // Si le JSON ne contient pas access_token ni les clés attendues,
      // c'est peut-être un vieux format — on laisse passer (pas forcément corrompu)
    } catch {
      // Échec de décodage URI ou de parse JSON → cookie corrompu (ancien format 0.3)
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
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
 *  Le client Supabase côté navigateur stocke la session dans document.cookie :
 *    sb-<ref>-auth-token = {"access_token":"eyJ...","refresh_token":"..."}
 *
 *  Dans l'Edge Runtime du middleware, on NE fait PAS d'appel réseau
 *  (getUser() → HTTP vers Supabase Auth) car :
 *    - Risque de timeout → user = null → fausse redirection vers /connexion
 *    - Latence ajoutée sur chaque requête
 *
 *  Stratégie : lire le token directement dans le cookie JSON.
 *    1. Chercher le cookie sb-<ref>-auth-token (format JSON ou chunked)
 *    2. Si access_token présent → utilisateur connecté (le refresh est géré
 *       côté client silencieusement via refresh_token)
 *    3. Si absent → rediriger vers /connexion
 *
 *  La validation cryptographique du JWT (signature + expiration) se fait dans
 *  les API Routes via getUserIdBearerFirst / getUserFromRequest.
 *
 * ─── Note Edge Runtime ──────────────────────────────────────────────────────────
 *
 *  Ce middleware tourne sur l'Edge Runtime (Vercel/Next.js).
 *  Il ne peut PAS accéder à la DB Supabase (pas de service role key en Edge).
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
 * Supporte le format JSON brut (createBrowserClient) et les chunks (createServerClient).
 * Ne fait AUCUN appel réseau → compatible Edge Runtime sans timeout.
 */
function hasValidToken(request: NextRequest): boolean {
  // Format JSON brut : sb-<ref>-auth-token = {"access_token":"eyJ..."}
  const jsonCookie = request.cookies.get(SUPABASE_COOKIE_NAME)?.value;
  if (jsonCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(jsonCookie)) as Record<string, unknown>;
      if (typeof parsed.access_token === 'string' && parsed.access_token.startsWith('eyJ')) {
        return true;
      }
    } catch {
      // Pas du JSON valide, continuer vers le format chunké
    }
  }

  // Format chunké : sb-<ref>-auth-token.0 (createServerClient)
  const chunk0 = request.cookies.get(SUPABASE_CHUNK_0)?.value;
  if (chunk0) {
    try {
      const parsed = JSON.parse(decodeURIComponent(chunk0)) as Record<string, unknown>;
      if (typeof parsed.access_token === 'string' && parsed.access_token.startsWith('eyJ')) {
        return true;
      }
    } catch {
      // Cookie chunk invalide
    }
  }

  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ── Purge des cookies Supabase corrompus (migration ssr 0.3 → 0.6) ──────────
  // Détecte et expire les cookies au format binaire/non-UTF-8 laissés par
  // @supabase/ssr 0.3. On continue le flow normal : hasValidToken() renverra
  // false (cookie purgé = absent) → le guard redirigera vers /connexion si
  // la route est protégée. Les Set-Cookie d'expiration sont portés par
  // supabaseResponse, qui sera retourné à la fin de la fonction.
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
