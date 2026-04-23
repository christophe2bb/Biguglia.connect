'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Bookmark, BookmarkCheck, Share2, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { CAT_CONFIG, PUB_TYPE_CONFIG } from '../_config';
import type { Association } from '../_types';

type Props = {
  asso: Association;
  coverPhoto: string | undefined;
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
};

export function AssocHero({ asso, coverPhoto, saved, onToggleSave, onShare }: Props) {
  const router = useRouter();
  const cat     = CAT_CONFIG[asso.category];
  const CatIcon = cat.icon;
  const pubConf = PUB_TYPE_CONFIG[asso.pub_type];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white">
      {/* dot-grid overlay */}
      <div
        className="absolute inset-0 opacity-10 bg-dot-grid-lg"
      />

      {/* cover photo (faded) */}
      {coverPhoto && (
        <div className="absolute inset-0 opacity-20">
          <Image src={coverPhoto} alt="" fill className="object-cover" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 relative z-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-violet-200 text-sm mb-6">
          <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/associations" className="hover:text-white transition-colors">Associations</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white font-semibold truncate max-w-[200px]">{asso.name}</span>
        </nav>

        <div className="flex flex-col sm:flex-row gap-6 items-start">

          {/* Category emoji badge */}
          <div className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-lg border-2 border-white/30',
            cat.bg,
          )}>
            {cat.emoji}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full', pubConf.color)}>
                {pubConf.emoji} {pubConf.label}
              </span>
              {asso.declared && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> Déclarée
                </span>
              )}
              {asso.urgent_need && (
                <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-red-500 text-white animate-pulse">
                  🚨 Besoin urgent
                </span>
              )}
              {asso.sector_id && <SectorBadge sectorId={asso.sector_id} />}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-2">{asso.name}</h1>
            {asso.slogan && <p className="text-violet-200 text-base italic mb-3">{asso.slogan}</p>}

            <div className="flex flex-wrap gap-4 text-violet-200 text-sm">
              {asso.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {asso.location}
                </span>
              )}
              <span className={cn('flex items-center gap-1.5 text-white font-semibold')}>
                <CatIcon className="w-4 h-4" /> {cat.label}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onToggleSave}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              {saved
                ? <BookmarkCheck className="w-5 h-5 text-yellow-300" />
                : <Bookmark className="w-5 h-5" />}
            </button>
            <button
              onClick={onShare}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              title="Partager"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.back()}
              className="hidden sm:flex p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              title="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
