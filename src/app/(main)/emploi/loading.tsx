/**
 * loading.tsx — Squelette de chargement pour /emploi (index)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client
 * vers la page d'accueil emploi (qui redirige vers offres/demandes).
 * Structure simple : hero + liens vers les deux sections.
 */

export default function EmploiLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">

      {/* ── Hero orange brand ── */}
      <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex-shrink-0" />
            <div className="space-y-2">
              <div className="h-9 w-48 rounded bg-white/30" />
              <div className="h-4 w-64 rounded bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Cartes sections ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200" />
              <div className="h-7 w-2/3 rounded bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-4/5 rounded bg-gray-100" />
              </div>
              <div className="h-10 w-32 rounded-xl bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
