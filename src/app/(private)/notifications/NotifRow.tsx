'use client';

/**
 * src/app/(private)/notifications/NotifRow.tsx
 * ─────────────────────────────────────────────
 * Ligne individuelle d'une notification dans la liste.
 */

import Link from 'next/link';
import { ChevronRight, Trash2 } from 'lucide-react';
import { Notification } from '@/types';
import { formatRelative, cn } from '@/lib/utils';
import { getConfig, PriorityDot } from './notif-config';

interface NotifRowProps {
  notif: Notification;
  isDeleting: boolean;
  onRead: (n: Notification) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export function NotifRow({ notif, isDeleting, onRead, onDelete }: NotifRowProps) {
  const cfg       = getConfig(notif.type);
  const Icon      = cfg.icon;
  const notifBody = (notif as unknown as { body?: string; message?: string }).body
                  || (notif as unknown as { message?: string }).message
                  || '';
  const isUnread   = !notif.is_read;
  const isHighPrio = cfg.priority === 'high' && isUnread;

  return (
    <div className={cn(
      'transition-colors duration-300',
      isDeleting && 'opacity-0 scale-y-0 max-h-0 overflow-hidden pointer-events-none',
    )}>
      <Link
        href={notif.link || '#'}
        onClick={() => onRead(notif)}
        className={cn(
          'group flex items-start gap-3 rounded-2xl border p-4 transition-colors duration-200',
          'hover:shadow-md hover:-translate-y-px relative overflow-hidden',
          isUnread
            ? `bg-white border-l-4 ${cfg.border} shadow-sm`
            : 'bg-white border-gray-100 hover:border-gray-200',
        )}
      >
        {isHighPrio && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-400 rounded-l-2xl" />}
        {isUnread   && <span className="absolute top-3 right-10 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />}

        {/* Icône */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
          'transition-transform group-hover:scale-110',
          isUnread ? cfg.bg : 'bg-gray-100',
        )}>
          <Icon className={cn('w-5 h-5', isUnread ? cfg.color : 'text-gray-400')} />
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              'text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md',
              isUnread ? `${cfg.color} ${cfg.bg}` : 'text-gray-400 bg-gray-100',
            )}>
              {cfg.label}
            </span>
            {isUnread && <PriorityDot priority={cfg.priority} />}
            <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
              {formatRelative(notif.created_at)}
            </span>
          </div>

          <p className={cn(
            'text-sm leading-snug',
            isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-600',
          )}>
            {notif.title}
          </p>

          {notifBody && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{notifBody}</p>
          )}

          {notif.link && notif.link !== '#' && isUnread && (
            <div className={cn('inline-flex items-center gap-1 mt-2 text-xs font-bold', cfg.color)}>
              Voir <ChevronRight className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Bouton supprimer */}
        <button
          onClick={(e) => onDelete(e, notif.id)}
          aria-label={`Supprimer la notification : ${notif.title}`}
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-[colors,opacity]"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </Link>
    </div>
  );
}
