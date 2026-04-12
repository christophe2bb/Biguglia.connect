import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';

/**
 * Client navigateur Supabase (anon key, côté browser).
 *
 * Les variables d'environnement sont validées et nettoyées par
 * `getSupabaseEnv()` (src/lib/supabase/env.ts) :
 *  - Suppression des espaces/\n parasites (copy-paste depuis Vercel dashboard)
 *  - Vérification que l'URL commence par "https://"
 *  - Erreur explicite si une variable est absente ou vide
 *
 * Symptôme typique sans nettoyage :
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY contient un \n final
 *   → clé encodée %0A dans l'URL WebSocket Supabase Realtime
 *   → toutes les connexions WS échouent en boucle.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
