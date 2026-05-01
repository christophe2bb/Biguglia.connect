export const dynamic = 'force-dynamic';
export const maxDuration = 30;
/**
 * API Route — GET /api/admin/confiance
 *
 * Retourne les données du tableau de bord de confiance admin :
 *   - Avis signalés/visibles (reported / visible reviews)
 *   - Membres à risque (trust_profile_stats)
 *   - Statistiques par thème (agrégat)
 *
 * SÉCURITÉ — pourquoi cette route existe :
 *   Avant ce correctif, la page admin/confiance appelait directement
 *   `createClient()` côté navigateur pour lire les tables `reviews`,
 *   `trust_profile_stats` et `profiles`.
 *   Si la RLS était trop permissive, n'importe quel utilisateur authentifié
 *   pouvait lire les avis signalés ou les profils à risque.
 *
 *   Cette route centralise la lecture des données sensibles côté serveur :
 *   • getAdminUser() vérifie la session + role admin/moderator
 *   • createAdminClient() (service role) contourne la RLS → lecture contrôlée
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminReviewEntry {
  id: string;
  source_type: string;
  rating: number;
  comment: string | null;
  would_recommend: boolean | null;
  moderation_status: string;
  created_at: string;
  author: { id: string; full_name: string; avatar_url: string | null } | null;
  target_user: { id: string; full_name: string; avatar_url: string | null } | null;
  review_tags: Array<{ tag: string }>;
}

export interface AdminRiskMember {
  profile_id: string;
  trust_score: number;
  reviews_received: number;
  avg_rating: number;
  interactions_disputed: number;
  profile: { full_name: string; avatar_url: string | null; role: string } | null;
}

export interface AdminThemeStat {
  source_type: string;
  count: number;
  avg_rating: number;
  total_reviews: number;
}

export interface AdminConfianceData {
  reviews: AdminReviewEntry[];
  riskMembers: AdminRiskMember[];
  themeStats: AdminThemeStat[];
}

// ── GET /api/admin/confiance ──────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  // ── Avis signalés + visibles ──────────────────────────────────────────────
  const { data: reviewsRaw, error: reviewsErr } = await adminClient
    .from('reviews')
    .select(`
      id, source_type, rating, comment, would_recommend, moderation_status, created_at,
      author:profiles!reviews_author_id_fkey(id, full_name, avatar_url),
      target_user:profiles!reviews_target_user_id_fkey(id, full_name, avatar_url),
      review_tags(tag)
    `)
    .in('moderation_status', ['reported', 'visible'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (reviewsErr) {
    return NextResponse.json({ error: reviewsErr.message }, { status: 500 });
  }

  // ── Membres à risque ──────────────────────────────────────────────────────
  const { data: riskRaw, error: riskErr } = await adminClient
    .from('trust_profile_stats')
    .select('profile_id, trust_score, reviews_received, avg_rating, interactions_disputed')
    .or('trust_score.lt.20,interactions_disputed.gt.0')
    .order('trust_score', { ascending: true })
    .limit(20);

  if (riskErr) {
    return NextResponse.json({ error: riskErr.message }, { status: 500 });
  }

  // Enrichir chaque membre à risque avec son profil (requêtes parallèles)
  const riskMembers: AdminRiskMember[] = await Promise.all(
    (riskRaw ?? []).map(async (row: Record<string, unknown>) => {
      const { data: p } = await adminClient
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', row.profile_id as string)
        .maybeSingle();
      return {
        profile_id:             String(row.profile_id ?? ''),
        trust_score:            Number(row.trust_score ?? 0),
        reviews_received:       Number(row.reviews_received ?? 0),
        avg_rating:             Number(row.avg_rating ?? 0),
        interactions_disputed:  Number(row.interactions_disputed ?? 0),
        profile: p
          ? {
              full_name:  String((p as Record<string, unknown>).full_name ?? ''),
              avatar_url: (p as Record<string, unknown>).avatar_url != null
                ? String((p as Record<string, unknown>).avatar_url)
                : null,
              role: String((p as Record<string, unknown>).role ?? ''),
            }
          : null,
      };
    }),
  );

  // ── Statistiques par thème ────────────────────────────────────────────────
  const { data: statsRaw } = await adminClient
    .from('reviews')
    .select('source_type, rating')
    .eq('moderation_status', 'visible');

  const grouped: Record<string, { count: number; totalRating: number }> = {};
  (statsRaw ?? []).forEach((r: Record<string, unknown>) => {
    const t = String(r.source_type ?? '');
    if (!grouped[t]) grouped[t] = { count: 0, totalRating: 0 };
    grouped[t].count++;
    grouped[t].totalRating += Number(r.rating ?? 0);
  });

  const themeStats: AdminThemeStat[] = Object.entries(grouped)
    .map(([source_type, { count, totalRating }]) => ({
      source_type,
      count,
      avg_rating: count > 0 ? totalRating / count : 0,
      total_reviews: count,
    }))
    .sort((a, b) => b.total_reviews - a.total_reviews);

  const payload: AdminConfianceData = {
    reviews:    (reviewsRaw ?? []) as unknown as AdminReviewEntry[],
    riskMembers,
    themeStats,
  };

  return NextResponse.json(payload);
}
