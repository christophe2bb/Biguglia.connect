'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toPhotoItems } from '@/components/ui/photo-utils';
import toast from 'react-hot-toast';
import { normalizeStatus, normalizeType, STATUS_CONFIG } from '../_config';
import type { LFItem, LFComment, LFStatusHistory, LFStatus, ShareMode } from '../_types';

export type UseLFDetailReturn = {
  item: LFItem | null;
  comments: LFComment[];
  history: LFStatusHistory[];
  allPhotos: ReturnType<typeof toPhotoItems>;
  loading: boolean;
  notFound: boolean;
  lightboxOpen: boolean;
  lightboxIdx: number;
  showHistory: boolean;
  chatText: string;
  sending: boolean;
  transitioning: boolean;
  openLightbox: (idx: number) => void;
  closeLightbox: () => void;
  setShowHistory: (v: boolean | ((p: boolean) => boolean)) => void;
  setChatText: (v: string) => void;
  handleStatusChange: (newStatus: LFStatus) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleSendComment: (profileId?: string) => Promise<void>;
  handleShare: (mode: ShareMode) => void;
  handlePrint: () => void;
};

export function useLFDetail(id: string, initialItem?: LFItem): UseLFDetailReturn {
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Initialisé avec les données serveur si disponibles (évite le double-fetch)
  const [item,          setItem]          = useState<LFItem | null>(initialItem ?? null);
  const [comments,      setComments]      = useState<LFComment[]>([]);
  const [history,       setHistory]       = useState<LFStatusHistory[]>([]);
  const [loading,       setLoading]       = useState(!initialItem); // pas de loading si données serveur fournies
  const [notFound,      setNotFound]      = useState(false);
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [lightboxIdx,   setLightboxIdx]   = useState(0);
  const [showHistory,   setShowHistory]   = useState(false);
  const [chatText,      setChatText]      = useState('');
  const [sending,       setSending]       = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // ── fetchItem ──────────────────────────────────────────────────────────────
  const fetchItem = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    // Attempt 1 – with explicit FK
    let { data, error } = await supabase
      .from('lost_found_items')
      .select('*, author:profiles!lost_found_items_author_id_fkey(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover, visibility_type)')
      .eq('id', id)
      .single();

    // Attempt 2 – without explicit FK (different FK name)
    if ((error || !data) && error?.message?.includes('fkey')) {
      ({ data, error } = await supabase
        .from('lost_found_items')
        .select('*, author:profiles(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover, visibility_type)')
        .eq('id', id)
        .single());
    }

    // Attempt 3 – base table only
    if (error || !data) {
      ({ data, error } = await supabase
        .from('lost_found_items')
        .select('*')
        .eq('id', id)
        .single());
    }

    if (error || !data) { setNotFound(true); setLoading(false); return; }

    const enriched: LFItem = {
      ...data,
      status: normalizeStatus(data.status),
      type:   normalizeType(data.type),
      photos: (data.photos ?? []).sort(
        (a: { display_order?: number }, b: { display_order?: number }) =>
          (a.display_order ?? 0) - (b.display_order ?? 0),
      ),
    };
    setItem(enriched);

    // Fetch comments
    const { data: cData } = await supabase
      .from('lf_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('item_id', id)
      .order('created_at', { ascending: true })
      .limit(100);
    setComments((cData ?? []) as LFComment[]);

    // Fetch status history (silent if table absent)
    try {
      const { data: hData } = await supabase
        .from('lf_status_history')
        .select('id, old_status, new_status, changed_by, reason, created_at, changer:profiles!lf_status_history_changed_by_fkey(full_name)')
        .eq('item_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory((hData ?? []) as LFStatusHistory[]);
    } catch { /* ignore */ }

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  // ── handleStatusChange ────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (newStatus: LFStatus) => {
    if (!item) return;
    const cfg = STATUS_CONFIG[newStatus];
    // ⚠️ Appelé APRÈS confirmation dans l'UI (pas de confirm() bloquant).

    setTransitioning(true);
    const now = new Date().toISOString();
    const updates: Record<string, string | null> = { status: newStatus, updated_at: now };
    if (newStatus === 'restitue') updates.restitution_confirmed_at = now;
    if (newStatus === 'clos')    updates.closed_at   = now;
    if (newStatus === 'archive') updates.archived_at = now;

    await supabase.from('lost_found_items').update(updates).eq('id', item.id);

    try {
      await supabase.from('lf_status_history').insert({
        item_id: item.id, old_status: item.status, new_status: newStatus,
      });
    } catch { /* ignore */ }

    toast.success(`${cfg.icon} Statut mis à jour : ${cfg.label}`);
    setTransitioning(false);
    fetchItem();
  }, [item, supabase, fetchItem]);

  // ── handleDelete (archive) ────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    // ⚠️ Appelé APRÈS confirmation dans l'UI (pas de confirm() bloquant).
    if (!item) return;
    await supabase.from('lost_found_items').update({
      status: 'archive',
      archived_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    }).eq('id', item.id);
    toast.success('📦 Annonce archivée');
    router.push('/perdu-trouve');
  }, [item, supabase, router]);

  // ── handleSendComment ─────────────────────────────────────────────────────
  const handleSendComment = useCallback(async (profileId?: string) => {
    if (!item || !chatText.trim() || !profileId || sending) return;
    setSending(true);
    await supabase.from('lf_comments').insert({
      item_id: item.id, author_id: profileId, content: chatText.trim(),
    });
    setChatText('');
    await fetchItem();
    setSending(false);
  }, [item, chatText, sending, supabase, fetchItem]);

  // ── handleShare ───────────────────────────────────────────────────────────
  const handleShare = useCallback((mode: ShareMode) => {
    if (!item) return;
    const url  = `${window.location.origin}/perdu-trouve/${item.id}`; // nosec — read-only origin, path constructed from DB id (UUID), no user input in URL
    const text = `${item.type === 'perdu' ? '🔴 Objet perdu' : '🟢 Objet trouvé'} : ${item.title} — ${item.location_area}\n${url}`;
    if (mode === 'sms')        window.open(`sms:?body=${encodeURIComponent(text)}`, '_self');
    else if (mode === 'email') window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(text)}`, '_self');
    else { navigator.clipboard.writeText(url); toast.success('Lien copié !'); }
  }, [item]);

  const handlePrint = () => window.print();

  // ── Lightbox helpers ──────────────────────────────────────────────────────
  const openLightbox  = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const allPhotos = toPhotoItems(item?.photos ?? []);

  return {
    item, comments, history, allPhotos,
    loading, notFound,
    lightboxOpen, lightboxIdx,
    showHistory, chatText, sending, transitioning,
    openLightbox, closeLightbox,
    setShowHistory, setChatText,
    handleStatusChange, handleDelete,
    handleSendComment: (profileId?: string) => handleSendComment(profileId),
    handleShare, handlePrint,
  };
}
