'use client';

/**
 * Collectionneurs — Wizard création d'annonce v2.0 Premium
 * 5 étapes : Mode → Catégorie → Objet → Photos & Médias → Aperçu & Publication
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Check, Tag, ArrowLeftRight, Gift,
  Search, Camera, Eye, Loader2, Gem, Star, MapPin, Truck,
  Package, Info, AlertCircle, Plus, X, Upload, Sparkles,
  ArrowLeft, CheckCircle2, Pencil, Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MODE_CONFIG, RARITY_CONFIG, CONDITION_CONFIG,
  type CollectionMode, type RarityLevel, type ConditionLevel,
  type CollectionCategory,
} from '@/lib/collectionneurs-config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Étape 1 — Mode
  mode: CollectionMode;
  // Étape 2 — Catégorie
  category_id: string;
  subcategory: string;
  // Étape 3 — Objet
  title: string;
  description: string;
  condition: ConditionLevel;
  rarity_level: RarityLevel;
  year_period: string;
  brand: string;
  series_name: string;
  authenticity_declared: boolean;
  provenance: string;
  defects_noted: string;
  dimensions: string;
  material: string;
  price: string;
  exchange_expected: string;
  shipping_available: boolean;
  local_meetup_available: boolean;
  city: string;
  postal_code: string;
  tags: string[];
  // Étape 4 — Photos
  photos: PhotoItem[];
}

interface PhotoItem {
  file?: File;
  preview: string;
  url?: string;         // URL Supabase après upload
  is_cover: boolean;
  sort_order: number;
  uploading?: boolean;
  error?: string;
}

const STEPS = [
  { id: 1, label: 'Mode',     icon: Tag },
  { id: 2, label: 'Catégorie', icon: Star },
  { id: 3, label: 'Objet',    icon: Gem },
  { id: 4, label: 'Photos',   icon: Camera },
  { id: 5, label: 'Publication', icon: CheckCircle2 },
] as const;

const EMPTY_FORM: FormData = {
  mode: 'vente',
  category_id: '',
  subcategory: '',
  title: '',
  description: '',
  condition: 'bon',
  rarity_level: 'commun',
  year_period: '',
  brand: '',
  series_name: '',
  authenticity_declared: false,
  provenance: '',
  defects_noted: '',
  dimensions: '',
  material: '',
  price: '',
  exchange_expected: '',
  shipping_available: false,
  local_meetup_available: true,
  city: '',
  postal_code: '',
  tags: [],
  photos: [],
};

const MAX_PHOTOS = 12;
const MAX_FILE_MB = 8;

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NouvelleAnnoncePage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useAuthStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger catégories
  useEffect(() => {
    supabase
      .from('collection_categories')
      .select('*')
      .order('display_order')
      .then(({ data }) => {
        if (data?.length) setCategories(data as CollectionCategory[]);
        else setCategories([
          { id: '1', name: 'Jeux & Jouets anciens', slug: 'jeux-jouets', icon: '🎲', color: 'bg-purple-100 text-purple-700', display_order: 1 },
          { id: '2', name: 'Monnaies & Timbres', slug: 'monnaies-timbres', icon: '🪙', color: 'bg-yellow-100 text-yellow-700', display_order: 2 },
          { id: '3', name: 'Livres & BD', slug: 'livres-bd', icon: '📚', color: 'bg-blue-100 text-blue-700', display_order: 3 },
          { id: '4', name: 'Vinyles & Cassettes', slug: 'vinyles', icon: '🎵', color: 'bg-pink-100 text-pink-700', display_order: 4 },
          { id: '5', name: 'Cartes & Figurines', slug: 'cartes-figurines', icon: '🃏', color: 'bg-red-100 text-red-700', display_order: 5 },
          { id: '6', name: 'Céramique & Porcelaine', slug: 'ceramique', icon: '🏺', color: 'bg-orange-100 text-orange-700', display_order: 6 },
          { id: '7', name: 'Photographies & Art', slug: 'photo-art', icon: '🎨', color: 'bg-indigo-100 text-indigo-700', display_order: 7 },
          { id: '8', name: 'Montres & Bijoux', slug: 'montres-bijoux', icon: '⌚', color: 'bg-amber-100 text-amber-700', display_order: 8 },
          { id: '9', name: 'Mobilier & Décoration', slug: 'mobilier-deco', icon: '🛋️', color: 'bg-teal-100 text-teal-700', display_order: 9 },
          { id: '10', name: 'Sportifs & Militaires', slug: 'sport-militaire', icon: '🏅', color: 'bg-green-100 text-green-700', display_order: 10 },
          { id: '0', name: 'Autre', slug: 'autre', icon: '📦', color: 'bg-gray-100 text-gray-700', display_order: 99 },
        ]);
      });
  }, [supabase]);

  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // ─── Validation par étape ─────────────────────────────────────────────────

  const canProceed = useCallback((): { ok: boolean; msg?: string } => {
    if (step === 1) return { ok: !!form.mode };
    if (step === 2) return form.category_id ? { ok: true } : { ok: false, msg: 'Choisissez une catégorie.' };
    if (step === 3) {
      if (!form.title.trim() || form.title.length < 5) return { ok: false, msg: 'Titre trop court (5 car. min).' };
      if (!form.description.trim() || form.description.length < 20) return { ok: false, msg: 'Description trop courte (20 car. min).' };
      if (form.mode === 'vente' && form.price && isNaN(Number(form.price))) return { ok: false, msg: 'Prix invalide.' };
      if (!form.city.trim()) return { ok: false, msg: 'Indiquez votre ville.' };
      return { ok: true };
    }
    if (step === 4) {
      if (form.photos.length === 0) return { ok: false, msg: 'Ajoutez au moins 1 photo.' };
      if (form.photos.some(p => p.uploading)) return { ok: false, msg: 'Photos en cours d\'envoi…' };
      if (form.photos.some(p => p.error)) return { ok: false, msg: 'Certaines photos ont échoué.' };
      return { ok: true };
    }
    return { ok: true };
  }, [step, form]);

  // ─── Upload photo ─────────────────────────────────────────────────────────

  const uploadPhoto = useCallback(async (file: File, idx: number): Promise<string | null> => {
    if (!profile?.id) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `collection/${profile.id}/${Date.now()}_${idx}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
    return publicUrl;
  }, [profile?.id, supabase]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - form.photos.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_PHOTOS} photos.`); return; }

    const accepted = Array.from(files).slice(0, remaining).filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} : format non supporté.`); return false; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`${f.name} trop lourd (max ${MAX_FILE_MB} Mo).`); return false; }
      return true;
    });

    if (!accepted.length) return;

    const previews: PhotoItem[] = accepted.map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      is_cover: form.photos.length === 0 && i === 0,
      sort_order: form.photos.length + i,
      uploading: true,
    }));

    setForm(prev => ({ ...prev, photos: [...prev.photos, ...previews] }));

    // Upload en parallèle
    const uploaded = await Promise.all(
      accepted.map((file, i) => uploadPhoto(file, form.photos.length + i))
    );

    setForm(prev => {
      const newPhotos = [...prev.photos];
      for (let i = 0; i < accepted.length; i++) {
        const pIdx = prev.photos.length - accepted.length + i;
        if (pIdx >= 0 && pIdx < newPhotos.length) {
          if (uploaded[i]) {
            newPhotos[pIdx] = { ...newPhotos[pIdx], url: uploaded[i]!, uploading: false };
          } else {
            newPhotos[pIdx] = { ...newPhotos[pIdx], uploading: false, error: 'Échec' };
          }
        }
      }
      return { ...prev, photos: newPhotos };
    });
  }, [form.photos, uploadPhoto]);

  const removePhoto = useCallback((idx: number) => {
    setForm(prev => {
      const newPhotos = prev.photos.filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, sort_order: i, is_cover: i === 0 && prev.photos[0]?.is_cover ? true : p.is_cover }));
      if (newPhotos.length > 0 && !newPhotos.some(p => p.is_cover)) newPhotos[0].is_cover = true;
      return { ...prev, photos: newPhotos };
    });
  }, []);

  const setCover = useCallback((idx: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.map((p, i) => ({ ...p, is_cover: i === idx })),
    }));
  }, []);

  // ─── Soumission ───────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!profile?.id) { toast.error('Connectez-vous pour publier.'); return; }
    const v = canProceed();
    if (!v.ok) { toast.error(v.msg || 'Vérifiez le formulaire.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        author_id: profile.id,
        mode: form.mode,
        item_type: form.mode === 'echange' ? 'troc' : form.mode, // backward compat
        status: 'actif',
        moderation_status: 'publie',
        category_id: form.category_id || null,
        subcategory: form.subcategory || null,
        title: form.title.trim(),
        description: form.description.trim(),
        condition: form.condition,
        rarity_level: form.rarity_level,
        year_period: form.year_period || null,
        brand: form.brand || null,
        series_name: form.series_name || null,
        authenticity_declared: form.authenticity_declared,
        provenance: form.provenance || null,
        defects_noted: form.defects_noted || null,
        dimensions: form.dimensions || null,
        material: form.material || null,
        price: form.mode === 'vente' && form.price ? Number(form.price) : null,
        exchange_expected: form.mode === 'echange' ? form.exchange_expected || null : null,
        shipping_available: form.shipping_available,
        local_meetup_available: form.local_meetup_available,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        tags: form.tags,
        views_count: 0,
        favorites_count: 0,
        messages_count: 0,
        published_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('collection_items').insert(payload).select('id').single();
      if (error) throw error;

      const itemId = data.id;

      // Insérer photos
      if (form.photos.length > 0) {
        const coverSet = form.photos.some(p => p.is_cover);
        const photoRows = form.photos
          .filter(p => p.url && !p.error)
          .map((p, i) => ({
            item_id: itemId,
            url: p.url!,
            image_url: p.url!,
            is_cover: coverSet ? p.is_cover : i === 0,
            sort_order: p.sort_order,
            alt_text: `${form.title} - photo ${i + 1}`,
          }));

        if (photoRows.length > 0) {
          await supabase.from('collection_item_photos').insert(photoRows);
        }
      }

      setCreatedId(itemId);
      setSubmitted(true);
      toast.success('Annonce publiée avec succès ! 🎉');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la publication : ' + msg);
    } finally {
      setSubmitting(false);
    }
  }, [profile?.id, form, supabase, canProceed]);

  const goNext = useCallback(() => {
    const v = canProceed();
    if (!v.ok) { toast.error(v.msg || 'Complétez cette étape.'); return; }
    if (step === 5) { handleSubmit(); return; }
    setStep(s => Math.min(s + 1, 5));
  }, [step, canProceed, handleSubmit]);

  const goPrev = useCallback(() => setStep(s => Math.max(s - 1, 1)), []);

  // Redirect si non connecté
  useEffect(() => {
    if (profile === null) { router.push('/connexion?redirect=/collectionneurs/nouveau'); }
  }, [profile, router]);

  // ─── Rendu — État succès ─────────────────────────────────────────────────

  if (submitted && createdId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Annonce publiée !</h1>
          <p className="text-gray-500 mb-6">Votre objet est maintenant visible par la communauté des collectionneurs.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/collectionneurs/${createdId}`} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition text-center">
              Voir mon annonce
            </Link>
            <Link href="/collectionneurs" className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-xl font-semibold transition text-center">
              Retour à la liste
            </Link>
          </div>
          <button
            onClick={() => { setSubmitted(false); setCreatedId(null); setForm({ ...EMPTY_FORM }); setStep(1); }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Publier une autre annonce
          </button>
        </div>
      </div>
    );
  }

  // ─── Rendu principal ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/collectionneurs" className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900 flex-1">Nouvelle annonce</h1>
          <span className="text-sm text-gray-500">Étape {step}/{STEPS.length}</span>
        </div>

        {/* Stepper */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    onClick={() => done ? setStep(s.id) : undefined}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap',
                      active && 'bg-blue-600 text-white',
                      done && 'text-emerald-700 hover:bg-emerald-50 cursor-pointer',
                      !active && !done && 'text-gray-400 cursor-default'
                    )}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn('h-px flex-1 mx-1', step > s.id ? 'bg-emerald-400' : 'bg-gray-200')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* ── Étape 1 : Mode ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Quel est le mode de votre annonce ?</h2>
            <p className="text-gray-500 text-sm mb-6">Choisissez comment vous souhaitez partager cet objet avec la communauté.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.entries(MODE_CONFIG) as [CollectionMode, typeof MODE_CONFIG.vente][]).map(([mode, cfg]) => {
                const Icon = cfg.icon;
                const isSelected = form.mode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => update('mode', mode)}
                    className={cn(
                      'relative p-5 rounded-2xl border-2 text-left transition-all duration-200',
                      isSelected
                        ? `border-blue-500 ${cfg.bg} shadow-md`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3', cfg.bg, cfg.border, 'border')}>
                      <Icon className={cn('w-6 h-6', cfg.color)} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{cfg.label}</h3>
                    <p className="text-sm text-gray-500">
                      {mode === 'vente' && 'Définissez un prix et vendez votre objet à un autre collectionneur.'}
                      {mode === 'echange' && 'Proposez un échange contre un objet de valeur similaire.'}
                      {mode === 'don' && 'Offrez gratuitement votre objet à quelqu\'un qui l\'appréciera.'}
                      {mode === 'recherche' && 'Signalez ce que vous cherchez — la communauté vous aidera.'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Étape 2 : Catégorie ─────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Catégorie de l&apos;objet</h2>
            <p className="text-gray-500 text-sm mb-6">Une bonne catégorie aide les collectionneurs à trouver votre annonce.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => update('category_id', cat.id)}
                  className={cn(
                    'p-4 rounded-2xl border-2 text-left transition-all',
                    form.category_id === cat.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl block mb-2">{cat.icon}</span>
                  <span className="text-sm font-medium text-gray-800 leading-tight">{cat.name}</span>
                  {form.category_id === cat.id && (
                    <Check className="w-4 h-4 text-blue-500 mt-1" />
                  )}
                </button>
              ))}
            </div>

            {form.category_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sous-catégorie <span className="text-gray-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={form.subcategory}
                  onChange={e => update('subcategory', e.target.value)}
                  placeholder="Ex : Figurines Star Wars, Timbres France 1900–1950…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Étape 3 : Objet ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Décrivez votre objet</h2>
              <p className="text-gray-500 text-sm">Plus vous êtes précis, plus vous attirerez les bons acheteurs.</p>
            </div>

            {/* Titre */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                maxLength={120}
                placeholder="Ex : Montre Lip T18 dorée 1950 — excellent état"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">{form.title.length}/120 caractères</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description détaillée <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Décrivez l'objet, son histoire, son état exact, ses défauts éventuels…"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">{form.description.length}/2000 caractères</p>
            </div>

            {/* Condition + Rareté */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">État <span className="text-red-500">*</span></label>
                <select
                  value={form.condition}
                  onChange={e => update('condition', e.target.value as ConditionLevel)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                >
                  {(Object.entries(CONDITION_CONFIG) as [ConditionLevel, { label: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rareté</label>
                <select
                  value={form.rarity_level}
                  onChange={e => update('rarity_level', e.target.value as RarityLevel)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
                >
                  {(Object.entries(RARITY_CONFIG) as [RarityLevel, { label: string; icon: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Infos objet */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Info className="w-4 h-4" /> Informations sur l&apos;objet</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Époque / Période</label>
                  <input type="text" value={form.year_period} onChange={e => update('year_period', e.target.value)}
                    placeholder="Ex: 1950–1960" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marque / Fabricant</label>
                  <input type="text" value={form.brand} onChange={e => update('brand', e.target.value)}
                    placeholder="Ex: LIP, Dinky Toys…" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Série / Collection</label>
                  <input type="text" value={form.series_name} onChange={e => update('series_name', e.target.value)}
                    placeholder="Ex: Collection Tintin" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dimensions</label>
                  <input type="text" value={form.dimensions} onChange={e => update('dimensions', e.target.value)}
                    placeholder="Ex: 12 × 8 × 5 cm" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Matière</label>
                  <input type="text" value={form.material} onChange={e => update('material', e.target.value)}
                    placeholder="Ex: Métal, Bois, Porcelaine" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Provenance</label>
                  <input type="text" value={form.provenance} onChange={e => update('provenance', e.target.value)}
                    placeholder="Ex: Grenier familial, Vente Maîtres" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Défauts / Usures à signaler</label>
                <input type="text" value={form.defects_noted} onChange={e => update('defects_noted', e.target.value)}
                  placeholder="Ex: Petite éraflure sur le cadran, couleur légèrement passée" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.authenticity_declared}
                  onChange={e => update('authenticity_declared', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-gray-700">Je déclare l&apos;authenticité de cet objet (sur l&apos;honneur)</span>
              </label>
            </div>

            {/* Prix / Échange */}
            {form.mode === 'vente' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prix (€) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">€</span>
                  <input
                    type="number" min={0} step={0.01}
                    value={form.price}
                    onChange={e => update('price', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            )}

            {form.mode === 'echange' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Objet(s) souhaité(s) en échange</label>
                <textarea
                  value={form.exchange_expected}
                  onChange={e => update('exchange_expected', e.target.value)}
                  rows={2}
                  placeholder="Ex : Cherche figurines Tintin, cartes Pokémon 1ère gen, montre ancienne…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
                />
              </div>
            )}

            {/* Lieu & livraison */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><MapPin className="w-4 h-4" /> Localisation & remise</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ville <span className="text-red-500">*</span></label>
                  <input type="text" value={form.city} onChange={e => update('city', e.target.value)}
                    placeholder="Ex: Biguglia" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Code postal</label>
                  <input type="text" value={form.postal_code} onChange={e => update('postal_code', e.target.value)}
                    placeholder="Ex: 20620" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.local_meetup_available}
                    onChange={e => update('local_meetup_available', e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Remise en main propre possible</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.shipping_available}
                    onChange={e => update('shipping_available', e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <Truck className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Envoi postal possible (frais à négocier)</span>
                </label>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tags <span className="text-gray-400">(optionnel, max 8)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map((tag, i) => (
                  <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
                    {tag}
                    <button onClick={() => update('tags', form.tags.filter((_, j) => j !== i))} className="hover:text-red-500 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {form.tags.length < 8 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                        e.preventDefault();
                        const t = tagInput.trim().toLowerCase();
                        if (!form.tags.includes(t)) update('tags', [...form.tags, t]);
                        setTagInput('');
                      }
                    }}
                    placeholder="Ajouter un tag…"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                  <button
                    onClick={() => {
                      const t = tagInput.trim().toLowerCase();
                      if (t && !form.tags.includes(t)) { update('tags', [...form.tags, t]); setTagInput(''); }
                    }}
                    className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium text-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Étape 4 : Photos ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Photos de l&apos;objet</h2>
            <p className="text-gray-500 text-sm mb-4">
              Ajoutez jusqu&apos;à {MAX_PHOTOS} photos HD. La première photo (⭐) sera la photo de couverture.
            </p>

            {/* Zone de dépôt */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={form.photos.length >= MAX_PHOTOS}
              className={cn(
                'w-full border-2 border-dashed rounded-2xl p-8 text-center transition mb-4',
                form.photos.length >= MAX_PHOTOS
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 cursor-pointer'
              )}
            >
              <Camera className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="font-semibold text-blue-700">
                {form.photos.length >= MAX_PHOTOS ? 'Maximum atteint' : 'Cliquez ou glissez vos photos ici'}
              </p>
              <p className="text-xs text-blue-500 mt-1">JPG, PNG, WebP — max {MAX_FILE_MB} Mo chacune</p>
              <p className="text-xs text-gray-400 mt-0.5">{form.photos.length}/{MAX_PHOTOS} photo{form.photos.length > 1 ? 's' : ''}</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />

            {/* Grille photos */}
            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {form.photos.map((photo, i) => (
                  <div key={i} className={cn(
                    'relative group aspect-square rounded-xl overflow-hidden border-2',
                    photo.is_cover ? 'border-amber-400 shadow-md' : 'border-gray-200',
                    photo.error ? 'border-red-400' : ''
                  )}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.preview} alt="" className="w-full h-full object-cover" />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      {!photo.is_cover && (
                        <button onClick={() => setCover(i)} title="Définir comme couverture"
                          className="p-1.5 bg-amber-400 rounded-full text-white">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => removePhoto(i)} title="Supprimer"
                        className="p-1.5 bg-red-500 rounded-full text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Badges */}
                    {photo.is_cover && (
                      <span className="absolute top-1 left-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" /> Couverture
                      </span>
                    )}
                    {photo.uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    {photo.error && (
                      <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-200" />
                      </div>
                    )}
                    {photo.url && !photo.uploading && (
                      <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Bouton ajouter */}
                {form.photos.length < MAX_PHOTOS && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-500 transition"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                )}
              </div>
            )}

            {/* Conseil */}
            <div className="mt-4 bg-blue-50 rounded-xl p-4 flex gap-3">
              <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Conseils pour de bonnes photos</p>
                <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
                  <li>• Fond neutre (blanc, bois clair)</li>
                  <li>• Lumière naturelle sans flash direct</li>
                  <li>• Vue de face, de profil, des détails importants</li>
                  <li>• Montrez les défauts avec honnêteté — les acheteurs apprécient</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Étape 5 : Aperçu & Publication ──────────────────────────────── */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Aperçu & publication</h2>
            <p className="text-gray-500 text-sm mb-6">Vérifiez les informations avant de publier votre annonce.</p>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-6">
              {/* Photo couverture */}
              {form.photos.length > 0 && (
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.photos.find(p => p.is_cover)?.preview || form.photos[0].preview}
                    alt={form.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {form.photos.length === 0 && (
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                </div>
              )}

              <div className="p-5 space-y-3">
                {/* Mode & catégorie */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const cfg = MODE_CONFIG[form.mode];
                    const Icon = cfg.icon;
                    return (
                      <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border', cfg.bg, cfg.color, cfg.border)}>
                        <Icon className="w-3.5 h-3.5" /> {cfg.label}
                      </span>
                    );
                  })()}
                  {form.category_id && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {categories.find(c => c.id === form.category_id)?.icon} {categories.find(c => c.id === form.category_id)?.name}
                    </span>
                  )}
                  {form.rarity_level && form.rarity_level !== 'commun' && (
                    <span className="text-sm font-medium">
                      {RARITY_CONFIG[form.rarity_level].icon} {RARITY_CONFIG[form.rarity_level].label}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900">{form.title || <em className="text-gray-400">Sans titre</em>}</h3>

                {form.mode === 'vente' && form.price && (
                  <p className="text-2xl font-bold text-blue-700">{Number(form.price).toLocaleString('fr-FR')} €</p>
                )}
                {form.mode === 'echange' && form.exchange_expected && (
                  <p className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                    <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1" />
                    Cherche : {form.exchange_expected}
                  </p>
                )}
                {form.mode === 'don' && (
                  <p className="text-sm text-emerald-700 font-semibold">Gratuit 🎁</p>
                )}

                <p className="text-sm text-gray-600 line-clamp-3">{form.description}</p>

                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  {form.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{form.city}</span>}
                  {form.condition && <span className={cn('px-2 py-0.5 rounded text-xs font-medium', CONDITION_CONFIG[form.condition]?.color)}>{CONDITION_CONFIG[form.condition]?.label}</span>}
                  {form.shipping_available && <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Envoi possible</span>}
                </div>

                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-400 pt-1 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {form.photos.length} photo{form.photos.length > 1 ? 's' : ''}
                  {form.authenticity_declared && <span className="ml-2 text-emerald-600 font-medium">✓ Authenticité déclarée</span>}
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Checklist avant publication</h3>
              {[
                { label: 'Mode choisi', ok: !!form.mode },
                { label: 'Catégorie sélectionnée', ok: !!form.category_id },
                { label: 'Titre renseigné (5+ car.)', ok: form.title.length >= 5 },
                { label: 'Description (20+ car.)', ok: form.description.length >= 20 },
                { label: `Photos ajoutées (${form.photos.length}/${MAX_PHOTOS})`, ok: form.photos.length > 0 },
                { label: 'Ville renseignée', ok: !!form.city.trim() },
                { label: 'Prix renseigné', ok: form.mode !== 'vente' || !!form.price, optional: form.mode !== 'vente' },
              ].map((item, i) => (
                <div key={i} className={cn('flex items-center gap-2 text-sm', item.optional ? 'opacity-60' : '')}>
                  {item.ok ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                  <span className={item.ok ? 'text-gray-700' : 'text-amber-700'}>{item.label}</span>
                  {item.optional && <span className="text-xs text-gray-400">(optionnel)</span>}
                </div>
              ))}
            </div>

            {/* Boutons édition */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {STEPS.slice(0, 4).map(s => (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition"
                >
                  <Pencil className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barre de navigation fixe en bas */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={goPrev}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour
            </button>
          )}
          <button
            onClick={goNext}
            disabled={submitting}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition',
              step === 5
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700',
              submitting && 'opacity-60 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Publication en cours…</>
            ) : step === 5 ? (
              <><CheckCircle2 className="w-5 h-5" /> Publier l&apos;annonce</>
            ) : (
              <>Continuer <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
