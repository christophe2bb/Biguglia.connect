'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { toPhotoItems } from '@/components/ui/photo-utils';
import { safeStoragePath } from '@/lib/upload-utils';
import toast from 'react-hot-toast';
import { Listing } from '@/types';
import type { ExtListing, ShareMethod, AuthorProfile } from '../_types';

const LS_KEY = 'annonces_favorites';

// ── localStorage helpers (fallback non connecté) ─────────────────────────────
function lsRead(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function lsWrite(ids: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export type UseAnnonceDetailReturn = {
  listing: ExtListing | null;
  similar: Listing[];
  photos: ReturnType<typeof toPhotoItems>;
  loading: boolean;
  notFound: boolean;
  deleting: boolean;
  currentStatus: string;
  isSaved: boolean;
  showSharePanel: boolean;
  // Dialog suppression (remplace confirm() bloquant)
  confirmDeleteOpen: boolean;
  openDeleteConfirm: () => void;
  closeDeleteConfirm: () => void;
  toggleSave: () => void;
  setShowSharePanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  handleShare: (method: ShareMethod) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleStatusChange: (newStatus: string) => Promise<void>;
};

export function useAnnonceDetail(id: string): UseAnnonceDetailReturn {
  const router = useRouter();
  // Stable Supabase client — une seule instance au montage
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  // userId depuis Zustand (mémoire, 0ms — pas d'appel réseau dans les handlers)
  const { userId } = useAuthStore();

  const [listing,           setListing]           = useState<ExtListing | null>(null);
  const [similar,           setSimilar]           = useState<Listing[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [notFound,          setNotFound]          = useState(false);
  const [deleting,          setDeleting]          = useState(false);
  const [currentStatus,     setCurrentStatus]     = useState<string>('active');
  const [isSaved,           setIsSaved]           = useState(false);
  const [showSharePanel,    setShowSharePanel]    = useState(false);
  // État du dialog de confirmation suppression (remplace window.confirm())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const openDeleteConfirm  = useCallback(() => setConfirmDeleteOpen(true),  []);
  const closeDeleteConfirm = useCallback(() => setConfirmDeleteOpen(false), []);

  // ── Load saved state — Supabase si connecté, localStorage sinon ────────────
  useEffect(() => {
    if (!id) return;
    if (userId) {
      // Connecté : vérifier en base
      supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('target_id', id)
        .eq('target_type', 'listing')
        .maybeSingle()
        .then(({ data }) => setIsSaved(!!data));
    } else {
      // Non connecté : localStorage
      setIsSaved(lsRead().includes(id));
    }
  }, [id, userId, supabase]);

  // ── Fetch listing + author + similar ────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, category:listing_categories(*), photos:listing_photos(id, url, display_order)')
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch author profile
      let userData: AuthorProfile | null = null;
      if (data.user_id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, created_at, role')
          .eq('id', data.user_id)
          .single();
        userData = userProfile;
      }

      // Sort photos by display_order
      if (data.photos) {
        data.photos.sort(
          (a: { display_order: number }, b: { display_order: number }) =>
            a.display_order - b.display_order,
        );
      }

      const enriched = { ...data, user: userData } as unknown as ExtListing;
      setListing(enriched);
      setCurrentStatus((enriched.status as string) || 'active');
      setLoading(false);

      // Fetch similar listings (same category, active, different id)
      if (data.category_id) {
        const { data: simData } = await supabase
          .from('listings')
          .select('*, category:listing_categories(*), photos:listing_photos(url)')
          .eq('category_id', data.category_id)
          .eq('status', 'active')
          .neq('id', id)
          .limit(3)
          .order('created_at', { ascending: false });
        setSimilar((simData as Listing[]) || []);
      }

      // Increment view counter (fire-and-forget)
      if (data.views_count !== undefined) {
        supabase
          .from('listings')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', id)
          .then(() => { /* ignore */ });
      }
    })();
  }, [id, supabase]);

  // ── toggleSave — Supabase si connecté, localStorage sinon ──────────────────
  const toggleSave = useCallback(() => {
    if (!id) return;
    setIsSaved(prev => {
      const next = !prev;
      toast(next ? 'Annonce sauvegardée en favoris !' : 'Retirée des favoris', {
        icon: next ? '❤️' : '💔',
      });
      if (userId) {
        // Connecté → Supabase (fire-and-forget)
        if (next) {
          supabase.from('user_favorites').insert({
            user_id: userId, target_id: id, target_type: 'listing',
          }).then(() => { /* ignore */ });
        } else {
          supabase.from('user_favorites').delete()
            .eq('user_id', userId).eq('target_id', id).eq('target_type', 'listing')
            .then(() => { /* ignore */ });
        }
      } else {
        // Non connecté → localStorage
        const list = lsRead();
        lsWrite(next ? [...list, id] : list.filter(s => s !== id));
      }
      return next;
    });
  }, [id, userId, supabase]);

  // ── handleDelete ─────────────────────────────────────────────────────────────
  // ⚠️ Appelé APRÈS confirmation dans le dialog React (pas de confirm() bloquant ici).
  // Utilise userId depuis Zustand (0ms) — pas de getSession() dans le handler.
  const handleDelete = useCallback(async () => {
    if (!listing) return;

    // Vérification auth depuis Zustand (mémoire, synchrone)
    if (!userId) {
      toast.error('Connectez-vous pour supprimer cette annonce.');
      router.push('/connexion');
      return;
    }

    setDeleting(true);
    setConfirmDeleteOpen(false);

    // ── Diagnostic : log userId vs listing.user_id ──────────────────────────
    console.log('[handleDelete] START', {
      listingId: listing.id,
      listingUserId: listing.user_id,
      zustandUserId: userId,
      match: listing.user_id === userId,
    });

    // 1. Supprimer les photos du storage (ne pas bloquer sur erreur)
    const photos = listing.photos as Array<{ id: string; url: string }> | undefined;
    if (photos?.length) {
      const paths = photos
        .map(p => safeStoragePath(p.url, 'photos'))
        .filter(Boolean) as string[];
      if (paths.length) {
        const { error: storageErr } = await supabase.storage.from('photos').remove(paths); // nosec
        if (storageErr) console.warn('[handleDelete] storage remove error:', storageErr);
      }
      await supabase.from('listing_photos').delete().eq('listing_id', listing.id);
    }

    // 2. Supprimer l'annonce — eq('id') UNIQUEMENT, la RLS se charge du user_id
    // Ne pas ajouter eq('user_id') : si la RLS est misconfigurée elle retourne
    // 0 lignes même pour le propriétaire. On laisse la RLS faire son travail.
    const { data: deleted, error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listing.id)
      .select('id');

    console.log('[handleDelete] DELETE result:', {
      deleted,
      error,
      deletedCount: deleted?.length ?? 0,
    });

    if (error) {
      console.error('[handleDelete] Supabase error:', error);
      toast.error(`Erreur : ${error.message}`, { duration: 8000 });
      setDeleting(false);
      return;
    }

    if (!deleted || deleted.length === 0) {
      // RLS a bloqué. Afficher un toast avec les infos de debug.
      const msg = `Suppression bloquée (RLS). userId=${userId?.slice(0,8)} listingUser=${listing.user_id?.slice(0,8)}`;
      console.error('[handleDelete] RLS block:', msg);
      toast.error('Suppression bloquée — politique de sécurité. Vérifiez la console.', { duration: 8000 });
      setDeleting(false);
      return;
    }

    toast.success('Annonce supprimée ✅');
    router.replace('/annonces');
    router.refresh();
  }, [listing, userId, router, supabase]);

  // ── handleStatusChange ───────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!listing) return;
    const { error } = await supabase
      .from('listings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', listing.id);
    if (error) throw error;
    setCurrentStatus(newStatus);
    setListing(prev => prev ? { ...prev, status: newStatus as ExtListing['status'] } : prev);
  }, [listing, supabase]);

  // ── handleShare ──────────────────────────────────────────────────────────────
  const handleShare = useCallback(async (method: ShareMethod) => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''; // nosec — read-only current URL
    if (method === 'native' && navigator.share) {
      await navigator.share({ title: listing?.title, url: shareUrl });
      return;
    }
    if (method === 'sms') {
      window.open(`sms:?body=${encodeURIComponent(`${listing?.title} — ${shareUrl}`)}`);
      return;
    }
    if (method === 'email') {
      window.open(
        `mailto:?subject=${encodeURIComponent(listing?.title || 'Annonce')}&body=${encodeURIComponent(
          `Bonjour,\n\nJe t'envoie cette annonce sur Biguglia Connect :\n${listing?.title}\n${shareUrl}`,
        )}`,
      );
      return;
    }
    // copy
    navigator.clipboard.writeText(shareUrl);
    toast.success('Lien copié !');
    setShowSharePanel(false);
  }, [listing]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const rawPhotos = listing?.photos as Array<{ id: string; url: string; display_order: number }> | undefined;
  const photos = toPhotoItems(rawPhotos);

  return {
    listing, similar, photos,
    loading, notFound, deleting,
    currentStatus,
    isSaved, showSharePanel,
    confirmDeleteOpen, openDeleteConfirm, closeDeleteConfirm,
    toggleSave, setShowSharePanel,
    handleShare, handleDelete, handleStatusChange,
  };
}
