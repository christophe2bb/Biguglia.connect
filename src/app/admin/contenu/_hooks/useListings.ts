/**
 * Hook — useListings
 *
 * Lecture  : GET  /api/admin/contenu/listings (via createClient + RLS admin)
 *
 * Mutations : routées via l'API serveur /api/admin/contenu/listings/[id]
 *   • DELETE  : suppression
 *   • PATCH   : changement de statut (active / inactive)
 *
 * Avant ce correctif, deleteItem et toggleStatus appelaient directement
 * createClient().from('listings').delete/update() côté navigateur.
 * La protection reposait uniquement sur la RLS Supabase.
 *
 * Les mutations passent maintenant par getAdminUser() (session + role côté serveur)
 * avec createAdminClient() (service role, bypass RLS) pour toutes les écritures.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adminFetch } from '@/lib/admin-fetch';
import toast from 'react-hot-toast';
import type { ContentListing } from '../_types';

export function useListings() {
  const [items, setItems]               = useState<ContentListing[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Lecture : toujours via createClient (RLS filtre par rôle admin/modérateur) ──
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

  // ── Suppression via API serveur ──────────────────────────────────────────
  const deleteItem = async (id: string) => {
    const res = await adminFetch(`/api/admin/contenu/listings/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setItems(prev => prev.filter(l => l.id !== id));
    toast.success('Annonce supprimée');
  };

  // ── Changement de statut via API serveur ─────────────────────────────────
  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    const res = await adminFetch(`/api/admin/contenu/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', value: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
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
