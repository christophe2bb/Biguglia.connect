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
  // ⚠️ Pas de confirm() natif ici — la confirmation est gérée par le composant UI.
  const handleDelete = async (id: string) => {
    // 1. Vérifier la session (évite appel Supabase avec JWT absent)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      toast.error('Session expirée. Reconnectez-vous.');
      router.push('/connexion');
      return;
    }

    const loadingToast = toast.loading('Suppression…');

    // 2. Double filtre id + author_id
    const { error, count } = await supabase
      .from('help_requests')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('author_id', sessionData.session.user.id);

    toast.dismiss(loadingToast);

    if (error) {
      console.error('[useCDMStatus] handleDelete error:', error);
      toast.error(`Erreur lors de la suppression : ${error.message}`);
      return;
    }

    if (count === 0) {
      toast.error(
        "Impossible de supprimer : vous n'êtes peut-être pas l'auteur ou l'annonce n'existe plus.",
        { duration: 5000 },
      );
      return;
    }

    toast.success('Annonce supprimée ✅');
    await fetchItems();
  };

  // ── Résolution ───────────────────────────────────────────────────────────
  const handleResolve = async (id: string) => {
    const { error, count } = await supabase
      .from('help_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', id);

    if (error || count === 0) {
      toast.error(error?.message ?? 'Impossible de marquer comme résolu.');
      return;
    }

    toast.success('✅ Marqué comme résolu ! Merci pour votre entraide.');
    await fetchItems();
  };

  // ── Pause / reprise ──────────────────────────────────────────────────────
  const handlePause = async (id: string, wasPaused: boolean) => {
    const { error, count } = await supabase
      .from('help_requests')
      .update({ status: wasPaused ? 'active' : 'paused' }, { count: 'exact' })
      .eq('id', id);

    if (error || count === 0) {
      toast.error(error?.message ?? 'Impossible de modifier le statut.');
      return;
    }

    toast.success(wasPaused ? '▶️ Annonce réactivée' : '⏸ Annonce mise en pause');
    await fetchItems();
  };

  // ── Changement de statut générique ───────────────────────────────────────
  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error, count } = await supabase
      .from('help_requests')
      .update({ status: newStatus }, { count: 'exact' })
      .eq('id', id);

    if (error || count === 0) {
      toast.error(error?.message ?? 'Impossible de modifier le statut.');
      return;
    }

    toast.success(`✅ Statut : ${STATUS_LABELS[newStatus] || newStatus}`);
    await fetchItems();
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
