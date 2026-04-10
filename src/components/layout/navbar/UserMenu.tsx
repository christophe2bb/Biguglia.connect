'use client';

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
 */
export default function UserMenu({
  profile, isAdmin, unread, isOpen, onToggle, onClose, onSignOut,
}: Props) {
  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
      >
        <div className="relative">
          <Avatar src={profile.avatar_url} name={profile.full_name || profile.email} size="sm" />
          {unread.total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[90px] truncate">
          {profile.full_name?.split(' ')[0] || 'Compte'}
        </span>
        <ChevronDown className={cn(
          'hidden sm:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden">

            {/* Header profil */}
            <div className="p-4 bg-gradient-to-r from-brand-50 to-orange-50 border-b border-orange-100/50">
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
              <Link href="/dashboard" onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <Home className="w-4 h-4 text-brand-500" /> Tableau de bord
              </Link>
              <Link href="/profil" onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <User className="w-4 h-4 text-gray-400" /> Mon profil
              </Link>
              <Link href="/mes-echanges" onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                <Activity className="w-4 h-4 text-indigo-500" /> Mes échanges
              </Link>

              {/* Messages + Notifications : visibles seulement sous sm (icônes cachées sinon) */}
              <Link href="/messages" onClick={onClose}
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <UnreadBadge count={unread.messages} />
                  </div>
                  Messages
                </div>
                {unread.messages > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                    {unread.messages > 99 ? '99+' : unread.messages}
                  </span>
                )}
              </Link>
              <Link href="/notifications" onClick={onClose}
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors sm:hidden">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-gray-400" /> Notifications
                </div>
                {unread.notifications > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                    {unread.notifications > 99 ? '99+' : unread.notifications}
                  </span>
                )}
              </Link>

              {/* Rôles spéciaux */}
              {profile.role === 'artisan_verified' && (
                <Link href="/dashboard/artisan" onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Wrench className="w-4 h-4 text-gray-400" /> Espace artisan
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-brand-700 hover:bg-brand-50 transition-colors">
                  <Shield className="w-4 h-4" /> Administration
                </Link>
              )}

              <div className="my-1.5 border-t border-gray-100" />
              <Link href="/confiance" onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Shield className="w-4 h-4 text-emerald-500" /> Confiance & Sécurité
              </Link>
              <div className="my-1.5 border-t border-gray-100" />

              <button
                onClick={() => { onClose(); onSignOut(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
