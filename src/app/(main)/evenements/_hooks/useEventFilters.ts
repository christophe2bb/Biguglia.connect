'use client';

import { useState, useMemo } from 'react';
import { isThisWeekend, localDateStr } from '../_utils';
import type { LocalEvent, QuickFilter } from '../_types';

export function useEventFilters(events: LocalEvent[]) {
  const [filterCat, setFilterCat]               = useState<string>('all');
  const [filterStatus, setFilterStatus]         = useState<string>('a_venir');
  const [filterSector, setFilterSector]         = useState<string | null>(null);
  const [searchQuery, setSearchQuery]           = useState<string>('');
  const [quickFilter, setQuickFilter]           = useState<QuickFilter>(null);
  const [showAdvFilters, setShowAdvFilters]     = useState(false);
  const [filterInscription, setFilterInscription] = useState(false);
  const [filterFree, setFilterFree]             = useState(false);

  // localDateStr() évite le décalage UTC (toISOString donne hier soir en UTC+2)
  const today = useMemo(() => localDateStr(), []);

  const upcomingEvents = useMemo(
    () => events.filter(e => e.event_date >= today && ['a_venir','complet','reporte','active','publie'].includes(e.status)),
    [events, today],
  );
  const todayEvents    = useMemo(() => events.filter(e => e.event_date === today), [events, today]);
  const weekendEvents  = useMemo(() => events.filter(e => isThisWeekend(e.event_date)), [events]);
  const officialEvents = useMemo(() => events.filter(e => e.is_official), [events]);
  const freeEvents     = useMemo(() => events.filter(e => e.is_free && e.event_date >= today), [events, today]);

  const filteredEvents = useMemo(() => {
    let result = filterStatus === 'all'    ? events
      : filterStatus === 'a_venir'         ? events.filter(e => ['a_venir','active','publie'].includes(e.status) && e.event_date >= today)
      : filterStatus === 'passe'           ? events.filter(e => e.status === 'passe' || (e.event_date < today && !['annule','reporte'].includes(e.status)))
      : events.filter(e => e.status === filterStatus);

    if (filterCat !== 'all') result = result.filter(e => e.category === filterCat);
    if (filterSector) {
      result = filterSector === 'ville'
        ? result.filter(e => !e.sector_id)
        : result.filter(e => e.sector_id === filterSector);
    }

    if (quickFilter === 'aujourd_hui')  result = result.filter(e => e.event_date === today);
    else if (quickFilter === 'ce_weekend') result = result.filter(e => isThisWeekend(e.event_date));
    else if (quickFilter === 'famille') result = result.filter(e => ['famille','fete','sport'].includes(e.category) || e.audience?.toLowerCase().includes('famille'));
    else if (quickFilter === 'gratuit') result = result.filter(e => e.is_free);
    else if (quickFilter === 'officiel') result = result.filter(e => e.is_official);

    if (filterInscription) result = result.filter(e => e.registration_required);
    if (filterFree)        result = result.filter(e => e.is_free);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.organizer_name?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        (e.tags ?? []).some((t: string) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [events, filterStatus, filterCat, filterSector, quickFilter, filterInscription, filterFree, searchQuery, today]);

  const thisWeekEvents = useMemo(() => {
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    return upcomingEvents.filter(e => {
      const d = new Date(e.event_date + 'T00:00:00');
      if (!(d >= new Date(today) && d <= sevenDaysLater)) return false;
      if (filterSector) {
        if (filterSector === 'ville') return !e.sector_id;
        return e.sector_id === filterSector;
      }
      return true;
    });
  }, [upcomingEvents, today, filterSector]);

  // thisWeekEvents sans filtre secteur — pour le compteur du badge onglet
  const thisWeekEventsAll = useMemo(() => {
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    return upcomingEvents.filter(e => {
      const d = new Date(e.event_date + 'T00:00:00');
      return d >= new Date(today) && d <= sevenDaysLater;
    });
  }, [upcomingEvents, today]);

  const thisWeekByDay = useMemo(
    () => thisWeekEvents.reduce<Record<string, LocalEvent[]>>((acc, ev) => {
      if (!acc[ev.event_date]) acc[ev.event_date] = [];
      acc[ev.event_date].push(ev);
      return acc;
    }, {}),
    [thisWeekEvents],
  );
  const thisWeekDays = useMemo(() => Object.keys(thisWeekByDay).sort(), [thisWeekByDay]);

  const activeFiltersCount = [
    filterCat !== 'all',
    ['complet', 'reporte', 'annule', 'passe'].includes(filterStatus), // 'all' et 'a_venir' = pas un filtre actif
    !!filterSector,
    !!quickFilter, !!searchQuery.trim(), filterInscription, filterFree,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCat('all');
    setFilterStatus('a_venir');
    setFilterSector(null);
    setQuickFilter(null);
    setSearchQuery('');
    setFilterInscription(false);
    setFilterFree(false);
  };

  return {
    // State
    filterCat, setFilterCat,
    filterStatus, setFilterStatus,
    filterSector, setFilterSector,
    searchQuery, setSearchQuery,
    quickFilter, setQuickFilter,
    showAdvFilters, setShowAdvFilters,
    filterInscription, setFilterInscription,
    filterFree, setFilterFree,
    // Computed
    today,
    filteredEvents,
    upcomingEvents,
    todayEvents,
    weekendEvents,
    officialEvents,
    freeEvents,
    thisWeekEvents,
    thisWeekEventsAll,
    thisWeekByDay,
    thisWeekDays,
    activeFiltersCount,
    resetFilters,
  };
}
