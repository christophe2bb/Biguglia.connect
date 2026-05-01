'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useCDMData }    from './useCDMData';
import { useCDMFilters } from './useCDMFilters';
import { useCDMStatus }  from './useCDMStatus';
import { useCDMForm }    from './useCDMForm';

// ─── Hook agrégateur ─────────────────────────────────────────────────────────
export function useCoupsDeMain() {
  const { profile } = useAuthStore();

  const data    = useCDMData();
  const filters = useCDMFilters(data.items);
  const status  = useCDMStatus(profile?.id, data.fetchItems);
  const form    = useCDMForm(data.fetchItems);

  // Chargement initial
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { data.fetchItems(); }, [data.fetchItems]);

  // Wrapper handleSubmit : injecte profileId (garde la même signature qu'avant)
  const handleSubmit = async (isDraft = false) => {
    if (!profile) { return; }
    await form.handleSubmit(isDraft, profile.id);
  };

  return {
    // Données
    items:      data.items,
    loading:    data.loading,
    dbReady:    data.dbReady,
    fetchItems: data.fetchItems,
    // Formulaire
    showForm:    form.showForm,
    setShowForm: form.setShowForm,
    editingItem: form.editingItem,
    step:        form.step,
    setStep:     form.setStep,
    submitting:  form.submitting,
    form:        form.form,
    setForm:     form.setForm,
    photos:      form.photos,
    previews:    form.previews,
    existingPhotoUrls: form.existingPhotoUrls,
    resetForm:        form.resetForm,
    handleEdit:       form.handleEdit,
    handlePhotoSelect:form.handlePhotoSelect,
    removePhoto:      form.removePhoto,
    toggleArr:        form.toggleArr,
    handleSubmit,
    // Actions statut
    handleDelete:       status.handleDelete,
    handleResolve:      status.handleResolve,
    handlePause:        status.handlePause,
    handleStatusChange: status.handleStatusChange,
    handleCanHelp:      status.handleCanHelp,
    // Filtres
    filters:      filters.filters,
    showFilters:  filters.showFilters,
    setShowFilters: filters.setShowFilters,
    setFilterType:    filters.setFilterType,
    setFilterCat:     filters.setFilterCat,
    setFilterUrgency: filters.setFilterUrgency,
    setFilterSector:  filters.setFilterSector,
    setFilterFree:    filters.setFilterFree,
    setFilterMyHelp:  filters.setFilterMyHelp,
    setSearch:        filters.setSearch,
    activeFiltersCount: filters.activeFiltersCount,
    resetFilters:       filters.resetFilters,
    // Pagination
    page:       filters.page,
    setPage:    filters.setPage,
    totalPages: filters.totalPages,
    paginated:  filters.paginated,
    filtered:   filters.filtered,
    // Favoris
    savedIds:   filters.savedIds,
    toggleSave: filters.toggleSave,
    // KPIs
    kpi: filters.kpi,
    // Profil
    profile,
  };
}
