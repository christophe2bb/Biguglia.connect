/**
 * Route de diagnostic — /api/emploi/debug
 * Retourne l'état réel des tables job_offers / job_demands dans Supabase
 * À SUPPRIMER après diagnostic
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  const supabase = createClient();
  const result: Record<string, unknown> = {};

  // 1. Vérifier que la table job_offers existe et ses lignes
  const { data: offers, error: offersErr } = await supabase
    .from('job_offers')
    .select('id, slug, status, title, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  result.offers_error = offersErr
    ? { message: offersErr.message, code: (offersErr as {code?:string}).code, details: (offersErr as {details?:string}).details }
    : null;
  result.offers = offers ?? [];
  result.offers_count = offers?.length ?? 0;

  // 2. Si slug fourni — tester la récupération par slug
  if (slug) {
    const { data: bySlug, error: slugErr } = await supabase
      .from('job_offers')
      .select('id, slug, status, title')
      .eq('slug', slug)
      .single();

    result.slug_query = slug;
    result.slug_error = slugErr
      ? { message: slugErr.message, code: (slugErr as {code?:string}).code }
      : null;
    result.slug_result = bySlug ?? null;
  }

  // 3. Vérifier que la table job_demands existe et ses lignes
  const { data: demands, error: demandsErr } = await supabase
    .from('job_demands')
    .select('id, slug, status, title, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  result.demands_error = demandsErr
    ? { message: demandsErr.message, code: (demandsErr as {code?:string}).code, details: (demandsErr as {details?:string}).details }
    : null;
  result.demands = demands ?? [];
  result.demands_count = demands?.length ?? 0;

  // 4. Test RLS — est-ce que le client anon voit les offres publiées ?
  const { data: published, error: pubErr } = await supabase
    .from('job_offers')
    .select('id, slug, status')
    .eq('status', 'published')
    .limit(5);

  result.published_offers_error = pubErr
    ? { message: pubErr.message, code: (pubErr as {code?:string}).code }
    : null;
  result.published_offers = published ?? [];
  result.published_offers_count = published?.length ?? 0;

  // 5. Test jointure profiles sur job_offers
  const { data: withJoin, error: joinErr } = await supabase
    .from('job_offers')
    .select('id, slug, status, author:profiles!user_id(id, display_name)')
    .limit(3);

  result.join_test_error = joinErr
    ? { message: joinErr.message, code: (joinErr as {code?:string}).code }
    : null;
  result.join_test_ok = !joinErr;
  result.join_sample = withJoin ?? [];

  // 6. Infos environnement
  result.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  result.anon_key_prefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...';

  return NextResponse.json(result, { status: 200 });
}
