'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, MessageCircle, Sparkles,
  Users, TrendingUp, CheckCheck,
  MessageSquare, X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { SECTOR_COLORS, SECTORS_DEFAULT } from './_config';

import { useForumPage } from './useForumPage';
import { HERO_SHORTCUTS } from './_config';
import { ForumFilters } from './_components/ForumFilters';
import { ForumFeed } from './_components/ForumFeed';
import { ForumSidebar } from './_components/ForumSidebar';
import ForumCreateThemeModal from './_components/ForumCreateThemeModal';
import SectionTracker from '@/components/ui/SectionTracker';

// ─── Page inner ───────────────────────────────────────────────────────────────
function ForumPageInner() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const forum = useForumPage();

  const {
    // data
    sectors, categories, topics, hotTopics, recentlyResolved, stats, loading,
    // filter state
    selectedSector, selectedCategory,
    sortMode, searchInput, searchQuery,
    viewMode, showFilters, statusFilter, urgencyFilter,
    activeFiltersCount, selectedType,
    // setters
    setSelectedSector, setSelectedCategory, setSelectedType,
    setSortMode, setSearchInput, setViewMode,
    setShowFilters, setStatusFilter, setUrgencyFilter,
    // actions
    handleSearch, clearFilters, fetchData,
  } = forum;

  return (
    <div className="min-h-screen bg-gray-50">
      <SectionTracker section="forum" />

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <div className="relative bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] bg-dot-grid-22-thick" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-300/15 rounded-full blur-2xl translate-y-1/3" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-purple-300/10 rounded-full blur-2xl -translate-y-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5 text-violet-200 text-sm">
            <span className="p-1.5 bg-white/15 rounded-lg"><MessageSquare className="w-4 h-4" /></span>
            <span className="font-medium opacity-90">Forum · Vie locale Biguglia</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-none tracking-tight">
                💬 Forum local<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-indigo-200">Biguglia</span>
              </h1>
              <p className="text-white/80 text-lg leading-relaxed mb-5 max-w-xl">
                Votre espace pour échanger, signaler, proposer et vous entraider — entre voisins, pour votre quartier.
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-2.5 mb-6">
                {[
                  { icon: MessageCircle, val: stats.topics,   label: 'sujets',   sub: 'discussions actives',  color: 'text-violet-200'  },
                  { icon: TrendingUp,    val: stats.replies,  label: 'réponses', sub: 'échanges locaux',      color: 'text-indigo-200'  },
                  { icon: Users,         val: stats.members,  label: 'membres',  sub: 'habitants actifs',     color: 'text-purple-200'  },
                  { icon: CheckCheck,    val: stats.resolved, label: 'résolus',  sub: 'problèmes réglés',     color: 'text-emerald-200' },
                ].map(({ icon: I, val, label, sub, color }) => (
                  <div key={label} className="inline-flex items-center gap-2.5 bg-white/12 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 hover:bg-white/20 transition-colors">
                    <I className={cn('w-4 h-4 flex-shrink-0', color)} />
                    <div>
                      <p className="text-sm font-black leading-tight">{val} <span className="font-bold opacity-90">{label}</span></p>
                      <p className="text-[11px] text-violet-200/80 leading-tight">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Raccourcis hero */}
              <div className="flex flex-wrap gap-2 mb-2">
                {HERO_SHORTCUTS.map(s => (
                  <button key={s.slug} onClick={() => setSelectedCategory(s.slug)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/25 transition-colors backdrop-blur-sm">
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
              {profile ? (
                <>
                  <button onClick={() => router.push('/forum/nouveau')}
                    className="inline-flex items-center justify-center gap-2 bg-white text-violet-700 font-black px-7 py-3.5 rounded-2xl hover:bg-violet-50 transition-transform shadow-xl hover:-translate-y-0.5 text-sm w-full lg:w-auto">
                    <Plus className="w-5 h-5" /> Nouveau sujet
                  </button>
                  <button onClick={() => setShowThemeModal(true)}
                    className="inline-flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white font-bold px-7 py-3 rounded-2xl hover:bg-white/25 transition-colors text-sm w-full lg:w-auto">
                    <Sparkles className="w-4 h-4" /> Créer un thème
                  </button>
                </>
              ) : (
                <Link href="/connexion"
                  className="inline-flex items-center justify-center gap-2 bg-white text-violet-700 font-black px-7 py-3.5 rounded-2xl hover:bg-violet-50 transition-colors shadow-xl text-sm w-full lg:w-auto">
                  <Plus className="w-5 h-5" /> Rejoindre la discussion
                </Link>
              )}
            </div>
          </div>

          {/* Secteurs — grille identique à la page Promenades */}
          <div className="mt-8 pt-6 border-t border-white/15">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-black text-white">🗺️ Explorer par quartier</p>
              {selectedSector && (
                <button onClick={() => setSelectedSector(null)} className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                  <X className="w-3 h-3" /> Tout afficher
                </button>
              )}
            </div>
            <p className="text-xs text-violet-200/70 mb-4">Cliquez sur un secteur pour filtrer les sujets</p>

            <div className="grid grid-cols-4 sm:grid-cols-9 gap-2 pb-6">

              {/* Toute la ville */}
              <button
                type="button"
                onClick={() => setSelectedSector(null)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all duration-200',
                  !selectedSector
                    ? 'bg-white/20 border-white shadow-md scale-105'
                    : 'bg-white/8 border-white/20 hover:bg-white/15 hover:border-white/40'
                )}
              >
                <span className="text-2xl">🗺️</span>
                <span className={cn('text-[10px] font-bold leading-tight text-center',
                  !selectedSector ? 'text-white' : 'text-white/80'
                )}>
                  Toute la ville
                </span>
                <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full',
                  !selectedSector ? 'bg-white text-violet-700' : 'bg-white/20 text-white'
                )}>
                  {topics.length}
                </span>
              </button>

              {sectors
                .filter(s => SECTORS_DEFAULT.some(d => d.id === s.id || d.slug === s.slug))
                .map(sector => {
                const sectorTopicCount = topics.filter(t =>
                  t.sector_id === sector.id || (t as unknown as { sector?: { id: string } }).sector?.id === sector.id
                ).length;
                const colors  = SECTOR_COLORS[sector.color];
                const isActive = selectedSector === sector.id || selectedSector === sector.slug;
                return (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => setSelectedSector(isActive ? null : sector.id)}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition-all duration-200',
                      isActive
                        ? 'bg-white/20 border-white shadow-md scale-105'
                        : 'bg-white/8 border-white/20 hover:bg-white/15 hover:border-white/40'
                    )}
                  >
                    <span className="text-2xl">{sector.icon}</span>
                    <span className="text-[10px] font-bold leading-tight text-center text-white/90">
                      {sector.name}
                    </span>
                    <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full',
                      isActive
                        ? 'bg-white text-violet-700'
                        : sectorTopicCount > 0 ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
                    )}>
                      {sectorTopicCount > 0 ? sectorTopicCount : '–'}
                    </span>
                    {isActive && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-violet-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          BARRE CATÉGORIES STICKY
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <button onClick={() => setSelectedCategory(null)}
              className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors whitespace-nowrap flex-shrink-0',
                !selectedCategory ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
              Toutes les catégories
            </button>
            {categories.map(cat => {
              const isActive = selectedCategory === cat.id || selectedCategory === cat.slug;
              return (
                <button key={cat.id} onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                  className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors whitespace-nowrap flex-shrink-0',
                    isActive ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
                  <span>{cat.icon}</span> {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          LAYOUT PRINCIPAL
      ══════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* Colonne principale */}
          <div className="flex-1 min-w-0 flex flex-col gap-0">
            <ForumFilters
              sectors={sectors}
              categories={categories}
              selectedSector={selectedSector}
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              sortMode={sortMode}
              searchInput={searchInput}
              searchQuery={searchQuery}
              viewMode={viewMode}
              showFilters={showFilters}
              statusFilter={statusFilter}
              urgencyFilter={urgencyFilter}
              activeFiltersCount={activeFiltersCount}
              setSelectedSector={setSelectedSector}
              setSelectedCategory={setSelectedCategory}
              setSelectedType={setSelectedType}
              setSortMode={setSortMode}
              setSearchInput={setSearchInput}
              setViewMode={setViewMode}
              setShowFilters={setShowFilters}
              setStatusFilter={setStatusFilter}
              setUrgencyFilter={setUrgencyFilter}
              handleSearch={handleSearch}
              clearFilters={clearFilters}
              topicCount={topics.length}
              loading={loading}
            />
            <ForumFeed
              topics={topics}
              sectors={sectors}
              loading={loading}
              viewMode={viewMode}
              activeFiltersCount={activeFiltersCount}
              isAuthenticated={!!profile}
              clearFilters={clearFilters}
            />
          </div>

          {/* Sidebar */}
          <ForumSidebar
            profile={profile}
            topics={topics}
            hotTopics={hotTopics}
            recentlyResolved={recentlyResolved}
            sectors={sectors}
            categories={categories}
            selectedSector={selectedSector}
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            setSelectedSector={setSelectedSector}
            setSelectedCategory={setSelectedCategory}
            setSelectedType={setSelectedType}
          />
        </div>
      </div>

      {/* ── Modal création de thème ── */}
      {showThemeModal && profile && (
        <ForumCreateThemeModal
          profileId={profile.id}
          categories={categories}
          onClose={() => setShowThemeModal(false)}
          onCreated={() => {
            setShowThemeModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ─── Export avec Suspense ─────────────────────────────────────────────────────
export default function ForumPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-700 h-64 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28" />
          ))}
        </div>
      </div>
    }>
      <ForumPageInner />
    </Suspense>
  );
}
