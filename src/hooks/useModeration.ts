'use client';

/**
 * useModeration — Hook React pour la soumission de contenu à la modération
 *
 * Utilisé par tous les formulaires de création de contenu sur Biguglia Connect.
 * Effectue les vérifications pré-publication et soumet à la file de modération.
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import {
  validateContent,
  getModerationStatus,
  computeTrustLevel,
  checkPublicationLimit,
  MODERATION_MESSAGES,
  type ContentType,
  type ModerationStatus,
  type ValidationResult,
} from '@/lib/moderation';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ModerationSubmitOptions {
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
  contentExcerpt?: string;
  contentPhotos?: string[];
  /** Données brutes pour validation (titre, description, etc.) */
  validationData: Record<string, unknown>;
  /** Table source (ex: 'listings') — pour la limite quotidienne */
  sourceTable?: string;
  /** Colonne auteur (défaut: 'author_id') */
  authorColumn?: string;
}

export interface ModerationSubmitResult {
  success: boolean;
  status: ModerationStatus;
  queueId?: string;
  validationResult: ValidationResult;
  isDirectPublish: boolean;
  message: string;
}

export interface UseModerationReturn {
  submitting: boolean;
  submitForModeration: (opts: ModerationSubmitOptions) => Promise<ModerationSubmitResult | null>;
  validateOnly: (contentType: ContentType, data: Record<string, unknown>) => ValidationResult;
  checkLimit: (sourceTable: string, authorColumn?: string) => Promise<boolean>;
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useModeration(): UseModerationReturn {
  const [submitting, setSubmitting] = useState(false);
  const { profile } = useAuthStore();

  // Validation côté client uniquement
  const validateOnly = useCallback((
    contentType: ContentType,
    data: Record<string, unknown>,
  ): ValidationResult => {
    return validateContent(contentType, data);
  }, []);

  // Vérification limite quotidienne
  const checkLimit = useCallback(async (
    sourceTable: string,
    authorColumn = 'author_id',
  ): Promise<boolean> => {
    if (!profile) return false;
    const supabase = createClient();
    const result = await checkPublicationLimit(supabase, profile.id, profile.role, sourceTable, authorColumn);
    if (!result.allowed) {
      toast.error(result.reason || 'Limite de publications atteinte');
    }
    return result.allowed;
  }, [profile]);

  // Soumission complète à la file de modération
  const submitForModeration = useCallback(async (
    opts: ModerationSubmitOptions,
  ): Promise<ModerationSubmitResult | null> => {
    if (!profile) {
      toast.error('Vous devez être connecté');
      return null;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      // 1. Vérification limite quotidienne
      if (opts.sourceTable) {
        const limitResult = await checkPublicationLimit(
          supabase, profile.id, profile.role,
          opts.sourceTable, opts.authorColumn,
        );
        if (!limitResult.allowed) {
          toast.error(limitResult.reason || 'Limite atteinte');
          return null;
        }
      }

      // 2. Validation du contenu
      const validation = validateContent(opts.contentType, opts.validationData);

      // 3. Calcul du niveau de confiance auteur
      const authorTrust = computeTrustLevel({
        created_at: profile.created_at,
        role: profile.role,
        publication_count: (profile as unknown as Record<string, unknown>).publication_count as number | undefined,
        reports_received: (profile as unknown as Record<string, unknown>).reports_received as number | undefined,
        trust_level: (profile as unknown as Record<string, unknown>).trust_level as string | undefined,
      });

      // 4. Statut de modération selon confiance
      const moderationStatus = getModerationStatus(authorTrust, profile.role);
      const isDirectPublish = moderationStatus === 'publie';

      // 5. Insertion dans la file de modération
      const { data: queueEntry, error } = await supabase
        .from('moderation_queue')
        .insert({
          content_type:      opts.contentType,
          content_id:        opts.contentId,
          content_title:     opts.contentTitle || '(Sans titre)',
          content_excerpt:   opts.contentExcerpt?.slice(0, 500) || null,
          content_photos:    opts.contentPhotos || [],
          author_id:         profile.id,
          author_trust:      authorTrust,
          status:            moderationStatus,
          risk_score:        validation.riskScore,
          risk_level:        validation.riskLevel,
          completeness:      validation.completeness,
          validation_errors: validation.errors,
          submitted_at:      new Date().toISOString(),
          // Si publication directe, marquer comme auto-approuvé
          ...(isDirectPublish ? {
            decision: 'accepter',
            reviewed_at: new Date().toISOString(),
            moderator_note: 'Publication directe (membre de confiance)',
          } : {}),
        })
        .select('id')
        .single();

      if (error) throw error;

      // 6. Mettre à jour le statut de modération dans la table source
      if (opts.sourceTable) {
        await supabase
          .from(opts.sourceTable)
          .update({ moderation_status: moderationStatus })
          .eq('id', opts.contentId);
      }

      // 7. Message à l'utilisateur
      const contentLabel = {
        listing: 'annonce', equipment: 'matériel', help_request: 'coup de main',
        outing: 'promenade', event: 'événement', lost_found: 'publication',
        collection_item: 'collection', association: 'association', forum_post: 'message',
      }[opts.contentType] || 'publication';

      const message = isDirectPublish
        ? MODERATION_MESSAGES.accepted(contentLabel)
        : MODERATION_MESSAGES.submitted(contentLabel);

      if (isDirectPublish) {
        toast.success('✅ ' + message.split('.')[0]);
      } else {
        toast.success('📬 Publication soumise à validation', {
          duration: 5000,
          icon: '⏳',
        });
      }

      return {
        success: true,
        status: moderationStatus,
        queueId: queueEntry?.id,
        validationResult: validation,
        isDirectPublish,
        message,
      };
    } catch (err) {
      console.error('Moderation submit error:', err);
      toast.error('Erreur lors de la soumission');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [profile]);

  return { submitting, submitForModeration, validateOnly, checkLimit };
}

// ─── Hook de statut de modération (pour affichage auteur) ────────────────────
export interface UseModerationStatusReturn {
  status: ModerationStatus | null;
  queueId: string | null;
  reason: string | null;
  loading: boolean;
  refresh: () => void;
}

export function useModerationStatus(
  contentType: ContentType,
  contentId: string,
): UseModerationStatusReturn {
  const [status, setStatus] = useState<ModerationStatus | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  const fetch = useCallback(async () => {
    if (!contentId || !profile) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('moderation_queue')
      .select('id, status, refusal_reason, correction_reason')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('author_id', profile.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setStatus(data.status as ModerationStatus);
      setQueueId(data.id);
      setReason(data.refusal_reason || data.correction_reason || null);
    }
    setLoading(false);
  }, [contentType, contentId, profile]);

  useState(() => { fetch(); });

  return { status, queueId, reason, loading, refresh: fetch };
}
