'use client';

import { useEffect, useRef, useId } from 'react';
import Link from 'next/link';
import {
  Home, User, LogOut, Shield, Wrench,
  ChevronDown, MessageSquare, Bell, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import UnreadBadge from './UnreadBadge';
import type { Profile } from '@/types';

interface UnreadCounts {
  messages: number;
  notifications: number;
  total: number;
}

interface Props {
  profile: Profile;
  isAdmin: boolean;
  unread: UnreadCounts;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSignOut: () => void;
}

/**
 * Bouton avatar + dropdown menu utilisateur (desktop & mobile sm:hidden links).
 * Accessibilité :
 *  - aria-expanded / aria-haspopup sur le bouton déclencheur
 *  - aria-controls pointe vers le menu (id unique)
 *  - role="menu" + role="menuitem" sur le panneau et ses liens
 *  - Escape ferme le menu et restitue le focus au bouton
 *  - Les icônes décoratives sont aria-hidden
 */
export default function UserMenu({
  profile, isAdmin, unread, isOpen, onToggle, onClose, onSignOut,
}: Props) {
  const btnRef   = useRef<HTMLButtonElement>(null);
  const menuId   = useId();

  // Escape ferme le panel et restitue le focus au déclencheur
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const firstName = profile.full_name?.split(' ')[0] || 'Compte';

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={btnRef}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Menu de ${firstName}${unread.total > 0 ? ` — ${unread.total} notification(s) non lue(s)` : ''}`}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
      >
        <div className="relative">
          <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="sm" />
          {unread.total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" aria-hidden="true" />
          )}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[90px] truncate" aria-hidden="true">
          {firstName}
        </span>
        <ChevronDown className={cn(
          'hidden sm:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} aria-hidden="true" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />
          <div
            id={menuId}
            role="menu"
            aria-label={`Menu de ${firstName}`}
            className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden"
          >
            {/* Header profil — décoratif, aria-hidden */}
            <div className="p-4 bg-gradient-to-r from-brand-50 to-orange-50 border-b border-orange-100/50" aria-hidden="true">
              <div className="flex items-center gap-3">
                <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{profile.full_name || 'Utilisateur'}</p>
                  <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="p-2">
              <Link href="/dashboard" onClick={onClose} role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <Home className="w-4 h-4 text-brand-500" aria-hidden="true" /> Tableau de bord
              </Link>
              <Link href="/profil" onClick={onClose} role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <User className="w-4 h-4 text-gray-400" aria-hidden="true" /> Mon profil
              </Link>
              <Link href="/mes-echanges" onClick={onClose} role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                <Activity className="w-4 h-4 text-indigo-500" aria-hidden="true" /> Mes échanges
              </Link>

              {/* Messages + Notifications : visibles seulement sous sm */}
              <Link href="/messages" onClick={onClose} role="menuitem"
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden"
                aria-label={unread.messages > 0 ? `Messages — ${unread.messages} non lu(s)` : 'Messages'}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <UnreadBadge count={unread.messages} />
                  </div>
                  Messages
                </div>
                {unread.messages > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1" aria-hidden="true">
                    {unread.messages > 99 ? '99+' : unread.messages}
                  </span>
                )}
              </Link>
              <Link href="/notifications" onClick={onClose} role="menuitem"
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden"
                aria-label={unread.notifications > 0 ? `Notifications — ${unread.notifications} non lue(s)` : 'Notifications'}
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-gray-400" aria-hidden="true" /> Notifications
                </div>
                {unread.notifications > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1" aria-hidden="true">
                    {unread.notifications > 99 ? '99+' : unread.notifications}
                  </span>
                )}
              </Link>

              {/* Rôles spéciaux */}
              {profile.role === 'artisan_verified' && (
                <Link href="/dashboard/artisan" onClick={onClose} role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Wrench className="w-4 h-4 text-gray-400" aria-hidden="true" /> Espace artisan
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={onClose} role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-brand-700 hover:bg-brand-50 transition-colors">
                  <Shield className="w-4 h-4" aria-hidden="true" /> Administration
                </Link>
              )}

              <div className="my-1.5 border-t border-gray-100" role="separator" />
              <Link href="/confiance" onClick={onClose} role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Shield className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Confiance & Sécurité
              </Link>
              <div className="my-1.5 border-t border-gray-100" role="separator" />

              <button
                type="button"
                role="menuitem"
                onClick={() => { onClose(); onSignOut(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" /> Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
