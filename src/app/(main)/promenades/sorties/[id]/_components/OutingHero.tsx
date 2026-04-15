import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Footprints, BarChart3 } from 'lucide-react';
import type { Outing } from '../_types';
import { DIFF_CONFIG } from '../_config';
import { OUTING_STATUS_CONFIG } from '@/lib/outings';
import type { OutingStatus } from '@/lib/outings';

type Props = {
  outing: Outing;
  coverPhoto: string | undefined;
  frenchStatus: OutingStatus;
  canManage: boolean;
  onDelete: () => void;
};

export default function OutingHero({
  outing,
  coverPhoto,
  frenchStatus,
  canManage,
  onDelete,
}: Props) {
  const statusCfg = OUTING_STATUS_CONFIG[frenchStatus];
  const diffConf  = outing.difficulty ? DIFF_CONFIG[outing.difficulty] : null;

  return (
    <div className="relative h-64 sm:h-80 overflow-hidden">
      {coverPhoto ? (
        <Image src={coverPhoto} alt={outing.title} fill className="object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <Footprints className="w-24 h-24 text-white/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Back link */}
      <Link
        href="/promenades?tab=agenda"
        className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
      >
        <ChevronLeft className="w-4 h-4" /> Sorties
      </Link>

      {/* Organizer controls */}
      {canManage && (
        <div className="absolute top-4 right-4 flex gap-2">
          <Link
            href={`/promenades?editOuting=${outing.id}`}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
          >
            ✏️ Modifier
          </Link>
          <button
            onClick={onDelete}
            className="bg-red-500/70 hover:bg-red-600/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
          >
            Supprimer
          </button>
        </div>
      )}

      {/* Status badge + title */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${statusCfg.badgeBg} ${statusCfg.badgeText}`}
          >
            {statusCfg.icon} {statusCfg.label}
          </span>
          {diffConf && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${diffConf.color} bg-white/90`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> {diffConf.label}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow line-clamp-2">
          {outing.title}
        </h1>
      </div>
    </div>
  );
}
