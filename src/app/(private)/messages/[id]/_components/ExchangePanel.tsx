'use client';
/**
 * ExchangePanel
 * Panneau de confirmation bipartite d'échange.
 * Affiché uniquement si la conversation est liée à un type échangeable
 * (listing, equipment, help_request, association, collection_item, service_request).
 *
 * États :
 *   • null  — l'échange n'a pas encore commencé
 *   • pending_confirmation — au moins une partie a confirmé
 *   • done  — les deux parties ont confirmé → avis débloqués
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCheck, PartyPopper, Star, ThumbsUp, Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ExchangeInfo } from '../_types';
import { EXCHANGEABLE_TYPES } from '../_config';

interface ExchangePanelProps {
  conversationId: string;
  userId: string;
  exchange: ExchangeInfo;
  onExchangeUpdated: (updated: ExchangeInfo) => void;
}

export function ExchangePanel({
  conversationId, userId, exchange, onExchangeUpdated,
}: ExchangePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const conf = exchange.relatedType ? EXCHANGEABLE_TYPES[exchange.relatedType] : null;

  if (!conf || !exchange.relatedType || !exchange.relatedId) return null;

  const iHaveConfirmed  = exchange.confirmedBy.includes(userId);
  const isDone          = exchange.status === 'done';
  const otherConfirmed  = exchange.confirmedBy.some(id => id !== userId);

  const handleConfirm = async () => {
    if (confirming || iHaveConfirmed) return;
    setConfirming(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const newConfirmedBy = [...exchange.confirmedBy, userId];
      const bothDone = newConfirmedBy.length >= 2;

      const patchRes = await fetch(`/api/messages/conversation/${conversationId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          action: 'update_exchange_status',
          exchangeStatus: bothDone ? 'done' : 'pending_confirmation',
        }),
      }).catch(() => null);

      if (!patchRes?.ok) { toast.error('Erreur de confirmation'); return; }

      const msgText = bothDone
        ? '✅ Échange confirmé par les deux parties — les avis sont maintenant débloqués.'
        : `🤝 J'ai confirmé la fin de ${conf.verb}. En attente de confirmation de l'autre partie.`;

      await fetch(`/api/messages/conversation/${conversationId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: msgText }),
      }).catch(() => null);

      onExchangeUpdated({
        ...exchange,
        status: bothDone ? 'done' : 'pending_confirmation',
        confirmedBy: newConfirmedBy,
        confirmedAt: bothDone ? new Date().toISOString() : null,
      });

      if (bothDone) toast.success('Échange confirmé ! Vous pouvez maintenant laisser un avis.');
      else toast.success("Confirmation envoyée ! En attente de l'autre partie.");
    } finally {
      setConfirming(false);
    }
  };

  // ── État : terminé ─────────────────────────────────────────────────────────
  if (isDone) {
    const reviewHref = (() => {
      const t = exchange.relatedType;
      if (t === 'listing')         return `/annonces/${exchange.relatedId}`;
      if (t === 'equipment')       return `/materiel/${exchange.relatedId}`;
      if (t === 'help_request')    return `/coups-de-main/${exchange.relatedId}`;
      if (t === 'collection_item') return `/collectionneurs/${exchange.relatedId}`;
      return `/${t}/${exchange.relatedId}`;
    })();

    return (
      <div className={cn('rounded-2xl border p-4 mb-3', conf.bg, conf.border)}>
        <div className="flex items-center gap-2 mb-3">
          <PartyPopper className={cn('w-5 h-5 flex-shrink-0', conf.color)} />
          <div>
            <p className={cn('font-bold text-sm', conf.color)}>Échange terminé ✅</p>
            {exchange.confirmedAt && (
              <p className="text-xs text-gray-500">
                Confirmé le {new Date(exchange.confirmedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
        </div>
        <div className="bg-white/70 rounded-xl p-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
          <p className="text-xs text-gray-700 flex-1">
            Votre avis est maintenant <strong>débloqué</strong>.
          </p>
          <Link
            href={reviewHref}
            className={cn('text-xs font-bold px-3 py-1.5 rounded-xl border bg-white', conf.color, conf.border)}
          >
            Laisser un avis
          </Link>
        </div>
      </div>
    );
  }

  // ── État : en attente / non commencé ──────────────────────────────────────
  return (
    <div className={cn('rounded-2xl border p-4 mb-3', conf.bg, conf.border)}>
      <div className="flex items-start gap-3">
        <ThumbsUp className={cn('w-5 h-5 flex-shrink-0 mt-0.5', conf.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn('font-bold text-sm mb-0.5', conf.color)}>
            {conf.label} — Confirmer la fin de l&apos;échange
          </p>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            {iHaveConfirmed
              ? `✓ Vous avez confirmé. ${otherConfirmed ? 'Les deux parties ont confirmé !' : "En attente de confirmation de l'autre partie…"}`
              : `Avez-vous terminé ${conf.verb} ? Confirmez pour débloquer les avis vérifiés.`
            }
          </p>

          {otherConfirmed && !iHaveConfirmed && (
            <p className="text-xs text-emerald-700 font-semibold mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              L&apos;autre partie a déjà confirmé — confirmez pour finaliser !
            </p>
          )}

          {!iHaveConfirmed && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {confirming
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <CheckCheck className="w-4 h-4" />
              }
              {confirming ? 'Confirmation…' : "Confirmer la fin de l'échange"}
            </button>
          )}

          {iHaveConfirmed && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <CheckCheck className="w-4 h-4" /> Votre confirmation est enregistrée
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
