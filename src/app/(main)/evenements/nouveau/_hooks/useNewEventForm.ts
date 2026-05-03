'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { type EventForm, type FormStep, DEFAULT_FORM, STEPS } from '../_config';
import { safeImageExt, uploadFile, isAcceptedImageType } from '@/lib/upload-utils';

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseNewEventFormReturn {
  step: FormStep;
  stepIndex: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (s: FormStep) => void;
  form: EventForm;
  setField: <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;
  photoInputRef: React.RefObject<HTMLInputElement>;
  photos: File[];
  photoPreviews: string[];
  handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: (i: number) => void;
  submitting: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNewEventForm(
  profileId: string | undefined,
  profileName: string | null | undefined,
  homeSectorId: string | null | undefined,
): UseNewEventFormReturn {
  const router = useRouter();

  const initialForm: EventForm = homeSectorId
    ? { ...DEFAULT_FORM, sector_id: homeSectorId }
    : DEFAULT_FORM;

  const [form, setForm]             = useState<EventForm>(initialForm);
  const [step, setStep]             = useState<FormStep>('essentiel');
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos]         = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Generic field setter ──────────────────────────────────────────────────

  const setField = useCallback(<K extends keyof EventForm>(key: K, value: EventForm[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  // ── Wizard navigation ─────────────────────────────────────────────────────

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const goNext = useCallback(() => {
    setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].id);
  }, [stepIndex]);

  const goBack = useCallback(() => {
    setStep(STEPS[Math.max(0, stepIndex - 1)].id);
  }, [stepIndex]);

  const goToStep = useCallback((s: FormStep) => setStep(s), []);

  // ── Photo handlers ────────────────────────────────────────────────────────

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => isAcceptedImageType(f));
    const toAdd = files.slice(0, 8 - photos.length);
    setPhotos(p => [...p, ...toAdd]);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreviews(p => [...p, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  }, [photos.length]);

  const removePhoto = useCallback((i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPhotoPreviews(p => p.filter((_, idx) => idx !== i));
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) { toast.error('Connectez-vous pour créer un événement'); return; }
    if (!form.title.trim()) { toast.error('Le titre est requis'); return; }
    if (!form.event_date)   { toast.error('La date est requise');  return; }

    setSubmitting(true);
    const supabase = createClient();

    try {
      const tags = form.tags.trim()
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      // Payload unique — toutes les colonnes existent dans le schéma
      const payload: Record<string, unknown> = {
        author_id:         profileId,
        title:             form.title.trim(),
        description:       form.description.trim() || null,
        category:          form.category,
        event_date:        form.event_date,
        start_time:        form.start_time || '18:00',
        location:          form.location.trim() || 'Biguglia',
        organizer_name:    form.organizer_name.trim() || profileName || null,
        capacity:          !form.is_unlimited && form.capacity ? parseInt(form.capacity) : null,
        is_unlimited:      form.is_unlimited,
        is_free:           form.price_type === 'gratuit',
        price_type:        form.price_type,
        price_amount:      form.price_type === 'payant' && form.price_amount
                             ? parseFloat(form.price_amount) : null,
        registration_open: form.registration_open,
        status:            'a_venir',
        tags,
      };

      // Colonnes optionnelles — ajoutées seulement si remplies
      if (form.subtitle.trim())        payload.subtitle        = form.subtitle.trim();
      if (form.event_end_date)         payload.event_end_date  = form.event_end_date;
      if (form.end_time)               payload.end_time        = form.end_time;
      if (form.location_area.trim())   payload.location_area   = form.location_area.trim();
      if (form.location_detail.trim()) payload.location_detail = form.location_detail.trim();
      if (form.sector_id)              payload.sector_id       = form.sector_id;
      if (form.accessibility.trim())   payload.accessibility   = form.accessibility.trim();
      if (form.contact_info.trim())    payload.contact_info    = form.contact_info.trim();
      if (form.external_link.trim())   payload.external_link   = form.external_link.trim();
      if (form.target_audience.trim()) payload.target_audience = form.target_audience.trim();

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        console.error('[Event création] Erreur Supabase :', error);
        toast.error(`Erreur : ${error.message || "Impossible de créer l'événement"}`);
        return;
      }

      const eventId = newEvent?.id;
      if (!eventId) throw new Error("Pas d'ID événement retourné");

      // Upload photos
      if (photos.length > 0) {
        toast.loading(`Upload ${photos.length} photo(s)...`, { id: 'photo-upload' });
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const ext  = safeImageExt(file.name);
          const path = `events/${eventId}/${Date.now()}_${i}.${ext}`; // nosec CWE-22
          try {
            const publicUrl = await uploadFile(file, 'photos', path, profileId);
            await supabase.from('event_photos').insert({
              event_id: eventId, url: publicUrl, display_order: i, is_cover: i === 0,
            });
          } catch (err) {
            console.error('Photo upload error:', err);
            toast.error(`Photo ${i + 1} refusée : ${err instanceof Error ? err.message : 'type invalide'}`);
          }
        }
        toast.dismiss('photo-upload');
      }

      toast.success('🎉 Événement publié !');
      router.push(`/evenements/${eventId}`);

    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  }, [profileId, profileName, form, photos, router]);

  return {
    step, stepIndex, goNext, goBack, goToStep,
    form, setField,
    photoInputRef, photos, photoPreviews, handlePhotoSelect, removePhoto,
    submitting, handleSubmit,
  };
}
