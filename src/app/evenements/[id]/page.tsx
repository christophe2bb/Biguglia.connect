'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Calendar, MapPin, Clock, Users, ArrowLeft, Edit2, Trash2,
  CheckCircle, XCircle, AlertCircle, Loader2, Send, MessageSquare,
  ChevronRight, Star, History, Info, UserCheck, RefreshCw, Archive,
  Phone, Globe, Accessibility, UserX, Tag, Euro,
  Share2, Copy, Download, Bell,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  EVENT_STATUS_CONFIG,
  EVENT_PARTICIPANT_STATUS_CONFIG,
  EVENT_CATEGORY_CONFIG,
  getAllowedTransitions,
  resolveEventStatus,
  canUserRegister,
  getRemainingPlaces,
  formatEventDate,
  formatEventTime,
  daysUntilLabel,
  type EventStatus,
  type EventParticipantStatus,
} from '@/lib/events';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EventDetail {
  id: string;
  author_id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  event_date: string;
  event_end_date?: string | null;
  start_time: string;
  end_time?: string | null;
  location: string;
  location_area: string;
  location_city: string;
  location_detail: string;
  organizer_name: string;
  price_type: string;
  price_amount?: number | null;
  capacity?: number | null;
  is_unlimited: boolean;
  status: string;
  registration_open: boolean;
  cover_photo_url?: string | null;
  tags: string[];
  cancel_reason?: string | null;
  postpone_reason?: string | null;
  original_event_date?: string | null;
  accessibility: string;
  contact_info: string;
  external_link: string;
  target_audience: string;
  created_at: string;
  updated_at: string;
  author?: { full_name: string; avatar_url?: string | null } | null;
  photos?: { id: string; url: string; display_order: number; is_cover: boolean }[];
  participants_count?: number;
  user_joined?: boolean;
  user_participant_status?: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  confirmed_at?: string | null;
  user?: { full_name: string; avatar_url?: string | null } | null;
}

interface Comment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string; avatar_url?: string | null } | null;
}

interface StatusHistoryItem {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  changed_by_profile?: { full_name: string } | null;
}

type Tab = 'info' | 'participants' | 'discussion' | 'historique';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cfg = EVENT_STATUS_CONFIG[status as EventStatus];
  if (!cfg) return <span className="text-xs text-gray-400">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

function ParticipantStatusPill({ status }: { status: string }) {
  const cfg = EVENT_PARTICIPANT_STATUS_CONFIG[status as EventParticipantStatus];
  if (!cfg) return <span className="text-xs text-gray-400">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [joiningEvent, setJoiningEvent] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{ to: EventStatus; label: string; requiresReason?: boolean } | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─── Fetch event ───────────────────────────────────────────────────────────
  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      // Try events table first, fallback to local_events
      let { data, error } = await supabase
        .from('events')
        .select('*, author:profiles(full_name, avatar_url), photos:event_photos(id, url, display_order, is_cover)')
        .eq('id', id)
        .single();

      if (error || !data) {
        ({ data, error } = await supabase
          .from('local_events')
          .select('*, author:profiles(full_name, avatar_url)')
          .eq('id', id)
          .single());
      }

      if (error || !data) { toast.error('Événement introuvable'); router.push('/evenements'); return; }

      // Participants count
      const { count } = await supabase
        .from('event_participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', id)
        .neq('status', 'annule');

      let userJoined = false;
      let userPartStatus: string | null = null;
      if (profile) {
        const { data: myPart } = await supabase
          .from('event_participants')
          .select('status')
          .eq('event_id', id)
          .eq('user_id', profile.id)
          .maybeSingle();
        userJoined = !!myPart && myPart.status !== 'annule';
        userPartStatus = myPart?.status ?? null;
      }

      setEvent({
        ...data,
        participants_count: count ?? 0,
        user_joined: userJoined,
        user_participant_status: userPartStatus,
      });
    } catch (e) {
      console.error(e);
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [id, profile, supabase, router]);

  const fetchParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('event_participants')
      .select('id, user_id, status, joined_at, confirmed_at, user:profiles(full_name, avatar_url)')
      .eq('event_id', id)
      .order('joined_at');
    setParticipants(((data ?? []) as unknown) as Participant[]);
  }, [id, supabase]);

  const fetchComments = useCallback(async () => {
    // Try event_comments first
    const { data: c1 } = await supabase
      .from('event_comments')
      .select('id, author_id, content, created_at, author:profiles(full_name, avatar_url)')
      .eq('event_id', id)
      .order('created_at');
    if (c1 && c1.length >= 0) { setComments(c1 as Comment[]); return; }
    // Fallback to outing_comments pattern
    setComments([]);
  }, [id, supabase]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('event_status_history')
      .select('id, old_status, new_status, changed_by, reason, created_at, changed_by_profile:profiles(full_name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false });
    setStatusHistory(((data ?? []) as unknown) as StatusHistoryItem[]);
  }, [id, supabase]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);
  useEffect(() => {
    if (activeTab === 'participants') fetchParticipants();
    if (activeTab === 'discussion') fetchComments();
    if (activeTab === 'historique') fetchHistory();
  }, [activeTab, fetchParticipants, fetchComments, fetchHistory]);
  useEffect(() => {
    if (!showShareMenu) return;
    const close = () => setShowShareMenu(false);
    window.addEventListener('click', close, { once: true });
    return () => window.removeEventListener('click', close);
  }, [showShareMenu]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  // handleJoin → remplacé par handleJoinWithWaitlist (défini plus bas)

  // ─── Notifier les participants d'un changement de statut ─────────────────
  const notifyParticipants = async (newStatus: EventStatus, reason?: string) => {
    if (!event) return;
    try {
      // Récupère tous les participants inscrits (sauf annulés)
      const { data: parts } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', id)
        .neq('status', 'annule');
      if (!parts || parts.length === 0) return;

      const msgMap: Partial<Record<EventStatus, string>> = {
        annule: `❌ L'événement "${event.title}" a été annulé${reason ? ` : ${reason}` : '.'} `,
        reporte: `🔵 L'événement "${event.title}" a été reporté${reason ? ` : ${reason}` : '.'} `,
        passe: `⚪ L'événement "${event.title}" est maintenant terminé.`,
        complet: `🟡 L'événement "${event.title}" est complet — vous êtes sur liste d'attente.`,
        a_venir: `🟢 Les inscriptions pour "${event.title}" sont à nouveau ouvertes !`,
        archive: `📦 L'événement "${event.title}" a été archivé.`,
      };
      const message = msgMap[newStatus];
      if (!message) return;

      const notifications = parts.map((p: { user_id: string }) => ({
        user_id: p.user_id,
        type: 'event_status_change',
        title: 'Changement de statut',
        message,
        related_type: 'event',
        related_id: id,
        read: false,
      }));
      await supabase.from('notifications').insert(notifications);
    } catch (e) {
      console.error('[notifyParticipants]', e);
    }
  };

  // ─── Inscription avec liste d'attente automatique ─────────────────────────
  const handleJoinWithWaitlist = async () => {
    if (!profile || !event) return;
    setJoiningEvent(true);
    try {
      if (event.user_joined) {
        // Désinscription
        await supabase.from('event_participants').delete()
          .eq('event_id', id).eq('user_id', profile.id);
        toast.success('Désinscription effectuée');
      } else {
        // Déterminer le statut : inscrit ou liste_attente
        const isFull = !event.is_unlimited &&
          event.capacity !== null && event.capacity !== undefined &&
          (event.participants_count ?? 0) >= event.capacity;

        const participantStatus = isFull ? 'liste_attente' : 'inscrit';

        const { error } = await supabase.from('event_participants').upsert({
          event_id: id,
          user_id: profile.id,
          status: participantStatus,
          joined_at: new Date().toISOString(),
        }, { onConflict: 'event_id,user_id' });

        if (error) { toast.error("Erreur lors de l'inscription"); return; }

        if (participantStatus === 'liste_attente') {
          toast.success("📋 Événement complet — vous êtes ajouté(e) à la liste d'attente !", { duration: 4000 });
          // Notifier l'organisateur
          await supabase.from('notifications').insert({
            user_id: event.author_id,
            type: 'waitlist_join',
            title: "Nouvelle liste d'attente",
            message: `${profile.full_name ?? 'Un utilisateur'} s'est inscrit(e) sur la liste d'attente de "${event.title}".`,
            related_type: 'event',
            related_id: id,
            read: false,
          });
        } else {
          toast.success('✅ Inscription confirmée !');
          // Notifier l'organisateur
          await supabase.from('notifications').insert({
            user_id: event.author_id,
            type: 'new_participant',
            title: 'Nouvelle inscription',
            message: `${profile.full_name ?? 'Un utilisateur'} s'est inscrit(e) à "${event.title}".`,
            related_type: 'event',
            related_id: id,
            read: false,
          });
        }
      }
      await fetchEvent();
    } finally {
      setJoiningEvent(false);
    }
  };

  // ─── Export iCal ─────────────────────────────────────────────────────────
  const handleDownloadIcal = () => {
    if (!event) return;
    const fmt = (d: string, t?: string | null) => {
      const date = d.replace(/-/g, '');
      if (!t) return date;
      const time = t.replace(/:/g, '').substring(0, 4) + '00';
      return `${date}T${time}00`;
    };
    const uid = `${event.id}@biguglia-connect`;
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtstart = event.start_time
      ? `DTSTART:${fmt(event.event_date, event.start_time)}`
      : `DTSTART;VALUE=DATE:${fmt(event.event_date)}`;
    const dtend = event.event_end_date
      ? (event.end_time
          ? `DTEND:${fmt(event.event_end_date, event.end_time)}`
          : `DTEND;VALUE=DATE:${fmt(event.event_end_date)}`)
      : (event.end_time
          ? `DTEND:${fmt(event.event_date, event.end_time)}`
          : `DTEND;VALUE=DATE:${fmt(event.event_date)}`);
    const desc = (event.description ?? '').replace(/\n/g, '\\n').substring(0, 500);
    const loc = [event.location, event.location_detail].filter(Boolean).join(', ');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Biguglia Connect//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      dtstart,
      dtend,
      `SUMMARY:${event.title}`,
      desc ? `DESCRIPTION:${desc}` : '',
      loc ? `LOCATION:${loc}` : '',
      `URL:${window.location.href}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📅 Fichier .ics téléchargé !');
  };

  // ─── Partage ──────────────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('🔗 Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const handleStatusTransition = async () => {
    if (!pendingTransition || !event) return;
    if (pendingTransition.requiresReason && !transitionReason.trim()) {
      toast.error('Une raison est requise'); return;
    }
    try {
      const updates: Record<string, unknown> = { status: pendingTransition.to };
      if (pendingTransition.to === 'annule') updates.cancel_reason = transitionReason;
      if (pendingTransition.to === 'reporte') {
        updates.postpone_reason = transitionReason;
        updates.original_event_date = event.event_date;
        if (newDate) updates.event_date = newDate;
        if (newTime) updates.start_time = newTime;
        // Log date history
        await supabase.from('event_date_history').insert({
          event_id: id, old_event_date: event.event_date, new_event_date: newDate || event.event_date,
          old_start_time: event.start_time, new_start_time: newTime || event.start_time,
          changed_by: profile?.id, reason: transitionReason,
        });
      }
      if (pendingTransition.to === 'archive') updates.archived_at = new Date().toISOString();
      if (pendingTransition.to === 'a_venir') updates.registration_open = true;

      const tableName = 'events';
      const { error } = await supabase.from(tableName).update(updates).eq('id', id);
      if (error) {
        // Try local_events fallback
        await supabase.from('local_events').update(updates).eq('id', id);
      }
      toast.success(`Statut mis à jour : ${EVENT_STATUS_CONFIG[pendingTransition.to]?.label}`);
      // Notifier les participants
      await notifyParticipants(pendingTransition.to, transitionReason || undefined);
      setShowTransitionModal(false);
      setPendingTransition(null);
      setTransitionReason('');
      setNewDate(''); setNewTime('');
      await fetchEvent();
      await fetchHistory();
    } catch (e) {
      console.error(e);
      toast.error('Erreur mise à jour statut');
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    const cnt = event.participants_count ?? 0;
    if (cnt > 0) { toast.error('Impossible : des participants sont inscrits'); return; }
    try {
      await supabase.from('events').delete().eq('id', id);
      await supabase.from('local_events').delete().eq('id', id);
      toast.success('Événement supprimé');
      router.push('/evenements');
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !commentText.trim()) return;
    setCommenting(true);
    try {
      await supabase.from('event_comments').insert({
        event_id: id, author_id: profile.id, content: commentText.trim(),
      });
      setCommentText('');
      await fetchComments();
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentAuthorId: string) => {
    if (!profile || !event) return;
    const canDel = profile.id === commentAuthorId
      || profile.role === 'admin'
      || profile.role === 'moderator'
      || profile.id === event.author_id;
    if (!canDel) { toast.error('Non autorisé'); return; }
    try {
      await supabase.from('event_comments').delete().eq('id', commentId);
      toast.success('Commentaire supprimé');
      await fetchComments();
    } catch { toast.error('Erreur suppression'); }
  };

  const handleMarkAttendance = async (userId: string, status: 'present' | 'absent') => {
    await supabase.from('event_participants')
      .update({ status, attendance_marked_at: new Date().toISOString() })
      .eq('event_id', id).eq('user_id', userId);
    toast.success(status === 'present' ? 'Marqué présent' : 'Marqué absent');
    await fetchParticipants();
  };

  // ─── Computed ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }
  if (!event) return null;

  const isAuthor = profile?.id === event.author_id;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
  const canManage = isAuthor || isAdmin;

  const resolvedStatus = resolveEventStatus(
    event.status, event.event_date,
    event.participants_count ?? 0,
    event.capacity ?? null,
    event.is_unlimited,
  );
  const remaining = getRemainingPlaces(event.capacity ?? null, event.is_unlimited, event.participants_count ?? 0);
  const registerCheck = canUserRegister(resolvedStatus, event.registration_open, event.event_date, remaining, event.is_unlimited);
  const allowedTransitions = getAllowedTransitions(resolvedStatus);
  const cat = EVENT_CATEGORY_CONFIG[event.category as keyof typeof EVENT_CATEGORY_CONFIG] ?? EVENT_CATEGORY_CONFIG.autres;
  const daysLabel = daysUntilLabel(event.event_date);

  const allPhotos = event.photos ?? [];
  const coverPhoto = allPhotos.find(p => p.is_cover)?.url ?? event.cover_photo_url ?? allPhotos[0]?.url;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Informations', icon: Info },
    { id: 'participants', label: `Participants (${event.participants_count ?? 0})`, icon: Users },
    { id: 'discussion', label: 'Discussion', icon: MessageSquare },
    { id: 'historique', label: 'Historique', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header image ── */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-purple-600 to-violet-700 overflow-hidden">
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPhoto} alt={event.title} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl opacity-30">{cat.icon}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Back */}
        <Link href="/evenements" className="absolute top-4 left-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-white/30 transition-all">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        {/* Status badge + Share + iCal */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* iCal */}
          <button
            onClick={handleDownloadIcal}
            title="Ajouter au calendrier (.ics)"
            className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
          {/* Share */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(s => !s)}
              title="Partager"
              className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {showShareMenu && (
              <div className="absolute right-0 top-10 bg-white shadow-xl rounded-2xl border border-gray-100 p-2 w-52 z-20 space-y-1">
                <button onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium">
                  <Copy className="w-4 h-4 text-gray-400" />
                  {copied ? 'Lien copié ✓' : 'Copier le lien'}
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(event.title + ' — ' + window.location.href)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium">
                  <span className="text-base">💬</span> WhatsApp
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium">
                  <span className="text-base">📘</span> Facebook
                </a>
                <a href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent('Rejoins-moi : ' + window.location.href)}`}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium">
                  <span className="text-base">📧</span> Email
                </a>
              </div>
            )}
          </div>
          <StatusBadge status={event.status} contentType="event" extra={{ eventDate: event.event_date, isFull: !event.is_unlimited && !!event.capacity && (event.participants_count ?? 0) >= event.capacity }} />
        </div>
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${cat.bg} ${cat.color} border ${cat.border}`}>
            <span>{cat.icon}</span> {cat.label}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{event.title}</h1>
          {event.subtitle && <p className="text-white/80 text-sm mt-1">{event.subtitle}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 pb-20">
        {/* ── Key info strip ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Date</p>
              <p className="text-sm font-bold text-gray-900">{formatEventDate(event.event_date, false)}</p>
              {daysLabel && <p className="text-xs text-purple-600 font-semibold">{daysLabel}</p>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Horaire</p>
              <p className="text-sm font-bold text-gray-900">
                {formatEventTime(event.start_time)}
                {event.end_time ? ` → ${formatEventTime(event.end_time)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Lieu</p>
              <p className="text-sm font-bold text-gray-900 line-clamp-1">{event.location}</p>
              {event.location_detail && <p className="text-xs text-gray-500">{event.location_detail}</p>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Euro className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Tarif</p>
              <p className="text-sm font-bold text-gray-900">
                {event.price_type === 'gratuit' ? 'Gratuit' :
                 event.price_type === 'libre' ? 'Prix libre' :
                 event.price_amount ? `${event.price_amount} €` : 'Payant'}
              </p>
            </div>
          </div>
        </div>

        {/* ── CTA Inscription ── */}
        {resolvedStatus !== 'archive' && (
          <div className={`rounded-2xl border p-4 mb-4 flex items-center justify-between gap-4 ${
            resolvedStatus === 'a_venir' && registerCheck.allowed
              ? 'bg-purple-50 border-purple-200'
              : resolvedStatus === 'annule'
              ? 'bg-red-50 border-red-200'
              : resolvedStatus === 'reporte'
              ? 'bg-violet-50 border-violet-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div>
              {resolvedStatus === 'annule' && (
                <p className="font-bold text-red-700 text-sm">❌ Événement annulé{event.cancel_reason ? ` — ${event.cancel_reason}` : ''}</p>
              )}
              {resolvedStatus === 'reporte' && (
                <div>
                  <p className="font-bold text-violet-700 text-sm">🔵 Événement reporté</p>
                  {event.original_event_date && <p className="text-xs text-violet-600">Ancienne date : {formatEventDate(event.original_event_date, false)}</p>}
                  {event.postpone_reason && <p className="text-xs text-violet-600 mt-0.5">{event.postpone_reason}</p>}
                </div>
              )}
              {resolvedStatus === 'passe' && <p className="font-bold text-gray-600 text-sm">⚪ Cet événement est terminé</p>}
              {resolvedStatus === 'complet' && <p className="font-bold text-amber-700 text-sm">🟡 Complet — {remaining === 0 ? 'Liste d\'attente possible' : ''}</p>}
              {resolvedStatus === 'a_venir' && (
                <div>
                  <p className="font-semibold text-purple-800 text-sm">
                    {event.is_unlimited ? 'Inscriptions ouvertes — places illimitées' :
                     remaining !== null ? `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}` :
                     'Inscriptions ouvertes'}
                  </p>
                  {event.participants_count !== undefined && event.capacity && (
                    <div className="mt-1.5 w-48 bg-purple-100 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((event.participants_count) / event.capacity) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            {profile && (resolvedStatus === 'a_venir' || resolvedStatus === 'complet') && (
              <div className="flex-shrink-0">
                {event.user_joined ? (
                  <button onClick={handleJoinWithWaitlist} disabled={joiningEvent}
                    className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
                    {joiningEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Se désinscrire
                  </button>
                ) : resolvedStatus === 'complet' ? (
                  <button onClick={handleJoinWithWaitlist} disabled={joiningEvent}
                    className="flex items-center gap-2 bg-amber-500 text-white hover:bg-amber-600 font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
                    {joiningEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    Liste d&apos;attente
                  </button>
                ) : registerCheck.allowed ? (
                  <button onClick={handleJoinWithWaitlist} disabled={joiningEvent}
                    className="flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
                    {joiningEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    S&apos;inscrire
                  </button>
                ) : (
                  <span className="text-xs text-gray-500 italic">{registerCheck.reason}</span>
                )}
              </div>
            )}
            {!profile && resolvedStatus === 'a_venir' && registerCheck.allowed && (
              <Link href="/connexion" className="flex items-center gap-2 bg-purple-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-purple-700">
                Se connecter pour s&apos;inscrire
              </Link>
            )}
          </div>
        )}

        {/* ── Organizer actions ── */}
        {canManage && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Actions organisateur</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/evenements/${id}/modifier`}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2 rounded-xl text-sm transition-all">
                <Edit2 className="w-3.5 h-3.5" /> Modifier
              </Link>
              {allowedTransitions.map(t => (
                <button key={t.to} onClick={() => { setPendingTransition(t); setShowTransitionModal(true); }}
                  className={`flex items-center gap-1.5 font-semibold px-3 py-2 rounded-xl text-sm transition-all ${
                    t.to === 'annule' ? 'bg-red-50 hover:bg-red-100 text-red-700' :
                    t.to === 'reporte' ? 'bg-violet-50 hover:bg-violet-100 text-violet-700' :
                    t.to === 'archive' ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' :
                    'bg-purple-50 hover:bg-purple-100 text-purple-700'
                  }`}>
                  {t.to === 'annule' && <XCircle className="w-3.5 h-3.5" />}
                  {t.to === 'reporte' && <RefreshCw className="w-3.5 h-3.5" />}
                  {t.to === 'archive' && <Archive className="w-3.5 h-3.5" />}
                  {t.to === 'complet' && <Users className="w-3.5 h-3.5" />}
                  {t.to === 'a_venir' && <CheckCircle className="w-3.5 h-3.5" />}
                  {t.to === 'passe' && <History className="w-3.5 h-3.5" />}
                  {t.label}
                </button>
              ))}
              {(event.participants_count ?? 0) === 0 && (
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-3 py-2 rounded-xl text-sm transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
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
            {/* ── INFO ── */}
            {activeTab === 'info' && (
              <div className="space-y-5">
                {/* Description */}
                {event.description && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
                  </div>
                )}
                {/* Photos gallery */}
                {allPhotos.length > 1 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Photos</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {allPhotos.map((p, i) => (
                        <button key={p.id} onClick={() => setLightboxIdx(i)} className="aspect-square rounded-xl overflow-hidden border border-gray-100 hover:opacity-90 transition-opacity">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Organizer */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <Avatar name={event.author?.full_name ?? 'Organisateur'} src={event.author?.avatar_url} size="md" />
                  <div>
                    <p className="text-xs text-gray-500">Organisé par</p>
                    <p className="font-bold text-gray-900">{event.organizer_name || event.author?.full_name || 'Organisateur'}</p>
                    {event.author_id && (
                      <Link href={`/profil/${event.author_id}`} className="text-xs text-purple-600 hover:underline">Voir le profil</Link>
                    )}
                  </div>
                </div>
                {/* Additional info */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {event.target_audience && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                      <Tag className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Public cible</p>
                        <p className="text-sm font-semibold text-gray-700">{event.target_audience}</p>
                      </div>
                    </div>
                  )}
                  {event.accessibility && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                      <Accessibility className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Accessibilité</p>
                        <p className="text-sm font-semibold text-gray-700">{event.accessibility}</p>
                      </div>
                    </div>
                  )}
                  {event.contact_info && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                      <Phone className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Contact</p>
                        <p className="text-sm font-semibold text-gray-700">{event.contact_info}</p>
                      </div>
                    </div>
                  )}
                  {event.external_link && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                      <Globe className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Lien externe</p>
                        <a href={event.external_link} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold text-purple-600 hover:underline line-clamp-1">{event.external_link}</a>
                      </div>
                    </div>
                  )}
                </div>
                {/* Tags */}
                {event.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map(t => (
                      <span key={t} className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">#{t}</span>
                    ))}
                  </div>
                )}
                {/* Report */}
                {profile && !isAuthor && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">Créé le {formatRelative(event.created_at)}</p>
                    <ReportButton targetType="event" targetId={id} targetTitle={event.title} />
                  </div>
                )}
              </div>
            )}

            {/* ── PARTICIPANTS ── */}
            {activeTab === 'participants' && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Inscrits', value: participants.filter(p => p.status === 'inscrit').length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { label: 'Confirmés', value: participants.filter(p => p.status === 'confirme').length, color: 'text-blue-700', bg: 'bg-blue-50' },
                    { label: "Liste d'attente", value: participants.filter(p => p.status === 'liste_attente').length, color: 'text-amber-700', bg: 'bg-amber-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className={`text-xs font-semibold ${s.color} opacity-80`}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold">Aucun participant pour l&apos;instant</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.user?.full_name ?? 'Participant'} src={p.user?.avatar_url} size="sm" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{p.user?.full_name ?? 'Participant'}</p>
                            <p className="text-xs text-gray-400">Inscrit {formatRelative(p.joined_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ParticipantStatusPill status={p.status} />
                          {canManage && resolvedStatus === 'passe' && p.status !== 'annule' && (
                            <div className="flex gap-1">
                              <button onClick={() => handleMarkAttendance(p.user_id, 'present')}
                                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600" title="Présent">
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleMarkAttendance(p.user_id, 'absent')}
                                className="p-1 hover:bg-red-100 rounded-lg text-red-500" title="Absent">
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── DISCUSSION ── */}
            {activeTab === 'discussion' && (
              <div className="space-y-4">
                {profile && (
                  <form onSubmit={handleComment} className="flex gap-2">
                    <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                        placeholder="Posez une question, partagez une info..."
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      <button type="submit" disabled={commenting || !commentText.trim()}
                        className="bg-purple-600 text-white px-3 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all">
                        {commenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </form>
                )}
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold">Aucun message</p>
                    <p className="text-gray-400 text-sm">Soyez le premier à démarrer la discussion !</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map(c => {
                      const canDelComment = !!profile && (
                        profile.id === c.author_id
                        || profile.role === 'admin'
                        || profile.role === 'moderator'
                        || profile.id === event.author_id
                      );
                      return (
                        <div key={c.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                          <Avatar name={c.author?.full_name ?? 'Anonyme'} src={c.author?.avatar_url} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{c.author?.full_name ?? 'Anonyme'}</span>
                              <span className="text-xs text-gray-400">{formatRelative(c.created_at)}</span>
                              {canDelComment && (
                                <button
                                  onClick={() => handleDeleteComment(c.id, c.author_id)}
                                  className="ml-auto p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORIQUE ── */}
            {activeTab === 'historique' && (
              <div className="space-y-3">
                {statusHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold">Aucun changement de statut enregistré</p>
                  </div>
                ) : (
                  statusHistory.map(h => {
                    const newCfg = EVENT_STATUS_CONFIG[h.new_status as EventStatus];
                    return (
                      <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <span className={`mt-0.5 w-8 h-8 flex items-center justify-center rounded-full text-sm flex-shrink-0 ${newCfg?.badgeBg ?? 'bg-gray-100'}`}>
                          {newCfg?.icon ?? '•'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {h.old_status && <StatusPill status={h.old_status} />}
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                            <StatusPill status={h.new_status} />
                          </div>
                          {h.reason && <p className="text-xs text-gray-600 mt-1 italic">{h.reason}</p>}
                          <p className="text-xs text-gray-400 mt-1">
                            {h.changed_by_profile?.full_name ?? 'Système'} · {formatRelative(h.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Transition modal ── */}
      {showTransitionModal && pendingTransition && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-gray-900 text-lg">{pendingTransition.label}</h3>
            <p className="text-gray-500 text-sm">{EVENT_STATUS_TRANSITIONS_MAP[pendingTransition.to]}</p>
            {(pendingTransition.requiresReason || true) && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Raison {pendingTransition.requiresReason ? '*' : '(optionnel)'}
                </label>
                <textarea
                  value={transitionReason} onChange={e => setTransitionReason(e.target.value)}
                  placeholder={pendingTransition.to === 'annule' ? "Ex: Annulé en raison des conditions météo..." :
                               pendingTransition.to === 'reporte' ? "Ex: Reporté suite à..." : "Commentaire..."}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
              </div>
            )}
            {pendingTransition.to === 'reporte' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouvelle date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouvelle heure</label>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowTransitionModal(false); setPendingTransition(null); setTransitionReason(''); }}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleStatusTransition}
                className={`flex-1 font-bold py-2.5 rounded-xl text-sm text-white transition-all ${
                  pendingTransition.to === 'annule' ? 'bg-red-500 hover:bg-red-600' :
                  pendingTransition.to === 'reporte' ? 'bg-violet-500 hover:bg-violet-600' :
                  'bg-purple-600 hover:bg-purple-700'
                }`}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="font-black text-gray-900 text-center">Supprimer l&apos;événement ?</h3>
            <p className="text-gray-500 text-sm text-center">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">Annuler</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && allPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxIdx(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={allPhotos[lightboxIdx].url} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}

// Descriptions des transitions pour affichage dans modal
const EVENT_STATUS_TRANSITIONS_MAP: Partial<Record<EventStatus, string>> = {
  annule: 'Cette action annule définitivement l\'événement et notifie les participants.',
  reporte: 'Indiquez une nouvelle date et une raison. Les participants seront notifiés.',
  complet: 'Marquer l\'événement comme complet et fermer les inscriptions.',
  a_venir: 'Rouvrir les inscriptions pour cet événement.',
  passe: 'Marquer l\'événement comme terminé.',
  archive: 'Archiver l\'événement — il sera masqué des flux actifs.',
};

// Fix for getAllowedTransitions usage 
const EVENT_STATUS_TRANSITIONS_REF = [
  { to: 'a_venir' as EventStatus }, { to: 'complet' as EventStatus },
  { to: 'reporte' as EventStatus }, { to: 'annule' as EventStatus },
  { to: 'passe' as EventStatus }, { to: 'archive' as EventStatus },
];
void EVENT_STATUS_TRANSITIONS_REF; // prevent unused warning
