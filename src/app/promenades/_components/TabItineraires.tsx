'use client';

import Link from 'next/link';
import {
  Plus, X, Filter, Camera, Loader2, RefreshCw, MapPin, Clock, Heart, TreePine,
} from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import { cn } from '@/lib/utils';
import PromenadeCard from './PromenadeCard';
import { TYPE_CONFIG, DIFF_CONFIG } from '../_constants';
import { formatDuration } from '../_utils';
import type { Promenade, PromenadeFormState, AdvFilters } from '../_types';

interface Props {
  // Data
  promenades: Promenade[];
  loadingPromenades: boolean;
  totalCount: number;
  activeFiltersCount: number;
  // Filters
  quickFilter: string | null;
  advFilters: AdvFilters;
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
  setAdvFilters: React.Dispatch<React.SetStateAction<AdvFilters>>;
  setQuickFilter: (v: string | null) => void;
  // View
  viewMode: 'grid' | 'list';
  // Form
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  photos: File[];
  setPhotos: React.Dispatch<React.SetStateAction<File[]>>;
  submitting: boolean;
  form: PromenadeFormState;
  setForm: React.Dispatch<React.SetStateAction<PromenadeFormState>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSubmit: (e: React.FormEvent) => void;
  // Auth
  userId?: string;
  profileId?: string;
  // Callbacks
  handleLike: (id: string, liked: boolean) => void;
}

export default function TabItineraires({
  promenades, loadingPromenades, totalCount, activeFiltersCount,
  quickFilter, advFilters, filterSector, setFilterSector, setAdvFilters, setQuickFilter,
  viewMode,
  showForm, setShowForm, photos, setPhotos, submitting, form, setForm, fileInputRef, handleSubmit,
  userId, profileId,
  handleLike,
}: Props) {
  const clearAllFilters = () => {
    setQuickFilter(null);
    setAdvFilters({ dogs: false, stroller: false, parking: false, water: false, shade: false, sunset: false, loop: false, duration_max: '' });
    setFilterSector(null);
  };

  return (
    <div>
      {/* En-tête résultats + bouton ajouter */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-black text-gray-900">
            {loadingPromenades ? 'Chargement…' : totalCount > 0 ? `${totalCount} itinéraire${totalCount > 1 ? 's' : ''}` : 'Itinéraires'}
          </h2>
          {activeFiltersCount > 0 && !loadingPromenades && (
            <p className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <Filter className="w-3 h-3" />{activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {profileId && (
          <button onClick={() => setShowForm(!showForm)}
            className={cn(
              'inline-flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm',
              showForm
                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200'
            )}>
            {showForm ? <><X className="w-4 h-4" /> Annuler</> : <><Plus className="w-4 h-4" /> Partager</>}
          </button>
        )}
      </div>

      {/* ── Formulaire ajout itinéraire ── */}
      {showForm && profileId && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-emerald-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">🌿</span>
              Partager un itinéraire
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder="Titre de l'itinéraire *" required
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Type d&apos;activité *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Difficulté</label>
                <div className="flex gap-1.5">
                  {(['facile', 'moyen', 'difficile'] as const).map(d => (
                    <button key={d} type="button" onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                      className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all',
                        form.difficulty === d
                          ? d === 'facile' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : d === 'moyen' ? 'bg-amber-400 text-white border-amber-400 shadow-sm'
                            : 'bg-red-500 text-white border-red-500 shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                      {d === 'facile' ? '🟢' : d === 'moyen' ? '🟡' : '🔴'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Distance (km)</label>
                <input type="number" step="0.1" min="0" placeholder="ex: 3.5"
                  value={form.distance_km} onChange={e => setForm(f => ({ ...f, distance_km: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Durée (min)</label>
                <input type="number" min="0" placeholder="ex: 45"
                  value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
            </div>

            <input type="text" placeholder="Point de départ / RDV (ex: parking du lac de Biguglia)"
              value={form.start_point} onChange={e => setForm(f => ({ ...f, start_point: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Secteur géographique</label>
              <SectorFilter value={form.sector_id || null} onChange={v => setForm(f => ({ ...f, sector_id: v || '' }))} showAll compact label="" />
            </div>

            <textarea placeholder="Description : points d'intérêt, ambiance, panoramas, conseils pratiques…" required
              rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" />

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Caractéristiques du parcours</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: 'dogs_allowed',      label: '🐕 Chiens acceptés',   cls: 'amber' },
                  { key: 'stroller_friendly', label: '🍼 Poussette possible', cls: 'pink' },
                  { key: 'parking_available', label: '🅿️ Parking disponible', cls: 'blue' },
                  { key: 'water_access',      label: "💧 Point d'eau",        cls: 'sky' },
                  { key: 'route_loop',        label: '🔄 Circuit en boucle',  cls: 'gray' },
                ].map(({ key, label, cls }) => (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, [key]: !(f as Record<string, unknown>)[key] }))}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                      (form as Record<string, unknown>)[key]
                        ? `bg-${cls}-100 text-${cls}-700 border-${cls}-300 shadow-sm`
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Niveau d&apos;ombre</label>
              <div className="flex gap-2">
                {([
                  { val: 'none',    label: '☀️ Exposé' },
                  { val: 'partial', label: '⛅ Partiel' },
                  { val: 'full',    label: '🌳 Ombragé' },
                ] as const).map(s => (
                  <button key={s.val} type="button" onClick={() => setForm(f => ({ ...f, shade_level: s.val }))}
                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', form.shade_level === s.val ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Meilleur moment de la journée</label>
              <div className="flex gap-2">
                {([
                  { val: 'morning', label: '🌄 Matin' },
                  { val: 'anytime', label: '🕑 Toute heure' },
                  { val: 'sunset',  label: '🌅 Coucher soleil' },
                ] as const).map(t => (
                  <button key={t.val} type="button" onClick={() => setForm(f => ({ ...f, best_time_of_day: t.val }))}
                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', form.best_time_of_day === t.val ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea placeholder="Conseils pratiques : équipement recommandé, parking, horaires, accès transport…"
              rows={2} value={form.practical_tips} onChange={e => setForm(f => ({ ...f, practical_tips: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" />

            <textarea placeholder="⚠️ Notes de sécurité : passages délicats, zones sensibles, vigilance particulière…"
              rows={2} value={form.safety_notes} onChange={e => setForm(f => ({ ...f, safety_notes: e.target.value }))}
              className="w-full border border-orange-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50/30" />

            <input type="text" placeholder="Tags (séparés par virgules) : ex: étang, coucher-soleil, chien, famille"
              value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Photos (max 5) — partagez les plus beaux points du parcours</label>
              <div className="flex gap-2 flex-wrap">
                {photos.map((file, i) => {
                  const url = URL.createObjectURL(file);
                  return (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {photos.length < 5 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-emerald-400 hover:bg-emerald-50 hover:border-emerald-400 transition-all">
                    <Camera className="w-5 h-5" /><span className="text-xs mt-1">Photo</span>
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => { const files = Array.from(e.target.files || []); setPhotos(prev => [...prev, ...files].slice(0, 5)); }} />
            </div>
          </div>

          <div className="flex gap-2 mt-5 pt-5 border-t border-gray-100">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all shadow-sm shadow-emerald-200">
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication…</> : "🌿 Publier l'itinéraire"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200">Annuler</button>
          </div>
        </form>
      )}

      {/* ── Grille itinéraires ── */}
      {loadingPromenades ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <TreePine className="w-8 h-8 text-emerald-400" />
            </div>
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin absolute -right-1 -bottom-1" />
          </div>
          <p className="text-gray-400 text-sm font-medium">Chargement des itinéraires…</p>
        </div>
      ) : promenades.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TreePine className="w-8 h-8 text-gray-200" />
          </div>
          <p className="text-gray-600 font-bold mb-1 text-lg">
            {activeFiltersCount > 0 ? 'Aucun itinéraire pour ces filtres' : 'Aucun itinéraire partagé'}
          </p>
          <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
            {activeFiltersCount > 0
              ? 'Essayez d\'élargir vos critères ou explorez tous les itinéraires.'
              : 'Soyez le premier à partager une belle balade autour de Biguglia !'}
          </p>
          {activeFiltersCount > 0 ? (
            <button onClick={clearAllFilters}
              className="inline-flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline bg-emerald-50 px-5 py-2.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors">
              <RefreshCw className="w-4 h-4" /> Effacer les filtres
            </button>
          ) : profileId ? (
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm">
              <Plus className="w-4 h-4" /> Partager un itinéraire
            </button>
          ) : (
            <Link href="/connexion"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm">
              Se connecter pour contribuer
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {promenades.map(p => (
            <PromenadeCard key={p.id} p={p} userId={userId} onLike={handleLike} />
          ))}
        </div>
      ) : (
        /* Vue liste */
        <div className="space-y-3">
          {promenades.map(p => {
            const type = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.balade;
            const TypeIcon = type.icon;
            const diff = DIFF_CONFIG[p.difficulty];
            const firstPhoto = p.photos?.[0]?.url;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex gap-0">
                <div className={`relative w-24 h-24 flex-shrink-0 ${firstPhoto ? '' : `bg-gradient-to-br ${type.gradient}`} flex items-center justify-center`}>
                  {firstPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <TypeIcon className="w-8 h-8 text-white opacity-40" />
                  )}
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{p.title}</h3>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0', diff.color)}>{diff.icon} {diff.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {p.distance_km != null && <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.distance_km} km</span>}
                    {p.duration_min != null && <span className="text-xs font-semibold text-sky-600 flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDuration(p.duration_min)}</span>}
                    <button onClick={() => userId && handleLike(p.id, !!p.user_liked)}
                      className={cn('ml-auto flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border transition-all', p.user_liked ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-gray-50 text-gray-400 border-gray-100')}>
                      <Heart className={cn('w-3 h-3', p.user_liked ? 'fill-current' : '')} />{p.likes_count || 0}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
