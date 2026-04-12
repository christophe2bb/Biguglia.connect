import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseEnv, getSupabaseAdminEnv } from './env';

/**
 * Client serveur normal (anon key + cookies de session).
 * Utilisable dans : Server Components, API Routes, Server Actions.
 *
 * Les variables d'environnement sont validées centralement par env.ts :
 * pas de duplication de `cleanEnv()`, même comportement partout.
 */
export function createClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
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
          // Server Component — cookies() en lecture seule dans certains contextes, ignorer
        }
      },
    },
  });
}

/**
 * Client admin (service role key) — bypass RLS complet.
 * À utiliser UNIQUEMENT côté serveur (Server Components, API Routes).
 * Ne JAMAIS exposer côté client ni dans un Client Component.
 *
 * La clé SUPABASE_SERVICE_ROLE_KEY est validée par getSupabaseAdminEnv() :
 * erreur explicite immédiate si la variable est absente ou vide.
 */
export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseAdminEnv();
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
