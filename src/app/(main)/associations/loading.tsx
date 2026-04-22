/**
 * loading.tsx — Squelette de chargement pour /associations (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page : hero vert, grille de cartes association.
 */

function AssociationCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Image placeholder */}
      <div className="relative h-36 bg-gray-200" />
      <div className="p-4 space-y-3">
        {/* Titre */}
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        {/* Catégorie badge */}
        <div className="h-5 w-24 rounded-full bg-gray-100" />
        {/* Description */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-4/5 rounded bg-gray-100" />
        </div>
        {/* Meta */}
        <div className="flex gap-3 pt-1">
          <div className="h-4 w-20 rounded bg-gray-100" />
          <div className="h-4 w-16 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function AssociationsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero vert ── */}
      <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-9 w-64 rounded bg-white/30" />
                <div className="h-4 w-48 rounded bg-white/20" />
              </div>
            </div>
            <div className="h-12 w-48 rounded-xl bg-white/30" />
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Barre filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-gray-200" />
          ))}
        </div>

        {/* Grille */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(9)].map((_, i) => (
            <AssociationCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
