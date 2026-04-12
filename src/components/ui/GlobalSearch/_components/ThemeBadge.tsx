'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_CONFIG, type ThemeKey } from '../_config';

interface ThemeBadgeProps {
  theme: string;
}

/**
 * Small coloured pill that identifies which section a search result belongs to.
 */
export default function ThemeBadge({ theme }: ThemeBadgeProps) {
  const cfg = THEME_CONFIG[theme as ThemeKey] ?? {
    label: 'Autre',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: <Search className="w-3.5 h-3.5" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
        cfg.bg,
        cfg.color,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
