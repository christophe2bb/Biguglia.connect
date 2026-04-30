'use client';

import { ForumSector, ForumCategory } from '@/types';
import {
  Lock, Unlock, Pin, Archive, Trash2, Pencil,
  CheckCircle2, Flame, Tag, Calendar, Eye, MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { formatRelative } from '@/lib/utils';
import { POST_TYPE_BADGE, URGENCY_BADGE, SECTOR_COLORS } from '../_config';
import { TopicExtended } from '../_types';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'verrouille') return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
      <Lock className="w-3 h-3" /> Verrouillé
    </span>
  );
  if (status === 'archive') return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
      <Archive className="w-3 h-3" /> Archivé
    </span>
  );
  if (status === 'ouvert') return (
    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
      <CheckCircle2 className="w-3 h-3" /> Ouvert
    </span>
  );
  return null;
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  topic:       TopicExtended;
  topicId:     string;
  replyCount:  number;
  canEdit:     boolean;
  canDelete:   boolean;
  isMod:       boolean;
  onDelete:    () => void;
  onModerate:  (action: 'verrouiller' | 'deverrouiller' | 'epingler' | 'archiver') => void;
}

// ─── TopicHeader ──────────────────────────────────────────────────────────────
export function TopicHeader({
  topic, topicId, replyCount, canEdit, canDelete, isMod, onDelete, onModerate,
}: Props) {
  const sector     = topic.sector as (ForumSector & { icon?: string; color?: string }) | null;
  const sectorCls  = SECTOR_COLORS[(sector as { color?: string })?.color || 'gray'];
  const postType   = topic.post_type;
  const ptCfg      = postType ? POST_TYPE_BADGE[postType] : null;
  const PtIcon     = ptCfg?.icon;
  const urgency    = topic.urgency;
  const urgencyCfg = urgency && urgency !== 'basse' ? URGENCY_BADGE[urgency] : null;

  return (
    <>
      {/* ── Badges ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* is_resolved n'existe pas en DB → dérivé de status === 'closed' */}
        {(topic.is_resolved || topic.status === 'closed') && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Résolu
          </span>
        )}
        {topic.is_pinned && (
          <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-semibold">
            <Pin className="w-3 h-3" /> Épinglé
          </span>
        )}
        {ptCfg && PtIcon && (
          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${ptCfg.bg} ${ptCfg.color}`}>
            <PtIcon className="w-3 h-3" /> {ptCfg.label}
          </span>
        )}
        {urgencyCfg && (
          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${urgencyCfg.bg} ${urgencyCfg.color}`}>
            🚨 {urgencyCfg.label}
          </span>
        )}
        {topic.is_hot && (
          <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
            <Flame className="w-3 h-3" /> Actif
          </span>
        )}
        {sector && (
          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${sectorCls}`}>
            {(sector as { icon?: string }).icon} {sector.name}
          </span>
        )}
        {topic.category && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {(topic.category as ForumCategory & { icon?: string }).icon} {(topic.category as ForumCategory).name}
          </span>
        )}
        <StatusBadge status={topic.status} />
      </div>

      {/* ── Titre ── */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{topic.title}</h1>

      {/* ── Tags ── */}
      {topic.tags && (topic.tags as string[]).length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-gray-400" />
          {(topic.tags as string[]).map((tag: string) => (
            <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md">#{tag}</span>
          ))}
        </div>
      )}

      {/* ── Auteur + méta + actions ── */}
      <div className="flex items-center gap-3 mb-5">
        <Avatar
          src={(topic.author as { avatar_url?: string })?.avatar_url}
          name={(topic.author as { full_name?: string })?.full_name || '?'}
          size="md"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800">{(topic.author as { full_name?: string })?.full_name}</span>
            {(topic.author as { role?: string })?.role === 'artisan_verified' && <Badge variant="success">Artisan</Badge>}
            {(topic.author as { role?: string })?.role === 'admin' && <Badge variant="warning">Admin</Badge>}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatRelative(topic.created_at)}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{topic.views} vues</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{replyCount} réponse{replyCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Actions modération / auteur */}
        <div className="flex items-center gap-1">
          {canEdit && (
            <Link href={`/forum/${topicId}/modifier`}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              title="Modifier">
              <Pencil className="w-4 h-4" />
            </Link>
          )}
          {isMod && (
            <>
              {topic.status === 'ouvert' ? (
                <button onClick={() => onModerate('verrouiller')}
                  className="p-2 rounded-xl text-amber-400 hover:bg-amber-50 transition-colors" title="Verrouiller">
                  <Lock className="w-4 h-4" />
                </button>
              ) : topic.status === 'verrouille' ? (
                <button onClick={() => onModerate('deverrouiller')}
                  className="p-2 rounded-xl text-green-400 hover:bg-green-50 transition-colors" title="Déverrouiller">
                  <Unlock className="w-4 h-4" />
                </button>
              ) : null}
              <button onClick={() => onModerate('epingler')}
                className={`p-2 rounded-xl transition-colors ${topic.is_pinned ? 'text-brand-500 bg-brand-50' : 'text-gray-400 hover:bg-gray-50'}`}
                title={topic.is_pinned ? 'Désépingler' : 'Épingler'}>
                <Pin className="w-4 h-4" />
              </button>
              <button onClick={() => onModerate('archiver')}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 transition-colors" title="Archiver">
                <Archive className="w-4 h-4" />
              </button>
            </>
          )}
          {canDelete && (
            <button onClick={onDelete}
              className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors" title="Supprimer">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
