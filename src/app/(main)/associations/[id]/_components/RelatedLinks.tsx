import Link from 'next/link';
import { ArrowLeft, Calendar, MessageSquare, Tag, ChevronRight } from 'lucide-react';
import ReportButton from '@/components/ui/ReportButton';
import type { Association } from '../_types';

type Props = { asso: Association };

export function RelatedLinks({ asso }: Props) {
  return (
    <div className="space-y-6">

      {/* Tags */}
      {asso.tags.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-violet-500" /> Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {asso.tags.map(t => (
              <Link
                key={t}
                href={`/associations?q=${encodeURIComponent(t)}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
              >
                #{t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Events & Forum quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/evenements?q=${encodeURIComponent(asso.name)}`}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-purple-200 hover:shadow-md transition-colors group flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-pink-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-800 group-hover:text-purple-700">Événements</p>
            <p className="text-xs text-gray-400 truncate">Voir les événements de {asso.name}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-purple-400 group-hover:translate-x-0.5 transition-colors" />
        </Link>

        <Link
          href={`/forum?q=${encodeURIComponent(asso.name)}`}
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-violet-200 hover:shadow-md transition-colors group flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-violet-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-800 group-hover:text-violet-700">Forum</p>
            <p className="text-xs text-gray-400 truncate">Discussions sur {asso.name}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-violet-400 group-hover:translate-x-0.5 transition-colors" />
        </Link>
      </div>

      {/* Back + Report */}
      <div className="flex items-center justify-between">
        <Link
          href="/associations"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Toutes les associations
        </Link>
        <ReportButton
          targetType="association"
          targetId={asso.id}
          targetTitle={asso.name}
        />
      </div>
    </div>
  );
}
