/**
 * API Route — GET /api/admin/artisans
 *
 * Retourne la liste des dossiers artisans avec les données sensibles :
 * email, téléphone, SIRET, assurance, URLs de documents (Kbis, pièce d'identité…).
 *
 * SÉCURITÉ — pourquoi cette route existe :
 *   Avant ce correctif, la page admin/artisans appelait directement
 *   `createClient().from('profiles').select('id, full_name, email, phone, ...')`
 *   et `createClient().from('artisan_profiles').select('..., siret, insurance, doc_kbis_url, ...')`
 *   côté navigateur avec la clé anon. La protection reposait uniquement sur la RLS.
 *
 *   Cette route garantit que :
 *   • Seuls les admins/modérateurs authentifiés côté serveur accèdent aux dossiers
 *   • Le SIRET, les URLs de documents et le téléphone ne transitent que sur
 *     des requêtes dont le rôle a été vérifié par getAdminUser()
 *   • createAdminClient() (service role) contourne la RLS de façon contrôlée
 *
 * Query params :
 *   ?filter=all|pending|verified  (défaut : 'all')
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ─── Types de réponse ────────────────────────────────────────────────────────

export interface AdminArtisanEntry {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  service_area: string;
  years_experience: number | null;
  siret: string | null;
  insurance: string | null;
  artisan_type: 'professionnel' | 'particulier' | null;
  doc_kbis_url: string | null;
  doc_insurance_url: string | null;
  doc_id_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  trade_category: { name: string; icon: string } | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    role: string;
    status: string;
    created_at: string;
  } | null;
}

// ─── GET /api/admin/artisans ─────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  // Auth + rôle admin/modérateur (serveur)
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  const filter = (req.nextUrl.searchParams.get('filter') ?? 'all').trim();

  // ── Étape 1 : profils artisans ──────────────────────────────────────────
  let profilesQuery = adminClient
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, role, status, created_at')
    .order('created_at', { ascending: true });

  if (filter === 'pending')  profilesQuery = profilesQuery.eq('role', 'artisan_pending');
  else if (filter === 'verified') profilesQuery = profilesQuery.eq('role', 'artisan_verified');
  else profilesQuery = profilesQuery.in('role', ['artisan_pending', 'artisan_verified']);

  const { data: profiles, error: profilesError } = await profilesQuery;

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ artisans: [] });
  }

  // ── Étape 2 : artisan_profiles + catégories ─────────────────────────────
  const userIds = (profiles as Array<{ id: string }>).map(p => p.id);

  const { data: artisanData, error: artisanError } = await adminClient
    .from('artisan_profiles')
    .select(`
      id, user_id, business_name, description, service_area,
      years_experience, siret, insurance, created_at, artisan_type,
      doc_kbis_url, doc_insurance_url, doc_id_url, rejection_reason,
      trade_category:trade_categories(name, icon)
    `)
    .in('user_id', userIds);

  if (artisanError) {
    return NextResponse.json({ error: artisanError.message }, { status: 500 });
  }

  // ── Fusion ──────────────────────────────────────────────────────────────
  const artisanMap = new Map<string, Record<string, unknown>>();
  for (const a of (artisanData ?? []) as Array<Record<string, unknown>>) {
    artisanMap.set(String(a.user_id), a);
  }

  const artisans: AdminArtisanEntry[] = (profiles as Array<Record<string, unknown>>).map(prof => {
    const art = artisanMap.get(String(prof.id));
    return {
      id:                String(art?.id ?? prof.id),
      user_id:           String(prof.id),
      business_name:     String(art?.business_name ?? ''),
      description:       String(art?.description ?? ''),
      service_area:      String(art?.service_area ?? ''),
      years_experience:  art?.years_experience != null ? Number(art.years_experience) : null,
      siret:             art?.siret != null ? String(art.siret) : null,
      insurance:         art?.insurance != null ? String(art.insurance) : null,
      artisan_type:      (art?.artisan_type as 'professionnel' | 'particulier' | null) ?? null,
      doc_kbis_url:      art?.doc_kbis_url != null ? String(art.doc_kbis_url) : null,
      doc_insurance_url: art?.doc_insurance_url != null ? String(art.doc_insurance_url) : null,
      doc_id_url:        art?.doc_id_url != null ? String(art.doc_id_url) : null,
      rejection_reason:  art?.rejection_reason != null ? String(art.rejection_reason) : null,
      created_at:        String(art?.created_at ?? prof.created_at ?? ''),
      trade_category:    (art?.trade_category as { name: string; icon: string } | null) ?? null,
      profile: {
        id:         String(prof.id),
        full_name:  String(prof.full_name ?? ''),
        email:      String(prof.email ?? ''),
        phone:      prof.phone != null ? String(prof.phone) : null,
        avatar_url: prof.avatar_url != null ? String(prof.avatar_url) : null,
        role:       String(prof.role ?? ''),
        status:     String(prof.status ?? ''),
        created_at: String(prof.created_at ?? ''),
      },
    };
  });

  return NextResponse.json({ artisans });
}
