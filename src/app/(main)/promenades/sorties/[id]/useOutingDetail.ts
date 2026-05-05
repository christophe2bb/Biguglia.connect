'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  OUTING_STATUS_CONFIG,
  OUTING_TRANSITIONS,
  legacyToFrenchStatus,
  computeDisplayStatus,
  canRegister,
  type OutingStatus,
} from '@/lib/outings';
import type {
  Outing,
  Participant,
  StatusHistory,
  Comment,
  OutingPhoto,
  TabId,
  UseOutingDetailReturn,
} from './_types';

export function useOutingDetail(): UseOutingDetailReturn {
  const params  = useParams();
  const router  = useRouter();
  const { profile } = useAuthStore();
  const supabase    = useMemo(() => createClient(), []);
  const outingId    = params.id as string;

  // ── Data state ────────────────────────────────────────────────────────────
  const [outing,          setOuting]          = useState<Outing | null>(null);
  const [participants,    setParticipants]    = useState<Participant[]>([]);
  const [statusHistory,   setStatusHistory]   = useState<StatusHistory[]>([]);
  const [comments,        setComments]        = useState<Comment[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [userParticipation, setUserParticipation] = useState<Participant | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab,        setActiveTab]       = useState<TabId>('info');
  const [commentText,      setCommentText]     = useState('');
  const [sendingComment,   setSendingComment]  = useState(false);
  const [registering,      setRegistering]     = useState(false);

  // Transition modal
  const [showModal,           setShowModal]           = useState(false);
  const [pendingTo,           setPendingTo]           = useState<OutingStatus | null>(null);
  const [pendingLabel,        setPendingLabel]        = useState('');
  const [pendingRequiresReason, setPendingRequiresReason] = useState(false);
  const [transitionReason,    setTransitionReason]    = useState('');
  const [applyingTransition,  setApplyingTransition]  = useState(false);

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchOuting = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('group_outings')
      .select(`
        *,
        organizer:profiles!group_outings_organizer_id_fkey(full_name, avatar_url),
        photos:outing_photos(url, display_order, is_cover)
      `)
      .eq('id', outingId)
      .single();

    if (error || !data) {
      toast.error('Sortie introuvable');
      router.push('/promenades?tab=agenda');
      return;
    }

    if (data.photos) {
      data.photos.sort(
        (a: OutingPhoto, b: OutingPhoto) => a.display_order - b.display_order,
      );
    }
    setOuting(data as Outing);
    setLoading(false);
  }, [outingId, supabase, router]);

  const fetchParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('outing_participants')
      .select('*, profile:profiles!outing_participants_user_id_fkey(full_name, avatar_url)')
      .eq('outing_id', outingId)
      .neq('status', 'annule')
      .order('joined_at', { ascending: true });
    const list = (data || []) as Participant[];
    setParticipants(list);
    if (profile) {
      setUserParticipation(list.find(p => p.user_id === profile.id) || null);
    }
  }, [outingId, profile, supabase]);

  const fetchStatusHistory = useCallback(async () => {
    const { data } = await supabase
      .from('outing_status_history')
      .select('*, changed_by_profile:profiles(full_name)')
      .eq('outing_id', outingId)
      .order('created_at', { ascending: false })
      .limit(20);
    setStatusHistory((data || []) as StatusHistory[]);
  }, [outingId, supabase]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('outing_comments')
      .select('*, author:profiles!outing_comments_author_id_fkey(full_name, avatar_url)')
      .eq('outing_id', outingId)
      .order('created_at', { ascending: true })
      .limit(50);
    setComments((data || []) as Comment[]);
  }, [outingId, supabase]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { fetchOuting(); }, [fetchOuting]);
  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);
  useEffect(() => {
    if (activeTab === 'historique') fetchStatusHistory();
  }, [activeTab, fetchStatusHistory]);
  useEffect(() => {
    if (activeTab === 'discussion') fetchComments();
  }, [activeTab, fetchComments]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!profile) {
      toast.error('Connectez-vous pour vous inscrire');
      router.push('/connexion');
      return;
    }
    if (!outing) return;
    setRegistering(true);

    if (userParticipation) {
      const { error } = await supabase
        .from('outing_participants')
        .update({ status: 'annule', cancelled_at: new Date().toISOString() })
        .eq('id', userParticipation.id);
      if (error) toast.error("Erreur lors de l'annulation");
      else toast.success('Inscription annulée');
    } else {
      const frSt  = legacyToFrenchStatus(outing.status);
      const active = participants.filter(p => p.status !== 'annule').length;
      const { allowed, reason } = canRegister(frSt, active, outing.max_participants, outing.outing_date);
      if (!allowed) {
        toast.error(reason || 'Inscription impossible');
        setRegistering(false);
        return;
      }
      const { error } = await supabase
        .from('outing_participants')
        .insert({
          outing_id: outingId,
          user_id: profile.id,
          status: 'inscrit',
          joined_at: new Date().toISOString(),
        });
      if (error) {
        if (error.code === '23505') toast.error('Vous êtes déjà inscrit(e)');
        else toast.error("Erreur lors de l'inscription");
      } else {
        toast.success("🥾 Inscription confirmée ! L'organisateur vous contactera.", { duration: 4000 });
      }
    }

    await fetchParticipants();
    await fetchOuting();
    setRegistering(false);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !profile || sendingComment) return;
    setSendingComment(true);
    const { error } = await supabase.from('outing_comments').insert({
      outing_id: outingId,
      author_id: profile.id,
      content: commentText.trim(),
    });
    if (!error) {
      setCommentText('');
      fetchComments();
    }
    setSendingComment(false);
  };

  const openTransitionModal = (to: OutingStatus, label: string, requiresReason = false) => {
    setPendingTo(to);
    setPendingLabel(label);
    setPendingRequiresReason(requiresReason);
    setTransitionReason('');
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const applyTransition = async () => {
    if (!outing || !pendingTo || !profile) return;
    if (pendingRequiresReason && !transitionReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }
    setApplyingTransition(true);

    const updateData: Record<string, unknown> = {
      status: pendingTo,
      updated_at: new Date().toISOString(),
    };
    if (pendingTo === 'archivee') updateData.archived_at = new Date().toISOString();
    if (pendingTo === 'ouverte')  updateData.is_registration_open = true;
    if (['annulee', 'terminee', 'archivee'].includes(pendingTo)) {
      updateData.is_registration_open = false;
    }

    const { error } = await supabase
      .from('group_outings')
      .update(updateData)
      .eq('id', outingId);

    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      await supabase
        .from('outing_status_history')
        .insert({
          outing_id: outingId,
          old_status: outing.status,
          new_status: pendingTo,
          changed_by: profile.id,
          reason: transitionReason.trim() || null,
        })
        .then(() => {});

      const cfg = OUTING_STATUS_CONFIG[pendingTo];
      toast.success(`${cfg.icon} Statut : ${cfg.label}`);
      setShowModal(false);
      await fetchOuting();
      await fetchStatusHistory();
    }
    setApplyingTransition(false);
  };

  // ⚠️ Appelé APRÈS confirmation dans l'UI (pas de confirm() bloquant).
  // La valeur active (nb participants) doit être transmise par l'UI pour afficher
  // un message adapté dans le dialog de confirmation.
  const handleDeleteOuting = async () => {
    const { error } = await supabase.from('group_outings').delete().eq('id', outingId);
    if (error) toast.error('Erreur lors de la suppression');
    else {
      toast.success('Sortie supprimée');
      router.push('/promenades?tab=agenda');
    }
  };

  /** Nombre de participants actifs — utilisé par l'UI pour le message de confirmation. */
  const activeParticipantsCount = participants.filter(p => p.status !== 'annule').length;

  // ── Computed ──────────────────────────────────────────────────────────────
  const isOrganizer = profile?.id === outing?.organizer_id;
  const isAdmin     = profile?.role === 'admin' || profile?.role === 'moderator';
  const canManage   = isOrganizer || isAdmin;

  const activeParticipants = participants.filter(p => p.status !== 'annule');

  const frenchStatus: OutingStatus = outing
    ? computeDisplayStatus(
        legacyToFrenchStatus(outing.status),
        activeParticipants.length,
        outing.max_participants,
        outing.outing_date,
      )
    : 'ouverte';

  const availableTransitions = canManage
    ? OUTING_TRANSITIONS.filter(t => t.from === frenchStatus)
    : [];

  const fillPct = outing
    ? Math.round((activeParticipants.length / outing.max_participants) * 100)
    : 0;

  const coverPhoto =
    outing?.photos?.find(p => p.is_cover)?.url ||
    outing?.photos?.[0]?.url ||
    outing?.cover_photo_url ||
    undefined;

  const dateLabel = outing
    ? new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return {
    // Data
    outing,
    participants,
    statusHistory,
    comments,
    loading,
    userParticipation,
    // Computed
    isOrganizer,
    isAdmin,
    canManage,
    activeParticipants,
    frenchStatus,
    availableTransitions,
    fillPct,
    coverPhoto,
    dateLabel,
    // Tab
    activeTab,
    setActiveTab,
    // Comment
    commentText,
    setCommentText,
    sendingComment,
    handleSendComment,
    // Registration
    registering,
    handleRegister,
    // Deletion
    handleDeleteOuting,
    activeParticipantsCount,
    // Refresh
    fetchOuting,
    // Transition modal
    showModal,
    pendingTo,
    pendingLabel,
    pendingRequiresReason,
    transitionReason,
    setTransitionReason,
    applyingTransition,
    openTransitionModal,
    closeModal,
    applyTransition,
  };
}
