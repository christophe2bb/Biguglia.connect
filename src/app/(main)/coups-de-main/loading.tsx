/**
 * loading.tsx — Squelette de chargement pour /coups-de-main (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page : hero rose/rouge, liste de cartes.
 */

function CoupDeMainCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Titre */}
          <div className="h-5 w-4/5 rounded bg-gray-200" />
          {/* Auteur */}
          <div className="h-4 w-1/3 rounded bg-gray-100" />
        </div>
        {/* Badge urgence */}
        <div className="h-6 w-16 rounded-full bg-gray-200 flex-shrink-0" />
      </div>
      {/* Description */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-5/6 rounded bg-gray-100" />
      </div>
      {/* Meta */}
      <div className="flex flex-wrap gap-3">
        <div className="h-4 w-24 rounded bg-gray-100" />
        <div className="h-4 w-20 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function CoupsDeMainLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero rose ── */}
      <div className="bg-gradient-to-br from-rose-500 via-pink-600 to-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-9 w-56 rounded bg-white/30" />
                <div className="h-4 w-44 rounded bg-white/20" />
              </div>
            </div>
            <div className="h-12 w-48 rounded-xl bg-white/30" />
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="h-5 w-24 rounded bg-gray-200" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-gray-100" />
                  <div className="h-9 w-full rounded-lg bg-gray-200" />
                </div>
              ))}
            </div>
          </aside>

          {/* Liste */}
          <main className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-40 rounded bg-gray-200" />
              <div className="h-9 w-32 rounded-lg bg-gray-200" />
            </div>
            {[...Array(6)].map((_, i) => (
              <CoupDeMainCardSkeleton key={i} />
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
