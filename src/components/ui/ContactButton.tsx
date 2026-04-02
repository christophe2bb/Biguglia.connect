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
  listing:         { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'   },
  equipment:       { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200'   },
  help_request:    { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  association:     { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  collection_item: { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200'   },
  outing:          { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200'},
  event:           { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  service_request: { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-brand-700',   bg: 'bg-brand-50',   border: 'border-brand-200'  },
  lost_found:      { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'  },
  artisan:         { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-brand-700',   bg: 'bg-brand-50',   border: 'border-brand-200'  },
  general:         { defaultLabel: 'Message privé',           icon: MessageSquare, color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200'   },
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
  // primary = fond coloré vif (bg-color-500 text-white) pour être bien visible
  const solidBg: Record<ContactSourceType, string> = {
    listing:         'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
    equipment:       'bg-teal-500 hover:bg-teal-600 text-white border-teal-500',
    help_request:    'bg-orange-500 hover:bg-orange-600 text-white border-orange-500',
    association:     'bg-purple-500 hover:bg-purple-600 text-white border-purple-500',
    collection_item: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500',
    outing:          'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500',
    event:           'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500',
    service_request: 'bg-brand-500 hover:bg-brand-600 text-white border-brand-500',
    lost_found:      'bg-amber-500 hover:bg-amber-600 text-white border-amber-500',
    artisan:         'bg-brand-500 hover:bg-brand-600 text-white border-brand-500',
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

  // ── Handler principal ────────────────────────────────────────────────────────
  const handleContact = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1. Chercher une conversation existante entre userId et ownerId pour ce contenu
      let existingConvId: string | null = null;

      if (sourceId) {
        // Trouver toutes les conversations de l'utilisateur
        const { data: myParts } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId);

        if (myParts && myParts.length > 0) {
          const myConvIds = myParts.map((p: { conversation_id: string }) => p.conversation_id);
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('related_type', sourceType === 'artisan' ? 'service_request' : sourceType)
            .eq('related_id', sourceId)
            .in('id', myConvIds)
            .maybeSingle();
          existingConvId = existingConv?.id || null;
        }
      } else {
        // Conversation générale : chercher par participants
        const { data: myParts } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId);

        if (myParts && myParts.length > 0) {
          const myConvIds = myParts.map((p: { conversation_id: string }) => p.conversation_id);
          // Trouver une conversation commune avec ownerId et related_type=general
          const { data: ownerParts } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', ownerId)
            .in('conversation_id', myConvIds);
          if (ownerParts && ownerParts.length > 0) {
            const sharedIds = ownerParts.map((p: { conversation_id: string }) => p.conversation_id);
            const { data: genConv } = await supabase
              .from('conversations')
              .select('id')
              .eq('related_type', 'general')
              .in('id', sharedIds)
              .maybeSingle();
            existingConvId = genConv?.id || null;
          }
        }
      }

      // 2. Conversation existante → ouvrir directement
      if (existingConvId) {
        onConversationReady?.(existingConvId);
        router.push(`/messages/${existingConvId}`);
        return;
      }

      // 3. Créer une nouvelle conversation
      const relatedType = sourceType === 'artisan' ? 'general' : sourceType;
      const subject = sourceTitle
        ? `${conf.defaultLabel} — ${sourceTitle}`
        : conf.defaultLabel;

      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          subject,
          related_type: relatedType,
          related_id: sourceId || null,
        })
        .select('id')
        .single();

      if (convError || !newConv) {
        toast.error('Impossible de créer la conversation');
        return;
      }

      // 4. Ajouter les deux participants
      await supabase.from('conversation_participants').upsert(
        [
          { conversation_id: newConv.id, user_id: userId },
          { conversation_id: newConv.id, user_id: ownerId },
        ],
        { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
      );

      // 5. Message initial pré-rempli
      const initialMsg = prefillMsg || `👋 Bonjour, ${conf.defaultLabel.toLowerCase()}${sourceTitle ? ` — "${sourceTitle}"` : ''} !`;
      await supabase.from('messages').insert({
        conversation_id: newConv.id,
        sender_id: userId,
        content: initialMsg,
      });

      onConversationReady?.(newConv.id);
      router.push(`/messages/${newConv.id}`);
    } catch (err) {
      console.error('[ContactButton] Error:', err);
      toast.error('Une erreur est survenue');
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
