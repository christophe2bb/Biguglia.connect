/**
 * Utilitaires d'authentification pour les API Routes Next.js (Node.js, server-side).
 * Compatible avec @supabase/ssr (cookies SSR) + Bearer token (clients SPA/mobile).
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  SCOPE : API Routes uniquement  (src/app/api/**)                    ║
 * ║                                                                      ║
 * ║  NE PAS utiliser dans :                                              ║
 * ║  • Server Components  → utiliser createClient() de server.ts        ║
 * ║  • Client Components  → utiliser createClient() de client.ts        ║
 * ║  • Middleware         → utiliser createServerClient() de middleware  ║
 * ║  • Services client-side (trust.ts, publish-*.ts)                    ║
 * ║    → ils appellent createClient() navigateur, pas des API Routes     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Deux variantes selon le type de route :
 *
 *  getUserFromRequest(req)          — SSR-first  (cookies → Bearer)
 *    Usage : routes emploi appelées depuis SSR ou formulaires Next.js.
 *    Retourne { id, email, … } | null
 *
 *  getUserIdBearerFirst(req)        — Bearer-first (Bearer → cookies)
 *    Usage : routes messages appelées via fetch() client-side avec
 *            Authorization: Bearer <access_token>.
 *    Retourne string | null  (UUID uniquement — suffisant pour les guards)
 *
 * Couverture actuelle (9 routes) :
 *   emploi/contact · emploi/demandes/[slug] · emploi/offres/[slug]
 *   emploi/ownership · messages/conversations · messages/conversation/[id]
 *   messages/unread · messages/start-conversation · messages/check-conversation
 */
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@/lib/supabase/env';

/** Crée un client anon éphémère pour valider un Bearer token */
function anonClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
