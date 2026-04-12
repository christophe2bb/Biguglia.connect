'use client';

/**
 * SqlBlock — Affiche un bloc SQL avec un bouton de copie.
 *
 * Props :
 *   sql      — Le contenu SQL à afficher et copier.
 *   label    — Libellé du bouton de copie.
 *   copied   — true si copié récemment (affichage de confirmation).
 *   onCopy   — Handler de copie.
 *   color    — Couleur de l'en-tête (className Tailwind comme "blue" | "red" …).
 *   maxH     — max-height du bloc code (défaut "max-h-80").
 *   textColor — Couleur du texte pre (défaut "text-cyan-400").
 */

import { Copy, Check } from 'lucide-react';

interface Props {
  sql:        string;
  label:      string;
  copied:     boolean;
  onCopy:     () => void;
  maxH?:      string;
  textColor?: string;
}

export function SqlBlock({
  sql,
  label,
  copied,
  onCopy,
  maxH      = 'max-h-80',
  textColor = 'text-cyan-400',
}: Props) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <button
          onClick={onCopy}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          {copied
            ? <><Check className="w-4 h-4" /> {label} — Collez dans Supabase</>
            : <><Copy className="w-4 h-4" /> {label}</>
          }
        </button>
      </div>
      <div className={`p-4 bg-gray-950 overflow-auto ${maxH}`}>
        <pre className={`text-xs font-mono leading-relaxed whitespace-pre-wrap ${textColor}`}>
          {sql}
        </pre>
      </div>
    </div>
  );
}
