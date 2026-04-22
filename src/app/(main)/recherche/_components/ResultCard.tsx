
/**
 * ResultCard — affichage d'un résultat en vue liste ou grille
 */

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchResult } from '../_types';

interface Props {
  result: SearchResult;
  view: 'grid' | 'list';
}

// ─── Vue Liste ────────────────────────────────────────────────────────────────
function ListCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={result.href}
      className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-colors group"
    >
      {result.image ? (
        <Image src={result.image} alt={result.title} fill className="rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className={cn('w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0', result.themeBg, result.themeColor)}>
          <div className="scale-150">{result.themeIcon}</div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors truncate flex-1">
            {result.title}
          </p>
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0', result.themeBg, result.themeColor)}>
            {result.themeIcon}{result.themeLabel}
          </span>
        </div>
        {result.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">{result.description}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {result.location && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />{result.location}
            </span>
          )}
          {result.price !== undefined && (
            <span className="text-xs font-semibold text-gray-700">{result.price} €</span>
          )}
          {result.isFree && <span className="text-xs font-semibold text-emerald-600">Gratuit</span>}
          {result.date && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />{result.date}
            </span>
          )}
          {result.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              {result.badge}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-1" />
    </Link>
  );
}

// ─── Vue Grille ───────────────────────────────────────────────────────────────
function GridCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={result.href}
      className="flex flex-col bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-colors group overflow-hidden"
    >
      {result.image ? (
        <div className="h-32 overflow-hidden">
          <Image src={result.image} alt={result.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className={cn('h-24 flex items-center justify-center', result.themeBg)}>
          <span className={cn('scale-[2.5]', result.themeColor)}>{result.themeIcon}</span>
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md', result.themeBg, result.themeColor)}>
            {result.themeIcon}{result.themeLabel}
          </span>
          {result.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              {result.badge}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 line-clamp-2 flex-1 mb-1.5">
          {result.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {result.location && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <MapPin className="w-3 h-3" />{result.location}
            </span>
          )}
          {result.price !== undefined && (
            <span className="text-xs font-semibold text-gray-700">{result.price} €</span>
          )}
          {result.isFree && <span className="text-[11px] font-semibold text-emerald-600">Gratuit</span>}
        </div>
      </div>
    </Link>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ResultCard({ result, view }: Props) {
  return view === 'list' ? <ListCard result={result} /> : <GridCard result={result} />;
}
