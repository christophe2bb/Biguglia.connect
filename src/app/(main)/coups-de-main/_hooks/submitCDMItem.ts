// ─── submitCDMItem — logique pure de publication/modification ─────────────────
// Extrait de useCDMForm pour garder le hook ≤ 180 lignes.

import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { HelpRequest, HelpFormValues } from '../_types';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

export async function submitCDMItem(
  form: HelpFormValues,
  isDraft: boolean,
  profileId: string,
  editingItem: HelpRequest | null,
  photos: File[],
  fetchItems: () => Promise<void>,
  resetForm: () => void,
  setSubmitting: (v: boolean) => void,
): Promise<void> {
  const supabase = createClient();

  const payload = {
    author_id:           profileId,
    help_type:           form.help_type,
    status:              isDraft ? 'draft' : 'active',
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
  };

  let itemId: string | null = null;

  if (editingItem) {
    const { error } = await supabase.from('help_requests').update(payload).eq('id', editingItem.id);
    if (error) { toast.error('Erreur modification : ' + error.message); setSubmitting(false); return; }
    itemId = editingItem.id;
    toast.success('✅ Annonce modifiée !');
  } else {
    const { data, error } = await supabase.from('help_requests').insert(payload).select('id').single();
    if (error) { toast.error('Erreur publication : ' + error.message); setSubmitting(false); return; }
    itemId = data?.id ?? null;
    toast.success(isDraft ? '💾 Brouillon enregistré' : '🤝 Annonce publiée !', { duration: 4000 });
  }

  // Upload photos
  if (photos.length > 0 && itemId) {
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const ext = safeImageExt(file.name);
      const path = `coups-de-main/${itemId}/${Date.now()}_${i}.${ext}`;
      try {
        const publicUrl = await uploadFile(file, 'photos', path);
        await supabase.from('help_photos').insert({
          help_id: itemId, url: publicUrl, display_order: i,
        });
      } catch (err) {
        toast.error(`Photo ${i + 1} non sauvegardée : ${err instanceof Error ? err.message : ''}`);
      }
    }
  }

  resetForm();
  await fetchItems();
  setSubmitting(false);
}
