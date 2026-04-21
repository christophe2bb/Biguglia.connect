'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import ContactButton from '@/components/ui/ContactButton';
import type { Association, NeedPicto } from '../_types';

type Props = {
  asso: Association;
  needsPictos: NeedPicto[];
  isAuthor: boolean;
  userId: string | undefined;
};

export function NeedsPanel({ asso, needsPictos, isAuthor, userId }: Props) {
  if (needsPictos.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-200 p-6 shadow-sm">
      <h2 className="text-sm font-black text-rose-800 mb-4 flex items-center gap-2">
        {asso.urgent_need && (
          <span className="w-5 h-5 flex-shrink-0 text-red-500 animate-pulse">🚨</span>
        )}
        <Zap className="w-4 h-4 text-rose-500" /> Besoins actuels
      </h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {needsPictos.map(p => (
          <span
            key={p.label}
            className={cn('inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl border', p.color)}
          >
            {p.icon} {p.label}
          </span>
        ))}
      </div>

      {asso.need_detail && (
        <p className="text-sm text-rose-700 bg-white/60 rounded-xl px-4 py-3 border border-rose-100">
          {asso.need_detail}
        </p>
      )}

      {!isAuthor && (
        <div className="mt-4 flex flex-wrap gap-2">
          <ContactButton
            sourceType="association"
            sourceId={asso.id}
            sourceTitle={asso.name}
            ownerId={asso.author_id}
            userId={userId}
            size="sm"
            ctaLabel="✉️ Proposer mon aide"
          />
        </div>
      )}
    </div>
  );
}
