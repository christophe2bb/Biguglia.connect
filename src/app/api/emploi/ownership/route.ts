/**
 * API Route — /api/emploi/ownership
 * GET ?type=offer|demand&slug=xxx
 * Retourne { isOwner: boolean } pour l'utilisateur connecté.
 *
 * Lit la session via cookies (SSR) ET via Authorization header (Bearer token)
 * pour maximiser la compatibilité avec les différentes versions de Supabase.
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type  = searchParams.get('type');   // 'offer' | 'demand'
  const slug  = searchParams.get('slug');

  if (!type || !slug) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const table = type === 'offer' ? 'job_offers' : 'job_demands';

  // ── Méthode 1 : cookies SSR (Server Component / Route Handler)
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {
    // ignore
  }

  // ── Méthode 2 : Authorization header (Bearer <access_token>)
  if (!userId) {
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
        if (user) userId = user.id;
      } catch {
        // ignore
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ isOwner: false, reason: 'not_authenticated' });
  }

  // ── Lire user_id via admin (bypass RLS)
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .select('user_id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ isOwner: false, reason: 'not_found' });
  }

  const isOwner = (data as any).user_id === userId;
  return NextResponse.json({ isOwner, method: 'admin', userId });
}
