/**
 * API Route — GET /api/admin/contenu/[table]
 *
 * Lit le contenu d'une table admin avec les jointures profiles.
 * Utilise le service-role (adminClient) pour bypasser la RLS et
 * résoudre les FK ambiguës (ex: listings a user_id ET owner_id → profiles).
 *
 * Tables supportées : listings | forum_posts | equipment_items | reviews
 *
 * Query params optionnels :
 *   ?search=...   — filtre texte (titre ou nom auteur)
 *   ?status=...   — filtre statut (listings seulement)
 *   ?limit=N      — max résultats (défaut 200)
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie la session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) contourne la RLS
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ── Tables autorisées ─────────────────────────────────────────────────────────
const ALLOWED_TABLES = ['listings', 'forum_posts', 'equipment_items', 'reviews'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

interface RouteParams {
  params: Promise<{ table: string }>;
}

// ── GET /api/admin/contenu/[table] ────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { table: rawTable } = await params;

  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  if (!(ALLOWED_TABLES as readonly string[]).includes(rawTable)) {
    return NextResponse.json(
      { error: `Table non autorisée : "${rawTable}". Tables supportées : ${ALLOWED_TABLES.join(', ')}.` },
      { status: 400 },
    );
  }

  const table   = rawTable as AllowedTable;
  const { adminClient } = guard;
  const search  = req.nextUrl.searchParams.get('search') ?? '';
  const status  = req.nextUrl.searchParams.get('status') ?? '';
  const limit   = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '200', 10), 500);

  try {
    // ── listings ─────────────────────────────────────────────────────────────
    if (table === 'listings') {
      // listings a deux FK vers profiles (user_id + owner_id) → FK ambiguë.
      // On lit d'abord les listings, puis les profils séparément.
      let q = adminClient
        .from('listings')
        .select(`
          id, title, description, status, condition, is_free, price,
          created_at, updated_at, user_id,
          category:listing_categories(name, icon)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) q = q.eq('status', status);
      if (search) q = q.ilike('title', `%${search}%`);

      const { data: rows, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Enrich avec le profil auteur (user_id → profiles)
      const userIds = [...new Set((rows ?? []).map(r => r.user_id).filter(Boolean))];
      const profileMap: Record<string, { id: string; full_name: string; email: string; avatar_url: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds as string[]);
        for (const p of profiles ?? []) profileMap[p.id] = p;
      }

      const items = (rows ?? []).map(r => ({
        ...r,
        owner: r.user_id ? profileMap[r.user_id] ?? null : null,
      }));

      return NextResponse.json({ items });
    }

    // ── forum_posts ──────────────────────────────────────────────────────────
    if (table === 'forum_posts') {
      let q = adminClient
        .from('forum_posts')
        .select(`
          id, title, content, is_closed, is_pinned, view_count, created_at, author_id,
          category:forum_categories(name, icon)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (search) q = q.ilike('title', `%${search}%`);

      const { data: rows, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const authorIds = [...new Set((rows ?? []).map(r => r.author_id).filter(Boolean))];
      const profileMap: Record<string, { id: string; full_name: string; email: string; avatar_url: string }> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', authorIds as string[]);
        for (const p of profiles ?? []) profileMap[p.id] = p;
      }

      const items = (rows ?? []).map(r => ({
        ...r,
        author: r.author_id ? profileMap[r.author_id] ?? null : null,
      }));

      return NextResponse.json({ items });
    }

    // ── equipment_items ──────────────────────────────────────────────────────
    if (table === 'equipment_items') {
      let q = adminClient
        .from('equipment_items')
        .select(`
          id, title, description, is_available, borrow_count, condition, created_at, owner_id,
          category:equipment_categories(name, icon)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (search) q = q.ilike('title', `%${search}%`);

      const { data: rows, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const ownerIds = [...new Set((rows ?? []).map(r => r.owner_id).filter(Boolean))];
      const profileMap: Record<string, { id: string; full_name: string; email: string; avatar_url: string }> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', ownerIds as string[]);
        for (const p of profiles ?? []) profileMap[p.id] = p;
      }

      const items = (rows ?? []).map(r => ({
        ...r,
        owner: r.owner_id ? profileMap[r.owner_id] ?? null : null,
      }));

      return NextResponse.json({ items });
    }

    // ── reviews ──────────────────────────────────────────────────────────────
    if (table === 'reviews') {
      let q = adminClient
        .from('reviews')
        .select(`
          id, rating, comment, created_at, reviewer_id, artisan_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (search) q = q.ilike('comment', `%${search}%`);

      const { data: rows, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Reviewer profiles
      const reviewerIds = [...new Set((rows ?? []).map(r => r.reviewer_id).filter(Boolean))];
      const reviewerMap: Record<string, { id: string; full_name: string; email: string; avatar_url: string }> = {};
      if (reviewerIds.length > 0) {
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', reviewerIds as string[]);
        for (const p of profiles ?? []) reviewerMap[p.id] = p;
      }

      // Artisan profiles (business_name from artisan_profiles)
      const artisanIds = [...new Set((rows ?? []).map(r => r.artisan_id).filter(Boolean))];
      const artisanMap: Record<string, { id: string; business_name: string }> = {};
      if (artisanIds.length > 0) {
        const { data: artisans } = await adminClient
          .from('artisan_profiles')
          .select('id, business_name')
          .in('id', artisanIds as string[]);
        for (const a of artisans ?? []) artisanMap[a.id] = a;
      }

      const items = (rows ?? []).map(r => ({
        ...r,
        reviewer: r.reviewer_id ? reviewerMap[r.reviewer_id] ?? null : null,
        artisan:  r.artisan_id  ? artisanMap[r.artisan_id]   ?? null : null,
      }));

      return NextResponse.json({ items });
    }

    return NextResponse.json({ error: 'Table non supportée.' }, { status: 400 });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne.' },
      { status: 500 },
    );
  }
}
