/**
 * loading.tsx — Squelette de chargement pour /forum (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page (_page.client.tsx) :
 *   • Hero violet avec stats + raccourcis
 *   • Barre de filtres + recherche
 *   • Feed de topics (squelette) + sidebar
 */

// ── Topic row squelette ────────────────────────────────────────────────────────
function TopicRowSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 items-start">
      {/* Avatar auteur */}
      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        {/* Badges */}
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
        </div>
        {/* Titre */}
        <div className="h-5 w-4/5 rounded bg-gray-200" />
        {/* Preview */}
        <div className="h-4 w-3/4 rounded bg-gray-100" />
        {/* Meta */}
        <div className="flex gap-4 pt-1">
          <div className="h-3 w-20 rounded bg-gray-100" />
          <div className="h-3 w-16 rounded bg-gray-100" />
          <div className="h-3 w-12 rounded bg-gray-100" />
        </div>
      </div>
      {/* Compteur réponses */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="h-6 w-6 rounded bg-gray-200" />
        <div className="h-3 w-12 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function ForumLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero violet ── */}
      <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0">
          {/* Breadcrumb */}
          <div className="h-4 w-48 rounded bg-violet-500/60 mb-5" />

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pb-6">
            <div className="max-w-2xl space-y-3">
              {/* Titre */}
              <div className="h-12 w-72 rounded bg-violet-500/60" />
              <div className="h-5 w-96 rounded bg-violet-400/50" />

              {/* Stats pills */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 w-28 rounded-2xl bg-white/10" />
                ))}
              </div>
            </div>
            {/* CTA Nouveau sujet */}
            <div className="h-12 w-40 rounded-2xl bg-white/20 flex-shrink-0" />
          </div>

          {/* Raccourcis catégories */}
          <div className="flex gap-2 pb-3 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 w-28 rounded-xl bg-white/15 flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">

          {/* ── Feed (colonne principale) ── */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Filtres */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 items-center">
              <div className="h-10 flex-1 rounded-xl bg-gray-200" />
              <div className="h-10 w-28 rounded-xl bg-gray-200" />
              <div className="h-10 w-28 rounded-xl bg-gray-200" />
            </div>

            {/* Topics */}
            {[...Array(8)].map((_, i) => (
              <TopicRowSkeleton key={i} />
            ))}
          </div>

          {/* ── Sidebar ── */}
          <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">
            {/* Stats forum */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="h-5 w-32 rounded bg-gray-200" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-28 rounded bg-gray-100" />
                  <div className="h-4 w-10 rounded bg-gray-200" />
                </div>
              ))}
            </div>

            {/* Sujets populaires */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="h-5 w-36 rounded bg-gray-200" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex-shrink-0" />
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
