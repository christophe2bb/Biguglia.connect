// ─────────────────────────────────────────────────────────────────────────────
// FreshnessIndicator — Affiche le temps écoulé depuis la publication
// Design : humain, lisible, avec indicateur coloré selon la fraîcheur
// IMPORTANT: 'use client' obligatoire — Date.now() cause un hydration mismatch
// si ce composant est rendu côté serveur (valeur différente entre SSR et client)
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreshnessIndicatorProps {
  createdAt: string;
  className?: string;
  showIcon?: boolean;
}

function getRelativeTime(dateStr: string): { label: string; level: 'fresh' | 'recent' | 'old' } {
  const now = Date.now();
  const created = new Date(dateStr).getTime();
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return {
      label: diffMins <= 1 ? 'À l\'instant' : `Il y a ${diffMins} min`,
      level: 'fresh',
    };
  }
  if (diffHours < 24) {
    return {
      label: diffHours === 1 ? 'Il y a 1 heure' : `Il y a ${diffHours} h`,
      level: 'fresh',
    };
  }
  if (diffDays === 1) {
    return { label: 'Hier', level: 'recent' };
  }
  if (diffDays < 7) {
    return { label: `Il y a ${diffDays} jours`, level: 'recent' };
  }
  const date = new Date(dateStr);
  const formatted = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
  return { label: formatted, level: 'old' };
}

const levelStyles = {
  fresh: 'text-emerald-600',
  recent: 'text-amber-600',
  old: 'text-gray-400',
};

export default function FreshnessIndicator({
  createdAt,
  className,
  showIcon = true,
}: FreshnessIndicatorProps) {
  const { label, level } = getRelativeTime(createdAt);

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', levelStyles[level], className)}>
      {showIcon && <Clock className="w-3 h-3 flex-shrink-0" />}
      {label}
    </span>
  );
}
