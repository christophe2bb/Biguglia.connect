'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, MapPin, Clock, Users, ArrowLeft, PartyPopper,
  ImageIcon, X, Loader2, Euro, Plus, Info, Globe, Phone,
  Accessibility, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { EVENT_CATEGORIES_LIST } from '@/lib/events';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EventForm {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  event_date: string;
  event_end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  location_area: string;
  location_detail: string;
  organizer_name: string;
  price_type: 'gratuit' | 'payant' | 'libre';
  price_amount: string;
  capacity: string;
  is_unlimited: boolean;
  registration_open: boolean;
  accessibility: string;
  contact_info: string;
  external_link: string;
  target_audience: string;
  tags: string;
}

const DEFAULT_FORM: EventForm = {
  title: '',
  subtitle: '',
  description: '',
  category: 'fete_locale',
  event_date: '',
  event_end_date: '',
  start_time: '18:00',
  end_time: '',
  location: 'Biguglia',
  location_area: '',
  location_detail: '',
  organizer_name: '',
  price_type: 'gratuit',
  price_amount: '',
  capacity: '',
  is_unlimited: false,
  registration_open: true,
  accessibility: '',
  contact_info: '',
  external_link: '',
  target_audience: '',
  tags: '',
};

type FormStep = 'essentiel' | 'details' | 'pratique' | 'photos';

export default function NouvelEvenementPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [form, setForm] = useState<EventForm>(DEFAULT_FORM);
  const [step, setStep] = useState<FormStep>('essentiel');
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const setField = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)
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
  };

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPhotoPreviews(p => p.filter((_, idx) => idx !== i));
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour créer un événement'); return; }
    if (!form.title.trim()) { toast.error('Le titre est requis'); return; }
    if (!form.event_date) { toast.error('La date est requise'); return; }

    setSubmitting(true);
    try {
      const tags = form.tags.trim()
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const eventData = {
        author_id: profile.id,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        category: form.category,
        event_date: form.event_date,
        event_end_date: form.event_end_date || null,
        start_time: form.start_time || '18:00',
        end_time: form.end_time || null,
        location: form.location.trim() || 'Biguglia',
        location_area: form.location_area.trim(),
        location_detail: form.location_detail.trim(),
        organizer_name: form.organizer_name.trim(),
        price_type: form.price_type,
        price_amount: form.price_type === 'payant' && form.price_amount ? parseFloat(form.price_amount) : null,
        capacity: !form.is_unlimited && form.capacity ? parseInt(form.capacity) : null,
        is_unlimited: form.is_unlimited,
        status: 'a_venir',
        registration_open: form.registration_open,
        tags,
        accessibility: form.accessibility.trim(),
        contact_info: form.contact_info.trim(),
        external_link: form.external_link.trim(),
        target_audience: form.target_audience.trim(),
      };

      // Try 'events' table first, fallback to 'local_events'
      let eventId: string | null = null;
      const { data: newEvent, error: evErr } = await supabase
        .from('events').insert(eventData).select('id').single();

      if (evErr) {
        // Fallback to legacy local_events
        const legacyData = {
          author_id: profile.id,
          title: form.title.trim(),
          description: form.description.trim(),
          event_date: form.event_date,
          event_time: form.start_time || '18:00',
          location: form.location.trim() || 'Biguglia',
          category: form.category,
          organizer_name: form.organizer_name.trim(),
          max_participants: !form.is_unlimited && form.capacity ? parseInt(form.capacity) : null,
          is_free: form.price_type === 'gratuit',
          price: form.price_type === 'payant' && form.price_amount ? parseFloat(form.price_amount) : null,
          status: 'a_venir',
          tags,
        };
        const { data: legEv, error: legErr } = await supabase
          .from('local_events').insert(legacyData).select('id').single();
        if (legErr) throw legErr;
        eventId = legEv?.id;
      } else {
        eventId = newEvent?.id;
      }

      if (!eventId) throw new Error('Pas d\'ID événement');

      // Upload photos
      if (photos.length > 0) {
        toast.loading(`Upload ${photos.length} photo(s)...`, { id: 'photo-upload' });
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const ext = file.name.split('.').pop() ?? 'jpg';
          const path = `events/${eventId}/${Date.now()}_${i}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
            await supabase.from('event_photos').insert({
              event_id: eventId, url: publicUrl, display_order: i, is_cover: i === 0,
            });
          }
        }
        toast.dismiss('photo-upload');
      }

      toast.success('Événement publié !');
      router.push(`/evenements/${eventId}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-sm">
          <PartyPopper className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h2 className="font-black text-gray-900 text-xl mb-2">Connexion requise</h2>
          <p className="text-gray-500 text-sm mb-4">Connectez-vous pour créer un événement.</p>
          <Link href="/connexion" className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const STEPS: { id: FormStep; label: string; icon: React.ElementType }[] = [
    { id: 'essentiel', label: 'Essentiel', icon: Info },
    { id: 'details', label: 'Détails', icon: Calendar },
    { id: 'pratique', label: 'Pratique', icon: MapPin },
    { id: 'photos', label: 'Photos', icon: ImageIcon },
  ];

  const stepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/evenements" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour aux événements
          </Link>
          <h1 className="text-2xl font-black">Créer un événement</h1>
          <p className="text-white/70 text-sm mt-1">Partagez votre événement avec la communauté de Biguglia</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(s.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                s.id === step
                  ? 'bg-purple-600 text-white shadow-sm'
                  : i < stepIndex
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}>
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
              {i < stepIndex && <span className="text-emerald-500 text-xs">✓</span>}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">

            {/* ── STEP 1: Essentiel ── */}
            {step === 'essentiel' && (
              <>
                <h2 className="font-black text-gray-900 text-lg">Informations essentielles</h2>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre *</label>
                  <input type="text" required placeholder="Ex: Tournoi de pétanque inter-quartiers"
                    value={form.title} onChange={e => setField('title', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sous-titre <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <input type="text" placeholder="Courte accroche ou précision"
                    value={form.subtitle} onChange={e => setField('subtitle', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catégorie *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {EVENT_CATEGORIES_LIST.map(c => (
                      <button type="button" key={c.id} onClick={() => setField('category', c.id)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                          form.category === c.id
                            ? `${c.bg} ${c.color} ${c.border}`
                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                        }`}>
                        <span className="text-xl">{c.icon}</span>
                        <span className="text-center leading-tight">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organisateur</label>
                  <input type="text" placeholder={profile.full_name ?? "Nom de l'association ou personne"}
                    value={form.organizer_name} onChange={e => setField('organizer_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea placeholder="Décrivez l'événement, le programme, les informations pratiques..."
                    rows={5} value={form.description} onChange={e => setField('description', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </>
            )}

            {/* ── STEP 2: Détails ── */}
            {step === 'details' && (
              <>
                <h2 className="font-black text-gray-900 text-lg">Date, heure & capacité</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      <Calendar className="inline w-3.5 h-3.5 mr-1" />Date de début *
                    </label>
                    <input type="date" required min={new Date().toISOString().split('T')[0]}
                      value={form.event_date} onChange={e => setField('event_date', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      <Calendar className="inline w-3.5 h-3.5 mr-1" />Date de fin <span className="text-gray-400 font-normal">(si multi-jours)</span>
                    </label>
                    <input type="date" min={form.event_date || new Date().toISOString().split('T')[0]}
                      value={form.event_end_date} onChange={e => setField('event_end_date', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      <Clock className="inline w-3.5 h-3.5 mr-1" />Heure de début
                    </label>
                    <input type="time" value={form.start_time} onChange={e => setField('start_time', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      <Clock className="inline w-3.5 h-3.5 mr-1" />Heure de fin <span className="text-gray-400 font-normal">(optionnel)</span>
                    </label>
                    <input type="time" value={form.end_time} onChange={e => setField('end_time', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Users className="inline w-3.5 h-3.5 mr-1" />Capacité
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.is_unlimited} onChange={() => setField('is_unlimited', true)} className="accent-purple-600" />
                      <span className="text-sm font-medium">Illimitée</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={!form.is_unlimited} onChange={() => setField('is_unlimited', false)} className="accent-purple-600" />
                      <span className="text-sm font-medium">Limitée</span>
                    </label>
                  </div>
                  {!form.is_unlimited && (
                    <input type="number" placeholder="Nombre max de participants" min="1"
                      value={form.capacity} onChange={e => setField('capacity', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  )}
                </div>

                {/* Prix */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Euro className="inline w-3.5 h-3.5 mr-1" />Tarif
                  </label>
                  <div className="flex gap-3 flex-wrap mb-2">
                    {(['gratuit', 'libre', 'payant'] as const).map(pt => (
                      <label key={pt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.price_type === pt} onChange={() => setField('price_type', pt)} className="accent-purple-600" />
                        <span className="text-sm capitalize">{pt === 'libre' ? 'Prix libre' : pt}</span>
                      </label>
                    ))}
                  </div>
                  {form.price_type === 'payant' && (
                    <input type="number" placeholder="Montant (€)" min="0" step="0.50"
                      value={form.price_amount} onChange={e => setField('price_amount', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  )}
                </div>

                {/* Inscriptions */}
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <input type="checkbox" id="reg-open" checked={form.registration_open}
                    onChange={e => setField('registration_open', e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded" />
                  <label htmlFor="reg-open" className="text-sm font-semibold text-purple-800 cursor-pointer">
                    Inscriptions ouvertes dès la publication
                  </label>
                </div>
              </>
            )}

            {/* ── STEP 3: Pratique ── */}
            {step === 'pratique' && (
              <>
                <h2 className="font-black text-gray-900 text-lg">Informations pratiques</h2>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <MapPin className="inline w-3.5 h-3.5 mr-1" />Lieu *
                  </label>
                  <input type="text" placeholder="Ex: Place du village, Salle des fêtes..."
                    value={form.location} onChange={e => setField('location', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Secteur / Quartier</label>
                    <input type="text" placeholder="Ex: Centre-ville, Nord..."
                      value={form.location_area} onChange={e => setField('location_area', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Détails lieu</label>
                    <input type="text" placeholder="Ex: Entrée rue de la Paix, 1er étage..."
                      value={form.location_detail} onChange={e => setField('location_detail', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Tag className="inline w-3.5 h-3.5 mr-1" />Public cible
                  </label>
                  <input type="text" placeholder="Ex: Tout public, Familles, 18+, Enfants 6-12 ans..."
                    value={form.target_audience} onChange={e => setField('target_audience', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Accessibility className="inline w-3.5 h-3.5 mr-1" />Accessibilité
                  </label>
                  <input type="text" placeholder="Ex: PMR, interprète LSF, rampe d'accès..."
                    value={form.accessibility} onChange={e => setField('accessibility', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Phone className="inline w-3.5 h-3.5 mr-1" />Contact
                  </label>
                  <input type="text" placeholder="Téléphone, email, WhatsApp..."
                    value={form.contact_info} onChange={e => setField('contact_info', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Globe className="inline w-3.5 h-3.5 mr-1" />Lien externe <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input type="url" placeholder="https://..."
                    value={form.external_link} onChange={e => setField('external_link', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mots-clés <span className="text-gray-400 font-normal">(séparés par des virgules)</span>
                  </label>
                  <input type="text" placeholder="Ex: musique, famille, gratuit, été..."
                    value={form.tags} onChange={e => setField('tags', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </>
            )}

            {/* ── STEP 4: Photos ── */}
            {step === 'photos' && (
              <>
                <h2 className="font-black text-gray-900 text-lg">Photos</h2>
                <p className="text-gray-500 text-sm">Ajoutez jusqu&apos;à 8 photos. La première sera l&apos;image principale.</p>

                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />

                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photoPreviews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group/img">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`photo ${i+1}`} className="w-full h-full object-cover" />
                        {i === 0 && (
                          <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
                            Couverture
                          </div>
                        )}
                        <button type="button" onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length < 8 && (
                  <button type="button" onClick={() => photoInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-purple-200 text-purple-500 hover:border-purple-400 hover:bg-purple-50 rounded-xl py-6 text-sm font-semibold transition-all">
                    <ImageIcon className="w-5 h-5" />
                    {photos.length === 0 ? 'Ajouter des photos' : `Ajouter (${photos.length}/8)`}
                  </button>
                )}

                {/* Summary before submit */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1.5">
                  <p className="font-bold text-purple-800 text-sm">Récapitulatif</p>
                  <p className="text-sm text-purple-700">📌 {form.title || 'Sans titre'}</p>
                  <p className="text-sm text-purple-700">📅 {form.event_date || 'Date non définie'} à {form.start_time}</p>
                  <p className="text-sm text-purple-700">📍 {form.location || 'Lieu non défini'}</p>
                  <p className="text-sm text-purple-700">
                    💳 {form.price_type === 'gratuit' ? 'Gratuit' : form.price_type === 'libre' ? 'Prix libre' : `${form.price_amount || '?'} €`}
                    {' · '}
                    {form.is_unlimited ? 'Places illimitées' : form.capacity ? `${form.capacity} places` : 'Capacité non définie'}
                  </p>
                  <p className="text-sm text-purple-700">🖼️ {photos.length} photo{photos.length > 1 ? 's' : ''}</p>
                </div>
              </>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-4 gap-3">
            <button type="button"
              onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].id)}
              disabled={stepIndex === 0}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-30 transition-all">
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>

            {step !== 'photos' ? (
              <button type="button"
                onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].id)}
                className="flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-all">
                Suivant <Plus className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={submitting || !form.title || !form.event_date}
                className="flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : <><PartyPopper className="w-4 h-4" /> Publier l&apos;événement</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
