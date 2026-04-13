import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseEnv, getSupabaseAdminEnv } from './env';
import type { Database } from '@/types/supabase';

/**
 * ─── Garde server-only ───────────────────────────────────────────────────────
 * Ce fichier importe 'server-only'. Toute tentative d'import dans un Client
 * Component déclenchera une erreur de build Next.js immédiate, empêchant
 * l'exposition de SUPABASE_SERVICE_ROLE_KEY dans le bundle navigateur.
 * ─────────────────────────────────────────────────────────────────────────────
 *
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

// ─── Clients typés pour les requêtes jobs ────────────────────────────────────
//
// Ces deux fonctions retournent des SupabaseClient<Database> (@supabase/supabase-js).
// @supabase/ssr's createServerClient<Database> ne supporte pas correctement le
// générique Database avec notre version (^0.3.0), donc on utilise createSupabaseClient
// directement, ce qui donne l'inférence complète des types de projection DB.
//
// Les clients généraux (createClient / createAdminClient) restent non-paramétrés
// pour ne pas imposer le schéma partiel à toutes les autres routes de l'app.

/**
 * Client typé `Database` (anon key) — réservé à src/services/jobs/queries/.
 * Les requêtes .from('job_offers') et .from('job_demands') retournent
 * des types complètement inférés sans aucun cast `as X`.
 *
 * Note : utilise createSupabaseClient<Database> (pas createServerClient) car
 * @supabase/ssr ^0.3.0 ne supporte pas le générique Database correctement.
 * Le contexte serveur est garanti par l'appelant (Server Component / API Route).
 */
export function createJobsClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Client admin typé `Database` (service role key) — réservé à src/services/jobs/queries/.
 * Bypass RLS + inférence complète pour job_offers et job_demands.
 */
export function createJobsAdminClient(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = getSupabaseAdminEnv();
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
