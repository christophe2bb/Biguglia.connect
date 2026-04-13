/**
 * SkeletonCard — Composants de chargement réutilisables
 *
 * Utilisés comme fallback dans les <Suspense> et pendant les états loading.
 * Principe : même taille que le composant réel pour éviter le layout shift (CLS).
 */

// ── Brique de base ────────────────────────────────────────────────────────────

export function SkeletonPulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

// ── Carte listing/matériel/événement (image + texte) ─────────────────────────

export function SkeletonListingCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Photo zone */}
      <div className="h-44 bg-gray-200 animate-pulse" />
      {/* Content */}
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
        <div className="flex gap-2 pt-1">
          <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-5 w-12 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Grille de 12 skeletons (page listing complète) ────────────────────────────

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListingCard key={i} />
      ))}
    </div>
  );
}

// ── Carte artisan (avatar + nom + métier) ─────────────────────────────────────

export function SkeletonArtisanCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="h-40 bg-gray-200 animate-pulse" />
      <div className="p-5 space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Ligne de liste (dashboard, admin) ─────────────────────────────────────────

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
      </div>
      <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// ── Bloc stat KPI (admin dashboard) ──────────────────────────────────────────

export function SkeletonKpi() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
        <div className="w-8 h-8 rounded-xl bg-gray-100 animate-pulse" />
      </div>
      <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKpi key={i} />
      ))}
    </div>
  );
}

// ── Section complète (titre + grille) ─────────────────────────────────────────

export function SkeletonSection() {
  return (
    <div className="space-y-4">
      <div className="h-6 bg-gray-200 rounded animate-pulse w-48" />
      <SkeletonGrid count={6} />
    </div>
  );
}
