'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { AlertCircle, Building2, Plus, Users, Calendar, MessageSquare, Handshake, Zap, UserCheck, Loader2, X } from 'lucide-react';
import { useAssociations } from './_hooks/useAssociations';
import AssociationCard from './_components/AssociationCard';
import AssociationForm from './_components/AssociationForm';
import AssociationFilters from './_components/AssociationFilters';
import AssociationsSidebar from './_components/AssociationsSidebar';

export default function AssociationsPage() {
  const { profile } = useAuthStore();
  const state = useAssociations();

  const {
    assos, displayedAssos, loading, dbReady,
    filterCat, setFilterCat, filterType, setFilterType,
    filterSector, setFilterSector, filterNeed, setFilterNeed,
    filterPublic, setFilterPublic, search, setSearch,
    showAdvFilters, setShowAdvFilters, activeFiltersCount, resetFilters,
    showForm, setShowForm, editingAsso,
    form, setForm, photos, previews, photoRef, submitting, step, setStep,
    handlePhotoSelect, removePhoto, toggle, resetForm, startEdit,
    handleSubmit, handleDelete,
    savedAssos, showSavedOnly, setShowSavedOnly, toggleSaved,
    urgentCount, needsCount, volunteerCount, eventsAssosCount, donationsCount,
    sectorCounts, totalActive,
  } = state;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">

      {/* ── Bannière DB manquante ── */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Tables manquantes.</span> Exécutez le SQL dans Supabase (
              <Link href="/admin/migration" className="underline">page Admin</Link>).
            </p>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl"><Handshake className="w-5 h-5" /></div>
                <span className="text-violet-200 text-sm font-semibold">Vie locale · Associations</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">🏛️ Associations de Biguglia</h1>
              <p className="text-violet-200 text-base sm:text-lg max-w-xl leading-relaxed">
                Découvrez, rejoignez et soutenez les associations locales. Bénévolat, dons, adhésion, événements — tout en un seul endroit.
              </p>

              {/* KPIs */}
              <div className="flex flex-wrap gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  <Building2 className="w-3.5 h-3.5" /> {totalActive} association{totalActive !== 1 ? 's' : ''}
                </span>
                {needsCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-rose-500/30 border border-rose-400/40 rounded-full px-3 py-1.5 text-sm font-medium">
                    <Zap className="w-3.5 h-3.5" /> {needsCount} ont des besoins ouverts
                  </span>
                )}
                {urgentCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-red-500/30 border border-red-400/40 rounded-full px-3 py-1.5 text-sm font-bold animate-pulse">
                    🚨 {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
                  </span>
                )}
                {volunteerCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <UserCheck className="w-3.5 h-3.5" /> {volunteerCount} cherchent des bénévoles
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <Link href="/communaute/associations"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition backdrop-blur-sm">
                  <Users className="w-4 h-4" /> Communauté →
                </Link>
                <Link href="/evenements"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition backdrop-blur-sm">
                  <Calendar className="w-4 h-4" /> Événements →
                </Link>
                <Link href="/forum"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition backdrop-blur-sm">
                  <MessageSquare className="w-4 h-4" /> Forum →
                </Link>
              </div>
            </div>

            {profile && (
              <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-2xl hover:bg-violet-50 transition-all shadow-lg text-sm flex-shrink-0">
                <Plus className="w-5 h-5" /> Référencer une association
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Formulaire */}
        {showForm && profile && (
          <AssociationForm
            form={form} setForm={setForm}
            photos={photos} previews={previews}
            submitting={submitting} step={step} setStep={setStep}
            editingAsso={editingAsso}
            photoRef={photoRef}
            onPhotoSelect={handlePhotoSelect}
            onRemovePhoto={removePhoto}
            onToggle={toggle}
            onCancel={resetForm}
            onSubmit={(asDraft) => handleSubmit(profile.id, profile.full_name, asDraft)}
          />
        )}

        {/* Layout 2 colonnes */}
        <div className="flex gap-8 items-start">

          {/* ── COLONNE PRINCIPALE ── */}
          <div className="flex-1 min-w-0">

            {/* Blocs contextuels rapides */}
            {!loading && assos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {urgentCount > 0 && (
                  <button onClick={() => setFilterNeed('urgent')}
                    className="bg-red-50 border border-red-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all">
                    <p className="text-2xl font-black text-red-600 mb-1">{urgentCount}</p>
                    <p className="text-xs font-bold text-red-700">Besoins urgents</p>
                    <p className="text-xs text-red-400 mt-0.5">Action immédiate</p>
                  </button>
                )}
                {volunteerCount > 0 && (
                  <button onClick={() => setFilterNeed('benevoles')}
                    className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all">
                    <p className="text-2xl font-black text-rose-600 mb-1">{volunteerCount}</p>
                    <p className="text-xs font-bold text-rose-700">Cherchent bénévoles</p>
                    <p className="text-xs text-rose-400 mt-0.5">Engagez-vous !</p>
                  </button>
                )}
                {eventsAssosCount > 0 && (
                  <button onClick={() => setFilterType('evenement')}
                    className="bg-pink-50 border border-pink-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all">
                    <p className="text-2xl font-black text-pink-600 mb-1">{eventsAssosCount}</p>
                    <p className="text-xs font-bold text-pink-700">Événements</p>
                    <p className="text-xs text-pink-400 mt-0.5">À venir</p>
                  </button>
                )}
                {donationsCount > 0 && (
                  <button onClick={() => setFilterNeed('dons')}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all">
                    <p className="text-2xl font-black text-amber-600 mb-1">{donationsCount}</p>
                    <p className="text-xs font-bold text-amber-700">Acceptent les dons</p>
                    <p className="text-xs text-amber-400 mt-0.5">Soutenez-les</p>
                  </button>
                )}
              </div>
            )}

            {/* Filtres */}
            <AssociationFilters
              filterCat={filterCat} setFilterCat={setFilterCat}
              filterType={filterType} setFilterType={setFilterType}
              filterSector={filterSector} setFilterSector={setFilterSector}
              filterNeed={filterNeed} setFilterNeed={setFilterNeed}
              filterPublic={filterPublic} setFilterPublic={setFilterPublic}
              search={search} setSearch={setSearch}
              showAdvFilters={showAdvFilters} setShowAdvFilters={setShowAdvFilters}
              showSavedOnly={showSavedOnly} setShowSavedOnly={setShowSavedOnly}
              activeFiltersCount={activeFiltersCount} resetFilters={resetFilters}
              savedAssos={savedAssos} assos={assos} displayedAssos={displayedAssos}
              loading={loading}
            />

            {/* Grille associations */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            ) : displayedAssos.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium text-lg">Aucune association trouvée</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">
                  {activeFiltersCount > 0 ? 'Modifiez les filtres pour élargir la recherche.' : 'Soyez la première association à se référencer !'}
                </p>
                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters}
                    className="mr-2 inline-flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-all">
                    <X className="w-4 h-4" /> Réinitialiser
                  </button>
                )}
                {profile ? (
                  <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
                    className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all">
                    <Plus className="w-4 h-4" /> Référencer une association
                  </button>
                ) : (
                  <Link href="/connexion" className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all">
                    Se connecter pour publier
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {displayedAssos.map(asso => (
                  <AssociationCard
                    key={asso.id}
                    asso={asso}
                    userId={profile?.id}
                    isAuthor={profile?.id === asso.author_id}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    saved={savedAssos.has(asso.id)}
                    onToggleSave={toggleSaved}
                  />
                ))}
              </div>
            )}

            {/* CTA connexion bas de page */}
            {!profile && assos.length > 0 && (
              <div className="mt-8 bg-violet-50 border border-violet-200 rounded-2xl p-6 text-center">
                <p className="text-violet-700 font-medium mb-3">Connectez-vous pour contacter, rejoindre ou soutenir une association</p>
                <Link href="/connexion" className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <AssociationsSidebar
            assos={assos}
            filterCat={filterCat} setFilterCat={setFilterCat}
            filterSector={filterSector} setFilterSector={setFilterSector}
            savedAssos={savedAssos}
            showSavedOnly={showSavedOnly} setShowSavedOnly={setShowSavedOnly}
            setShowAdvFilters={setShowAdvFilters}
            urgentCount={urgentCount} volunteerCount={volunteerCount}
            eventsAssosCount={eventsAssosCount} donationsCount={donationsCount}
            totalActive={totalActive} sectorCounts={sectorCounts}
            profile={profile}
          />
        </div>
      </div>
    </div>
  );
}
