/**
 * Hook — useEquipment
 *
 * Lecture  : GET /api/admin/contenu/equipment_items (service-role, bypass RLS)
 * Mutations : routées via l'API serveur /api/admin/contenu/equipment_items/[id]
 *   • DELETE  : suppression
 *   • PATCH   : disponibilité (set_available)
 */

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import toast from 'react-hot-toast';
import type { ContentEquipment } from '../_types';

export function useEquipment() {
  const [items, setItems]             = useState<ContentEquipment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [availFilter, setAvailFilter] = useState('');

  // ── Lecture via API serveur ──────────────────────────────────────────────
  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/contenu/equipment_items');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error('Erreur chargement équipements : ' + (body.error ?? res.statusText));
        return;
      }
      const { items: data } = await res.json() as { items: ContentEquipment[] };
      setItems(data ?? []);
    } catch (err) {
      toast.error('Erreur réseau : ' + String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  // ── Suppression via API serveur ──────────────────────────────────────────
  const deleteItem = async (id: string) => {
    const res = await adminFetch(`/api/admin/contenu/equipment_items/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setItems(prev => prev.filter(e => e.id !== id));
    toast.success('Équipement supprimé');
  };

  // ── Disponibilité via API serveur ────────────────────────────────────────
  const toggleAvail = async (id: string, current: boolean) => {
    const res = await adminFetch(`/api/admin/contenu/equipment_items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_available', value: !current }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setItems(prev => prev.map(e => e.id === id ? { ...e, is_available: !current } : e));
    toast.success(!current ? 'Équipement marqué disponible' : 'Équipement marqué indisponible');
  };

  const filtered = items.filter(e =>
    (availFilter === '' || (availFilter === 'available' ? e.is_available : !e.is_available)) &&
    (!search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.owner?.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return {
    items: filtered,
    loading,
    search, setSearch,
    availFilter, setAvailFilter,
    fetchEquipment,
    deleteItem,
    toggleAvail,
  };
}
