/**
 * loading.tsx — Squelette de chargement pour /collectionneurs (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page : hero violet, grille de cartes objets.
 */

function CollectionCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Image */}
      <div className="relative h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        {/* Titre */}
        <div className="h-5 w-4/5 rounded bg-gray-200" />
        {/* Badges */}
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full bg-gray-100" />
          <div className="h-5 w-16 rounded-full bg-gray-100" />
        </div>
        {/* Prix / valeur */}
        <div className="h-5 w-24 rounded bg-gray-200" />
        {/* Meta */}
        <div className="flex gap-3">
          <div className="h-4 w-20 rounded bg-gray-100" />
          <div className="h-4 w-16 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function CollectionneursLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero violet ── */}
      <div className="bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-9 w-64 rounded bg-white/30" />
                <div className="h-4 w-48 rounded bg-white/20" />
              </div>
            </div>
            <div className="h-12 w-44 rounded-xl bg-white/30" />
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres catégories */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 w-28 rounded-full bg-gray-200" />
          ))}
        </div>

        {/* Grille */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(12)].map((_, i) => (
            <CollectionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
