'use client';

import Link from 'next/link';
import { Loader2, Plus, HandHeart, ArrowRight, Users, Shield, AlertCircle, X } from 'lucide-react';
import { SECURITY_TIPS } from './_constants';
import { useCoupsDeMain } from './_hooks/useCoupsDeMain';
import HelpCard from './_components/HelpCard';
import HelpForm from './_components/HelpForm';
import HelpFilters from './_components/HelpFilters';
import HelpSidebar from './_components/HelpSidebar';

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CoupsDeMainPage() {
  const {
    // Data
    items, loading, dbReady,
    // Form
    showForm, setShowForm, editingItem, step, setStep, submitting,
    form, setForm, previews, photos,
    resetForm, handleEdit, handlePhotoSelect, removePhoto, toggleArr, handleSubmit,
    // CRUD
    fetchItems, handleDelete, handleResolve, handlePause, handleStatusChange, handleCanHelp,
    // Filters
    filters, showFilters, setShowFilters,
    setFilterType, setFilterCat, setFilterUrgency, setFilterSector, setFilterFree, setFilterMyHelp, setSearch,
    activeFiltersCount, resetFilters,
    // Pagination
    page, setPage, totalPages, paginated, filtered,
    // Favorites
    savedIds, toggleSave,
    // KPIs
    kpi,
    // Profile
    profile,
  } = useCoupsDeMain();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* ── DB warning ── */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Tables manquantes.</span>{' '}
              Exécutez <code className="bg-amber-100 px-1 rounded text-xs">supabase/migrations/20260411_help_requests_cdc.sql</code> dans Supabase.{' '}
              <Link href="/admin/migration" className="underline">Page Admin</Link>
            </p>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-emerald-500 text-white">
        <div className="absolute inset-0 opacity-10 bg-dot-grid-lg" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl"><HandHeart className="w-5 h-5" /></div>
                <span className="text-amber-100 text-sm font-semibold">Vie locale · Entraide entre voisins</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">🤝 Coups de main</h1>
              <p className="text-amber-100 text-base max-w-xl leading-relaxed">
                Demandez ou proposez une aide ponctuelle entre habitants de Biguglia.
                Simple, local, humain.
              </p>

              {/* Chiffres clés */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 bg-red-500/30 border border-white/20 rounded-full px-3 py-1.5 text-sm font-semibold">
                  🙋 {kpi.demandes} demande{kpi.demandes !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/30 border border-white/20 rounded-full px-3 py-1.5 text-sm font-semibold">
                  🤝 {kpi.offres} offre{kpi.offres !== 1 ? 's' : ''}
                </span>
                {kpi.urgents > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-red-600/40 border border-white/20 rounded-full px-3 py-1.5 text-sm font-bold animate-pulse">
                    🔥 {kpi.urgents} urgent{kpi.urgents !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1.5 text-sm font-semibold">
                  💚 {kpi.gratuits} gratuit{kpi.gratuits !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Liens secondaires */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Link href="/communaute/coups-de-main"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition backdrop-blur-sm">
                  <Users className="w-4 h-4" /> Voir la communauté
                </Link>
              </div>
            </div>

            {/* CTA hero */}
            {profile ? (
              <button type="button" onClick={() => { resetForm(); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-6 py-3 rounded-2xl hover:bg-orange-50 transition-colors shadow-lg text-sm flex-shrink-0">
                <Plus className="w-5 h-5" /> Publier une annonce
              </button>
            ) : (
              <Link href="/connexion"
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-6 py-3 rounded-2xl hover:bg-orange-50 transition-colors shadow-lg text-sm flex-shrink-0">
                <ArrowRight className="w-5 h-5" /> Se connecter
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── RAPPELS SÉCURITÉ ── */}
      <div className="bg-amber-50 border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-start gap-3">
          <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {SECURITY_TIPS.map((tip, i) => (
              <span key={i} className="text-xs text-amber-700">{tip}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── CORPS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* ── Contenu principal ── */}
          <div className="flex-1 min-w-0">

            {/* Formulaire */}
            {showForm && profile && (
              <HelpForm
                form={form}
                setForm={setForm}
                step={step}
                setStep={setStep}
                submitting={submitting}
                editingItem={!!editingItem}
                previews={previews}
                photosCount={photos.length}
                onPhotoSelect={handlePhotoSelect}
                onRemovePhoto={removePhoto}
                onToggleArr={toggleArr}
                onSubmit={handleSubmit}
                onClose={resetForm}
              />
            )}

            {/* Filtres */}
            <HelpFilters
              filters={filters}
              showFilters={showFilters}
              activeFiltersCount={activeFiltersCount}
              savedIdsSize={savedIds.size}
              loading={loading}
              onSetSearch={setSearch}
              onSetFilterType={setFilterType}
              onSetFilterCat={setFilterCat}
              onSetFilterUrgency={setFilterUrgency}
              onSetFilterSector={setFilterSector}
              onSetFilterFree={setFilterFree}
              onSetFilterMyHelp={setFilterMyHelp}
              onToggleShowFilters={() => setShowFilters(!showFilters)}
              onResetFilters={resetFilters}
              onRefresh={fetchItems}
            />

            {/* Résultats */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <HandHeart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-bold text-lg">Aucune annonce trouvée</p>
                <p className="text-gray-400 text-sm mt-1 mb-5">
                  {activeFiltersCount > 0 ? 'Essayez de modifier vos filtres' : 'Soyez le premier à publier !'}
                </p>
                {activeFiltersCount > 0 ? (
                  <button type="button" onClick={resetFilters}
                    className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors">
                    <X className="w-4 h-4" /> Effacer les filtres
                  </button>
                ) : profile ? (
                  <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
                    className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-colors">
                    <Plus className="w-4 h-4" /> Publier une annonce
                  </button>
                ) : (
                  <Link href="/connexion"
                    className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-colors">
                    Se connecter pour publier <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4 font-medium">
                  {filtered.length} annonce{filtered.length > 1 ? 's' : ''}
                  {activeFiltersCount > 0 && ` · ${activeFiltersCount} filtre${activeFiltersCount > 1 ? 's' : ''} actif${activeFiltersCount > 1 ? 's' : ''}`}
                  {totalPages > 1 && ` · page ${page}/${totalPages}`}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {paginated.map(item => (
                    <HelpCard
                      key={item.id}
                      item={item}
                      userId={profile?.id}
                      isAuthor={item.author_id === profile?.id}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onResolve={handleResolve}
                      onPause={handlePause}
                      onStatusChange={handleStatusChange}
                      savedIds={savedIds}
                      onToggleSave={toggleSave}
                      onCanHelp={handleCanHelp}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button type="button"
                      onClick={() => { setPage(Math.max(1, page - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors">
                      ← Précédent
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let p = i + 1;
                        if (totalPages > 7) {
                          if (page <= 4) p = i + 1;
                          else if (page >= totalPages - 3) p = totalPages - 6 + i;
                          else p = page - 3 + i;
                        }
                        return (
                          <button key={p} type="button"
                            onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${p === page ? 'bg-orange-500 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                            {p}
                          </button>
                        );
                      })}
                    </div>
                    <button type="button"
                      onClick={() => { setPage(Math.min(totalPages, page + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors">
                      Suivant →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Sidebar ── */}
          <HelpSidebar
            items={items}
            filterSector={filters.filterSector}
            filterCat={filters.filterCat}
            filterUrgency={filters.filterUrgency}
            savedIds={savedIds}
            isLoggedIn={!!profile}
            kpi={kpi}
            onSetFilterSector={setFilterSector}
            onSetFilterCat={setFilterCat}
            onSetFilterUrgency={setFilterUrgency}
            onSetFilterMyHelp={setFilterMyHelp}
          />
        </div>
      </div>
    </div>
  );
}
