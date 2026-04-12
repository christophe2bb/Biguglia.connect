'use client';

import { useEffect, useMemo } from 'react';
import { SECTORS } from '@/lib/sectors';
import { useAssoFilters }   from './useAssoFilters';
import { useAssoData }      from './useAssoData';
import { useAssoForm }      from './useAssoForm';
import { useAssoMutations } from './useAssoMutations';

// ─── Hook agrégateur ─────────────────────────────────────────────────────────
export function useAssociations() {
  const filters   = useAssoFilters();
  const data      = useAssoData(filters);       // filters satisfies AssoDataFilters
  const form      = useAssoForm(data.fetchAssos);
  const mutations = useAssoMutations(data.fetchAssos);

  // Chargement initial + rechargement à chaque changement de filtre
  useEffect(() => { data.fetchAssos(); }, [data.fetchAssos]);

  // ── Vue filtrée par favoris ───────────────────────────────────────────────
  const displayedAssos = filters.showSavedOnly
    ? data.assos.filter(a => filters.savedAssos.has(a.id))
    : data.assos;

  // ── KPIs mémoïsés ────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    urgentCount:       data.assos.filter(a => a.urgent_need).length,
    needsCount:        data.assos.filter(a => a.needs.length > 0).length,
    volunteerCount:    data.assos.filter(a => a.needs.includes('Bénévoles') || a.is_accepting_volunteers).length,
    eventsAssosCount:  data.assos.filter(a => a.pub_type === 'evenement').length,
    donationsCount:    data.assos.filter(a => a.is_accepting_donations || a.pub_type === 'dons').length,
    sectorCounts:      SECTORS.map(s => ({
      ...s,
      count: data.assos.filter(a => a.sector_id === s.id || a.sector_id === s.slug).length,
    })),
    totalActive: data.assos.length,
  }), [data.assos]);

  return {
    // Données
    assos:         data.assos,
    displayedAssos,
    loading:       data.loading,
    dbReady:       data.dbReady,
    // Filtres
    filterCat:       filters.filterCat,    setFilterCat:    filters.setFilterCat,
    filterType:      filters.filterType,   setFilterType:   filters.setFilterType,
    filterSector:    filters.filterSector, setFilterSector: filters.setFilterSector,
    filterNeed:      filters.filterNeed,   setFilterNeed:   filters.setFilterNeed,
    filterPublic:    filters.filterPublic, setFilterPublic: filters.setFilterPublic,
    search:          filters.search,       setSearch:       filters.setSearch,
    showAdvFilters:  filters.showAdvFilters, setShowAdvFilters: filters.setShowAdvFilters,
    activeFiltersCount: filters.activeFiltersCount,
    resetFilters:    filters.resetFilters,
    // Favoris
    savedAssos:    filters.savedAssos,
    showSavedOnly: filters.showSavedOnly, setShowSavedOnly: filters.setShowSavedOnly,
    toggleSaved:   filters.toggleSaved,
    // Formulaire
    showForm:    form.showForm,    setShowForm: form.setShowForm,
    editingAsso: form.editingAsso,
    form:        form.form,        setForm:     form.setForm,
    photos:      form.photos,      previews:    form.previews,
    photoRef:    form.photoRef,
    submitting:  form.submitting,
    step:        form.step,        setStep:     form.setStep,
    handlePhotoSelect: form.handlePhotoSelect,
    removePhoto:       form.removePhoto,
    toggle:            form.toggle,
    resetForm:         form.resetForm,
    startEdit:         form.startEdit,
    handleSubmit:      form.handleSubmit,
    // Mutations légères
    handleDelete: mutations.handleDelete,
    // KPIs
    ...kpis,
  };
}
