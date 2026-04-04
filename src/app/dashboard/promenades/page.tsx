'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Footprints, Plus, Users, CheckCircle2, XCircle, Clock,
  Loader2, ChevronRight, BarChart3, AlertCircle, RefreshCw,
  Archive, Play, StopCircle, Calendar, MapPin, Trash2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  OUTING_STATUS_CONFIG,
  OUTING_TRANSITIONS,
  legacyToFrenchStatus,
  computeDisplayStatus,
  type OutingStatus,
} from '@/lib/outings';

// ─── Types ────────────────────────────────────────────────────────────────────
type OutingWithStats = {
  id: string;
  title: string;
  outing_date: string;
  outing_time: string;
  max_participants: number;
  status: string;
  is_registration_open: boolean;
  location_city: string | null;
  location_area: string | null;
  meeting_point: string | null;
  created_at: string;
  participants_count?: number;
  inscrit_count?: number;
  confirme_count?: number;
  fill_percent?: number;
};

type Participant = {
  id: string;
  outing_id: string;
  user_id: string;
  status: string;
  joined_at: string;
  notes?: string;
  profile?: { full_name: string; avatar_url?: string } | null;
  outing?: { title: string; outing_date: string } | null;
};

type DashboardStats = {
  total: number;
  ouverte: number;
  complete: number;
  terminee: number;
  annulee: number;
  archivee: number;
  total_participants: number;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPromenadePage() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'sorties' | 'participants' | 'historique'>('sorties');
  const [loading, setLoading] = useState(true);
  const [outings, setOutings] = useState<OutingWithStats[]>([]);
  const [pendingParticipants, setPendingParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, ouverte: 0, complete: 0, terminee: 0, annulee: 0, archivee: 0, total_participants: 0,
  });

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('actives');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/connexion');
    }
  }, [authLoading, profile, router]);

  // ── Fetch mes sorties ──────────────────────────────────────────────────────
  const fetchMyOutings = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    // Try the view first, fallback to direct query
    const { data: viewData, error: viewError } = await supabase
      .from('outing_organizer_summary')
      .select('*')
      .eq('organizer_id', profile.id)
      .order('outing_date', { ascending: false });

    if (!viewError && viewData) {
      setOutings(viewData as OutingWithStats[]);
    } else {
      // Fallback: direct query
      const { data } = await supabase
        .from('group_outings')
        .select('*, participants:outing_participants(count)')
        .eq('organizer_id', profile.id)
        .order('outing_date', { ascending: false });

      setOutings(
        (data || []).map((o: OutingWithStats & { participants?: { count: number }[] }) => ({
          ...o,
          participants_count: o.participants?.[0]?.count ?? 0,
          inscrit_count: 0,
          confirme_count: 0,
          fill_percent: 0,
        }))
      );
    }

    setLoading(false);
  }, [profile]);

  // ── Fetch participants en attente ─────────────────────────────────────────
  const fetchPendingParticipants = useCallback(async () => {
    if (!profile) return;

    // Get all my outing IDs
    const { data: myOutings } = await supabase
      .from('group_outings')
      .select('id')
      .eq('organizer_id', profile.id)
      .in('status', ['ouverte', 'open', 'active', 'complete', 'full']);

    if (!myOutings?.length) { setPendingParticipants([]); return; }

    const outingIds = myOutings.map(o => o.id);
    const { data } = await supabase
      .from('outing_participants')
      .select(`
        *,
        profile:profiles!outing_participants_user_id_fkey(full_name, avatar_url),
        outing:group_outings!outing_participants_outing_id_fkey(title, outing_date)
      `)
      .in('outing_id', outingIds)
      .eq('status', 'inscrit')
      .order('joined_at', { ascending: true })
      .limit(50);

    setPendingParticipants((data || []) as Participant[]);
  }, [profile]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const computeStats = useCallback((outingsList: OutingWithStats[]) => {
    const s: DashboardStats = {
      total: outingsList.length,
      ouverte: 0, complete: 0, terminee: 0, annulee: 0, archivee: 0,
      total_participants: 0,
    };
    outingsList.forEach(o => {
      const fr = legacyToFrenchStatus(o.status);
      const displayed = computeDisplayStatus(fr, o.participants_count || 0, o.max_participants, o.outing_date);
      if (displayed === 'ouverte') s.ouverte++;
      else if (displayed === 'complete') s.complete++;
      else if (displayed === 'terminee') s.terminee++;
      else if (displayed === 'annulee') s.annulee++;
      else if (displayed === 'archivee') s.archivee++;
      s.total_participants += o.participants_count || 0;
    });
    setStats(s);
  }, []);

  useEffect(() => { fetchMyOutings(); }, [fetchMyOutings]);
  useEffect(() => { if (activeTab === 'participants') fetchPendingParticipants(); }, [activeTab, fetchPendingParticipants]);
  useEffect(() => { computeStats(outings); }, [outings, computeStats]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStatusChange = async (outing: OutingWithStats, newStatus: OutingStatus, reason?: string) => {
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'archivee') updateData.archived_at = new Date().toISOString();
    if (newStatus === 'ouverte') updateData.is_registration_open = true;
    if (['annulee', 'terminee', 'archivee'].includes(newStatus)) updateData.is_registration_open = false;

    const { error } = await supabase
      .from('group_outings')
      .update(updateData)
      .eq('id', outing.id)
      .eq('organizer_id', profile!.id);

    if (error) { toast.error(`Erreur : ${error.message}`); return; }

    // Log history
    if (profile) {
      await supabase.from('outing_status_history').insert({
        outing_id: outing.id,
        old_status: outing.status,
        new_status: newStatus,
        changed_by: profile.id,
        reason: reason || null,
      });
    }

    const cfg = OUTING_STATUS_CONFIG[newStatus];
    toast.success(`${cfg.icon} ${cfg.label}`);
    fetchMyOutings();
  };

  const handleDeleteOuting = async (outing: OutingWithStats) => {
    if ((outing.participants_count || 0) > 0) {
      if (!confirm(`Cette sortie a ${outing.participants_count} participant(s). Supprimer quand même ?`)) return;
    } else {
      if (!confirm('Supprimer définitivement cette sortie ?')) return;
    }

    const { error } = await supabase
      .from('group_outings')
      .delete()
      .eq('id', outing.id)
      .eq('organizer_id', profile!.id);

    if (error) { toast.error('Erreur lors de la suppression'); }
    else { toast.success('Sortie supprimée'); fetchMyOutings(); }
  };

  const handleConfirmParticipant = async (participant: Participant) => {
    const { error } = await supabase
      .from('outing_participants')
      .update({ status: 'confirme', confirmed_at: new Date().toISOString() })
      .eq('id', participant.id);
    if (error) { toast.error('Erreur'); }
    else { toast.success(`✅ ${participant.profile?.full_name} confirmé(e)`); fetchPendingParticipants(); }
  };

  const handleCancelParticipant = async (participant: Participant) => {
    const { error } = await supabase
      .from('outing_participants')
      .update({ status: 'annule', cancelled_at: new Date().toISOString() })
      .eq('id', participant.id);
    if (error) { toast.error('Erreur'); }
    else { toast.success('Participant retiré'); fetchPendingParticipants(); }
  };

  // ── Filter outings ─────────────────────────────────────────────────────────
  const filteredOutings = outings.filter(o => {
    const fr = legacyToFrenchStatus(o.status);
    const displayed = computeDisplayStatus(fr, o.participants_count || 0, o.max_participants, o.outing_date);
    if (statusFilter === 'actives') return ['ouverte', 'complete'].includes(displayed);
    if (statusFilter === 'terminees') return displayed === 'terminee';
    if (statusFilter === 'annulees') return displayed === 'annulee';
    if (statusFilter === 'archivees') return displayed === 'archivee';
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white">
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="w-5 h-5 opacity-80" />
                <span className="text-emerald-100 text-sm font-medium">Dashboard organisateur</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">Mes Promenades</h1>
              <p className="text-emerald-100 text-sm mt-1">Gérez vos sorties groupées et participants</p>
            </div>
            <Link href="/promenades?tab=agenda&showForm=1"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-50 transition-all shadow">
              <Plus className="w-4 h-4" /> Organiser une sortie
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-800', bg: 'bg-white' },
            { label: 'Ouvertes', value: stats.ouverte, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Complètes', value: stats.complete, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Terminées', value: stats.terminee, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Annulées', value: stats.annulee, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Archivées', value: stats.archivee, color: 'text-gray-500', bg: 'bg-gray-50' },
            { label: 'Participants', value: stats.total_participants, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl border border-gray-100 p-3 text-center shadow-sm`}>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Onglets ── */}
        <div className="flex gap-1.5 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
          {[
            { id: 'sorties', label: 'Mes sorties', icon: Footprints },
            { id: 'participants', label: `Inscrits (${pendingParticipants.length})`, icon: Users },
            { id: 'historique', label: 'Historique', icon: Clock },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id ? 'bg-emerald-500 text-white shadow' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── Onglet Sorties ── */}
        {activeTab === 'sorties' && (
          <div>
            {/* Filtres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { value: 'actives', label: 'Actives', count: stats.ouverte + stats.complete },
                { value: 'terminees', label: 'Terminées', count: stats.terminee },
                { value: 'annulees', label: 'Annulées', count: stats.annulee },
                { value: 'archivees', label: 'Archivées', count: stats.archivee },
                { value: 'all', label: 'Toutes', count: stats.total },
              ].map(f => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    statusFilter === f.value
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                  }`}>
                  {f.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusFilter === f.value ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
              <button onClick={() => { fetchMyOutings(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all ml-auto">
                <RefreshCw className="w-3 h-3" /> Actualiser
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            ) : filteredOutings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Footprints className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-700 mb-1">Aucune sortie {statusFilter !== 'all' ? `(${statusFilter})` : ''}</p>
                {statusFilter === 'actives' && (
                  <Link href="/promenades?tab=agenda"
                    className="mt-4 inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                    <Plus className="w-4 h-4" /> Organiser une sortie
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOutings.map(outing => {
                  const fr = legacyToFrenchStatus(outing.status);
                  const displayed = computeDisplayStatus(fr, outing.participants_count || 0, outing.max_participants, outing.outing_date);
                  const cfg = OUTING_STATUS_CONFIG[displayed];
                  const availTrans = OUTING_TRANSITIONS.filter(t => t.from === displayed);
                  const fillPct = outing.fill_percent ?? Math.round(((outing.participants_count || 0) / outing.max_participants) * 100);
                  const dateLabel = new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'short', day: 'numeric', month: 'long',
                  });
                  const isPast = new Date(outing.outing_date + 'T23:59:59') < new Date();

                  return (
                    <div key={outing.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              {/* Statut badge */}
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                                {cfg.icon} {cfg.label}
                              </span>
                              {isPast && displayed === 'ouverte' && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                                  ⚠️ Date passée — à clore
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-gray-900 truncate">{outing.title}</h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {dateLabel} à {outing.outing_time}</span>
                              {(outing.location_city || outing.meeting_point) && (
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {outing.location_city || outing.meeting_point}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                <span className={fillPct >= 100 ? 'text-red-600 font-bold' : ''}>
                                  {outing.participants_count || 0} / {outing.max_participants}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Actions rapides */}
                          <div className="flex gap-1.5 flex-shrink-0">
                            <Link href={`/promenades/sorties/${outing.id}`}
                              className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-gray-200"
                              title="Voir">
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDeleteOuting(outing)}
                              className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-gray-200"
                              title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Barre de remplissage */}
                        {['ouverte', 'complete'].includes(displayed) && (
                          <div className="mt-3">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-red-400' : fillPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(fillPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Transitions de statut */}
                        {availTrans.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
                            {availTrans.map(t => {
                              const toCfg = OUTING_STATUS_CONFIG[t.to];
                              const handleClick = () => {
                                if (t.requiresReason) {
                                  const reason = window.prompt(`${t.label} — Raison (obligatoire) :`);
                                  if (!reason) return;
                                  handleStatusChange(outing, t.to, reason);
                                } else if (window.confirm(`${toCfg.icon} ${t.label} ?`)) {
                                  handleStatusChange(outing, t.to);
                                }
                              };
                              return (
                                <button key={`${t.from}-${t.to}`} onClick={handleClick}
                                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${toCfg.bg} ${toCfg.color} ${toCfg.border} hover:opacity-80`}>
                                  {t.to === 'ouverte' ? <Play className="w-3 h-3" /> :
                                   t.to === 'complete' ? <Users className="w-3 h-3" /> :
                                   t.to === 'terminee' ? <CheckCircle2 className="w-3 h-3" /> :
                                   t.to === 'annulee' ? <XCircle className="w-3 h-3" /> :
                                   <Archive className="w-3 h-3" />}
                                  {t.label}
                                </button>
                              );
                            })}
                            {/* Alerte si date passée et statut encore ouvert */}
                            {isPast && ['ouverte', 'complete'].includes(displayed) && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Marquer cette sortie comme terminée ?')) {
                                    handleStatusChange(outing, 'terminee');
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-all">
                                <StopCircle className="w-3 h-3" /> Clore la sortie
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Participants ── */}
        {activeTab === 'participants' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">
                Inscrits en attente de confirmation ({pendingParticipants.length})
              </h3>
              <button onClick={fetchPendingParticipants}
                className="text-gray-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {pendingParticipants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="font-medium text-gray-600">Aucun inscrit en attente</p>
                <p className="text-sm text-gray-400 mt-1">Les nouvelles inscriptions apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{p.profile?.full_name || 'Membre'}</p>
                      <p className="text-xs text-gray-500 truncate">
                        Sortie : {p.outing?.title || '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Inscrit {formatRelative(p.joined_at)}
                        {p.outing?.outing_date && (
                          <span className="ml-2">
                            · {new Date(p.outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleConfirmParticipant(p)}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all"
                        title="Confirmer">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCancelParticipant(p)}
                        className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-all"
                        title="Retirer">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Onglet Historique ── */}
        {activeTab === 'historique' && (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800 mb-4">Sorties passées & archivées</h3>
            {outings
              .filter(o => {
                const fr = legacyToFrenchStatus(o.status);
                const disp = computeDisplayStatus(fr, o.participants_count || 0, o.max_participants, o.outing_date);
                return ['terminee', 'annulee', 'archivee'].includes(disp);
              })
              .map(outing => {
                const fr = legacyToFrenchStatus(outing.status);
                const displayed = computeDisplayStatus(fr, outing.participants_count || 0, outing.max_participants, outing.outing_date);
                const cfg = OUTING_STATUS_CONFIG[displayed];
                const dateLabel = new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                });

                return (
                  <div key={outing.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                    <span className={`text-xl flex-shrink-0`}>{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{outing.title}</p>
                      <p className="text-xs text-gray-500">
                        {dateLabel} · {outing.participants_count || 0} participant(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                        {cfg.label}
                      </span>
                      <Link href={`/promenades/sorties/${outing.id}`}
                        className="p-1.5 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-gray-100">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}

            {outings.filter(o => {
              const fr = legacyToFrenchStatus(o.status);
              const disp = computeDisplayStatus(fr, o.participants_count || 0, o.max_participants, o.outing_date);
              return ['terminee', 'annulee', 'archivee'].includes(disp);
            }).length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500">Aucune sortie dans l'historique</p>
                <p className="text-xs text-gray-400 mt-1">Les sorties terminées, annulées et archivées apparaîtront ici</p>
              </div>
            )}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/promenades?tab=agenda"
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-emerald-200 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Footprints className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Voir les sorties</p>
              <p className="text-xs text-gray-500">Vue publique du calendrier</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </Link>
          <Link href="/dashboard"
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Mon Dashboard</p>
              <p className="text-xs text-gray-500">Vue d'ensemble de mes activités</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </Link>
        </div>

        {/* Info migration */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Migration SQL requise</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Pour le cycle de vie complet (statuts, historique, participation), exécutez le bloc
                <strong> &quot;SQL Cycle de vie Sorties&quot;</strong> dans Admin → Migration DB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
