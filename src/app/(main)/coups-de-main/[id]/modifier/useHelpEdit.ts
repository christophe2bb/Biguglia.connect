'use client';

/**
 * useHelpEdit — Hook pour la page de modification d'une annonce coups-de-main.
 * Gère :
 *  - pré-remplissage du formulaire depuis l'item existant
 *  - ajout / suppression de photos (existantes + nouvelles)
 *  - soumission : UPDATE help_requests + gestion photos en base
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';
import type { HelpRequest, HelpFormValues } from '../../_types';

const MAX_PHOTOS = 5;

export function useHelpEdit(item: HelpRequest) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ── État du formulaire ────────────────────────────────────────────────────
  // Cast nécessaire : le type HelpRequest de [id]/_types a visibility/contact_mode/display_name
  // en `string` alors que HelpFormValues attend les types stricts. Le cast est sûr car
  // les valeurs viennent de Supabase qui respecte les contraintes.
  const itemTyped = item as unknown as import('../../_types').HelpRequest;

  const initForm = (): HelpFormValues => ({
    help_type:           itemTyped.help_type,
    title:               itemTyped.title,
    category:            itemTyped.category,
    description:         itemTyped.description,
    urgency:             itemTyped.urgency,
    help_date:           itemTyped.help_date ?? '',
    help_time:           itemTyped.help_time ?? '',
    sector_id:           itemTyped.sector_id ?? '',
    location_area:       itemTyped.location_area,
    location_city:       itemTyped.location_city,
    location_detail:     itemTyped.location_detail ?? '',
    duration:            itemTyped.duration,
    persons_needed:      itemTyped.persons_needed,
    compensation:        itemTyped.compensation,
    compensation_detail: itemTyped.compensation_detail ?? '',
    equipment:           itemTyped.equipment ?? [],
    for_who:             itemTyped.for_who ?? 'Tout le monde',
    conditions:          itemTyped.conditions ?? [],
    visibility:          itemTyped.visibility,
    contact_mode:        itemTyped.contact_mode,
    display_name:        itemTyped.display_name,
    check1: true, check2: true, check3: true, check4: true, check5: true,
  });

  const [form, setForm] = useState<HelpFormValues>(initForm);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // ── Gestion photos ────────────────────────────────────────────────────────
  // Photos déjà en base (URLs) — celles qu'on garde
  const initSorted = [...(itemTyped.photos ?? [])].sort((a, b) => a.display_order - b.display_order);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>(
    initSorted.map(p => p.url),
  );
  // Nouveaux fichiers sélectionnés
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  // Previews = URLs existantes + data-URL des nouveaux fichiers
  const [previews, setPreviews] = useState<string[]>(initSorted.map(p => p.url));

  const totalPhotoCount = existingPhotoUrls.length + newPhotos.length;

  const handlePhotoSelect = useCallback((files: File[], reset?: () => void) => {
    if (totalPhotoCount + files.length > MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }
    setNewPhotos(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    reset?.();
  }, [totalPhotoCount]);

  const removePhoto = useCallback((index: number) => {
    const existingCount = existingPhotoUrls.length;
    if (index < existingCount) {
      // Suppression d'une photo existante (URL en base)
      const newExisting = existingPhotoUrls.filter((_, i) => i !== index);
      setExistingPhotoUrls(newExisting);
      setPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Suppression d'un nouveau fichier
      const newIdx = index - existingCount;
      const newFilesList = newPhotos.filter((_, i) => i !== newIdx);
      setNewPhotos(newFilesList);
      setPreviews([
        ...existingPhotoUrls,
        ...previews.slice(existingCount).filter((_, i) => i !== newIdx),
      ]);
    }
  }, [existingPhotoUrls, newPhotos, previews]);

  const toggleArr = useCallback((key: 'equipment' | 'conditions', val: string) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(v => v !== val) : [...f[key], val],
    }));
  }, []);

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (profileId: string, isDraft = false) => {
    if (!form.title.trim()) { toast.error('Titre obligatoire'); return; }
    if (!form.description.trim()) { toast.error('Description obligatoire'); return; }
    if (!isDraft && (!form.check1 || !form.check2 || !form.check3 || !form.check4 || !form.check5)) {
      toast.error('Cochez toutes les cases de validation');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Modification en cours…');

    const payload = {
      help_type:           form.help_type,
      status:              isDraft ? 'draft' : (itemTyped.status === 'draft' ? 'active' : itemTyped.status),
      title:               form.title.trim(),
      category:            form.category,
      description:         form.description.trim(),
      urgency:             form.urgency,
      help_date:           form.help_date || null,
      help_time:           form.help_time || null,
      sector_id:           form.sector_id || null,
      location_area:       form.location_area,
      location_city:       form.location_city,
      location_detail:     form.location_detail || null,
      duration:            form.duration,
      persons_needed:      form.persons_needed,
      compensation:        form.compensation,
      compensation_detail: form.compensation_detail || null,
      equipment:           form.equipment,
      for_who:             form.for_who,
      conditions:          form.conditions,
      visibility:          form.visibility,
      contact_mode:        form.contact_mode,
      display_name:        form.display_name,
      updated_at:          new Date().toISOString(),
    };

    // 1. Mettre à jour les champs texte
    const { error: updateError } = await supabase
      .from('help_requests')
      .update(payload)
      .eq('id', itemTyped.id)
      .eq('author_id', profileId);

    if (updateError) {
      toast.dismiss(loadingToast);
      toast.error('Erreur modification : ' + updateError.message);
      setSubmitting(false);
      return;
    }

    // 2. Gestion des photos
    // a) Récupérer les photos actuelles en base
    const { data: currentPhotos } = await supabase
      .from('help_photos')
      .select('id, url')
      .eq('help_id', itemTyped.id);

    if (currentPhotos && currentPhotos.length > 0) {
      // b) Supprimer celles qui ont été retirées par l'utilisateur
      const toDelete = currentPhotos.filter(p => !existingPhotoUrls.includes(p.url));
      if (toDelete.length > 0) {
        await supabase
          .from('help_photos')
          .delete()
          .in('id', toDelete.map(p => p.id));
      }
      // c) Renuméroter les photos conservées
      for (let i = 0; i < existingPhotoUrls.length; i++) {
        const match = currentPhotos.find(p => p.url === existingPhotoUrls[i]);
        if (match) {
          await supabase
            .from('help_photos')
            .update({ display_order: i })
            .eq('id', match.id);
        }
      }
    }

    // d) Uploader les nouvelles photos
    const startOrder = existingPhotoUrls.length;
    for (let i = 0; i < newPhotos.length; i++) {
      const file = newPhotos[i];
      const ext  = safeImageExt(file.name);
      const path = `coups-de-main/${itemTyped.id}/${Date.now()}_${i}.${ext}`;
      try {
        const publicUrl = await uploadFile(file, 'photos', path, profileId);
        await supabase.from('help_photos').insert({
          help_id: itemTyped.id,
          url: publicUrl,
          display_order: startOrder + i,
        });
      } catch (err) {
        toast.error(`Photo ${i + 1} non sauvegardée : ${err instanceof Error ? err.message : ''}`);
      }
    }

    toast.dismiss(loadingToast);
    toast.success('✅ Annonce modifiée !', { duration: 3000 });
    setSubmitting(false);

    // Rediriger vers la page détail
    router.push(`/coups-de-main/${itemTyped.id}`);
    router.refresh();
  }, [form, itemTyped, existingPhotoUrls, newPhotos, supabase, router]);

  return {
    form, setForm,
    step, setStep,
    submitting,
    existingPhotoUrls,
    newPhotos,
    previews,
    totalPhotoCount,
    handlePhotoSelect,
    removePhoto,
    toggleArr,
    handleSubmit,
  };
}
