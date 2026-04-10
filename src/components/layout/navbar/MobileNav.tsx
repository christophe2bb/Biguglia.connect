'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, Search, PenLine,
  MessageSquare, Bell, Home, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UNIVERS } from './univers';
import type { Profile } from '@/types';

interface UnreadCounts {
  messages: number;
  notifications: number;
}

interface Props {
  profile: Profile | null;
  pathname: string;
  unread: UnreadCounts;
  onClose: () => void;
}

/**
 * Menu mobile déroulant : 3 univers en accordéon + actions connecté / non-connecté.
 */
export default function MobileNav({ profile, pathname, unread, onClose }: Props) {
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);

  const isUniversActive = (paths: readonly string[]) =>
    paths.some(p => pathname.startsWith(p));

  return (
    <div className="lg:hidden py-3 border-t border-gray-100">

      {/* 3 univers en accordéon */}
      {UNIVERS.map((univers) => {
        const UniversIcon = univers.icon;
        const isExpanded = mobileOpen === univers.id;
        const isActive = isUniversActive(univers.paths);

        return (
          <div key={univers.id} className="mb-1">
            {/* Entête univers */}
            <button
              onClick={() => setMobileOpen(isExpanded ? null : univers.id)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors',
                isActive ? univers.activeBg : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br',
                  univers.gradFrom, univers.gradTo
                )}>
                  <UniversIcon className="w-3.5 h-3.5 text-white" />
                </div>
                {univers.label}
              </div>
              <ChevronDown className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )} />
            </button>

            {/* Items du sous-menu */}
            {isExpanded && (
              <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                {univers.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={`mobile-${item.href}-${item.label}`}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.iconBg)}>
                        <ItemIcon className={cn('w-3.5 h-3.5', item.iconColor)} />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Actions non-connecté */}
      {!profile && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 px-1">
          <Link href="/recherche" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Search className="w-4 h-4 text-gray-400" /> Rechercher
          </Link>
          <Link href="/artisans/demande" onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600">
            <PenLine className="w-4 h-4" /> Déposer une demande
          </Link>
        </div>
      )}

      {/* Actions connecté */}
      {profile && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          <Link href="/messages" onClick={onClose}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4" /> Messages</div>
            {unread.messages > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {unread.messages}
              </span>
            )}
          </Link>
          <Link href="/notifications" onClick={onClose}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <div className="flex items-center gap-3"><Bell className="w-4 h-4" /> Notifications</div>
            {unread.notifications > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {unread.notifications}
              </span>
            )}
          </Link>
          <Link href="/dashboard" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Home className="w-4 h-4" /> Tableau de bord
          </Link>
          <Link href="/recherche" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Search className="w-4 h-4 text-gray-400" /> Rechercher
          </Link>
          <Link href="/mes-echanges" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-indigo-700 hover:bg-indigo-50">
            <Activity className="w-4 h-4 text-indigo-500" /> Mes échanges
          </Link>
        </div>
      )}
    </div>
  );
}
