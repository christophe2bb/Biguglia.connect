/**
 * loading.tsx — Squelette de chargement pour /promenades (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page : hero vert forêt, grille de cartes sorties.
 */

function PromenadeCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Image */}
      <div className="relative h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        {/* Titre */}
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        {/* Badges difficulté + type */}
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full bg-gray-100" />
          <div className="h-5 w-16 rounded-full bg-gray-100" />
        </div>
        {/* Description */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-4/5 rounded bg-gray-100" />
        </div>
        {/* Meta distance + participants + date */}
        <div className="flex gap-3">
          <div className="h-4 w-20 rounded bg-gray-100" />
          <div className="h-4 w-24 rounded bg-gray-100" />
          <div className="h-4 w-16 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function PromenadесLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero vert forêt ── */}
      <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-9 w-56 rounded bg-white/30" />
                <div className="h-4 w-44 rounded bg-white/20" />
              </div>
            </div>
            <div className="h-12 w-44 rounded-xl bg-white/30" />
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-gray-200" />
          ))}
        </div>

        {/* Grille */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(9)].map((_, i) => (
            <PromenadeCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
