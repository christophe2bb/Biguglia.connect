/**
 * loading.tsx — Squelette de chargement pour associations/[id]
 *
 * Affiché pendant le fetch Supabase côté serveur (association + auteur + photos).
 * Structure miroir de la page réelle :
 *   • Hero avec photo de couverture
 *   • Infos clés (secteur, membres, date)
 *   • Description
 *   • Sidebar contact
 */

export default function AssociationDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* ── Hero ── */}
      <div className="relative w-full h-52 md:h-72 bg-gray-200">
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gray-300 border-4 border-white flex-shrink-0" />
          <div className="space-y-2 pb-1">
            <div className="h-7 w-56 rounded bg-white/60" />
            <div className="h-4 w-32 rounded bg-white/40" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <div className="h-6 w-20 rounded-full bg-gray-200" />
            <div className="h-6 w-24 rounded-full bg-gray-200" />
            <div className="h-6 w-16 rounded-full bg-gray-200" />
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <div className="h-5 w-28 rounded bg-gray-200 mb-3" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
            <div className="h-4 w-4/6 rounded bg-gray-100" />
            <div className="h-4 w-full rounded bg-gray-100" />
          </div>

          {/* Besoins / actions */}
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <div className="h-5 w-32 rounded bg-gray-200 mb-2" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 w-40 rounded bg-gray-200" />
                  <div className="h-3 w-56 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="bg-white rounded-2xl p-5 space-y-4">
            <div className="h-5 w-24 rounded bg-gray-200" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gray-200 flex-shrink-0" />
                <div className="h-4 w-36 rounded bg-gray-100" />
              </div>
            ))}
            <div className="h-10 w-full rounded-xl bg-gray-200" />
          </div>

          {/* Responsable */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="space-y-1">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
