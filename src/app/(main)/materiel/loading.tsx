/**
 * loading.tsx — Squelette de chargement pour /materiel (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page : hero bleu-gris, grille de cartes matériel.
 */

function MaterielCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Image */}
      <div className="relative h-40 bg-gray-200" />
      <div className="p-4 space-y-3">
        {/* Titre */}
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        {/* Badge état */}
        <div className="h-5 w-20 rounded-full bg-gray-100" />
        {/* Prix/jour */}
        <div className="h-5 w-28 rounded bg-gray-200" />
        {/* Meta */}
        <div className="flex gap-3">
          <div className="h-4 w-20 rounded bg-gray-100" />
          <div className="h-4 w-16 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function MaterielLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero bleu-ardoise ── */}
      <div className="bg-gradient-to-br from-slate-500 via-slate-600 to-blue-700">
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
        {/* Barre recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 h-10 rounded-xl bg-gray-200" />
          <div className="h-10 w-36 rounded-xl bg-gray-200" />
        </div>

        {/* Grille */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(12)].map((_, i) => (
            <MaterielCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
