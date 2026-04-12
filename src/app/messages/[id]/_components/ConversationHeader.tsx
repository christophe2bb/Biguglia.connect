'use client';
/**
 * ConversationHeader
 * Barre supérieure de la page conversation :
 *   – bouton retour
 *   – avatar + badge favori
 *   – nom affiché + badge bloqué + badge contexte
 *   – indicateur Realtime
 *   – menu ⋮ (profil, voir la source, copier lien, favori, bloquer, signaler)
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, Wifi, MoreVertical, UserCheck, ExternalLink,
  Copy, Star, StarOff, Ban, Flag,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ProfileWithEmail } from '../_types';
import { getDisplayName } from '../_utils';
import { CONTEXT_CONFIG } from '../_config';

interface ConversationHeaderProps {
  loading: boolean;
  otherUser: ProfileWithEmail | null;
  subject: string;
  relatedType: string | null;
  relatedId: string | null;
  realtimeOk: boolean;
  isFavorite: boolean;
  isBlocked: boolean;
  onToggleFavorite: () => void;
  onToggleBlock: () => void;
}

export function ConversationHeader({
  loading, otherUser, subject, relatedType, relatedId,
  realtimeOk, isFavorite, isBlocked,
  onToggleFavorite, onToggleBlock,
}: ConversationHeaderProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const conf = relatedType ? CONTEXT_CONFIG[relatedType] : null;

  return (
    <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-3">
      {/* Bouton retour */}
      <Link href="/messages" className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
        <ChevronLeft className="w-5 h-5 text-gray-500" />
      </Link>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {loading && !otherUser ? (
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        ) : (
          <Avatar
            src={otherUser?.avatar_url}
            name={getDisplayName(otherUser)}
            size="md"
          />
        )}
        {isFavorite && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[9px]">
            ⭐
          </span>
        )}
      </div>

      {/* Nom + contexte */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-gray-900 truncate">
            {loading && !otherUser
              ? <span className="inline-block w-28 h-4 bg-gray-200 animate-pulse rounded" />
              : getDisplayName(otherUser, subject && subject !== 'Conversation' ? subject : 'Utilisateur')
            }
          </span>
          {isBlocked && (
            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
              Bloqué
            </span>
          )}
        </div>

        {conf && relatedType !== 'general' ? (
          <div className="flex items-center gap-1 mt-0.5">
            <conf.icon className={cn('w-3 h-3', conf.color)} />
            <span className={cn('text-xs font-semibold', conf.color)}>{conf.label}</span>
            {subject && (
              <span className="text-xs text-gray-400">
                · {subject.slice(0, 30)}{subject.length > 30 ? '…' : ''}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 truncate">{subject}</div>
        )}
      </div>

      {/* Indicateur Realtime */}
      {realtimeOk && (
        <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 text-emerald-600 bg-emerald-50">
          <Wifi className="w-3 h-3" />
          <span className="hidden sm:inline">En ligne</span>
        </div>
      )}

      {/* Menu ⋮ */}
      {otherUser && (
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
            title="Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[200px]"
              // Fermer si on clique à l'extérieur
              onBlur={() => setMenuOpen(false)}
            >
              <Link
                href={`/profil/${otherUser.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700"
              >
                <UserCheck className="w-4 h-4 text-gray-400" /> Voir le profil
              </Link>

              {relatedType && relatedId && relatedType !== 'general' && conf && (
                <Link
                  href={conf.href(relatedId)}
                  target="_blank"
                  onClick={() => setMenuOpen(false)}
                  className={cn('flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm', conf.color)}
                >
                  <ExternalLink className="w-4 h-4" /> Voir {conf.label.toLowerCase()}
                </Link>
              )}

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Lien copié !');
                  setMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-500 w-full"
              >
                <Copy className="w-4 h-4" /> Copier le lien
              </button>

              <div className="h-px bg-gray-100 my-1" />

              <button
                onClick={() => { onToggleFavorite(); setMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm w-full text-left"
              >
                {isFavorite
                  ? <><StarOff className="w-4 h-4 text-yellow-500" /><span className="text-gray-700">Retirer des favoris</span></>
                  : <><Star className="w-4 h-4 text-yellow-500" /><span className="text-gray-700">Ajouter aux favoris</span></>
                }
              </button>

              <div className="h-px bg-gray-100 my-1" />

              <button
                onClick={() => { onToggleBlock(); setMenuOpen(false); }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm w-full text-left',
                  isBlocked ? 'text-gray-500' : 'text-red-600',
                )}
              >
                <Ban className="w-4 h-4" />
                {isBlocked ? 'Débloquer' : 'Bloquer cet utilisateur'}
              </button>

              <div className="h-px bg-gray-100 my-1" />

              <button
                onClick={() => { setMenuOpen(false); toast('Signalement envoyé — merci !'); }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm w-full text-left text-gray-500"
              >
                <Flag className="w-4 h-4" /> Signaler
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
