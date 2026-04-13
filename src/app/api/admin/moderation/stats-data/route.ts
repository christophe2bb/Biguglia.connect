/**
 * API Route — GET /api/admin/moderation/stats-data
 * ──────────────────────────────────────────────────────────────────────────────
 * Retourne les statistiques complètes de modération pour le tableau de bord.
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie session + role admin/moderator côté serveur.
 *   • adminClient (service-role) bypass la RLS.
 *   • Avant ce correctif, moderation/stats/page.tsx effectuait ~15 requêtes
 *     Supabase directement depuis le navigateur via la clé anon, exposant
 *     des données de modération et des profils utilisateurs sensibles.
 *
 * Réponse : { stats: ModerationStats }
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { captureApiError } from '@/lib/monitoring/sentry';

// ─── Types exportés ───────────────────────────────────────────────────────────

export interface RecentDecision {
  id: string;
  content_type: string;
  content_title: string;
  status: string;
  decision?: string;
  reviewed_at: string;
  author?: { full_name: string };
}

export interface MemberStat {
  id: string;
  full_name: string;
  avatar_url?: string;
  publication_count: number;
  reports_received: number;
  trust_level: string;
}

export interface ByTypeStat {
  type: string;
  count: number;
  pending: number;
  refused: number;
}

export interface ModerationStats {
  total: number;
  pending: number;
  published: number;
  refused: number;
  correction: number;
  archived: number;
  avgReviewHours: number | null;
  last24h: number;
  highRisk: number;
  newAuthors: number;
  byType: ByTypeStat[];
  recentDecisions: RecentDecision[];
  problematicMembers: MemberStat[];
  trustedMembers: MemberStat[];
}

/** Type alias pour compatibilité avec les pages clientes */
export type ModerationStatsData = ModerationStats;

// ─── Types de contenu (liste exhaustive) ─────────────────────────────────────
const CONTENT_TYPES = [
  'listing', 'equipment', 'help_request', 'outing', 'event',
  'lost_found', 'collection_item', 'association', 'forum_post',
] as const;

/** Type union des types de contenu modérés */
export type ContentType = typeof CONTENT_TYPES[number];

// ─── GET /api/admin/moderation/stats-data ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient, actor } = guard;

  try {
    // ── KPI global (vue SQL) ─────────────────────────────────────────────────
    const { data: kpi } = await adminClient
      .from('moderation_kpi')
      .select('*')
      .single();

    // ── Statistiques par type de contenu (requêtes parallèles) ───────────────
    const byTypeResults = await Promise.all(
      CONTENT_TYPES.map(async (type) => {
        const [
          { count: total },
          { count: pending },
          { count: refused },
        ] = await Promise.all([
          adminClient.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('content_type', type),
          adminClient.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('content_type', type).eq('status', 'en_attente_validation'),
          adminClient.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('content_type', type).eq('status', 'refuse'),
        ]);
        return { type, count: total ?? 0, pending: pending ?? 0, refused: refused ?? 0 };
      }),
    );

    // ── Décisions récentes ───────────────────────────────────────────────────
    const { data: recent } = await adminClient
      .from('moderation_queue')
      .select(`
        id, content_type, content_title, status, decision, reviewed_at,
        author:profiles!moderation_queue_author_id_fkey(full_name)
      `)
      .in('status', ['publie', 'refuse', 'a_corriger'])
      .not('reviewed_at', 'is', null)
      .order('reviewed_at', { ascending: false })
      .limit(10);

    // ── Membres sous surveillance (trust_level = surveille) ──────────────────
    const { data: problematic } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, publication_count, reports_received, trust_level')
      .eq('trust_level', 'surveille')
      .order('reports_received', { ascending: false })
      .limit(5);

    // ── Membres fiables (trust_level in fiable | de_confiance) ───────────────
    const { data: trusted } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, publication_count, reports_received, trust_level')
      .in('trust_level', ['fiable', 'de_confiance'])
      .order('publication_count', { ascending: false })
      .limit(5);

    const stats: ModerationStats = {
      total:            Number(kpi?.total)      || 0,
      pending:          Number(kpi?.pending)    || 0,
      published:        Number(kpi?.published)  || 0,
      refused:          Number(kpi?.refused)    || 0,
      correction:       Number(kpi?.correction) || 0,
      archived:         Number(kpi?.archived)   || 0,
      avgReviewHours:   kpi?.avg_review_hours ? Number(kpi.avg_review_hours) : null,
      last24h:          Number(kpi?.last_24h)   || 0,
      highRisk:         Number(kpi?.high_risk)  || 0,
      newAuthors:       Number(kpi?.new_authors) || 0,
      byType:           byTypeResults.filter(b => b.count > 0).sort((a, b) => b.count - a.count),
      recentDecisions:  (recent ?? []) as unknown as RecentDecision[],
      problematicMembers: (problematic ?? []) as MemberStat[],
      trustedMembers:   (trusted ?? []) as MemberStat[],
    };

    return NextResponse.json({ stats });

  } catch (err) {
    captureApiError(err, {
      route:   '/api/admin/moderation/stats-data',
      method:  'GET',
      userId:  actor.id,
      userRole: actor.role,
    });
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
