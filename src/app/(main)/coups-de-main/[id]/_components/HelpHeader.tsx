'use client';

import Image from 'next/image';
import { Flame } from 'lucide-react';
import { toPhotoItems } from '@/components/ui/photo-utils';
import StatusBadge from '@/components/ui/StatusBadge';
import GlobalTrustBadge from '@/components/ui/TrustBadge';
import { formatRelative } from '@/lib/utils';
import { TYPE_CONFIG, URGENCY_CONFIG, CATEGORIES } from '../../_constants';
import type { HelpRequest } from '../_types';

type Props = {
  item: HelpRequest;
  displayName: string;
  onOpenPhoto: (idx: number) => void;
};

export default function HelpHeader({ item, displayName, onOpenPhoto }: Props) {
  const typeConf = TYPE_CONFIG[item.help_type] ?? TYPE_CONFIG.demande;
  const urgConf  = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.flexible;
  const catConf  = CATEGORIES.find(c => c.value === item.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const CatIcon  = catConf.icon;
  const allPhotos = toPhotoItems(item.photos ?? []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {item.urgency === 'urgent' && item.status === 'active' && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-black px-5 py-2.5 flex items-center gap-2">
          <Flame className="w-4 h-4" /> URGENT — Aide recherchée aujourd&apos;hui
        </div>
      )}

      {allPhotos.length > 0 ? (
        <div className="relative">
          <button type="button" onClick={() => onOpenPhoto(0)} className="w-full aspect-video overflow-hidden block">
            <Image src={allPhotos[0].url} alt={item.title} fill className="object-cover hover:scale-105 transition-transform duration-500" />
          </button>
          {allPhotos.length > 1 && (
            <div className="flex gap-2 p-4 pt-2 overflow-x-auto">
              {allPhotos.slice(1).map((ph, i) => (
                <button key={i} type="button" onClick={() => onOpenPhoto(i + 1)} className="flex-shrink-0 focus:outline-none">
                  <Image src={ph.url} alt="" fill className="object-cover rounded-lg border border-gray-100 hover:border-orange-300 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={`${typeConf.bg} w-full h-40 flex items-center justify-center`}>
          <CatIcon className={`w-20 h-20 opacity-15 ${typeConf.color}`} />
        </div>
      )}

      <div className="p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 text-sm font-black px-3 py-1.5 rounded-full ${
            item.help_type === 'demande' ? 'bg-orange-500 text-white' :
            item.help_type === 'offre'   ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
          }`}>{typeConf.emoji} {typeConf.label}</span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${urgConf.bg} ${urgConf.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${urgConf.dotColor}`} />{urgConf.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
            {catConf.emoji} {catConf.label}
          </span>
          <StatusBadge status={item.status === 'active' ? 'open' : item.status} contentType="help_request" size="sm" showIcon showDot />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3 leading-tight">{item.title}</h1>

        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black text-white flex-shrink-0"
            style={{ background: item.help_type === 'demande' ? 'linear-gradient(135deg,#f97316,#fb923c)' : item.help_type === 'offre' ? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}>
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{displayName}</p>
            <p className="text-xs text-gray-400">{formatRelative(item.created_at)}</p>
          </div>
          {item.author?.created_at && (
            <div className="ml-auto">
              <GlobalTrustBadge profile={{ created_at: item.author.created_at, role: 'resident' }} variant="mini" />
            </div>
          )}
        </div>

        <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{item.description}</p>
      </div>
    </div>
  );
}
