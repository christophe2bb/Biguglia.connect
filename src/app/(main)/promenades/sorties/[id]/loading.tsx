/**
 * loading.tsx — Squelette de chargement pour promenades/sorties/[id]
 *
 * Affiché pendant le fetch Supabase côté serveur.
 * Structure miroir de la page réelle :
 *   • Hero (photo + titre + date)
 *   • Onglets (infos, participants, commentaires)
 *   • Sidebar actions
 */

export default function OutingDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* ── Hero ── */}
      <div className="relative w-full h-56 md:h-80 bg-gray-200">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-white/30" />
            <div className="h-6 w-16 rounded-full bg-white/30" />
          </div>
          <div className="h-8 w-2/3 rounded bg-white/40" />
          <div className="h-4 w-40 rounded bg-white/30" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Contenu principal ── */}
        <div className="md:col-span-2 space-y-4">
          {/* Onglets */}
          <div className="flex gap-1 bg-white rounded-xl p-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-8 flex-1 rounded-lg ${i === 0 ? 'bg-blue-100' : 'bg-gray-100'}`} />
            ))}
          </div>

          {/* Infos clés */}
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <div className="h-5 w-32 rounded bg-gray-200 mb-2" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-200 flex-shrink-0" />
                  <div className="h-4 w-32 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <div className="h-5 w-28 rounded bg-gray-200 mb-2" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
            <div className="h-4 w-4/6 rounded bg-gray-100" />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Organisateur */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-100" />
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="h-4 w-12 rounded bg-gray-100" />
            </div>
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white" />
              ))}
            </div>
            <div className="h-10 w-full rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
