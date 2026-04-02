'use client';

/**
 * ContactButton — Bouton de contact universel pour Biguglia Connect
 *
 * Crée ou retrouve une conversation privée contextuelle entre le visiteur
 * et l'auteur d'un contenu, quel que soit le thème. Redirige ensuite vers
 * le fil de messages.
 *
 * Paramètres :
 *   sourceType   : type de contenu (listing, equipment, help_request, etc.) ou 'general'
 *   sourceId     : UUID du contenu (peut être null pour 'general')
 *   sourceTitle  : titre affiché dans la bannière de contexte
 *   ownerId      : UUID du propriétaire du contenu
 *   userId       : UUID de l'utilisateur connecté (null = non connecté)
 *   ctaLabel     : texte du bouton (override automatique si absent)
 *   prefillMsg   : message pré-rempli envoyé à l'ouverture
 *   variant      : 'primary' | 'secondary' | 'ghost'
 *   size         : 'sm' | 'md' | 'lg'
 *   className    : classes Tailwind supplémentaires
 *   showIcon     : affiche l'icône (défaut true)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Loader2, ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type ContactSourceType =
  | 'listing' | 'equipment' | 'help_request' | 'association'
  | 'collection_item' | 'outing' | 'event' | 'service_request'
  | 'lost_found' | 'artisan' | 'general';

// ─── Config par source_type ────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<ContactSourceType, {
  defaultLabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  listing:         { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'   },
  equipment:       { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200'   },
  help_request:    { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  association:     { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  collection_item: { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200'   },
  outing:          { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200'},
  event:           { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  service_request: { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'  },
  lost_found:      { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'  },
  artisan:         { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'   },
  general:         { defaultLabel: 'Message privé', icon: MessageSquare, color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200'   },
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface ContactButtonProps {
  sourceType: ContactSourceType;
  sourceId?: string | null;
  sourceTitle?: string;
  ownerId: string;
  userId?: string | null;
  ctaLabel?: string;
  prefillMsg?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
  /** Callback appelé après la redirection (optionnel) */
  onConversationReady?: (conversationId: string) => void;
}

// ─── Composant ─────────────────────────────────────────────────────────────────
export default function ContactButton({
  sourceType,
  sourceId,
  sourceTitle,
  ownerId,
  userId,
  ctaLabel,
  prefillMsg,
  variant = 'primary',
  size = 'md',
  className,
  showIcon = true,
  onConversationReady,
}: ContactButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const conf = SOURCE_CONFIG[sourceType];

  // ── Tailles ──────────────────────────────────────────────────────────────────
  const sizeClasses = {
    sm:  'px-3 py-1.5 text-xs gap-1.5',
    md:  'px-4 py-2 text-sm gap-2',
    lg:  'px-5 py-2.5 text-base gap-2',
  }[size];

  const iconSize = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' }[size];

  // ── Variantes ────────────────────────────────────────────────────────────────
  // primary = fond coloré vif pour être bien visible
  const solidBg: Record<ContactSourceType, string> = {
    listing:         'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
    equipment:       'bg-teal-500 hover:bg-teal-600 text-white border-teal-500',
    help_request:    'bg-orange-500 hover:bg-orange-600 text-white border-orange-500',
    association:     'bg-purple-500 hover:bg-purple-600 text-white border-purple-500',
    collection_item: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500',
    outing:          'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500',
    event:           'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500',
    service_request: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
    lost_found:      'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
    artisan:         'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
    general:         'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
  };
  const variantClasses = {
    primary:   `${solidBg[sourceType]} border`,
    secondary: `bg-white ${conf.color} border ${conf.border} hover:${conf.bg}`,
    ghost:     `${conf.color} hover:${conf.bg} border border-transparent`,
  }[variant];

  // ── Non connecté → lien connexion ────────────────────────────────────────────
  if (!userId) {
    return (
      <Link
        href="/connexion"
        className={cn(
          'inline-flex items-center font-bold rounded-xl transition-all',
          sizeClasses, variantClasses, className
        )}
      >
        {showIcon && <conf.icon className={iconSize} />}
        {ctaLabel || conf.defaultLabel}
        <ArrowRight className={iconSize} />
      </Link>
    );
  }

  // ── Pas de contact avec soi-même ─────────────────────────────────────────────
  if (userId === ownerId) return null;

  // ── Helper: créer conversation via RPC puis INSERT direct en fallback ────────
  /**
   * Stratégie principale : appel RPC create_conversation_with_message (SECURITY DEFINER)
   *   → contourne les RLS, trouve ou crée la conversation en une seule requête
   *   → nécessite d'avoir exécuté le BLOC 2 dans Supabase
   *
   * Fallback si la fonction RPC n'existe pas encore (code PGRST202 ou 42883) :
   *   INSERT direct avec 4 tentatives de payload de plus en plus permissives
   */
  const tryCreateConversation = async (
    subject: string,
    relatedType: string,
    relatedId: string | null,
    ownerId: string,
    initialMsg: string,
  ) => {
    // ── Voie 1 : RPC SECURITY DEFINER (contourne toutes les RLS) ─────────────
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'create_conversation_with_message',
      {
        p_subject:      subject,
        p_related_type: relatedType,
        p_related_id:   relatedId,
        p_owner_id:     ownerId,
        p_initial_msg:  initialMsg,
      }
    );
    if (rpcData) {
      console.info('[ContactButton] RPC OK, conv_id:', rpcData);
      return { id: rpcData as string, via: 'rpc' };
    }
    // Si la fonction n'existe pas encore → tenter l'INSERT direct
    const rpcNotFound = rpcErr?.code === 'PGRST202' || rpcErr?.code === '42883' || rpcErr?.message?.includes('Could not find');
    if (!rpcNotFound) {
      console.error('[ContactButton] RPC erreur:', rpcErr?.code, rpcErr?.message);
      // RLS ou autre erreur même via RPC → retourner l'erreur directement
      return { id: null, error: rpcErr };
    }
    console.warn('[ContactButton] Fonction RPC absente, tentative INSERT direct (exécutez le BLOC 2)');

    // ── Voie 2 : INSERT direct (fallback si BLOC 2 pas encore exécuté) ───────
    const payloads = [
      { subject, related_type: relatedType, related_id: relatedId },
      { subject, related_type: 'general',   related_id: relatedId },
      { subject, related_type: 'general' },
      { subject },
    ];
    let lastErr = rpcErr;
    for (let i = 0; i < payloads.length; i++) {
      const { data, error } = await supabase
        .from('conversations')
        .insert(payloads[i])
        .select('id').single();
      if (data?.id) return { id: data.id as string, via: `insert-s${i + 1}` };
      console.warn(`[ContactButton] INSERT S${i + 1}:`, error?.code, error?.message);
      lastErr = error;
      if (error?.code === '42501') break; // RLS bloque tout → inutile de continuer
    }
    return { id: null, error: lastErr };
  };

  // ── Handler principal ────────────────────────────────────────────────────────
  const handleContact = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Mapper sourceType vers related_type pour la DB
      const relatedType = sourceType === 'artisan' ? 'general' : sourceType;

      // ── 1. Chercher une conversation existante ─────────────────────────────
      let existingConvId: string | null = null;

      const { data: myParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (myParts && myParts.length > 0) {
        const myConvIds = myParts.map((p: { conversation_id: string }) => p.conversation_id);

        if (sourceId) {
          // Cherche par related_id d'abord
          const { data: byRelatedId } = await supabase
            .from('conversations')
            .select('id')
            .eq('related_id', sourceId)
            .in('id', myConvIds)
            .maybeSingle();
          existingConvId = byRelatedId?.id || null;
        }

        if (!existingConvId) {
          // Cherche une conversation partagée avec l'owner (tous types)
          const { data: ownerParts } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', ownerId)
            .in('conversation_id', myConvIds);

          if (ownerParts && ownerParts.length > 0) {
            const sharedIds = ownerParts.map((p: { conversation_id: string }) => p.conversation_id);
            // Si sourceId, cherche spécifiquement ; sinon prend le plus récent
            if (sourceId) {
              const { data: byBoth } = await supabase
                .from('conversations')
                .select('id')
                .eq('related_id', sourceId)
                .in('id', sharedIds)
                .maybeSingle();
              existingConvId = byBoth?.id || null;
            } else {
              // Conversation générale entre les deux utilisateurs
              const { data: genConv } = await supabase
                .from('conversations')
                .select('id')
                .in('id', sharedIds)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              existingConvId = genConv?.id || null;
            }
          }
        }
      }

      // ── 2. Conversation existante → ouvrir ─────────────────────────────────
      if (existingConvId) {
        onConversationReady?.(existingConvId);
        router.push(`/messages/${existingConvId}`);
        return;
      }

      // ── 3. Créer une nouvelle conversation ─────────────────────────────────
      const subject = sourceTitle || ctaLabel || conf.defaultLabel || 'Message';

      const initialMsg = prefillMsg
        || `👋 Bonjour ! Je vous contacte à propos de${sourceTitle ? ` "${sourceTitle}"` : ' votre annonce'}.`;

      const result = await tryCreateConversation(
        subject, relatedType, sourceId || null, ownerId, initialMsg
      );

      if (!result.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = (result as any).error;
        const code = err?.code || '?';
        const hint = code === '42501'
          ? 'Permission refusée — exécutez BLOC 2 dans Admin → Migration DB'
          : code === '23514' || code === '22P02'
          ? 'Contrainte related_type — exécutez BLOC 1 dans Admin → Migration DB'
          : code === '42703'
          ? 'Colonne manquante — exécutez BLOC 2 dans Admin → Migration DB'
          : `Erreur [${code}] — consultez la console`;
        toast.error(hint, { duration: 6000 });
        return;
      }

      const newConvId = result.id;

      // ── 4 & 5. Participants + message (si INSERT direct, pas via RPC) ───────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((result as any).via !== 'rpc') {
        await supabase.from('conversation_participants').upsert(
          [
            { conversation_id: newConvId, user_id: userId },
            { conversation_id: newConvId, user_id: ownerId },
          ],
          { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
        );
        await supabase.from('messages').insert({
          conversation_id: newConvId,
          sender_id: userId,
          content: initialMsg,
        });
      }

      // ── 6. Redirection ─────────────────────────────────────────────────────
      onConversationReady?.(newConvId);
      router.push(`/messages/${newConvId}`);

    } catch (err) {
      console.error('[ContactButton] Exception inattendue:', err);
      toast.error('Erreur inattendue — consultez la console');
    } finally {
      setLoading(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleContact}
      disabled={loading}
      className={cn(
        'inline-flex items-center font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses, variantClasses, className
      )}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, 'animate-spin')} />
      ) : (
        showIcon && <conf.icon className={iconSize} />
      )}
      {loading ? 'Ouverture…' : (ctaLabel || conf.defaultLabel)}
    </button>
  );
}
