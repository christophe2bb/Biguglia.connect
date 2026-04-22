'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  MapPin, Clock, Info, Bookmark, Heart, Eye, Share2, Flag,
  Star, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Compass,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ReportButton from '@/components/ui/ReportButton';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { DIFF_CONFIG, TYPE_CONFIG, TERRAIN_STATUS_CONFIG } from '../_constants';
import { formatDuration, getDifficultyLevel } from '../_utils';
import type { Promenade } from '../_types';

interface Props {
  p: Promenade;
  userId?: string;
  onLike: (id: string, liked: boolean) => void;
  onSave?: (id: string, saved: boolean) => void;
}

export default function PromenadeCard({ p, userId, onLike, onSave }: Props) {
  const [expanded, setExpanded] = useState(false);
  const diff = DIFF_CONFIG[p.difficulty];
  const type = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.balade;
  const TypeIcon = type.icon;
  const firstPhoto = p.photos?.[0]?.url;
  const diffLevel = getDifficultyLevel(p.difficulty);

  const terrainCfg = p.last_report_status ? TERRAIN_STATUS_CONFIG[p.last_report_status] : null;
  const TerrainIcon = terrainCfg?.icon;

  const essentialBadges = [
    p.dogs_allowed      && { label: 'Chiens',       emoji: '🐕', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    p.stroller_friendly && { label: 'Poussette',    emoji: '🍼', cls: 'bg-pink-50 text-pink-700 border-pink-200' },
    p.shade_level === 'full' && { label: 'Ombragé', emoji: '🌳', cls: 'bg-green-50 text-green-700 border-green-200' },
    p.water_access      && { label: "Point d'eau",  emoji: '💧', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    p.parking_available && { label: 'Parking',      emoji: '🅿️', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    p.route_loop        && { label: 'Boucle',        emoji: '🔄', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    p.best_time_of_day === 'sunset'  && { label: 'Coucher soleil', emoji: '🌅', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    p.best_time_of_day === 'morning' && { label: 'Matin idéal',   emoji: '🌄', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  ].filter(Boolean) as { label: string; emoji: string; cls: string }[];

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-[color,border-color,box-shadow,transform] duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">

      {/* ── Zone photo ── */}
      <div className="relative h-52 overflow-hidden flex-shrink-0">
        {firstPhoto ? (
          <Image
            src={firstPhoto}
            alt={p.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${type.gradient} opacity-90 flex items-center justify-center`}>
            <TypeIcon className="w-20 h-20 opacity-20 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-transparent" />

        {/* Haut gauche : type + terrain */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full bg-white/95 shadow-md', type.color)}>
            <TypeIcon className="w-3 h-3" />{type.label}
          </span>
          {terrainCfg && TerrainIcon && (
            <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full shadow-md border', terrainCfg.bg, terrainCfg.color)}>
              <TerrainIcon className="w-3 h-3" />
              {p.last_report_status === 'good' ? 'OK' : p.last_report_status === 'degraded' ? 'Dégradé' : 'Fermé'}
            </span>
          )}
        </div>

        {/* Haut droite : difficulté + save */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border bg-white/95 shadow-md', diff.color)}>
            {diff.icon} {diff.label}
          </span>
          {onSave && (
            <button
              onClick={(e) => { e.stopPropagation(); userId && onSave(p.id, !!p.user_saved); }}
              title={p.user_saved ? 'Retirer des favoris' : 'Sauvegarder'}
              className={cn(
                'p-1.5 rounded-full shadow-md transition-colors',
                p.user_saved ? 'bg-amber-400 text-white' : 'bg-white/90 text-gray-400 hover:text-amber-500 hover:bg-white',
                !userId && 'opacity-50 cursor-default'
              )}
            >
              <Bookmark className={cn('w-3.5 h-3.5', p.user_saved ? 'fill-current' : '')} />
            </button>
          )}
        </div>

        {/* Bas : badges + titre */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {essentialBadges.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {essentialBadges.slice(0, 4).map(b => (
                <span key={b.label} className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-white/95 shadow-sm', b.cls)}>
                  {b.emoji} {b.label}
                </span>
              ))}
              {essentialBadges.length > 4 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 text-gray-600 shadow-sm">
                  +{essentialBadges.length - 4}
                </span>
              )}
            </div>
          )}
          <p className="text-white font-black text-sm leading-tight drop-shadow-lg line-clamp-2">{p.title}</p>
        </div>
      </div>

      {/* ── Barre stats compact ── */}
      <div className="px-4 py-2.5 border-b border-gray-50 bg-gray-50/50">
        <div className="flex items-center gap-3 text-xs">
          {p.distance_km != null && (
            <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
              <MapPin className="w-3 h-3" />{p.distance_km} km
            </span>
          )}
          {p.duration_min != null && (
            <span className="flex items-center gap-1 font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3" />{formatDuration(p.duration_min)}
            </span>
          )}
          <div className="flex items-center gap-0.5 ml-auto">
            {[1, 2, 3].map(l => (
              <div key={l} className={cn('w-3 h-2 rounded-sm transition-colors', l <= diffLevel ? diff.barColor : 'bg-gray-200')} />
            ))}
          </div>
          {p.avg_rating && p.avg_rating > 0 && (
            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
              <Star className="w-3 h-3 fill-current" />
              {p.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-2 flex-1">{p.description}</p>

        {/* Infos pratiques expandable */}
        {(p.practical_tips || p.safety_notes || p.meeting_point_label) && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              Infos pratiques
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5 bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                {p.meeting_point_label && (
                  <p className="text-xs text-gray-600 flex items-start gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-semibold">Départ :</span> {p.meeting_point_label}</span>
                  </p>
                )}
                {p.practical_tips && (
                  <p className="text-xs text-gray-600 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span>{p.practical_tips}</span>
                  </p>
                )}
                {p.safety_notes && (
                  <p className="text-xs text-amber-700 flex items-start gap-1.5 bg-amber-50 rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{p.safety_notes}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {p.tags && p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {p.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-default"># {t}</span>
            ))}
            {p.tags.length > 3 && <span className="text-[11px] text-gray-400 px-1">+{p.tags.length - 3}</span>}
          </div>
        )}

        {/* ── Barre d'actions ── */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => userId && onLike(p.id, !!p.user_liked)}
              title={p.user_liked ? 'Retirer le like' : "J'aime"}
              className={cn(
                'flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors border',
                p.user_liked
                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-sm'
                  : 'bg-gray-50 text-gray-400 border-gray-100 hover:text-rose-500 hover:bg-rose-50',
                !userId && 'cursor-default opacity-50'
              )}
            >
              <Heart className={cn('w-3.5 h-3.5', p.user_liked ? 'fill-current' : '')} />
              {p.likes_count || 0}
            </button>
            <span className="flex items-center gap-1 text-xs text-gray-300 px-2">
              <Eye className="w-3.5 h-3.5" />{p.views ?? 0}
            </span>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: p.title, url: `${window.location.origin}/promenades` });
                } else {
                  navigator.clipboard.writeText(`${window.location.origin}/promenades`);
                  toast.success('Lien copié !');
                }
              }}
              className="flex items-center text-xs text-gray-400 border border-gray-100 bg-gray-50 hover:bg-gray-100 px-2 py-1.5 rounded-xl transition-colors"
              title="Partager"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            {p.author?.avatar_url && (
              <Avatar src={p.author.avatar_url} name={p.author.full_name} size="xs" />
            )}
            <span className="text-[11px] text-gray-400 truncate max-w-[90px]">
              {p.author?.full_name ?? 'Anonyme'} · {formatRelative(p.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Pied de carte ── */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {userId && (
            <ReportButton targetType="promenade" targetId={p.id} targetTitle={p.title} variant="mini" />
          )}
        </div>
        <span className="text-[10px] text-gray-300 flex items-center gap-1">
          <Flag className="w-3 h-3" /> Signaler un problème
        </span>
      </div>
    </div>
  );
}
