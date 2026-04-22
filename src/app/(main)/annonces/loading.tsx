/**
 * loading.tsx — Squelette de chargement pour /annonces (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page (_page.client.tsx) :
 *   • Hero bleu avec stats bar
 *   • Barre de filtres secteur + recherche
 *   • Grille de cartes annonces (skeleton)
 */

// ── Carte annonce squelette ────────────────────────────────────────────────────
function AnnonceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Photo placeholder */}
      <div className="w-full aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-2">
        {/* Badge type */}
        <div className="h-5 w-16 rounded-full bg-gray-200" />
        {/* Titre */}
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        {/* Prix */}
        <div className="h-6 w-24 rounded bg-gray-200" />
        {/* Meta (date, lieu) */}
        <div className="flex gap-3 pt-1">
          <div className="h-3 w-20 rounded bg-gray-100" />
          <div className="h-3 w-16 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function AnnoncesLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero bleu ── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-2">
              <div className="h-3 w-40 rounded bg-blue-500/60" />
              <div className="h-9 w-56 rounded bg-blue-500/60" />
              <div className="h-4 w-80 rounded bg-blue-400/50" />
            </div>
            {/* CTA publier */}
            <div className="h-12 w-44 rounded-2xl bg-white/20" />
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/10 rounded-2xl px-4 py-3">
                <div className="h-7 w-10 rounded bg-white/30 mx-auto mb-1" />
                <div className="h-3 w-24 rounded bg-white/20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 space-y-4">

            {/* Filtre secteur */}
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-7 w-20 rounded-full bg-gray-200" />
                ))}
              </div>
            </div>

            {/* Barre recherche + chips */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="h-10 w-full rounded-xl bg-gray-200" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 w-24 rounded-full bg-gray-200" />
                ))}
              </div>
            </div>

            {/* Grille de cartes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <AnnonceCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
