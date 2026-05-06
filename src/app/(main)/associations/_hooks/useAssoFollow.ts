'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

/**
 * Hook pour suivre / ne plus suivre une association.
 * Fonctionne en deux modes :
 *  - assoId fourni  → abonnement ciblé sur une association précise
 *  - assoId = null  → CTA générique (redirection vers /connexion si non connecté)
 */
export function useAssoFollow(assoId: string | null) {
  const { profile } = useAuthStore();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [checked, setChecked]     = useState(false);   // état initial chargé ?

  // ── Chargement de l'état initial ──────────────────────────────────────────
  useEffect(() => {
    if (!profile || !assoId) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('asso_follows')
      .select('id')
      .eq('user_id', profile.id)
      .eq('asso_id', assoId)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        if (!cancelled) {
          setFollowing(!!data);
          setChecked(true);
        }
      });

    return () => { cancelled = true; };
  }, [profile, assoId]);

  // ── Toggle follow / unfollow ───────────────────────────────────────────────
  const toggle = useCallback(async () => {
    if (!profile) {
      // Non connecté : on ne peut pas ici rediriger (pas de router dans ce hook),
      // le composant doit gérer la redirection.
      return;
    }
    if (!assoId) return;

    setLoading(true);
    const supabase = createClient();

    try {
      if (following) {
        // Désabonnement
        const { error } = await supabase
          .from('asso_follows')
          .delete()
          .eq('user_id', profile.id)
          .eq('asso_id', assoId);

        if (error) throw error;
        setFollowing(false);
        toast.success('Alertes désactivées pour cette association');
      } else {
        // Abonnement
        const { error } = await supabase
          .from('asso_follows')
          .insert({ user_id: profile.id, asso_id: assoId });

        if (error) throw error;
        setFollowing(true);
        toast.success('✅ Vous serez alerté des mises à jour de cette association');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      toast.error(`Impossible de modifier l'abonnement : ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [profile, assoId, following]);

  return {
    following,
    loading,
    checked,
    isLoggedIn: !!profile,
    toggle,
  };
}
