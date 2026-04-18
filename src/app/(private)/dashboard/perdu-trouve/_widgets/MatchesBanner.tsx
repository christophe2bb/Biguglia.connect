

import Link from 'next/link';
import { Zap, ChevronRight } from 'lucide-react';
import { type LFMatch } from './types';

interface Props {
  matches: LFMatch[];
}

export default function MatchesBanner({ matches }: Props) {
  const suggested = matches.filter(m => m.match_status === 'suggested');
  if (suggested.length === 0) return null;

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-blue-600" />
        <p className="text-sm font-bold text-blue-800">
          {suggested.length} correspondance{suggested.length > 1 ? 's' : ''} suggérée{suggested.length > 1 ? 's' : ''}
        </p>
      </div>
      <div className="space-y-2">
        {suggested.slice(0, 3).map(m => (
          <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-blue-100">
            <div className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-1 rounded-full flex-shrink-0">
              {m.match_score}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800">
                {m.lost_item?.title ?? 'Objet perdu'} ↔ {m.found_item?.title ?? 'Objet trouvé'}
              </p>
              <p className="text-xs text-gray-500">{m.lost_item?.location_area} · {m.found_item?.location_area}</p>
            </div>
            <Link href="/perdu-trouve"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 flex-shrink-0">
              Voir <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
