'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock, MessageSquare, Shield, Package, Eye, Pencil, Trash2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { type LFItem, type LFStatus, STATUS_CONFIG, ACTIVE_STATUSES } from './types';

function StatusBadge({ status }: { status: LFStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.perdu;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

const ALLOWED: Record<LFStatus, LFStatus[]> = {
  perdu:     ['identifie', 'clos'],
  trouve:    ['identifie', 'clos'],
  identifie: ['restitue', 'clos', 'perdu', 'trouve'],
  restitue:  ['archive'],
  clos:      ['archive'],
  archive:   [],
  draft:     ['perdu', 'trouve'],
};

interface Props {
  item: LFItem;
  onStatusChange: (id: string, s: LFStatus) => void;
  onDelete: (id: string) => void;
}

export default function ItemCard({ item, onStatusChange, onDelete }: Props) {
  const coverPhoto = item.photos?.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];
  const transitions = ALLOWED[item.status] ?? [];
  const isActive = ACTIVE_STATUSES.includes(item.status);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-colors overflow-hidden ${
      isActive
        ? item.type === 'perdu' ? 'border-orange-200' : 'border-emerald-200'
        : 'border-gray-100 opacity-80'
    }`}>
      <div className="flex gap-0">
        {/* Photo */}
        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden">
          {coverPhoto ? (
            <Image src={coverPhoto.url} alt={item.title} fill sizes="80px" className="object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${
              item.type === 'perdu' ? 'bg-orange-50' : 'bg-emerald-50'
            }`}>
              <Package className="w-8 h-8 text-gray-200" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={item.status} />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                item.type === 'perdu' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {item.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé'}
              </span>
              {item.is_sensitive && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" /> Sensible
                </span>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Link href={`/perdu-trouve#${item.id}`}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir">
                <Eye className="w-3.5 h-3.5" />
              </Link>
              <Link href={`/perdu-trouve?edit=${item.id}`}
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Modifier">
                <Pencil className="w-3.5 h-3.5" />
              </Link>
              <button onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Archiver">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-sm font-bold text-gray-900 truncate mb-1">{item.title}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location_area}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(item.created_at)}</span>
            {item._comment_count !== undefined && item._comment_count > 0 && (
              <span className="flex items-center gap-1 text-blue-500">
                <MessageSquare className="w-3 h-3" /> {item._comment_count}
              </span>
            )}
          </div>

          {transitions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {transitions.map(t => {
                const cfg = STATUS_CONFIG[t];
                return (
                  <button key={t}
                    onClick={() => onStatusChange(item.id, t)}
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg border transition-colors ${cfg.bg} ${cfg.color} ${cfg.border} hover:opacity-80`}>
                    {cfg.icon} → {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
