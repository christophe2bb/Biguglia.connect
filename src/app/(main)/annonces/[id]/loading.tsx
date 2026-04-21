/**
 * loading.tsx — Squelette de chargement pour annonces/[id]
 *
 * Affiché par Next.js App Router pendant le fetch serveur de la page
 * (createClient + requêtes Supabase). Remplace les spinners côté client
 * par un skeleton instantané côté serveur via <Suspense> automatique.
 *
 * Structure miroir de la page réelle :
 *   • Barre de retour
 *   • Galerie photo (placeholder coloré)
 *   • Bloc titre + prix
 *   • Bloc description
 *   • Sidebar vendeur
 */

export default function AnnonceDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="ml-auto flex gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div className="w-8 h-8 rounded-full bg-gray-200" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Galerie */}
          <div className="w-full aspect-[4/3] rounded-2xl bg-gray-200" />

          {/* Badge + titre */}
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200" />
              <div className="h-6 w-20 rounded-full bg-gray-200" />
            </div>
            <div className="h-7 w-3/4 rounded bg-gray-200" />
            <div className="h-9 w-32 rounded bg-gray-200" />
            <div className="flex gap-4 pt-1">
              <div className="h-4 w-24 rounded bg-gray-100" />
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="h-4 w-16 rounded bg-gray-100" />
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <div className="h-5 w-28 rounded bg-gray-200 mb-3" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
            <div className="h-4 w-4/6 rounded bg-gray-100" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
          </div>

          {/* Infos pratiques */}
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <div className="h-5 w-36 rounded bg-gray-200 mb-2" />
            <div className="h-4 w-48 rounded bg-gray-100" />
            <div className="h-4 w-40 rounded bg-gray-100" />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Carte vendeur */}
          <div className="bg-white rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-3 w-20 rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-10 w-full rounded-xl bg-gray-200" />
          </div>

          {/* Réputation */}
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <div className="h-5 w-32 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-2/3 rounded bg-gray-100" />
          </div>

          {/* Expiry */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="h-4 w-40 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
