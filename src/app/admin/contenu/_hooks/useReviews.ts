/**
 * Hook — useReviews
 *
 * Mutations : routées via l'API serveur /api/admin/contenu/reviews/[id]
 *   • DELETE : suppression
 *
 * Avant ce correctif, deleteItem appelait directement
 * createClient().from('reviews').delete() côté navigateur.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ContentReview } from '../_types';

export function useReviews() {
  const [items, setItems]               = useState<ContentReview[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  // ── Lecture ──────────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, email, avatar_url),
        artisan:artisan_profiles!reviews_artisan_id_fkey(id, business_name)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as unknown as ContentReview[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // ── Suppression via API serveur ──────────────────────────────────────────
  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/admin/contenu/reviews/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setItems(prev => prev.filter(r => r.id !== id));
    toast.success('Avis supprimé');
  };

  const filtered = items.filter(r =>
    (!ratingFilter || r.rating === parseInt(ratingFilter)) &&
    (!search ||
      r.comment?.toLowerCase().includes(search.toLowerCase()) ||
      r.reviewer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.artisan?.business_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return {
    items: filtered,
    loading,
    search, setSearch,
    ratingFilter, setRatingFilter,
    fetchReviews,
    deleteItem,
  };
}
