/**
 * Utilitaires d'authentification pour les API Routes Next.js.
 * Compatible avec @supabase/ssr (cookies SSR) + Bearer token (clients SPA/mobile).
 *
 * Deux variantes selon le contexte :
 *
 *  getUserFromRequest(req)
 *    Priorité SSR → Bearer.
 *    Usage : routes emploi (Server Components, formulaires, SSR-first).
 *
 *  getUserIdBearerFirst(req)
 *    Priorité Bearer → SSR.
 *    Usage : routes messages (appelées via fetch() client-side avec Authorization header).
 *    Retourne uniquement l'UUID (string | null) — suffisant pour les guards.
 */
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** Crée un client anon éphémère pour valider un Bearer token */
function anonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * SSR-first (cookies → Bearer).
 * Retourne l'objet user complet { id, email, … } ou null.
 * Utilisé par les routes emploi (offres, demandes, contact, ownership).
 */
export async function getUserFromRequest(
  req: Request
): Promise<{ id: string; email?: string } | null> {
  // Méthode 1 : cookies SSR
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch { /* ignore */ }

  // Méthode 2 : Bearer token
  const token = extractBearer(req);
  if (token) {
    try {
      const { data: { user } } = await anonClient().auth.getUser(token);
      if (user) return user;
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Bearer-first (Bearer → SSR cookies).
 * Retourne uniquement l'UUID (string | null).
 * Utilisé par les routes messages où le client envoie Authorization: Bearer <token>.
 */
export async function getUserIdBearerFirst(req: Request): Promise<string | null> {
  // Méthode 1 : Bearer token
  const token = extractBearer(req);
  if (token) {
    try {
      const { data: { user } } = await anonClient().auth.getUser(token);
      if (user?.id) return user.id;
    } catch { /* ignore */ }
  }

  // Méthode 2 : cookies SSR (fallback)
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch { /* ignore */ }

  return null;
}

/** Extrait le token depuis "Authorization: Bearer <token>" */
function extractBearer(req: Request): string | null {
  const header = req.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}
