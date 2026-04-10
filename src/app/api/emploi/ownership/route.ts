/**
 * API Route — /api/emploi/ownership
 * GET ?type=offer|demand&slug=xxx
 * Retourne { isOwner: boolean } pour l'utilisateur connecté.
 * Utilise le service role (bypass RLS) pour lire user_id.
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

  // 2. Lire user_id via admin (bypass RLS)
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(table)
    .select('user_id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ isOwner: false, reason: 'not_found' });
  }

  const isOwner = (data as any).user_id === user.id;
  return NextResponse.json({ isOwner, userId: user.id });
}
