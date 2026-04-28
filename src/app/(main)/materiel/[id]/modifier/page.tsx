'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, X, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Link from 'next/link';
import {
  AVAILABILITY_MODE_CONFIG, PICKUP_MODE_CONFIG, LEND_DURATION_HINTS, CONDITION_CONFIG,
  type AvailabilityMode, type PickupMode, type LendDurationHint, type ConditionLabel,
} from '@/lib/equipment';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

// ─── Types locaux ──────────────────────────────────────────────────────────────

interface ExistingPhoto { id: string; url: string; display_order: number; }
interface Category     { id: string; name: string; icon: string; slug: string; }

// Heures de préavis minimum proposées (CDC §3.3)
const NOTICE_HOURS = [0, 2, 4, 12, 24, 48] as const;

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ModifierMaterielPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories]         = useState<Category[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [newPhotos, setNewPhotos]           = useState<File[]>([]);
  const [newPreviews, setNewPreviews]       = useState<string[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);

  // ── Formulaire complet (CDC §3 + §3.3 + §11) ──────────────────────────────
  const [form, setForm] = useState({
    // Étape 1 — Essentiel
    title:           '',
    description:     '',
    category_id:     '',
    condition:       'bon' as ConditionLabel,
    is_free:         true,
    daily_rate:      '',
    deposit_amount:  '',
    deposit_note:    '',
    pickup_location: 'Biguglia',
    rules:           '',

    // Étape 2 — Détails (CDC §3.3 / §11)
    availability_mode:    'toujours'       as AvailabilityMode,
    pickup_mode:          'remise_en_main' as PickupMode,
    lend_duration_hint:   'journee'        as LendDurationHint,
    usage_instructions:   '',
    included_accessories: '',
    requires_explanation: false,
    min_notice_hours:     0,
  });

  // ── Chargement ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { router.push('/connexion'); return; }

    const fetchData = async () => {
      const supabase = createClient();
      const { data: cats } = await supabase
        .from('equipment_categories')
        .select('*')
        .order('display_order');
      setCategories(cats || []);

      const { data, error } = await supabase
        .from('equipment_items')
        .select('*, photos:equipment_photos(id, url, display_order)')
        .eq('id', id as string)
        .single();

      if (error || !data) { toast.error('Matériel introuvable'); router.push('/materiel'); return; }
      if (data.owner_id !== profile.id && profile.role !== 'admin') {
        toast.error('Non autorisé'); router.push(`/materiel/${id}`); return;
      }

      setForm({
        title:           data.title           || '',
        description:     data.description     || '',
        category_id:     data.category_id     || '',
        condition:       (data.condition      || 'bon')   as ConditionLabel,
        is_free:         data.is_free         ?? true,
        daily_rate:      data.daily_rate      != null ? String(data.daily_rate) : '',
        deposit_amount:  data.deposit_amount  != null ? String(data.deposit_amount) : '',
        deposit_note:    data.deposit_note    || '',
        pickup_location: data.pickup_location || 'Biguglia',
        rules:           data.rules           || '',
        // Champs CDC §3.3
        availability_mode:    (data.availability_mode    || 'toujours')       as AvailabilityMode,
        pickup_mode:          (data.pickup_mode          || 'remise_en_main') as PickupMode,
        lend_duration_hint:   (data.lend_duration_hint   || 'journee')        as LendDurationHint,
        usage_instructions:   data.usage_instructions   || '',
        included_accessories: data.included_accessories || '',
        requires_explanation: data.requires_explanation ?? false,
        min_notice_hours:     data.min_notice_hours     ?? 0,
      });

      const photos = (data.photos || []) as ExistingPhoto[];
      photos.sort((a, b) => a.display_order - b.display_order);
      setExistingPhotos(photos);
      setLoading(false);
    };
    fetchData();
  }, [id, profile, authLoading, router]);

  // ── Sauvegarde ───────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.category_id) {
      toast.error('Remplissez tous les champs obligatoires'); return;
    }
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('equipment_items')
      .update({
        // Essentiel
        title:           form.title.trim(),
        description:     form.description.trim(),
        category_id:     form.category_id,
        condition:       form.condition  || null,
        is_free:         form.is_free,
        daily_rate:      form.is_free ? 0 : (form.daily_rate ? parseFloat(form.daily_rate) : 0),
        deposit_amount:  form.deposit_amount ? parseFloat(form.deposit_amount) : null,
        deposit_note:    form.deposit_note   || null,
        pickup_location: form.pickup_location || 'Biguglia',
        rules:           form.rules || null,
        // CDC §3.3
        availability_mode:    form.availability_mode,
        pickup_mode:          form.pickup_mode,
        lend_duration_hint:   form.lend_duration_hint,
        usage_instructions:   form.usage_instructions   || null,
        included_accessories: form.included_accessories || null,
        requires_explanation: form.requires_explanation,
        min_notice_hours:     form.min_notice_hours     || null,
        updated_at:           new Date().toISOString(),
      })
      .eq('id', id as string);

    if (error) { toast.error('Erreur lors de la sauvegarde'); setSaving(false); return; }

    // Suppression des photos retirées
    for (const photoId of deletedPhotoIds) {
      await supabase.from('equipment_photos').delete().eq('id', photoId);
    }
    // Ajout des nouvelles photos — via /api/upload (magic-bytes validation côté serveur)
    for (const photo of newPhotos) {
      const ext = safeImageExt(photo.name);
      const fileName = `equipment/${id}/${Date.now()}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
      try {
        const publicUrl = await uploadFile(photo, 'photos', fileName, profile?.id);
        await supabase.from('equipment_photos').insert({
          item_id: id,
          url: publicUrl,
          display_order: existingPhotos.length,
        });
      } catch (err) {
        console.error('[equipment-upload]', err);
        toast.error(`Photo refusée : ${err instanceof Error ? err.message : 'type invalide'}`);
      }
    }

    toast.success('Matériel modifié !');
    router.push(`/materiel/${id}`);
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-64 bg-gray-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/materiel/${id}`} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le matériel</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Section 1 : Informations essentielles ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Informations essentielles</h2>

          <Select
            label="Catégorie *"
            value={form.category_id}
            onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>

          <Input
            label="Titre *"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <Textarea
            label="Description *"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            required
          />

          {/* État */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">État</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CONDITION_CONFIG) as [ConditionLabel, typeof CONDITION_CONFIG[ConditionLabel]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, condition: key }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-colors ${form.condition === key ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span>{cfg.icon}</span>
                  <span className={`text-sm font-medium ${form.condition === key ? 'text-teal-700' : 'text-gray-700'}`}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prix */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="is_free"
              checked={form.is_free}
              onChange={(e) => setForm(f => ({ ...f, is_free: e.target.checked }))}
              className="w-4 h-4 rounded text-brand-600"
            />
            <label htmlFor="is_free" className="text-sm font-medium text-gray-700">Prêt gratuit</label>
          </div>

          {!form.is_free && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tarif/jour (€)"
                type="number" min="0"
                value={form.daily_rate}
                onChange={(e) => setForm(f => ({ ...f, daily_rate: e.target.value }))}
              />
              <Input
                label="Caution (€)"
                type="number" min="0"
                value={form.deposit_amount}
                onChange={(e) => setForm(f => ({ ...f, deposit_amount: e.target.value }))}
              />
            </div>
          )}
          {!form.is_free && form.deposit_amount && (
            <Input
              label="Note sur la caution (optionnel)"
              value={form.deposit_note}
              onChange={(e) => setForm(f => ({ ...f, deposit_note: e.target.value }))}
              placeholder="Ex : remboursée au retour en bon état"
            />
          )}

          <Input
            label="Lieu de retrait"
            value={form.pickup_location}
            onChange={(e) => setForm(f => ({ ...f, pickup_location: e.target.value }))}
          />

          <Textarea
            label="Règles d'utilisation (optionnel)"
            value={form.rules}
            onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))}
          />
        </div>

        {/* ── Section 2 : Disponibilité & conditions (CDC §3.3) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Disponibilité &amp; conditions</h2>

          {/* Mode de disponibilité */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Mode de disponibilité</p>
            <div className="space-y-2">
              {(Object.entries(AVAILABILITY_MODE_CONFIG) as [AvailabilityMode, typeof AVAILABILITY_MODE_CONFIG[AvailabilityMode]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, availability_mode: key }))}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${form.availability_mode === key ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="text-xl mt-0.5">{cfg.icon}</span>
                  <div>
                    <div className={`text-sm font-semibold ${form.availability_mode === key ? 'text-teal-700' : 'text-gray-800'}`}>{cfg.label}</div>
                    <div className="text-xs text-gray-500">{cfg.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Délai de préavis (si pas toujours dispo) */}
          {form.availability_mode !== 'toujours' && (
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">Délai de préavis minimum</p>
              <div className="flex gap-2 flex-wrap">
                {NOTICE_HOURS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, min_notice_hours: h }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-colors ${form.min_notice_hours === h ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {h === 0 ? 'Aucun' : `${h}h`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode de remise */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Mode de remise</p>
            <div className="space-y-2">
              {(Object.entries(PICKUP_MODE_CONFIG) as [PickupMode, typeof PICKUP_MODE_CONFIG[PickupMode]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, pickup_mode: key }))}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${form.pickup_mode === key ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="text-lg">{cfg.icon}</span>
                  <span className={`text-sm font-medium ${form.pickup_mode === key ? 'text-teal-700' : 'text-gray-700'}`}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Durée conseillée */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Durée de prêt conseillée</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(LEND_DURATION_HINTS) as [LendDurationHint, { label: string }][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, lend_duration_hint: key }))}
                  className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.lend_duration_hint === key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions d'utilisation */}
          <Textarea
            label="Instructions d'utilisation (optionnel)"
            value={form.usage_instructions}
            onChange={(e) => setForm(f => ({ ...f, usage_instructions: e.target.value }))}
            placeholder="Comment utiliser correctement ce matériel..."
          />

          {/* Accessoires inclus */}
          <Textarea
            label="Accessoires inclus (optionnel)"
            value={form.included_accessories}
            onChange={(e) => setForm(f => ({ ...f, included_accessories: e.target.value }))}
            placeholder="Malette, câble, manuel, piles..."
          />

          {/* Nécessite explication */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <input
              type="checkbox"
              id="requires_explanation"
              checked={form.requires_explanation}
              onChange={(e) => setForm(f => ({ ...f, requires_explanation: e.target.checked }))}
              className="w-4 h-4 rounded text-amber-600"
            />
            <label htmlFor="requires_explanation" className="text-sm text-amber-800">
              ⚠️ Nécessite une explication à la remise
            </label>
          </div>
        </div>

        {/* ── Section 3 : Photos ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">
            Photos ({existingPhotos.length + newPhotos.length}/5)
          </h3>
          <div className="flex flex-wrap gap-3 mb-3">
            {existingPhotos.map(photo => (
              <div key={photo.id} className="relative w-24 h-24 group">
                <Image src={photo.url} alt="" fill className="object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    setDeletedPhotoIds(p => [...p, photo.id]);
                    setExistingPhotos(p => p.filter(pp => pp.id !== photo.id));
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {newPhotos.map((_photo, i) => (
              <div key={i} className="relative w-24 h-24 group">
                <Image src={newPreviews[i]} alt="" fill unoptimized sizes="96px" className="object-cover rounded-xl border-2 border-brand-300" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(newPreviews[i]);
                    setNewPhotos(p => p.filter((_, j) => j !== i));
                    setNewPreviews(p => p.filter((_, j) => j !== i));
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {existingPhotos.length + newPhotos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:border-brand-300 hover:bg-brand-50 transition-colors"
              >
                <Camera className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-400">Ajouter</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (existingPhotos.length + newPhotos.length + files.length > 5) {
                toast.error('Max 5 photos'); e.target.value = ''; return;
              }
              const urls = files.map(f => URL.createObjectURL(f));
              setNewPreviews(p => [...p, ...urls]);
              setNewPhotos(p => [...p, ...files]);
              e.target.value = '';
            }}
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <Link
            href={`/materiel/${id}`}
            className="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" loading={saving}>Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
