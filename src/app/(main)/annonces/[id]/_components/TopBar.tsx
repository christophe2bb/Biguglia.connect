'use client';

import Link from 'next/link';
import {
  ChevronLeft, Eye, Heart, Share2, Copy, MessageCircle, Pencil,
} from 'lucide-react';
import type { ExtListing, ShareMethod } from '../_types';

type Props = {
  listing: ExtListing;
  isOwner: boolean;
  isSaved: boolean;
  showSharePanel: boolean;
  onToggleSave: () => void;
  onToggleSharePanel: () => void;
  onShare: (method: ShareMethod) => Promise<void>;
};

export function TopBar({
  listing, isOwner, isSaved,
  showSharePanel, onToggleSave, onToggleSharePanel, onShare,
}: Props) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">

        {/* Back link */}
        <Link
          href="/annonces"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Annonces
        </Link>

        <div className="flex items-center gap-2">
          {/* View count (desktop) */}
          {listing.views_count !== undefined && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
              <Eye className="w-3.5 h-3.5" />
              {listing.views_count} vue{listing.views_count !== 1 ? 's' : ''}
            </span>
          )}

          {/* Favourite */}
          <button
            onClick={onToggleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              isSaved
                ? 'bg-pink-100 text-pink-600 border border-pink-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
            <span className="hidden sm:inline">{isSaved ? 'Sauvegardé' : 'Sauvegarder'}</span>
          </button>

          {/* Share button + dropdown */}
          <div className="relative">
            <button
              onClick={onToggleSharePanel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>

            {showSharePanel && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-52 z-30">
                <p className="text-xs font-semibold text-gray-500 mb-2 px-2">Partager via</p>
                <button onClick={() => onShare('copy')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                  <Copy className="w-4 h-4 text-gray-400" /> Copier le lien
                </button>
                <button onClick={() => onShare('sms')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                  <MessageCircle className="w-4 h-4 text-green-500" /> SMS
                </button>
                <button onClick={() => onShare('email')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                  <MessageCircle className="w-4 h-4 text-blue-500" /> Email
                </button>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button onClick={() => onShare('native')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                    <Share2 className="w-4 h-4 text-indigo-500" /> Autres…
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Owner: edit link */}
          {isOwner && (
            <Link
              href={`/annonces/${listing.id}/modifier`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Modifier</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
