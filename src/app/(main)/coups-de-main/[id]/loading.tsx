/**
 * loading.tsx — Squelette de chargement pour coups-de-main/[id]
 *
 * Affiché pendant le fetch Supabase côté serveur.
 * Structure miroir de la page réelle :
 *   • Hero (photo + titre + badges urgence/type)
 *   • Infos clés (lieu, dates, durée)
 *   • Description
 *   • Sidebar demandeur + bouton proposer aide
 */

export default function CoupDeMainDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* ── Barre retour ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-4 w-36 rounded bg-gray-200" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Colonne principale ── */}
        <div className="md:col-span-2 space-y-4">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <div className="h-7 w-24 rounded-full bg-orange-100" />
            <div className="h-7 w-20 rounded-full bg-gray-200" />
            <div className="h-7 w-16 rounded-full bg-gray-200" />
          </div>

          {/* Titre */}
          <div className="h-8 w-3/4 rounded bg-gray-200" />

          {/* Photo optionnelle */}
          <div className="w-full aspect-video rounded-2xl bg-gray-200" />

          {/* Infos clés */}
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <div className="h-5 w-32 rounded bg-gray-200 mb-2" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-200 flex-shrink-0" />
                  <div className="h-4 w-28 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <div className="h-5 w-28 rounded bg-gray-200 mb-2" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Demandeur */}
          <div className="bg-white rounded-2xl p-5 space-y-4">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-3 w-20 rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-10 w-full rounded-xl bg-orange-200" />
          </div>

          {/* Participants */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-4 w-10 rounded bg-gray-100" />
            </div>
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white" />
              ))}
            </div>
          </div>

          {/* Conseils sécurité */}
          <div className="bg-amber-50 rounded-2xl p-4 space-y-2">
            <div className="h-4 w-28 rounded bg-amber-200" />
            <div className="h-3 w-full rounded bg-amber-100" />
            <div className="h-3 w-4/5 rounded bg-amber-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
