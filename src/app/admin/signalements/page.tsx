'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flag, CheckCircle, XCircle, Eye, AlertTriangle, ShieldOff,
  RefreshCw, Filter, Users, FileText, ShoppingBag, MessageSquare,
  Loader2, ArrowLeft, Ban, ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

// ─── Types enrichis ────────────────────────────────────────────────────────────
type EnrichedReport = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  target_title?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: { full_name: string; avatar_url?: string };
  // Combien de fois ce même contenu a été signalé
  report_count?: number;
};

const REASON_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  fake:       { label: 'Fausse annonce',    color: 'text-orange-600 bg-orange-50 border-orange-200', emoji: '🤥' },
  spam:       { label: 'Spam',              color: 'text-yellow-600 bg-yellow-50 border-yellow-200', emoji: '📢' },
  insulte:    { label: 'Insulte',           color: 'text-red-600 bg-red-50 border-red-200',          emoji: '😡' },
  arnaque:    { label: 'Arnaque',           color: 'text-red-700 bg-red-100 border-red-300',         emoji: '⚠️' },
  interdit:   { label: 'Contenu interdit',  color: 'text-red-800 bg-red-200 border-red-400',         emoji: '🚫' },
  hors_sujet: { label: 'Hors sujet',        color: 'text-blue-600 bg-blue-50 border-blue-200',       emoji: '📂' },
  autre:      { label: 'Autre',             color: 'text-gray-600 bg-gray-50 border-gray-200',       emoji: '💬' },
};

const TYPE_LABELS: Record<string, { label: string; icon: typeof Flag; href?: (id: string) => string }> = {
  user:           { label: 'Utilisateur',       icon: Users,       href: id => `/admin/utilisateurs` },
  post:           { label: 'Post forum',         icon: FileText,    href: id => `/forum/${id}` },
  listing:        { label: 'Annonce',            icon: ShoppingBag, href: id => `/annonces/${id}` },
  equipment:      { label: 'Matériel',           icon: ShoppingBag, href: id => `/materiel/${id}` },
  message:        { label: 'Message',            icon: MessageSquare },
  event:          { label: 'Événement',          icon: Flag,        href: id => `/evenements` },
  promenade:      { label: 'Promenade',          icon: Flag,        href: id => `/promenades` },
  outing:         { label: 'Sortie groupée',     icon: Users,       href: id => `/promenades` },
  association:    { label: 'Association',        icon: Users,       href: id => `/associations` },
  lost_found:     { label: 'Perdu/Trouvé',       icon: Flag,        href: id => `/perdu-trouve` },
  collection_item:{ label: 'Collectionneur',     icon: ShoppingBag, href: id => `/collectionneurs` },
  help_request:   { label: 'Coup de main',       icon: Flag,        href: id => `/coups-de-main` },
};

// ─── Statistiques ──────────────────────────────────────────────────────────────
function StatCard({ label, value, color, emoji }: { label: string; value: number; color: string; emoji: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black">{value}</p>
          <p className="text-xs font-semibold opacity-80 mt-0.5">{label}</p>
        </div>
        <span className="text-3xl opacity-70">{emoji}</span>
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function AdminSignalementsPage() {
  const { profile, isModerator } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  const [reports, setReports]         = useState<EnrichedReport[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'reviewed' | 'all' | 'resolved' | 'dismissed'>('pending');
  const [filterType, setFilterType]   = useState('all');
  const [processing, setProcessing]   = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ pending: 0, resolved: 0, dismissed: 0, total: 0 });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(full_name, avatar_url)')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    if (filterType !== 'all')   q = q.eq('target_type', filterType);

    const { data } = await q.limit(100);
    setReports((data ?? []) as EnrichedReport[]);

    // Stats
    const [p, r, d, tot] = await Promise.all([
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'dismissed'),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
    ]);
    setStats({ pending: p.count ?? 0, resolved: r.count ?? 0, dismissed: d.count ?? 0, total: tot.count ?? 0 });
    setLoading(false);
  }, [filterStatus, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile || !isModerator()) { router.push('/'); return; }
    fetchReports();
  }, [profile, fetchReports]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Action : changer statut ──────────────────────────────────────────────
  const updateReport = async (reportId: string, status: 'resolved' | 'dismissed' | 'reviewed') => {
    setProcessing(reportId);
    await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: profile?.id }).eq('id', reportId);
    toast.success(
      status === 'resolved' ? '✅ Signalement résolu' :
      status === 'dismissed' ? '🚫 Signalement ignoré' : '👀 Marqué en cours d\'examen'
    );
    setReports(prev => filterStatus === 'all' ? prev.map(r => r.id === reportId ? { ...r, status } : r) : prev.filter(r => r.id !== reportId));
    setStats(s => ({
      ...s,
      pending:  Math.max(0, s.pending - 1),
      resolved: status === 'resolved' ? s.resolved + 1 : s.resolved,
      dismissed: status === 'dismissed' ? s.dismissed + 1 : s.dismissed,
    }));
    setProcessing(null);
  };

  // ─── Action : bannir l'auteur du contenu signalé ──────────────────────────
  const banUser = async (targetId: string, targetType: string) => {
    if (!confirm('⚠️ Suspendre cet utilisateur ? Cette action est réversible depuis Admin → Utilisateurs.')) return;
    if (targetType === 'user') {
      await supabase.from('profiles').update({ status: 'suspended' }).eq('id', targetId);
      toast.success('🔒 Utilisateur suspendu');
    } else {
      toast.error('Pour suspendre un utilisateur, allez dans Admin → Utilisateurs');
    }
  };

  const grouped = reports.reduce<Record<string, EnrichedReport[]>>((acc, r) => {
    const key = `${r.target_type}:${r.target_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Admin
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Flag className="w-6 h-6 text-red-500" /> Signalements
          </h1>
          {stats.pending > 0 && (
            <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse">
              {stats.pending} en attente
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="En attente"  value={stats.pending}   color="bg-red-50 border-red-200 text-red-700"       emoji="🚨" />
          <StatCard label="Total"       value={stats.total}     color="bg-gray-50 border-gray-200 text-gray-700"     emoji="📊" />
          <StatCard label="Résolus"     value={stats.resolved}  color="bg-emerald-50 border-emerald-200 text-emerald-700" emoji="✅" />
          <StatCard label="Ignorés"     value={stats.dismissed} color="bg-slate-50 border-slate-200 text-slate-600"  emoji="🚫" />
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {(['pending','reviewed','resolved','dismissed','all'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-4 py-2.5 text-xs font-semibold transition-all ${filterStatus === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {s === 'pending' ? '🚨 En attente' : s === 'reviewed' ? '👀 En cours' : s === 'resolved' ? '✅ Résolus' : s === 'dismissed' ? '🚫 Ignorés' : '📋 Tous'}
              </button>
            ))}
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white focus:outline-none shadow-sm">
            <option value="all">Tous les types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={fetchReports} disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-700 shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <span className="text-5xl">✅</span>
            <p className="mt-4 text-xl font-bold text-gray-700">Aucun signalement</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterStatus === 'pending' ? 'Aucun signalement en attente — parfait !' : 'Aucun résultat pour ces filtres.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const reasonConf = REASON_LABELS[report.reason] ?? REASON_LABELS.autre;
              const typeConf   = TYPE_LABELS[report.target_type] ?? { label: report.target_type, icon: Flag };
              const TypeIcon   = typeConf.icon;
              const allSameTarget = grouped[`${report.target_type}:${report.target_id}`] ?? [];
              const multipleReports = allSameTarget.length > 1;
              const isProc = processing === report.id;

              return (
                <div key={report.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${
                  report.status === 'pending' ? 'border-red-200' :
                  report.status === 'reviewed' ? 'border-amber-200' :
                  report.status === 'resolved' ? 'border-emerald-200 opacity-70' : 'border-gray-200 opacity-60'
                }`}>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${reasonConf.color}`}>
                            {reasonConf.emoji} {reasonConf.label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <TypeIcon className="w-3 h-3" /> {typeConf.label}
                          </span>
                          {multipleReports && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> {allSameTarget.length}× signalé
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            report.status === 'pending' ? 'bg-red-100 text-red-600' :
                            report.status === 'reviewed' ? 'bg-amber-100 text-amber-600' :
                            report.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {report.status === 'pending' ? 'En attente' : report.status === 'reviewed' ? 'En examen' : report.status === 'resolved' ? 'Résolu' : 'Ignoré'}
                          </span>
                        </div>

                        {/* Titre du contenu signalé */}
                        {report.target_title && (
                          <p className="text-sm font-semibold text-gray-800 mb-1 truncate">📝 {report.target_title}</p>
                        )}

                        {/* Description */}
                        {report.description && (
                          <p className="text-sm text-gray-600 italic mb-2">&quot;{report.description}&quot;</p>
                        )}

                        {/* Reporter */}
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar src={report.reporter?.avatar_url} name={report.reporter?.full_name ?? '?'} size="xs" />
                          <span className="text-xs text-gray-400">
                            Signalé par <span className="font-semibold text-gray-600">{report.reporter?.full_name ?? 'Anonyme'}</span>
                            {' · '}{formatRelative(report.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {/* Voir le contenu */}
                        {typeConf.href && (
                          <Link href={typeConf.href(report.target_id)} target="_blank"
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all">
                            <Eye className="w-3.5 h-3.5" /> Voir
                          </Link>
                        )}

                        {report.status === 'pending' && (
                          <>
                            <button onClick={() => updateReport(report.id, 'reviewed')} disabled={!!isProc}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-50">
                              {isProc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} En cours
                            </button>
                            <button onClick={() => updateReport(report.id, 'resolved')} disabled={!!isProc}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50">
                              <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                            </button>
                            <button onClick={() => updateReport(report.id, 'dismissed')} disabled={!!isProc}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all disabled:opacity-50">
                              <XCircle className="w-3.5 h-3.5" /> Ignorer
                            </button>
                            {report.target_type === 'user' && (
                              <button onClick={() => banUser(report.target_id, report.target_type)} disabled={!!isProc}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-50 border border-red-300 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50">
                                <Ban className="w-3.5 h-3.5" /> Bannir
                              </button>
                            )}
                          </>
                        )}

                        {report.status === 'reviewed' && (
                          <>
                            <button onClick={() => updateReport(report.id, 'resolved')} disabled={!!isProc}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all">
                              <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                            </button>
                            <button onClick={() => updateReport(report.id, 'dismissed')} disabled={!!isProc}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all">
                              <XCircle className="w-3.5 h-3.5" /> Ignorer
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
