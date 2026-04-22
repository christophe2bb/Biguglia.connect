/**
 * loading.tsx — Squelette de chargement pour /perdu-trouve (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page : hero amber/orange, grille de cartes.
 */

function LostFoundCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Image */}
      <div className="relative h-40 bg-gray-200" />
      <div className="p-4 space-y-3">
        {/* Badge statut (perdu/trouvé) */}
        <div className="h-6 w-20 rounded-full bg-gray-200" />
        {/* Titre */}
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        {/* Description courte */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
        </div>
        {/* Meta localisation + date */}
        <div className="flex gap-3">
          <div className="h-4 w-24 rounded bg-gray-100" />
          <div className="h-4 w-20 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function PerduTrouveLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero amber ── */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-9 w-56 rounded bg-white/30" />
                <div className="h-4 w-44 rounded bg-white/20" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-12 w-36 rounded-xl bg-white/30" />
              <div className="h-12 w-36 rounded-xl bg-white/15" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs perdu/trouvé */}
        <div className="flex gap-3 mb-6">
          <div className="h-10 w-28 rounded-xl bg-gray-200" />
          <div className="h-10 w-28 rounded-xl bg-gray-200" />
        </div>

        {/* Grille */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(9)].map((_, i) => (
            <LostFoundCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
