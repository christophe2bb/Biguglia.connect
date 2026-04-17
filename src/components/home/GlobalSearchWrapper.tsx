// ─────────────────────────────────────────────────────────────────────────────
// GlobalSearchWrapper — Enveloppe pour GlobalSearch dans le contexte SSR
// ─────────────────────────────────────────────────────────────────────────────
// Ce wrapper est utilisé dans la home page (Server Component).
// GlobalSearch nécessite 'use client' (hooks, keyboard events).
// On le charge en différé avec ssr:false pour :
//   1. Ne pas bloquer le SSR de la home (FCP plus rapide)
//   2. Afficher un placeholder stylé pendant l'hydratation
//
// Bénéfice mobile : le JS de GlobalSearch (~50KB) est chargé après le LCP.
// ─────────────────────────────────────────────────────────────────────────────

import dynamic from 'next/dynamic';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Placeholder statique affiché pendant le chargement JS
function SearchPlaceholder() {
  return (
    <div className="relative w-full">
      <div className="w-full h-14 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 animate-pulse" />
    </div>
  );
}

const GlobalSearch = dynamic(() => import('@/components/ui/GlobalSearch'), {
  ssr: false,
  loading: () => <SearchPlaceholder />,
});

export default function GlobalSearchWrapper({ size = 'md' }: Props) {
  return <GlobalSearch size={size} />;
}
