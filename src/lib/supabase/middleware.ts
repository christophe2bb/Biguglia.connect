import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * updateSession — Rafraîchit la session Supabase et applique les guards de navigation.
 *
 * ─── Guards actifs ──────────────────────────────────────────────────────────────
 *
 *  /admin/**     → redirige vers /connexion si non authentifié.
 *                  La vérification du rôle 'admin' est faite côté client via
 *                  ProtectedPage adminOnly (le rôle est en DB, pas dans le JWT).
 *
 *  /dashboard/** → redirige vers /connexion si non authentifié.
 *                  Ces pages affichent des données privées de l'utilisateur
 *                  (messages, contenus, avis, profil artisan…).
 *
 *  /profil       → redirige vers /connexion si non authentifié.
 *                  La page de profil expose des données personnelles.
 *
 *  /messages/**  → redirige vers /connexion si non authentifié.
 *                  Les messages sont strictement privés.
 *
 * ─── Ce que ce middleware NE FAIT PAS ──────────────────────────────────────────
 *
 *  - Il ne vérifie PAS le rôle (admin, moderator, artisan…) : le JWT ne contient
 *    que l'uid et l'email. La vérification des rôles se fait côté client (ProtectedPage)
 *    ou côté API (createAdminClient + vérification en DB).
 *
 *  - Il ne bloque PAS les pages publiques (/annonces, /forum, /emploi…).
 *
 * ─── Note Edge Runtime ──────────────────────────────────────────────────────────
 *
 *  Ce middleware tourne sur l'Edge Runtime (Vercel/Next.js).
 *  Il ne peut PAS faire de requête Supabase DB (pas de service role key en Edge).
 *  Il lit la session JWT depuis les cookies via getSession() (pas d'appel réseau).
 *
 *  ⚠️  getUser() vs getSession() :
 *  On utilise getSession() — lecture locale du cookie JWT, sans appel réseau.
 *  getUser() valide le JWT auprès de Supabase Auth (appel HTTP) : risque de timeout
 *  en Edge Runtime → user = null → redirection fausse vers /connexion.
 *  La validation sécurisée des tokens se fait dans chaque API Route (Bearer token).
 */

// ─── Routes nécessitant une authentification ─────────────────────────────────
// Ajout de chaque préfixe ici → redirection automatique vers /connexion
const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/profil',
  '/messages',
] as const;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // .trim() obligatoire : une clé avec \n final casse le WebSocket Supabase Realtime
  // (la clé est encodée %0A dans l'URL wss:// → connexion refusée par Supabase)
  const supabaseUrl  = (process.env.NEXT_PUBLIC_SUPABASE_URL      ?? '').trim();
  const supabaseAnon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

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

  // ⚠️  DIAGNOSTIC : le cookie sb-*-auth-token contient du JSON brut
  //  (format {"access_token":"eyJ..."}) — @supabase/ssr v0.3.0 en Edge Runtime
  //  ne parse pas ce format avec getSession() (retourne null).
  //
  //  Solution : getUser() qui extrait le token du cookie JSON et le valide
  //  via un appel réseau à Supabase Auth. Plus fiable que getSession() pour
  //  les cookies au format JSON (createBrowserClient → document.cookie).
  //
  //  Le risque de timeout getUser() est réel mais acceptable : si timeout →
  //  user = null → redirection /connexion → l'utilisateur se reconnecte.
  //  C'est préférable à une redirection permanente causée par getSession() = null.
  const { data: { user } } = await supabase.auth.getUser();

  // ── Guards : rediriger vers /connexion si non authentifié ──────────────────
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isProtected && !user) {
    // Construire l'URL de redirection à partir de l'origine (compatible Edge + tests Vitest)
    // On utilise new URL() plutôt que request.nextUrl.clone() pour éviter la dépendance
    // à NextURL.clone() qui n'est pas disponible dans les mocks Vitest (type WHATWG URL).
    const loginUrl = new URL('/connexion', request.nextUrl.origin);
    // Conserver l'URL cible pour rediriger après connexion
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
