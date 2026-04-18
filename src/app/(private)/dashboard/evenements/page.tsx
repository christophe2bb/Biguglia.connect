'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Calendar, Plus, Users, BarChart3, AlertCircle, Clock, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  EVENT_STATUS_CONFIG, resolveEventStatus, type EventStatus,
} from '@/lib/events';
import EvenementsTab from './_widgets/EvenementsTab';
import ParticipantsTab from './_widgets/ParticipantsTab';
import KpisTab from './_widgets/KpisTab';
import StatusPill from './_widgets/StatusPill';
import { type MyEvent } from './_widgets/EventCard';

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

const TABS: { id: DashTab; label: string; icon: React.ElementType }[] = [
  { id: 'evenements', label: 'Mes événements', icon: Calendar },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'kpis', label: 'Statistiques', icon: BarChart3 },
];

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
  const modalRef    = useRef<HTMLDivElement>(null);
  const modalTriggerRef = useRef<Element | null>(null);
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchMyEvents = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select('id, title, subtitle, category, event_date, start_time, location, status, capacity, is_unlimited, registration_open, created_at')
        .eq('author_id', profile.id)
        .order('event_date', { ascending: false });

      let rawEvents = evData ?? [];

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

  // Focus management + Escape for transition modal
  useEffect(() => {
    if (showModal) {
      modalTriggerRef.current = document.activeElement;
      const frame = requestAnimationFrame(() => { modalRef.current?.focus(); });
      return () => cancelAnimationFrame(frame);
    } else {
      if (modalTriggerRef.current instanceof HTMLElement) modalTriggerRef.current.focus();
    }
  }, [showModal]);

  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowModal(false);
        setPendingAction(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal]);

  // ── Handlers ─────────────────────────────────────────────────────────────
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

      await supabase.from('events').update(updates).eq('id', pendingAction.id);
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
    toast.success('Événement supprimé');
    await fetchMyEvents();
  };

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
        {/* KPI Cards */}
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

        {/* Tabs */}
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
            {activeTab === 'evenements' && (
              <EvenementsTab
                myEvents={myEvents}
                loading={loading}
                statusFilter={statusFilter}
                onFilterChange={setStatusFilter}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            )}
            {activeTab === 'participants' && (
              <ParticipantsTab myEvents={myEvents} loading={loading} />
            )}
            {activeTab === 'kpis' && (
              <KpisTab myEvents={myEvents} stats={stats} />
            )}
          </div>
        </div>

        {/* Recent activity */}
        {myEvents.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Activité récente
            </h3>
            <div className="space-y-2">
              {[...myEvents]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map(ev => (
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

      {/* Transition modal */}
      {showModal && pendingAction && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          aria-hidden="true"
          onClick={() => { setShowModal(false); setPendingAction(null); }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Changer le statut de l'événement"
            tabIndex={-1}
            className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 outline-none"
            onClick={e => e.stopPropagation()}
          >
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
