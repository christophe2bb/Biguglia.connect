import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ContentEquipment } from '../_types';

export function useEquipment() {
  const [items, setItems]               = useState<ContentEquipment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [availFilter, setAvailFilter]   = useState('');

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

  const deleteItem = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('equipment_items').delete().eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setItems(prev => prev.filter(e => e.id !== id));
    toast.success('Équipement supprimé');
  };

  const toggleAvail = async (id: string, current: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from('equipment_items').update({ is_available: !current }).eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
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
