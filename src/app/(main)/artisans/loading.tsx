/**
 * loading.tsx — Squelette de chargement pour /artisans (liste)
 *
 * Affiché pendant le fetch serveur lors d'une navigation côté client.
 * Structure miroir de la vraie page (_page.client.tsx) :
 *   • En-tête + filtres (recherche + catégorie)
 *   • Grille de cartes artisans 3 colonnes (skeleton)
 *
 * La page artisans est un Server Component sans hero coloré —
 * elle s'ouvre directement sur le contenu max-w-7xl centré.
 */

// ── Carte artisan squelette ────────────────────────────────────────────────────
function ArtisanCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Photo / placeholder */}
      <div className="h-40 bg-gray-200" />
      <div className="p-5 space-y-3">
        {/* Badges vérifié + type */}
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
        </div>
        {/* Avatar + nom */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-36 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
        </div>
        {/* Description */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-5/6 rounded bg-gray-100" />
        </div>
        {/* Note + localisation */}
        <div className="flex justify-between items-center pt-1">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function ArtisansLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">

      {/* ── En-tête ── */}
      <div className="mb-8 space-y-2">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-4 w-80 rounded bg-gray-100" />
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Recherche */}
        <div className="flex-1 h-10 rounded-xl bg-gray-200" />
        {/* Catégorie */}
        <div className="sm:w-56 h-10 rounded-xl bg-gray-200" />
      </div>

      {/* ── Grille 3 colonnes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
          <ArtisanCardSkeleton key={i} />
        ))}
      </div>

    </div>
  );
}
