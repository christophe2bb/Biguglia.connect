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
          'inline-flex items-center font-bold rounded-xl transition-colors',
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
  // 'artisan' est désormais dans l'enum related_type → on l'envoie tel quel
  // Pour 'community', le sourceId est un themeSlug (text, pas UUID)
  // → on ne le stocke PAS dans related_id (colonne UUID) mais dans le subject
  const isCommunity = sourceType === 'community';
  const primaryRelType = sourceType; // tous les types sont maintenant dans l'enum Supabase
  const relatedIdUUID = (!isCommunity && sourceId && isUUID(sourceId)) ? sourceId : null;

  // Le sujet encode le contexte pour l'isolation des conversations communautaires
  const subject = sourceTitle || ctaLabel || conf.defaultLabel || 'Message';

  // ── Handler principal (via API admin — contourne la récursion RLS) ───────────
  const handleContact = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Récupérer le token pour l'auth Bearer
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const initialMsg = prefillMsg ||
        (isCommunity
          ? `Bonjour, je vous contacte depuis la communauté ${sourceTitle || ''}.`
          : sourceType === 'listing'
            ? `Bonjour, je suis intéressé(e) par votre annonce${sourceTitle ? ` "${sourceTitle}"` : ''} — est-elle toujours disponible ?`
            : `Bonjour${sourceTitle ? ` ${sourceTitle.split(' ')[0]}` : ''}, je vous contacte via Biguglia Connect.`
        );

      const res = await fetch('/api/messages/start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ownerId: ownerId,
          subject: subject,
          relatedType: isCommunity ? 'community' : primaryRelType,
          relatedId: relatedIdUUID,
          initialMsg,
        }),
      }).catch(() => null);

      if (!res) {
        toast.error('Erreur réseau — réessayez');
        return;
      }
      if (res.status === 401) {
        toast.error('Connectez-vous pour envoyer un message');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[ContactButton] API error:', res.status, data.error);
        toast.error(data.error || `Impossible d'ouvrir la conversation`);
        return;
      }

      const responseData = await res.json();
      console.log('[ContactButton] réponse API:', responseData);
      const { conversationId } = responseData;
      if (!conversationId) {
        toast.error('Impossible d\'ouvrir la conversation');
        return;
      }

      console.log('[ContactButton] redirection vers /messages/' + conversationId);
      onConversationReady?.(conversationId);
      router.push(`/messages/${conversationId}`);

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
        'inline-flex items-center font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
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
