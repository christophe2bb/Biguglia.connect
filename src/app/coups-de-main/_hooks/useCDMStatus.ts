'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { STATUS_LABELS } from '../_constants';

export type CDMStatusReturn = {
  handleDelete:       (id: string) => Promise<void>;
  handleResolve:      (id: string) => Promise<void>;
  handlePause:        (id: string, wasPaused: boolean) => Promise<void>;
  handleStatusChange: (id: string, newStatus: string) => Promise<void>;
  handleCanHelp:      (helpId: string, title: string) => Promise<void>;
};

export function useCDMStatus(
  profileId: string | undefined,
  fetchItems: () => Promise<void>,
): CDMStatusReturn {
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;
  const router      = useRouter();

  // ── Suppression ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await supabase.from('help_requests').delete().eq('id', id);
    toast.success('Annonce supprimée');
    fetchItems();
  };

  // ── Résolution ───────────────────────────────────────────────────────────
  const handleResolve = async (id: string) => {
    await supabase
      .from('help_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id);
    toast.success('✅ Marqué comme résolu ! Merci pour votre entraide.');
    fetchItems();
  };

  // ── Pause / reprise ──────────────────────────────────────────────────────
  const handlePause = async (id: string, wasPaused: boolean) => {
    await supabase
      .from('help_requests')
      .update({ status: wasPaused ? 'active' : 'paused' })
      .eq('id', id);
    toast.success(wasPaused ? '▶️ Annonce réactivée' : '⏸ Annonce mise en pause');
    fetchItems();
  };

  // ── Changement de statut générique ───────────────────────────────────────
  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('help_requests').update({ status: newStatus }).eq('id', id);
    toast.success(`✅ Statut : ${STATUS_LABELS[newStatus] || newStatus}`);
    fetchItems();
  };

  // ── Je peux aider ────────────────────────────────────────────────────────
  const handleCanHelp = async (helpId: string, title: string) => {
    if (!profileId) {
      toast.error('Connectez-vous pour proposer votre aide');
      router.push('/connexion');
      return;
    }
    const { error } = await supabase
      .from('help_request_participants')
      .upsert(
        { help_request_id: helpId, user_id: profileId, role: 'helper', state: 'pending' },
        { onConflict: 'help_request_id,user_id' },
      );
    if (error && !error.message.includes('duplicate')) {
      toast.error('Erreur : ' + error.message);
    } else {
      toast.success(`✅ Votre aide pour "${title.slice(0, 40)}" a été proposée !`, { duration: 4000 });
    }
  };

  return { handleDelete, handleResolve, handlePause, handleStatusChange, handleCanHelp };
}
