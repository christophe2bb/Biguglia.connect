/**
 * API Route — GET /api/admin/moderation/queue
 * ──────────────────────────────────────────────────────────────────────────────
 * Retourne la file de modération (moderation_queue) + KPI (moderation_kpi).
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie session + role admin/moderator côté serveur.
 *   • adminClient (service-role) bypass la RLS — la table moderation_queue
 *     peut contenir du contenu non encore publié (sensible).
 *   • Avant ce correctif, moderation/page.tsx appelait directement
 *     createClient() côté navigateur, exposant les données de modération
 *     à tout utilisateur capable de rejouer les requêtes avec la clé anon.
 *
 * Query params :
 *   status       — filtre sur moderation_queue.status (défaut: en_attente_validation)
 *   content_type — filtre sur moderation_queue.content_type (défaut: all)
 *   risk_level   — filtre sur moderation_queue.risk_level   (défaut: all)
 *   author_trust — filtre sur moderation_queue.author_trust (défaut: all)
 *   search       — ilike sur content_title
 *   sort         — 'submitted_at' | 'risk_score' (défaut: submitted_at)
 *
 * Réponse :
 *   { items: QueueItem[], kpi: KPIData }
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { captureApiError } from '@/lib/monitoring/sentry';

// ─── Types exportés (réutilisés par la page cliente) ─────────────────────────

export interface QueueAuthor {
  id: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  publication_count?: number;
  reports_received?: number;
  trust_level?: string;
}

export interface QueueItem {
  id: string;
  content_type: string;
  content_id: string;
  content_title: string;
  content_excerpt: string;
  content_photos: string[];
  author_id: string;
  author_trust: string;
  status: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  completeness: number;
  validation_errors: { field: string; label?: string; message: string; weight: number }[];
  reviewed_by?: string;
  reviewed_at?: string;
  decision?: string;
  refusal_reason?: string;
  correction_reason?: string;
  moderator_note?: string;
  resubmit_count: number;
  submitted_at: string;
  author?: QueueAuthor;
}

export interface ModerationKPI {
  total: number;
  pending: number;
  published: number;
  refused: number;
  correction: number;
  archived: number;
  avg_review_hours: number | null;
  high_risk: number;
  new_authors: number;
  last_24h: number;
}

export interface ModerationQueueData {
  items: QueueItem[];
  kpi: ModerationKPI | null;
}

// ─── GET /api/admin/moderation/queue ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient, actor } = guard;
  const { searchParams } = new URL(req.url);

  const status      = searchParams.get('status')       ?? 'en_attente_validation';
  const contentType = searchParams.get('content_type') ?? 'all';
  const riskLevel   = searchParams.get('risk_level')   ?? 'all';
  const authorTrust = searchParams.get('author_trust') ?? 'all';
  const search      = searchParams.get('search')       ?? '';
  const sort        = searchParams.get('sort') === 'risk_score' ? 'risk_score' : 'submitted_at';

  try {
    // ── KPI global (vue SQL) ─────────────────────────────────────────────────
    const { data: kpiRaw } = await adminClient
      .from('moderation_kpi')
      .select('*')
      .single();

    const kpi: ModerationKPI | null = kpiRaw ? {
      total:            Number(kpiRaw.total)            || 0,
      pending:          Number(kpiRaw.pending)          || 0,
      published:        Number(kpiRaw.published)        || 0,
      refused:          Number(kpiRaw.refused)          || 0,
      correction:       Number(kpiRaw.correction)       || 0,
      archived:         Number(kpiRaw.archived)         || 0,
      avg_review_hours: kpiRaw.avg_review_hours ? Number(kpiRaw.avg_review_hours) : null,
      high_risk:        Number(kpiRaw.high_risk)        || 0,
      new_authors:      Number(kpiRaw.new_authors)      || 0,
      last_24h:         Number(kpiRaw.last_24h)         || 0,
    } : null;

    // ── File de modération ───────────────────────────────────────────────────
    let query = adminClient
      .from('moderation_queue')
      .select(`
        *,
        author:profiles!moderation_queue_author_id_fkey(
          id, full_name, avatar_url, created_at,
          publication_count, reports_received, trust_level
        )
      `)
      .order(sort, { ascending: sort === 'risk_score' ? false : true });

    if (status      !== 'all') query = query.eq('status',       status);
    if (contentType !== 'all') query = query.eq('content_type', contentType);
    if (riskLevel   !== 'all') query = query.eq('risk_level',   riskLevel);
    if (authorTrust !== 'all') query = query.eq('author_trust', authorTrust);
    if (search.trim())         query = query.ilike('content_title', `%${search.trim()}%`);

    const { data, error } = await query.limit(100);

    if (error) {
      captureApiError(error, {
        route:  '/api/admin/moderation/queue',
        method: 'GET',
        userId: actor.id,
        userRole: actor.role,
        tags:   { step: 'fetch_queue' },
      });
      return NextResponse.json({ error: 'Erreur lors du chargement de la file.' }, { status: 500 });
    }

    const items = (data ?? []) as unknown as QueueItem[];

    return NextResponse.json({ items, kpi } satisfies ModerationQueueData);

  } catch (err) {
    captureApiError(err, {
      route:  '/api/admin/moderation/queue',
      method: 'GET',
      userId: actor.id,
      userRole: actor.role,
    });
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
