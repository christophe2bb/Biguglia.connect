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

  // ── Helper: créer conversation avec plusieurs stratégies ────────────────────
  /**
   * related_type est un ENUM PostgreSQL dans Supabase.
   * On essaie dans l'ordre :
   *   S1 — payload complet avec le type exact
   *   S2 — payload avec related_type = 'general' (valeur de repli sûre)
   *   S3 — payload sans related_id (cas où sourceId invalide)
   *   S4 — payload minimal : uniquement subject + related_type='general'
   *
   * Si une erreur 42501 (RLS) apparaît à toutes les étapes,
   * c'est un problème de politique RLS → message d'erreur spécifique.
   */
  const tryCreateConversation = async (subject: string, relatedType: string, relatedId: string | null) => {
    // Stratégie 1 : type exact + related_id
    const { data: d1, error: e1 } = await supabase
      .from('conversations')
      .insert({ subject, related_type: relatedType, related_id: relatedId })
      .select('id')
      .single();
    if (d1?.id) return { id: d1.id as string };
    console.warn('[ContactButton] S1 échoué:', e1?.code, e1?.message, '| payload:', { related_type: relatedType, related_id: relatedId });

    // Si erreur RLS (42501) sur S1 → inutile de continuer avec d'autres payloads
    // La RLS bloque TOUS les inserts, pas juste celui-là
    if (e1?.code === '42501') {
      return { id: null, error: e1 };
    }

    // Stratégie 2 : related_type = 'general' + related_id
    const { data: d2, error: e2 } = await supabase
      .from('conversations')
      .insert({ subject, related_type: 'general', related_id: relatedId })
      .select('id')
      .single();
    if (d2?.id) return { id: d2.id as string };
    console.warn('[ContactButton] S2 échoué:', e2?.code, e2?.message);

    if (e2?.code === '42501') {
      return { id: null, error: e2 };
    }

    // Stratégie 3 : related_type = 'general' sans related_id
    const { data: d3, error: e3 } = await supabase
      .from('conversations')
      .insert({ subject, related_type: 'general' })
      .select('id')
      .single();
    if (d3?.id) return { id: d3.id as string };
    console.warn('[ContactButton] S3 échoué:', e3?.code, e3?.message);

    if (e3?.code === '42501') {
      return { id: null, error: e3 };
    }

    // Stratégie 4 : uniquement subject (laisse la DB mettre la valeur par défaut)
    const { data: d4, error: e4 } = await supabase
      .from('conversations')
      .insert({ subject })
      .select('id')
      .single();
    if (d4?.id) return { id: d4.id as string };
    console.error('[ContactButton] S4 échoué:', e4?.code, e4?.message);

    return { id: null, error: e1 || e2 || e3 || e4 };
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
      const subject = sourceTitle
        || ctaLabel
        || conf.defaultLabel
        || 'Message';

      const result = await tryCreateConversation(subject, relatedType, sourceId || null);

      if (!result.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = (result as any).error;
        const code = err?.code || '?';
        const hint = code === '42501'
          ? 'Permission refusée — exécutez le SQL Fix dans Admin → Migration DB'
          : code === '23514' || code === '22P02'
          ? 'Contrainte related_type — exécutez le SQL Fix dans Admin → Migration DB'
          : code === '42703'
          ? 'Colonne manquante — exécutez le SQL Fix dans Admin → Migration DB'
          : `Erreur [${code}] — consultez la console`;
        toast.error(hint, { duration: 6000 });
        return;
      }

      const newConvId = result.id;

      // ── 4. Ajouter les participants ─────────────────────────────────────────
      const { error: partErr } = await supabase
        .from('conversation_participants')
        .upsert(
          [
            { conversation_id: newConvId, user_id: userId },
            { conversation_id: newConvId, user_id: ownerId },
          ],
          { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
        );

      if (partErr) {
        console.warn('[ContactButton] Participants upsert erreur:', partErr.code, partErr.message);
        // On continue malgré l'erreur (la conversation est créée)
      }

      // ── 5. Message initial ─────────────────────────────────────────────────
      const initialMsg = prefillMsg
        || `👋 Bonjour ! Je vous contacte à propos de${sourceTitle ? ` "${sourceTitle}"` : ' votre annonce'}.`;

      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConvId,
          sender_id: userId,
          content: initialMsg,
        });

      if (msgErr) {
        console.warn('[ContactButton] Message insert erreur:', msgErr.code, msgErr.message);
        // On continue malgré l'erreur (la conversation et les participants sont créés)
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
