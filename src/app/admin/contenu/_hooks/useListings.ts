import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ContentListing } from '../_types';

export function useListings() {
  const [items, setItems]           = useState<ContentListing[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('listings')
      .select(`
        id, title, description, status, condition, is_free, price, created_at, updated_at,
        owner:profiles!listings_owner_id_fkey(id, full_name, email, avatar_url),
        category:listing_categories(name, icon)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as unknown as ContentListing[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.filter(l => l.id !== id));
    toast.success('Annonce supprimée');
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    const supabase = createClient();
    const { error } = await supabase.from('listings').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    toast.success(newStatus === 'active' ? 'Annonce réactivée' : 'Annonce désactivée');
  };

  const filtered = items.filter(l =>
    (!statusFilter || l.status === statusFilter) &&
    (!search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.owner?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.owner?.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return {
    items: filtered,
    loading,
    search, setSearch,
    statusFilter, setStatusFilter,
    fetchListings,
    deleteItem,
    toggleStatus,
  };
}
