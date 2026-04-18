'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, X, ChevronLeft, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ListingCategory } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Link from 'next/link';
import SectorFilter from '@/components/ui/SectorFilter';

interface ExistingPhoto {
  id: string;
  url: string;
  display_order: number;
}

const CONDITION_OPTIONS = [
  { value: '', label: 'Sélectionner…' },
  { value: 'neuf', label: '✨ Neuf' },
  { value: 'tres_bon', label: '👍 Très bon état' },
  { value: 'bon', label: '👌 Bon état' },
  { value: 'usage', label: '🔧 Usagé' },
  { value: 'a_reparer', label: '🔨 À réparer' },
  { value: 'lot', label: '📦 Lot' },
];

export default function ModifierAnnoncePage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    listing_type: 'sale',
    price: '',
    is_negotiable: false,
    is_urgent: false,
    condition: '',
    exchange_preferences: '',
    pickup_notes: '',
    availability_window: '',
    location: 'Biguglia',
    sector_id: '',
    status: 'active',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { router.push('/connexion'); return; }

    const fetchData = async () => {
      const supabase = createClient();

      const { data: cats } = await supabase
        .from('listing_categories')
        .select('*')
        .order('display_order');
      setCategories(cats || []);

      const { data, error } = await supabase
        .from('listings')
        .select('*, photos:listing_photos(id, url, display_order)')
        .eq('id', id as string)
        .single();

      if (error || !data) {
        toast.error('Annonce introuvable');
        router.push('/annonces');
        return;
      }

      if (data.user_id !== profile.id && profile.role !== 'admin') {
        toast.error('Vous n\'êtes pas autorisé à modifier cette annonce');
        router.push(`/annonces/${id}`);
        return;
      }

      setForm({
        title: data.title || '',
        description: data.description || '',
        category_id: data.category_id || '',
        listing_type: data.listing_type || 'sale',
        price: data.price?.toString() || '',
        is_negotiable: data.is_negotiable ?? false,
        is_urgent: data.is_urgent ?? false,
        condition: data.condition || '',
        exchange_preferences: data.exchange_preferences || '',
        pickup_notes: data.pickup_notes || '',
        availability_window: data.availability_window || '',
        location: data.location || 'Biguglia',
        sector_id: data.sector_id || '',
        status: data.status || 'active',
      });

      const photos = (data.photos || []) as ExistingPhoto[];
      photos.sort((a, b) => a.display_order - b.display_order);
      setExistingPhotos(photos);
      setLoading(false);
    };

    fetchData();
  }, [id, profile, authLoading, router]);

  const addNewPhotos = (files: File[]) => {
    const total = existingPhotos.length + newPhotos.length;
    const remaining = 5 - total;
    const toAdd = files.slice(0, remaining);
    setNewPhotos(p => [...p, ...toAdd]);
    setNewPreviews(p => [...p, ...toAdd.map(f => URL.createObjectURL(f))]);
  };

  const removeNewPhoto = (i: number) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewPhotos(p => p.filter((_, j) => j !== i));
    setNewPreviews(p => p.filter((_, j) => j !== i));
  };

  const removeExistingPhoto = (photoId: string) => {
    setDeletedPhotoIds(prev => [...prev, photoId]);
    setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.title.trim() || !form.description.trim() || !form.category_id) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Champs de base toujours présents dans le schéma DB
    const updatePayload: Record<string, unknown> = {
      title:        form.title.trim(),
      description:  form.description.trim(),
      category_id:  form.category_id,
      listing_type: form.listing_type,
      price:        form.price ? parseFloat(form.price) : null,
      is_negotiable: form.is_negotiable,
      is_urgent:    form.is_urgent,
      condition:    form.condition || null,
      location:     form.location || 'Biguglia',
      sector_id:    form.sector_id || null,
      status:       form.status,
      updated_at:   new Date().toISOString(),
    };

    // ── Colonnes optionnelles (migration 20260413_listings_optional_columns.sql) ──
    if (form.exchange_preferences) updatePayload.exchange_preferences = form.exchange_preferences.trim();
    if (form.pickup_notes)         updatePayload.pickup_notes         = form.pickup_notes.trim();
    if (form.availability_window)  updatePayload.availability_window  = form.availability_window.trim();

    const { error } = await supabase
      .from('listings')
      .update(updatePayload)
      .eq('id', id as string);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      setSaving(false);
      return;
    }

    // Delete removed photos
    for (const photoId of deletedPhotoIds) {
      await supabase.from('listing_photos').delete().eq('id', photoId);
    }

    // Upload new photos
    for (let i = 0; i < newPhotos.length; i++) {
      const photo = newPhotos[i];
      const ext = photo.name.split('.').pop() || 'jpg';
      const fileName = `listings/${id}/${Date.now()}_${i}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage
        .from('photos')
        .upload(fileName, photo, { upsert: true });

      if (up && !upErr) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
        await supabase.from('listing_photos').insert({
          listing_id: id,
          url: publicUrl,
          display_order: existingPhotos.length + i,
        });
      }
    }

    toast.success('Annonce modifiée !');
    router.push(`/annonces/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isExchange = form.listing_type === 'exchange';
  const hasPricing = form.listing_type === 'sale' || form.listing_type === 'rental';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/annonces/${id}`} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifier l&apos;annonce</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main fields */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Select
            label="Statut de l'annonce"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          >
            <option value="active">✅ Active — visible par tous</option>
            <option value="reserved">🔒 Réservée</option>
            <option value="sold">🏷️ Vendu / Donné / Échangé</option>
            <option value="draft">📝 Brouillon</option>
            <option value="archived">📦 Archivée</option>
          </Select>

          <Select
            label="Type d'annonce"
            value={form.listing_type}
            onChange={e => setForm(f => ({ ...f, listing_type: e.target.value }))}
          >
            <option value="sale">🏷️ À vendre</option>
            <option value="free">🎁 Je donne (gratuit)</option>
            <option value="wanted">🔍 Je recherche</option>
            <option value="exchange">🔄 Échange</option>
            <option value="service">🛠️ Service</option>
            <option value="rental">🔑 Location courte durée</option>
          </Select>

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

          <Input
            label="Titre *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <Textarea
            label="Description *"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
          />

          {/* Price fields */}
          {hasPricing && (
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
          {isExchange && (
            <Input
              label="Contre quoi souhaitez-vous échanger ?"
              value={form.exchange_preferences}
              onChange={e => setForm(f => ({ ...f, exchange_preferences: e.target.value }))}
              placeholder="Ex : vélo, livres, outils…"
            />
          )}

          {/* Urgent */}
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

        {/* Localisation */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Localisation</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Secteur</label>
            <SectorFilter
              value={form.sector_id || null}
              onChange={sid => setForm(f => ({ ...f, sector_id: sid || '' }))}
              allowCitywide
              compact
            />
          </div>

          <Input
            label="Lieu / Ville"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          />

          <Input
            label="Disponibilité pour la remise"
            value={form.availability_window}
            onChange={e => setForm(f => ({ ...f, availability_window: e.target.value }))}
            placeholder="Ex : week-ends, soirs après 19h"
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
            Photos ({existingPhotos.length + newPhotos.length}/5)
          </h3>

          <div className="flex flex-wrap gap-3 mb-4">
            {/* Existing photos */}
            {existingPhotos.map(photo => (
              <div key={photo.id} className="relative w-24 h-24 group">
                <Image src={photo.url} alt="Photo" fill className="object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(photo.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1 rounded">existante</span>
              </div>
            ))}

            {/* New photos */}
            {newPreviews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 group">
                <Image src={src} alt="" fill unoptimized sizes="96px" className="object-cover rounded-xl border-2 border-blue-300" />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-1 left-1 text-[10px] bg-blue-500/80 text-white px-1 rounded">nouvelle</span>
              </div>
            ))}

            {existingPhotos.length + newPhotos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:border-blue-300 hover:bg-blue-50 transition-all"
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
            onChange={e => {
              const files = Array.from(e.target.files || []);
              const total = existingPhotos.length + newPhotos.length + files.length;
              if (total > 5) { toast.error('Maximum 5 photos autorisées'); return; }
              addNewPhotos(files);
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/annonces/${id}`}
            className="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" className="flex-2" loading={saving} disabled={saving}>
            {saving ? 'Sauvegarde…' : '✅ Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </div>
  );
}
