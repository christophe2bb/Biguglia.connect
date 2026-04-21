'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toPhotoItems } from '@/components/ui/photo-utils';
import toast from 'react-hot-toast';
import { Listing } from '@/types';
import type { ExtListing, ShareMethod, AuthorProfile } from '../_types';

const LS_KEY = 'annonces_favorites';

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
  toggleSave: () => void;
  setShowSharePanel: (v: boolean | ((prev: boolean) => boolean)) => void;
  handleShare: (method: ShareMethod) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleStatusChange: (newStatus: string) => Promise<void>;
};

export function useAnnonceDetail(id: string): UseAnnonceDetailReturn {
  const router  = useRouter();
  const supabase = createClient();

  const [listing,        setListing]        = useState<ExtListing | null>(null);
  const [similar,        setSimilar]        = useState<Listing[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [notFound,       setNotFound]       = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [currentStatus,  setCurrentStatus]  = useState<string>('active');
  const [isSaved,        setIsSaved]        = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  // ── Load saved state from localStorage ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    try {
      const list: string[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
      setIsSaved(list.includes(id));
    } catch { /* ignore */ }
  }, [id]);

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
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── toggleSave ───────────────────────────────────────────────────────────────
  const toggleSave = useCallback(() => {
    if (!id) return;
    setIsSaved(prev => {
      const next = !prev;
      try {
        const list: string[] = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        const updated = next ? [...list, id] : list.filter(s => s !== id);
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      toast(next ? 'Annonce sauvegardée en favoris !' : 'Retirée des favoris', {
        icon: next ? '❤️' : '💔',
      });
      return next;
    });
  }, [id]);

  // ── handleDelete ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!listing) return;
    if (!window.confirm('Supprimer définitivement cette annonce ? Cette action est irréversible.')) return;

    setDeleting(true);
    const photos = listing.photos as Array<{ id: string; url: string }> | undefined;
    if (photos?.length) {
      for (const photo of photos) {
        const parts = photo.url.split('/storage/v1/object/public/photos/');
        if (parts[1]) await supabase.storage.from('photos').remove([parts[1]]);
      }
      await supabase.from('listing_photos').delete().eq('listing_id', listing.id);
    }

    const { error } = await supabase.from('listings').delete().eq('id', listing.id);
    if (error) {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
      return;
    }

    toast.success('Annonce supprimée');
    router.push('/annonces');
  }, [listing, router, supabase]);

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
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
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
    toggleSave, setShowSharePanel,
    handleShare, handleDelete, handleStatusChange,
  };
}
