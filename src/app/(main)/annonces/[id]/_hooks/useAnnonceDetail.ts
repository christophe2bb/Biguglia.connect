'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { toPhotoItems } from '@/components/ui/photo-utils';
import { useFavorites } from '../../_hooks/useFavorites';
import toast from 'react-hot-toast';
import { Listing } from '@/types';
import type { ExtListing, ShareMethod, AuthorProfile } from '../_types';

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
  const { savedIds, toggleSave: toggleFavorite } = useFavorites();

  const [listing,           setListing]           = useState<ExtListing | null>(null);
  const [similar,           setSimilar]           = useState<Listing[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [notFound,          setNotFound]          = useState(false);
  const [deleting,          setDeleting]          = useState(false);
  const [currentStatus,     setCurrentStatus]     = useState<string>('active');
  const isSaved = savedIds.has(id);
  const [showSharePanel,    setShowSharePanel]    = useState(false);
  // État du dialog de confirmation suppression (remplace window.confirm())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const openDeleteConfirm  = useCallback(() => setConfirmDeleteOpen(true),  []);
  const closeDeleteConfirm = useCallback(() => setConfirmDeleteOpen(false), []);

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
          .eq('moderation_status', 'publie')
          .neq('id', id)
          .limit(3)
          .order('created_at', { ascending: false });
        setSimilar((simData as Listing[]) || []);
      }

      // Le compteur de vues doit être incrémenté par un endpoint serveur dédié.
      // Un UPDATE direct depuis un visiteur contournerait les règles métier,
      // et échoue silencieusement sous RLS pour les non-propriétaires.
    })();
  }, [id, supabase]);

  // ── Favoris : utiliser le même flux vérifié que le catalogue ──────────────
  const toggleSave = useCallback(() => {
    void toggleFavorite(id);
  }, [id, toggleFavorite]);

  // ── Suppression sûre : API serveur dédiée ─────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!listing || deleting) return;
    if (!userId) {
      toast.error('Connectez-vous pour supprimer cette annonce.');
      router.push('/connexion');
      return;
    }
    if (userId !== listing.user_id) {
      toast.error('Seul le propriétaire peut supprimer cette annonce.');
      return;
    }

    setDeleting(true);
    setConfirmDeleteOpen(false);
    try {
      let token: string | undefined;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch { /* repli sur les cookies de session serveur */ }

      const response = await fetch(`/api/listings/${listing.id}/delete`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await response.json().catch(() => null) as {
        ok?: boolean; error?: string; cleanupWarning?: boolean;
      } | null;
      if (!response.ok || !body?.ok) {
        toast.error(body?.error || 'Suppression refusée. Réessayez.');
        return;
      }
      if (body.cleanupWarning) {
        toast('Annonce supprimée, nettoyage de certains fichiers à reprendre.', {
          icon: '⚠️', duration: 6000,
        });
      } else {
        toast.success('Annonce supprimée');
      }
      router.replace('/annonces');
      router.refresh();
    } catch {
      toast.error('Erreur réseau pendant la suppression. Réessayez.');
    } finally {
      setDeleting(false);
    }
  }, [listing, deleting, userId, router, supabase]);

  // ── handleStatusChange ───────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!listing) return;
    if (!userId || userId !== listing.user_id) throw new Error('Action réservée au propriétaire');
    const { data, error } = await supabase
      .from('listings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
      .eq('user_id', userId)
      .select('id, status')
      .maybeSingle();
    if (error || !data) throw new Error('Le changement de statut n’a pas été enregistré.');
    setCurrentStatus(newStatus);
    setListing(prev => prev ? { ...prev, status: newStatus as ExtListing['status'] } : prev);
  }, [listing, userId, supabase]);

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
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Lien copié !');
      setShowSharePanel(false);
    } catch {
      toast.error('Impossible de copier le lien. Vérifiez les autorisations du navigateur.');
    }
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
