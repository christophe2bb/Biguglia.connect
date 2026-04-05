'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, MapPin, Clock, Users, ArrowLeft, PartyPopper,
  ImageIcon, X, Loader2, Euro, Globe, Phone,
  Accessibility, Tag, Save, AlertCircle,
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

export default function ModifierEvenementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [form, setForm] = useState<EventForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string; display_order: number }[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm(f => f ? { ...f, [key]: value } : f);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      let data = null;
      const { data: d1, error: e1 } = await supabase
        .from('events')
        .select('*, photos:event_photos(id, url, display_order)')
        .eq('id', id)
        .single();
      if (!e1 && d1) {
        data = d1;
      } else {
        const { data: d2 } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        data = d2;
      }

      if (!data) { toast.error('Événement introuvable'); router.push('/evenements'); return; }
      if (!profile || (profile.id !== data.author_id && profile.role !== 'admin' && profile.role !== 'moderator')) {
        setNotAllowed(true); setLoading(false); return;
      }

      setExistingPhotos(data.photos ?? []);
      setForm({
        title: data.title ?? '',
        subtitle: data.subtitle ?? '',
        description: data.description ?? '',
        category: data.category ?? 'autres',
        event_date: data.event_date ?? '',
        event_end_date: data.event_end_date ?? '',
        start_time: data.start_time ?? data.event_time ?? '18:00',
        end_time: data.end_time ?? '',
        location: data.location ?? 'Biguglia',
        location_area: data.location_area ?? '',
        location_detail: data.location_detail ?? '',
        organizer_name: data.organizer_name ?? '',
        price_type: (data.price_type as 'gratuit' | 'payant' | 'libre') ?? (data.is_free ? 'gratuit' : 'payant'),
        price_amount: data.price_amount ? String(data.price_amount) : data.price ? String(data.price) : '',
        capacity: data.capacity ? String(data.capacity) : data.max_participants ? String(data.max_participants) : '',
        is_unlimited: data.is_unlimited ?? (!data.max_participants && !data.capacity),
        registration_open: data.registration_open ?? true,
        accessibility: data.accessibility ?? '',
        contact_info: data.contact_info ?? '',
        external_link: data.external_link ?? '',
        target_audience: data.target_audience ?? '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
      });
    } catch (err) {
      console.error(err);
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [id, profile, supabase, router]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)
    );
    const maxNew = 8 - existingPhotos.length;
    const toAdd = files.slice(0, maxNew);
    setNewPhotos(p => [...p, ...toAdd]);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setNewPreviews(p => [...p, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const removeNewPhoto = (i: number) => {
    setNewPhotos(p => p.filter((_, idx) => idx !== i));
    setNewPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const removeExistingPhoto = async (photoId: string) => {
    await supabase.from('event_photos').delete().eq('id', photoId);
    setExistingPhotos(p => p.filter(ph => ph.id !== photoId));
    toast.success('Photo supprimée');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !profile) return;
    if (!form.title.trim()) { toast.error('Le titre est requis'); return; }
    if (!form.event_date) { toast.error('La date est requise'); return; }

    setSubmitting(true);
    try {
      const tags = form.tags.trim()
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const updates = {
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
        registration_open: form.registration_open,
        tags,
        accessibility: form.accessibility.trim(),
        contact_info: form.contact_info.trim(),
        external_link: form.external_link.trim(),
        target_audience: form.target_audience.trim(),
        updated_at: new Date().toISOString(),
      };

      // Try events table first, then local_events
      const { error: e1 } = await supabase.from('events').update(updates).eq('id', id);
      if (e1) {
        const { error: e2 } = await supabase.from('events').update(updates).eq('id', id);
        if (e2) { toast.error('Erreur lors de la mise à jour'); return; }
      }

      // Upload new photos
      if (newPhotos.length > 0) {
        const nextOrder = existingPhotos.length;
        toast.loading(`Upload ${newPhotos.length} photo(s)...`, { id: 'photo-upload' });
        for (let i = 0; i < newPhotos.length; i++) {
          const file = newPhotos[i];
          const ext = file.name.split('.').pop() ?? 'jpg';
          const path = `events/${id}/${Date.now()}_${i}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
            await supabase.from('event_photos').insert({
              event_id: id, url: publicUrl, display_order: nextOrder + i, is_cover: nextOrder + i === 0,
            });
          }
        }
        toast.dismiss('photo-upload');
      }

      toast.success('✅ Événement mis à jour !');
      router.push(`/evenements/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (notAllowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="font-black text-gray-900 text-xl mb-2">Accès refusé</h2>
          <p className="text-gray-500 text-sm mb-4">Vous ne pouvez pas modifier cet événement.</p>
          <Link href="/evenements" className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
            Retour aux événements
          </Link>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href={`/evenements/${id}`} className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour à l&apos;événement
          </Link>
          <h1 className="text-2xl font-black">Modifier l&apos;événement</h1>
          <p className="text-white/70 text-sm mt-1">{form.title || 'Modifier les informations'}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Informations essentielles ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-900 text-lg">Informations essentielles</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre *</label>
              <input type="text" required placeholder="Titre de l'événement"
                value={form.title} onChange={e => setField('title', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sous-titre <span className="text-gray-400 font-normal">(optionnel)</span></label>
              <input type="text" placeholder="Courte accroche"
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
              <input type="text" placeholder={profile?.full_name ?? "Nom de l'organisateur"}
                value={form.organizer_name} onChange={e => setField('organizer_name', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea placeholder="Décrivez l'événement..."
                rows={5} value={form.description} onChange={e => setField('description', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>

          {/* ── Date, heure & capacité ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-900 text-lg">Date, heure & capacité</h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Calendar className="inline w-3.5 h-3.5 mr-1" />Date de début *
                </label>
                <input type="date" required
                  value={form.event_date} onChange={e => setField('event_date', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Calendar className="inline w-3.5 h-3.5 mr-1" />Date de fin
                </label>
                <input type="date" min={form.event_date}
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
                  <Clock className="inline w-3.5 h-3.5 mr-1" />Heure de fin
                </label>
                <input type="time" value={form.end_time} onChange={e => setField('end_time', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>

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

            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
              <input type="checkbox" id="reg-open" checked={form.registration_open}
                onChange={e => setField('registration_open', e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded" />
              <label htmlFor="reg-open" className="text-sm font-semibold text-purple-800 cursor-pointer">
                Inscriptions ouvertes
              </label>
            </div>
          </div>

          {/* ── Informations pratiques ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-900 text-lg">Informations pratiques</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <MapPin className="inline w-3.5 h-3.5 mr-1" />Lieu *
              </label>
              <input type="text" placeholder="Ex: Place du village..."
                value={form.location} onChange={e => setField('location', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Secteur / Quartier</label>
                <input type="text" placeholder="Ex: Centre-ville..."
                  value={form.location_area} onChange={e => setField('location_area', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Détails lieu</label>
                <input type="text" placeholder="Ex: Entrée par la rue..."
                  value={form.location_detail} onChange={e => setField('location_detail', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Tag className="inline w-3.5 h-3.5 mr-1" />Public cible
              </label>
              <input type="text" placeholder="Ex: Tout public, Familles..."
                value={form.target_audience} onChange={e => setField('target_audience', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Accessibility className="inline w-3.5 h-3.5 mr-1" />Accessibilité
              </label>
              <input type="text" placeholder="Ex: PMR, LSF..."
                value={form.accessibility} onChange={e => setField('accessibility', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Phone className="inline w-3.5 h-3.5 mr-1" />Contact
              </label>
              <input type="text" placeholder="Téléphone, email..."
                value={form.contact_info} onChange={e => setField('contact_info', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Globe className="inline w-3.5 h-3.5 mr-1" />Lien externe
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
              <input type="text" placeholder="Ex: musique, famille, gratuit..."
                value={form.tags} onChange={e => setField('tags', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>

          {/* ── Photos ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-900 text-lg">Photos</h2>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />

            {/* Existing photos */}
            {existingPhotos.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-2">Photos actuelles</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {existingPhotos.map((p, i) => (
                    <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group/img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`photo ${i+1}`} className="w-full h-full object-cover" />
                      {i === 0 && (
                        <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
                          Couverture
                        </div>
                      )}
                      <button type="button" onClick={() => removeExistingPhoto(p.id)}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New photos */}
            {newPreviews.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-2">Nouvelles photos</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {newPreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group/img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`nouvelle photo ${i+1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeNewPhoto(i)}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(existingPhotos.length + newPhotos.length) < 8 && (
              <button type="button" onClick={() => photoInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-purple-200 text-purple-500 hover:border-purple-400 hover:bg-purple-50 rounded-xl py-4 text-sm font-semibold transition-all">
                <ImageIcon className="w-4 h-4" />
                {existingPhotos.length + newPhotos.length === 0 ? 'Ajouter des photos' : `Ajouter (${existingPhotos.length + newPhotos.length}/8)`}
              </button>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <Link href={`/evenements/${id}`}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-all">
              <X className="w-4 h-4" /> Annuler
            </Link>
            <button type="submit" disabled={submitting || !form.title || !form.event_date}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                : <><Save className="w-4 h-4" /> Enregistrer les modifications</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
