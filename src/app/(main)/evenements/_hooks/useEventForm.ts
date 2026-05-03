'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { NewEventForm } from '../_types';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

const EMPTY_FORM: NewEventForm = {
  title: '',
  description: '',
  event_date: '',
  event_time: '18:00',
  location: '',
  category: 'fete_locale',
  organizer_name: '',
  max_participants: '',
  is_free: true,
  price: '',
  sector_id: '',
  tags: '',
  audience: 'Tout public',
  registration_required: false,
};

export function useEventForm(profileId: string | undefined, onSuccess: () => void) {
  const supabase = createClient();

  const [newEvent, setNewEvent]                     = useState<NewEventForm>(EMPTY_FORM);
  const [submittingEvent, setSubmittingEvent]       = useState(false);
  const [eventPhotos, setEventPhotos]               = useState<File[]>([]);
  const [eventPhotoPreviews, setEventPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const toAdd = files.slice(0, 5 - eventPhotos.length);
    setEventPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setEventPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handlePhotoRemove = (idx: number) => {
    setEventPhotos(prev => prev.filter((_, i) => i !== idx));
    setEventPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadEventPhotos = async (eventId: string) => {
    if (eventPhotos.length === 0) return;
    for (let i = 0; i < eventPhotos.length; i++) {
      const file = eventPhotos[i];
      const ext  = safeImageExt(file.name);
      const path = `events/${eventId}/${Date.now()}_${i}.${ext}`; // nosec CWE-22
      try {
        const publicUrl = await uploadFile(file, 'photos', path, profileId);
        await supabase.from('event_photos').insert({
          event_id: eventId, url: publicUrl, display_order: i,
        });
      } catch (err) {
        toast.error(`Photo ${i + 1} : ${err instanceof Error ? err.message : 'Erreur upload'}`);
      }
    }
  };

  const resetForm = useCallback(() => {
    setNewEvent(EMPTY_FORM);
    setEventPhotos([]);
    setEventPhotoPreviews([]);
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    if (!newEvent.title.trim() || !newEvent.event_date) {
      toast.error('Titre et date obligatoires');
      return;
    }
    setSubmittingEvent(true);

    const parsedTags = newEvent.tags
      ? newEvent.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    // Payload unique — toutes les colonnes existent dans le schéma
    const payload: Record<string, unknown> = {
      author_id:            profileId,
      title:                newEvent.title.trim(),
      description:          newEvent.description.trim() || null,
      event_date:           newEvent.event_date,
      start_time:           newEvent.event_time || '18:00',
      location:             newEvent.location.trim() || 'Biguglia',
      category:             newEvent.category,
      organizer_name:       newEvent.organizer_name.trim() || null,
      capacity:             newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
      is_unlimited:         !newEvent.max_participants,
      is_free:              newEvent.is_free,
      price_type:           newEvent.is_free ? 'gratuit' : 'payant',
      price_amount:         !newEvent.is_free && newEvent.price ? parseFloat(newEvent.price) : null,
      registration_open:    true,
      registration_required: newEvent.registration_required,
      tags:                 parsedTags,
      status:               'a_venir',
    };
    if (newEvent.sector_id) payload.sector_id = newEvent.sector_id;

    const { data: inserted, error } = await supabase
      .from('events')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('[useEventForm] Erreur Supabase :', error);
      toast.error(`Erreur : ${error.message}`);
      setSubmittingEvent(false);
      return;
    }

    if (inserted?.id) {
      await uploadEventPhotos(inserted.id);
      toast.success("🎉 Événement publié ! Visible dans l'agenda.", { duration: 4000 });
      resetForm();
      onSuccess();
    }
    setSubmittingEvent(false);
  };

  return {
    newEvent,
    setNewEvent,
    submittingEvent,
    eventPhotos,
    eventPhotoPreviews,
    photoInputRef,
    handlePhotoSelect,
    handlePhotoRemove,
    handleCreateEvent,
    resetForm,
  };
}
