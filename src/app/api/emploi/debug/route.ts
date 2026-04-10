/**
 * Route de diagnostic — /api/emploi/debug
 * Retourne l'état réel des tables job_offers / job_demands dans Supabase
 * À SUPPRIMER après diagnostic
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  const supabase = createClient();
  const result: Record<string, unknown> = {};

  // 0. Vérifier les variables d'environnement
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  result.env_check = {
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role_key_set: !!serviceRoleKey,
    service_role_key_prefix: serviceRoleKey ? serviceRoleKey.slice(0, 30) + '...' : 'ABSENT ❌',
  };

  // 0b. Test du client admin
  try {
    const admin = createAdminClient();
    const { data: adminTest, error: adminErr } = await admin
      .from('job_offers')
      .select('id')
      .limit(1);
    result.admin_client_test = {
      ok: !adminErr,
      error: adminErr ? adminErr.message : null,
      rows: adminTest?.length ?? 0,
    };
  } catch (e: unknown) {
    result.admin_client_test = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      rows: 0,
    };
  }

  // 0c. Test utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser();
  result.current_user = user
    ? { id: user.id, email: user.email }
    : null;

  // 1. Vérifier que la table job_offers existe et ses lignes
  const { data: offers, error: offersErr } = await supabase
    .from('job_offers')
    .select('id, slug, status, title, user_id, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  result.offers_error = offersErr
    ? { message: offersErr.message, code: (offersErr as {code?:string}).code, details: (offersErr as {details?:string}).details }
    : null;
  result.offers = (offers ?? []).map((o: Record<string, unknown>) => ({
    ...o,
    user_id_visible: !!(o as Record<string, unknown>).user_id,
  }));
  result.offers_count = offers?.length ?? 0;

  // 2. Si slug fourni — tester la récupération par slug
  if (slug) {
    // 2a. Via client anon
    const { data: bySlug, error: slugErr } = await supabase
      .from('job_offers')
      .select('id, slug, status, title, user_id')
      .eq('slug', slug)
      .single();

    result.slug_query = slug;
    result.slug_error = slugErr
      ? { message: slugErr.message, code: (slugErr as {code?:string}).code }
      : null;
    result.slug_result = bySlug ?? null;
    result.slug_user_id_visible = !!(bySlug as Record<string, unknown> | null)?.user_id;

    // 2b. Via client admin (service role)
    try {
      const admin = createAdminClient();
      const { data: bySlugAdmin, error: slugAdminErr } = await admin
        .from('job_offers')
        .select('id, slug, status, title, user_id')
        .eq('slug', slug)
        .single();

      result.slug_admin_error = slugAdminErr
        ? { message: slugAdminErr.message }
        : null;
      result.slug_admin_result = bySlugAdmin ?? null;
      result.slug_admin_user_id_visible = !!(bySlugAdmin as Record<string, unknown> | null)?.user_id;

      // 2c. Vérifier si l'utilisateur connecté est propriétaire
      if (user && bySlugAdmin) {
        result.is_owner = (bySlugAdmin as Record<string, unknown>).user_id === user.id;
      }
    } catch (e: unknown) {
      result.slug_admin_error = e instanceof Error ? e.message : String(e);
    }
  }

  // 3. Vérifier que la table job_demands existe et ses lignes
  const { data: demands, error: demandsErr } = await supabase
    .from('job_demands')
    .select('id, slug, status, title, user_id, published_at, created_at')
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

  // 5. Infos environnement
  result.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  result.anon_key_prefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...';

  return NextResponse.json(result, { status: 200 });
}
