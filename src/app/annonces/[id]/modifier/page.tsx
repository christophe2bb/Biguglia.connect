'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, X, ChevronLeft, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ListingCategory } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Link from 'next/link';

interface ExistingPhoto {
  id: string;
  url: string;
  display_order: number;
}

export default function ModifierAnnoncePage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    listing_type: 'sale',
    price: '',
    condition: '',
    location: 'Biguglia',
    status: 'active',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { router.push('/connexion'); return; }

    const fetchData = async () => {
      const supabase = createClient();

      // Charger les catégories
      const { data: cats } = await supabase
        .from('listing_categories')
        .select('*')
        .order('display_order');
      setCategories(cats || []);

      // Charger l'annonce
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

      // Vérifier que c'est bien l'auteur (ou admin)
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
        condition: data.condition || '',
        location: data.location || 'Biguglia',
        status: data.status || 'active',
      });

      const photos = (data.photos || []) as ExistingPhoto[];
      photos.sort((a, b) => a.display_order - b.display_order);
      setExistingPhotos(photos);
      setLoading(false);
    };

    fetchData();
  }, [id, profile, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.title.trim() || !form.description.trim() || !form.category_id) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Mettre à jour l'annonce
    const { error } = await supabase
      .from('listings')
      .update({
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: form.category_id,
        listing_type: form.listing_type,
        price: form.price ? parseFloat(form.price) : null,
        condition: form.condition || null,
        location: form.location || 'Biguglia',
        status: form.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id as string);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      setSaving(false);
      return;
    }

    // Supprimer les photos marquées pour suppression
    for (const photoId of deletedPhotoIds) {
      await supabase.from('listing_photos').delete().eq('id', photoId);
    }

    // Uploader les nouvelles photos
    for (const photo of newPhotos) {
      const ext = photo.name.split('.').pop() || 'jpg';
      const fileName = `listings/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage
        .from('photos')
        .upload(fileName, photo, { upsert: true });

      if (up && !upErr) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
        await supabase.from('listing_photos').insert({
          listing_id: id,
          url: publicUrl,
          display_order: existingPhotos.length,
        });
      }
    }

    toast.success('Annonce modifiée !');
    router.push(`/annonces/${id}`);
  };

  const removeExistingPhoto = (photoId: string) => {
    setDeletedPhotoIds(prev => [...prev, photoId]);
    setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {/* Statut */}
          <Select
            label="Statut de l'annonce"
            value={form.status}
            onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
          >
            <option value="active">✅ Active — visible par tous</option>
            <option value="sold">🏷️ Vendu / Donné</option>
            <option value="reserved">⏳ Réservé</option>
            <option value="inactive">👁️ Masquée</option>
          </Select>

          <Select
            label="Type d'annonce"
            value={form.listing_type}
            onChange={(e) => setForm(f => ({ ...f, listing_type: e.target.value }))}
          >
            <option value="sale">À vendre</option>
            <option value="wanted">Je recherche</option>
            <option value="free">Je donne (gratuit)</option>
            <option value="service">Service proposé</option>
          </Select>

          <Select
            label="Catégorie *"
            value={form.category_id}
            onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner une catégorie...</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
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

          {form.listing_type === 'sale' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prix (€)"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0"
              />
              <Select
                label="État"
                value={form.condition}
                onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}
              >
                <option value="">Sélectionner...</option>
                <option value="neuf">Neuf</option>
                <option value="tres_bon">Très bon état</option>
                <option value="bon">Bon état</option>
                <option value="usage">Usagé</option>
              </Select>
            </div>
          )}

          <Input
            label="Lieu"
            value={form.location}
            onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
          />
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">
            Photos ({existingPhotos.length + newPhotos.length}/5)
          </h3>

          <div className="flex flex-wrap gap-3 mb-4">
            {/* Photos existantes */}
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative w-24 h-24 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Photo annonce"
                  className="w-full h-full object-cover rounded-xl border border-gray-200"
                />
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

            {/* Nouvelles photos */}
            {newPhotos.map((photo, i) => (
              <div key={i} className="relative w-24 h-24 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Nouvelle photo ${i + 1}`}
                  className="w-full h-full object-cover rounded-xl border-2 border-brand-300"
                />
                <button
                  type="button"
                  onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-1 left-1 text-[10px] bg-brand-500/80 text-white px-1 rounded">nouvelle</span>
              </div>
            ))}

            {/* Bouton ajouter */}
            {existingPhotos.length + newPhotos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:border-brand-300 hover:bg-brand-50 transition-all"
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
              const total = existingPhotos.length + newPhotos.length + files.length;
              if (total > 5) {
                toast.error('Maximum 5 photos autorisées');
                return;
              }
              setNewPhotos(prev => [...prev, ...files]);
            }}
          />
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <Link
            href={`/annonces/${id}`}
            className="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" className="flex-2" loading={saving} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </div>
  );
}
