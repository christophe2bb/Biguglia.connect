import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Nettoie une variable d'environnement côté serveur.
 * Même logique que client.ts — protège contre les copies avec \n final.
 */
function cleanEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`[Supabase/server] Variable d'environnement manquante : ${name}`);
  }
  const cleaned = value.trim();
  if (cleaned !== value) {
    console.warn(`[Supabase/server] ⚠️  ${name} contenait des espaces/sauts de ligne — nettoyé.`);
  }
  return cleaned;
}

/** Client serveur normal (anon key + cookies session) */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL,      'NEXT_PUBLIC_SUPABASE_URL'),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // Server component — cookies() en lecture seule dans certains contextes, ignorer
          }
        },
      },
    }
  );
}

/**
 * Client admin (service role key) — bypass RLS complet.
 * À utiliser UNIQUEMENT côté serveur (Server Components, API Routes).
 * Ne JAMAIS exposer côté client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL,   'NEXT_PUBLIC_SUPABASE_URL'),
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY,  'SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
