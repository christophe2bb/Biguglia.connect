'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { type EventForm, type FormStep, DEFAULT_FORM, STEPS } from '../_config';
import { safeImageExt, uploadFile, isAcceptedImageType } from '@/lib/upload-utils';

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseNewEventFormReturn {
  // Wizard navigation
  step: FormStep;
  stepIndex: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (s: FormStep) => void;
  // Form
  form: EventForm;
  setField: <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;
  // Photos
  photoInputRef: React.RefObject<HTMLInputElement>;
  photos: File[];
  photoPreviews: string[];
  handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: (i: number) => void;
  // Submit
  submitting: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Centralises all state and submit logic for the "Nouvel événement" wizard.
 * Accepts a profileId so it stays auth-agnostic (auth guard lives in the page).
 */
export function useNewEventForm(
  profileId: string | undefined,
  profileName: string | null | undefined,
  homeSectorId: string | null | undefined,
): UseNewEventFormReturn {
  const router = useRouter();

  const initialForm: EventForm = homeSectorId
    ? { ...DEFAULT_FORM, sector_id: homeSectorId }
    : DEFAULT_FORM;

  const [form, setForm]               = useState<EventForm>(initialForm);
  const [step, setStep]               = useState<FormStep>('essentiel');
  const [submitting, setSubmitting]   = useState(false);
  const [photos, setPhotos]           = useState<File[]>([]);
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
    const files = Array.from(e.target.files ?? []).filter(f =>
      isAcceptedImageType(f)
    );
    const remaining = 8 - photos.length;
    const toAdd = files.slice(0, remaining);
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

      // ── Payload complet ──────────────────────────────────────────────────
      const basePayload: Record<string, unknown> = {
        author_id:        profileId,
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        category:         form.category,
        event_date:       form.event_date,
        start_time:       form.start_time || '18:00',
        location:         form.location.trim() || 'Biguglia',
        organizer_name:   form.organizer_name.trim() || profileName || null,
        capacity:         !form.is_unlimited && form.capacity ? parseInt(form.capacity) : null,
        is_unlimited:     form.is_unlimited,
        price_type:       form.price_type,
        price_amount:     form.price_type === 'payant' && form.price_amount ? parseFloat(form.price_amount) : null,
        registration_open: form.registration_open,
        status:           'a_venir',
        tags,
      };

      // Optional columns — only included when non-empty to avoid PGRST116
      if (form.subtitle.trim())        basePayload.subtitle        = form.subtitle.trim();
      if (form.event_end_date)         basePayload.event_end_date  = form.event_end_date;
      if (form.end_time)               basePayload.end_time        = form.end_time;
      if (form.location_area.trim())   basePayload.location_area   = form.location_area.trim();
      if (form.location_detail.trim()) basePayload.location_detail = form.location_detail.trim();
      if (form.sector_id)              basePayload.sector_id       = form.sector_id;
      if (form.accessibility.trim())   basePayload.accessibility   = form.accessibility.trim();
      if (form.contact_info.trim())    basePayload.contact_info    = form.contact_info.trim();
      if (form.external_link.trim())   basePayload.external_link   = form.external_link.trim();
      if (form.target_audience.trim()) basePayload.target_audience = form.target_audience.trim();

      let eventId: string | null = null;

      // Attempt 1: full payload (with price_type, price_amount, capacity, start_time)
      const { data: newEvent, error: evErr } = await supabase
        .from('events').insert(basePayload).select('id').single();

      if (!evErr && newEvent?.id) {
        eventId = newEvent.id;
      } else {
        const isPriceColMissing = (evErr as { message?: string } | null)?.message?.includes('price_amount')
          || (evErr as { message?: string } | null)?.message?.includes('price_type');

        // Attempt 2: without price_amount/price_type (schema without those columns)
        const minPayload: Record<string, unknown> = {
          author_id: profileId, title: form.title.trim(),
          description: form.description.trim() || null, category: form.category,
          event_date: form.event_date, start_time: form.start_time || '18:00',
          location: form.location.trim() || 'Biguglia',
          organizer_name: form.organizer_name.trim() || null,
          capacity: !form.is_unlimited && form.capacity ? parseInt(form.capacity) : null,
          is_unlimited: form.is_unlimited,
          registration_open: form.registration_open, status: 'a_venir', tags,
          is_free: form.price_type === 'gratuit',
        };
        // Only add price columns if the first error was NOT about missing columns
        if (!isPriceColMissing) {
          minPayload.price_type   = form.price_type;
          minPayload.price_amount = form.price_type === 'payant' && form.price_amount ? parseFloat(form.price_amount) : null;
        }
        if (form.sector_id) minPayload.sector_id = form.sector_id;

        const { data: minEvent, error: minErr } = await supabase
          .from('events').insert(minPayload).select('id').single();

        if (!minErr && minEvent?.id) {
          eventId = minEvent.id;
        } else {
          // Attempt 3: truly minimal — only core columns guaranteed to exist
          const corePayload = {
            author_id: profileId,
            title: form.title.trim(),
            description: form.description.trim() || null,
            category: form.category,
            event_date: form.event_date,
            location: form.location.trim() || 'Biguglia',
            organizer_name: form.organizer_name.trim() || null,
            is_free: form.price_type === 'gratuit',
            status: 'a_venir',
            tags,
          };
          const { data: coreEvent, error: coreErr } = await supabase
            .from('events').insert(corePayload).select('id').single();
          if (coreErr) {
            console.error('[Event création] Erreur Supabase :', coreErr);
            toast.error(`Erreur : ${coreErr.message || "Impossible de créer l'événement"}`);
            return;
          }
          eventId = coreEvent?.id ?? null;
        }
      }

      if (!eventId) throw new Error("Pas d'ID événement retourné");

      // Upload photos
      if (photos.length > 0) {
        toast.loading(`Upload ${photos.length} photo(s)...`, { id: 'photo-upload' });
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const ext = safeImageExt(file.name);
          const path = `events/${eventId}/${Date.now()}_${i}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
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

      toast.success('Événement publié !');
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
