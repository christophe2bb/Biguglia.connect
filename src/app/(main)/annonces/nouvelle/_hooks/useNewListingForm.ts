'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { useModeration } from '@/hooks/useModeration';
import { type ModerationStatus } from '@/lib/moderation';
import { ListingCategory } from '@/types';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';
import toast from 'react-hot-toast';
import { TOTAL_STEPS } from '../_config';

// ── Form shape ────────────────────────────────────────────────────────────────

export interface NewListingForm {
  listing_type: string;
  category_id: string;
  title: string;
  description: string;
  price: string;
  is_negotiable: boolean;
  is_urgent: boolean;
  condition: string;
  condition_state: string;
  exchange_preferences: string;
  pickup_notes: string;
  availability_window: string;
  location: string;
  sector_id: string;
  // Engagement checkboxes
  check_sincere: boolean;
  check_legal: boolean;
  check_available: boolean;
}

const DEFAULT_FORM: NewListingForm = {
  listing_type: 'sale',
  category_id: '',
  title: '',
  description: '',
  price: '',
  is_negotiable: false,
  is_urgent: false,
  condition: '',
  condition_state: '',
  exchange_preferences: '',
  pickup_notes: '',
  availability_window: '',
  location: 'Biguglia',
  sector_id: '',
  check_sincere: false,
  check_legal: false,
  check_available: false,
};

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseNewListingFormReturn {
  // Wizard navigation
  step: number;
  goNext: () => void;
  goBack: () => void;
  // Form data
  form: NewListingForm;
  setField: <K extends keyof NewListingForm>(key: K, value: NewListingForm[K]) => void;
  // Photos
  fileInputRef: React.RefObject<HTMLInputElement>;
  photos: File[];
  previews: string[];
  addPhotos: (files: File[]) => void;
  removePhoto: (index: number) => void;
  // Async state
  loading: boolean;
  // Data
  categories: ListingCategory[];
  // Success state
  publishedId: string | null;
  moderationStatus: ModerationStatus | null;
  // Actions
  handleSubmit: (asDraft?: boolean) => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Centralises all state and business logic for the multi-step
 * "Nouvelle annonce" form. The page component is a pure render consumer.
 */
export function useNewListingForm(): UseNewListingFormReturn {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const { submitForModeration } = useModeration();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]                   = useState(1);
  const [form, setForm]                   = useState<NewListingForm>(DEFAULT_FORM);
  const [photos, setPhotos]               = useState<File[]>([]);
  const [previews, setPreviews]           = useState<string[]>([]);
  const [loading, setLoading]             = useState(false);
  const [categories, setCategories]       = useState<ListingCategory[]>([]);
  const [publishedId, setPublishedId]     = useState<string | null>(null);
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);

  // ── Auth guard + initial data ─────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.push('/connexion?redirect=/annonces/nouvelle');
      return;
    }
    if (profile.home_sector_id) {
      setForm(f => ({ ...f, sector_id: profile.home_sector_id ?? '' }));
    }
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('listing_categories')
        .select('*')
        .order('display_order');
      setCategories(data || []);
    };
    fetchCategories();
  }, [profile, authLoading, router]);

  // ── Generic field setter ──────────────────────────────────────────────────

  const setField = useCallback(<K extends keyof NewListingForm>(
    key: K,
    value: NewListingForm[K],
  ) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  // ── Photo helpers ─────────────────────────────────────────────────────────

  const addPhotos = useCallback((files: File[]) => {
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos(p => [...p, ...toAdd]);
    const newPreviews = toAdd.map(f => URL.createObjectURL(f));
    setPreviews(p => [...p, ...newPreviews]);
  }, [photos.length]);

  const removePhoto = useCallback((i: number) => {
    URL.revokeObjectURL(previews[i]);
    setPhotos(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  }, [previews]);

  // ── Step validation ───────────────────────────────────────────────────────

  const validateStep = useCallback((currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!form.listing_type) {
        toast.error("Choisissez un type d'annonce"); return false;
      }
      if (!form.category_id) {
        toast.error('Choisissez une catégorie'); return false;
      }
      if (!form.title.trim() || form.title.length < 5) {
        toast.error('Titre trop court (min 5 caractères)'); return false;
      }
      if (!form.description.trim() || form.description.length < 20) {
        toast.error('Description trop courte (min 20 caractères)'); return false;
      }
    }
    if (currentStep === 2) {
      if (!form.sector_id) {
        toast.error('Indiquez le secteur de Biguglia'); return false;
      }
    }
    if (currentStep === 3) {
      if (!form.check_sincere || !form.check_legal || !form.check_available) {
        toast.error("Veuillez cocher toutes les cases d'engagement"); return false;
      }
    }
    return true;
  }, [form]);

  // ── Wizard navigation ─────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (validateStep(step) && step < TOTAL_STEPS) setStep(s => s + 1);
  }, [step, validateStep]);

  const goBack = useCallback(() => {
    if (step > 1) setStep(s => s - 1);
  }, [step]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (asDraft = false) => {
    if (!profile) return;
    if (!asDraft && (!form.check_sincere || !form.check_legal || !form.check_available)) {
      toast.error("Veuillez cocher toutes les cases d'engagement");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload: Record<string, unknown> = {
      user_id:           profile.id,
      category_id:       form.category_id,
      title:             form.title.trim(),
      description:       form.description.trim(),
      listing_type:      form.listing_type,
      price:             form.price ? parseFloat(form.price) : null,
      is_negotiable:     form.is_negotiable,
      is_urgent:         form.is_urgent,
      condition:         form.condition || null,
      location:          form.location || 'Biguglia',
      sector_id:         form.sector_id || null,
      status:            asDraft ? 'draft' : 'active',
      moderation_status: asDraft ? 'draft' : 'en_attente_validation',
    };

    // ── Colonnes optionnelles (migration 20260413_listings_optional_columns.sql) ──
    if (form.condition_state)      payload.condition_state      = form.condition_state;
    if (form.exchange_preferences) payload.exchange_preferences = form.exchange_preferences.trim();
    if (form.pickup_notes)         payload.pickup_notes         = form.pickup_notes.trim();
    if (form.availability_window)  payload.availability_window  = form.availability_window.trim();

    const { data: listing, error } = await supabase
      .from('listings')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Publication error:', error);
      toast.error(`Erreur : ${error.message}`);
      setLoading(false);
      return;
    }

    // ── Upload photos inline (stable: uses `photos` captured at call time) ──
    const photoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = safeImageExt(photo.name);
      const fileName = `listings/${listing.id}/${Date.now()}_${i}.${ext}`;
      try {
        const publicUrl = await uploadFile(photo, 'photos', fileName);
        photoUrls.push(publicUrl);
        await supabase.from('listing_photos').insert({
          listing_id: listing.id,
          url: publicUrl,
          display_order: i,
        });
      } catch (err) {
        toast.error(`Photo ${i + 1} : ${err instanceof Error ? err.message : 'Erreur upload'}`);
      }
    }

    if (asDraft) {
      toast.success('Brouillon enregistré !');
      router.push(`/annonces/${listing.id}`);
      return;
    }

    // Soumission à la file de modération (non-bloquante : l'annonce est déjà créée)
    let modStatus: ModerationStatus = 'en_attente_validation';
    try {
      const modResult = await submitForModeration({
        contentType:    'listing',
        contentId:      listing.id,
        contentTitle:   form.title.trim(),
        contentExcerpt: form.description.trim(),
        contentPhotos:  photoUrls,
        validationData: {
          title:       form.title.trim(),
          description: form.description.trim(),
          category:    form.category_id,
          price:       form.listing_type === 'sale' ? form.price : '0',
        },
        sourceTable:  'listings',
        authorColumn: 'user_id',
      });
      modStatus = modResult?.status || 'en_attente_validation';
    } catch {
      // file de modération indisponible — l'annonce reste visible en attente
      console.warn('Moderation queue unavailable, listing created anyway');
    }

    toast.success('Annonce soumise — vérification sous 24h');
    setModerationStatus(modStatus);
    setPublishedId(listing.id);
    setLoading(false);
  }, [profile, form, photos, submitForModeration, router]);

  return {
    step, goNext, goBack,
    form, setField,
    fileInputRef, photos, previews, addPhotos, removePhoto,
    loading,
    categories,
    publishedId, moderationStatus,
    handleSubmit,
  };
}
