import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseProjectRef } from '@/lib/supabase/env';

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

  // Rafraîchir la session si nécessaire (écrit les nouveaux cookies dans la réponse).
  // NE PAS utiliser le résultat pour le guard : getUser() peut timeout en Edge Runtime.
  await supabase.auth.getSession();

  // ── Guard : lecture directe du cookie JWT — SANS appel réseau ──────────────
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !hasValidToken(request)) {
    const loginUrl = new URL('/connexion', request.nextUrl.origin);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
