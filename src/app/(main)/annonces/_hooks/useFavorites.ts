'use client';

/**
 * useFavorites — Favoris annonces persistants
 *
 * • Connecté   → Supabase user_favorites (target_type='listing')
 *               + migration automatique des IDs localStorage → base
 * • Non connecté → localStorage 'annonces_favorites' (fallback)
 *
 * L'interface publique est identique : { savedIds, toggleSave }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';

const LS_KEY = 'annonces_favorites';

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsRead(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function lsWrite(ids: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

function lsClear() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseFavoritesReturn {
  savedIds: Set<string>;
  toggleSave: (id: string, e: React.MouseEvent) => void;
}

export function useFavorites(): UseFavoritesReturn {
  const { profile } = useAuthStore();
  const userId = profile?.id ?? null;

  // Initialise depuis localStorage (avant que Supabase réponde)
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(lsRead()));
  // Évite de déclencher la migration plusieurs fois
  const migratedRef = useRef(false);

  // ── Chargement / migration depuis Supabase quand connecté ─────────────────
  useEffect(() => {
    if (!userId) {
      // Non connecté : on reste sur localStorage
      setSavedIds(new Set(lsRead()));
      return;
    }

    const supabase = createClient();

    (async () => {
      // 1. Lire les favoris déjà en base
      const { data } = await supabase
        .from('user_favorites')
        .select('target_id')
        .eq('user_id', userId)
        .eq('target_type', 'listing');

      const dbIds = new Set((data ?? []).map((r: { target_id: string }) => r.target_id));

      // 2. Migration one-shot : IDs localStorage → Supabase
      if (!migratedRef.current) {
        migratedRef.current = true;
        const localIds = lsRead().filter(id => !dbIds.has(id));
        if (localIds.length > 0) {
          await supabase.from('user_favorites').insert(
            localIds.map(id => ({
              user_id:     userId,
              target_id:   id,
              target_type: 'listing',
            }))
          );
          localIds.forEach(id => dbIds.add(id));
        }
        lsClear(); // localStorage nettoyé après migration
      }

      setSavedIds(new Set(dbIds));
    })();
  }, [userId]);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const toggleSave = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSavedIds(prev => {
      const next = new Set(prev);
      const removing = next.has(id);

      if (removing) {
        next.delete(id);
        toast('Annonce retirée des favoris', { icon: '💔' });
      } else {
        next.add(id);
        toast.success('Annonce sauvegardée en favoris !');
      }

      // Persistance
      if (userId) {
        // Connecté → Supabase (fire-and-forget)
        const supabase = createClient();
        if (removing) {
          supabase.from('user_favorites').delete()
            .eq('user_id', userId)
            .eq('target_id', id)
            .eq('target_type', 'listing')
            .then(() => { /* ignore */ });
        } else {
          supabase.from('user_favorites').insert({
            user_id:     userId,
            target_id:   id,
            target_type: 'listing',
          }).then(() => { /* ignore */ });
        }
      } else {
        // Non connecté → localStorage
        lsWrite(Array.from(next));
      }

      return next;
    });
  }, [userId]);

  return { savedIds, toggleSave };
}
