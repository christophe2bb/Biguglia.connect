/**
 * API Route — GET /api/admin/users
 *
 * Retourne la liste des utilisateurs (hors admins) avec leurs données PII
 * (email, téléphone, statut, rôle) et compteurs d'activité.
 *
 * SÉCURITÉ — pourquoi cette route existe :
 *   Avant ce correctif, la page admin/utilisateurs appelait directement
 *   `createClient().from('profiles').select('*')` côté navigateur avec la
 *   clé anon. Toute la protection reposait sur la RLS Supabase.
 *   Si la politique RLS `profiles` était trop permissive (ex. USING (true)),
 *   n'importe quel utilisateur authentifié pouvait lire tous les emails et
 *   téléphones de la base.
 *
 *   Cette route centralise la lecture des données sensibles côté serveur :
 *   • getAdminUser() vérifie la session + role admin/moderator
 *   • createAdminClient() (service role) contourne la RLS → on est sûr de lire
 *     exactement ce qu'on veut, indépendamment des politiques publiques
 *   • Les données PII ne transitent que par des requêtes authentifiées admin
 *
 * Query params :
 *   ?filter=all|pending|verified|suspended  (défaut : 'all')
 *   ?search=<string>                         (optionnel, filtrage serveur)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ─── Types de réponse ────────────────────────────────────────────────────────

export interface AdminUserEntry {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  created_at: string;
  // Compteurs d'activité (calculés côté serveur)
  message_count: number;
  listing_count: number;
  post_count: number;
  request_count: number;
  // Relation artisan
  artisan_profile: {
    id: string;
    business_name: string;
    artisan_type: string | null;
    trade_category: { name: string; icon: string } | null;
  } | null;
}

// ─── GET /api/admin/users ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth + rôle admin/modérateur (serveur)
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  // Paramètres de filtre
  const { searchParams } = req.nextUrl;
  const filter = searchParams.get('filter') ?? 'all';
  const search = (searchParams.get('search') ?? '').trim().toLowerCase();

  // ── Requête profiles via adminClient (service role — bypasse RLS) ──────────
  let query = adminClient
    .from('profiles')
    .select(`
      id, full_name, email, phone, avatar_url, role, status, created_at,
      artisan_profile:artisan_profiles(
        id, business_name, artisan_type,
        trade_category:trade_categories(name, icon)
      )
    `)
    .neq('role', 'admin')
    .order('created_at', { ascending: false });

  if (filter === 'pending')   query = query.eq('role', 'artisan_pending');
  if (filter === 'verified')  query = query.eq('role', 'artisan_verified');
  if (filter === 'suspended') query = query.eq('status', 'suspended');

  const { data: profiles, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rawProfiles = (profiles ?? []) as Array<Record<string, unknown>>;

  // Filtre search (serveur) sur full_name, email, phone
  const filtered = search
    ? rawProfiles.filter(p =>
        String(p.full_name ?? '').toLowerCase().includes(search) ||
        String(p.email ?? '').toLowerCase().includes(search) ||
        String(p.phone ?? '').toLowerCase().includes(search),
      )
    : rawProfiles;

  if (filtered.length === 0) {
    return NextResponse.json({ users: [] });
  }

  // ── Compteurs d'activité (requêtes parallèles) ────────────────────────────
  const userIds = filtered.map(p => String(p.id));

  const [
    { data: msgs },
    { data: listings },
    { data: posts },
    { data: requests },
  ] = await Promise.all([
    adminClient.from('messages').select('sender_id').in('sender_id', userIds),
    adminClient.from('listings').select('owner_id').in('owner_id', userIds),
    adminClient.from('forum_posts').select('author_id').in('author_id', userIds),
    adminClient.from('service_requests').select('resident_id').in('resident_id', userIds),
  ]);

  const countBy = (
    arr: Array<Record<string, unknown>> | null,
    key: string,
  ): Record<string, number> => {
    const map: Record<string, number> = {};
    (arr ?? []).forEach(r => {
      const v = String(r[key] ?? '');
      map[v] = (map[v] ?? 0) + 1;
    });
    return map;
  };

  const msgMap      = countBy(msgs      as Array<Record<string, unknown>> | null, 'sender_id');
  const listingMap  = countBy(listings  as Array<Record<string, unknown>> | null, 'owner_id');
  const postMap     = countBy(posts     as Array<Record<string, unknown>> | null, 'author_id');
  const requestMap  = countBy(requests  as Array<Record<string, unknown>> | null, 'resident_id');

  // ── Assemblage de la réponse ──────────────────────────────────────────────
  const users: AdminUserEntry[] = filtered.map(p => {
    const id = String(p.id);
    return {
      id,
      full_name:     String(p.full_name ?? ''),
      email:         String(p.email ?? ''),
      phone:         p.phone != null ? String(p.phone) : null,
      avatar_url:    p.avatar_url != null ? String(p.avatar_url) : null,
      role:          String(p.role ?? ''),
      status:        String(p.status ?? ''),
      created_at:    String(p.created_at ?? ''),
      message_count: msgMap[id]     ?? 0,
      listing_count: listingMap[id] ?? 0,
      post_count:    postMap[id]    ?? 0,
      request_count: requestMap[id] ?? 0,
      artisan_profile: p.artisan_profile as AdminUserEntry['artisan_profile'] ?? null,
    };
  });

  return NextResponse.json({ users });
}
