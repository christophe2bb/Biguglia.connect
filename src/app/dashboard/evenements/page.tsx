'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Calendar, Plus, Loader2, Users, ChevronRight, BarChart3,
  Edit2, Trash2, Archive, XCircle, RefreshCw, CheckCircle,
  Clock, MapPin, Eye, TrendingUp, ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import {
  EVENT_STATUS_CONFIG,
  getAllowedTransitions,
  resolveEventStatus,
  formatEventDate,
  type EventStatus,
} from '@/lib/events';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MyEvent {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  event_date: string;
  start_time: string;
  location: string;
  status: string;
  capacity?: number | null;
  is_unlimited: boolean;
  registration_open: boolean;
  created_at: string;
  participants_count?: number;
  confirmed_count?: number;
  remaining_places?: number | null;
  fill_percentage?: number | null;
}

interface DashStats {
  total: number;
  a_venir: number;
  complet: number;
  reporte: number;
  passe: number;
  annule: number;
  totalParticipants: number;
  avgFill: number;
}

type DashTab = 'evenements' | 'participants' | 'kpis';

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cfg = EVENT_STATUS_CONFIG[status as EventStatus];
  if (!cfg) return <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────
function EventCard({
  event,
  onStatusChange,
  onDelete,
}: {
  event: MyEvent;
  onStatusChange: (id: string, to: EventStatus, requiresReason?: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const resolvedStatus = resolveEventStatus(
    event.status, event.event_date,
    event.participants_count ?? 0,
    event.capacity ?? null,
    event.is_unlimited,
  );
  const transitions = getAllowedTransitions(resolvedStatus);
  const fillPct = event.fill_percentage ?? (
    !event.is_unlimited && event.capacity
      ? Math.round(((event.participants_count ?? 0) / event.capacity) * 100)
      : null
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusPill status={resolvedStatus} />
              {!event.registration_open && resolvedStatus === 'a_venir' && (
                <span className="text-xs bg-orange-50 text-orange-600 font-semibold px-2 py-0.5 rounded-full border border-orange-200">
                  Inscriptions fermées
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{event.title}</h3>
            {event.subtitle && <p className="text-xs text-gray-500 line-clamp-1">{event.subtitle}</p>}
          </div>
          <Link href={`/evenements/${event.id}`}
            className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <Eye className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatEventDate(event.event_date, false)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.start_time?.substring(0, 5)}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
        </div>

        {/* Participants & fill */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-sm font-bold text-gray-900">{event.participants_count ?? 0}</span>
            {!event.is_unlimited && event.capacity && (
              <span className="text-xs text-gray-400">/ {event.capacity}</span>
            )}
            {event.is_unlimited && <span className="text-xs text-gray-400">participants</span>}
          </div>
          {fillPct !== null && (
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${fillPct >= 90 ? 'bg-red-400' : fillPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, fillPct)}%` }}
              />
            </div>
          )}
          {fillPct !== null && <span className="text-xs text-gray-500 w-9 text-right">{fillPct}%</span>}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-1.5">
          <Link href={`/evenements/${event.id}/modifier`}
            className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-all">
            <Edit2 className="w-3 h-3" /> Modifier
          </Link>
          {transitions.slice(0, 3).map(t => (
            <button key={t.to} onClick={() => onStatusChange(event.id, t.to, t.requiresReason)}
              className={`flex items-center gap-1 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                t.to === 'annule' ? 'bg-red-50 hover:bg-red-100 text-red-600' :
                t.to === 'reporte' ? 'bg-violet-50 hover:bg-violet-100 text-violet-600' :
                t.to === 'archive' ? 'bg-gray-50 hover:bg-gray-100 text-gray-500' :
                'bg-purple-50 hover:bg-purple-100 text-purple-600'
              }`}>
              {t.to === 'annule' && <XCircle className="w-3 h-3" />}
              {t.to === 'reporte' && <RefreshCw className="w-3 h-3" />}
              {t.to === 'archive' && <Archive className="w-3 h-3" />}
              {t.to === 'complet' && <Users className="w-3 h-3" />}
              {t.to === 'a_venir' && <CheckCircle className="w-3 h-3" />}
              {t.to === 'passe' && <Clock className="w-3 h-3" />}
              {t.label}
            </button>
          ))}
          {(event.participants_count ?? 0) === 0 && (
            <button onClick={() => onDelete(event.id)}
              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-500 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-all">
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DashboardEvenementsPage() {
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashTab>('evenements');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [stats, setStats] = useState<DashStats>({
    total: 0, a_venir: 0, complet: 0, reporte: 0, passe: 0, annule: 0,
    totalParticipants: 0, avgFill: 0,
  });

  // Transition modal state
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; to: EventStatus; requiresReason?: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchMyEvents = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Try events table
      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select('id, title, subtitle, category, event_date, start_time, location, status, capacity, is_unlimited, registration_open, created_at')
        .eq('author_id', profile.id)
        .order('event_date', { ascending: false });

      let rawEvents = evData ?? [];

      // Fallback to local_events if events table fails or is empty
      if (evErr || rawEvents.length === 0) {
        const { data: legData } = await supabase
          .from('events')
          .select('id, title, category, event_date, event_time, location, status, max_participants, created_at')
          .eq('author_id', profile.id)
          .order('event_date', { ascending: false });
        rawEvents = (legData ?? []).map(e => ({
          ...e,
          subtitle: '',
          start_time: e.event_time ?? '18:00',
          is_unlimited: !e.max_participants,
          capacity: e.max_participants,
          registration_open: true,
        }));
      }

      // Enrich with participant counts
      const enriched: MyEvent[] = await Promise.all(
        rawEvents.map(async (ev) => {
          const { count } = await supabase
            .from('event_participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', ev.id)
            .neq('status', 'annule');

          const { count: confirmedCount } = await supabase
            .from('event_participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', ev.id)
            .eq('status', 'confirme');

          const pCount = count ?? 0;
          const remaining = !ev.is_unlimited && ev.capacity
            ? Math.max(0, ev.capacity - pCount) : null;
          const fillPct = !ev.is_unlimited && ev.capacity && ev.capacity > 0
            ? Math.round((pCount / ev.capacity) * 100) : null;

          return {
            ...ev,
            participants_count: pCount,
            confirmed_count: confirmedCount ?? 0,
            remaining_places: remaining,
            fill_percentage: fillPct,
          };
        })
      );

      setMyEvents(enriched);

      // Compute stats
      const statsCalc: DashStats = {
        total: enriched.length,
        a_venir: enriched.filter(e => resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited) === 'a_venir').length,
        complet: enriched.filter(e => resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited) === 'complet').length,
        reporte: enriched.filter(e => e.status === 'reporte').length,
        passe: enriched.filter(e => resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited) === 'passe').length,
        annule: enriched.filter(e => e.status === 'annule').length,
        totalParticipants: enriched.reduce((s, e) => s + (e.participants_count ?? 0), 0),
        avgFill: (() => {
          const withCap = enriched.filter(e => e.fill_percentage !== null);
          if (!withCap.length) return 0;
          return Math.round(withCap.reduce((s, e) => s + (e.fill_percentage ?? 0), 0) / withCap.length);
        })(),
      };
      setStats(statsCalc);
    } finally {
      setLoading(false);
    }
  }, [profile, supabase]);

  useEffect(() => { fetchMyEvents(); }, [fetchMyEvents]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleStatusChange = (id: string, to: EventStatus, requiresReason?: boolean) => {
    setPendingAction({ id, to, requiresReason });
    setShowModal(true);
    setReason('');
    setNewDate('');
  };

  const confirmStatusChange = async () => {
    if (!pendingAction) return;
    if (pendingAction.requiresReason && !reason.trim()) { toast.error('Raison requise'); return; }
    try {
      const updates: Record<string, unknown> = { status: pendingAction.to };
      if (pendingAction.to === 'annule') updates.cancel_reason = reason;
      if (pendingAction.to === 'reporte') {
        updates.postpone_reason = reason;
        if (newDate) updates.event_date = newDate;
      }
      if (pendingAction.to === 'archive') updates.archived_at = new Date().toISOString();
      if (pendingAction.to === 'a_venir') updates.registration_open = true;

      const { error } = await supabase.from('events').update(updates).eq('id', pendingAction.id);
      if (error) await supabase.from('events').update(updates).eq('id', pendingAction.id);

      const label = EVENT_STATUS_CONFIG[pendingAction.to]?.label ?? pendingAction.to;
      toast.success(`Statut mis à jour : ${label}`);
      setShowModal(false);
      setPendingAction(null);
      await fetchMyEvents();
    } catch {
      toast.error('Erreur mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    const ev = myEvents.find(e => e.id === id);
    if ((ev?.participants_count ?? 0) > 0) { toast.error('Impossible : des participants sont inscrits'); return; }
    if (!confirm('Supprimer définitivement cet événement ?')) return;
    await supabase.from('events').delete().eq('id', id);
    await supabase.from('events').delete().eq('id', id);
    toast.success('Événement supprimé');
    await fetchMyEvents();
  };

  // ─── Filtered events ──────────────────────────────────────────────────────
  const filteredEvents = myEvents.filter(e => {
    if (statusFilter === 'all') return true;
    const resolved = resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited);
    return resolved === statusFilter || e.status === statusFilter;
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Connexion requise</p>
          <Link href="/connexion" className="mt-3 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-purple-700">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const TABS: { id: DashTab; label: string; icon: React.ElementType }[] = [
    { id: 'evenements', label: 'Mes événements', icon: Calendar },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'kpis', label: 'Statistiques', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black">Mes événements</h1>
              <p className="text-white/70 text-sm mt-0.5">{stats.total} événement{stats.total > 1 ? 's' : ''} créé{stats.total > 1 ? 's' : ''}</p>
            </div>
            <Link href="/evenements/nouveau"
              className="flex items-center gap-2 bg-white text-purple-700 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-purple-50 transition-all shadow-sm">
              <Plus className="w-4 h-4" /> Créer
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'À venir', value: stats.a_venir, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { label: 'Complets', value: stats.complet, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
            { label: 'Participants', value: stats.totalParticipants, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
            { label: 'Taux remplissage', value: `${stats.avgFill}%`, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
          ].map(kpi => (
            <div key={kpi.label} className={`${kpi.bg} border ${kpi.border} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
              <p className={`text-xs font-semibold ${kpi.color} opacity-70 mt-0.5`}>{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-700 bg-purple-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── EVENTS TAB ── */}
            {activeTab === 'evenements' && (
              <div className="space-y-4">
                {/* Status filter */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'Tous', color: 'bg-gray-100 text-gray-700' },
                    ...Object.entries(EVENT_STATUS_CONFIG).map(([k, v]) => ({
                      id: k, label: v.label, color: `${v.badgeBg} ${v.badgeText}`,
                    }))
                  ].map(f => (
                    <button key={f.id}
                      onClick={() => setStatusFilter(f.id as EventStatus | 'all')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        statusFilter === f.id ? `${f.color} ring-2 ring-offset-1 ring-purple-300` : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}>
                      {f.label}
                      {f.id !== 'all' && (
                        <span className="ml-1 opacity-70">
                          ({myEvents.filter(e => {
                            const resolved = resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited);
                            return resolved === f.id || e.status === f.id;
                          }).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="font-bold text-gray-500">Aucun événement{statusFilter !== 'all' ? ' pour ce filtre' : ''}</p>
                    {statusFilter === 'all' && (
                      <Link href="/evenements/nouveau"
                        className="mt-3 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
                        <Plus className="w-4 h-4" /> Créer un événement
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {filteredEvents.map(ev => (
                      <EventCard key={ev.id} event={ev} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PARTICIPANTS TAB ── */}
            {activeTab === 'participants' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
                  </div>
                ) : myEvents.filter(e => (e.participants_count ?? 0) > 0).length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="font-bold text-gray-500">Aucun participant pour l&apos;instant</p>
                  </div>
                ) : (
                  myEvents.filter(e => (e.participants_count ?? 0) > 0).map(ev => (
                    <div key={ev.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <StatusPill status={resolveEventStatus(ev.status, ev.event_date, ev.participants_count ?? 0, ev.capacity ?? null, ev.is_unlimited)} />
                          <h3 className="font-bold text-gray-900 text-sm">{ev.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-sm text-purple-700 font-bold">
                            <Users className="w-3.5 h-3.5" /> {ev.participants_count}
                          </span>
                          <Link href={`/evenements/${ev.id}?tab=participants`} className="p-1 hover:bg-gray-200 rounded-lg">
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        </div>
                      </div>
                      {ev.capacity && !ev.is_unlimited && (
                        <div className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${(ev.fill_percentage ?? 0) >= 90 ? 'bg-red-400' : (ev.fill_percentage ?? 0) >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(100, ev.fill_percentage ?? 0)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{ev.fill_percentage}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── KPIs TAB ── */}
            {activeTab === 'kpis' && (
              <div className="space-y-5">
                {/* Overview */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-purple-700">{stats.total}</p>
                    <p className="text-sm font-semibold text-purple-600 opacity-80">Total événements</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-emerald-700">{stats.totalParticipants}</p>
                    <p className="text-sm font-semibold text-emerald-600 opacity-80">Total participants</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-blue-700">{stats.avgFill}%</p>
                    <p className="text-sm font-semibold text-blue-600 opacity-80">Taux de remplissage moyen</p>
                  </div>
                </div>

                {/* Status breakdown */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Répartition par statut</h3>
                  <div className="space-y-2">
                    {Object.entries(EVENT_STATUS_CONFIG).map(([k, v]) => {
                      const count = myEvents.filter(e => {
                        const resolved = resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited);
                        return resolved === k || e.status === k;
                      }).length;
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                      return (
                        <div key={k} className="flex items-center gap-3">
                          <div className="w-24 flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${v.dotColor}`} />
                            <span className={`text-xs font-bold ${v.badgeText}`}>{v.label}</span>
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className={`${v.dotColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-bold text-gray-700 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top events by attendance */}
                {myEvents.some(e => (e.participants_count ?? 0) > 0) && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" /> Top événements par participation
                    </h3>
                    <div className="space-y-2">
                      {[...myEvents]
                        .filter(e => (e.participants_count ?? 0) > 0)
                        .sort((a, b) => (b.participants_count ?? 0) - (a.participants_count ?? 0))
                        .slice(0, 5)
                        .map(ev => (
                          <div key={ev.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Link href={`/evenements/${ev.id}`} className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate hover:text-purple-700">{ev.title}</p>
                              <p className="text-xs text-gray-500">{formatEventDate(ev.event_date, false)}</p>
                            </Link>
                            <div className="flex items-center gap-1 text-purple-700 font-bold text-sm flex-shrink-0">
                              <Users className="w-3.5 h-3.5" />
                              {ev.participants_count}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Cancellation rate */}
                {stats.total > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <p className="font-bold text-orange-800 text-sm mb-1">Taux d&apos;annulation</p>
                    <p className="text-2xl font-black text-orange-700">
                      {Math.round((stats.annule / stats.total) * 100)}%
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">{stats.annule} événement{stats.annule > 1 ? 's' : ''} annulé{stats.annule > 1 ? 's' : ''} sur {stats.total}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent activity ── */}
        {myEvents.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Activité récente
            </h3>
            <div className="space-y-2">
              {[...myEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(ev => (
                <Link key={ev.id} href={`/evenements/${ev.id}`}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{ev.title}</p>
                      <p className="text-xs text-gray-400">Créé {formatRelative(ev.created_at)}</p>
                    </div>
                  </div>
                  <StatusPill status={resolveEventStatus(ev.status, ev.event_date, ev.participants_count ?? 0, ev.capacity ?? null, ev.is_unlimited)} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Transition modal ── */}
      {showModal && pendingAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-gray-900 text-lg">
              {EVENT_STATUS_CONFIG[pendingAction.to]?.label ?? 'Changer le statut'}
            </h3>
            <p className="text-gray-500 text-sm">{EVENT_STATUS_CONFIG[pendingAction.to]?.description}</p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Raison {pendingAction.requiresReason ? '*' : '(optionnel)'}
              </label>
              <textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Précisez la raison..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            {pendingAction.to === 'reporte' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouvelle date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setPendingAction(null); }}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={confirmStatusChange}
                className={`flex-1 font-bold py-2.5 rounded-xl text-sm text-white ${
                  pendingAction.to === 'annule' ? 'bg-red-500 hover:bg-red-600' :
                  pendingAction.to === 'reporte' ? 'bg-violet-500 hover:bg-violet-600' :
                  'bg-purple-600 hover:bg-purple-700'
                }`}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Unused import fix
const _unusedAvatar = Avatar;
void _unusedAvatar;
