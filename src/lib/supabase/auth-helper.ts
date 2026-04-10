/**
 * Utilitaire : récupère l'utilisateur connecté depuis cookies SSR OU Bearer token.
 * Compatible avec @supabase/ssr + nouvelles clés Supabase.
 */
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function getUserFromRequest(req: Request): Promise<{ id: string; email?: string } | null> {
  // ── Méthode 1 : cookies SSR
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch {
    // ignore
  }

  // ── Méthode 2 : Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const client = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: { user } } = await client.auth.getUser(token);
      if (user) return user;
    } catch {
      // ignore
    }
  }

  return null;
}
