'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { TYPE_CONFIG } from '../_constants';
import type { HelpRequest, HelpComment, HelpParticipant, UseHelpDetailReturn } from './_types';

export function useHelpRequestDetail(initialItem: HelpRequest): UseHelpDetailReturn {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  // Initialisé avec les données serveur (évite le double-fetch)
  const [item, setItem] = useState<HelpRequest | null>(initialItem);
  const [loading, setLoading] = useState(false); // déjà chargé côté serveur
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState<HelpComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const [participants, setParticipants] = useState<HelpParticipant[]>([]);
  const [loadingPart, setLoadingPart] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [helping, setHelping] = useState(false);
  const [alreadyHelping, setAlreadyHelping] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Load saved state + click-outside handler
  useEffect(() => {
    try {
      const raw = localStorage.getItem('biguglia_saved_help');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setIsSaved(ids.includes(id));
    } catch { /* noop */ }
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [id]);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('help_requests')
      .select(`*, author:profiles(full_name, avatar_url, created_at), photos:help_photos(url, display_order, caption)`)
      .eq('id', id)
      .single();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setItem(data as HelpRequest);
    setLoading(false);
  }, [id, supabase]);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    const { data } = await supabase.from('help_comments')
      .select('id, content, created_at, author:profiles(id, full_name, avatar_url)')
      .eq('help_id', id).order('created_at', { ascending: true }).limit(100);
    setComments((data ?? []) as HelpComment[]);
    setLoadingComments(false);
  }, [id, supabase]);

  const fetchParticipants = useCallback(async () => {
    setLoadingPart(true);
    const { data } = await supabase.from('help_request_participants')
      .select('id, user_id, role, state, message, created_at, user:profiles(full_name, avatar_url)')
      .eq('help_request_id', id).order('created_at', { ascending: true });
    setParticipants((data ?? []) as HelpParticipant[]);
    if (profile) {
      const mine = (data ?? []).find((p: { user_id: string }) => p.user_id === profile.id);
      setAlreadyHelping(!!mine);
    }
    setLoadingPart(false);
  }, [id, supabase, profile]);

  // Charge les données dynamiques (commentaires, participants) au montage
  useEffect(() => {
    fetchComments();
    fetchParticipants();
  }, [fetchComments, fetchParticipants]);

  const handleSendComment = async () => {
    if (!commentText.trim() || !profile || sendingComment) return;
    setSendingComment(true);
    const { error } = await supabase.from('help_comments').insert({
      help_id: id, author_id: profile.id, content: commentText.trim(),
    });
    if (error) toast.error('Erreur : ' + error.message);
    else { setCommentText(''); fetchComments(); }
    setSendingComment(false);
  };

  const handleCanHelp = async () => {
    if (!profile) { toast.error('Connectez-vous'); router.push('/connexion'); return; }
    if (alreadyHelping) { toast('Vous avez déjà proposé votre aide !', { icon: '✅' }); return; }
    setHelping(true);
    const { error } = await supabase.from('help_request_participants').upsert(
      { help_request_id: id, user_id: profile.id, role: 'helper', state: 'pending' },
      { onConflict: 'help_request_id,user_id' }
    );
    if (error && !error.message.includes('duplicate')) toast.error('Erreur : ' + error.message);
    else {
      toast.success('✅ Votre aide a été proposée !', { duration: 4000 });
      setAlreadyHelping(true);
      fetchParticipants();
    }
    setHelping(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!item) return;
    const { error } = await supabase.from('help_requests').update({
      status: newStatus,
      ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
    }).eq('id', id);
    if (error) toast.error('Erreur statut : ' + error.message);
    else { toast.success('Statut mis à jour'); fetchItem(); }
  };

  const handleAcceptParticipant = async (participantId: string) => {
    await supabase.from('help_request_participants').update({ state: 'accepted' }).eq('id', participantId);
    fetchParticipants();
    toast.success('Helper accepté !');
  };

  const handleDeclineParticipant = async (participantId: string) => {
    await supabase.from('help_request_participants').update({ state: 'declined' }).eq('id', participantId);
    fetchParticipants();
  };

  const toggleSave = () => {
    try {
      const raw = localStorage.getItem('biguglia_saved_help');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      const next = isSaved ? ids.filter(x => x !== id) : [...ids, id];
      localStorage.setItem('biguglia_saved_help', JSON.stringify(next));
      setIsSaved(!isSaved);
      toast(isSaved ? 'Retiré des favoris' : '⭐ Ajouté aux favoris', { icon: isSaved ? '🔖' : '⭐' });
    } catch { /* noop */ }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = item
    ? encodeURIComponent(`${TYPE_CONFIG[item.help_type]?.emoji ?? ''} ${item.title}\n${shareUrl}`)
    : '';

  const isAuthor  = profile?.id === item?.author_id;
  const isActive  = item?.status === 'active';
  const isResolved = item?.status === 'resolved';

  return {
    item, loading, notFound,
    comments, loadingComments, commentText, setCommentText, sendingComment,
    participants, loadingPart,
    isSaved, helping, alreadyHelping,
    openShare, setOpenShare, shareRef,
    lightboxOpen, setLightboxOpen, lightboxIdx, setLightboxIdx,
    handleSendComment, handleCanHelp, handleStatusChange,
    handleAcceptParticipant, handleDeclineParticipant, toggleSave,
    shareUrl, shareText,
    isAuthor, isActive, isResolved,
  };
}
