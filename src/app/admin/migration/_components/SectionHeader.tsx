/**
 * SectionHeader — en-tête de section réutilisable.
 */

'use client';

import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  iconBg: string;     // Tailwind bg + rounded class, e.g. "bg-emerald-100"
  iconColor: string;  // Tailwind text class, e.g. "text-emerald-600"
  title: string;
  subtitle: string;
}

export function SectionHeader({ icon: Icon, iconBg, iconColor, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8">
      <div className={`p-3 rounded-2xl ${iconBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <h2 className="text-xl font-black text-gray-900">{title}</h2>
        <p className="text-gray-500 text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
