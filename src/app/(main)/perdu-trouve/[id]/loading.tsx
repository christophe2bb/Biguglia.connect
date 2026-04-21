/**
 * loading.tsx — Squelette de chargement pour perdu-trouve/[id]
 *
 * Affiché pendant le fetch Supabase côté serveur (item + auteur + photos).
 * Structure miroir de la page réelle :
 *   • NavBar retour
 *   • Galerie photo
 *   • Panneau infos (type, statut, dates)
 *   • Panneau auteur
 *   • Conseils sécurité
 */

export default function PerduTrouveDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* ── NavBar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-4 w-40 rounded bg-gray-200" />
        <div className="ml-auto flex gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div className="w-8 h-8 rounded-full bg-gray-200" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* ── Badges statut ── */}
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-full bg-blue-100" />
          <div className="h-7 w-24 rounded-full bg-gray-200" />
        </div>

        {/* ── Titre ── */}
        <div className="h-8 w-3/4 rounded bg-gray-200" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ── Galerie ── */}
          <div className="md:col-span-2 space-y-4">
            <div className="w-full aspect-[4/3] rounded-2xl bg-gray-200" />

            {/* Panneau infos */}
            <div className="bg-white rounded-2xl p-5 space-y-3">
              <div className="h-5 w-36 rounded bg-gray-200 mb-3" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-3 w-20 rounded bg-gray-100" />
                    <div className="h-4 w-28 rounded bg-gray-200" />
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
            {/* Auteur */}
            <div className="bg-white rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-16 rounded bg-gray-100" />
                </div>
              </div>
              <div className="h-9 w-full rounded-xl bg-gray-200" />
            </div>

            {/* Conseils */}
            <div className="bg-amber-50 rounded-2xl p-4 space-y-2">
              <div className="h-4 w-32 rounded bg-amber-200" />
              <div className="h-3 w-full rounded bg-amber-100" />
              <div className="h-3 w-4/5 rounded bg-amber-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
