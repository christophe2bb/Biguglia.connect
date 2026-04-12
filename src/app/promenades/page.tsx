'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import {
  TreePine, Footprints, MessageSquare, Users, Star, X, Zap, ArrowRight,
  Plus, SlidersHorizontal, Filter, AlertCircle, MapPin,
} from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import { cn } from '@/lib/utils';
import { QUICK_FILTERS, DEFAULT_ADV_FILTERS } from './_constants';
import { usePromenades } from './_hooks/usePromenades';
import { useForum } from './_hooks/useForum';
import { useOutings } from './_hooks/useOutings';
import TabItineraires from './_components/TabItineraires';
import TabForum from './_components/TabForum';
import TabAgenda from './_components/TabAgenda';
import PromenadesSidebar from './_components/PromenadesSidebar';
import type { AdvFilters } from './_types';

export default function PromenadePage() {
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

  const [activeTab, setActiveTab] = useState<'itineraires' | 'forum' | 'agenda'>('itineraires');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [advFilters, setAdvFilters] = useState<AdvFilters>(DEFAULT_ADV_FILTERS);

  // Lire ?tab= depuis l'URL côté client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'agenda') setActiveTab('agenda');
      else if (tab === 'forum') setActiveTab('forum');
      else setActiveTab('itineraires');
    }
  }, []);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const promenadHook = usePromenades(profile, quickFilter, advFilters, filterSector);
  const forumHook = useForum(profile);
  const outingsHook = useOutings(profile);

  // Fetch triggers
  useEffect(() => { promenadHook.fetchPromenades(); }, [promenadHook.fetchPromenades]);
  useEffect(() => { if (activeTab === 'forum') forumHook.fetchForum(); }, [activeTab, forumHook.fetchForum]);
  useEffect(() => { if (activeTab === 'agenda') outingsHook.fetchOutings(); }, [activeTab, outingsHook.fetchOutings]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const { promenades, loadingPromenades, dbReady } = promenadHook;
  const { outings } = outingsHook;
  const { forumPosts } = forumHook;
  const totalCount = promenades.length;
  const nextOuting = outings[0];

  const activeFiltersCount = [
    quickFilter,
    advFilters.dogs, advFilters.stroller, advFilters.parking,
    advFilters.water, advFilters.shade, advFilters.sunset, advFilters.loop,
    advFilters.duration_max, filterSector,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setQuickFilter(null);
    setAdvFilters(DEFAULT_ADV_FILTERS);
    setFilterSector(null);
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── BANNER DB manquante ── */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Tables de base de données manquantes</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Exécutez <code className="bg-amber-100 px-1 rounded font-mono">src/lib/migration_themes.sql</code> dans votre éditeur SQL Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-600 to-sky-600 text-white">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-400/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-300/20 rounded-full blur-2xl translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5 text-emerald-200 text-sm">
            <span className="p-1.5 bg-white/15 rounded-lg backdrop-blur-sm"><TreePine className="w-4 h-4" /></span>
            <span className="font-medium opacity-90">Thème · Promenades &amp; Nature</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-none tracking-tight">
                🌿 Promenades<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-sky-200">&amp; Nature</span>
              </h1>
              <p className="text-white/80 text-lg leading-relaxed mb-5 max-w-xl">
                Itinéraires locaux, balades famille, spots nature, vélo et sorties groupées autour de Biguglia — filtrés selon votre envie du moment.
              </p>

              {/* Stats clés */}
              <div className="flex flex-wrap gap-2.5 mb-6">
                {[
                  { icon: Footprints, val: totalCount.toString(),             label: `itinéraire${totalCount !== 1 ? 's' : ''}`, sub: 'communauté' },
                  { icon: Users,      val: (outings.length || 0).toString(),  label: `sortie${outings.length !== 1 ? 's' : ''}`, sub: 'à venir' },
                  { icon: TreePine,   val: '1 456',                           label: 'hectares',                                  sub: 'réserve nature' },
                  { icon: Star,       val: '4.8',                             label: 'note moy.',                                 sub: 'satisfaction' },
                ].map(({ icon: I, val, label, sub }) => (
                  <div key={label} className="inline-flex items-center gap-2.5 bg-white/12 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 hover:bg-white/20 transition-colors">
                    <I className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-black leading-tight">{val} <span className="font-bold opacity-90">{label}</span></p>
                      <p className="text-[11px] text-emerald-200/80 leading-tight">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prochaine sortie */}
              {nextOuting && (
                <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-3 mb-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-200 font-semibold">Prochaine sortie groupée</p>
                    <p className="text-sm font-black">{nextOuting.title}</p>
                  </div>
                  <button onClick={() => setActiveTab('agenda')} className="ml-2 text-xs font-bold text-white/70 hover:text-white flex items-center gap-1 transition-colors">
                    Rejoindre <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* CTA hero */}
            <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
              {profile ? (
                <button
                  onClick={() => { setActiveTab('itineraires'); promenadHook.setShowForm(true); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 100); }}
                  className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 font-black px-7 py-3.5 rounded-2xl hover:bg-emerald-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-sm w-full lg:w-auto">
                  <Plus className="w-5 h-5" /> Partager un itinéraire
                </button>
              ) : (
                <Link href="/connexion"
                  className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 font-black px-7 py-3.5 rounded-2xl hover:bg-emerald-50 transition-all shadow-xl text-sm w-full lg:w-auto">
                  <Plus className="w-5 h-5" /> Partager un itinéraire
                </Link>
              )}
              <button
                onClick={() => { setActiveTab('agenda'); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 100); }}
                className="inline-flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white font-bold px-7 py-3 rounded-2xl hover:bg-white/25 transition-all text-sm w-full lg:w-auto">
                <Users className="w-4 h-4" /> Voir les sorties groupées
              </button>
              <button
                onClick={() => { setActiveTab('forum'); setTimeout(() => window.scrollTo({ top: 500, behavior: 'smooth' }), 100); }}
                className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white/80 font-semibold px-7 py-3 rounded-2xl hover:bg-white/20 transition-all text-sm w-full lg:w-auto">
                <MessageSquare className="w-4 h-4" /> Échanges &amp; conseils
              </button>
            </div>
          </div>

          {/* ── Filtres rapides ── */}
          <div className="mt-8 pt-6 border-t border-white/15">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-emerald-200 uppercase tracking-widest">Je cherche…</p>
              {quickFilter && (
                <button onClick={() => setQuickFilter(null)} className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                  <X className="w-3 h-3" /> Tout afficher
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pb-6">
              {QUICK_FILTERS.map(f => (
                <button key={f.id}
                  onClick={() => { setQuickFilter(quickFilter === f.id ? null : f.id); setActiveTab('itineraires'); }}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-all border backdrop-blur-sm',
                    quickFilter === f.id
                      ? 'bg-white text-emerald-700 border-white shadow-lg shadow-black/20'
                      : 'bg-white/12 border-white/25 text-white hover:bg-white/22 hover:border-white/40'
                  )}>
                  <span>{f.emoji}</span> {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTENU PRINCIPAL
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Barre filtres / navigation ── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Onglets */}
          <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm flex-shrink-0">
            {[
              { id: 'itineraires', label: 'Itinéraires',      icon: Footprints,    count: totalCount > 0 ? totalCount : undefined },
              { id: 'forum',       label: 'Échanges',         icon: MessageSquare, count: forumPosts.length > 0 ? forumPosts.length : undefined },
              { id: 'agenda',      label: 'Sorties groupées', icon: Users,         count: outings.length > 0 ? outings.length : undefined },
            ].map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all relative',
                  activeTab === id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50')}>
                <Icon className="w-4 h-4" /> {label}
                {count !== undefined && (
                  <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full', activeTab === id ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500')}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filtres (itinéraires seulement) */}
          {activeTab === 'itineraires' && (
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <SectorFilter value={filterSector} onChange={setFilterSector} showAll compact label="Secteur" />

              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn('inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border transition-all',
                  showAdvanced || activeFiltersCount > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                <SlidersHorizontal className="w-4 h-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeFiltersCount}</span>
                )}
              </button>

              {/* Vue grid/list */}
              <div className="flex gap-0.5 bg-white rounded-xl border border-gray-100 p-0.5 ml-auto">
                <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                </button>
              </div>

              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors border border-gray-200 rounded-xl px-3 py-2 bg-white hover:border-red-200 hover:bg-red-50">
                  <X className="w-3.5 h-3.5" /> Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Filtres avancés panel ── */}
        {showAdvanced && activeTab === 'itineraires' && (
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-500" /> Filtres avancés
              </h3>
              <button onClick={() => setShowAdvanced(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {[
                { key: 'dogs',     label: '🐕 Chiens acceptés',   cls: 'amber' },
                { key: 'stroller', label: '🍼 Poussette possible', cls: 'pink' },
                { key: 'parking',  label: '🅿️ Parking disponible', cls: 'blue' },
                { key: 'water',    label: "💧 Point d'eau",        cls: 'sky' },
                { key: 'shade',    label: '🌳 Ombragé',            cls: 'green' },
                { key: 'sunset',   label: '🌅 Coucher de soleil',  cls: 'orange' },
                { key: 'loop',     label: '🔄 Circuit en boucle',  cls: 'gray' },
              ].map(({ key, label, cls }) => (
                <button key={key}
                  onClick={() => setAdvFilters(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                  className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                    advFilters[key as keyof typeof advFilters]
                      ? `bg-${cls}-100 text-${cls}-700 border-${cls}-300 shadow-sm`
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {label}
                </button>
              ))}
              <div className="col-span-2 sm:col-span-3 lg:col-span-1">
                <p className="text-xs font-semibold text-gray-500 mb-2">⏱️ Durée max</p>
                <div className="flex gap-1.5">
                  {[
                    { val: '30',  label: '30 min' },
                    { val: '60',  label: '1h' },
                    { val: '120', label: '2h' },
                  ].map(d => (
                    <button key={d.val}
                      onClick={() => setAdvFilters(f => ({ ...f, duration_max: f.duration_max === d.val ? '' : d.val }))}
                      className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all', advFilters.duration_max === d.val ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-gray-400">Actifs :</span>
                {quickFilter && (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                    {QUICK_FILTERS.find(f => f.id === quickFilter)?.emoji} {QUICK_FILTERS.find(f => f.id === quickFilter)?.label}
                    <button onClick={() => setQuickFilter(null)} className="ml-0.5 hover:text-emerald-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filterSector && (
                  <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full font-semibold">
                    <MapPin className="w-3 h-3" /> Secteur
                    <button onClick={() => setFilterSector(null)} className="ml-0.5 hover:text-teal-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {advFilters.duration_max && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
                    ⏱️ max {advFilters.duration_max} min
                    <button onClick={() => setAdvFilters(f => ({ ...f, duration_max: '' }))} className="ml-0.5 hover:text-purple-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Layout 2 colonnes ── */}
        <div className="flex gap-8">

          {/* ── COLONNE PRINCIPALE ── */}
          <div className="flex-1 min-w-0">
            {activeTab === 'itineraires' && (
              <TabItineraires
                promenades={promenades}
                loadingPromenades={loadingPromenades}
                totalCount={totalCount}
                activeFiltersCount={activeFiltersCount}
                quickFilter={quickFilter}
                advFilters={advFilters}
                filterSector={filterSector}
                setFilterSector={setFilterSector}
                setAdvFilters={setAdvFilters}
                setQuickFilter={setQuickFilter}
                viewMode={viewMode}
                showForm={promenadHook.showForm}
                setShowForm={promenadHook.setShowForm}
                photos={promenadHook.photos}
                setPhotos={promenadHook.setPhotos}
                submitting={promenadHook.submitting}
                form={promenadHook.form}
                setForm={promenadHook.setForm}
                fileInputRef={fileInputRef}
                handleSubmit={promenadHook.handleSubmit}
                userId={profile?.id}
                profileId={profile?.id}
                handleLike={promenadHook.handleLike}
              />
            )}

            {activeTab === 'forum' && (
              <TabForum
                forumPosts={forumPosts}
                loadingForum={forumHook.loadingForum}
                forumCategoryId={forumHook.forumCategoryId}
                showPostForm={forumHook.showPostForm}
                setShowPostForm={forumHook.setShowPostForm}
                postForm={forumHook.postForm}
                setPostForm={forumHook.setPostForm}
                submittingPost={forumHook.submittingPost}
                handlePostSubmit={forumHook.handlePostSubmit}
                profileId={profile?.id}
              />
            )}

            {activeTab === 'agenda' && (
              <TabAgenda
                outings={outings}
                loadingOutings={outingsHook.loadingOutings}
                showOutingForm={outingsHook.showOutingForm}
                setShowOutingForm={outingsHook.setShowOutingForm}
                editingOuting={outingsHook.editingOuting}
                outingForm={outingsHook.outingForm}
                setOutingForm={outingsHook.setOutingForm}
                outingPhotos={outingsHook.outingPhotos}
                outingPreviews={outingsHook.outingPreviews}
                outingPhotoRef={outingsHook.outingPhotoRef}
                submittingOuting={outingsHook.submittingOuting}
                handleOutingSubmit={outingsHook.handleOutingSubmit}
                handleOutingPhotoSelect={outingsHook.handleOutingPhotoSelect}
                removeOutingPhoto={outingsHook.removeOutingPhoto}
                resetOutingForm={outingsHook.resetOutingForm}
                startEditOuting={outingsHook.startEditOuting}
                handleDeleteOuting={outingsHook.handleDeleteOuting}
                handleOutingStatusChange={outingsHook.handleOutingStatusChange}
                handleJoinOuting={outingsHook.handleJoinOuting}
                profileId={profile?.id}
              />
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <PromenadesSidebar
            promenades={promenades}
            outingsCount={outings.length}
            forumPostsCount={forumPosts.length}
            totalCount={totalCount}
            quickFilter={quickFilter}
            filterSector={filterSector}
            activeTab={activeTab}
            profileId={profile?.id}
            setActiveTab={setActiveTab}
            setQuickFilter={setQuickFilter}
            setFilterSector={setFilterSector}
            setShowForm={promenadHook.setShowForm}
            setShowOutingForm={outingsHook.setShowOutingForm}
            setShowPostForm={forumHook.setShowPostForm}
          />
        </div>
      </div>
    </div>
  );
}
