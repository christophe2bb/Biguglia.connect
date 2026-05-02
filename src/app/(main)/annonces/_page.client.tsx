'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plus, Search, Filter, X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
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
import { formatPrice, formatRelative } from '@/lib/utils';
import type { Listing } from '@/types';

// ── Annonces exemple (vitrines) ───────────────────────────────────────────────

const SAMPLE_LISTINGS = [
  {
    id: 'sample-1',
    title: 'Vélo de route Decathlon — très bon état',
    price: 180,
    location: 'Les Collines',
    sector: 'les-collines',
    sectorIcon: '⛰️',
    sectorColor: 'emerald' as const,
    listing_type: 'sale',
    typeLabel: 'À vendre',
    typeColor: 'bg-blue-100 text-blue-700',
    emoji: '🏷️',
    date: 'il y a 2 jours',
    category: '🚴 Sport & Loisirs',
    image: null,
  },
  {
    id: 'sample-2',
    title: 'Canapé 3 places — cuir brun — à donner',
    price: null,
    location: 'Village de Biguglia',
    sector: 'village',
    sectorIcon: '🏘️',
    sectorColor: 'amber' as const,
    listing_type: 'free',
    typeLabel: 'Gratuit',
    typeColor: 'bg-green-100 text-green-700',
    emoji: '🎁',
    date: 'il y a 5 heures',
    category: '🛋️ Mobilier',
    image: null,
  },
  {
    id: 'sample-3',
    title: 'Table de jardin + 4 chaises en plastique',
    price: 60,
    location: 'La Marana',
    sector: 'la-marana',
    sectorIcon: '🏖️',
    sectorColor: 'cyan' as const,
    listing_type: 'sale',
    typeLabel: 'À vendre',
    typeColor: 'bg-blue-100 text-blue-700',
    emoji: '🏷️',
    date: 'il y a 1 jour',
    category: '🪑 Jardin & Terrasse',
    image: null,
  },
  {
    id: 'sample-4',
    title: 'Cours de soutien scolaire — collège & lycée',
    price: 20,
    location: 'Figabruna',
    sector: 'figabruna',
    sectorIcon: '🌊',
    sectorColor: 'blue' as const,
    listing_type: 'service',
    typeLabel: 'Service',
    typeColor: 'bg-purple-100 text-purple-700',
    emoji: '🛠️',
    date: 'il y a 3 jours',
    category: '📚 Cours & Formation',
    image: null,
  },
  {
    id: 'sample-5',
    title: 'Tondeuse à gazon thermique Husqvarna',
    price: 250,
    location: 'Casatorra',
    sector: 'casatorra',
    sectorIcon: '🌿',
    sectorColor: 'green' as const,
    listing_type: 'sale',
    typeLabel: 'À vendre',
    typeColor: 'bg-blue-100 text-blue-700',
    emoji: '🏷️',
    date: 'il y a 4 jours',
    category: '🌱 Jardin & Outillage',
    image: null,
  },
  {
    id: 'sample-6',
    title: 'Cherche remorque de chantier à louer',
    price: null,
    location: 'Ortale',
    sector: 'ortale',
    sectorIcon: '🏡',
    sectorColor: 'violet' as const,
    listing_type: 'wanted',
    typeLabel: 'Recherché',
    typeColor: 'bg-orange-100 text-orange-700',
    emoji: '🔍',
    date: 'il y a 6 heures',
    category: '🚛 Véhicules & Matériel',
    image: null,
  },
];

// ── Vitrine card (annonce exemple) ────────────────────────────────────────────

function SampleListingCard({ item }: { item: typeof SAMPLE_LISTINGS[0] }) {
  const colors = SECTOR_COLORS[item.sectorColor];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {/* Photo zone */}
      <div className={`relative h-36 ${colors.bg} flex items-center justify-center overflow-hidden`}>
        <span className="text-6xl opacity-20 select-none">{item.emoji}</span>
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-full shadow ${item.typeColor}`}>
            {item.emoji} {item.typeLabel}
          </span>
        </div>
        {/* Price badge */}
        <div className="absolute top-3 right-3">
          <span className="text-xs font-black bg-white/90 text-gray-800 px-2.5 py-1 rounded-full shadow">
            {item.listing_type === 'free' ? '🎁 Gratuit' : item.price ? `${item.price} €` : 'Prix libre'}
          </span>
        </div>
        {/* Title overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
          <p className="text-white font-black text-sm leading-tight line-clamp-1">{item.title}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-xs text-gray-500 line-clamp-1">{item.category}</p>
        <div className="flex items-center justify-between mt-auto">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
            {item.sectorIcon} {item.location}
          </span>
          <span className="text-xs text-gray-400">{item.date}</span>
        </div>
      </div>
    </div>
  );
}

// ── Sector window card ────────────────────────────────────────────────────────

function SectorWindow({
  sector,
  count,
  isActive,
  onClick,
}: {
  sector: typeof SECTORS[0];
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const colors = SECTOR_COLORS[sector.color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-4
        transition-all duration-200 cursor-pointer select-none
        ${isActive
          ? `${colors.bg} ${colors.border} shadow-md scale-105`
          : `bg-white border-gray-100 hover:${colors.bg} hover:${colors.border} hover:shadow-sm`
        }
      `}
    >
      <span className="text-3xl">{sector.icon}</span>
      <span className={`text-xs font-bold leading-tight text-center ${isActive ? colors.text : 'text-gray-700'}`}>
        {sector.name}
      </span>
      {count > 0 && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? colors.badgeSolid : 'bg-gray-100 text-gray-500'}`}>
          {count}
        </span>
      )}
      {isActive && (
        <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${colors.badgeSolid} flex items-center justify-center`}>
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        </span>
      )}
    </button>
  );
}

// ── Real listing card (compact vitrine style) ─────────────────────────────────

function VitrineListing({ listing, isSaved, onToggleSave }: {
  listing: Listing & { cover_url?: string | null; is_urgent?: boolean; sector_id?: string };
  isSaved: boolean;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
}) {
  const coverUrl = listing.cover_url ?? (listing.photos as Array<{ url: string }> | undefined)?.[0]?.url ?? null;
  const sector = listing.sector_id ? SECTORS.find(s => s.id === listing.sector_id) : null;
  const colors = sector ? SECTOR_COLORS[sector.color] : null;
  const priceLabel = listing.listing_type === 'free' ? '🎁 Gratuit' : listing.price ? formatPrice(listing.price) : 'Prix libre';

  const TYPE_EMOJIS: Record<string, string> = { sale: '🏷️', wanted: '🔍', free: '🎁', service: '🛠️', exchange: '🔄', rental: '🔑' };
  const TYPE_LABELS: Record<string, string> = { sale: 'À vendre', wanted: 'Recherché', free: 'Gratuit', service: 'Service', exchange: 'Échange', rental: 'Location' };
  const TYPE_COLORS: Record<string, string> = {
    sale: 'bg-blue-100 text-blue-700', wanted: 'bg-orange-100 text-orange-700',
    free: 'bg-green-100 text-green-700', service: 'bg-purple-100 text-purple-700',
    exchange: 'bg-amber-100 text-amber-700', rental: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <Link href={`/annonces/${listing.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full">
        {/* Photo */}
        <div className="relative h-36 overflow-hidden">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${colors ? colors.bg : 'bg-gray-100'}`}>
              <span className="text-5xl opacity-20">{listing.category?.icon || '📦'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Badges */}
          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full shadow ${TYPE_COLORS[listing.listing_type] || 'bg-gray-100 text-gray-700'}`}>
              {TYPE_EMOJIS[listing.listing_type]} {TYPE_LABELS[listing.listing_type]}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-black bg-white/90 text-gray-800 px-2 py-0.5 rounded-full shadow">
              {priceLabel}
            </span>
          </div>
          {listing.is_urgent && (
            <div className="absolute top-7 left-2">
              <span className="inline-block px-2 py-0.5 text-[9px] font-black rounded-full bg-red-500 text-white animate-pulse">⚡ URGENT</span>
            </div>
          )}
          {/* Fav button */}
          <button
            onClick={e => onToggleSave(listing.id, e)}
            className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow transition-colors ${
              isSaved ? 'bg-pink-500 text-white' : 'bg-white/80 text-gray-400 hover:text-pink-500 hover:bg-white'
            }`}
            title={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <svg className="w-3 h-3" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          {/* Title */}
          <div className="absolute bottom-2 left-2 right-8">
            <p className="text-white font-black text-xs leading-tight drop-shadow line-clamp-1">{listing.title}</p>
          </div>
        </div>
        {/* Footer */}
        <div className="p-3 flex-1 flex flex-col gap-1.5">
          {listing.category?.name && (
            <p className="text-[11px] text-gray-400 line-clamp-1">{listing.category.icon} {listing.category.name}</p>
          )}
          <div className="flex items-center justify-between mt-auto">
            {sector && colors ? (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                {sector.icon} {sector.name}
              </span>
            ) : listing.location ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                <MapPin className="w-2.5 h-2.5" /> {listing.location}
              </span>
            ) : <span />}
            <span className="text-[10px] text-gray-400">{formatRelative(listing.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnnoncesPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const { savedIds, toggleSave } = useFavorites();
  const page = useListingsPage(savedIds);

  const {
    categories, loading, filtered, paginated, totalPages, currentPage,
    categoryCounts, sectorCounts, activeFiltersCount, stats, filters,
    setSearch, setSelectedCategory, setSelectedType, setSelectedStatus,
    setSortBy, setFilterSector, setShowFavoritesOnly, setShowUrgentOnly,
    setShowFreeOnly, setShowAdvancedFilters, setCurrentPage, resetFilters,
  } = page;

  const goToPage = (n: number) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = activeFiltersCount > 0 || !!filters.search;

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

      {/* ── Vitrines par secteur ── */}
      {!hasActiveFilters && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Titre vitrines */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">🗺️ Explorer par quartier</h2>
                <p className="text-sm text-gray-500 mt-0.5">Cliquez sur un secteur pour filtrer les annonces</p>
              </div>
              <span className="text-xs text-gray-400 hidden sm:block">
                {Object.values(sectorCounts).reduce((a, b) => a + b, 0)} annonces géolocalisées
              </span>
            </div>

            {/* Fenêtres secteurs */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-8">
              {/* Toute la ville */}
              <button
                type="button"
                onClick={() => setFilterSector(null)}
                className={`
                  flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-4
                  transition-all duration-200 cursor-pointer
                  ${!filters.filterSector
                    ? 'bg-blue-50 border-blue-300 shadow-md scale-105'
                    : 'bg-white border-gray-100 hover:bg-blue-50 hover:border-blue-200'
                  }
                `}
              >
                <span className="text-3xl">🗺️</span>
                <span className={`text-xs font-bold leading-tight text-center ${!filters.filterSector ? 'text-blue-700' : 'text-gray-700'}`}>
                  Toute la ville
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${!filters.filterSector ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {page.listings.length}
                </span>
              </button>

              {SECTORS.map(sector => (
                <SectorWindow
                  key={sector.id}
                  sector={sector}
                  count={sectorCounts[sector.id] || 0}
                  isActive={filters.filterSector === sector.id}
                  onClick={() => setFilterSector(filters.filterSector === sector.id ? null : sector.id)}
                />
              ))}
            </div>

            {/* Séparateur */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-400 font-medium">
                  {loading ? 'Chargement…' : page.listings.length === 0 ? 'Annonces récentes' : `${page.listings.length} annonces disponibles`}
                </span>
              </div>
            </div>

            {/* Vitrines — 6 annonces exemple (quand aucune réelle ou pendant chargement) */}
            {page.listings.length === 0 && !loading && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block w-1 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-sm font-bold text-gray-700">Exemples d&apos;annonces</h3>
                  <span className="text-xs text-gray-400">— voici ce que vous pourrez trouver</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {SAMPLE_LISTINGS.map(item => (
                    <SampleListingCard key={item.id} item={item} />
                  ))}
                </div>
                {!profile && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">Soyez le premier à publier une annonce à Biguglia !</p>
                    <Link
                      href="/connexion"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-2.5 rounded-2xl hover:bg-blue-700 transition shadow"
                    >
                      <Plus className="w-4 h-4" /> Se connecter pour publier
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Grille vitrines réelles (aperçu 6 premières sans filtre actif) */}
            {page.listings.length > 0 && !loading && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-1 h-4 bg-blue-500 rounded-full" />
                    <h3 className="text-sm font-bold text-gray-700">
                      {filters.filterSector
                        ? `Annonces — ${SECTORS.find(s => s.id === filters.filterSector)?.name || 'Secteur'}`
                        : 'Annonces récentes'}
                    </h3>
                  </div>
                  <button
                    onClick={() => window.scrollTo({ top: 999, behavior: 'smooth' })}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Voir toutes →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {filtered.slice(0, 6).map(listing => (
                    <VitrineListing
                      key={listing.id}
                      listing={listing as Listing & { cover_url?: string | null; is_urgent?: boolean; sector_id?: string }}
                      isSaved={savedIds.has(listing.id)}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Body — liste complète ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0">

            {/* Sector filter (mobile/compact) */}
            <div className="bg-white rounded-2xl border border-gray-100 px-4 pt-3 pb-2 mb-4">
              <SectorFilter
                value={filters.filterSector}
                onChange={v => { setFilterSector(v); setCurrentPage(1); }}
                compact label="Secteur" allowCitywide
              />
            </div>

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
                  const count    = sectorCounts[sector.id] || 0;
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
