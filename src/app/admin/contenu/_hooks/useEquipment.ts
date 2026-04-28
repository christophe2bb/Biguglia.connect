/**
 * Hook — useEquipment
 *
 * Mutations : routées via l'API serveur /api/admin/contenu/equipment_items/[id]
 *   • DELETE  : suppression
 *   • PATCH   : disponibilité (set_available)
 *
 * Avant ce correctif, les mutations appelaient directement
 * createClient().from('equipment_items').delete/update() côté navigateur.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adminFetch } from '@/lib/admin-fetch';
import toast from 'react-hot-toast';
import type { ContentEquipment } from '../_types';

export function useEquipment() {
  const [items, setItems]             = useState<ContentEquipment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [availFilter, setAvailFilter] = useState('');

  // ── Lecture ──────────────────────────────────────────────────────────────
  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('equipment_items')
      .select(`
        id, title, description, is_available, borrow_count, condition, created_at,
        owner:profiles!equipment_items_owner_id_fkey(id, full_name, email, avatar_url),
        category:equipment_categories(name, icon)
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as unknown as ContentEquipment[]) || []);
    setLoading(false);
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
