'use client';

/**
 * ContactButton — Bouton de contact universel pour Biguglia Connect
 *
 * Crée ou retrouve une conversation privée contextuelle entre le visiteur
 * et l'auteur d'un contenu, quel que soit le thème. Redirige ensuite vers
 * le fil de messages.
 *
 * Paramètres :
 *   sourceType   : type de contenu (listing, equipment, help_request, etc.)
 *                  'community' = conversation isolée par thème (sourceId = themeSlug)
 *                  'general'   = conversation libre (sourceId = null, ÉVITER)
 *   sourceId     : UUID du contenu OU themeSlug pour 'community'
 *   sourceTitle  : titre affiché dans la bannière de contexte
 *   ownerId      : UUID du propriétaire du contenu
 *   userId       : UUID de l'utilisateur connecté (null = non connecté)
 *   ctaLabel     : texte du bouton (override automatique si absent)
 *   prefillMsg   : message pré-rempli envoyé à l'ouverture
 *   variant      : 'primary' | 'secondary' | 'ghost'
 *   size         : 'sm' | 'md' | 'lg'
 *   className    : classes Tailwind supplémentaires
 *   showIcon     : affiche l'icône (défaut true)
 *
 * ISOLATION des conversations :
 *   Chaque paire (userId, ownerId, sourceType, sourceId) génère UNE conversation unique.
 *   Pour 'community', sourceId = themeSlug → une conv par thème entre deux membres.
 *   Pour les annonces/matériel/etc., sourceId = UUID de l'objet → une conv par objet.
 *   Pour 'general', on cherche la conv partagée la plus récente (usage interne seulement).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type ContactSourceType =
  | 'listing' | 'equipment' | 'help_request' | 'association'
  | 'collection_item' | 'outing' | 'event' | 'service_request'
  | 'lost_found' | 'artisan' | 'community' | 'general';

// ─── Config visuelle par source_type ──────────────────────────────────────────
const SOURCE_CONFIG: Record<ContactSourceType, {
  defaultLabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  listing:         { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'   },
  equipment:       { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200'   },
  help_request:    { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  association:     { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  collection_item: { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200'   },
  outing:          { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200'},
  event:           { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  service_request: { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'  },
  lost_found:      { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'  },
  artisan:         { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'   },
  // 'community' : conversation isolée par thème — sourceId = themeSlug
  community:       { defaultLabel: 'Envoyer un message', icon: MessageSquare, color: 'text-brand-700',  bg: 'bg-brand-50',   border: 'border-brand-200'  },
  general:         { defaultLabel: 'Discuter en privé', icon: MessageSquare, color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200'   },
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

  // ── Tailles ───────────────────────────────────────────────────────────────────
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  }[size];

  const iconSize = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' }[size];

  // ── Variantes visuelles ───────────────────────────────────────────────────────
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
    community:       'bg-brand-600 hover:bg-brand-700 text-white border-brand-600',
    general:         'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
  };
  const variantClasses = {
    primary:   `${solidBg[sourceType]} border`,
    secondary: `bg-white ${conf.color} border ${conf.border} hover:${conf.bg}`,
    ghost:     `${conf.color} hover:${conf.bg} border border-transparent`,
  }[variant];

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (!ownerId) return null;

  // Non connecté → lien vers connexion
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

  // Pas de contact avec soi-même
  if (userId === ownerId) return null;

  // ── Chercher une conv existante strictement isolée ────────────────────────────
  /**
   * Logique d'isolation :
   *   - Si sourceId est fourni (annonce, objet, thème) → on cherche UNIQUEMENT
   *     une conversation ayant ce même related_id ET ce même related_type.
   *     Cela garantit qu'une conv "collectionneurs" ≠ conv "promenades".
   *   - Si sourceId est null (cas 'general') → on cherche une conv partagée
   *     quelconque (usage déprecié, éviter).
   */
  const findExistingConversation = async (): Promise<string | null> => {
    // Les conv où je participe
    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!myParts || myParts.length === 0) return null;
    const myConvIds = myParts.map((p: { conversation_id: string }) => p.conversation_id);

    // Les conv où l'owner participe aussi (intersection)
    const { data: ownerParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', ownerId)
      .in('conversation_id', myConvIds);

    if (!ownerParts || ownerParts.length === 0) return null;
    const sharedIds = ownerParts.map((p: { conversation_id: string }) => p.conversation_id);

    if (sourceId) {
      // ── Cas avec sourceId : isolation stricte par (related_type, related_id) ──
      // On cherche une conv qui correspond EXACTEMENT à ce contexte
      const relType = sourceType === 'artisan' ? 'general' : sourceType;
      const { data: exact } = await supabase
        .from('conversations')
        .select('id')
        .eq('related_type', relType)
        .eq('related_id', sourceId)
        .in('id', sharedIds)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exact?.id) return exact.id;

      // Fallback : cherche juste par related_id (compat anciennes convs sans related_type)
      const { data: byId } = await supabase
        .from('conversations')
        .select('id')
        .eq('related_id', sourceId)
        .in('id', sharedIds)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return byId?.id ?? null;
    }

    // ── Cas sans sourceId ('general') : prend la conv partagée la plus récente ──
    // NOTE: ce cas est déprécié — toujours passer un sourceId quand possible
    const { data: genConv } = await supabase
      .from('conversations')
      .select('id, related_type, related_id')
      .in('id', sharedIds)
      .is('related_id', null)           // seulement les conv sans contexte spécifique
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return genConv?.id ?? null;
  };

  // ── Créer une nouvelle conversation via RPC puis INSERT direct ────────────────
  const tryCreateConversation = async (
    subject: string,
    relatedType: string,
    relatedId: string | null,
    ownerIdArg: string,
    initialMsg: string,
  ) => {
    // Voie 1 : RPC SECURITY DEFINER
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'create_conversation_with_message',
      {
        p_subject:      subject,
        p_related_type: relatedType,
        p_related_id:   relatedId,
        p_owner_id:     ownerIdArg,
        p_initial_msg:  initialMsg,
      }
    );
    if (rpcData) return { id: rpcData as string, via: 'rpc' };

    const rpcNotFound =
      rpcErr?.code === 'PGRST202' ||
      rpcErr?.code === '42883' ||
      rpcErr?.message?.includes('Could not find');

    if (!rpcNotFound) return { id: null, error: rpcErr };

    // Voie 2 : INSERT direct (fallback)
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
      lastErr = error;
      if (error?.code === '42501') break;
    }
    return { id: null, error: lastErr };
  };

  // ── Handler principal ─────────────────────────────────────────────────────────
  const handleContact = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1. Chercher conv existante (isolation stricte si sourceId fourni)
      const existingConvId = await findExistingConversation();

      if (existingConvId) {
        onConversationReady?.(existingConvId);
        router.push(`/messages/${existingConvId}`);
        return;
      }

      // 2. Créer une nouvelle conversation
      const subject   = sourceTitle || ctaLabel || conf.defaultLabel || 'Message';
      const relatedType = sourceType === 'artisan' ? 'general' : sourceType;
      // Pour 'community', sourceId = themeSlug (string non-UUID) → stocker tel quel
      const relatedId = sourceId || null;

      const initialMsg = prefillMsg ||
        (sourceType === 'community'
          ? `👋 Bonjour ! Je vous contacte depuis la communauté ${sourceTitle || ''}.`
          : `👋 Bonjour ! Je vous contacte à propos de${sourceTitle ? ` "${sourceTitle}"` : ' votre annonce'}.`
        );

      const result = await tryCreateConversation(subject, relatedType, relatedId, ownerId, initialMsg);

      if (!result.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = (result as any).error;
        const code = err?.code || '?';
        const hint =
          code === '42501' ? 'Permission refusée — exécutez BLOC 2 dans Admin → Migration DB' :
          code === '23514' || code === '22P02' ? 'Contrainte related_type — exécutez BLOC 1 dans Admin → Migration DB' :
          code === '42703' ? 'Colonne manquante — exécutez BLOC 2 dans Admin → Migration DB' :
          `Erreur [${code}] — consultez la console`;
        toast.error(hint, { duration: 6000 });
        return;
      }

      const newConvId = result.id;

      // 3. Participants + message si INSERT direct (pas via RPC)
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

      // 4. Redirection
      onConversationReady?.(newConvId);
      router.push(`/messages/${newConvId}`);

    } catch (err) {
      console.error('[ContactButton] Exception:', err);
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
