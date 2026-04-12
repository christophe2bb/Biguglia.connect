'use client';

/**
 * Collectionneurs — orchestrateur (page)
 * Données : useCollectionneurs + useCollectionForum
 * UI      : ModeToolbar, AdvancedFilters, SectorBar, CategorySidebar,
 *           CategoryScrollBar, ItemCard, CollectionForum
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Loader2, Gem, Shield, BadgeCheck, Star,
  Sparkles, RefreshCw, Tag, MessageSquare, Users, LayoutGrid, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

// ── Hooks ────────────────────────────────────────────────────────────────────
import { useCollectionneurs } from './_hooks/useCollectionneurs';
import { useCollectionForum }  from './_hooks/useCollectionForum';

// ── Components ───────────────────────────────────────────────────────────────
import ItemCard from './_components/ItemCard';
import { CategorySidebar, CategoryScrollBar } from './_components/CategorySidebar';
import { ModeToolbar, AdvancedFilters, SectorBar } from './_components/CollectionFilters';
import CollectionForum from './_components/CollectionForum';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollectionneursPage() {
  const { profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'annonces' | 'forum'>('annonces');

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const col   = useCollectionneurs(profile?.id);
  const forum = useCollectionForum(profile?.id);

  // Load forum when the tab is first opened
  useEffect(() => {
    if (activeTab === 'forum') forum.fetchForum();
  }, [activeTab, forum.fetchForum]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Gem className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold text-white/80 uppercase tracking-wider">Collectionneurs</span>
              </div>
              <h1 className="text-3xl font-black mb-2">Objets de collection</h1>
              <p className="text-white/80 text-sm max-w-md leading-relaxed">
                Vendez, échangez, donnez ou recherchez des pièces rares.
                Plateforme spécialisée pour passionnés sérieux.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <HeroBadge icon={<Shield className="w-4 h-4" />} label="Membres vérifiés" />
                <HeroBadge icon={<BadgeCheck className="w-4 h-4" />} label="Avis certifiés" />
                <HeroBadge
                  icon={<Star className="w-4 h-4" />}
                  label={col.total > 0 ? `${col.total} objets` : 'Soyez le premier'}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link
                href="/collectionneurs/nouveau"
                className="flex items-center gap-2 bg-white text-orange-600 font-bold px-5 py-3 rounded-2xl hover:bg-orange-50 transition-colors shadow-lg text-sm"
              >
                <Plus className="w-4 h-4" /> Déposer une annonce
              </Link>
              {profile && (
                <Link
                  href="/dashboard/collectionneurs"
                  className="flex items-center gap-2 bg-white/20 text-white font-semibold px-5 py-2.5 rounded-2xl hover:bg-white/30 transition-colors text-sm"
                >
                  <LayoutGrid className="w-4 h-4" /> Mes annonces
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <TabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        forumCount={forum.forumPosts.length}
      />

      {/* ══ Forum tab ══════════════════════════════════════════════════════ */}
      {activeTab === 'forum' && (
        <CollectionForum isLoggedIn={!!profile} {...forum} />
      )}

      {/* ══ Annonces tab ═══════════════════════════════════════════════════ */}
      {activeTab === 'annonces' && (
        <>
          {/* Mode toolbar */}
          <ModeToolbar
            viewMode={col.viewMode}       setViewMode={col.setViewMode}
            selectedMode={col.selectedMode} setSelectedMode={col.setSelectedMode}
            showFilters={col.showFilters}   setShowFilters={col.setShowFilters}
            activeFiltersCount={col.activeFiltersCount}
          />

          {/* Advanced filters panel */}
          {col.showFilters && (
            <AdvancedFilters
              selectedStatus={col.selectedStatus} setSelectedStatus={col.setSelectedStatus}
              selectedCond={col.selectedCond}     setSelectedCond={col.setSelectedCond}
              selectedRarity={col.selectedRarity} setSelectedRarity={col.setSelectedRarity}
              priceMin={col.priceMin}             setPriceMin={col.setPriceMin}
              priceMax={col.priceMax}             setPriceMax={col.setPriceMax}
              sortBy={col.sortBy}                 setSortBy={col.setSortBy}
              shippingOnly={col.shippingOnly}     setShippingOnly={col.setShippingOnly}
              localOnly={col.localOnly}           setLocalOnly={col.setLocalOnly}
              activeFiltersCount={col.activeFiltersCount}
              resetFilters={col.resetFilters}
            />
          )}

          {/* Sector bar */}
          <SectorBar filterSector={col.filterSector} setFilterSector={col.setFilterSector} />

          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex gap-6">

              {/* Desktop sidebar */}
              <CategorySidebar
                categories={col.categories}
                selectedCat={col.selectedCat}
                total={col.total}
                onSelect={col.setSelectedCat}
              />

              {/* Main content */}
              <div className="flex-1 min-w-0">

                {/* Search bar + stats */}
                <SearchBar
                  search={col.search}
                  setSearch={col.setSearch}
                  total={col.total}
                  loading={col.loading}
                />

                {/* Mobile category scroll */}
                <CategoryScrollBar
                  categories={col.categories}
                  selectedCat={col.selectedCat}
                  onSelect={col.setSelectedCat}
                />

                {/* Featured section */}
                {col.enrichedItems.some(i => i.is_featured) &&
                  col.selectedMode === 'all' &&
                  col.selectedCat === 'all' &&
                  !col.search && (
                    <FeaturedSection items={col.enrichedItems} col={col} />
                  )}

                {/* Item grid */}
                <ItemGrid col={col} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Small presentational helpers ─────────────────────────────────────────────

function HeroBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-white/90">
      {icon}<span>{label}</span>
    </div>
  );
}

function TabBar({
  activeTab, setActiveTab, forumCount,
}: {
  activeTab: 'annonces' | 'forum';
  setActiveTab: (t: 'annonces' | 'forum') => void;
  forumCount: number;
}) {
  const tabs: { id: 'annonces' | 'forum'; label: string; icon: React.ElementType }[] = [
    { id: 'annonces', label: 'Annonces & troc',  icon: Tag },
    { id: 'forum',    label: 'Forum communauté', icon: MessageSquare },
  ];
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all',
                activeTab === id
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              )}
            >
              <Icon className="w-4 h-4" /> {label}
              {id === 'forum' && forumCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {forumCount}
                </span>
              )}
            </button>
          ))}
          <Link
            href="/communaute/collectionneurs"
            className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 border-transparent text-amber-600 hover:text-amber-800 hover:border-amber-300 transition-all ml-auto"
          >
            <Users className="w-4 h-4" /> Membres
          </Link>
        </div>
      </div>
    </div>
  );
}

function SearchBar({
  search, setSearch, total, loading,
}: { search: string; setSearch: (v: string) => void; total: number; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un objet, une marque, une série..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : `${total} annonce${total > 1 ? 's' : ''}`}
      </div>
    </div>
  );
}

type ColHook = ReturnType<typeof useCollectionneurs>;

function FeaturedSection({ items, col }: { items: ColHook['enrichedItems']; col: ColHook }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide">En vedette</h2>
      </div>
      <div className={cn('grid gap-4', col.viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1')}>
        {items.filter(i => i.is_featured).slice(0, 3).map(item => (
          <ItemCard
            key={item.id}
            item={item}
            currentUserId={undefined}
            onFavoriteToggle={col.handleFavoriteToggle}
            viewMode={col.viewMode}
          />
        ))}
      </div>
      <div className="my-6 border-t border-gray-100" />
    </div>
  );
}

function ItemGrid({ col }: { col: ColHook }) {
  const gridCls = col.viewMode === 'grid'
    ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
    : 'grid-cols-1';

  // Initial skeleton
  if (col.loading && col.items.length === 0) {
    return (
      <div className={cn('grid gap-4', gridCls)}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Refresh overlay
  if (col.loading && col.items.length > 0) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-white/60 z-10 flex items-start justify-center pt-20 rounded-2xl">
          <div className="flex items-center gap-2 bg-white shadow-lg rounded-2xl px-5 py-3 border border-gray-100">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">Chargement…</span>
          </div>
        </div>
        <div className={cn('grid gap-4 opacity-40', gridCls)}>
          {col.enrichedItems.slice(0, 8).map(item => (
            <ItemCard
              key={item.id}
              item={item}
              currentUserId={undefined}
              onFavoriteToggle={col.handleFavoriteToggle}
              viewMode={col.viewMode}
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (col.enrichedItems.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
        <div className="text-5xl mb-4">🔍</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune annonce trouvée</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
          {col.search
            ? `Aucun résultat pour "${col.search}"`
            : 'Soyez le premier à déposer une annonce dans cette catégorie !'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {col.activeFiltersCount > 0 && (
            <button
              onClick={col.resetFilters}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Supprimer les filtres
            </button>
          )}
          <Link
            href="/collectionneurs/nouveau"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" /> Déposer une annonce
          </Link>
        </div>
      </div>
    );
  }

  // Normal grid
  return (
    <>
      <div className={cn('grid gap-4', gridCls)}>
        {col.enrichedItems.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            currentUserId={undefined}
            onFavoriteToggle={col.handleFavoriteToggle}
            viewMode={col.viewMode}
          />
        ))}
      </div>
      {col.items.length < col.total && (
        <div className="mt-8 text-center">
          <button
            onClick={() => col.setPage(p => p + 1)}
            disabled={col.loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {col.loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            Charger plus ({col.total - col.items.length} restants)
          </button>
        </div>
      )}
    </>
  );
}
