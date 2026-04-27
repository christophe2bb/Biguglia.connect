'use client';

/**
 * useCollectionneurForm — hook central du wizard création d'annonce collectionneur.
 *
 * Responsabilités :
 *   - Form state + updater générique
 *   - Chargement des catégories Supabase (avec fallback)
 *   - Pré-remplissage secteur depuis le profil utilisateur
 *   - Validation par étape (canProceed)
 *   - Upload / suppression / changement de couverture des photos
 *   - Construction du payload Supabase (buildPayload)
 *   - Soumission (handleSubmit)
 *   - Navigation wizard (goNext / goPrev)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

import { EMPTY_FORM, MAX_PHOTOS, MAX_FILE_MB, FALLBACK_CATEGORIES } from './_config';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';
import type {
  CollectionneurFormData,
  CollectionCategory,
  PhotoItem,
  ValidationResult,
  UseCollectionneurFormReturn,
} from './_types';

// ─── Payload builder ──────────────────────────────────────────────────────────
function buildPayload(form: CollectionneurFormData, authorId: string) {
  return {
    author_id:             authorId,
    mode:                  form.mode,
    item_type:             form.mode === 'echange' ? 'troc' : form.mode, // backward compat
    status:                'actif',
    moderation_status:     'publie',
    category_id:           form.category_id || null,
    subcategory:           form.subcategory  || null,
    title:                 form.title.trim(),
    description:           form.description.trim(),
    condition:             form.condition,
    rarity_level:          form.rarity_level,
    year_period:           form.year_period   || null,
    brand:                 form.brand         || null,
    series_name:           form.series_name   || null,
    authenticity_declared: form.authenticity_declared,
    provenance:            form.provenance    || null,
    defects_noted:         form.defects_noted || null,
    dimensions:            form.dimensions    || null,
    material:              form.material      || null,
    price:                 form.mode === 'vente' && form.price ? Number(form.price) : null,
    exchange_expected:     form.mode === 'echange' ? form.exchange_expected || null : null,
    shipping_available:    form.shipping_available,
    local_meetup_available:form.local_meetup_available,
    city:                  form.city.trim()        || null,
    postal_code:           form.postal_code.trim() || null,
    sector_id:             form.sector_id          || null,
    tags:                  form.tags,
    views_count:           0,
    favorites_count:       0,
    messages_count:        0,
    published_at:          new Date().toISOString(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCollectionneurForm(): UseCollectionneurFormReturn {
  const router   = useRouter();
  const supabase = createClient();
  const { profile } = useAuthStore();

  const [step,       setStep]       = useState(1);
  const [form,       setForm]       = useState<CollectionneurFormData>({ ...EMPTY_FORM });
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [tagInput,   setTagInput]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [createdId,  setCreatedId]  = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Effets d'initialisation ─────────────────────────────────────────────
  // Pré-remplir secteur depuis le profil
  useEffect(() => {
    if (profile?.home_sector_id) {
      setForm(prev => ({ ...prev, sector_id: profile.home_sector_id ?? '' }));
    }
  }, [profile?.home_sector_id]);

  // Charger les catégories (avec fallback si table vide)
  useEffect(() => {
    supabase
      .from('collection_categories')
      .select('*')
      .order('display_order')
      .then(({ data }) => {
        setCategories(data?.length ? (data as CollectionCategory[]) : FALLBACK_CATEGORIES);
      });
  }, [supabase]);

  // Rediriger si non connecté
  useEffect(() => {
    if (profile === null) {
      router.push('/connexion?redirect=/collectionneurs/nouveau');
    }
  }, [profile, router]);

  // ─── Mise à jour générique ───────────────────────────────────────────────
  const update = useCallback(<K extends keyof CollectionneurFormData>(
    key: K,
    value: CollectionneurFormData[K],
  ) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // ─── Validation par étape ────────────────────────────────────────────────
  const canProceed = useCallback((): ValidationResult => {
    if (step === 1) return { ok: !!form.mode };
    if (step === 2) {
      return form.category_id
        ? { ok: true }
        : { ok: false, msg: 'Choisissez une catégorie.' };
    }
    if (step === 3) {
      if (!form.title.trim() || form.title.length < 5)
        return { ok: false, msg: 'Titre trop court (5 car. min).' };
      if (!form.description.trim() || form.description.length < 20)
        return { ok: false, msg: 'Description trop courte (20 car. min).' };
      if (form.mode === 'vente' && form.price && isNaN(Number(form.price)))
        return { ok: false, msg: 'Prix invalide.' };
      if (!form.city.trim())
        return { ok: false, msg: 'Indiquez votre ville.' };
      return { ok: true };
    }
    if (step === 4) {
      if (form.photos.length === 0)
        return { ok: false, msg: 'Ajoutez au moins 1 photo.' };
      if (form.photos.some(p => p.uploading))
        return { ok: false, msg: "Photos en cours d'envoi…" };
      if (form.photos.some(p => p.error))
        return { ok: false, msg: 'Certaines photos ont échoué.' };
      return { ok: true };
    }
    return { ok: true };
  }, [step, form]);

  // ─── Upload d'une photo ──────────────────────────────────────────────────
  const uploadPhoto = useCallback(async (file: File, idx: number): Promise<string | null> => {
    if (!profile?.id) return null;
    const ext = safeImageExt(file.name);
    const path = `collection/${profile.id}/${Date.now()}_${idx}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
    try {
      return await uploadFile(file, 'photos', path, profile.id);
    } catch {
      return null;
    }
  }, [profile?.id]);

  // ─── Gestion des fichiers sélectionnés ──────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - form.photos.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_PHOTOS} photos.`); return; }

    const accepted = Array.from(files).slice(0, remaining).filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} : format non supporté.`); return false; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`${f.name} trop lourd (max ${MAX_FILE_MB} Mo).`); return false; }
      return true;
    });
    if (!accepted.length) return;

    // Ajouter des aperçus locaux en état "uploading"
    const previews: PhotoItem[] = accepted.map((file, i) => ({
      file,
      preview:    URL.createObjectURL(file),
      is_cover:   form.photos.length === 0 && i === 0,
      sort_order: form.photos.length + i,
      uploading:  true,
    }));
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...previews] }));

    // Upload en parallèle
    const startIdx = form.photos.length;
    const uploaded = await Promise.all(accepted.map((file, i) => uploadPhoto(file, startIdx + i)));

    // Mettre à jour les photos avec l'URL ou l'erreur
    setForm(prev => {
      const newPhotos = [...prev.photos];
      for (let i = 0; i < accepted.length; i++) {
        const pIdx = startIdx + i;
        if (pIdx >= 0 && pIdx < newPhotos.length) {
          newPhotos[pIdx] = uploaded[i]
            ? { ...newPhotos[pIdx], url: uploaded[i]!, uploading: false }
            : { ...newPhotos[pIdx], uploading: false, error: 'Échec' };
        }
      }
      return { ...prev, photos: newPhotos };
    });
  }, [form.photos, uploadPhoto]);

  // ─── Supprimer une photo ─────────────────────────────────────────────────
  const removePhoto = useCallback((idx: number) => {
    setForm(prev => {
      const newPhotos = prev.photos
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, sort_order: i }));
      // Garantir qu'une photo est toujours marquée couverture
      if (newPhotos.length > 0 && !newPhotos.some(p => p.is_cover)) {
        newPhotos[0] = { ...newPhotos[0], is_cover: true };
      }
      return { ...prev, photos: newPhotos };
    });
  }, []);

  // ─── Changer la photo de couverture ─────────────────────────────────────
  const setCover = useCallback((idx: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.map((p, i) => ({ ...p, is_cover: i === idx })),
    }));
  }, []);

  // ─── Soumission ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!profile?.id) { toast.error('Connectez-vous pour publier.'); return; }
    const v = canProceed();
    if (!v.ok) { toast.error(v.msg || 'Vérifiez le formulaire.'); return; }

    setSubmitting(true);
    try {
      const payload = buildPayload(form, profile.id);
      const { data, error } = await supabase
        .from('collection_items')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;

      const itemId = data.id;

      // Insérer les photos uploadées avec succès
      const coverSet  = form.photos.some(p => p.is_cover);
      const photoRows = form.photos
        .filter(p => p.url && !p.error)
        .map((p, i) => ({
          item_id:    itemId,
          url:        p.url!,
          image_url:  p.url!,
          is_cover:   coverSet ? p.is_cover : i === 0,
          sort_order: p.sort_order,
          alt_text:   `${form.title} - photo ${i + 1}`,
        }));

      if (photoRows.length > 0) {
        await supabase.from('collection_item_photos').insert(photoRows);
      }

      setCreatedId(itemId);
      setSubmitted(true);
      toast.success('Annonce publiée avec succès ! 🎉');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la publication : ' + msg);
    } finally {
      setSubmitting(false);
    }
  }, [profile?.id, form, supabase, canProceed]);

  // ─── Navigation wizard ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const v = canProceed();
    if (!v.ok) { toast.error(v.msg || 'Complétez cette étape.'); return; }
    if (step === 5) { handleSubmit(); return; }
    setStep(s => Math.min(s + 1, 5));
  }, [step, canProceed, handleSubmit]);

  const goPrev = useCallback(() => setStep(s => Math.max(s - 1, 1)), []);

  // ─── Reset ───────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setSubmitted(false);
    setCreatedId(null);
    setForm({ ...EMPTY_FORM });
    setStep(1);
  }, []);

  return {
    step, form, categories, tagInput, submitting, submitted, createdId,
    setStep, setTagInput, update,
    canProceed, goNext, goPrev,
    fileInputRef, handleFiles, removePhoto, setCover,
    handleSubmit, resetForm,
  };
}
