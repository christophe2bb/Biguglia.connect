/**
 * Hook — useListings
 *
 * Lecture  : GET /api/admin/contenu/listings (service-role, bypasse FK ambiguë)
 * Mutations : routées via l'API serveur /api/admin/contenu/listings/[id]
 *   • DELETE  : suppression
 *   • PATCH   : changement de statut (active / inactive)
 *
 * La table listings a deux FK vers profiles (user_id + owner_id), ce qui rend
 * toute jointure Supabase via createClient() côté navigateur ambiguë et retourne
 * data=null. La lecture passe désormais par adminFetch → service-role côté serveur.
 */

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import toast from 'react-hot-toast';
import type { ContentListing } from '../_types';

export function useListings() {
  const [items, setItems]               = useState<ContentListing[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Lecture via API serveur (service-role — résout FK ambiguë) ────────────
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/contenu/listings');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error('Erreur chargement annonces : ' + (body.error ?? res.statusText));
        return;
      }
      const { items: data } = await res.json() as { items: ContentListing[] };
      setItems(data ?? []);
    } catch (err) {
      toast.error('Erreur réseau : ' + String(err));
    } finally {
      setLoading(false);
    }
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
