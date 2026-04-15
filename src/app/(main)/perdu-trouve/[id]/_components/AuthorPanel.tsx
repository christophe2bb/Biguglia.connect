import { Users } from 'lucide-react';
import { TrustScoreMini } from '@/components/ui/TrustScore';
import { formatRelative } from '@/lib/utils';
import type { LFItem } from '../_types';

type Props = { item: LFItem };

export function AuthorPanel({ item }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-bold text-gray-700">Publié par</p>
      </div>

      <div className="flex items-center gap-3">
        {item.author && (
          <TrustScoreMini
            profile={{
              id:         item.author_id,
              created_at: item.author.created_at ?? item.created_at,
              role:       item.author.role ?? 'resident',
              avatar_url: item.author.avatar_url ?? null,
              phone:      item.author.phone ?? null,
            }}
          />
        )}
        <div>
          <p className="text-sm font-semibold text-gray-800">{item.author?.full_name ?? 'Membre'}</p>
          <p className="text-xs text-gray-400">Annonce publiée {formatRelative(item.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
