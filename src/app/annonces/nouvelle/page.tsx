'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, CheckCircle, ChevronRight, ChevronLeft, Clock, Info, Zap, ArrowLeftRight, Key } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ListingCategory } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import ModerationBadge from '@/components/ui/ModerationBadge';
import Link from 'next/link';
import { useModeration } from '@/hooks/useModeration';
import { type ModerationStatus } from '@/lib/moderation';
import SectorFilter from '@/components/ui/SectorFilter';

// All CDC listing types
const LISTING_TYPES = [
  { value: 'sale', label: '🏷️ À vendre', description: 'Vous vendez un article ou un service' },
  { value: 'free', label: '🎁 Je donne (gratuit)', description: 'Article offert gratuitement' },
  { value: 'wanted', label: '🔍 Je recherche', description: 'Vous cherchez un article ou service' },
  { value: 'exchange', label: '🔄 Échange', description: 'Troc d\'articles entre voisins' },
  { value: 'service', label: '🛠️ Service', description: 'Prestation de service proposée' },
  { value: 'rental', label: '🔑 Location courte durée', description: 'Mise en location temporaire' },
];

const CONDITION_OPTIONS = [
  { value: '', label: 'Sélectionner…' },
  { value: 'neuf', label: '✨ Neuf' },
  { value: 'tres_bon', label: '👍 Très bon état' },
  { value: 'bon', label: '👌 Bon état' },
  { value: 'usage', label: '🔧 Usagé' },
  { value: 'a_reparer', label: '🔨 À réparer' },
  { value: 'lot', label: '📦 Lot' },
];

export default function NouvelleAnnoncePage() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);

  const [form, setForm] = useState({
    listing_type: 'sale',
    category_id: '',
    title: '',
    description: '',
    price: '',
    is_negotiable: false,
    is_urgent: false,
    condition: '',
    condition_state: '',
    exchange_preferences: '',
    pickup_notes: '',
    availability_window: '',
    location: 'Biguglia',
    sector_id: '',
    // Engagement checkboxes
    check_sincere: false,
    check_legal: false,
    check_available: false,
  });

  const { submitForModeration } = useModeration();

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.push('/connexion?redirect=/annonces/nouvelle');
      return;
    }
    if (profile.home_sector_id) {
      setForm(f => ({ ...f, sector_id: profile.home_sector_id ?? '' }));
    }
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('listing_categories').select('*').order('display_order');
      setCategories(data || []);
    };
    fetchCategories();
  }, [profile, authLoading, router]);

  const addPhotos = (files: File[]) => {
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos(p => [...p, ...toAdd]);
    const newPreviews = toAdd.map(f => URL.createObjectURL(f));
    setPreviews(p => [...p, ...newPreviews]);
  };

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setPhotos(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!form.listing_type) { toast.error('Choisissez un type d\'annonce'); return false; }
      if (!form.category_id) { toast.error('Choisissez une catégorie'); return false; }
      if (!form.title.trim() || form.title.length < 5) { toast.error('Titre trop court (min 5 caractères)'); return false; }
      if (!form.description.trim() || form.description.length < 20) { toast.error('Description trop courte (min 20 caractères)'); return false; }
    }
    if (step === 2) {
      if (!form.sector_id) { toast.error('Indiquez le secteur de Biguglia'); return false; }
    }
    if (step === 3) {
      if (!form.check_sincere || !form.check_legal || !form.check_available) {
        toast.error('Veuillez cocher toutes les cases d\'engagement');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (asDraft = false) => {
    if (!profile) return;
    if (!asDraft && (!form.check_sincere || !form.check_legal || !form.check_available)) {
      toast.error('Veuillez cocher toutes les cases d\'engagement');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload: Record<string, unknown> = {
      user_id: profile.id,
      category_id: form.category_id,
      title: form.title.trim(),
      description: form.description.trim(),
      listing_type: form.listing_type,
      price: form.price ? parseFloat(form.price) : null,
      is_negotiable: form.is_negotiable,
      is_urgent: form.is_urgent,
      condition: form.condition || null,
      condition_state: form.condition_state || null,
      exchange_preferences: form.exchange_preferences.trim() || null,
      pickup_notes: form.pickup_notes.trim() || null,
      availability_window: form.availability_window.trim() || null,
      location: form.location || 'Biguglia',
      sector_id: form.sector_id || null,
      status: asDraft ? 'draft' : 'active',
      moderation_status: asDraft ? 'draft' : 'en_attente_validation',
    };

    const { data: listing, error } = await supabase
      .from('listings')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Publication error:', error);
      toast.error(`Erreur : ${error.message}`);
      setLoading(false);
      return;
    }

    // Upload photos
    const photoUrls: string[] = [];
    if (photos.length > 0 && listing) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const ext = photo.name.split('.').pop() || 'jpg';
        const fileName = `listings/${listing.id}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upError } = await supabase.storage
          .from('photos')
          .upload(fileName, photo, { upsert: true });

        if (up && !upError) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
          photoUrls.push(publicUrl);
          await supabase.from('listing_photos').insert({
            listing_id: listing.id,
            url: publicUrl,
            display_order: i,
          });
        }
      }
    }

    if (asDraft) {
      toast.success('Brouillon enregistré !');
      router.push(`/annonces/${listing.id}`);
      return;
    }

    // Submit for moderation
    const modResult = await submitForModeration({
      contentType: 'listing',
      contentId: listing.id,
      contentTitle: form.title.trim(),
      contentExcerpt: form.description.trim(),
      contentPhotos: photoUrls,
      validationData: {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category_id,
        price: form.listing_type === 'sale' ? form.price : '0',
      },
      sourceTable: 'listings',
      authorColumn: 'user_id',
    });

    setModerationStatus(modResult?.status || 'en_attente_validation');
    setPublishedId(listing.id);
    setLoading(false);
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (publishedId) {
    const isPending = moderationStatus === 'en_attente_validation';
    const isPublished = moderationStatus === 'publie';
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className={`flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 ${isPublished ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {isPublished ? <CheckCircle className="w-10 h-10 text-emerald-600" /> : <Clock className="w-10 h-10 text-amber-600" />}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isPublished ? 'Annonce publiée !' : 'Annonce soumise !'}
        </h1>
        <p className="text-gray-500 mb-4">
          {isPublished
            ? 'Votre annonce est maintenant visible par tous les habitants de Biguglia.'
            : 'Votre annonce sera vérifiée par notre équipe sous 24h.'}
        </p>
        {isPending && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <ModerationBadge status="en_attente_validation" size="md" showSublabel showDot className="max-w-xs" />
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-left max-w-sm">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Vous recevrez une notification dès que votre annonce sera validée.
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/annonces/${publishedId}`} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium">
            Voir mon annonce <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/annonces" className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium">
            Toutes les annonces
          </Link>
        </div>
      </div>
    );
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  const STEPS = ['L\'essentiel', 'Localisation & détails', 'Engagement'];
  const stepProgress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Publier une annonce</h1>
          <p className="text-sm text-gray-400">Étape {step}/{STEPS.length} — {STEPS[step - 1]}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${((step) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Moderation notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 mb-6">
        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Toutes les publications sont vérifiées avant d&apos;être visibles. Traitement généralement sous 24h.
        </p>
      </div>

      {/* ── STEP 1 : L'essentiel ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Type selection */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Type d&apos;annonce</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LISTING_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, listing_type: t.value }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                    form.listing_type === t.value
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{t.label.split(' ')[0]}</span>
                  <span className="text-xs font-semibold text-gray-800 leading-tight">{t.label.slice(t.label.indexOf(' ') + 1)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Core fields */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <Select
              label="Catégorie *"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              required
            >
              <option value="">Sélectionner une catégorie…</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>

            <div>
              <Input
                label="Titre *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex : Perceuse Bosch en parfait état"
                required
              />
              <p className="text-xs text-gray-400 mt-1">{form.title.length}/80 caractères</p>
            </div>

            <div>
              <Textarea
                label="Description *"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez l'article en détail : état, dimensions, raison de la vente, etc."
                required
              />
              <p className="text-xs text-gray-400 mt-1">{form.description.length} caractères (min 20)</p>
            </div>

            {/* Price & condition for sale / rental */}
            {(form.listing_type === 'sale' || form.listing_type === 'rental') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label={form.listing_type === 'rental' ? 'Prix / jour (€)' : 'Prix (€)'}
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0"
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_negotiable}
                      onChange={e => setForm(f => ({ ...f, is_negotiable: e.target.checked }))}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-xs text-gray-600">Prix négociable</span>
                  </label>
                </div>
                <Select
                  label="État"
                  value={form.condition}
                  onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                >
                  {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
            )}

            {/* Exchange preferences */}
            {form.listing_type === 'exchange' && (
              <Input
                label="Contre quoi souhaitez-vous échanger ?"
                value={form.exchange_preferences}
                onChange={e => setForm(f => ({ ...f, exchange_preferences: e.target.value }))}
                placeholder="Ex : vélo, livres, outils…"
              />
            )}

            {/* Urgent flag */}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 transition-colors">
              <input
                type="checkbox"
                checked={form.is_urgent}
                onChange={e => setForm(f => ({ ...f, is_urgent: e.target.checked }))}
                className="w-4 h-4 rounded accent-red-500"
              />
              <div>
                <span className="text-sm font-semibold text-red-700 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Annonce urgente
                </span>
                <p className="text-xs text-red-600">Je souhaite conclure rapidement</p>
              </div>
            </label>
          </div>

          <Button
            onClick={() => { if (validateStep()) setStep(2); }}
            className="w-full"
          >
            Continuer → Localisation
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ── STEP 2 : Localisation & détails ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Où vous trouvez-vous ?</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Secteur de Biguglia *
                <span className="ml-1 text-xs font-normal text-gray-400">(obligatoire)</span>
              </label>
              <SectorFilter
                value={form.sector_id || null}
                onChange={id => setForm(f => ({ ...f, sector_id: id || '' }))}
                allowCitywide={false}
                compact
              />
              {!form.sector_id && (
                <p className="text-xs text-red-500 mt-1">Veuillez choisir un secteur</p>
              )}
            </div>

            <Input
              label="Ville / Lieu précis"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Biguglia"
            />

            <Input
              label="Disponibilité pour la remise"
              value={form.availability_window}
              onChange={e => setForm(f => ({ ...f, availability_window: e.target.value }))}
              placeholder="Ex : week-ends, soirs en semaine après 19h"
            />

            <Textarea
              label="Notes de remise / retrait"
              value={form.pickup_notes}
              onChange={e => setForm(f => ({ ...f, pickup_notes: e.target.value }))}
              placeholder="Lieu de rendez-vous, instructions particulières…"
            />
          </div>

          {/* Photos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">
              Photos <span className="font-normal text-gray-400 text-sm">(optionnel, max 5)</span>
            </h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <Camera className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Cliquez pour ajouter des photos</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5 Mo chacune</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                if (photos.length + files.length > 5) {
                  toast.error('Maximum 5 photos autorisées');
                  return;
                }
                addPhotos(files);
              }}
            />
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              ← Retour
            </Button>
            <Button onClick={() => { if (validateStep()) setStep(3); }} className="flex-1">
              Continuer → Engagement
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3 : Engagement ── */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3">Récapitulatif</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">Type :</span> {LISTING_TYPES.find(t => t.value === form.listing_type)?.label}</p>
              <p><span className="font-medium text-gray-800">Titre :</span> {form.title || '—'}</p>
              {form.price && <p><span className="font-medium text-gray-800">Prix :</span> {form.price} €{form.is_negotiable ? ' (négociable)' : ''}</p>}
              {form.sector_id && <p><span className="font-medium text-gray-800">Secteur :</span> {form.sector_id}</p>}
              <p><span className="font-medium text-gray-800">Photos :</span> {photos.length}</p>
              {form.is_urgent && <p className="text-red-600 font-semibold">⚡ Annonce urgente</p>}
            </div>
          </div>

          {/* Engagement checkboxes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Votre engagement</h2>
            <div className="space-y-3">
              {[
                { key: 'check_sincere', label: 'Je publie une annonce sincère et honnête. L\'article est bien tel que décrit.' },
                { key: 'check_legal', label: 'Je certifie que cet article est légal et que j\'ai le droit de le vendre/donner.' },
                { key: 'check_available', label: 'L\'article est disponible et je m\'engage à répondre aux acheteurs intéressés.' },
              ].map(item => (
                <label key={item.key} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={form[item.key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [item.key]: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 rounded accent-blue-600 shrink-0"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              ← Retour
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              loading={loading}
              disabled={loading}
              className="flex-1 border-gray-300 text-gray-600"
            >
              💾 Brouillon
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              loading={loading}
              disabled={loading || !form.check_sincere || !form.check_legal || !form.check_available}
              className="flex-2"
            >
              {loading ? 'Soumission…' : '✅ Soumettre pour validation'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
