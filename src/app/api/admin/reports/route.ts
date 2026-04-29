/**
 * API Route — GET /api/admin/reports
 *
 * Retourne la liste des signalements avec le profil du reporter.
 * Inclut les compteurs par statut.
 *
 * SÉCURITÉ :
 *   • getAdminUser() vérifie session + role admin/moderator côté serveur
 *   • createAdminClient() (service role) contourne la RLS → lecture sûre
 *   • La lecture directe des signalements depuis le client (createClient)
 *     était soumise à la RLS. Cette route centralise la lecture côté serveur.
 *
 * Query params :
 *   ?status=pending|reviewed|resolved|dismissed  (défaut : tout)
 *   ?target_type=user|post|listing|equipment|message|event  (optionnel)
 */

import 'server-only';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReportEntry {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  target_title?: string | null;
  reason: string;
  description?: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  report_count?: number;
}

export interface ReportCounts {
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
  total: number;
}

export interface AdminReportsData {
  reports: ReportEntry[];
  counts: ReportCounts;
}

// ─── GET /api/admin/reports ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth + rôle admin/modérateur côté serveur
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  const { searchParams } = req.nextUrl;
  const statusFilter    = searchParams.get('status') ?? '';
  const typeFilter      = searchParams.get('target_type') ?? '';

  // ── Lecture des signalements (service role — bypass RLS) ──────────────────
  let query = adminClient
    .from('reports')
    .select('id, reporter_id, target_type, target_id, target_title, reason, description, status, created_at, reporter:profiles!reports_reporter_id_fkey(full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter && ['pending', 'reviewed', 'resolved', 'dismissed'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }
  if (typeFilter) {
    query = query.eq('target_type', typeFilter);
  }

  const { data: rawReports, error: reportsError } = await query;

  if (reportsError) {
    return NextResponse.json({ error: reportsError.message }, { status: 500 });
  }

  // ── Compteurs par statut (requêtes parallèles) ────────────────────────────
  const [
    { count: pendingCount },
    { count: reviewedCount },
    { count: resolvedCount },
    { count: dismissedCount },
    { count: totalCount },
  ] = await Promise.all([
    adminClient.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'reviewed'),
    adminClient.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
    adminClient.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'dismissed'),
    adminClient.from('reports').select('id', { count: 'exact', head: true }),
  ]);

  const counts: ReportCounts = {
    pending:   pendingCount  ?? 0,
    reviewed:  reviewedCount ?? 0,
    resolved:  resolvedCount ?? 0,
    dismissed: dismissedCount ?? 0,
    total:     totalCount    ?? 0,
  };

  // ── Construction report_count (nb de signalements pour le même target) ─────
  const targetCountMap: Record<string, number> = {};
  (rawReports ?? []).forEach(r => {
    const key = `${r.target_type}:${r.target_id}`;
    targetCountMap[key] = (targetCountMap[key] ?? 0) + 1;
  });

  const reports: ReportEntry[] = (rawReports ?? []).map(r => ({
    id:           r.id,
    reporter_id:  r.reporter_id,
    target_type:  r.target_type,
    target_id:    r.target_id,
    target_title: (r as Record<string, unknown>).target_title as string | null ?? null,
    reason:       r.reason,
    description:  (r as Record<string, unknown>).description as string | null ?? null,
    status:       r.status as ReportEntry['status'],
    created_at:   r.created_at,
    reporter:     r.reporter as unknown as ReportEntry['reporter'] ?? null,
    report_count: targetCountMap[`${r.target_type}:${r.target_id}`] ?? 1,
  }));

  return NextResponse.json({ reports, counts } satisfies AdminReportsData);
}
