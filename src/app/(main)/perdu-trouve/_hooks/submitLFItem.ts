// ─── submitLFItem — logique pure de publication/modification ─────────────────
// Séparé de useLFForm pour garder le hook sous 180 lignes.

import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { LFItem, LFStatus, LFFormValues } from '../_types';
import { SENSITIVE_CATEGORIES } from '../_constants';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

export async function submitLFItem(
  form: LFFormValues,
  asDraft: boolean,
  editingItem: LFItem | null,
  photos: File[],
  profile: { id: string; full_name?: string | null },
  fetchItems: () => Promise<void>,
  resetForm: () => void,
  setSubmitting: (v: boolean) => void,
): Promise<void> {
  if (!form.title.trim() || !form.lost_date || !form.location_area) {
    toast.error('Titre, date et lieu sont obligatoires');
    return;
  }
  if (!asDraft && (!form.confirm_true || !form.confirm_public || !form.confirm_intermediary)) {
    toast.error('Veuillez cocher les 3 cases de validation');
    return;
  }

  setSubmitting(true);
  const supabase = createClient();
  const isSensitiveCat = SENSITIVE_CATEGORIES.includes(form.category);
  const initialStatus: LFStatus = asDraft ? 'draft' : form.type === 'perdu' ? 'perdu' : 'trouve';

  const payload = {
    author_id: profile.id,
    type: form.type,
    status: initialStatus,
    title: form.title.trim(),
    category: form.category,
    description: form.description.trim(),
    brand: form.brand.trim() || null,
    color: form.color.trim() || null,
    distinctive_sign: form.distinctive_sign.trim() || null,
    keep_secret: form.keep_secret,
    is_sensitive: form.is_sensitive || isSensitiveCat,
    lost_date: form.lost_date,
    lost_time: form.lost_time || null,
    sector_id: form.sector_id || null,
    location_area: form.location_area,
    location_detail: form.location_detail.trim() || null,
    contact_name: form.contact_name.trim() || profile.full_name || 'Anonyme',
    contact_phone: form.contact_phone.trim() || null,
    contact_email: form.contact_email.trim() || null,
    contact_mode: form.contact_mode,
    show_phone: form.show_phone,
    reward: form.reward.trim() || null,
    sentimental_value: form.sentimental_value,
    declared_authorities: form.declared_authorities,
    need_community_help: form.need_community_help,
    deposited_at: form.deposited ? (form.deposited_at || null) : null,
    proof_required: form.proof_required,
    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  let itemId: string | null = null;

  if (editingItem) {
    const { error } = await supabase.from('lost_found_items').update(payload).eq('id', editingItem.id);
    if (error) { toast.error('Erreur modification'); setSubmitting(false); return; }
    itemId = editingItem.id;
    toast.success('Annonce modifiée ✓');
  } else {
    const { data: inserted, error } = await supabase
      .from('lost_found_items').insert(payload).select('id').single();
    if (error) { toast.error('Erreur publication'); setSubmitting(false); return; }
    itemId = inserted?.id ?? null;
    toast.success(
      asDraft
        ? 'Brouillon enregistré ✓'
        : `${form.type === 'perdu' ? '🔴 Annonce "Perdu"' : '🟢 Annonce "Trouvé"'} publiée !`,
      { duration: 4000 },
    );
  }

  // Upload photos
  if (photos.length > 0 && itemId) {
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const ext = safeImageExt(file.name);
      const path = `lost-found/${itemId}/${Date.now()}_${i}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
      try {
        const publicUrl = await uploadFile(file, 'photos', path, profile.id);
        // is_cover n'existe pas sur lf_photos (colonne absente) — on utilise display_order=0 comme photo principale
        await supabase.from('lf_photos').insert({
          item_id: itemId, url: publicUrl, display_order: i,
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
