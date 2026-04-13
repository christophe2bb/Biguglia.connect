import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ContentReview } from '../_types';

export function useReviews() {
  const [items, setItems]               = useState<ContentReview[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

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

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
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
