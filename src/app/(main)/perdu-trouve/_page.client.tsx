'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { Search, Plus, AlertCircle, Users, BookOpen, Loader2, Zap } from 'lucide-react';

import { useLostFound } from './_hooks/useLostFound';
import { INFO_BLOCKS } from './_constants';
import LostFoundCard from './_components/LostFoundCard';
import LFForm        from './_components/LFForm';
import LFFilters     from './_components/LFFilters';

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PerduTrouvePage() {
  const { profile } = useAuthStore();

  const {
    // list
    items, loading, dbReady, fetchItems,
    // filters
    flux, setFlux,
    filterType, setFilterType,
    filterCat, setFilterCat,
    filterStatus, setFilterStatus,
    filterSector, setFilterSector,
    search, setSearch,
    // form
    showForm, setShowForm,
    editingItem,
    form, setForm,
    photos, previews,
    submitting,
    step, setStep,
    photoRef,
    handlePhotoSelect, removePhoto,
    resetForm, startEdit,
    handleSubmit, handleDelete, handleStatusChange,
    // matching
    getSuggestedMatches,
    // stats
    perdusCount, trouveCount, identifieCount, restitueCount,
  } = useLostFound(profile?.id);

  // Initialise sector filter from profile on mount
  useEffect(() => {
    if (profile?.home_sector_id) {
      setFilterSector(profile.home_sector_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.home_sector_id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const activeCount  = perdusCount + trouveCount + identifieCount;
  const historyCount = restitueCount;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* ── DB warning ── */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Migration nécessaire.</strong>{' '}
              Exécutez le SQL dans <Link href="/admin/migration" className="underline">Admin → Migration</Link> pour activer le module.
            </p>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-400 via-amber-400 to-emerald-500 text-white">
        <div
          className="absolute inset-0 opacity-10 bg-dot-grid-lg"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl"><Search className="w-5 h-5" /></div>
                <span className="text-amber-100 text-sm font-semibold">Vie pratique · Perdu / Trouvé</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">🔍 Perdu / Trouvé à Biguglia</h1>
              <p className="text-amber-100 text-base max-w-lg leading-relaxed">
                Service local de proximité — déclarez un objet perdu ou trouvé, la communauté vous aide.
              </p>

              {/* Counters */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 bg-orange-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  🔴 {perdusCount} perdu{perdusCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  🟢 {trouveCount} trouvé{trouveCount !== 1 ? 's' : ''}
                </span>
                {identifieCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    🔵 {identifieCount} identifié{identifieCount !== 1 ? 's' : ''}
                  </span>
                )}
                {restitueCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-purple-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    ✅ {restitueCount} restitué{restitueCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Link href="/communaute/perdu-trouve"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition">
                  <Users className="w-4 h-4" /> Communauté →
                </Link>
                {profile && (
                  <Link href="/dashboard/perdu-trouve"
                    className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition">
                    <BookOpen className="w-4 h-4" /> Mes dossiers →
                  </Link>
                )}
              </div>
            </div>

            {profile && (
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-6 py-3 rounded-2xl hover:bg-orange-50 transition-colors shadow-lg text-sm flex-shrink-0">
                <Plus className="w-5 h-5" /> Publier une annonce
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Form (when open) */}
        {showForm && profile && (
          <LFForm
            form={form}
            setForm={setForm}
            step={step}
            setStep={setStep}
            editingItem={editingItem}
            photos={photos}
            previews={previews}
            submitting={submitting}
            photoRef={photoRef}
            onPhotoSelect={handlePhotoSelect}
            onRemovePhoto={removePhoto}
            onSubmit={(asDraft) => handleSubmit(asDraft, profile)}
            onCancel={resetForm}
          />
        )}

        {/* Filters */}
        <LFFilters
          flux={flux} setFlux={setFlux}
          activeCount={activeCount}
          historyCount={historyCount}
          filterSector={filterSector} setFilterSector={setFilterSector}
          search={search} setSearch={setSearch}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterType={filterType} setFilterType={setFilterType}
          filterCat={filterCat} setFilterCat={setFilterCat}
        />

        {/* ── List ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">Aucune annonce dans ce flux</p>
            <p className="text-gray-400 text-sm mt-1">
              {flux === 'actif' ? 'Soyez le premier à publier !' : "Aucune restitution enregistrée pour l'instant."}
            </p>
            {flux === 'actif' && (
              profile ? (
                <button onClick={() => { resetForm(); setShowForm(true); }}
                  className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-colors">
                  <Plus className="w-4 h-4" /> Publier une annonce
                </button>
              ) : (
                <Link href="/connexion"
                  className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-colors">
                  Se connecter pour publier
                </Link>
              )
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {items.length} annonce{items.length > 1 ? 's' : ''} · {flux === 'actif' ? 'flux actif' : 'historique'}
              </p>
              {flux === 'actif' && items.some(i => getSuggestedMatches(i).length > 0) && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                  <Zap className="w-3.5 h-3.5" /> Correspondances détectées automatiquement
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map(item => (
                <LostFoundCard
                  key={item.id}
                  item={item}
                  userId={profile?.id}
                  isAuthor={profile?.id === item.author_id}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  suggestedMatches={flux === 'actif' ? getSuggestedMatches(item) : []}
                />
              ))}
            </div>
          </>
        )}

        {/* CTA for unauthenticated users */}
        {!profile && items.length > 0 && (
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
            <p className="text-orange-700 font-medium mb-3">Connectez-vous pour publier ou répondre aux annonces</p>
            <Link href="/connexion"
              className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-colors">
              Se connecter
            </Link>
          </div>
        )}

        {/* Info blocks */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {INFO_BLOCKS.map((b, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
              <span className="text-2xl">{b.icon}</span>
              <div>
                <p className="text-sm font-bold text-gray-800">{b.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
