'use client';

/**
 * Collectionneurs — Page édition d'annonce v2.0
 * Modification complète de tous les champs, gestion photos
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Save, Loader2, Trash2, AlertCircle, Check,
  Camera, Plus, X, Star, Sparkles, MapPin, Truck, Package,
  Info, Tag, Eye, ArrowLeftRight, Gift, Search, Gem,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MODE_CONFIG, STATUS_CONFIG, RARITY_CONFIG, CONDITION_CONFIG,
  type CollectionMode, type CollectionStatus, type RarityLevel, type ConditionLevel,
  type CollectionItem, type CollectionCategory,
} from '@/lib/collectionneurs-config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoItem {
  id?: string;           // ID en base si existante
  file?: File;
  preview: string;
  url?: string;
  is_cover: boolean;
  sort_order: number;
  uploading?: boolean;
  error?: string;
  toDelete?: boolean;
}

const MAX_PHOTOS = 12;
const MAX_FILE_MB = 8;

const SECTION_IDS = ['mode', 'infos', 'details', 'transaction', 'localisation', 'photos', 'statut'] as const;
type SectionId = typeof SECTION_IDS[number];

export default function ModifierAnnoncePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useAuthStore();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set<SectionId>(['mode', 'infos', 'details', 'transaction', 'localisation', 'photos']));
  const [tagInput, setTagInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── État du formulaire ─────────────────────────────────────────────────────
  const [form, setForm] = useState({
    mode: 'vente' as CollectionMode,
    status: 'actif' as CollectionStatus,
    category_id: '',
    subcategory: '',
    title: '',
    description: '',
    condition: 'bon' as ConditionLevel,
    rarity_level: 'commun' as RarityLevel,
    year_period: '',
    brand: '',
    series_name: '',
    authenticity_declared: false,
    provenance: '',
    defects_noted: '',
    dimensions: '',
    material: '',
    price: '',
    exchange_expected: '',
    shipping_available: false,
    local_meetup_available: true,
    city: '',
    postal_code: '',
    tags: [] as string[],
    photos: [] as PhotoItem[],
  });

  const update = useCallback(<K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSection = (s: SectionId) => {
    setOpenSections(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  };

  // ─── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    supabase.from('collection_categories').select('*').order('display_order').then(({ data }) => {
      if (data?.length) setCategories(data as CollectionCategory[]);
    });
  }, [id, supabase]);

  useEffect(() => {
    if (!id || !profile) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('collection_items')
        .select(`
          *,
          category:collection_categories(*),
          photos:collection_item_photos(id, url, image_url, is_cover, sort_order)
        `)
        .eq('id', id)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      if (data.author_id !== profile.id && profile.role !== 'admin' && profile.role !== 'moderator') {
        setForbidden(true); setLoading(false); return;
      }

      setItem(data as unknown as CollectionItem);
      const d = data as Record<string, unknown>;
      setForm({
        mode: ((d.mode || d.item_type === 'troc' ? 'echange' : d.item_type) as CollectionMode) || 'vente',
        status: (d.status as CollectionStatus) || 'actif',
        category_id: (d.category_id as string) || '',
        subcategory: (d.subcategory as string) || '',
        title: (d.title as string) || '',
        description: (d.description as string) || '',
        condition: (d.condition as ConditionLevel) || 'bon',
        rarity_level: (d.rarity_level as RarityLevel) || 'commun',
        year_period: (d.year_period as string) || '',
        brand: (d.brand as string) || '',
        series_name: (d.series_name as string) || '',
        authenticity_declared: (d.authenticity_declared as boolean) || false,
        provenance: (d.provenance as string) || '',
        defects_noted: (d.defects_noted as string) || '',
        dimensions: (d.dimensions as string) || '',
        material: (d.material as string) || '',
        price: d.price != null ? String(d.price) : '',
        exchange_expected: (d.exchange_expected as string) || '',
        shipping_available: (d.shipping_available as boolean) || false,
        local_meetup_available: d.local_meetup_available !== false,
        city: (d.city as string) || '',
        postal_code: (d.postal_code as string) || '',
        tags: (d.tags as string[]) || [],
        photos: ((d.photos as Array<{id?: string; url?: string; image_url?: string; is_cover?: boolean; sort_order?: number}>) || []).map(p => ({
          id: p.id,
          preview: p.image_url || p.url || '',
          url: p.image_url || p.url,
          is_cover: p.is_cover || false,
          sort_order: p.sort_order || 0,
        })),
      });
      setLoading(false);
    })();
  }, [id, profile, supabase]);

  // ─── Upload photo ──────────────────────────────────────────────────────────

  const uploadPhoto = useCallback(async (file: File, idx: number): Promise<string | null> => {
    if (!profile?.id) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `collection/${profile.id}/${Date.now()}_${idx}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
    return publicUrl;
  }, [profile?.id, supabase]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const existing = form.photos.filter(p => !p.toDelete);
    const remaining = MAX_PHOTOS - existing.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_PHOTOS} photos.`); return; }

    const accepted = Array.from(files).slice(0, remaining).filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`${f.name} trop lourd.`); return false; }
      return true;
    });
    if (!accepted.length) return;

    const previews: PhotoItem[] = accepted.map((file, i) => ({
      file, preview: URL.createObjectURL(file),
      is_cover: existing.length === 0 && i === 0,
      sort_order: existing.length + i,
      uploading: true,
    }));
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...previews] }));

    const uploaded = await Promise.all(accepted.map((file, i) => uploadPhoto(file, existing.length + i)));

    setForm(prev => {
      const newPhotos = [...prev.photos];
      const baseIdx = prev.photos.length - accepted.length;
      for (let i = 0; i < accepted.length; i++) {
        if (baseIdx + i < newPhotos.length) {
          newPhotos[baseIdx + i] = {
            ...newPhotos[baseIdx + i],
            url: uploaded[i] || undefined,
            uploading: false,
            error: uploaded[i] ? undefined : 'Échec',
          };
        }
      }
      return { ...prev, photos: newPhotos };
    });
  }, [form.photos, uploadPhoto]);

  const removePhoto = useCallback((idx: number) => {
    setForm(prev => {
      const p = prev.photos[idx];
      // Si existante en base, marquer à supprimer
      if (p.id) {
        const newPhotos = prev.photos.map((ph, i) => i === idx ? { ...ph, toDelete: true } : ph);
        const active = newPhotos.filter(p => !p.toDelete);
        if (active.length > 0 && !active.some(p => p.is_cover)) {
          const firstActive = newPhotos.findIndex(p => !p.toDelete);
          if (firstActive >= 0) newPhotos[firstActive] = { ...newPhotos[firstActive], is_cover: true };
        }
        return { ...prev, photos: newPhotos };
      }
      // Sinon supprimer directement
      const newPhotos = prev.photos.filter((_, i) => i !== idx);
      if (newPhotos.length > 0 && !newPhotos.some(p => p.is_cover)) newPhotos[0].is_cover = true;
      return { ...prev, photos: newPhotos };
    });
  }, []);

  const setCover = useCallback((idx: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.map((p, i) => ({ ...p, is_cover: i === idx && !p.toDelete })),
    }));
  }, []);

  // ─── Sauvegarde ────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || form.title.length < 5) { toast.error('Titre trop court.'); return; }
    if (!form.description.trim() || form.description.length < 20) { toast.error('Description trop courte.'); return; }
    if (!form.city.trim()) { toast.error('Indiquez votre ville.'); return; }

    setSaving(true);
    try {
      const payload = {
        mode: form.mode,
        item_type: form.mode === 'echange' ? 'troc' : form.mode,
        status: form.status,
        category_id: form.category_id || null,
        subcategory: form.subcategory || null,
        title: form.title.trim(),
        description: form.description.trim(),
        condition: form.condition,
        rarity_level: form.rarity_level,
        year_period: form.year_period || null,
        brand: form.brand || null,
        series_name: form.series_name || null,
        authenticity_declared: form.authenticity_declared,
        provenance: form.provenance || null,
        defects_noted: form.defects_noted || null,
        dimensions: form.dimensions || null,
        material: form.material || null,
        price: form.mode === 'vente' && form.price ? Number(form.price) : null,
        exchange_expected: form.mode === 'echange' ? form.exchange_expected || null : null,
        shipping_available: form.shipping_available,
        local_meetup_available: form.local_meetup_available,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        tags: form.tags,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('collection_items').update(payload).eq('id', id);
      if (error) throw error;

      // Supprimer les photos marquées
      const toDelete = form.photos.filter(p => p.id && p.toDelete);
      if (toDelete.length > 0) {
        await supabase.from('collection_item_photos').delete().in('id', toDelete.map(p => p.id!));
      }

      // Insérer les nouvelles photos
      const newPhotos = form.photos.filter(p => !p.id && !p.toDelete && p.url);
      if (newPhotos.length > 0) {
        const photoRows = newPhotos.map((p, i) => ({
          item_id: id,
          url: p.url!,
          image_url: p.url!,
          is_cover: p.is_cover,
          sort_order: p.sort_order,
          alt_text: `${form.title} - photo ${i + 1}`,
        }));
        await supabase.from('collection_item_photos').insert(photoRows);
      }

      // Mettre à jour la couverture des photos existantes
      const existingUpdates = form.photos.filter(p => p.id && !p.toDelete);
      for (const p of existingUpdates) {
        await supabase.from('collection_item_photos').update({ is_cover: p.is_cover, sort_order: p.sort_order }).eq('id', p.id!);
      }

      toast.success('Annonce mise à jour !');
      router.push(`/collectionneurs/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Erreur : ' + msg);
    } finally {
      setSaving(false);
    }
  }, [form, id, supabase, router]);

  // ─── Suppression ──────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await supabase.from('collection_item_photos').delete().eq('item_id', id);
      await supabase.from('collection_items').delete().eq('id', id);
      toast.success('Annonce supprimée.');
      router.push('/collectionneurs');
    } catch {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }, [deleteConfirm, id, supabase, router]);

  // ─── Rendu ────────────────────────────────────────────────────────────────

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
        <div><AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Annonce introuvable</h2>
          <Link href="/collectionneurs" className="text-blue-600 hover:underline">Retour à la liste</Link>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Accès non autorisé</h2>
          <p className="text-gray-500 mb-4">Vous ne pouvez modifier que vos propres annonces.</p>
          <Link href="/collectionneurs" className="text-blue-600 hover:underline">Retour à la liste</Link>
        </div>
      </div>
    );
  }

  const activePhotos = form.photos.filter(p => !p.toDelete);

  const SectionHeader = ({ id: sid, title, icon: Icon }: { id: SectionId; title: string; icon: React.ElementType }) => (
    <button
      onClick={() => toggleSection(sid)}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
    >
      <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Icon className="w-4 h-4 text-blue-500" />{title}</h3>
      {openSections.has(sid) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

        {/* ── Section Mode & Statut ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="mode" title="Mode & Statut" icon={Tag} />
          {openSections.has('mode') && (
            <div className="p-4 pt-0 space-y-4">
              {/* Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode d&apos;annonce</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.entries(MODE_CONFIG) as [CollectionMode, typeof MODE_CONFIG.vente][]).map(([mode, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button key={mode} onClick={() => update('mode', mode)}
                        className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition',
                          form.mode === mode ? `border-blue-500 ${cfg.bg} ${cfg.color}` : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        )}>
                        <Icon className="w-5 h-5" /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(STATUS_CONFIG) as [CollectionStatus, typeof STATUS_CONFIG.actif][]).filter(([, v]) => !v.closed || ['vendu','echange','donne','trouve'].includes(Object.keys(STATUS_CONFIG).find(k => STATUS_CONFIG[k as CollectionStatus] === v)!)).map(([status, cfg]) => (
                    <button key={status} onClick={() => update('status', status)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                        form.status === status ? `${cfg.bg} ${cfg.color} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section Informations principales ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="infos" title="Informations principales" icon={Info} />
          {openSections.has('infos') && (
            <div className="p-4 pt-0 space-y-4">
              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => update('category_id', cat.id)}
                      className={cn('p-2.5 rounded-xl border-2 text-left transition text-xs',
                        form.category_id === cat.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      )}>
                      <span className="text-lg block">{cat.icon}</span>
                      <span className="font-medium leading-tight line-clamp-2">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <input type="text" value={form.subcategory} onChange={e => update('subcategory', e.target.value)}
                  placeholder="Sous-catégorie (optionnel)" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={e => update('title', e.target.value)} maxLength={120}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <p className="text-xs text-gray-400 mt-1">{form.title.length}/120</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)}
                  rows={5} maxLength={2000} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm" />
                <p className="text-xs text-gray-400 mt-1">{form.description.length}/2000</p>
              </div>

              {/* État + Rareté */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">État</label>
                  <select value={form.condition} onChange={e => update('condition', e.target.value as ConditionLevel)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white">
                    {(Object.entries(CONDITION_CONFIG) as [ConditionLevel, { label: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rareté</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200">
                      {tag}
                      <button onClick={() => update('tags', form.tags.filter((_, j) => j !== i))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
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
                    <button onClick={() => { const t = tagInput.trim().toLowerCase(); if (t && !form.tags.includes(t)) { update('tags', [...form.tags, t]); setTagInput(''); } }}
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm transition">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Section Détails de l'objet ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="details" title="Détails de l'objet" icon={Gem} />
          {openSections.has('details') && (
            <div className="p-4 pt-0 grid grid-cols-2 gap-3">
              {[
                { key: 'year_period', label: 'Époque / Période', placeholder: 'Ex: 1950–1960' },
                { key: 'brand', label: 'Marque / Fabricant', placeholder: 'Ex: LIP, Dinky Toys…' },
                { key: 'series_name', label: 'Série / Collection', placeholder: 'Ex: Collection Tintin' },
                { key: 'dimensions', label: 'Dimensions', placeholder: 'Ex: 12 × 8 × 5 cm' },
                { key: 'material', label: 'Matière', placeholder: 'Ex: Métal, Porcelaine…' },
                { key: 'provenance', label: 'Provenance', placeholder: 'Ex: Grenier familial' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="text" value={(form as Record<string, unknown>)[key] as string || ''}
                    onChange={e => update(key as keyof typeof form, e.target.value as never)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Défauts à signaler</label>
                <input type="text" value={form.defects_noted}
                  onChange={e => update('defects_noted', e.target.value)}
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

        {/* ── Section Transaction ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="transaction" title="Transaction" icon={ArrowLeftRight} />
          {openSections.has('transaction') && (
            <div className="p-4 pt-0 space-y-3">
              {form.mode === 'vente' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix (€)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                    <input type="number" min={0} value={form.price} onChange={e => update('price', e.target.value)}
                      placeholder="0.00" className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
              )}
              {form.mode === 'echange' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Objet(s) souhaité(s) en échange</label>
                  <textarea value={form.exchange_expected} onChange={e => update('exchange_expected', e.target.value)}
                    rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
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

        {/* ── Section Localisation ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="localisation" title="Localisation & Remise" icon={MapPin} />
          {openSections.has('localisation') && (
            <div className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ville <span className="text-red-500">*</span></label>
                  <input type="text" value={form.city} onChange={e => update('city', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Code postal</label>
                  <input type="text" value={form.postal_code} onChange={e => update('postal_code', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.local_meetup_available} onChange={e => update('local_meetup_available', e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                <Package className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Remise en main propre possible</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.shipping_available} onChange={e => update('shipping_available', e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
                <Truck className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Envoi postal possible</span>
              </label>
            </div>
          )}
        </div>

        {/* ── Section Photos ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader id="photos" title={`Photos (${activePhotos.length}/${MAX_PHOTOS})`} icon={Camera} />
          {openSections.has('photos') && (
            <div className="p-4 pt-0">
              <button onClick={() => fileInputRef.current?.click()}
                disabled={activePhotos.length >= MAX_PHOTOS}
                className={cn('w-full border-2 border-dashed rounded-2xl p-6 text-center mb-4 transition',
                  activePhotos.length >= MAX_PHOTOS ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' : 'border-blue-300 bg-blue-50 hover:border-blue-400 cursor-pointer'
                )}>
                <Camera className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-700">Ajouter des photos</p>
                <p className="text-xs text-gray-400 mt-0.5">{activePhotos.length}/{MAX_PHOTOS}</p>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

              {form.photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {form.photos.map((photo, i) => (
                    !photo.toDelete && (
                      <div key={i} className={cn('relative group aspect-square rounded-xl overflow-hidden border-2',
                        photo.is_cover ? 'border-amber-400' : 'border-gray-200',
                        photo.error ? 'border-red-400' : ''
                      )}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          {!photo.is_cover && (
                            <button onClick={() => setCover(i)} className="p-1.5 bg-amber-400 rounded-full text-white"><Star className="w-3 h-3" /></button>
                          )}
                          <button onClick={() => removePhoto(i)} className="p-1.5 bg-red-500 rounded-full text-white"><X className="w-3 h-3" /></button>
                        </div>
                        {photo.is_cover && (
                          <span className="absolute top-1 left-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">⭐ Couv.</span>
                        )}
                        {photo.uploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                    )
                  ))}
                  {activePhotos.length < MAX_PHOTOS && (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-500 transition">
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Zone dangereuse : Suppression ────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="p-4">
            <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Zone dangereuse</h3>
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
                  <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barre d'action fixe */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Link href={`/collectionneurs/${id}`}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition text-sm">
            <ArrowLeft className="w-4 h-4" /> Annuler
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-60">
            {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement…</> : <><Save className="w-5 h-5" /> Enregistrer les modifications</>}
          </button>
        </div>
      </div>
    </div>
  );
}
