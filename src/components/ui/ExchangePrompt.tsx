'use client';

/**
 * ExchangePrompt — Invite à confirmer la fin d'un échange
 *
 * Affiché sur les fiches (annonce, matériel, coup de main…) pour
 * guider l'utilisateur vers la conversation et le panneau de
 * confirmation, qui débloque les avis vérifiés.
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCheck, MessageSquare, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ExchangePromptProps {
  targetType: 'listing' | 'equipment' | 'help_request' | 'association' | 'collection_item';
  targetId: string;
  authorId?: string;
  userId?: string | null;
  className?: string;
}

export default function ExchangePrompt({
  targetType, targetId, authorId, userId, className,
}: ExchangePromptProps) {
  const [convId, setConvId]     = useState<string | null>(null);
  const [exchStatus, setStatus] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const check = async () => {
      // Utiliser l'API admin pour contourner la récursion infinie dans les RLS
      // de conversation_participants / conversations
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = `/api/messages/check-conversation?relatedType=${encodeURIComponent(targetType)}&relatedId=${encodeURIComponent(targetId)}`;
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }).catch(() => null);
      if (res?.ok) {
        const json = await res.json().catch(() => null);
        setConvId(json?.conversationId || null);
        setStatus(json?.exchangeStatus || null);
      }
      setLoading(false);
    };
    check();
  }, [userId, targetType, targetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pas connecté, pas de conversation, ou chargement → rien
  if (loading || !userId || !convId) return null;
  // Échange déjà confirmé → rien (géré par RatingWidget)
  if (exchStatus === 'done') return null;

  const isAuthor = userId === authorId;

  return (
    <div className={cn(
      'rounded-2xl border border-emerald-200 bg-emerald-50 p-4',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-xl flex-shrink-0">
          <CheckCheck className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-emerald-800 text-sm mb-1">
            {exchStatus === 'pending_confirmation'
              ? '⏳ Confirmation en attente'
              : '🤝 Échange terminé ?'
            }
          </p>
          <p className="text-xs text-emerald-700 leading-relaxed mb-3">
            {exchStatus === 'pending_confirmation'
              ? 'Une des parties a confirmé la fin de l\'échange. Confirmez dans la conversation pour débloquer les avis.'
              : isAuthor
                ? 'Si la vente ou l\'échange est terminé, confirmez-le dans votre conversation pour débloquer les avis vérifiés.'
                : 'Si vous avez finalisé cet échange, confirmez-le dans la conversation pour laisser un avis vérifié.'
            }
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/messages/${convId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {exchStatus === 'pending_confirmation' ? 'Confirmer dans la conversation' : 'Aller dans la conversation'}
            </Link>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <Star className="w-3 h-3" />
              Débloque les avis vérifiés
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
