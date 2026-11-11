'use client';

/**
 * Favoris annonces : base Supabase comme source de vérité dès la connexion.
 * Hors connexion : localStorage uniquement. La sauvegarde ne doit jamais
 * afficher un succès si INSERT/DELETE en base a échoué.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';

const LS_KEY = 'annonces_favorites';
const FAVORITES_EVENT = 'biguglia:listing-favorite-change';
function notifyFavorite(id: string, saved: boolean) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: { id, saved } }));
  }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lsRead(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && UUID.test(id)) : [];
  } catch { return []; }
}

function lsWrite(ids: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* storage disabled */ }
}

export interface UseFavoritesReturn {
  savedIds: Set<string>;
  toggleSave: (id: string, e?: React.MouseEvent) => void;
}

export function useFavorites(): UseFavoritesReturn {
  const { profile, phase } = useAuthStore();
  const userId = phase === 'authenticated' ? (profile?.id ?? null) : null;
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(lsRead()));
  const inFlight = useRef<Set<string>>(new Set());

  // La fiche SSR monte plusieurs instances d'AnnonceActions (topbar,
  // sidebar et barre mobile). Synchroniser leur état lors d'un clic.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; saved?: boolean }>).detail;
      if (!detail?.id || !UUID.test(detail.id) || typeof detail.saved !== 'boolean') return;
      setSavedIds(prev => {
        const next = new Set(prev);
        if (detail.saved) next.add(detail.id);
        else next.delete(detail.id);
        return next;
      });
    };
    window.addEventListener(FAVORITES_EVENT, handler);
    return () => window.removeEventListener(FAVORITES_EVENT, handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (phase === 'initializing') return;
    if (!userId) {
      setSavedIds(new Set(lsRead()));
      return;
    }

    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_favorites')
        .select('target_id')
        .eq('user_id', userId)
        .eq('target_type', 'listing');

      if (cancelled) return;
      if (error) {
        console.warn('[Favoris] lecture impossible', error.code);
        toast.error('Impossible de récupérer vos favoris pour le moment.');
        return;
      }
      const dbIds = new Set((data ?? []).flatMap(r => r.target_id ? [r.target_id] : []));
      const pendingIds = lsRead().filter(id => !dbIds.has(id));
      if (pendingIds.length > 0) {
        const { error: migrationError } = await supabase
          .from('user_favorites')
          .insert(pendingIds.map(id => ({ user_id: userId, target_type: 'listing', target_id: id })));
        if (cancelled) return;
        if (migrationError) {
          console.warn('[Favoris] transfert local impossible', migrationError.code);
          toast.error('Certains favoris locaux n’ont pas pu être synchronisés.');
        } else {
          pendingIds.forEach(id => dbIds.add(id));
          lsWrite([]);
        }
      } else {
        lsWrite([]);
      }
      if (!cancelled) setSavedIds(dbIds);
    };

    void load();
    return () => { cancelled = true; };
  }, [userId, phase]);

  const toggleSave = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!UUID.test(id) || inFlight.current.has(id)) return;
    const currentlySaved = savedIds.has(id);
    if (!userId) {
      setSavedIds(prev => {
        const next = new Set(prev);
        if (currentlySaved) next.delete(id); else next.add(id);
        lsWrite(Array.from(next));
        return next;
      });
      notifyFavorite(id, !currentlySaved);
      toast(currentlySaved ? 'Retirée des favoris de cet appareil' : 'Ajoutée aux favoris de cet appareil', {
        icon: currentlySaved ? '💔' : '❤️',
      });
      return;
    }

    inFlight.current.add(id);
    try {
      const supabase = createClient();
      const { error } = currentlySaved
        ? await supabase.from('user_favorites').delete()
            .eq('user_id', userId).eq('target_id', id).eq('target_type', 'listing')
        : await supabase.from('user_favorites').insert({
            user_id: userId, target_id: id, target_type: 'listing',
          });
      if (error) {
        console.warn('[Favoris] écriture refusée', error.code);
        toast.error('Le favori n’a pas été enregistré. Réessayez.');
        return;
      }
      setSavedIds(prev => {
        const next = new Set(prev);
        if (currentlySaved) next.delete(id); else next.add(id);
        return next;
      });
      notifyFavorite(id, !currentlySaved);
      toast.success(currentlySaved ? 'Annonce retirée des favoris' : 'Annonce enregistrée en favoris');
    } catch {
      toast.error('Erreur réseau : le favori n’a pas été modifié.');
    } finally {
      inFlight.current.delete(id);
    }
  }, [savedIds, userId]);

  return { savedIds, toggleSave };
}
