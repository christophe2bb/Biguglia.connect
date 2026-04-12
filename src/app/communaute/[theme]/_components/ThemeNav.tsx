'use client';

import Link from 'next/link';
import { Users, MessageSquare, Settings } from 'lucide-react';
import type { ThemeConfig, ThemeTab } from '../_types';

interface ThemeNavProps {
  themeConfig: ThemeConfig;
  activeTab: ThemeTab;
  onTabChange: (tab: ThemeTab) => void;
  memberCount: number;
  discussionCount: number;
  loading: boolean;
  isLoggedIn: boolean;
}

export default function ThemeNav({
  themeConfig,
  activeTab,
  onTabChange,
  memberCount,
  discussionCount,
  loading,
  isLoggedIn,
}: ThemeNavProps) {
  const IconComp = themeConfig.icon;

  const tabClass = (tab: ThemeTab) =>
    `flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition ${
      activeTab === tab
        ? 'text-brand-700 border-brand-500 font-semibold'
        : 'text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-300'
    }`;

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {/* Link to theme home */}
          <Link
            href={themeConfig.href}
            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:text-gray-900 whitespace-nowrap border-b-2 border-transparent hover:border-gray-300 transition"
          >
            <IconComp className="w-4 h-4" />
            {themeConfig.label}
          </Link>

          {/* Membres tab */}
          <button onClick={() => onTabChange('membres')} className={tabClass('membres')}>
            <Users className="w-4 h-4" />
            Membres
            {!loading && (
              <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {memberCount}
              </span>
            )}
          </button>

          {/* Discussions tab */}
          <button onClick={() => onTabChange('discussions')} className={tabClass('discussions')}>
            <MessageSquare className="w-4 h-4" />
            Discussions
            {discussionCount > 0 && (
              <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {discussionCount}
              </span>
            )}
          </button>

          {/* Mon profil tab (logged in only) */}
          {isLoggedIn && (
            <button onClick={() => onTabChange('monprofil')} className={tabClass('monprofil')}>
              <Settings className="w-4 h-4" />
              Mon profil
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
