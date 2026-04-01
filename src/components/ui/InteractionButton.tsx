'use client';

/**
 * InteractionButton — Bouton d'entrée en relation + suivi du cycle de vie
 *
 * Gère tout le cycle : demandé → accepté → en cours → terminé → avis débloqué.
 * S'adapte au rôle de l'utilisateur (demandeur ou destinataire).
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  HandHeart, ShoppingCart, Wrench, Users, MapPin, Calendar,
  CheckCheck, Clock, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Star, ArrowRight, Loader2, MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
export type InteractionSourceType =
  | 'listing' | 'equipment' | 'help_request' | 'association'
  | 'collection_item' | 'outing' | 'event' | 'service_request' | 'lost_found';

export type InteractionType =
  | 'transaction' | 'material_request' | 'help_match'
  | 'participation' | 'contact' | 'service_request';

export type InteractionStatus =
  | 'requested' | 'pending' | 'accepted' | 'rejected'
  | 'in_progress' | 'done' | 'cancelled' | 'disputed';

interface Interaction {
  id: string;
  status: InteractionStatus;
  interaction_type: InteractionType;
  requester_id: string;
  receiver_id: string;
  conversation_id: string | null;
  review_unlocked: boolean;
  review_requester_done: boolean;
  review_receiver_done: boolean;
  started_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  status_history: Array<{ status: string; changed_at: string; note?: string }>;
}

// ─── Config par source_type ────────────────────────────────────────────────────
const CONFIG: Record<InteractionSourceType, {
  cta: string;           // Label bouton principal
  ctaIcon: React.ElementType;
  interactionType: InteractionType;
  color: string;
  bg: string;
  border: string;
  verbDone: string;      // Texte pour "échange terminé"
}> = {
  listing: {
    cta: 'Je suis intéressé', ctaIcon: ShoppingCart,
    interactionType: 'transaction',
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    verbDone: 'la transaction',
  },
  equipment: {
    cta: 'Je demande ce prêt', ctaIcon: Wrench,
    interactionType: 'material_request',
    color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200',
    verbDone: 'le prêt de matériel',
  },
  help_request: {
    cta: 'Je peux aider', ctaIcon: HandHeart,
    interactionType: 'help_match',
    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',
    verbDone: 'l\'aide apportée',
  },
  association: {
    cta: 'Contacter l\'association', ctaIcon: Users,
    interactionType: 'contact',
    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200',
    verbDone: 'le contact avec l\'association',
  },
  collection_item: {
    cta: 'Je suis intéressé', ctaIcon: ShoppingCart,
    interactionType: 'contact',
    color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200',
    verbDone: 'l\'échange',
  },
  outing: {
    cta: 'Je participe', ctaIcon: MapPin,
    interactionType: 'participation',
    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',
    verbDone: 'la sortie',
  },
  event: {
    cta: 'Je m\'inscris', ctaIcon: Calendar,
    interactionType: 'participation',
    color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200',
    verbDone: 'l\'événement',
  },
  service_request: {
    cta: 'Demander ce service', ctaIcon: Wrench,
    interactionType: 'service_request',
    color: 'text-brand-700', bg: 'bg-brand-50', border: 'border-brand-200',
    verbDone: 'la prestation',
  },
  lost_found: {
    cta: 'Contacter', ctaIcon: MessageSquare,
    interactionType: 'contact',
    color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
    verbDone: 'le contact',
  },
};

// ─── Labels statuts ────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<InteractionStatus, string> = {
  requested:   '📨 Demande envoyée',
  pending:     '⏳ En attente de réponse',
  accepted:    '✅ Acceptée',
  rejected:    '❌ Refusée',
  in_progress: '🔄 En cours',
  done:        '✅ Terminée',
  cancelled:   '🚫 Annulée',
  disputed:    '⚠️ Litige',
};

const STATUS_COLORS: Record<InteractionStatus, string> = {
  requested:   'text-blue-600 bg-blue-50 border-blue-200',
  pending:     'text-amber-600 bg-amber-50 border-amber-200',
  accepted:    'text-emerald-600 bg-emerald-50 border-emerald-200',
  rejected:    'text-red-600 bg-red-50 border-red-200',
  in_progress: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  done:        'text-emerald-700 bg-emerald-50 border-emerald-200',
  cancelled:   'text-gray-500 bg-gray-50 border-gray-200',
  disputed:    'text-orange-600 bg-orange-50 border-orange-200',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface InteractionButtonProps {
  sourceType: InteractionSourceType;
  sourceId: string;
  receiverId: string;            // auteur/propriétaire du contenu
  userId?: string | null;        // utilisateur connecté
  className?: string;
  compact?: boolean;             // mode bouton simple (pas de panneau complet)
  ctaOverride?: string;          // surcharge du label du bouton CTA
  onInteractionCreated?: (interaction: Interaction) => void;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function InteractionButton({
  sourceType, sourceId, receiverId, userId, className, compact = false,
  ctaOverride,
  onInteractionCreated,
}: InteractionButtonProps) {
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loading, setLoading]         = useState(true);
  const [acting, setActing]           = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [fallbackActing, setFallbackActing] = useState(false);
  const supabase = createClient();
  const router   = useRouter();
  const conf = CONFIG[sourceType];
  const ctaLabel = ctaOverride || conf.cta;

  // ── Charger l'interaction existante ─────────────────────────────────────────
  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .maybeSingle();
      if (error) {
        if (error.code === '42P01') { setTableExists(false); }
        return;
      }
      setInteraction(data as Interaction | null);
    } finally { setLoading(false); }
  }, [userId, sourceType, sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ── Créer une interaction (clic CTA) ─────────────────────────────────────────
  const handleCreate = async () => {
    if (!userId || acting) return;
    if (!userId) { toast.error('Connectez-vous pour continuer'); return; }
    setActing(true);
    try {
      // Créer ou récupérer la conversation liée
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);
      const myConvIds = (parts || []).map((p: { conversation_id: string }) => p.conversation_id);
      let convId: string | null = null;
      if (myConvIds.length > 0) {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('related_type', sourceType)
          .eq('related_id', sourceId)
          .in('id', myConvIds)
          .maybeSingle();
        convId = existingConv?.id || null;
      }
      if (!convId) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ related_type: sourceType, related_id: sourceId, subject: `${ctaLabel}` })
          .select('id').single();
        convId = newConv?.id || null;
        if (convId) {
          const participantRows = userId === receiverId
            ? [{ conversation_id: convId, user_id: userId }]
            : [{ conversation_id: convId, user_id: userId }, { conversation_id: convId, user_id: receiverId }];
          await supabase.from('conversation_participants')
            .upsert(participantRows, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });
          // Message initial
          await supabase.from('messages').insert({
            conversation_id: convId, sender_id: userId,
            content: `👋 ${ctaLabel} — je voudrais en savoir plus !`,
          });
        }
      }
      // Créer l'interaction
      const { data: created, error } = await supabase
        .from('interactions')
        .upsert({
          source_type: sourceType, source_id: sourceId,
          requester_id: userId, receiver_id: receiverId,
          interaction_type: conf.interactionType,
          status: 'requested',
          conversation_id: convId,
          status_history: [{ status: 'requested', changed_at: new Date().toISOString() }],
        }, { onConflict: 'source_type,source_id,requester_id' })
        .select('*').single();
      if (error) { toast.error('Erreur lors de la demande'); return; }
      setInteraction(created as Interaction);
      onInteractionCreated?.(created as Interaction);
      toast.success('Demande envoyée !');
      if (convId) {
        setTimeout(() => window.location.href = `/messages/${convId}`, 800);
      }
    } finally { setActing(false); }
  };

  // ── Changer le statut (accept, reject, done, cancel) ─────────────────────────
  const handleStatusChange = async (newStatus: InteractionStatus, note?: string) => {
    if (!interaction || !userId || acting) return;
    setActing(true);
    try {
      const { error } = await supabase.rpc('add_interaction_history', {
        p_interaction_id: interaction.id,
        p_new_status: newStatus,
        p_user_id: userId,
        p_note: note || null,
      });
      if (error) {
        // Fallback si la fonction RPC n'existe pas encore
        await supabase.from('interactions').update({ status: newStatus }).eq('id', interaction.id);
      }
      await load();
      const msgs: Record<string, string> = {
        accepted: 'Demande acceptée ✅',
        rejected: 'Demande refusée',
        in_progress: 'Marqué en cours 🔄',
        cancelled: 'Annulé',
        done: '',
      };
      if (msgs[newStatus]) toast.success(msgs[newStatus]);
    } finally { setActing(false); }
  };

  // ── Confirmer la fin (les 2 côtés) ───────────────────────────────────────────
  const handleConfirmDone = async () => {
    if (!interaction || !userId || acting) return;
    setActing(true);
    try {
      // Essayer la fonction Supabase d'abord
      const { data: rpcDone, error: rpcErr } = await supabase.rpc('confirm_interaction_done', {
        p_interaction_id: interaction.id,
      });
      if (rpcErr) {
        // Fallback simple si RPC pas encore migrée
        const myRole = userId === interaction.requester_id ? 'requester' : 'receiver';
        const updateData = myRole === 'requester'
          ? { review_requester_done: true }
          : { review_receiver_done: true };
        await supabase.from('interactions').update(updateData).eq('id', interaction.id);
        const { data: updated } = await supabase.from('interactions').select('*').eq('id', interaction.id).single();
        if (updated?.review_requester_done && updated?.review_receiver_done) {
          await supabase.from('interactions').update({
            status: 'done', review_unlocked: true, completed_at: new Date().toISOString(),
          }).eq('id', interaction.id);
        }
      }
      await load();
      if (rpcDone) {
        toast.success('🎉 Échange terminé ! Avis débloqué pour les 2 parties.');
      } else {
        toast.success('✓ Votre confirmation est enregistrée. En attente de l\'autre partie.');
      }
    } finally { setActing(false); }
  };

  // ── Fallback : table interactions absente → simple ContactButton inline ────────
  if (!tableExists) {
    // Pas de contact avec soi-même
    if (userId === receiverId) return null;

    const handleFallbackContact = async () => {
      if (fallbackActing) return;
      if (!userId) { router.push('/connexion'); return; }
      setFallbackActing(true);
      try {
        // Chercher conv existante
        const { data: myParts } = await supabase
          .from('conversation_participants').select('conversation_id').eq('user_id', userId);
        if (myParts && myParts.length > 0) {
          const myIds = myParts.map((p: { conversation_id: string }) => p.conversation_id);
          const { data: existing } = await supabase
            .from('conversations').select('id')
            .eq('related_type', sourceType).eq('related_id', sourceId)
            .in('id', myIds).maybeSingle();
          if (existing) { router.push(`/messages/${existing.id}`); return; }
        }
        // Créer nouvelle conv
        const { data: conv } = await supabase
          .from('conversations')
          .insert({ subject: ctaLabel, related_type: sourceType, related_id: sourceId })
          .select('id').single();
        if (!conv) return;
        await supabase.from('conversation_participants').upsert(
          [{ conversation_id: conv.id, user_id: userId },
           { conversation_id: conv.id, user_id: receiverId }],
          { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
        );
        await supabase.from('messages').insert({
          conversation_id: conv.id, sender_id: userId,
          content: `👋 ${ctaLabel} — je voudrais en savoir plus !`,
        });
        router.push(`/messages/${conv.id}`);
      } finally { setFallbackActing(false); }
    };

    if (!userId) {
      return (
        <Link href="/connexion"
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all',
            conf.bg, conf.color, `border ${conf.border}`, className
          )}>
          <conf.ctaIcon className="w-4 h-4" />
          {ctaLabel}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={handleFallbackContact}
        disabled={fallbackActing}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all',
          conf.bg, conf.color, `border ${conf.border}`,
          'hover:brightness-95 disabled:opacity-50',
          className
        )}
      >
        {fallbackActing
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <conf.ctaIcon className="w-4 h-4" />}
        {fallbackActing ? 'Ouverture…' : ctaLabel}
      </button>
    );
  }
  if (loading) return <div className="h-10 w-full bg-gray-100 animate-pulse rounded-xl" />;
  if (userId === receiverId) return null; // pas de bouton pour l'auteur lui-même

  const isRequester = interaction?.requester_id === userId;
  const isReceiver  = interaction?.receiver_id === userId;
  const myDone      = isRequester ? interaction?.review_requester_done : interaction?.review_receiver_done;

  // ── Mode compact (juste le bouton CTA ou statut) ──────────────────────────────
  if (compact) {
    // Non connecté → lien vers connexion (visible et cliquable)
    if (!userId) {
      return (
        <Link
          href="/connexion"
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all',
            conf.bg, conf.color, `border ${conf.border}`, 'hover:brightness-95',
            className
          )}
        >
          <conf.ctaIcon className="w-4 h-4" />
          {ctaLabel}
        </Link>
      );
    }
    if (!interaction) {
      return (
        <button
          onClick={handleCreate}
          disabled={acting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all',
            conf.bg, conf.color, `border ${conf.border}`,
            'hover:brightness-95 disabled:opacity-50',
            className
          )}
        >
          {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <conf.ctaIcon className="w-4 h-4" />}
          {acting ? 'Envoi…' : ctaLabel}
        </button>
      );
    }
    return (
      <span className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border', STATUS_COLORS[interaction.status])}>
        {STATUS_LABELS[interaction.status]}
      </span>
    );
  }

  // ── Mode complet ──────────────────────────────────────────────────────────────
  return (
    <div className={cn('rounded-2xl border', conf.bg, conf.border, className)}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <conf.ctaIcon className={cn('w-4 h-4', conf.color)} />
          <span className={cn('text-sm font-bold', conf.color)}>
            {interaction ? STATUS_LABELS[interaction.status] : ctaLabel}
          </span>
        </div>
        {interaction && (
          <button onClick={() => setShowDetails(v => !v)} className={cn('text-xs', conf.color)}>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* ── Corps ────────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 space-y-3">

        {/* Pas encore d'interaction → bouton CTA */}
        {!interaction && userId && (
          <button
            onClick={handleCreate}
            disabled={acting}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
              'bg-white border font-bold text-sm transition-all',
              conf.color, conf.border,
              'hover:brightness-95 disabled:opacity-50'
            )}
          >
            {acting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <conf.ctaIcon className="w-4 h-4" />}
            {acting ? 'Envoi en cours…' : ctaLabel}
          </button>
        )}

        {/* Non connecté */}
        {!userId && (
          <Link href="/connexion"
            className={cn(
              'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl',
              'bg-white border font-bold text-sm',
              conf.color, conf.border
            )}
          >
            <conf.ctaIcon className="w-4 h-4" />
            Connectez-vous pour {ctaLabel.toLowerCase()}
          </Link>
        )}

        {/* Interaction existante */}
        {interaction && (
          <>
            {/* Lien conversation */}
            {interaction.conversation_id && (
              <Link href={`/messages/${interaction.conversation_id}`}
                className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />
                Voir la conversation
                <ArrowRight className="w-3 h-3 ml-auto" />
              </Link>
            )}

            {/* Actions selon statut et rôle */}
            {/* Destinataire : peut accepter ou refuser si 'requested' ou 'pending' */}
            {isReceiver && ['requested', 'pending'].includes(interaction.status) && (
              <div className="flex gap-2">
                <button onClick={() => handleStatusChange('accepted')} disabled={acting}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1">
                  {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                  Accepter
                </button>
                <button onClick={() => handleStatusChange('rejected')} disabled={acting}
                  className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1">
                  <XCircle className="w-3 h-3" /> Refuser
                </button>
              </div>
            )}

            {/* Marqué accepté → passer en cours */}
            {interaction.status === 'accepted' && (
              <button onClick={() => handleStatusChange('in_progress')} disabled={acting}
                className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                Marquer en cours
              </button>
            )}

            {/* En cours → confirmer la fin */}
            {['accepted', 'in_progress'].includes(interaction.status) && !myDone && (
              <button onClick={handleConfirmDone} disabled={acting}
                className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                Confirmer la fin de {conf.verbDone}
              </button>
            )}

            {myDone && interaction.status !== 'done' && (
              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" />
                Votre confirmation est envoyée. En attente de l&apos;autre partie…
              </p>
            )}

            {/* Terminé → avis débloqué */}
            {interaction.status === 'done' && (
              <div className="bg-white/80 rounded-xl p-3 flex items-center gap-2 border border-emerald-200">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                <p className="text-xs text-gray-700 flex-1 font-medium">
                  Échange terminé ✅ — votre avis est <strong>débloqué</strong>
                </p>
              </div>
            )}

            {/* Annuler (si pas encore terminé) */}
            {!['done', 'cancelled', 'rejected'].includes(interaction.status) && (
              <button onClick={() => handleStatusChange('cancelled')} disabled={acting}
                className="text-xs text-gray-400 hover:text-gray-600 w-full text-center mt-1">
                Annuler la demande
              </button>
            )}

            {/* Timeline dépliable */}
            {showDetails && interaction.status_history?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/50 space-y-1.5">
                <p className="text-xs font-bold text-gray-500 mb-2">Historique</p>
                {interaction.status_history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1 flex-shrink-0" />
                    <span className="font-medium">{STATUS_LABELS[h.status as InteractionStatus] || h.status}</span>
                    <span className="text-gray-400 ml-auto whitespace-nowrap">
                      {new Date(h.changed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
