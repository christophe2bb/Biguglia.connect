/**
 * loading.tsx — Squelette de chargement pour /emploi/demandes (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page (page.tsx) :
 *   • Hero violet (from-purple-500 to-purple-700)
 *   • Layout lg:flex-row : sidebar filtres (lg:w-72) + liste principale
 *   • Cartes profils candidats (skeleton)
 */

// ── Carte candidat squelette ──────────────────────────────────────────────────
function JobDemandCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Nom candidat */}
          <div className="h-5 w-40 rounded bg-gray-200" />
          {/* Intitulé poste recherché */}
          <div className="h-4 w-56 rounded bg-gray-100" />
        </div>
        {/* Badge dispo */}
        <div className="h-6 w-20 rounded-full bg-gray-200 flex-shrink-0" />
      </div>
      {/* Compétences / résumé */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-4/5 rounded bg-gray-100" />
      </div>
      {/* Tags compétences */}
      <div className="flex flex-wrap gap-2 pt-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 w-20 rounded-full bg-gray-100" />
        ))}
      </div>
      {/* Meta : localisation, date */}
      <div className="flex gap-3">
        <div className="h-4 w-24 rounded bg-gray-100" />
        <div className="h-4 w-20 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function DemandesEmploiLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero violet ── */}
      <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Icône + titre */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-9 w-60 rounded bg-white/30" />
                <div className="h-4 w-44 rounded bg-white/20" />
              </div>
            </div>
            {/* CTA boutons */}
            <div className="flex gap-3">
              <div className="h-12 w-44 rounded-xl bg-white/30" />
              <div className="h-12 w-36 rounded-xl bg-white/15" />
            </div>
          </div>
          <div className="mt-5 h-4 w-96 rounded bg-white/20" />
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Sidebar filtres ── */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
            {/* Filtre panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="h-5 w-24 rounded bg-gray-200" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-gray-100" />
                  <div className="h-9 w-full rounded-lg bg-gray-200" />
                </div>
              ))}
            </div>
            {/* Encart CTA candidat */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-white/20" />
              <div className="h-5 w-36 rounded bg-white/30" />
              <div className="h-3 w-full rounded bg-white/20" />
              <div className="h-10 w-full rounded-lg bg-white/30" />
            </div>
          </aside>

          {/* ── Liste candidats ── */}
          <main className="flex-1 min-w-0 space-y-4">
            {/* Barre résultats + tri */}
            <div className="flex items-center justify-between mb-5">
              <div className="h-6 w-40 rounded bg-gray-200" />
              <div className="h-9 w-36 rounded-lg bg-gray-200" />
            </div>

            {/* Cartes */}
            {[...Array(6)].map((_, i) => (
              <JobDemandCardSkeleton key={i} />
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
