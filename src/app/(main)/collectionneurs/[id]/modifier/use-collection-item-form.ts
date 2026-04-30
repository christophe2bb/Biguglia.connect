'use client';

/**
 * src/app/(main)/collectionneurs/[id]/modifier/use-collection-item-form.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Hook personnalisé : état du formulaire d'édition d'annonce collectionneur.
 *
 * Responsabilités :
 *   • État du formulaire (tous les champs)
 *   • Chargement initial de l'annonce depuis Supabase
 *   • Upload / suppression / réorganisation des photos
 *   • Sauvegarde (PATCH collection_items + gestion photos)
 *   • Suppression de l'annonce
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import { safeImageExt, uploadFile, isAcceptedImageType } from '@/lib/upload-utils';
import {
  type CollectionMode, type CollectionStatus, type RarityLevel, type ConditionLevel,
  type CollectionItem, type CollectionCategory,
} from '@/lib/collectionneurs-config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotoItem {
  id?: string;
  file?: File;
  preview: string;
  url?: string;
  is_cover: boolean;
  sort_order: number;
  uploading?: boolean;
  error?: string;
  toDelete?: boolean;
}

export type CollectionFormState = {
  mode: CollectionMode;
  status: CollectionStatus;
  category_id: string;
  subcategory: string;
  title: string;
  description: string;
  condition: ConditionLevel;
  rarity_level: RarityLevel;
  year_period: string;
  brand: string;
  series_name: string;
  authenticity_declared: boolean;
  provenance: string;
  defects_noted: string;
  dimensions: string;
  material: string;
  price: string;
  exchange_expected: string;
  shipping_available: boolean;
  local_meetup_available: boolean;
  city: string;
  postal_code: string;
  tags: string[];
  photos: PhotoItem[];
};

export const SECTION_IDS = ['mode', 'infos', 'details', 'transaction', 'localisation', 'photos', 'statut'] as const;
export type SectionId = typeof SECTION_IDS[number];

export const MAX_PHOTOS  = 12;
export const MAX_FILE_MB = 5; // aligné sur MAX_SIZE_BY_BUCKET['photos'] côté serveur

// ─── Valeur initiale du formulaire ────────────────────────────────────────────
const INITIAL_FORM: CollectionFormState = {
  mode: 'vente',
  status: 'actif',
  category_id: '',
  subcategory: '',
  title: '',
  description: '',
  condition: 'bon',
  rarity_level: 'commun',
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
  tags: [],
  photos: [],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCollectionItemForm(id: string) {
  const router   = useRouter();
  const supabase = createClient();
  const { profile } = useAuthStore();

  // ── Status ─────────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [notFound,      setNotFound]      = useState(false);
  const [forbidden,     setForbidden]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // ── Données ────────────────────────────────────────────────────────────────
  const [item,          setItem]          = useState<CollectionItem | null>(null);
  const [categories,    setCategories]    = useState<CollectionCategory[]>([]);
  const [form,          setForm]          = useState<CollectionFormState>(INITIAL_FORM);
  const [openSections,  setOpenSections]  = useState<Set<SectionId>>(
    new Set<SectionId>(['mode', 'infos', 'details', 'transaction', 'localisation', 'photos']),
  );
  const [tagInput, setTagInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers formulaire ────────────────────────────────────────────────────
  const update = useCallback(<K extends keyof CollectionFormState>(key: K, value: CollectionFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSection = useCallback((s: SectionId) => {
    setOpenSections(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }, []);

  // ── Chargement des catégories ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    supabase.from('collection_categories').select('*').order('display_order').then(({ data }) => {
      if (data?.length) setCategories(data as CollectionCategory[]);
    });
  }, [id, supabase]);

  // ── Chargement de l'annonce ───────────────────────────────────────────────
  useEffect(() => {
    if (!id || !profile) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('collection_items')
        .select(`
          *,
          category:collection_categories(*),
          photos:collection_item_photos(id, url, is_cover, sort_order)
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
        mode: ((d.mode || (d.item_type === 'troc' ? 'echange' : d.item_type)) as CollectionMode) || 'vente',
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
        photos: ((d.photos as Array<{ id?: string; url?: string; is_cover?: boolean; sort_order?: number }>) || []).map(p => ({
          id: p.id,
          preview: p.url || '',
          url: p.url,
          is_cover: p.is_cover || false,
          sort_order: p.sort_order || 0,
        })),
      });
      setLoading(false);
    })();
  }, [id, profile, supabase]);

  // ── Upload photo ──────────────────────────────────────────────────────────
  const uploadPhoto = useCallback(async (file: File, idx: number): Promise<string | null> => {
    if (!profile?.id) return null;
    const ext  = safeImageExt(file.name);
    const path = `collection/${profile.id}/${Date.now()}_${idx}.${ext}`; // nosec CWE-22
    try {
      return await uploadFile(file, 'photos', path, profile.id);
    } catch {
      return null;
    }
  }, [profile?.id]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const currentPhotos = form.photos;
    const existing  = currentPhotos.filter(p => !p.toDelete);
    const remaining = MAX_PHOTOS - existing.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_PHOTOS} photos.`); return; }

    const accepted = Array.from(files).slice(0, remaining).filter(f => {
      if (!isAcceptedImageType(f)) { toast.error(`${f.name} : format non supporté (JPEG, PNG, WebP, GIF, AVIF).`); return false; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`${f.name} trop lourd (max ${MAX_FILE_MB} Mo).`); return false; }
      return true;
    });
    if (!accepted.length) return;

    // Capturer startIdx AVANT le setForm (évite la race condition)
    const startIdx = currentPhotos.length;

    const previews: PhotoItem[] = accepted.map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      is_cover: existing.length === 0 && i === 0,
      sort_order: existing.length + i,
      uploading: true,
    }));
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...previews] }));

    const uploaded = await Promise.all(accepted.map((file, i) => uploadPhoto(file, existing.length + i)));

    // On retrouve les previews par index absolu (startIdx + i)
    setForm(prev => {
      const newPhotos = [...prev.photos];
      for (let i = 0; i < accepted.length; i++) {
        const pIdx = startIdx + i;
        if (pIdx >= 0 && pIdx < newPhotos.length) {
          newPhotos[pIdx] = {
            ...newPhotos[pIdx],
            url: uploaded[i] || undefined,
            uploading: false,
            error: uploaded[i] ? undefined : 'Échec upload',
          };
        }
      }
      return { ...prev, photos: newPhotos };
    });
  }, [form.photos, uploadPhoto]);

  const removePhoto = useCallback((idx: number) => {
    setForm(prev => {
      const p = prev.photos[idx];
      if (p.id) {
        const newPhotos = prev.photos.map((ph, i) => i === idx ? { ...ph, toDelete: true } : ph);
        const active    = newPhotos.filter(ph => !ph.toDelete);
        if (active.length > 0 && !active.some(ph => ph.is_cover)) {
          const firstActive = newPhotos.findIndex(ph => !ph.toDelete);
          if (firstActive >= 0) newPhotos[firstActive] = { ...newPhotos[firstActive], is_cover: true };
        }
        return { ...prev, photos: newPhotos };
      }
      const newPhotos = prev.photos.filter((_, i) => i !== idx);
      if (newPhotos.length > 0 && !newPhotos.some(ph => ph.is_cover)) newPhotos[0].is_cover = true;
      return { ...prev, photos: newPhotos };
    });
  }, []);

  const setCover = useCallback((idx: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.map((p, i) => ({ ...p, is_cover: i === idx && !p.toDelete })),
    }));
  }, []);

  // ── Sauvegarde ────────────────────────────────────────────────────────────
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

      const toDelete = form.photos.filter(p => p.id && p.toDelete);
      if (toDelete.length > 0) {
        await supabase.from('collection_item_photos').delete().in('id', toDelete.map(p => p.id!));
      }

      const newPhotos = form.photos.filter(p => !p.id && !p.toDelete && p.url);
      if (newPhotos.length > 0) {
        await supabase.from('collection_item_photos').insert(
          newPhotos.map((p, i) => ({
            item_id: id,
            url: p.url!,
            is_cover: p.is_cover,
            sort_order: p.sort_order,
            alt_text: `${form.title} - photo ${i + 1}`,
          })),
        );
      }

      const existingUpdates = form.photos.filter(p => p.id && !p.toDelete);
      for (const p of existingUpdates) {
        await supabase.from('collection_item_photos')
          .update({ is_cover: p.is_cover, sort_order: p.sort_order })
          .eq('id', p.id!);
      }

      toast.success('Annonce mise à jour !');
      router.push(`/collectionneurs/${id}`);
    } catch (err: unknown) {
      toast.error('Erreur : ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  }, [form, id, supabase, router]);

  // ── Suppression ───────────────────────────────────────────────────────────
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

  return {
    // État UI
    loading, saving, notFound, forbidden, deleting, deleteConfirm, setDeleteConfirm,
    // Données
    item, categories, form, openSections,
    tagInput, setTagInput,
    fileInputRef,
    // Actions
    update, toggleSection,
    handleFiles, removePhoto, setCover,
    handleSave, handleDelete,
  };
}
