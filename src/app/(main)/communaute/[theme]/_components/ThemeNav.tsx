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

  // Extract the active colour from headerBg for the indicator
  // e.g. "bg-gradient-to-r from-teal-500 to-cyan-500" → use textColor
  const activeStyle = `${themeConfig.textColor}`;

  const tabs: { id: ThemeTab; label: string; icon: React.ElementType; badge?: number | string }[] = [
    { id: 'membres',     label: 'Membres',     icon: Users,         badge: loading ? undefined : memberCount },
    { id: 'discussions', label: 'Discussions', icon: MessageSquare, badge: discussionCount > 0 ? discussionCount : undefined },
    ...(isLoggedIn ? [{ id: 'monprofil' as ThemeTab, label: 'Mon profil', icon: Settings }] : []),
  ];

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">

          {/* Link back to theme home */}
          <Link
            href={themeConfig.href}
            className={`
              flex items-center gap-2 px-3 py-3.5 text-sm whitespace-nowrap transition-colors
              text-gray-400 hover:text-gray-700 border-b-2 border-transparent
              hover:border-gray-300 mr-2
            `}
          >
            <IconComp className="w-4 h-4" />
            <span className="hidden sm:inline">{themeConfig.label}</span>
          </Link>

          {/* Vertical divider */}
          <div className="w-px h-5 bg-gray-200 mr-2 flex-shrink-0" />

          {/* Tabs */}
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-all duration-200
                  ${isActive
                    ? `${activeStyle} border-current`
                    : 'text-gray-500 hover:text-gray-800 border-transparent hover:border-gray-300'
                  }
                `}
              >
                <TabIcon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {tab.label}

                {/* Badge */}
                {tab.badge !== undefined && (
                  <span
                    className={`
                      inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold transition-colors
                      ${isActive
                        ? 'bg-current/10 text-current'
                        : 'bg-gray-100 text-gray-500'
                      }
                    `}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
