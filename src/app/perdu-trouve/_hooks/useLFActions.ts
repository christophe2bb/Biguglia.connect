'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { LFItem, LFStatus, LFType } from '../_types';
import { ACTIVE_STATUSES, STATUS_CONFIG } from '../_constants';

// ─── Match engine (pure function) ────────────────────────────────────────────
export function computeMatchScore(lost: LFItem, found: LFItem): number {
  let score = 0;
  if (lost.category === found.category) score += 40;
  if (lost.location_area === found.location_area) score += 20;
  if (lost.color && found.color && lost.color.toLowerCase() === found.color.toLowerCase()) score += 15;
  if (lost.brand && found.brand && lost.brand.toLowerCase() === found.brand.toLowerCase()) score += 15;
  const dLost  = new Date(lost.lost_date).getTime();
  const dFound = new Date(found.lost_date).getTime();
  const diffDays = Math.abs(dLost - dFound) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) score += 10;
  else if (diffDays <= 7) score += 5;
  const lWords = (lost.title  + ' ' + lost.description).toLowerCase().split(/\s+/);
  const fWords = (found.title + ' ' + found.description).toLowerCase().split(/\s+/);
  const common = lWords.filter(w => w.length > 3 && fWords.includes(w)).length;
  if (common > 0) score += Math.min(common * 3, 15);
  return Math.min(score, 100);
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export type LFActionsReturn = {
  handleDelete: (id: string) => Promise<void>;
  handleStatusChange: (id: string, newStatus: LFStatus) => Promise<void>;
  getSuggestedMatches: (item: LFItem) => LFItem[];
};

export function useLFActions(
  items: LFItem[],
  fetchItems: () => Promise<void>,
  profileId?: string,
): LFActionsReturn {
  const supabase = createClient();

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await supabase.from('lost_found_items').update({
      status: 'archive',
      archived_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    }).eq('id', id);
    toast.success('Annonce archivée');
    fetchItems();
  };

  const handleStatusChange = async (id: string, newStatus: LFStatus) => {
    const now = new Date().toISOString();
    const updates: Record<string, string | null> = { status: newStatus, updated_at: now };
    if (newStatus === 'restitue') updates.restitution_confirmed_at = now;
    if (newStatus === 'clos')     updates.closed_at   = now;
    if (newStatus === 'archive')  updates.archived_at = now;

    await supabase.from('lost_found_items').update(updates).eq('id', id);

    try {
      await supabase.from('lf_status_history').insert({
        item_id: id, new_status: newStatus, changed_by: profileId,
      });
    } catch { /* silencieux si table absente */ }

    if (newStatus === 'restitue' && profileId) {
      const item = items.find(i => i.id === id);
      if (item && item.author_id !== profileId) {
        try {
          await supabase.from('trust_interactions').insert({
            source_type: 'lost_found', source_id: id,
            requester_id: profileId, receiver_id: item.author_id,
            interaction_type: 'transaction', status: 'done',
            requester_review_allowed: true, receiver_review_allowed: true,
            completed_at: now,
          });
        } catch { /* silencieux */ }
      }
    }

    const cfg = STATUS_CONFIG[newStatus];
    toast.success(`✅ Statut : ${cfg.icon} ${cfg.label}`);
    fetchItems();
  };

  const getSuggestedMatches = useCallback((item: LFItem): LFItem[] => {
    if (!ACTIVE_STATUSES.includes(item.status)) return [];
    const oppositeType: LFType = item.type === 'perdu' ? 'trouve' : 'perdu';
    return items
      .filter(other =>
        other.type === oppositeType &&
        other.id !== item.id &&
        ACTIVE_STATUSES.includes(other.status) &&
        other.category === item.category
      )
      .map(other => ({
        item: other,
        score: computeMatchScore(
          item.type === 'perdu' ? item  : other,
          item.type === 'perdu' ? other : item,
        ),
      }))
      .filter(({ score }) => score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ item }) => item);
  }, [items]);

  return { handleDelete, handleStatusChange, getSuggestedMatches };
}
