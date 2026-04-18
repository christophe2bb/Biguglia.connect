'use client';

/**
 * useEventDetail — hook central pour la page de détail d'un événement.
 * Gère : fetch Supabase, état UI, toutes les actions (inscription, statut,
 * suppression, commentaires, présence, export iCal, partage).
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import {
  EVENT_STATUS_CONFIG,
  type EventStatus,
} from '@/lib/events';
import toast from 'react-hot-toast';

import { EVENT_NOTIFY_MESSAGES } from './_config';
import type {
  EventDetail,
  Participant,
  EventComment,
  StatusHistoryItem,
  TabId,
  PendingTransition,
  UseEventDetailReturn,
} from './_types';

export function useEventDetail(initialEvent: EventDetail): UseEventDetailReturn {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { profile } = useAuthStore();
  const supabase = createClient();

  // ─── State ──────────────────────────────────────────────────────────────────
  // Initialisé avec les données serveur (évite le double-fetch au chargement)
  const [event,         setEvent]         = useState<EventDetail | null>(initialEvent);
  const [participants,  setParticipants]  = useState<Participant[]>([]);
  const [comments,      setComments]      = useState<EventComment[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading,       setLoading]       = useState(false); // déjà chargé côté serveur
  const [activeTab,     setActiveTab]     = useState<TabId>('info');
  const [commenting,    setCommenting]    = useState(false);
  const [commentText,   setCommentText]   = useState('');
  const [joiningEvent,  setJoiningEvent]  = useState(false);
  const [showTransitionModal,  setShowTransitionModal]  = useState(false);
  const [pendingTransition,    setPendingTransition]    = useState<PendingTransition | null>(null);
  const [transitionReason,     setTransitionReason]     = useState('');
  const [showDeleteConfirm,    setShowDeleteConfirm]    = useState(false);
  const [newDate,  setNewDate]  = useState('');
  const [newTime,  setNewTime]  = useState('');
  const [lightboxIdx,   setLightboxIdx]   = useState<number | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied,        setCopied]        = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      let { data, error } = await supabase
        .from('events')
        .select('*, author:profiles(full_name, avatar_url), photos:event_photos(id, url, display_order, is_cover)')
        .eq('id', id)
        .single();

      if (error || !data) {
        ({ data, error } = await supabase
          .from('events')
          .select('*, author:profiles(full_name, avatar_url)')
          .eq('id', id)
          .single());
      }

      if (error || !data) {
        toast.error('Événement introuvable');
        router.push('/evenements');
        return;
      }

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
        userJoined     = !!myPart && myPart.status !== 'annule';
        userPartStatus = myPart?.status ?? null;
      }

      setEvent({
        ...data,
        participants_count:      count ?? 0,
        user_joined:             userJoined,
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
    const { data } = await supabase
      .from('event_comments')
      .select('id, author_id, content, created_at, author:profiles(full_name, avatar_url)')
      .eq('event_id', id)
      .order('created_at');
    setComments(((data ?? []) as unknown) as EventComment[]);
  }, [id, supabase]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('event_status_history')
      .select('id, old_status, new_status, changed_by, reason, created_at, changed_by_profile:profiles(full_name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false });
    setStatusHistory(((data ?? []) as unknown) as StatusHistoryItem[]);
  }, [id, supabase]);

  // Met à jour l'état user_joined après hydration (nécessite auth)
  useEffect(() => {
    if (!profile) return;
    supabase
      .from('event_participants')
      .select('status')
      .eq('event_id', id)
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data: myPart }) => {
        setEvent(prev => prev ? {
          ...prev,
          user_joined: !!myPart && myPart.status !== 'annule',
          user_participant_status: myPart?.status ?? null,
        } : prev);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, id]);
  useEffect(() => {
    if (activeTab === 'participants') fetchParticipants();
    if (activeTab === 'discussion')  fetchComments();
    if (activeTab === 'historique')  fetchHistory();
  }, [activeTab, fetchParticipants, fetchComments, fetchHistory]);

  // Fermeture du menu partage au clic extérieur
  useEffect(() => {
    if (!showShareMenu) return;
    const close = () => setShowShareMenu(false);
    window.addEventListener('click', close, { once: true });
    return () => window.removeEventListener('click', close);
  }, [showShareMenu]);

  // ─── Notification participants ───────────────────────────────────────────────
  const notifyParticipants = useCallback(async (newStatus: EventStatus, reason?: string) => {
    if (!event) return;
    try {
      const { data: parts } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', id)
        .neq('status', 'annule');
      if (!parts?.length) return;

      const msgFn = EVENT_NOTIFY_MESSAGES[newStatus];
      const message = msgFn?.(event.title, reason);
      if (!message) return;

      const notifications = parts.map((p: { user_id: string }) => ({
        user_id:      p.user_id,
        type:         'event_status_change',
        title:        'Changement de statut',
        message,
        related_type: 'event',
        related_id:   id,
        read:         false,
      }));
      await supabase.from('notifications').insert(notifications);
    } catch (e) {
      console.error('[notifyParticipants]', e);
    }
  }, [event, id, supabase]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleJoinWithWaitlist = useCallback(async () => {
    if (!profile || !event) return;
    setJoiningEvent(true);
    try {
      if (event.user_joined) {
        await supabase.from('event_participants').delete()
          .eq('event_id', id).eq('user_id', profile.id);
        toast.success('Désinscription effectuée');
      } else {
        const isFull = !event.is_unlimited
          && event.capacity !== null && event.capacity !== undefined
          && (event.participants_count ?? 0) >= event.capacity;
        const participantStatus = isFull ? 'liste_attente' : 'inscrit';

        const { error } = await supabase.from('event_participants').upsert({
          event_id:  id,
          user_id:   profile.id,
          status:    participantStatus,
          joined_at: new Date().toISOString(),
        }, { onConflict: 'event_id,user_id' });

        if (error) { toast.error("Erreur lors de l'inscription"); return; }

        if (participantStatus === 'liste_attente') {
          toast.success("📋 Événement complet — vous êtes ajouté(e) à la liste d'attente !", { duration: 4000 });
          await supabase.from('notifications').insert({
            user_id:      event.author_id,
            type:         'waitlist_join',
            title:        "Nouvelle liste d'attente",
            message:      `${profile.full_name ?? 'Un utilisateur'} s'est inscrit(e) sur la liste d'attente de "${event.title}".`,
            related_type: 'event',
            related_id:   id,
            read:         false,
          });
        } else {
          toast.success('✅ Inscription confirmée !');
          await supabase.from('notifications').insert({
            user_id:      event.author_id,
            type:         'new_participant',
            title:        'Nouvelle inscription',
            message:      `${profile.full_name ?? 'Un utilisateur'} s'est inscrit(e) à "${event.title}".`,
            related_type: 'event',
            related_id:   id,
            read:         false,
          });
        }
      }
      await fetchEvent();
    } finally {
      setJoiningEvent(false);
    }
  }, [profile, event, id, supabase, fetchEvent]);

  const handleDownloadIcal = useCallback(() => {
    if (!event) return;
    const fmt = (d: string, t?: string | null) => {
      const date = d.replace(/-/g, '');
      if (!t) return date;
      return `${date}T${t.replace(/:/g, '').substring(0, 4)}00`;
    };
    const uid   = `${event.id}@biguglia-connect`;
    const now   = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtstart = event.start_time
      ? `DTSTART:${fmt(event.event_date, event.start_time)}`
      : `DTSTART;VALUE=DATE:${fmt(event.event_date)}`;
    const dtend = event.event_end_date
      ? (event.end_time ? `DTEND:${fmt(event.event_end_date, event.end_time)}` : `DTEND;VALUE=DATE:${fmt(event.event_end_date)}`)
      : (event.end_time ? `DTEND:${fmt(event.event_date, event.end_time)}`     : `DTEND;VALUE=DATE:${fmt(event.event_date)}`);
    const desc  = (event.description ?? '').replace(/\n/g, '\\n').substring(0, 500);
    const loc   = [event.location, event.location_detail].filter(Boolean).join(', ');

    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Biguglia Connect//FR',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${uid}`, `DTSTAMP:${now}`, dtstart, dtend,
      `SUMMARY:${event.title}`,
      desc ? `DESCRIPTION:${desc}` : '',
      loc  ? `LOCATION:${loc}`     : '',
      `URL:${window.location.href}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📅 Fichier .ics téléchargé !');
  }, [event]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('🔗 Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  }, []);

  const handleStatusTransition = useCallback(async () => {
    if (!pendingTransition || !event) return;
    if (pendingTransition.requiresReason && !transitionReason.trim()) {
      toast.error('Une raison est requise'); return;
    }
    try {
      const updates: Record<string, unknown> = { status: pendingTransition.to };
      if (pendingTransition.to === 'annule') updates.cancel_reason = transitionReason;
      if (pendingTransition.to === 'reporte') {
        updates.postpone_reason     = transitionReason;
        updates.original_event_date = event.event_date;
        if (newDate) updates.event_date  = newDate;
        if (newTime) updates.start_time  = newTime;
        await supabase.from('event_date_history').insert({
          event_id:       id,
          old_event_date: event.event_date,
          new_event_date: newDate || event.event_date,
          old_start_time: event.start_time,
          new_start_time: newTime || event.start_time,
          changed_by:     profile?.id,
          reason:         transitionReason,
        });
      }
      if (pendingTransition.to === 'archive') updates.archived_at     = new Date().toISOString();
      if (pendingTransition.to === 'a_venir') updates.registration_open = true;

      const { error } = await supabase.from('events').update(updates).eq('id', id);
      if (error) await supabase.from('events').update(updates).eq('id', id);

      toast.success(`Statut mis à jour : ${EVENT_STATUS_CONFIG[pendingTransition.to]?.label}`);
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
  }, [pendingTransition, event, transitionReason, newDate, newTime, id, profile, supabase, notifyParticipants, fetchEvent, fetchHistory]);

  const handleDelete = useCallback(async () => {
    if (!event) return;
    if ((event.participants_count ?? 0) > 0) {
      toast.error('Impossible : des participants sont inscrits'); return;
    }
    try {
      await supabase.from('events').delete().eq('id', id);
      toast.success('Événement supprimé');
      router.push('/evenements');
    } catch {
      toast.error('Erreur suppression');
    }
  }, [event, id, supabase, router]);

  const handleComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !commentText.trim()) return;
    setCommenting(true);
    try {
      await supabase.from('event_comments').insert({
        event_id:  id,
        author_id: profile.id,
        content:   commentText.trim(),
      });
      setCommentText('');
      await fetchComments();
    } finally {
      setCommenting(false);
    }
  }, [profile, commentText, id, supabase, fetchComments]);

  const handleDeleteComment = useCallback(async (commentId: string, commentAuthorId: string) => {
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
  }, [profile, event, supabase, fetchComments]);

  const handleMarkAttendance = useCallback(async (userId: string, status: 'present' | 'absent') => {
    await supabase.from('event_participants')
      .update({ status, attendance_marked_at: new Date().toISOString() })
      .eq('event_id', id).eq('user_id', userId);
    toast.success(status === 'present' ? 'Marqué présent' : 'Marqué absent');
    await fetchParticipants();
  }, [id, supabase, fetchParticipants]);

  return {
    event, participants, comments, statusHistory,
    loading, activeTab, joiningEvent, commenting, commentText,
    showTransitionModal, pendingTransition, transitionReason,
    showDeleteConfirm, newDate, newTime, lightboxIdx, showShareMenu, copied,
    setActiveTab, setCommentText,
    setShowTransitionModal, setPendingTransition, setTransitionReason,
    setShowDeleteConfirm, setNewDate, setNewTime, setLightboxIdx,
    setShowShareMenu,
    handleJoinWithWaitlist, handleDownloadIcal, handleCopyLink,
    handleStatusTransition, handleDelete,
    handleComment, handleDeleteComment, handleMarkAttendance,
  };
}
