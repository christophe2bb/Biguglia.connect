import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * updateSession — Rafraîchit la session Supabase et applique les guards de navigation.
 *
 * Guards actifs :
 *  1. /admin/** → redirige vers /connexion si l'utilisateur n'est pas authentifié.
 *     (La vérification du rôle 'admin' est faite côté client via ProtectedPage adminOnly,
 *      car le role est en DB et non dans le JWT — inaccessible depuis l'Edge Runtime.)
 *
 * Note : ce middleware tourne sur l'Edge Runtime de Vercel/Next.js.
 * Il ne peut PAS faire de requête Supabase DB (pas de service role key en Edge).
 * Il peut uniquement lire la session JWT depuis les cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Rafraîchir la session (obligatoire — ne pas supprimer)
  const { data: { user } } = await supabase.auth.getUser();

  // ── Guard /admin : authentification requise ───────────────────────────────
  // Le rôle 'admin' est vérifié en aval par ProtectedPage adminOnly (client-side).
  // Ici on bloque uniquement les visiteurs non connectés pour éviter le rendu
  // des pages admin en SSR sans session valide.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/connexion';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
