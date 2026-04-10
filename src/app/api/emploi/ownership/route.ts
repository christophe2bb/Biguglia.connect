/**
 * API Route — /api/emploi/ownership
 * GET ?type=offer|demand&slug=xxx
 * Retourne { isOwner: boolean } pour l'utilisateur connecté.
 *
 * Stratégie en 3 niveaux :
 * 1. Service role (admin) → bypass RLS total si SUPABASE_SERVICE_ROLE_KEY est défini
 * 2. Client authentifié avec filtre user_id (via RLS own_crud)
 * 3. Client authentifié SELECT user_id puis comparaison
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type  = searchParams.get('type');   // 'offer' | 'demand'
  const slug  = searchParams.get('slug');

  if (!type || !slug) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const table = type === 'offer' ? 'job_offers' : 'job_demands';

  // 1. Utilisateur connecté
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ isOwner: false, reason: 'not_authenticated' });
  }

  // 2. Essayer via admin (service role) si disponible
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from(table)
        .select('user_id')
        .eq('slug', slug)
        .single();

      if (!error && data) {
        const isOwner = (data as any).user_id === user.id;
        return NextResponse.json({ isOwner, method: 'admin', userId: user.id });
      }
    } catch {
      // Continuer vers le fallback
    }
  }

  // 3. Fallback : compter les lignes WHERE slug=? AND user_id=auth.uid()
  //    Fonctionne avec la politique RLS "own_crud FOR ALL"
  const { count, error: countErr } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)
    .eq('user_id', user.id);

  if (!countErr && count !== null) {
    return NextResponse.json({ isOwner: count > 0, method: 'rls_count', userId: user.id });
  }

  // 4. Dernier recours : lire user_id directement
  const { data: row } = await supabase
    .from(table)
    .select('user_id')
    .eq('slug', slug)
    .single();

  if (row) {
    const isOwner = (row as any).user_id === user.id;
    return NextResponse.json({ isOwner, method: 'rls_read', userId: user.id });
  }

  return NextResponse.json({ isOwner: false, reason: 'not_found', method: 'fallback' });
}
