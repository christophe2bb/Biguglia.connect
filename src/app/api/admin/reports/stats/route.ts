/**
 * API Route — GET /api/admin/reports/stats
 * ─────────────────────────────────────────────────────────────────────────────
 * Retourne l'ensemble des métriques analytiques sur les signalements :
 *  - KPIs globaux (totaux, taux, délais)
 *  - Répartition par statut / type / raison
 *  - Top signaleurs & top cibles
 *  - Série temporelle (30 jours glissants, par jour)
 *  - Temps de traitement (min / avg / max par type)
 *  - Membres récidivistes (même target signalé N fois)
 *
 * SÉCURITÉ : getAdminUser() — service-role, bypass RLS.
 */

import 'server-only';
export const dynamic   = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser }              from '@/lib/supabase/admin-guard';

// ─── Types exportés ───────────────────────────────────────────────────────────

export interface ReportKPI {
  total:              number;
  pending:            number;
  reviewed:           number;
  resolved:           number;
  dismissed:          number;
  resolutionRate:     number;   // % (resolved / total)
  dismissRate:        number;   // % (dismissed / total)
  avgResolutionHours: number | null;
  minResolutionHours: number | null;
  maxResolutionHours: number | null;
  last7d:             number;
  last30d:            number;
  todayCount:         number;
}

export interface ByStatusStat  { status: string;      count: number; pct: number }
export interface ByTypeStat    { type: string;        count: number; pct: number; resolved: number; pending: number }
export interface ByReasonStat  { reason: string;      count: number; pct: number; resolved: number }
export interface DayStat       { date: string;        count: number; resolved: number }
export interface TopReporter   { id: string; full_name: string; avatar_url: string | null; count: number }
export interface TopTarget     { target_type: string; target_id: string; target_title: string | null; count: number; status: string }
export interface Recidivist    { target_type: string; target_id: string; target_title: string | null; total: number; pending: number }
export interface ResolutionByType { type: string; avg_hours: number | null; min_hours: number | null; max_hours: number | null; count: number }

export interface ReportStatsData {
  kpi:               ReportKPI;
  byStatus:          ByStatusStat[];
  byType:            ByTypeStat[];
  byReason:          ByReasonStat[];
  timeSeries:        DayStat[];       // 30 derniers jours
  topReporters:      TopReporter[];   // top 8
  topTargets:        TopTarget[];     // top 10 cibles les + signalées
  recidivists:       Recidivist[];    // contenus signalés 2+ fois
  resolutionByType:  ResolutionByType[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// ─── GET /api/admin/reports/stats ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;

  try {
    // ── 1. Tous les signalements (sans limite — usage stats) ─────────────────
    const { data: allReports = [] } = await adminClient
      .from('reports')
      .select('id, reporter_id, target_type, target_id, target_title, reason, status, created_at, reviewed_at')
      .order('created_at', { ascending: false });

    const reports = allReports ?? [];
    const total   = reports.length;

    const now   = Date.now();
    const day   = 86_400_000;

    // ── 2. KPIs ──────────────────────────────────────────────────────────────
    const pending   = reports.filter(r => r.status === 'pending').length;
    const reviewed  = reports.filter(r => r.status === 'reviewed').length;
    const resolved  = reports.filter(r => r.status === 'resolved').length;
    const dismissed = reports.filter(r => r.status === 'dismissed').length;

    // Délais de résolution (en heures)
    const resolutionDelays = reports
      .filter(r => r.reviewed_at && r.created_at)
      .map(r => (new Date(r.reviewed_at as string).getTime() - new Date(r.created_at).getTime()) / 3_600_000)
      .filter(h => h >= 0);

    const avgResolutionHours = resolutionDelays.length
      ? Math.round(resolutionDelays.reduce((a, b) => a + b, 0) / resolutionDelays.length * 10) / 10
      : null;
    const minResolutionHours = resolutionDelays.length ? Math.round(Math.min(...resolutionDelays) * 10) / 10 : null;
    const maxResolutionHours = resolutionDelays.length ? Math.round(Math.max(...resolutionDelays) * 10) / 10 : null;

    const last7d  = reports.filter(r => now - new Date(r.created_at).getTime() <= 7  * day).length;
    const last30d = reports.filter(r => now - new Date(r.created_at).getTime() <= 30 * day).length;
    const todayCount = reports.filter(r => now - new Date(r.created_at).getTime() <= day).length;

    const kpi: ReportKPI = {
      total, pending, reviewed, resolved, dismissed,
      resolutionRate:     pct(resolved, total),
      dismissRate:        pct(dismissed, total),
      avgResolutionHours, minResolutionHours, maxResolutionHours,
      last7d, last30d, todayCount,
    };

    // ── 3. Répartition par statut ────────────────────────────────────────────
    const byStatus: ByStatusStat[] = [
      { status: 'pending',   count: pending,   pct: pct(pending,   total) },
      { status: 'reviewed',  count: reviewed,  pct: pct(reviewed,  total) },
      { status: 'resolved',  count: resolved,  pct: pct(resolved,  total) },
      { status: 'dismissed', count: dismissed, pct: pct(dismissed, total) },
    ];

    // ── 4. Répartition par type de contenu ───────────────────────────────────
    const typeMap: Record<string, { count: number; resolved: number; pending: number }> = {};
    for (const r of reports) {
      const t = r.target_type ?? 'autre';
      if (!typeMap[t]) typeMap[t] = { count: 0, resolved: 0, pending: 0 };
      typeMap[t].count++;
      if (r.status === 'resolved')  typeMap[t].resolved++;
      if (r.status === 'pending')   typeMap[t].pending++;
    }
    const byType: ByTypeStat[] = Object.entries(typeMap)
      .map(([type, d]) => ({ type, count: d.count, pct: pct(d.count, total), resolved: d.resolved, pending: d.pending }))
      .sort((a, b) => b.count - a.count);

    // ── 5. Répartition par raison ────────────────────────────────────────────
    const reasonMap: Record<string, { count: number; resolved: number }> = {};
    for (const r of reports) {
      const reason = r.reason ?? 'autre';
      if (!reasonMap[reason]) reasonMap[reason] = { count: 0, resolved: 0 };
      reasonMap[reason].count++;
      if (r.status === 'resolved') reasonMap[reason].resolved++;
    }
    const byReason: ByReasonStat[] = Object.entries(reasonMap)
      .map(([reason, d]) => ({ reason, count: d.count, pct: pct(d.count, total), resolved: d.resolved }))
      .sort((a, b) => b.count - a.count);

    // ── 6. Série temporelle — 30 jours glissants ─────────────────────────────
    const timeSeries: DayStat[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now - i * day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + day);
      const dateStr = dayStart.toISOString().slice(0, 10);
      const dayReports = reports.filter(r => {
        const t = new Date(r.created_at).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      timeSeries.push({
        date:     dateStr,
        count:    dayReports.length,
        resolved: dayReports.filter(r => r.status === 'resolved').length,
      });
    }

    // ── 7. Top signaleurs ────────────────────────────────────────────────────
    const reporterCount: Record<string, number> = {};
    for (const r of reports) {
      if (r.reporter_id) reporterCount[r.reporter_id] = (reporterCount[r.reporter_id] ?? 0) + 1;
    }
    const topReporterIds = Object.entries(reporterCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);

    let topReporters: TopReporter[] = [];
    if (topReporterIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', topReporterIds);
      topReporters = (profiles ?? []).map(p => ({
        id: p.id,
        full_name: p.full_name ?? 'Anonyme',
        avatar_url: p.avatar_url ?? null,
        count: reporterCount[p.id] ?? 0,
      })).sort((a, b) => b.count - a.count);
    }

    // ── 8. Top cibles (contenus les plus signalés) ───────────────────────────
    const targetMap: Record<string, { target_type: string; target_id: string; target_title: string | null; count: number; status: string }> = {};
    for (const r of reports) {
      const key = `${r.target_type}:${r.target_id}`;
      if (!targetMap[key]) {
        targetMap[key] = { target_type: r.target_type, target_id: r.target_id, target_title: (r as Record<string, unknown>).target_title as string | null ?? null, count: 0, status: r.status };
      }
      targetMap[key].count++;
    }
    const topTargets: TopTarget[] = Object.values(targetMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── 9. Récidivistes (cibles signalées 2+ fois encore actives) ────────────
    const recidivists: Recidivist[] = Object.values(targetMap)
      .filter(t => t.count >= 2)
      .map(t => ({
        target_type:  t.target_type,
        target_id:    t.target_id,
        target_title: t.target_title,
        total:        t.count,
        pending:      reports.filter(r => `${r.target_type}:${r.target_id}` === `${t.target_type}:${t.target_id}` && r.status === 'pending').length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ── 10. Délai moyen de résolution par type ────────────────────────────────
    const resolutionTypeMap: Record<string, number[]> = {};
    for (const r of reports) {
      if (r.reviewed_at && r.created_at) {
        const h = (new Date(r.reviewed_at as string).getTime() - new Date(r.created_at).getTime()) / 3_600_000;
        if (h >= 0) {
          const t = r.target_type ?? 'autre';
          if (!resolutionTypeMap[t]) resolutionTypeMap[t] = [];
          resolutionTypeMap[t].push(h);
        }
      }
    }
    const resolutionByType: ResolutionByType[] = Object.entries(resolutionTypeMap)
      .map(([type, hours]) => ({
        type,
        count:     hours.length,
        avg_hours: hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length * 10) / 10 : null,
        min_hours: hours.length ? Math.round(Math.min(...hours) * 10) / 10 : null,
        max_hours: hours.length ? Math.round(Math.max(...hours) * 10) / 10 : null,
      }))
      .sort((a, b) => (b.count) - (a.count));

    return NextResponse.json({
      kpi, byStatus, byType, byReason, timeSeries,
      topReporters, topTargets, recidivists, resolutionByType,
    } satisfies ReportStatsData);

  } catch (err) {
    console.error('[/api/admin/reports/stats]', err);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
