'use client';

/**
 * src/app/(main)/collectionneurs/[id]/modifier/ModifierClient.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrateur UI — page d'édition d'annonce collectionneur.
 *
 * Logique d'état et appels Supabase → use-collection-item-form.ts
 * Section Photos → CollectionPhotoSection.tsx
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Save, Loader2, Trash2, AlertCircle,
  Camera, X, MapPin, Truck, Package,
  Info, Tag, ArrowLeftRight, Gift, Search, Gem,
  ChevronDown, ChevronUp, Plus,
} from 'lucide-react';
import {
  MODE_CONFIG, STATUS_CONFIG, RARITY_CONFIG, CONDITION_CONFIG,
  type CollectionMode, type CollectionStatus, type RarityLevel, type ConditionLevel,
} from '@/lib/collectionneurs-config';
import { useCollectionItemForm, type SectionId } from './use-collection-item-form';
import { CollectionPhotoSection } from './CollectionPhotoSection';

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ModifierClient() {
  const params = useParams();
  const id     = params?.id as string;

  const {
    loading, saving, notFound, forbidden, deleting, deleteConfirm, setDeleteConfirm,
    item, categories, form, openSections,
    tagInput, setTagInput, fileInputRef,
    update, toggleSection,
    handleFiles, removePhoto, setCover,
    handleSave, handleDelete,
  } = useCollectionItemForm(id);

  // ── États de chargement / erreur ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Annonce introuvable</h2>
          <Link href="/collectionneurs" className="text-blue-600 hover:underline">Retour à la liste</Link>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Accès non autorisé</h2>
          <p className="text-gray-500 mb-4">Vous ne pouvez modifier que vos propres annonces.</p>
          <Link href="/collectionneurs" className="text-blue-600 hover:underline">Retour à la liste</Link>
        </div>
      </div>
    );
  }

  // ── En-tête de section (réutilisable dans le JSX) ─────────────────────────
  const SectionHeader = ({ id: sid, title, icon: Icon }: { id: SectionId; title: string; icon: React.ElementType }) => (
    <button
      onClick={() => toggleSection(sid)}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
    >
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-500" />{title}
      </h3>
      {openSections.has(sid)
        ? <ChevronUp className="w-4 h-4 text-gray-400" />
        : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );

  const activePhotos = form.photos.filter(p => !p.toDelete);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Barre de navigation sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/collectionneurs/${id}`} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Modifier l&apos;annonce</h1>
            {item && <p className="text-xs text-gray-500 truncate">{item.title}</p>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 pb-24">

        {/* ── Mode & Statut ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="mode" title="Mode & Statut" icon={Tag} />
          {openSections.has('mode') && (
            <div className="p-4 pt-0 space-y-4">
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Mode d&apos;annonce</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.entries(MODE_CONFIG) as [CollectionMode, typeof MODE_CONFIG.vente][]).map(([mode, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button key={mode} onClick={() => update('mode', mode)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition',
                          form.mode === mode ? `border-blue-500 ${cfg.bg} ${cfg.color}` : 'border-gray-200 text-gray-600 hover:border-gray-300',
                        )}>
                        <Icon className="w-5 h-5" /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Statut</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(STATUS_CONFIG) as [CollectionStatus, typeof STATUS_CONFIG.actif][]).map(([status, cfg]) => (
                    <button key={status} onClick={() => update('status', status)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                        form.status === status ? `${cfg.bg} ${cfg.color} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      )}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Informations principales ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="infos" title="Informations principales" icon={Info} />
          {openSections.has('infos') && (
            <div className="p-4 pt-0 space-y-4">
              {/* Catégorie */}
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Catégorie</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => update('category_id', cat.id)}
                      className={cn(
                        'p-2.5 rounded-xl border-2 text-left transition text-xs',
                        form.category_id === cat.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300',
                      )}>
                      <span className="text-lg block">{cat.icon}</span>
                      <span className="font-medium leading-tight line-clamp-2">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <input type="text" value={form.subcategory} onChange={e => update('subcategory', e.target.value)}
                  placeholder="Sous-catégorie (optionnel)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
              </div>

              {/* Titre */}
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1.5">Titre <span className="text-red-500">*</span></p>
                <input type="text" value={form.title} onChange={e => update('title', e.target.value)} maxLength={120}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <p className="text-xs text-gray-400 mt-1">{form.title.length}/120</p>
              </div>

              {/* Description */}
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></p>
                <textarea value={form.description} onChange={e => update('description', e.target.value)}
                  rows={5} maxLength={2000}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm" />
                <p className="text-xs text-gray-400 mt-1">{form.description.length}/2000</p>
              </div>

              {/* État + Rareté */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1.5">État</p>
                  <select value={form.condition} onChange={e => update('condition', e.target.value as ConditionLevel)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
                    {(Object.entries(CONDITION_CONFIG) as [ConditionLevel, { label: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1.5">Rareté</p>
                  <select value={form.rarity_level} onChange={e => update('rarity_level', e.target.value as RarityLevel)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
                    {(Object.entries(RARITY_CONFIG) as [RarityLevel, { label: string; icon: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200">
                      {tag}
                      <button onClick={() => update('tags', form.tags.filter((_, j) => j !== i))} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {form.tags.length < 8 && (
                  <div className="flex gap-2">
                    <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                          e.preventDefault();
                          const t = tagInput.trim().toLowerCase();
                          if (!form.tags.includes(t)) update('tags', [...form.tags, t]);
                          setTagInput('');
                        }
                      }}
                      placeholder="Ajouter un tag…"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                    <button onClick={() => {
                      const t = tagInput.trim().toLowerCase();
                      if (t && !form.tags.includes(t)) { update('tags', [...form.tags, t]); setTagInput(''); }
                    }} className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm transition">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Détails de l'objet ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="details" title="Détails de l'objet" icon={Gem} />
          {openSections.has('details') && (
            <div className="p-4 pt-0 grid grid-cols-2 gap-3">
              {([
                { key: 'year_period',  label: 'Époque / Période',  placeholder: 'Ex: 1950–1960' },
                { key: 'brand',        label: 'Marque / Fabricant', placeholder: 'Ex: LIP, Dinky Toys…' },
                { key: 'series_name',  label: 'Série / Collection', placeholder: 'Ex: Collection Tintin' },
                { key: 'dimensions',   label: 'Dimensions',         placeholder: 'Ex: 12 × 8 × 5 cm' },
                { key: 'material',     label: 'Matière',            placeholder: 'Ex: Métal, Porcelaine…' },
                { key: 'provenance',   label: 'Provenance',         placeholder: 'Ex: Grenier familial' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="text" value={form[key] || ''} onChange={e => update(key, e.target.value as never)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
              ))}
              <div className="col-span-2">
                <p className="block text-xs font-medium text-gray-600 mb-1">Défauts à signaler</p>
                <input type="text" value={form.defects_noted} onChange={e => update('defects_noted', e.target.value)}
                  placeholder="Ex: Petite éraflure, couleur passée…"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.authenticity_declared}
                    onChange={e => update('authenticity_declared', e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-700">Je déclare l&apos;authenticité de cet objet (sur l&apos;honneur)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── Transaction ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="transaction" title="Transaction" icon={ArrowLeftRight} />
          {openSections.has('transaction') && (
            <div className="p-4 pt-0 space-y-3">
              {form.mode === 'vente' && (
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1.5">Prix (€)</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                    <input type="number" min={0} value={form.price} onChange={e => update('price', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
              )}
              {form.mode === 'echange' && (
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1.5">Objet(s) souhaité(s) en échange</p>
                  <textarea value={form.exchange_expected} onChange={e => update('exchange_expected', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
                    placeholder="Ce que vous souhaitez en retour…" />
                </div>
              )}
              {form.mode === 'don' && (
                <p className="text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl flex items-center gap-2">
                  <Gift className="w-4 h-4" /> Cet objet est proposé gratuitement.
                </p>
              )}
              {form.mode === 'recherche' && (
                <p className="text-sm text-purple-700 bg-purple-50 px-4 py-3 rounded-xl flex items-center gap-2">
                  <Search className="w-4 h-4" /> Vous signalez une recherche.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Localisation & Remise ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="localisation" title="Localisation & Remise" icon={MapPin} />
          {openSections.has('localisation') && (
            <div className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="block text-xs font-medium text-gray-600 mb-1">Ville <span className="text-red-500">*</span></p>
                  <input type="text" value={form.city} onChange={e => update('city', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
                <div>
                  <p className="block text-xs font-medium text-gray-600 mb-1">Code postal</p>
                  <input type="text" value={form.postal_code} onChange={e => update('postal_code', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.local_meetup_available}
                  onChange={e => update('local_meetup_available', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <Package className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Remise en main propre possible</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.shipping_available}
                  onChange={e => update('shipping_available', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600" />
                <Truck className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Envoi postal possible</span>
              </label>
            </div>
          )}
        </div>

        {/* ── Photos ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="photos" title={`Photos (${activePhotos.length}/12)`} icon={Camera} />
          {openSections.has('photos') && (
            <CollectionPhotoSection
              photos={form.photos}
              fileInputRef={fileInputRef}
              onFilesChange={handleFiles}
              onRemove={removePhoto}
              onSetCover={setCover}
            />
          )}
        </div>

        {/* ── Zone dangereuse ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="p-4">
            <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Zone dangereuse
            </h3>
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2.5 rounded-xl transition font-medium">
                <Trash2 className="w-4 h-4" /> Supprimer cette annonce
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-700 font-medium">⚠️ Êtes-vous sûr ? Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Confirmer la suppression
                  </button>
                  <button onClick={() => setDeleteConfirm(false)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barre d'actions fixe bas de page */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Link href={`/collectionneurs/${id}`}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition text-sm">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-60">
            {saving
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement…</>
              : <><Save className="w-5 h-5" /> Enregistrer les modifications</>}
          </button>
        </div>
      </div>
    </div>
  );
}
