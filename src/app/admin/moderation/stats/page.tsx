'use client';

/**
 * Admin — Tableau de bord KPI Modération
 *
 * Statistiques complètes : taux d'acceptation/refus/correction,
 * délais moyens, thèmes problématiques, membres les plus signalés/fiables.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, ArrowLeft, TrendingUp, Clock, CheckCircle, XCircle,
  AlertTriangle, Users, BarChart3, RefreshCw, Star, Flag,
  Package, Wrench, Heart, Footprints, Calendar, MapPin,
  BookOpen, Handshake, ChevronRight, Activity,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Avatar from '@/components/ui/Avatar';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { formatRelative } from '@/lib/utils';
import { CONTENT_TYPE_LABELS, type ContentType } from '@/lib/moderation';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatsData {
  // Totaux
  total: number;
  pending: number;
  published: number;
  refused: number;
  correction: number;
  archived: number;
  // Performance
  avgReviewHours: number | null;
  last24h: number;
  highRisk: number;
  newAuthors: number;
  // Par type
  byType: { type: ContentType; count: number; pending: number; refused: number }[];
  // Derniers traités
  recentDecisions: RecentDecision[];
  // Membres problématiques
  problematicMembers: MemberStat[];
  // Membres fiables
  trustedMembers: MemberStat[];
}

interface RecentDecision {
  id: string;
  content_type: ContentType;
  content_title: string;
  status: string;
  decision?: string;
  reviewed_at: string;
  author?: { full_name: string };
}

interface MemberStat {
  id: string;
  full_name: string;
  avatar_url?: string;
  publication_count: number;
  reports_received: number;
  trust_level: string;
}

const CONTENT_ICONS: Record<ContentType, React.ElementType> = {
  listing: Package, equipment: Wrench, help_request: Heart,
  outing: Footprints, event: Calendar, lost_found: MapPin,
  collection_item: Star, association: Handshake, forum_post: BookOpen,
};

// ─── Composants ──────────────────────────────────────────────────────────────
function BigStat({ value, label, emoji, color, subtext }: {
  value: string | number; label: string; emoji: string; color: string; subtext?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
      <div className="text-3xl mb-1">{emoji}</div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-1">{label}</div>
      {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
    </div>
  );
}

function RateBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-24 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-800 w-8 text-right">{value}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
function ModerationStatsContent() {
  const { profile, isModerator } = useAuthStore();
  const supabase = createClient();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    // KPI global (vue SQL)
    const { data: kpi } = await supabase
      .from('moderation_kpi')
      .select('*')
      .single();

    // Par type de contenu
    const contentTypes: ContentType[] = [
      'listing', 'equipment', 'help_request', 'outing', 'event',
      'lost_found', 'collection_item', 'association', 'forum_post',
    ];

    const byTypePromises = contentTypes.map(async (type) => {
      const [
        { count: total },
        { count: pending },
        { count: refused },
      ] = await Promise.all([
        supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('content_type', type),
        supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('content_type', type).eq('status', 'en_attente_validation'),
        supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('content_type', type).eq('status', 'refuse'),
      ]);
      return { type, count: total ?? 0, pending: pending ?? 0, refused: refused ?? 0 };
    });

    const byType = await Promise.all(byTypePromises);

    // Décisions récentes
    const { data: recent } = await supabase
      .from('moderation_queue')
      .select('id, content_type, content_title, status, decision, reviewed_at, author:profiles!moderation_queue_author_id_fkey(full_name)')
      .in('status', ['publie', 'refuse', 'a_corriger'])
      .not('reviewed_at', 'is', null)
      .order('reviewed_at', { ascending: false })
      .limit(10);

    // Membres problématiques (plus de 2 refus)
    const { data: problematic } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, publication_count, reports_received, trust_level')
      .eq('trust_level', 'surveille')
      .order('reports_received', { ascending: false })
      .limit(5);

    // Membres fiables
    const { data: trusted } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, publication_count, reports_received, trust_level')
      .in('trust_level', ['fiable', 'de_confiance'])
      .order('publication_count', { ascending: false })
      .limit(5);

    setStats({
      total: Number(kpi?.total) || 0,
      pending: Number(kpi?.pending) || 0,
      published: Number(kpi?.published) || 0,
      refused: Number(kpi?.refused) || 0,
      correction: Number(kpi?.correction) || 0,
      archived: Number(kpi?.archived) || 0,
      avgReviewHours: kpi?.avg_review_hours ? Number(kpi.avg_review_hours) : null,
      last24h: Number(kpi?.last_24h) || 0,
      highRisk: Number(kpi?.high_risk) || 0,
      newAuthors: Number(kpi?.new_authors) || 0,
      byType: byType.filter(b => b.count > 0).sort((a, b) => b.count - a.count),
      recentDecisions: (recent || []) as unknown as RecentDecision[],
      problematicMembers: (problematic || []) as MemberStat[],
      trustedMembers: (trusted || []) as MemberStat[],
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const acceptanceRate = stats && stats.total > 0
    ? Math.round((stats.published / stats.total) * 100) : 0;
  const refusalRate = stats && stats.total > 0
    ? Math.round((stats.refused / stats.total) * 100) : 0;
  const correctionRate = stats && stats.total > 0
    ? Math.round((stats.correction / stats.total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/moderation" className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Statistiques Modération</h1>
              <p className="text-gray-500 text-sm">KPIs & analyse des publications</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchStats}
          className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !stats ? (
        <p className="text-gray-500 text-center py-12">Données non disponibles</p>
      ) : (
        <div className="space-y-8">
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <BigStat value={stats.total}     label="Total traité"     emoji="📊" color="text-gray-900" />
            <BigStat value={stats.pending}   label="En attente"       emoji="⏳" color="text-amber-600" subtext="à traiter" />
            <BigStat value={stats.last24h}   label="Dernières 24h"    emoji="🕐" color="text-indigo-600" subtext="nouvelles soumissions" />
            <BigStat
              value={stats.avgReviewHours != null ? `${stats.avgReviewHours.toFixed(1)}h` : '—'}
              label="Délai moyen"
              emoji="⏱️"
              color={stats.avgReviewHours != null && stats.avgReviewHours <= 24 ? 'text-emerald-600' : 'text-red-600'}
              subtext="objectif <24h"
            />
          </div>

          {/* Taux */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Taux d\'acceptation', value: acceptanceRate, count: stats.published, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '✅' },
              { label: 'Taux de refus',       value: refusalRate,    count: stats.refused,   color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     emoji: '❌' },
              { label: 'Taux de correction',  value: correctionRate, count: stats.correction, color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '✏️' },
            ].map(({ label, value, count, color, bg, border, emoji }) => (
              <div key={label} className={`rounded-2xl border p-5 ${bg} ${border}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">{emoji} {label}</span>
                  <span className={`text-3xl font-black ${color}`}>{value}%</span>
                </div>
                <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-current ${color} transition-all`} style={{ width: `${value}%` }} />
                </div>
                <p className={`text-xs ${color} mt-2`}>{count} publication{count > 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>

          {/* Risques + alertes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`rounded-2xl border p-4 ${stats.highRisk > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-5 h-5 ${stats.highRisk > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-700">Haut risque</span>
              </div>
              <p className={`text-3xl font-black ${stats.highRisk > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{stats.highRisk}</p>
              <p className="text-xs text-gray-500 mt-1">publications nécessitant attention</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-700">Nouveaux auteurs</span>
              </div>
              <p className="text-3xl font-black text-blue-700">{stats.newAuthors}</p>
              <p className="text-xs text-gray-500 mt-1">en attente (membres récents)</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-700">Archivées</span>
              </div>
              <p className="text-3xl font-black text-gray-600">{stats.archived}</p>
              <p className="text-xs text-gray-500 mt-1">publications archivées</p>
            </div>
          </div>

          {/* Répartition par thème */}
          {stats.byType.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Répartition par thème
              </h2>
              <div className="space-y-3">
                {stats.byType.map(({ type, count, pending, refused }) => {
                  const meta = CONTENT_TYPE_LABELS[type];
                  const Icon = CONTENT_ICONS[type] || Package;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="text-sm text-gray-700 w-28 flex-shrink-0">
                        {meta?.emoji} {meta?.label}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-400 rounded-full"
                          style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-800 w-8 text-right">{count}</span>
                      {pending > 0 && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                          {pending} en attente
                        </span>
                      )}
                      {refused > 0 && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
                          {refused} refusées
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Décisions récentes */}
            {stats.recentDecisions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  Décisions récentes
                </h2>
                <div className="space-y-2.5">
                  {stats.recentDecisions.map(dec => {
                    const Icon = CONTENT_ICONS[dec.content_type] || Package;
                    const statusColor =
                      dec.status === 'publie' ? 'text-emerald-600' :
                      dec.status === 'refuse'  ? 'text-red-600' :
                      'text-amber-600';
                    const statusEmoji =
                      dec.status === 'publie' ? '✅' :
                      dec.status === 'refuse'  ? '❌' : '✏️';
                    return (
                      <Link
                        key={dec.id}
                        href={`/admin/moderation/${dec.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                      >
                        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{dec.content_title}</p>
                          <p className="text-[10px] text-gray-400">
                            {dec.author?.full_name} · {formatRelative(dec.reviewed_at)}
                          </p>
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ${statusColor}`}>
                          {statusEmoji}
                        </span>
                        <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Membres surveillés */}
            <div className="space-y-6">
              {stats.problematicMembers.length > 0 && (
                <div className="bg-white rounded-2xl border border-red-100 p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Flag className="w-5 h-5 text-red-500" />
                    Membres surveillés
                  </h2>
                  <div className="space-y-2.5">
                    {stats.problematicMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        <Avatar src={m.avatar_url} name={m.full_name} size="xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{m.full_name}</p>
                          <p className="text-[10px] text-gray-400">
                            {m.publication_count} pub · {m.reports_received} signalement{m.reports_received > 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          ⚠️ Surveillé
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.trustedMembers.length > 0 && (
                <div className="bg-white rounded-2xl border border-emerald-100 p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-emerald-500" />
                    Membres de confiance
                  </h2>
                  <div className="space-y-2.5">
                    {stats.trustedMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        <Avatar src={m.avatar_url} name={m.full_name} size="xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{m.full_name}</p>
                          <p className="text-[10px] text-gray-400">
                            {m.publication_count} publications
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          m.trust_level === 'de_confiance'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {m.trust_level === 'de_confiance' ? '🏆' : '✅'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModerationStatsPage() {
  return (
    <ProtectedPage adminOnly>
      <ModerationStatsContent />
    </ProtectedPage>
  );
}
