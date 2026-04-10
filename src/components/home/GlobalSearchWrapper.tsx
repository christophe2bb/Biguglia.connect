// ─────────────────────────────────────────────────────────────────────────────
// GlobalSearchWrapper — Enveloppe client pour GlobalSearch dans un contexte SSR
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import GlobalSearch from '@/components/ui/GlobalSearch';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function GlobalSearchWrapper({ size = 'md' }: Props) {
  return <GlobalSearch size={size} />;
}
