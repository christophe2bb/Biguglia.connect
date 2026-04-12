'use client';

import Image from 'next/image';
import { ForumSector, ForumTopic } from '@/types';
import Link from 'next/link';
import {
  MessageCircle, Eye, Pin, Flame, Lock, Archive,
  Image as ImageIcon, CheckCircle2, Zap, ChevronRight, Clock,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  SECTOR_COLORS,
  URGENCY_CONFIG,
  POST_TYPE_CONFIG,
  getCatConfig,
} from '../_config';

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, isResolved }: { status: string; isResolved?: boolean }) {
  if (isResolved) return (
    <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
      <CheckCircle2 className="w-3 h-3" /> Résolu
    </span>
  );
  if (status === 'verrouille') return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
      <Lock className="w-3 h-3" /> Verrouillé
    </span>
  );
  if (status === 'archive') return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      <Archive className="w-3 h-3" /> Archivé
    </span>
  );
  return null;
}

// ─── UrgencyDot ───────────────────────────────────────────────────────────────
function UrgencyDot({ urgency }: { urgency?: string }) {
  if (!urgency || urgency === 'basse') return null;
  const cfg = URGENCY_CONFIG[urgency];
  if (!cfg) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold border', cfg.color, cfg.bg, cfg.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── TopicCard ────────────────────────────────────────────────────────────────
export function TopicCard({ topic, sectors, compact = false }: { topic: ForumTopic; sectors: ForumSector[]; compact?: boolean }) {
  const sector = sectors.find(s => s.id === topic.sector_id);
  const colors = SECTOR_COLORS[sector?.color || 'gray'];
  const replyCount = topic.reply_count ?? 0;
  const photos = (topic as ForumTopic & { photos?: { url: string }[] }).photos;
  const coverPhoto = photos?.[0]?.url;
  const photoCount = photos?.length ?? 0;
  const catSlug = (topic.category as { slug?: string })?.slug;
  const catCfg = getCatConfig(catSlug);
  const postType = (topic as ForumTopic & { post_type?: string }).post_type;
  const ptCfg = postType ? POST_TYPE_CONFIG[postType] : null;
  const PtIcon = ptCfg?.icon;
  const isResolved = (topic as ForumTopic & { is_resolved?: boolean }).is_resolved;
  const urgency = (topic as ForumTopic & { urgency?: string }).urgency;
  const isHot = topic.is_hot || replyCount >= 5;
  const isNew = !topic.last_reply_at && new Date(topic.created_at).getTime() > Date.now() - 86400000 * 2;

  // ── Compact (sidebar) ──────────────────────────────────────────────────────
  if (compact) {
    return (
      <Link href={`/forum/${topic.id}`} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all group">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm', catCfg.bg)}>
          {catCfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 line-clamp-1 transition-colors">{topic.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{formatRelative(topic.created_at)}</span>
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <MessageCircle className="w-3 h-3" /> {replyCount}
            </span>
            {isHot && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">🔥</span>}
            {isResolved && <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 flex-shrink-0 mt-1 transition-colors" />
      </Link>
    );
  }

  // ── Full card ──────────────────────────────────────────────────────────────
  return (
    <Link href={`/forum/${topic.id}`}>
      <article className={cn(
        'bg-white rounded-2xl border transition-all duration-200 overflow-hidden group hover:-translate-y-0.5',
        urgency === 'haute' ? 'border-red-100 hover:shadow-lg hover:border-red-200' :
        isHot ? 'border-orange-100 hover:shadow-lg hover:border-orange-200' :
        'border-gray-100 hover:shadow-md hover:border-violet-100'
      )}>
        {/* Barre couleur */}
        <div className={cn('h-1 w-full',
          urgency === 'haute' ? 'bg-red-400' : catCfg.bg.replace('-50', '-300')
        )} />

        {/* Photo de couverture */}
        {coverPhoto && (
          <div className="relative h-44 bg-gray-100 overflow-hidden">
            <Image src={coverPhoto} alt={topic.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {photoCount > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> {photoCount}
              </span>
            )}
            {topic.is_pinned && (
              <span className="absolute top-2 left-2 bg-violet-600/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-semibold">
                <Pin className="w-3 h-3" /> Épinglé
              </span>
            )}
            {isHot && (
              <span className="absolute top-2 right-2 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-bold">
                <Flame className="w-3 h-3" /> Actif
              </span>
            )}
          </div>
        )}

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              <Avatar
                src={(topic.author as { avatar_url?: string })?.avatar_url}
                name={(topic.author as { full_name?: string })?.full_name || '?'}
                size="md"
              />
              {isNew && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" title="Nouveau" />}
            </div>

            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {ptCfg && PtIcon && (
                  <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border', ptCfg.bg, ptCfg.color, ptCfg.border)}>
                    <PtIcon className="w-3 h-3" /> {ptCfg.label}
                  </span>
                )}
                {sector && (
                  <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold', colors.badge)}>
                    <span className="text-[11px]">{sector.icon}</span> {sector.name}
                  </span>
                )}
                <UrgencyDot urgency={urgency} />
                {!coverPhoto && topic.is_pinned && (
                  <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-semibold">
                    <Pin className="w-3 h-3" /> Épinglé
                  </span>
                )}
                {!coverPhoto && isHot && (
                  <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                    <Flame className="w-3 h-3" /> Actif
                  </span>
                )}
                {isNew && (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    <Zap className="w-3 h-3" /> Nouveau
                  </span>
                )}
                <StatusBadge status={topic.status} isResolved={isResolved} />
              </div>

              {/* Titre */}
              <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-violet-700 transition-colors leading-snug">
                {topic.title}
              </h3>

              {/* Catégorie */}
              {topic.category && (
                <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-medium mb-2', catCfg.bg, catCfg.color, catCfg.border)}>
                  <span>{catCfg.icon}</span>
                  {(topic.category as { name?: string })?.name}
                </span>
              )}

              {/* Extrait */}
              <p className="text-sm text-gray-500 line-clamp-2 mb-3 leading-relaxed">{topic.content}</p>

              {/* Tags */}
              {topic.tags && (topic.tags as string[]).length > 0 && (
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {(topic.tags as string[]).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md hover:bg-violet-50 hover:text-violet-600 transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Métadonnées */}
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap pt-2 border-t border-gray-50">
                <span className="font-semibold text-gray-600">{(topic.author as { full_name?: string })?.full_name ?? 'Membre'}</span>
                <span className="text-gray-200">·</span>
                <span>{formatRelative(topic.created_at)}</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-600 px-2 py-0.5 rounded-lg font-semibold">
                    <MessageCircle className="w-3 h-3" /> {replyCount}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                    <Eye className="w-3 h-3" /> {topic.views ?? 0}
                  </span>
                  {photoCount > 0 && !coverPhoto && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">
                      <ImageIcon className="w-3 h-3" /> {photoCount}
                    </span>
                  )}
                </div>
                {topic.last_reply_at && (
                  <span className="text-gray-300 ml-1 hidden sm:inline text-[11px]" title="Dernière réponse">
                    <Clock className="w-3 h-3 inline mr-0.5" />{formatRelative(topic.last_reply_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
