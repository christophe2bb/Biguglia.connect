'use client';

import Link from 'next/link';
import { UserCheck, AlertTriangle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import CommunityJoinButton from '@/components/ui/CommunityJoinButton';
import ThemeProfileForm from '@/components/ui/ThemeProfileForm';
import type { ThemeConfig } from '../_types';

interface ThemeProfileProps {
  themeSlug: string;
  themeConfig: ThemeConfig;
  isLoggedIn: boolean;
  userId?: string;
  avatarUrl?: string | null;
  fullName?: string;
  onJoined: () => void;
  onLeft: () => void;
  onSaved: () => void;
}

export default function ThemeProfile({
  themeSlug,
  themeConfig,
  isLoggedIn,
  userId,
  avatarUrl,
  fullName = '',
  onJoined,
  onLeft,
  onSaved,
}: ThemeProfileProps) {
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold mb-2">Connexion requise</p>
        <p className="text-sm text-gray-500 mb-4">
          Connectez-vous pour gérer votre profil dans cette communauté.
        </p>
        <Link
          href="/connexion"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Profile header */}
        <div className={`${themeConfig.headerBg} p-5 flex items-center gap-4 text-white`}>
          <Avatar src={avatarUrl} name={fullName} size="lg" />
          <div>
            <p className="font-bold text-lg">{fullName}</p>
            <p className="text-white/80 text-sm">Mon mini-profil · {themeConfig.label}</p>
          </div>
        </div>

        {/* Membership status */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Statut d&apos;adhésion</span>
          </div>
          <CommunityJoinButton
            themeSlug={themeSlug}
            userId={userId}
            size="sm"
            onJoined={onJoined}
            onLeft={onLeft}
          />
        </div>

        {/* Profile form */}
        <div className="p-5">
          {userId && (
            <ThemeProfileForm
              userId={userId}
              themeSlug={themeSlug}
              onSaved={onSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
}
