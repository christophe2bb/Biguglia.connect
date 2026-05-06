'use client';

import { useState, useId } from 'react';
import Link from 'next/link';
import {
  ChevronDown, Search, PenLine,
  MessageSquare, Bell, Home, Activity, Heart,
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
 * Accessibilité :
 *  - aria-expanded + aria-controls sur chaque bouton accordéon
 *  - region id unique par univers pour aria-controls
 *  - Les icônes décoratives sont aria-hidden
 */
export default function MobileNav({ profile, pathname, unread, onClose }: Props) {
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const idPrefix = useId();

  const isUniversActive = (paths: readonly string[]) =>
    paths.some(p => pathname.startsWith(p));

  return (
    <div className="lg:hidden py-3 border-t border-gray-100">

      {/* 3 univers en accordéon */}
      {UNIVERS.map((univers) => {
        const UniversIcon = univers.icon;
        const isExpanded = mobileOpen === univers.id;
        const isActive = isUniversActive(univers.paths);

        const panelId = `${idPrefix}-${univers.id}`;

        return (
          <div key={univers.id} className="mb-1">
            {/* Entête univers */}
            <button
              type="button"
              onClick={() => setMobileOpen(isExpanded ? null : univers.id)}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors',
                isActive ? univers.activeBg : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br',
                  univers.gradFrom, univers.gradTo
                )} aria-hidden="true">
                  <UniversIcon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                </div>
                {univers.label}
              </div>
              <ChevronDown className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )} aria-hidden="true" />
            </button>

            {/* Items du sous-menu */}
            {isExpanded && (
              <div id={panelId} className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                {univers.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={`mobile-${item.href}-${item.label}`}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.iconBg)} aria-hidden="true">
                        <ItemIcon className={cn('w-3.5 h-3.5', item.iconColor)} aria-hidden="true" />
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
          <Link href="/artisans/demande" onClick={onClose} prefetch={false}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600">
            <PenLine className="w-4 h-4" /> Déposer une demande
          </Link>
        </div>
      )}

      {/* Actions connecté */}
      {profile && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          <Link href="/messages" onClick={onClose}
            aria-label={unread.messages > 0 ? `Messages — ${unread.messages} non lu(s)` : 'Messages'}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4" aria-hidden="true" /> Messages</div>
            {unread.messages > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1" aria-hidden="true">
                {unread.messages}
              </span>
            )}
          </Link>
          <Link href="/notifications" onClick={onClose}
            aria-label={unread.notifications > 0 ? `Notifications — ${unread.notifications} non lue(s)` : 'Notifications'}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <div className="flex items-center gap-3"><Bell className="w-4 h-4" aria-hidden="true" /> Notifications</div>
            {unread.notifications > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1" aria-hidden="true">
                {unread.notifications}
              </span>
            )}
          </Link>
          <Link href="/dashboard" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Home className="w-4 h-4" aria-hidden="true" /> Tableau de bord
          </Link>
          <Link href="/recherche" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Search className="w-4 h-4 text-gray-400" aria-hidden="true" /> Rechercher
          </Link>
          <Link href="/favoris" onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
              pathname.startsWith('/favoris') ? 'text-rose-600 bg-rose-50' : 'text-gray-700 hover:bg-gray-50'
            )}>
            <Heart className={`w-4 h-4 ${pathname.startsWith('/favoris') ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} aria-hidden="true" /> Mes favoris
          </Link>
          <Link href="/mes-echanges" onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-indigo-700 hover:bg-indigo-50">
            <Activity className="w-4 h-4 text-indigo-500" aria-hidden="true" /> Mes échanges
          </Link>
        </div>
      )}
    </div>
  );
}
