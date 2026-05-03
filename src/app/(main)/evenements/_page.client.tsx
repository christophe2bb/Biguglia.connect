'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  PartyPopper, Calendar, CalendarDays, MessageSquare, Plus,
  Users, Star, Zap, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

import { useEvents }       from './_hooks/useEvents';
import { useForum }        from './_hooks/useForum';
import { useSavedEvents }  from './_hooks/useSavedEvents';
import { useEventFilters } from './_hooks/useEventFilters';

import dynamic from 'next/dynamic';
import TabAgenda   from './_components/TabAgenda';
import TabSemaine  from './_components/TabSemaine';
// Tabs non-initiaux — lazy loaded pour réduire le bundle initial
const TabForum     = dynamic(() => import('./_components/TabForum'),    { ssr: false });
const EventSidebar = dynamic(() => import('./_components/EventSidebar'), { ssr: false });

import type { ActiveTab } from './_types';
import SectionTracker from '@/components/ui/SectionTracker';

export default function EvenementsPage() {
  const { profile } = useAuthStore();

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    events, loadingEvents, dbReady, fetchEvents,
    handleJoin, handleEventStatusChange,
    sectorCounts,
  } = useEvents(profile?.id);

  const {
    forumPosts, forumCategoryId, loadingForum, showPostForm, setShowPostForm,
    postForm, setPostForm, submittingPost, fetchForum, handlePostSubmit,
  } = useForum();

  const {
    savedEvents, showSavedOnly, setShowSavedOnly, toggleSaved,
  } = useSavedEvents();

  const {
    filterCat, setFilterCat, filterStatus, setFilterStatus,
    filterSector, setFilterSector, searchQuery, setSearchQuery,
    quickFilter, setQuickFilter, showAdvFilters, setShowAdvFilters,
    filterInscription, setFilterInscription, filterFree, setFilterFree,
    today, filteredEvents, upcomingEvents, todayEvents, weekendEvents,
    officialEvents, freeEvents, thisWeekEvents, thisWeekEventsAll, thisWeekByDay, thisWeekDays,
    activeFiltersCount, resetFilters,
  } = useEventFilters(events);

  const [activeTab, setActiveTab] = React.useState<ActiveTab>('agenda');
  // Track which tabs have been mounted at least once (lazy-loading TabForum)
  const [mountedTabs, setMountedTabs] = React.useState<Set<ActiveTab>>(new Set(['agenda']));
  const handleTabChange = React.useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setMountedTabs(prev => { const s = new Set(prev); s.add(tab); return s; });
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);

  // Computed
  const totalCount    = upcomingEvents.length;
  const featuredEvent = upcomingEvents[0] ?? null;

  return (
    <div className="min-h-screen relative">
      <SectionTracker section="evenements" />
      {/* Background — <img> natif + transform:translateZ(0) pour créer un layer GPU isolé
          évite que les transitions des cartes (shadow, scale) ne provoquent un repaint
          du fond fixe (shimmer/gel visible lors du changement d'onglet). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden="true"
        src="/images/biguglia-etang.webp"
        alt=""
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'top',
          opacity: 0.2,
          zIndex: 0,
          pointerEvents: 'none',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />

      <div className="relative z-[1]">
        {!dbReady && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Tables manquantes</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Exécutez <code className="bg-amber-100 px-1 rounded font-mono">migration_themes.sql</code> dans Supabase SQL Editor.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── HERO ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-600 to-pink-600 text-white">
          <div className="absolute inset-0 opacity-[0.08] bg-dot-grid-22" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-400/10 rounded-full blur-2xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white/20 rounded-xl"><PartyPopper className="w-5 h-5" /></div>
                  <span className="text-purple-200 text-sm font-semibold tracking-wide">Thème · Événements locaux</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">🎉 Agenda de Biguglia</h1>
                <p className="text-purple-100 text-sm sm:text-base max-w-xl mb-5">
                  Concerts, fêtes de quartier, marchés, réunions citoyennes — tout ce qui se passe à Biguglia.
                </p>

                {/* KPIs */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {[
                    { icon: Calendar,     label: `${totalCount} à venir`,              color: 'bg-white/15 border-white/25' },
                    { icon: Zap,          label: `${todayEvents.length} aujourd'hui`,   color: todayEvents.length > 0 ? 'bg-red-400/25 border-red-300/40' : 'bg-white/10 border-white/20' },
                    { icon: Star,         label: `${weekendEvents.length} ce week-end`, color: 'bg-white/15 border-white/25' },
                    { icon: CheckCircle2, label: `${freeEvents.length} gratuits`,        color: 'bg-emerald-400/20 border-emerald-300/30' },
                  ].map(({ icon: I, label, color }) => (
                    <span key={label} className={cn('inline-flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm font-semibold', color)}>
                      <I className="w-3.5 h-3.5" /> {label}
                    </span>
                  ))}
                </div>

                {/* Raccourcis rapides — filtrent le calendrier via filterSector/filterCat */}
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'aujourd_hui', label: "Aujourd'hui", emoji: '⚡',  count: todayEvents.length },
                    { id: 'ce_weekend',  label: 'Ce week-end', emoji: '🏖️', count: weekendEvents.length },
                    { id: 'famille',     label: 'En famille',  emoji: '👨‍👩‍👧', count: null },
                    { id: 'gratuit',     label: 'Gratuit',     emoji: '🎟️', count: freeEvents.length },
                    { id: 'officiel',    label: 'Officiel',    emoji: '🏛️', count: officialEvents.length },
                  ] as const).map(({ id, label, emoji, count }) => (
                    <button key={id}
                      onClick={() => setQuickFilter(quickFilter === id ? null : id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors',
                        quickFilter === id ? 'bg-white text-purple-700 border-white shadow-md' : 'bg-white/15 text-white border-white/30 hover:bg-white/25',
                      )}>
                      <span>{emoji}</span>{label}
                      {count !== null && count > 0 && (
                        <span className={cn('text-xs font-black px-1.5 rounded-full', quickFilter === id ? 'bg-purple-100 text-purple-700' : 'bg-white/25')}>{count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA créer */}
              <Link href={profile ? '/evenements/nouveau' : '/connexion'}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-purple-700 font-black px-6 py-3 rounded-2xl hover:bg-purple-50 transition-transform shadow-lg hover:-translate-y-0.5 text-sm">
                <Plus className="w-4 h-4" /> Proposer un événement
              </Link>
            </div>
          </div>
        </div>

        {/* ── CONTENU PRINCIPAL ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Onglets */}
          <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
            {([
              { id: 'agenda',  label: 'Calendrier',   icon: Calendar,      count: 0 },
              { id: 'semaine', label: 'Cette semaine', icon: CalendarDays,  count: thisWeekEventsAll.length },
              { id: 'forum',   label: 'Forum',         icon: MessageSquare, count: 0 },
            ] as { id: ActiveTab; label: string; icon: React.ElementType; count: number }[]).map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => handleTabChange(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  activeTab === id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50',
                )}>
                <Icon className="w-4 h-4" /> {label}
                {id === 'semaine' && count > 0 && (
                  <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full', activeTab === 'semaine' ? 'bg-white/25' : 'bg-purple-100 text-purple-700')}>{count}</span>
                )}
              </button>
            ))}
            <Link href="/communaute/evenements"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-purple-600 hover:bg-purple-50 border border-purple-100">
              <Users className="w-4 h-4" /> Communauté
            </Link>
          </div>

          <div className="flex gap-8 items-start">
            {/* Colonne principale —
                • display:none inline → masquage non écrasable par les enfants.
                • contain:"layout style" → repaints confinés, pas de shimmer sur le fond fixe.
                • Agenda + Semaine montés dès le départ ; Forum lazy-monté. */}
            <div className="flex-1 min-w-0">
              {/* Calendrier */}
              <div style={activeTab !== 'agenda' ? { display: 'none' } : { contain: 'layout style' }}>
                <TabAgenda events={events} userId={profile?.id} loading={loadingEvents}
                  onJoin={handleJoin} onStatusChange={handleEventStatusChange} profile={profile}
                  sectorCounts={sectorCounts} filterSector={filterSector}
                  setFilterSector={setFilterSector}
                  totalFiltered={filterSector
                    ? events.filter(e => filterSector === 'ville' ? !e.sector_id : e.sector_id === filterSector).length
                    : events.length} />
              </div>

              {/* Cette semaine */}
              <div style={activeTab !== 'semaine' ? { display: 'none' } : { contain: 'layout style' }}>
                <TabSemaine loading={loadingEvents} thisWeekDays={thisWeekDays} thisWeekByDay={thisWeekByDay}
                  thisWeekEvents={thisWeekEvents} today={today} userId={profile?.id}
                  onJoin={handleJoin} onStatusChange={handleEventStatusChange}
                  onToggleSave={toggleSaved} savedEvents={savedEvents}
                  onShowAgenda={() => handleTabChange('agenda')}
                  sectorCounts={sectorCounts} filterSector={filterSector}
                  setFilterSector={setFilterSector} totalFiltered={thisWeekEvents.length} />
              </div>

              {/* Forum — monté une seule fois après la 1ère visite */}
              {mountedTabs.has('forum') && (
                <div style={activeTab !== 'forum' ? { display: 'none' } : { contain: 'layout style' }}>
                  <TabForum loading={loadingForum} forumPosts={forumPosts} forumCategoryId={forumCategoryId}
                    showPostForm={showPostForm} setShowPostForm={setShowPostForm}
                    postForm={postForm} setPostForm={setPostForm}
                    submittingPost={submittingPost} profile={profile}
                    onSubmit={handlePostSubmit}
                    sectorCounts={sectorCounts} filterSector={filterSector}
                    setFilterSector={setFilterSector} />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <EventSidebar
              featuredEvent={featuredEvent} upcomingEvents={upcomingEvents}
              thisWeekDays={thisWeekDays} thisWeekByDay={thisWeekByDay} thisWeekEvents={thisWeekEvents}
              today={today} totalCount={totalCount} todayEvents={todayEvents}
              freeEvents={freeEvents} officialEvents={officialEvents}
              filterCat={filterCat} activeTab={activeTab} savedEvents={savedEvents} profile={profile}
              onSetFilterCat={cat => { setFilterCat(cat); }}
              onSetActiveTab={t => handleTabChange(t as ActiveTab)}
              onShowSemaine={() => handleTabChange('semaine')}
              onShowSavedOnly={() => handleTabChange('semaine')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
