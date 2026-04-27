// ─── submitAssoItem — logique pure de publication/modification ────────────────
// Extrait de useAssoForm pour garder le hook ≤ 180 lignes.

import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Association, AssociationFormData } from '../_types';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

export async function submitAssoItem(
  form: AssociationFormData,
  profileId: string,
  profileName: string,
  asDraft: boolean,
  editingAsso: Association | null,
  photos: File[],
  fetchAssos: () => Promise<void>,
  resetForm: () => void,
  setSubmitting: (v: boolean) => void,
): Promise<void> {
  const supabase = createClient();

  const payload = {
    author_id:             profileId,
    pub_type:              form.pub_type,
    status:                asDraft ? 'draft' : 'active',
    name:                  form.name.trim(),
    slogan:                form.slogan.trim() || null,
    category:              form.category,
    description_short:     form.description_short.trim(),
    description_full:      form.description_full.trim() || null,
    location:              form.location || 'Biguglia',
    address:               form.address.trim() || null,
    schedule:              form.schedule.trim() || null,
    public_target:         form.public_target,
    age_min:               form.age_min ? parseInt(form.age_min) : null,
    age_max:               form.age_max ? parseInt(form.age_max) : null,
    membership_required:   form.membership_required,
    price_type:            form.price_type,
    price_detail:          form.price_detail.trim() || null,
    capacity:              form.capacity ? parseInt(form.capacity) : null,
    activities:            form.activities,
    frequency:             form.frequency.trim() || null,
    tags:                  form.tags,
    needs:                 form.needs,
    need_detail:           form.need_detail.trim() || null,
    contact_name:          form.contact_name.trim() || profileName || 'Contact',
    contact_role:          form.contact_role.trim() || null,
    contact_phone:         form.contact_phone.trim() || null,
    contact_email:         form.contact_email.trim() || null,
    contact_website:       form.contact_website.trim() || null,
    contact_facebook:      form.contact_facebook.trim() || null,
    contact_instagram:     form.contact_instagram.trim() || null,
    contact_mode:          form.contact_mode,
    show_phone:            form.show_phone,
    declared:              form.declared,
    rna_number:            form.rna_number.trim() || null,
    pmr_accessible:        form.pmr_accessible,
    families_welcome:      form.families_welcome,
    animals_ok:            form.animals_ok,
    indoor:                form.indoor,
    parking_nearby:        form.parking_nearby,
    material_provided:     form.material_provided,
    registration_required: form.registration_required,
    places_limited:        form.places_limited,
    urgent_need:           form.urgent_need,
    sector_id:             form.sector_id || null,
    is_accepting_members:  form.is_accepting_members,
    is_accepting_volunteers: form.is_accepting_volunteers,
    is_accepting_donations:  form.is_accepting_donations,
    is_accepting_partners:   form.is_accepting_partners,
  };

  let assoId: string | null = null;

  if (editingAsso) {
    const { error } = await supabase.from('associations').update(payload).eq('id', editingAsso.id);
    if (error) { toast.error('Erreur modification'); console.error(error); setSubmitting(false); return; }
    assoId = editingAsso.id;
    toast.success('Association modifiée ✓');
  } else {
    const { data: ins, error } = await supabase.from('associations').insert(payload).select('id').single();
    if (error) { toast.error('Erreur publication'); console.error(error); setSubmitting(false); return; }
    assoId = ins?.id ?? null;
    toast.success(asDraft ? '💾 Brouillon enregistré' : '🏛️ Association publiée !', { duration: 4000 });
  }

  // ── Upload photos ────────────────────────────────────────────────────────
  if (photos.length > 0 && assoId) {
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const ext = safeImageExt(file.name);
      const path = `associations/${assoId}/${Date.now()}_${i}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
      try {
        const publicUrl = await uploadFile(file, 'photos', path);
        const { error: dbErr } = await supabase.from('asso_photos').insert({
          asso_id: assoId, url: publicUrl, display_order: i,
        });
        if (dbErr) console.error('[asso_photos] insert error:', dbErr.message);
      } catch (err) {
        console.error('[storage] asso photo upload error:', err);
        toast.error(`Photo ${i + 1} non sauvegardée`);
      }
    }
  }

  resetForm();
  await fetchAssos();
  setSubmitting(false);
}
