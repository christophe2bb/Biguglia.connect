/**
 * Hook — useReviews
 *
 * Lecture  : GET /api/admin/contenu/reviews (service-role, bypass RLS)
 * Mutations : routées via l'API serveur /api/admin/contenu/reviews/[id]
 *   • DELETE : suppression
 */

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import toast from 'react-hot-toast';
import type { ContentReview } from '../_types';

export function useReviews() {
  const [items, setItems]               = useState<ContentReview[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  // ── Lecture via API serveur ──────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/contenu/reviews');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error('Erreur chargement avis : ' + (body.error ?? res.statusText));
        return;
      }
      const { items: data } = await res.json() as { items: ContentReview[] };
      setItems(data ?? []);
    } catch (err) {
      toast.error('Erreur réseau : ' + String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // ── Suppression via API serveur ──────────────────────────────────────────
  const deleteItem = async (id: string) => {
    const res = await adminFetch(`/api/admin/contenu/reviews/${id}`, {
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
