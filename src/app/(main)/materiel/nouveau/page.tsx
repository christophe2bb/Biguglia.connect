'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, ChevronLeft, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { EquipmentCategory } from '@/types';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import toast from 'react-hot-toast';
import SectorFilter from '@/components/ui/SectorFilter';
import {
  AVAILABILITY_MODE_CONFIG, PICKUP_MODE_CONFIG, LEND_DURATION_HINTS, CONDITION_CONFIG,
  AvailabilityMode, PickupMode, LendDurationHint, ConditionLabel,
} from '@/lib/equipment';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

// Durée suggérée par catégorie (CDC §3.3)
const CATEGORY_DURATION_HINTS: Record<string, LendDurationHint> = {
  outillage: '2h',
  jardin: 'journee',
  nettoyage: 'journee',
  bricolage: 'journee',
  fete: 'week-end',
  cuisine: 'journee',
  puericulture: 'semaine',
  sport: 'week-end',
  camping: 'semaine',
  mobilite: 'journee',
};

export default function NouveauMaterielPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // formulaire en 2 étapes : essentiel / détails

  const [form, setForm] = useState({
    // Étape 1 — Essentiel
    title: '',
    description: '',
    category_id: '',
    condition: 'bon' as ConditionLabel,
    is_free: true,
    daily_rate: '',
    deposit_amount: '',
    deposit_note: '',
    sector_id: '',

    // Étape 2 — Détails (CDC §3.3, §11)
    availability_mode: 'toujours' as AvailabilityMode,
    pickup_location: 'Biguglia',
    pickup_mode: 'remise_en_main' as PickupMode,
    lend_duration_hint: 'journee' as LendDurationHint,
    usage_instructions: '',
    included_accessories: '',
    requires_explanation: false,
    min_notice_hours: 0,
    rules: '',
  });

  useEffect(() => {
    if (!profile) { router.push('/connexion?redirect=/materiel/nouveau'); return; }
    if (profile.home_sector_id) setForm(f => ({ ...f, sector_id: profile.home_sector_id ?? '' }));
    const fetchCats = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('equipment_categories').select('*').order('display_order');
      setCategories(data || []);
    };
    fetchCats();
  }, [profile, router]);

  // Suggestion automatique de durée selon la catégorie (CDC §3.3)
  const handleCategoryChange = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    const hint = cat ? (CATEGORY_DURATION_HINTS[cat.slug] ?? 'journee') : 'journee';
    setForm(f => ({ ...f, category_id: catId, lend_duration_hint: hint }));
  };

  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (photos.length + newFiles.length > 5) { toast.error('Maximum 5 photos'); return; }
    const newUrls = newFiles.map(f => URL.createObjectURL(f));
    setPhotos(prev => [...prev, ...newFiles]);
    setPhotoPreviews(prev => [...prev, ...newUrls]);
  };

  const validateStep1 = () => {
    if (!form.title.trim()) { toast.error('Donnez un nom à votre matériel'); return false; }
    if (!form.description.trim()) { toast.error('Ajoutez une description'); return false; }
    if (!form.category_id) { toast.error('Choisissez une catégorie'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!validateStep1()) return;

    setLoading(true);
    const supabase = createClient();

    const { data: item, error } = await supabase
      .from('equipment_items')
      .insert({
        owner_id: profile.id,
        category_id: form.category_id,
        title: form.title.trim(),
        description: form.description.trim(),
        condition: form.condition,
        is_free: form.is_free,
        daily_rate: form.is_free ? null : Number(form.daily_rate) || null,
        deposit_amount: Number(form.deposit_amount) || null,
        deposit_note: form.deposit_note || null,
        pickup_location: form.pickup_location,
        sector_id: form.sector_id || null,
        rules: form.rules || null,
        is_available: true,
        // Champs CDC §3.3 / §11
        availability_mode: form.availability_mode,
        pickup_mode: form.pickup_mode,
        lend_duration_hint: form.lend_duration_hint,
        usage_instructions: form.usage_instructions || null,
        included_accessories: form.included_accessories || null,
        requires_explanation: form.requires_explanation,
        min_notice_hours: form.min_notice_hours || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de la publication');
      setLoading(false);
      return;
    }

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = safeImageExt(photo.name);
      const fileName = `equipment/${item.id}/${Date.now()}-${i}.${ext}`;
      try {
        // uploadFile valide les magic bytes côté serveur avant d'envoyer à Supabase
        const publicUrl = await uploadFile(photo, 'photos', fileName);
        await supabase.from('equipment_photos').insert({
          item_id: item.id, url: publicUrl, display_order: i, is_cover: i === 0,
        });
      } catch (err) {
        console.error('Photo upload error:', err);
        toast.error(`Photo ${i + 1} refusée : ${err instanceof Error ? err.message : 'type invalide'}`);
      }
    }

    toast.success('Matériel publié ! Les voisins peuvent maintenant le trouver 🎉');
    router.push(`/materiel/${item.id}`);
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/materiel" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Proposer du matériel</h1>
      <p className="text-gray-500 mb-6 text-sm">Partagez votre matériel avec les voisins de Biguglia — 3 minutes suffisent</p>

      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-3 mb-8">
        {([1, 2] as const).map(s => (
          <button key={s} onClick={() => s < step || validateStep1() ? setStep(s) : null}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${step === s ? 'bg-teal-600 text-white shadow-sm' : step > s ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-gray-100 text-gray-400'}`}>
            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${step === s ? 'bg-white text-teal-700' : step > s ? 'bg-teal-600 text-white' : 'bg-gray-300 text-gray-500'}`}>{s}</span>
            {s === 1 ? 'Essentiel' : 'Détails'}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">Étape {step}/2</span>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Étape 1 : Essentiel ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Infos de base */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <Input
                label="Nom du matériel *"
                placeholder="Ex : Perceuse-visseuse Bosch, Tondeuse Husqvarna…"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />

              <Select
                label="Catégorie *"
                value={form.category_id}
                onChange={(e) => handleCategoryChange(e.target.value)}
                required
              >
                <option value="">Sélectionner une catégorie…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </Select>

              <Textarea
                label="Description *"
                placeholder="Décrivez le matériel : modèle, usage, ce qui est inclus, son état…"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                required
                className="min-h-[100px]"
              />

              {/* État avec visuels */}
              <div>
                <p className="block text-sm font-semibold text-gray-700 mb-2">État du matériel</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(CONDITION_CONFIG) as [ConditionLabel, typeof CONDITION_CONFIG[ConditionLabel]][]).map(([key, cfg]) => (
                    <button key={key} type="button"
                      onClick={() => setForm(f => ({ ...f, condition: key }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${form.condition === key ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span>{cfg.icon}</span>
                      <span className={form.condition === key ? 'text-teal-700' : 'text-gray-600'}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Conditions de prêt</h3>

              <div className="flex gap-3">
                <button type="button" onClick={() => setForm(f => ({ ...f, is_free: true }))}
                  className={`flex-1 p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${form.is_free ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  🎁 Gratuit
                </button>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_free: false }))}
                  className={`flex-1 p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${!form.is_free ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  💶 Participation
                </button>
              </div>

              {!form.is_free && (
                <Input label="Tarif journalier (€)" type="number" placeholder="Ex : 10"
                  value={form.daily_rate} onChange={(e) => setForm(f => ({ ...f, daily_rate: e.target.value }))} min="1" />
              )}

              <div className="flex gap-3">
                <div className="flex-1">
                  <Input label="Caution (€) — optionnel" type="number" placeholder="Ex : 50"
                    value={form.deposit_amount} onChange={(e) => setForm(f => ({ ...f, deposit_amount: e.target.value }))} min="0" />
                </div>
              </div>
              {Number(form.deposit_amount) > 0 && (
                <Input label="Précisions sur la caution" placeholder="Ex : remboursée au retour en bon état"
                  value={form.deposit_note} onChange={(e) => setForm(f => ({ ...f, deposit_note: e.target.value }))} />
              )}
            </div>

            {/* Secteur */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-gray-800">Secteur</h3>
                <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Fortement recommandé</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Aide les voisins du même quartier à vous trouver facilement</p>
              <SectorFilter value={form.sector_id || null} onChange={id => setForm(f => ({ ...f, sector_id: id || '' }))} compact />
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-1">Photos</h3>
              <p className="text-xs text-gray-500 mb-4">Une bonne photo augmente considérablement les demandes — jusqu&apos;à 5 photos</p>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-teal-300 hover:bg-teal-50 transition-colors">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Ajouter des photos</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG — max 5 photos</p>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => handlePhotoAdd(e.target.files)} />
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {photos.map((_photo, i) => (
                    <div key={i} className="relative w-20 h-20 group">
                      <Image src={photoPreviews[i]} alt="" fill unoptimized sizes="80px" className="object-cover rounded-xl" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[9px] bg-teal-600 text-white px-1 rounded">Photo principale</span>
                      )}
                      <button type="button" onClick={() => {
                        URL.revokeObjectURL(photoPreviews[i]);
                        setPhotos(p => p.filter((_, j) => j !== i));
                        setPhotoPreviews(p => p.filter((_, j) => j !== i));
                      }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Annuler</Button>
              <Button type="button" className="flex-1" onClick={() => validateStep1() && setStep(2)}>
                Continuer — Détails →
              </Button>
            </div>
          </div>
        )}

        {/* ── Étape 2 : Détails (CDC §3.3, §6.2) ─────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Disponibilité */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Disponibilité</h3>

              <div>
                <p className="block text-sm font-semibold text-gray-700 mb-2">Mode de disponibilité</p>
                <div className="space-y-2">
                  {(Object.entries(AVAILABILITY_MODE_CONFIG) as [AvailabilityMode, typeof AVAILABILITY_MODE_CONFIG[AvailabilityMode]][]).map(([key, cfg]) => (
                    <button key={key} type="button"
                      onClick={() => setForm(f => ({ ...f, availability_mode: key }))}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${form.availability_mode === key ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="text-xl mt-0.5">{cfg.icon}</span>
                      <div>
                        <div className={`text-sm font-semibold ${form.availability_mode === key ? 'text-teal-700' : 'text-gray-800'}`}>{cfg.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{cfg.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {form.availability_mode !== 'toujours' && (
                <Input
                  label="Précisions sur la disponibilité"
                  placeholder="Ex : disponible les week-ends, pas en juillet, contacter 48h avant…"
                  value={form.rules}
                  onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))}
                />
              )}

              {form.min_notice_hours !== undefined && (
                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-2">Délai de préavis minimum</p>
                  <div className="flex gap-2">
                    {[0, 2, 24, 48, 72].map(h => (
                      <button key={h} type="button"
                        onClick={() => setForm(f => ({ ...f, min_notice_hours: h }))}
                        className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-colors ${form.min_notice_hours === h ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        {h === 0 ? 'Aucun' : h < 24 ? `${h}h` : `${h / 24}j`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mode d'échange */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Mode d&apos;échange</h3>

              <div>
                <p className="block text-sm font-semibold text-gray-700 mb-2">Comment récupérer le matériel ?</p>
                <div className="space-y-2">
                  {(Object.entries(PICKUP_MODE_CONFIG) as [PickupMode, typeof PICKUP_MODE_CONFIG[PickupMode]][]).map(([key, cfg]) => (
                    <button key={key} type="button"
                      onClick={() => setForm(f => ({ ...f, pickup_mode: key }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${form.pickup_mode === key ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="text-lg">{cfg.icon}</span>
                      <span className={`text-sm font-medium ${form.pickup_mode === key ? 'text-teal-700' : 'text-gray-700'}`}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Lieu de retrait" placeholder="Votre quartier / adresse approximative"
                value={form.pickup_location}
                onChange={(e) => setForm(f => ({ ...f, pickup_location: e.target.value }))} />
            </div>

            {/* Durée & usage */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Usage recommandé</h3>

              <div>
                <p className="block text-sm font-semibold text-gray-700 mb-2">Durée de prêt conseillée</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(LEND_DURATION_HINTS) as [LendDurationHint, typeof LEND_DURATION_HINTS[LendDurationHint]][]).map(([key, cfg]) => (
                    <button key={key} type="button"
                      onClick={() => setForm(f => ({ ...f, lend_duration_hint: key }))}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.lend_duration_hint === key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea label="Instructions d'utilisation (optionnel)"
                placeholder="Mode d'emploi rapide, réglages, précautions particulières…"
                value={form.usage_instructions}
                onChange={(e) => setForm(f => ({ ...f, usage_instructions: e.target.value }))}
                className="min-h-[80px]" />

              <Input label="Accessoires inclus (optionnel)"
                placeholder="Ex : rallonge 10m, malette, chargeur, 3 embouts…"
                value={form.included_accessories}
                onChange={(e) => setForm(f => ({ ...f, included_accessories: e.target.value }))} />

              {/* Signal "nécessite explication" (CDC §3.3) */}
              <label aria-label="Disponible maintenant" className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors">
                <input type="checkbox" checked={form.requires_explanation}
                  onChange={e => setForm(f => ({ ...f, requires_explanation: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 accent-amber-600" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">⚠️ Nécessite une explication</div>
                  <div className="text-xs text-gray-500 mt-0.5">Ce matériel demande une démonstration ou explications à la remise</div>
                </div>
              </label>
            </div>

            {/* Règles (si pas déjà rempli en étape 1) */}
            {!form.rules && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <Textarea label="Règles d'utilisation (optionnel)"
                  placeholder="Conditions, zones d'utilisation, interdictions, précautions…"
                  value={form.rules}
                  onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))}
                  className="min-h-[80px]" />
              </div>
            )}

            {/* Récapitulatif avant publication */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-bold text-teal-800">Récapitulatif de votre annonce</h4>
              </div>
              <div className="space-y-1 text-xs text-teal-700">
                <div>📦 <strong>{form.title || '—'}</strong></div>
                <div>🏷️ {categories.find(c => c.id === form.category_id)?.name || '—'} • {CONDITION_CONFIG[form.condition]?.label}</div>
                <div>{form.is_free ? '🎁 Gratuit' : `💶 ${form.daily_rate}€/j`} {Number(form.deposit_amount) > 0 ? `• Caution ${form.deposit_amount}€` : ''}</div>
                <div>{AVAILABILITY_MODE_CONFIG[form.availability_mode]?.icon} {AVAILABILITY_MODE_CONFIG[form.availability_mode]?.label}</div>
                <div>{PICKUP_MODE_CONFIG[form.pickup_mode]?.icon} {PICKUP_MODE_CONFIG[form.pickup_mode]?.label} — {form.pickup_location}</div>
                <div>⏱️ Durée conseillée : {LEND_DURATION_HINTS[form.lend_duration_hint]?.label}</div>
                {form.requires_explanation && <div>⚠️ Nécessite une explication à la remise</div>}
                {photos.length > 0 && <div>📷 {photos.length} photo{photos.length > 1 ? 's' : ''}</div>}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                ← Retour
              </Button>
              <Button type="submit" className="flex-1" loading={loading}>
                🚀 Publier le matériel
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
