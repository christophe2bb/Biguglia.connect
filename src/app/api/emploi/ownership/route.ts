/**
 * API Route — /api/emploi/ownership
 * GET ?type=offer|demand&slug=xxx
 * Retourne { isOwner: boolean } pour l'utilisateur connecté.
 *
 * Lit la session via cookies (SSR) ET via Authorization header (Bearer token)
 * pour maximiser la compatibilité avec les différentes versions de Supabase.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/supabase/auth-helper';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type  = searchParams.get('type');   // 'offer' | 'demand'
  const slug  = searchParams.get('slug');

  if (!type || !slug) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const table = type === 'offer' ? 'job_offers' : 'job_demands';

  const authUser = await getUserFromRequest(req);
  const userId = authUser?.id ?? null;

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
  // Ne jamais exposer userId ni les détails internes dans la réponse publique
  return NextResponse.json({ isOwner });
}
