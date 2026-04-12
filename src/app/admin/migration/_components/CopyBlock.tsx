/**
 * CopyBlock — bloc SQL réutilisable avec bouton "Copier".
 *
 * Deux variantes :
 *   simple   — juste un bouton (pas de prévisualisation SQL)
 *   preview  — affiche le SQL dans un <pre> max-h-80 scrollable
 */

import { Copy, Check } from 'lucide-react';

interface CopyBlockProps {
  /** SQL string to copy to clipboard */
  sql: string;
  /** Whether the copy was just triggered */
  copied: boolean;
  /** Trigger the copy action */
  onCopy: () => void;
  /** Button label shown before copy */
  label?: string;
  /** Show SQL preview below the button */
  preview?: boolean;
  /** Tailwind color variant for the button (default: indigo) */
  color?: 'indigo' | 'emerald' | 'violet' | 'amber' | 'orange' | 'red' | 'blue';
  /** Extra className for the wrapper */
  className?: string;
}

const COLOR_MAP: Record<NonNullable<CopyBlockProps['color']>, { btn: string; pre: string }> = {
  indigo:  { btn: 'bg-indigo-600  hover:bg-indigo-700  text-white', pre: 'text-green-400' },
  emerald: { btn: 'bg-emerald-600 hover:bg-emerald-700 text-white', pre: 'text-emerald-300' },
  violet:  { btn: 'bg-violet-600  hover:bg-violet-700  text-white', pre: 'text-violet-300' },
  amber:   { btn: 'bg-amber-500   hover:bg-amber-600   text-white', pre: 'text-amber-300' },
  orange:  { btn: 'bg-orange-500  hover:bg-orange-600  text-white', pre: 'text-orange-300' },
  red:     { btn: 'bg-red-600     hover:bg-red-700     text-white', pre: 'text-red-300' },
  blue:    { btn: 'bg-blue-600    hover:bg-blue-700    text-white', pre: 'text-blue-300' },
};

export function CopyBlock({
  sql,
  copied,
  onCopy,
  label = 'Copier le SQL',
  preview = false,
  color = 'indigo',
  className = '',
}: CopyBlockProps) {
  const { btn, pre } = COLOR_MAP[color];
  return (
    <div className={className}>
      <button
        onClick={onCopy}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
          copied ? 'bg-emerald-500 text-white' : btn
        }`}
      >
        {copied ? (
          <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase</>
        ) : (
          <><Copy className="w-4 h-4" /> {label}</>
        )}
      </button>

      {preview && (
        <div className="mt-3 p-4 bg-gray-950 rounded-xl overflow-auto max-h-80">
          <pre className={`text-xs font-mono leading-relaxed whitespace-pre-wrap ${pre}`}>
            {sql}
          </pre>
        </div>
      )}
    </div>
  );
}
