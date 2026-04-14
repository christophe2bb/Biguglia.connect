/**
 * src/lib/admin-fetch.ts
 *
 * Helper fetch pour les appels aux API routes /api/admin/**
 * Ajoute automatiquement le JWT Bearer token dans le header Authorization.
 *
 * Pourquoi ? Les cookies SSR Supabase ne sont pas correctement transmis
 * dans la config Vercel actuelle → les API routes admin retournent 401.
 * En envoyant le token en Bearer, getUserFromRequest() le lit correctement.
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Fetch avec Authorization: Bearer <token> automatique.
 * Utilise les mêmes paramètres que fetch() standard.
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = new Headers(options.headers ?? {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  } catch {
    // En cas d'erreur de récupération du token, faire le fetch sans token
    return fetch(url, options);
  }
}
