'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Heart, Tag, Zap, Gift, ArrowLeftRight, Key, Star, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Listing, ListingCategory } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatusBadge from '@/components/ui/StatusBadge';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS, CONDITION_LABELS, formatPrice, formatRelative } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';
import SectorFilter, { SectorBadge } from '@/components/ui/SectorFilter';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';
import toast from 'react-hot-toast';

// Extended listing type labels including CDC types
const ALL_TYPE_LABELS: Record<string, string> = {
  ...LISTING_TYPE_LABELS,
  exchange: 'Échange',
  rental: 'Location',
};

const ALL_TYPE_COLORS: Record<string, string> = {
  ...LISTING_TYPE_COLORS,
  exchange: 'bg-amber-100 text-amber-700',
  rental: 'bg-cyan-100 text-cyan-700',
};

const ALL_TYPE_EMOJIS: Record<string, string> = {
  sale: '🏷️',
  wanted: '🔍',
  free: '🎁',
  service: '🛠️',
  exchange: '🔄',
  rental: '🔑',
};

const ITEMS_PER_PAGE = 12;

const CONDITION_EXTENDED: Record<string, string> = {
  neuf: '✨ Neuf',
  tres_bon: '👍 Très bon',
  bon: '👌 Bon état',
  usage: '🔧 Usagé',
  a_reparer: '🔨 À réparer',
  lot: '📦 Lot',
  excellent: '⭐ Excellent',
  passable: '⚠️ Passable',
};

export default function AnnoncesPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [sortBy, setSortBy] = useState('recent');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [sectorCounts, setSectorCounts] = useState<Record<string, number>>({});

  // Favorites in localStorage (quick, no DB call needed for list)
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('annonces_favorites');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  const toggleSave = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast('Annonce retirée des favoris', { icon: '💔' });
      } else {
        next.add(id);
        toast.success('Annonce sauvegardée en favoris !');
      }
      localStorage.setItem('annonces_favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: cats } = await supabase.from('listing_categories').select('*').order('display_order');
    setCategories(cats || []);

    let query = supabase
      .from('listings')
      .select('*, category:listing_categories(*), photos:listing_photos(*)');

    if (selectedStatus === 'active') query = query.eq('status', 'active');
    else if (selectedStatus === 'reserved') query = query.eq('status', 'reserved');
    else if (selectedStatus === 'sold') query = query.in('status', ['sold', 'given', 'exchanged']);
    else if (selectedStatus === 'expired') query = query.eq('status', 'expired');
    else if (selectedStatus === 'archived') query = query.eq('status', 'archived');
    else query = query.neq('status', 'archived');

    if (selectedCategory) {
      const cat = cats?.find(c => c.slug === selectedCategory);
      if (cat) query = query.eq('category_id', cat.id);
    }
    if (selectedType) query = query.eq('listing_type', selectedType);
    if (filterSector) query = query.eq('sector_id', filterSector);

    if (sortBy === 'price_asc') query = query.order('price', { ascending: true, nullsFirst: false });
    else if (sortBy === 'price_desc') query = query.order('price', { ascending: false, nullsFirst: false });
    else query = query.order('created_at', { ascending: false });

    const { data } = await query;
    const raw = (data as Listing[]) || [];
    setListings(raw);

    // Build category counts
    const catCounts: Record<string, number> = {};
    for (const l of raw) {
      const catId = (l as Listing & { category_id?: string }).category_id;
      if (catId) catCounts[catId] = (catCounts[catId] || 0) + 1;
    }
    setCategoryCounts(catCounts);

    // Build sector counts
    const secCounts: Record<string, number> = {};
    for (const l of raw) {
      const sId = (l as Listing & { sector_id?: string }).sector_id;
      if (sId) secCounts[sId] = (secCounts[sId] || 0) + 1;
    }
    setSectorCounts(secCounts);

    setLoading(false);
  }, [selectedCategory, selectedType, selectedStatus, sortBy, filterSector]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedType, selectedStatus, sortBy, filterSector, showFavoritesOnly, showUrgentOnly, showFreeOnly]);

  const filtered = listings.filter(l => {
    if (showFavoritesOnly && !savedIds.has(l.id)) return false;
    const lExt = l as Listing & { is_urgent?: boolean };
    if (showUrgentOnly && !lExt.is_urgent) return false;
    if (showFreeOnly && l.listing_type !== 'free' && l.price !== 0) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const catName = l.category?.name?.toLowerCase() || '';
    const sectorName = SECTORS.find(s => s.id === (l as Listing & { sector_id?: string }).sector_id)?.name?.toLowerCase() || '';
    return (
      l.title?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q) ||
      catName.includes(q) ||
      sectorName.includes(q)
    );
  });

  const activeFiltersCount = [
    selectedType, selectedCategory,
    showFavoritesOnly, showUrgentOnly, showFreeOnly, filterSector,
    selectedStatus !== 'active',
  ].filter(Boolean).length;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats for hero
  const stats = {
    total: listings.length,
    sale: listings.filter(l => l.listing_type === 'sale').length,
    free: listings.filter(l => l.listing_type === 'free').length,
    urgent: listings.filter(l => (l as Listing & { is_urgent?: boolean }).is_urgent).length,
    exchange: listings.filter(l => (l as Listing & { listing_type: string }).listing_type === 'exchange').length,
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedStatus('active');
    setSortBy('recent');
    setFilterSector(null);
    setShowFavoritesOnly(false);
    setShowUrgentOnly(false);
    setShowFreeOnly(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero section ── */}
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
                <Plus className="w-5 h-5" />
                Publier une annonce
              </button>
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: 'Annonces actives', value: stats.total, icon: '📦' },
              { label: 'À vendre', value: stats.sale, icon: '🏷️' },
              { label: 'Gratuits', value: stats.free, icon: '🎁' },
              { label: 'Échanges', value: stats.exchange, icon: '🔄' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3 text-center">
                <div className="text-2xl font-black">{s.value}</div>
                <div className="text-blue-100 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* ── Main column ── */}
          <div className="flex-1 min-w-0">
            {/* Sector filter */}
            <div className="bg-white rounded-2xl border border-gray-100 px-4 pt-3 pb-2 mb-4">
              <SectorFilter
                value={filterSector}
                onChange={v => { setFilterSector(v); setCurrentPage(1); }}
                compact
                label="Secteur"
                allowCitywide
              />
            </div>

            {/* Search + quick filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher (titre, catégorie, secteur, description…)"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick filter chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'sale', label: '🏷️ À vendre', type: 'type' },
                  { key: 'wanted', label: '🔍 Recherché', type: 'type' },
                  { key: 'free', label: '🎁 Gratuit', type: 'type' },
                  { key: 'exchange', label: '🔄 Échange', type: 'type' },
                  { key: 'service', label: '🛠️ Service', type: 'type' },
                  { key: 'rental', label: '🔑 Location', type: 'type' },
                ].map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => setSelectedType(prev => prev === chip.key ? '' : chip.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedType === chip.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowUrgentOnly(p => !p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    showUrgentOnly ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ⚡ Urgent
                </button>
                <button
                  onClick={() => setShowFreeOnly(p => !p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    showFreeOnly ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🎁 Gratuit uniquement
                </button>
                <button
                  onClick={() => setShowFavoritesOnly(p => !p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    showFavoritesOnly ? 'bg-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ❤️ Mes favoris {savedIds.size > 0 && `(${savedIds.size})`}
                </button>
                <button
                  onClick={() => setShowAdvancedFilters(p => !p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                    showAdvancedFilters || activeFiltersCount > 0
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  Filtres {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </button>
                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all">
                    ✕ Réinitialiser
                  </button>
                )}
              </div>

              {/* Advanced filters panel */}
              {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                    <option value="">Toutes catégories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>
                    ))}
                  </Select>
                  <Select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                    <option value="active">⚡ Disponibles</option>
                    <option value="reserved">🔒 Réservées</option>
                    <option value="sold">✅ Vendues / Données</option>
                    <option value="expired">⏱ Expirées</option>
                    <option value="archived">📦 Archivées</option>
                    <option value="all">Toutes</option>
                  </Select>
                  <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
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
                  {search && ` pour « ${search} »`}
                </p>
                {!profile && (
                  <Link href="/connexion" className="text-xs text-blue-600 hover:underline">
                    Connectez-vous pour publier →
                  </Link>
                )}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="h-44 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune annonce trouvée</h3>
                <p className="text-gray-500 text-sm mb-6">
                  {activeFiltersCount > 0 || search
                    ? 'Essayez de modifier vos filtres ou votre recherche.'
                    : 'Soyez le premier à publier une annonce !'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {(activeFiltersCount > 0 || search) && (
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
                      onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Précédent
                    </button>
                    <span className="text-sm text-gray-500 font-medium">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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

          {/* ── Sidebar (large screens) ── */}
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
                  <Plus className="w-4 h-4" />
                  Nouvelle annonce
                </button>
              </div>
            )}

            {/* Explorer by sector */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
                🗺️ Explorer par secteur
              </h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => setFilterSector(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                    !filterSector ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>🗺️ Tous les secteurs</span>
                  <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {listings.length}
                  </span>
                </button>
                {SECTORS.map(sector => {
                  const count = sectorCounts[sector.id] || 0;
                  const colors = SECTOR_COLORS[sector.color];
                  const isActive = filterSector === sector.id;
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

            {/* Catégories populaires */}
            {categories.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">📂 Catégories populaires</h3>
                <div className="space-y-1.5">
                  {categories.map(cat => {
                    const count = categoryCounts[cat.id] || 0;
                    if (count === 0) return null;
                    const isActive = selectedCategory === cat.slug;
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

            {/* Mes favoris */}
            {savedIds.size > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
                  ❤️ Mes favoris
                  <span className="text-xs font-bold bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">{savedIds.size}</span>
                </h3>
                <button
                  onClick={() => setShowFavoritesOnly(p => !p)}
                  className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
                    showFavoritesOnly
                      ? 'bg-pink-500 text-white'
                      : 'bg-pink-50 text-pink-700 border border-pink-100 hover:bg-pink-100'
                  }`}
                >
                  {showFavoritesOnly ? 'Voir toutes les annonces' : 'Voir mes favoris uniquement'}
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

// ── ListingCard Component ──────────────────────────────────────────────────
interface ListingCardProps {
  listing: Listing;
  currentUserId?: string;
  isSaved: boolean;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
}

function ListingCard({ listing, currentUserId, isSaved, onToggleSave }: ListingCardProps) {
  const photos = listing.photos as Array<{ url: string }> | undefined;
  const lExt = listing as Listing & { is_urgent?: boolean; sector_id?: string; author_id?: string; user_id?: string };
  const typeColor = ALL_TYPE_COLORS[listing.listing_type] || 'bg-gray-100 text-gray-700';
  const typeLabel = ALL_TYPE_LABELS[listing.listing_type] || listing.listing_type;
  const typeEmoji = ALL_TYPE_EMOJIS[listing.listing_type] || '📦';
  const ownerId = lExt.user_id || lExt.author_id;

  return (
    <Link href={`/annonces/${listing.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200">
        {/* Photo zone */}
        <div className="relative h-44 overflow-hidden">
          {photos && photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-5xl opacity-20">{listing.category?.icon || '📦'}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Type + status badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-full shadow ${typeColor}`}>
              {typeEmoji} {typeLabel}
            </span>
            {listing.status !== 'active' && (
              <StatusBadge status={listing.status} contentType="listing" size="xs" showIcon />
            )}
            {lExt.is_urgent && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-black rounded-full shadow bg-red-500 text-white animate-pulse">
                ⚡ URGENT
              </span>
            )}
          </div>

          {/* Price badge top right */}
          <div className="absolute top-3 right-3">
            <span className="text-xs font-black bg-white/90 text-gray-800 px-2.5 py-1 rounded-full shadow">
              {listing.listing_type === 'free' ? '🎁 Gratuit' : listing.price ? formatPrice(listing.price) : 'Prix libre'}
            </span>
          </div>

          {/* Favorite button */}
          <button
            onClick={e => onToggleSave(listing.id, e)}
            className={`absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center shadow transition-all ${
              isSaved ? 'bg-pink-500 text-white scale-110' : 'bg-white/80 text-gray-400 hover:text-pink-500 hover:bg-white'
            }`}
            title={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          {/* Title at bottom */}
          <div className="absolute bottom-3 left-3 right-12">
            <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{listing.title}</p>
            {listing.category?.name && <p className="text-white/75 text-xs mt-0.5">{listing.category.name}</p>}
          </div>
        </div>

        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-blue-700">
              {listing.listing_type === 'free' ? '🎁 Gratuit' : listing.price ? formatPrice(listing.price) : 'Prix à discuter'}
            </span>
            <span className="text-xs text-gray-400">{formatRelative(listing.created_at)}</span>
          </div>

          {listing.condition && (
            <p className="text-xs text-gray-400 mt-1">
              {CONDITION_EXTENDED[listing.condition] || CONDITION_LABELS[listing.condition] || listing.condition}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            {lExt.sector_id ? (
              <SectorBadge sectorId={lExt.sector_id} size="xs" />
            ) : <span />}
            {currentUserId && currentUserId !== ownerId && (
              <ReportButton targetType="listing" targetId={listing.id} targetTitle={listing.title} variant="icon" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
