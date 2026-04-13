'use client';

/**
 * Hook: useModerationDetail
 * Centralise état, chargement, décision et changement de niveau de confiance
 * pour la page /admin/moderation/[id].
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { TRUST_LEVEL_CONFIG } from '@/lib/moderation';
import { DECISION_MSGS, TABLE_MAP } from '../_config';
import type {
  QueueDetail,
  ModerationHistoryEntry,
  AuthorStats,
  DecisionKey,
  TrustLevel,
  ModerationStatus,
} from '../_types';

/* Re-export so consumers don't need to import from two places */
export type { QueueDetail, ModerationHistoryEntry, AuthorStats, DecisionKey };

/* ── Hook ─────────────────────────────────────────────────────────────────── */
export interface UseModerationDetailReturn {
  /* data */
  item: QueueDetail | null;
  history: ModerationHistoryEntry[];
  authorStats: AuthorStats | null;
  /* ui state */
  loading: boolean;
  processing: boolean;
  selectedDecision: DecisionKey | null;
  selectedReason: string;
  moderatorNote: string;
  photoIndex: number;
  /* derived */
  canDecide: boolean;
  /* actions */
  setSelectedDecision: (d: DecisionKey | null) => void;
  setSelectedReason: (r: string) => void;
  setModeratorNote: (n: string) => void;
  setPhotoIndex: (i: number) => void;
  fetchData: () => Promise<void>;
  handleDecision: () => Promise<void>;
  handleTrustChange: (level: TrustLevel) => Promise<void>;
}

export function useModerationDetail(): UseModerationDetailReturn {
  const { profile, isModerator } = useAuthStore();
  const router   = useRouter();
  const params   = useParams();
  const queueId  = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [item, setItem]               = useState<QueueDetail | null>(null);
  const [history, setHistory]         = useState<ModerationHistoryEntry[]>([]);
  const [authorStats, setAuthorStats] = useState<AuthorStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [processing, setProcessing]   = useState(false);

  const [selectedDecision, setSelectedDecision] = useState<DecisionKey | null>(null);
  const [selectedReason, setSelectedReason]     = useState('');
  const [moderatorNote, setModeratorNote]       = useState('');
  const [photoIndex, setPhotoIndex]             = useState(0);

  // Stable ref so fetchData closure never stales on moderatorNote
  const moderatorNoteRef = useRef(moderatorNote);
  moderatorNoteRef.current = moderatorNote;

  /* ── Guard: redirect non-moderators ──────────────────────────────────── */
  useEffect(() => {
    if (profile && !isModerator()) router.push('/admin');
  }, [profile, isModerator, router]);

  /* ── Fetch queue item + history + author stats ───────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase
      .from('moderation_queue')
      .select(`
        *,
        author:profiles!moderation_queue_author_id_fkey(
          id, full_name, avatar_url, created_at, email, phone,
          publication_count, reports_received, trust_level, role
        )
      `)
      .eq('id', queueId)
      .single();

    if (data) {
      setItem(data as QueueDetail);
      // Only pre-fill note on first load (ref guards subsequent refreshes)
      if (moderatorNoteRef.current === '') setModeratorNote(data.moderator_note || '');

      /* History */
      const { data: hist } = await supabase
        .from('moderation_history')
        .select(`*, moderator:profiles!moderation_history_moderator_id_fkey(full_name, avatar_url)`)
        .eq('queue_id', queueId)
        .order('created_at', { ascending: false });
      setHistory((hist || []) as ModerationHistoryEntry[]);

      /* Author moderation stats */
      if (data.author_id) {
        const [
          { count: total },
          { count: pending },
          { count: refused },
        ] = await Promise.all([
          supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('author_id', data.author_id),
          supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('author_id', data.author_id).eq('status', 'en_attente_validation'),
          supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('author_id', data.author_id).eq('status', 'refuse'),
        ]);
        setAuthorStats({ total: total ?? 0, pending: pending ?? 0, refused: refused ?? 0 });
      }
    }

    setLoading(false);
  }, [queueId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Submit moderation decision ──────────────────────────────────────── */
  const handleDecision = async () => {
    if (!profile || !item || !selectedDecision) return;
    if (selectedDecision !== 'accepter' && !selectedReason) {
      toast.error('Veuillez sélectionner un motif');
      return;
    }

    setProcessing(true);

    const newStatus: ModerationStatus =
      selectedDecision === 'accepter' ? 'publie' :
      selectedDecision === 'refuser'  ? 'refuse' : 'a_corriger';

    const updateData: Record<string, unknown> = {
      status:         newStatus,
      decision:       selectedDecision,
      reviewed_by:    profile.id,
      reviewed_at:    new Date().toISOString(),
      moderator_note: moderatorNote || null,
    };
    if (selectedDecision === 'refuser')             updateData.refusal_reason    = selectedReason;
    if (selectedDecision === 'demander_correction') updateData.correction_reason = selectedReason;

    const { error } = await supabase
      .from('moderation_queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) {
      toast.error('Erreur lors de la décision');
    } else {
      /* Propagate status to the source table */
      const table = TABLE_MAP[item.content_type];
      if (table) {
        await supabase.from(table)
          .update({ moderation_status: newStatus })
          .eq('id', item.content_id);
      }

      toast.success(DECISION_MSGS[selectedDecision]);
      setSelectedDecision(null);
      setSelectedReason('');
      fetchData();
    }

    setProcessing(false);
  };

  /* ── Update author trust level ───────────────────────────────────────── */
  const handleTrustChange = async (newTrust: TrustLevel) => {
    if (!item) return;

    const { error } = await supabase
      .from('profiles')
      .update({ trust_level: newTrust })
      .eq('id', item.author_id);

    if (error) { toast.error('Erreur'); return; }

    toast.success(`Niveau de confiance mis à jour : ${TRUST_LEVEL_CONFIG[newTrust].label}`);

    await supabase.from('moderation_queue')
      .update({ author_trust: newTrust })
      .eq('id', queueId);

    fetchData();
  };

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const canDecide = Boolean(
    item && (item.status === 'en_attente_validation' || item.status === 'a_corriger'),
  );

  return {
    item, history, authorStats,
    loading, processing,
    selectedDecision, selectedReason, moderatorNote, photoIndex,
    canDecide,
    setSelectedDecision, setSelectedReason, setModeratorNote, setPhotoIndex,
    fetchData, handleDecision, handleTrustChange,
  };
}
