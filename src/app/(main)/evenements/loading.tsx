/**
 * loading.tsx — Squelette de chargement pour /evenements (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page (_page.client.tsx) :
 *   • Hero violet/rose avec tabs
 *   • Event featured card
 *   • Grille de cartes événements (skeleton)
 *   • Sidebar (desktop)
 */

// ── Carte événement squelette ──────────────────────────────────────────────────
function EventCardSkeleton() {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 overflow-hidden shadow-sm">
      {/* Date banner */}
      <div className="h-2 w-full bg-gray-200" />
      <div className="p-4 space-y-2">
        {/* Date + badge */}
        <div className="flex gap-2 items-center">
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-5 w-16 rounded-full bg-gray-200" />
        </div>
        {/* Titre */}
        <div className="h-5 w-4/5 rounded bg-gray-200" />
        {/* Description */}
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-2/3 rounded bg-gray-100" />
        {/* Meta */}
        <div className="flex gap-3 pt-1">
          <div className="h-3 w-24 rounded bg-gray-100" />
          <div className="h-3 w-16 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function EvenementsLoading() {
  return (
    <div className="min-h-screen relative bg-gray-50 animate-pulse">

      {/* ── Hero violet/rose ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-600 to-pink-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              {/* Titre */}
              <div className="h-12 w-64 rounded bg-violet-500/60" />
              <div className="h-5 w-80 rounded bg-violet-400/50" />

              {/* Stats pills */}
              <div className="flex flex-wrap gap-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 w-32 rounded-2xl bg-white/15" />
                ))}
              </div>
            </div>
            {/* CTA */}
            <div className="h-12 w-44 rounded-2xl bg-white/20 flex-shrink-0" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-8 bg-white/10 rounded-2xl p-1 w-fit">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-9 w-24 rounded-xl ${i === 0 ? 'bg-white/30' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">

          {/* ── Contenu principal ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Filtres rapides */}
            <div className="bg-white/80 rounded-2xl border border-white/60 p-4 flex gap-2 flex-wrap">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-full bg-gray-200" />
              ))}
            </div>

            {/* Event vedette */}
            <div className="bg-white/80 rounded-2xl border border-white/60 p-5 space-y-3">
              <div className="h-5 w-32 rounded bg-gray-200" />
              <div className="h-7 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-5/6 rounded bg-gray-100" />
              <div className="flex gap-3">
                <div className="h-10 w-32 rounded-xl bg-gray-200" />
                <div className="h-10 w-28 rounded-xl bg-gray-100" />
              </div>
            </div>

            {/* Grille */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">
            {/* Filtre avancé */}
            <div className="bg-white/80 rounded-2xl border border-white/60 p-5 space-y-4">
              <div className="h-5 w-28 rounded bg-gray-200" />
              <div className="h-10 w-full rounded-xl bg-gray-200" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-gray-200" />
                  <div className="h-4 w-32 rounded bg-gray-100" />
                </div>
              ))}
            </div>

            {/* Prochain événement */}
            <div className="bg-white/80 rounded-2xl border border-white/60 p-5 space-y-3">
              <div className="h-5 w-36 rounded bg-gray-200" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-4 w-full rounded bg-gray-200" />
                    <div className="h-3 w-20 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
