'use client';

/**
 * ContactButton — Bouton de contact universel pour Biguglia Connect
 *
 * Crée ou retrouve une conversation privée contextuelle entre le visiteur
 * et l'auteur d'un contenu. Redirige ensuite vers le fil de messages.
 *
 * ISOLATION des conversations :
 *   - sourceType='community' + sourceId=themeSlug
 *     → isolation par (subject LIKE 'Communauté %') — pas de related_id UUID
 *       car le themeSlug n'est pas un UUID
 *   - sourceType=<autre> + sourceId=<UUID>
 *     → isolation stricte par (related_type, related_id)
 *   - sourceType='general' / sourceId=null
 *     → conv partagée générale (usage déprécié)
 *
 * COMPATIBILITÉ Supabase :
 *   Voie 1 : RPC create_conversation_with_message (SECURITY DEFINER — BLOC 2)
 *   Voie 2 : INSERT direct avec dégradation progressive si ENUM/CHECK manquants
 *   → fonctionne même si BLOC 1 / BLOC 2 n'ont pas encore été exécutés
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
/** Vérifie si une string ressemble à un UUID v4 */
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
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

  // ── Déduire le vrai related_type à utiliser ───────────────────────────────────
  // Pour 'artisan' → 'general' (pas de type artisan dans l'ENUM)
  // Pour 'community' → 'community' si ENUM ok, sinon 'general' en fallback
  const primaryRelType = sourceType === 'artisan' ? 'general' : sourceType;

  // Pour 'community', le sourceId est un themeSlug (text, pas UUID)
  // → on ne le stocke PAS dans related_id (colonne UUID) mais dans le subject
  const isCommunity = sourceType === 'community';
  const relatedIdUUID = (!isCommunity && sourceId && isUUID(sourceId)) ? sourceId : null;

  // Le sujet encode le contexte pour l'isolation des conversations communautaires
  const subject = sourceTitle || ctaLabel || conf.defaultLabel || 'Message';

  // ── Chercher une conv existante isolée ───────────────────────────────────────
  const findExistingConversation = async (): Promise<string | null> => {
    try {
      // 1. Conv où je participe
      const { data: myParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (!myParts || myParts.length === 0) return null;
      const myConvIds = myParts.map((p: { conversation_id: string }) => p.conversation_id);

      // 2. Intersection avec les conv où l'owner participe aussi
      const { data: ownerParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', ownerId)
        .in('conversation_id', myConvIds);

      if (!ownerParts || ownerParts.length === 0) return null;
      const sharedIds = ownerParts.map((p: { conversation_id: string }) => p.conversation_id);

      if (isCommunity) {
        // ── Communauté : isolation par subject (slug encodé dans le titre) ──────
        // Cherche une conv partagée ayant exactement ce sujet
        const { data: bySubject } = await supabase
          .from('conversations')
          .select('id')
          .eq('subject', subject)
          .in('id', sharedIds)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bySubject?.id) return bySubject.id;

        // Fallback legacy : cherche par related_type=community sans related_id
        const { data: byCommunityType } = await supabase
          .from('conversations')
          .select('id')
          .eq('subject', subject)
          .in('id', sharedIds)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return byCommunityType?.id ?? null;
      }

      if (relatedIdUUID) {
        // ── Cas UUID : isolation stricte par (related_type, related_id) ─────────
        const relType = primaryRelType;
        const { data: exact } = await supabase
          .from('conversations')
          .select('id')
          .eq('related_type', relType)
          .eq('related_id', relatedIdUUID)
          .in('id', sharedIds)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (exact?.id) return exact.id;

        // Fallback : related_id seul
        const { data: byId } = await supabase
          .from('conversations')
          .select('id')
          .eq('related_id', relatedIdUUID)
          .in('id', sharedIds)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return byId?.id ?? null;
      }

      // ── Cas général : conv partagée la plus récente sans related_id ──────────
      const { data: genConv } = await supabase
        .from('conversations')
        .select('id')
        .in('id', sharedIds)
        .is('related_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return genConv?.id ?? null;

    } catch {
      return null;
    }
  };

  // ── Créer une conversation avec dégradation progressive ──────────────────────
  /**
   * Stratégie multi-niveaux :
   *   1. RPC SECURITY DEFINER (contourne RLS, accepte slug communauté)
   *   2. INSERT avec related_type correct + related_id UUID (si applicable)
   *   3. INSERT avec related_type = 'general' + related_id UUID
   *   4. INSERT avec related_type = 'general' sans related_id
   *   5. INSERT minimal (subject seulement) → toujours fonctionnel
   *
   * Pour 'community', on n'envoie jamais de related_id (UUID invalide).
   * L'isolation est garantie par le subject (ex: "Communauté Collectionneurs").
   */
  const createConversation = async (initialMsg: string): Promise<{ id: string | null; error?: unknown }> => {

    // ─── Voie 1 : RPC SECURITY DEFINER ────────────────────────────────────────
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'create_conversation_with_message',
      {
        p_subject:      subject,
        p_related_type: primaryRelType,
        // Pour communauté : p_related_id = themeSlug (la fonction gère le cas texte vs UUID)
        p_related_id:   sourceId || null,
        p_owner_id:     ownerId,
        p_initial_msg:  initialMsg,
      }
    );
    if (rpcData) return { id: rpcData as string };

    // Log silencieux pour debug
    if (rpcErr) {
      console.warn('[ContactButton] RPC failed:', rpcErr.code, rpcErr.message);
    }

    // ─── Voie 2+ : INSERT direct avec dégradation ─────────────────────────────
    // On tente plusieurs payloads du plus précis au plus générique
    const payloads: object[] = [];

    if (isCommunity) {
      // Communauté → jamais de related_id UUID, isolation par subject
      payloads.push(
        { subject, related_type: 'community' },    // idéal si BLOC 1 exécuté
        { subject, related_type: 'general' },      // fallback si ENUM incomplet
        { subject },                               // fallback minimal
      );
    } else if (relatedIdUUID) {
      payloads.push(
        { subject, related_type: primaryRelType, related_id: relatedIdUUID },
        { subject, related_type: 'general',      related_id: relatedIdUUID },
        { subject, related_type: 'general' },
        { subject },
      );
    } else {
      payloads.push(
        { subject, related_type: primaryRelType },
        { subject, related_type: 'general' },
        { subject },
      );
    }

    let lastErr: unknown = rpcErr;
    for (const payload of payloads) {
      const { data, error } = await supabase
        .from('conversations')
        .insert(payload)
        .select('id')
        .single();

      if (data?.id) {
        // Succès → ajouter les participants et le message initial
        await supabase.from('conversation_participants').upsert(
          [
            { conversation_id: data.id, user_id: userId },
            { conversation_id: data.id, user_id: ownerId },
          ],
          { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
        );
        if (initialMsg) {
          await supabase.from('messages').insert({
            conversation_id: data.id,
            sender_id: userId,
            content: initialMsg,
          });
        }
        return { id: data.id };
      }

      lastErr = error;
      // Si permission refusée → inutile de continuer
      const errCode = (error as { code?: string })?.code;
      if (errCode === '42501') break;
    }

    return { id: null, error: lastErr };
  };

  // ── Handler principal ─────────────────────────────────────────────────────────
  const handleContact = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1. Chercher conv existante
      const existingConvId = await findExistingConversation();

      if (existingConvId) {
        onConversationReady?.(existingConvId);
        router.push(`/messages/${existingConvId}`);
        return;
      }

      // 2. Créer une nouvelle conversation
      const initialMsg = prefillMsg ||
        (isCommunity
          ? `Bonjour, je vous contacte depuis la communauté ${sourceTitle || ''}.`
          : sourceType === 'listing'
            ? `Bonjour, je suis intéressé(e) par votre annonce${sourceTitle ? ` "${sourceTitle}"` : ''} — est-elle toujours disponible ?`
            : `Bonjour${sourceTitle ? ` ${sourceTitle.split(' ')[0]}` : ''}, je vous contacte via Biguglia Connect.`
        );

      const result = await createConversation(initialMsg);

      if (!result.id) {
        const err = result.error as { code?: string; message?: string } | null;
        const code = err?.code || '?';
        console.error('[ContactButton] Échec création conversation:', code, err?.message);

        // Message d'erreur utilisateur selon le code
        const hint =
          code === '42501'
            ? 'Permission refusée — exécutez BLOC 2 dans Admin → Migration DB'
            : code === '42703'
              ? 'Colonne manquante — exécutez BLOC 2 dans Admin → Migration DB'
              : code === '23514' || code === '22P02'
                ? 'Contrainte base de données — exécutez BLOC 1 puis BLOC 2 dans Admin → Migration DB'
                : `Impossible d'ouvrir la conversation [${code}]`;

        toast.error(hint, { duration: 7000 });
        return;
      }

      // 3. Redirection vers la conversation
      onConversationReady?.(result.id);
      router.push(`/messages/${result.id}`);

    } catch (err) {
      console.error('[ContactButton] Exception inattendue:', err);
      toast.error('Erreur inattendue — réessayez dans un instant');
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
