'use client';
/**
 * ThemeBlockSection — un bloc de résultats groupés par thème
 * avec header coloré, grille/liste et bouton "Voir plus"
 */

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeBlock } from '../_types';
import { THEMES, ThemeKey, getThemeLink } from '../_config';
import ResultCard from './ResultCard';

const INITIAL_SHOWN = 4;

interface Props {
  block: ThemeBlock;
  view: 'grid' | 'list';
}

export default function ThemeBlockSection({ block, view }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cfg   = THEMES[block.key as ThemeKey];
  const shown = expanded ? block.results : block.results.slice(0, INITIAL_SHOWN);
  const extra = block.results.length - INITIAL_SHOWN;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-3 rounded-t-xl border-b', cfg.bg, cfg.border)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm', cfg.color)}>
            {block.icon}
          </span>
          <div>
            <span className={cn('text-sm font-bold', cfg.color)}>{block.label}</span>
            <span className="ml-2 text-xs text-gray-500">
              {block.results.length} résultat{block.results.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <Link
          href={getThemeLink(block.key)}
          className={cn('text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all', cfg.color)}
        >
          Voir tout <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Results */}
      <div className={cn('border border-t-0 rounded-b-xl overflow-hidden', cfg.border.replace('200', '100'))}>
        <div className={
          view === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100'
            : 'divide-y divide-gray-50'
        }>
          {shown.map(r => (
            <div key={r.id} className={view === 'grid' ? 'bg-white' : ''}>
              <ResultCard result={r} view={view} />
            </div>
          ))}
        </div>

        {!expanded && extra > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className={cn('w-full py-3 text-sm font-semibold text-center border-t transition-colors hover:opacity-80', cfg.bg, cfg.color)}
          >
            Voir {extra} autre{extra > 1 ? 's' : ''} →
          </button>
        )}
      </div>
    </div>
  );
}
