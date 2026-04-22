'use client';

/**
 * Hook: useCollectionItemDetail
 * Centralise état, chargement, favoris, changement de statut, suppression et partage
 * pour la page /collectionneurs/[id].
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import {
  STATUS_CONFIG,
  type CollectionItem,
  type CollectionMode,
  type CollectionStatus,
  type ConditionLevel,
} from '@/lib/collectionneurs-config';
import { getAllowedTransitions } from '../_config';
import type { SortedPhoto } from '../_types';

/* ── Type de retour ──────────────────────────────────────────────────────── */
export interface UseCollectionItemDetailReturn {
  item: CollectionItem | null;
  sortedPhotos: SortedPhoto[];
  similar: CollectionItem[];
  loading: boolean;
  notFound: boolean;
  isFav: boolean;
  favLoading: boolean;
  changingStatus: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isClosed: boolean;
  allowedTransitions: CollectionStatus[];
  handleFav: () => Promise<void>;
  handleStatusChange: (newStatus: CollectionStatus) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleShare: () => void;
}

export function useCollectionItemDetail(): UseCollectionItemDetailReturn {
  const { id }      = useParams();
  const router      = useRouter();
  const { profile } = useAuthStore();
  const supabase    = useMemo(() => createClient(), []);

  const [item,           setItem]           = useState<CollectionItem | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [notFound,       setNotFound]       = useState(false);
  const [isFav,          setIsFav]          = useState(false);
  const [favLoading,     setFavLoading]     = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [similar,        setSimilar]        = useState<CollectionItem[]>([]);

  /* ── Derived booleans ────────────────────────────────────────────────── */
  const isOwner  = profile?.id === item?.author_id;
  const isAdmin  = profile?.role === 'admin' || profile?.role === 'moderator';
  const isClosed = item ? (STATUS_CONFIG[item.status]?.closed ?? false) : false;
  const allowedTransitions = isOwner && item
    ? getAllowedTransitions(item.mode, item.status)
    : [];

  /* ── Sorted photos ───────────────────────────────────────────────────── */
  const sortedPhotos: SortedPhoto[] = item
    ? (item.photos || [])
        .map(p => ({ ...p, url: p.url || p.image_url || p.preview || '' }))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];

  /* ── Fetch item + similar ────────────────────────────────────────────── */
  const fetchItem = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collection_items')
        .select(`
          id, title, description, category_id, mode, item_type, status, price,
          exchange_expected, condition, rarity_level, year_period, brand, series_name,
          authenticity_declared, provenance, defects_noted, dimensions, material,
          shipping_available, local_meetup_available, city, postal_code,
          tags, author_id, views_count, favorites_count, messages_count, is_featured,
          published_at, created_at, updated_at,
          author:profiles!collection_items_author_id_fkey(id, full_name, avatar_url, created_at),
          category:collection_categories(id, name, slug, icon, color),
          photos:collection_item_photos(url, is_cover, sort_order)
        `)
        .eq('id', id as string)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      // Normalise mode (fallback via item_type for legacy rows)
      const mapped = {
        ...(data as unknown as CollectionItem),
        mode: ((data as Record<string, unknown>).mode ||
               ((data as Record<string, unknown>).item_type === 'troc' ? 'echange' :
                (data as Record<string, unknown>).item_type)) as CollectionMode || 'vente',
        photos: ((data as Record<string, unknown>).photos as CollectionItem['photos'] || [])
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      };
      setItem(mapped);

      // Enregistrer la vue (fire-and-forget)
      if (profile?.id && profile.id !== (data as Record<string, unknown>).author_id) {
        supabase.from('collection_views')
          .insert({ item_id: id, viewer_id: profile.id })
          .then(() => {});
      }

      // Vérifier si favori
      if (profile?.id) {
        const { data: fav } = await supabase
          .from('collection_favorites')
          .select('id')
          .eq('user_id', profile.id)
          .eq('item_id', id)
          .maybeSingle();
        setIsFav(!!fav);
      }

      // Annonces similaires
      const { data: sim } = await supabase
        .from('collection_items')
        .select(`id, title, price, mode, item_type, status, condition, author_id, created_at,
                 photos:collection_item_photos(url, is_cover)`)
        .eq('status', 'actif')
        .eq('category_id', (data as Record<string, unknown>).category_id as string)
        .neq('id', id as string)
        .limit(4);

      setSimilar(
        (sim || []).map((s: Record<string, unknown>) => ({
          ...(s as unknown as CollectionItem),
          mode:      ((s.mode || (s.item_type === 'troc' ? 'echange' : s.item_type)) as CollectionMode) || 'vente',
          status:    (s.status as CollectionStatus) || 'actif',
          condition: (s.condition as ConditionLevel) || 'bon',
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [id, profile?.id, supabase]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  /* ── Favori ──────────────────────────────────────────────────────────── */
  const handleFav = async () => {
    if (!profile?.id) {
      router.push(`/connexion?redirect=/collectionneurs/${id}`);
      return;
    }
    setFavLoading(true);
    try {
      if (isFav) {
        await supabase.from('collection_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('item_id', id as string);
        setIsFav(false);
        toast.success('Retiré des favoris');
      } else {
        await supabase.from('collection_favorites')
          .insert({ user_id: profile.id, item_id: id });
        setIsFav(true);
        toast.success('Ajouté aux favoris ❤️');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setFavLoading(false);
    }
  };

  /* ── Changement de statut ────────────────────────────────────────────── */
  const handleStatusChange = async (newStatus: CollectionStatus) => {
    if (!item) return;
    setChangingStatus(true);
    try {
      const { error } = await supabase
        .from('collection_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      setItem(prev => prev ? { ...prev, status: newStatus } : prev);
      toast.success(`Statut mis à jour : ${STATUS_CONFIG[newStatus]?.label}`);
    } catch {
      toast.error('Erreur lors du changement de statut');
    } finally {
      setChangingStatus(false);
    }
  };

  /* ── Suppression ─────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!item || !confirm('Supprimer définitivement cette annonce ?')) return;
    const { error } = await supabase.from('collection_items').delete().eq('id', item.id);
    if (error) { toast.error('Erreur lors de la suppression'); return; }
    toast.success('Annonce supprimée');
    router.push('/collectionneurs');
  };

  /* ── Partage ─────────────────────────────────────────────────────────── */
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: item?.title, url: window.location.href }) // nosec — read-only current URL;
    } else {
      navigator.clipboard.writeText(window.location.href); // nosec — read-only current URL
      toast.success('Lien copié !');
    }
  };

  return {
    item, sortedPhotos, similar,
    loading, notFound,
    isFav, favLoading, changingStatus,
    isOwner, isAdmin, isClosed,
    allowedTransitions,
    handleFav, handleStatusChange, handleDelete, handleShare,
  };
}
