'use client';

import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import CommunityJoinButton from '@/components/ui/CommunityJoinButton';
import type { ThemeConfig } from '../_types';

interface ThemeHeaderProps {
  themeSlug: string;
  themeConfig: ThemeConfig;
  memberCount: number;
  loading: boolean;
  userId?: string;
  onJoined: () => void;
  onLeft: () => void;
}

export default function ThemeHeader({
  themeSlug,
  themeConfig,
  memberCount,
  loading,
  userId,
  onJoined,
  onLeft,
}: ThemeHeaderProps) {
  return (
    <div className={`${themeConfig.headerBg} text-white`}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-white/70 text-sm mb-4">
          <Link href="/" className="hover:text-white transition">Accueil</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={themeConfig.href} className="hover:text-white transition">{themeConfig.label}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white font-medium">Communauté</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
              {themeConfig.emoji}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Communauté {themeConfig.label}</h1>
              <p className="text-white/80 text-sm mt-0.5">{themeConfig.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" />
              <span className="font-semibold">{loading ? '…' : memberCount}</span>
              <span className="text-white/80">membre{memberCount !== 1 ? 's' : ''}</span>
            </div>
            <CommunityJoinButton
              themeSlug={themeSlug}
              userId={userId}
              size="md"
              onJoined={onJoined}
              onLeft={onLeft}
              className="bg-white text-gray-800 hover:bg-gray-50 border-white/0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
