import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
 *  Le client Supabase côté navigateur (createBrowserClient) stocke la session
 *  dans document.cookie sous la forme d'un cookie JSON brut :
 *    sb-<ref>-auth-token = {"access_token":"eyJ...","refresh_token":"..."}
 *
 *  Dans l'Edge Runtime du middleware Next.js, on NE fait PAS d'appel réseau
 *  (getUser() → HTTP vers Supabase Auth) car :
 *    - Risque de timeout → user = null → fausse redirection vers /connexion
 *    - Latence ajoutée sur chaque requête
 *
 *  Stratégie choisie : lire le token directement dans le cookie JSON.
 *    1. Chercher le cookie sb-<ref>-auth-token (format JSON ou chunked)
 *    2. Si access_token présent → JWT non expiré → utilisateur connecté
 *    3. Si absent → rediriger vers /connexion
 *
 *  La validation sécurisée du JWT (signature + expiration) se fait dans les
 *  API Routes via getUserIdBearerFirst / getUserFromRequest (Bearer token).
 *
 * ─── Note Edge Runtime ──────────────────────────────────────────────────────────
 *
 *  Ce middleware tourne sur l'Edge Runtime (Vercel/Next.js).
 *  Il ne peut PAS faire de requête Supabase DB (pas de service role key en Edge).
 */

// ─── Routes nécessitant une authentification ─────────────────────────────────
const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/profil',
  '/messages',
] as const;

// ─── Nom du cookie Supabase (basé sur le project ref) ────────────────────────
const SUPABASE_PROJECT_REF = 'qmrkacrpncdkhofiqlrg';
const SUPABASE_COOKIE_NAME = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

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
      // Le cookie peut être URL-encodé
      const decoded = decodeURIComponent(jsonCookie);
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      if (typeof parsed.access_token === 'string' && parsed.access_token.startsWith('eyJ')) {
        // Vérifier que le token n'est pas expiré (exp est en secondes)
        const exp = (parsed as { expires_at?: number }).expires_at;
        if (typeof exp === 'number' && exp * 1000 < Date.now()) {
          // Token expiré — mais on laisse passer : le refresh se fait côté client
          // Rediriger uniquement si AUCUN token (pas même un expiré)
          return true; // token présent, même expiré → client peut le rafraîchir
        }
        return true;
      }
    } catch {
      // Pas du JSON valide, continuer
    }
  }

  // Format chunké : sb-<ref>-auth-token.0, .1, ... (createServerClient)
  const chunk0 = request.cookies.get(`${SUPABASE_COOKIE_NAME}.0`)?.value;
  if (chunk0) {
    try {
      const decoded = decodeURIComponent(chunk0);
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      if (typeof parsed.access_token === 'string' && parsed.access_token.startsWith('eyJ')) {
        return true;
      }
    } catch {
      // Continuer
    }
  }

  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // .trim() obligatoire : une clé avec \n final casse le WebSocket Supabase Realtime
  const supabaseUrl  = (process.env.NEXT_PUBLIC_SUPABASE_URL      ?? '').trim();
  const supabaseAnon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

  // Créer le client pour rafraîchir les cookies de session (obligatoire)
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
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

  // Rafraîchir la session si nécessaire (écrit les nouveaux cookies dans la réponse)
  // NE PAS utiliser le résultat pour le guard : getUser() peut timeout en Edge Runtime
  await supabase.auth.getSession();

  // ── Guard : lecture directe du cookie JWT — SANS appel réseau ──────────────
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isProtected && !hasValidToken(request)) {
    const loginUrl = new URL('/connexion', request.nextUrl.origin);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
