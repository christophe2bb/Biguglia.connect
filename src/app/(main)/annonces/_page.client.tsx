'use client';

import Link from 'next/link';
import { Plus, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Select from '@/components/ui/Select';
import SectorFilter from '@/components/ui/SectorFilter';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';
import { useFavorites } from './_hooks/useFavorites';
import { SkeletonGrid } from '@/components/ui/SkeletonCard';
import { useListingsPage } from './_hooks/useListingsPage';
import { ListingCard } from './_components/ListingCard';
import SectionTracker from '@/components/ui/SectionTracker';





// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnnoncesPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const { savedIds, toggleSave } = useFavorites();
  const page = useListingsPage(savedIds);

  const {
    categories, loading, filtered, paginated, totalPages, currentPage,
    categoryCounts, allSectorCounts, activeFiltersCount, stats, filters,
    setSearch, setSelectedCategory, setSelectedType, setSelectedStatus,
    setSortBy, setFilterSector, setShowFavoritesOnly, setShowUrgentOnly,
    setShowFreeOnly, setShowAdvancedFilters, setCurrentPage, resetFilters,
  } = page;

  const goToPage = (n: number) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SectionTracker section="annonces" />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">Vie pratique · Petites annonces</p>
              <h1 className="text-3xl md:text-4xl font-black mb-2">🛍️ Petites annonces</h1>
              <p className="text-blue-100 text-sm md:text-base max-w-xl">
                Achetez, vendez, échangez et donnez entre habitants de Biguglia — simple, local, gratuit.
              </p>
            </div>
            {profile && (
              <button
                onClick={() => router.push('/annonces/nouvelle')}
                className="flex items-center gap-2 bg-white text-blue-700 font-bold px-5 py-3 rounded-2xl hover:bg-blue-50 transition shadow-lg shadow-blue-900/20 shrink-0"
              >
                <Plus className="w-5 h-5" /> Publier une annonce
              </button>
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: 'Annonces actives', value: stats.total,    icon: '📦' },
              { label: 'À vendre',         value: stats.sale,     icon: '🏷️' },
              { label: 'Gratuits',          value: stats.free,     icon: '🎁' },
              { label: 'Échanges',          value: stats.exchange, icon: '🔄' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3 text-center">
                <div className="text-2xl font-black">{s.value}</div>
                <div className="text-blue-100 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Explorer par quartier ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-gray-900">🗺️ Explorer par quartier</h2>
              <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un secteur pour filtrer les annonces</p>
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">
              {Object.values(allSectorCounts).reduce((a, b) => a + b, 0)} annonces géolocalisées
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {/* Toute la ville */}
            <button
              type="button"
              onClick={() => { setFilterSector(null); setCurrentPage(1); }}
              className={`
                flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
                transition-all duration-200 cursor-pointer
                ${!filters.filterSector
                  ? 'bg-blue-50 border-blue-300 shadow-md scale-105'
                  : 'bg-white border-gray-100 hover:bg-blue-50 hover:border-blue-200'
                }
              `}
            >
              <span className="text-2xl">🗺️</span>
              <span className={`text-[10px] font-bold leading-tight text-center ${
                !filters.filterSector ? 'text-blue-700' : 'text-gray-700'
              }`}>
                Toute la ville
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                !filters.filterSector ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {filtered.length}
              </span>
            </button>

            {SECTORS.map(sector => {
              const count  = allSectorCounts[sector.id] || 0;
              const colors = SECTOR_COLORS[sector.color];
              const active = filters.filterSector === sector.id;
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => { setFilterSector(active ? null : sector.id); setCurrentPage(1); }}
                  className={`
                    relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
                    transition-all duration-200 cursor-pointer select-none
                    ${active
                      ? `${colors.bg} ${colors.border} shadow-md scale-105`
                      : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                    }
                  `}
                >
                  <span className="text-2xl">{sector.icon}</span>
                  <span className={`text-[10px] font-bold leading-tight text-center ${
                    active ? colors.text : 'text-gray-700'
                  }`}>
                    {sector.name}
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    active ? colors.badgeSolid : count > 0 ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-300'
                  }`}>
                    {count > 0 ? count : '–'}
                  </span>
                  {active && (
                    <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${colors.badgeSolid} flex items-center justify-center`}>
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Body — liste complète ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0">

            {/* Search + chips */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher (titre, catégorie, secteur, description…)"
                  value={filters.search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {filters.search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick-filter chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'sale',     label: '🏷️ À vendre'  },
                  { key: 'wanted',   label: '🔍 Recherché' },
                  { key: 'free',     label: '🎁 Gratuit'   },
                  { key: 'exchange', label: '🔄 Échange'   },
                  { key: 'service',  label: '🛠️ Service'   },
                  { key: 'rental',   label: '🔑 Location'  },
                ].map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => setSelectedType(filters.selectedType === chip.key ? '' : chip.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      filters.selectedType === chip.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowUrgentOnly(p => !p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filters.showUrgentOnly ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >⚡ Urgent</button>
                <button
                  onClick={() => setShowFreeOnly(p => !p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filters.showFreeOnly ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >🎁 Gratuit uniquement</button>
                <button
                  onClick={() => setShowFavoritesOnly(p => !p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filters.showFavoritesOnly ? 'bg-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >❤️ Mes favoris {savedIds.size > 0 && `(${savedIds.size})`}</button>
                <button
                  onClick={() => setShowAdvancedFilters(p => !p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${
                    filters.showAdvancedFilters || activeFiltersCount > 0
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  Filtres {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </button>
                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors">
                    ✕ Réinitialiser
                  </button>
                )}
              </div>

              {/* Advanced filters panel */}
              {filters.showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select value={filters.selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                    <option value="">Toutes catégories</option>
                    {categories.map(c => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
                  </Select>
                  <Select value={filters.selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                    <option value="active">⚡ Disponibles</option>
                    <option value="reserved">🔒 Réservées</option>
                    <option value="sold">✅ Vendues / Données</option>
                    <option value="expired">⏱ Expirées</option>
                    <option value="archived">📦 Archivées</option>
                    <option value="all">Toutes</option>
                  </Select>
                  <Select value={filters.sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="recent">🕐 Plus récentes</option>
                    <option value="price_asc">💶 Prix croissant</option>
                    <option value="price_desc">💶 Prix décroissant</option>
                  </Select>
                </div>
              )}
            </div>

            {/* Results header */}
            {!loading && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  {filtered.length} annonce{filtered.length > 1 ? 's' : ''}
                  {filters.search && ` pour « ${filters.search} »`}
                  {filters.filterSector && ` · ${SECTORS.find(s => s.id === filters.filterSector)?.name}`}
                </p>
                {!profile && (
                  <Link href="/connexion" className="text-xs text-blue-600 hover:underline">
                    Connectez-vous pour publier →
                  </Link>
                )}
              </div>
            )}

            {/* Grid / empty / skeleton */}
            {loading ? (
              <SkeletonGrid count={6} />
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune annonce trouvée</h3>
                <p className="text-gray-500 text-sm mb-6">
                  {activeFiltersCount > 0 || filters.search
                    ? 'Essayez de modifier vos filtres ou votre recherche.'
                    : 'Soyez le premier à publier une annonce !'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {(activeFiltersCount > 0 || filters.search) && (
                    <button onClick={resetFilters} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Effacer les filtres
                    </button>
                  )}
                  {profile && (
                    <button onClick={() => router.push('/annonces/nouvelle')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
                      Publier une annonce
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginated.map(listing => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      currentUserId={profile?.id}
                      isSaved={savedIds.has(listing.id)}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      onClick={() => goToPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Précédent
                    </button>
                    <span className="text-sm text-gray-500 font-medium">Page {currentPage} / {totalPages}</span>
                    <button
                      onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Suivant <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden xl:block w-72 shrink-0 space-y-4">

            {/* Publish CTA */}
            {!profile ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 text-center">
                <div className="text-3xl mb-3">🛍️</div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm">Rejoignez la communauté</h3>
                <p className="text-xs text-gray-500 mb-4">Publiez vos annonces gratuitement</p>
                <Link href="/connexion" className="block w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors text-center">
                  Se connecter
                </Link>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Publier une annonce</h3>
                <button
                  onClick={() => router.push('/annonces/nouvelle')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Nouvelle annonce
                </button>
              </div>
            )}

            {/* Explorer by sector — sidebar */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">🗺️ Explorer par secteur</h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => setFilterSector(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                    !filters.filterSector ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>🗺️ Tous les secteurs</span>
                  <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{page.listings.length}</span>
                </button>
                {SECTORS.map(sector => {
                  const count    = allSectorCounts[sector.id] || 0;
                  const colors   = SECTOR_COLORS[sector.color];
                  const isActive = filters.filterSector === sector.id;
                  return (
                    <button
                      key={sector.id}
                      onClick={() => setFilterSector(isActive ? null : sector.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                        isActive ? `${colors.badge} font-semibold` : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{sector.icon} {sector.name}</span>
                      {count > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? colors.badgeSolid : 'bg-gray-100 text-gray-600'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Popular categories */}
            {categories.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">📂 Catégories populaires</h3>
                <div className="space-y-1.5">
                  {categories.map(cat => {
                    const count    = categoryCounts[cat.id] || 0;
                    if (count === 0) return null;
                    const isActive = filters.selectedCategory === cat.slug;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(isActive ? '' : cat.slug)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                          isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span>{cat.icon} {cat.name}</span>
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Favourites */}
            {savedIds.size > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  ❤️ Mes favoris
                  <span className="text-xs font-bold bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">{savedIds.size}</span>
                </h3>
                <button
                  onClick={() => setShowFavoritesOnly(p => !p)}
                  className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
                    filters.showFavoritesOnly
                      ? 'bg-pink-500 text-white'
                      : 'bg-pink-50 text-pink-700 border border-pink-100 hover:bg-pink-100'
                  }`}
                >
                  {filters.showFavoritesOnly ? 'Voir toutes les annonces' : 'Voir mes favoris uniquement'}
                </button>
              </div>
            )}

            {/* Safety tips */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-amber-800 mb-2">🔒 Conseils de sécurité</h4>
              <ul className="text-xs text-amber-700 space-y-1.5">
                <li>• Rencontrez-vous dans un lieu public</li>
                <li>• Vérifiez le produit avant de payer</li>
                <li>• N&apos;envoyez pas d&apos;argent à l&apos;avance</li>
                <li>• Utilisez la messagerie de la plateforme</li>
                <li>• Méfiez-vous des offres trop alléchantes</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
