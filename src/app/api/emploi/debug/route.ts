/**
 * Route de diagnostic — /api/emploi/debug
 * GET ?slug=xxx   → infos sur les offres + test contact API
 * À SUPPRIMER après diagnostic
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  const supabase = createClient();
  const result: Record<string, unknown> = {};

  // 0. Variables d'environnement
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  result.env_check = {
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service_role_key_set: !!serviceRoleKey,
    service_role_key_prefix: serviceRoleKey ? serviceRoleKey.slice(0, 30) + '...' : 'ABSENT ❌',
  };

  // 0b. Test client admin
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

  // 0c. Utilisateur connecté (SSR cookies — sera null si pas de session cookie)
  const { data: { user } } = await supabase.auth.getUser();
  result.current_user = user ? { id: user.id, email: user.email } : null;

  // 1. Offres publiées (via admin — bypass RLS)
  const admin = createAdminClient();
  const { data: offers, error: offersErr } = await admin
    .from('job_offers')
    .select('id, slug, status, title, user_id, contact_email, contact_phone, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  result.offers_error = offersErr ? { message: offersErr.message, code: (offersErr as {code?:string}).code } : null;
  result.offers = (offers ?? []).map((o: Record<string, unknown>) => ({
    id: o.id,
    slug: o.slug,
    status: o.status,
    title: o.title,
    has_user_id: !!o.user_id,
    has_contact_email: !!o.contact_email,
    has_contact_phone: !!o.contact_phone,
  }));
  result.offers_count = offers?.length ?? 0;

  // 2. Test slug spécifique via admin + maybeSingle (comme la vraie API contact)
  if (slug) {
    result.slug_tested = slug;

    // 2a. maybeSingle (comportement exact de l'API contact)
    const { data: bySlugAdmin, error: slugAdminErr } = await admin
      .from('job_offers')
      .select('id, slug, status, title, user_id, contact_email, contact_phone')
      .eq('slug', slug)
      .maybeSingle();

    result.admin_maybeSingle = {
      found: !!bySlugAdmin,
      error: slugAdminErr ? { message: slugAdminErr.message, code: (slugAdminErr as {code?:string}).code } : null,
      has_user_id: !!(bySlugAdmin as Record<string,unknown> | null)?.user_id,
      has_contact_email: !!(bySlugAdmin as Record<string,unknown> | null)?.contact_email,
      has_contact_phone: !!(bySlugAdmin as Record<string,unknown> | null)?.contact_phone,
      status: (bySlugAdmin as Record<string,unknown> | null)?.status,
    };

    // 2b. Comparaison user_id si connecté
    if (user && bySlugAdmin) {
      result.is_owner_ssr = (bySlugAdmin as Record<string,unknown>).user_id === user.id;
    }
  }

  // 3. Demandes
  const { data: demands, error: demandsErr } = await admin
    .from('job_demands')
    .select('id, slug, status, title, user_id, published_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  result.demands_error = demandsErr ? { message: demandsErr.message, code: (demandsErr as {code?:string}).code } : null;
  result.demands = demands ?? [];
  result.demands_count = demands?.length ?? 0;

  // 4. Infos
  result.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  result.anon_key_prefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...';
  result.note = 'current_user sera null si pas de cookie SSR (normal). OwnerActions et ProtectedContact utilisent le Bearer token côté client.';

  return NextResponse.json(result, { status: 200 });
}
