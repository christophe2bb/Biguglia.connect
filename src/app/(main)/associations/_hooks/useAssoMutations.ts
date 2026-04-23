'use client';

import { useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export type AssoMutationsReturn = {
  handleDelete: (id: string) => Promise<void>;
};

export function useAssoMutations(fetchAssos: () => Promise<void>): AssoMutationsReturn {
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;

  const handleDelete = async (id: string) => {
    // ⚠️ Appelé APRÈS confirmation dans l'UI (pas de confirm() bloquant).
    await supabase.from('associations').delete().eq('id', id);
    toast.success('Fiche supprimée');
    fetchAssos();
  };

  return { handleDelete };
}
