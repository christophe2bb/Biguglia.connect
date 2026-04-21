'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Share2 } from 'lucide-react';
import type { LFItem, ShareMode } from '../_types';

type Props = {
  item: LFItem;
  onShare: (mode: ShareMode) => void;
  onPrint: () => void;
};

export function LFNavBar({ item, onShare, onPrint }: Props) {
  return (
    <div className="bg-white border-b border-gray-200 print:hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link
          href="/perdu-trouve"
          aria-label="Retour à la liste Perdu / Trouvé"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">Perdu / Trouvé</p>
          <p className="text-sm font-bold text-gray-800 truncate">{item.title}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrint}
            aria-label="Imprimer la fiche"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onShare('copy')}
            aria-label="Copier le lien pour partager"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
