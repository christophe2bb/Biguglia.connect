'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { EquipmentCategory } from '@/types';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import toast from 'react-hot-toast';

export default function NouveauMaterielPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    condition: 'bon',
    is_free: true,
    daily_rate: '',
    deposit_amount: '',
    pickup_location: 'Biguglia',
    rules: '',
  });

  useEffect(() => {
    if (!profile) { router.push('/connexion?redirect=/materiel/nouveau'); return; }
    const fetchCats = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('equipment_categories').select('*').order('display_order');
      setCategories(data || []);
    };
    fetchCats();
  }, [profile, router]);

  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (photos.length + newPhotos.length > 5) {
      toast.error('Maximum 5 photos');
      return;
    }
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title || !form.description || !form.category_id) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: item, error } = await supabase
      .from('equipment_items')
      .insert({
        owner_id: profile.id,
        category_id: form.category_id,
        title: form.title,
        description: form.description,
        condition: form.condition,
        is_free: form.is_free,
        daily_rate: form.is_free ? null : Number(form.daily_rate) || null,
        deposit_amount: Number(form.deposit_amount) || null,
        pickup_location: form.pickup_location,
        rules: form.rules || null,
        is_available: true,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de la publication');
      setLoading(false);
      return;
    }

    // Upload photos
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const fileName = `equipment/${item.id}/${Date.now()}-${photo.name}`;
      const { data: uploaded } = await supabase.storage.from('photos').upload(fileName, photo, { upsert: true });
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(uploaded.path);
        await supabase.from('equipment_photos').insert({ item_id: item.id, url: publicUrl, display_order: i });
      }
    }

    toast.success('Matériel publié avec succès !');
    router.push(`/materiel/${item.id}`);
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/materiel" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Retour
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposer du matériel</h1>
      <p className="text-gray-500 mb-8">Partagez votre matériel avec la communauté de Biguglia</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Input
            label="Nom du matériel *"
            placeholder="Ex : Perceuse-visseuse Bosch"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <Select
            label="Catégorie *"
            value={form.category_id}
            onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner...</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </Select>

          <Textarea
            label="Description *"
            placeholder="Décrivez le matériel, ses caractéristiques, son état..."
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            required
            className="min-h-[120px]"
          />

          <Select
            label="État du matériel"
            value={form.condition}
            onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}
          >
            <option value="excellent">Excellent</option>
            <option value="bon">Bon état</option>
            <option value="usage">Usagé mais fonctionnel</option>
          </Select>
        </div>

        {/* Tarifs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-medium text-gray-800">Conditions de prêt</h3>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_free: true }))}
              className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${form.is_free ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              🎁 Gratuit
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_free: false }))}
              className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${!form.is_free ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              💶 Payant
            </button>
          </div>

          {!form.is_free && (
            <Input
              label="Tarif journalier (€)"
              type="number"
              placeholder="Ex : 10"
              value={form.daily_rate}
              onChange={(e) => setForm(f => ({ ...f, daily_rate: e.target.value }))}
              min="1"
            />
          )}

          <Input
            label="Caution (€) — optionnel"
            type="number"
            placeholder="Ex : 50"
            value={form.deposit_amount}
            onChange={(e) => setForm(f => ({ ...f, deposit_amount: e.target.value }))}
            min="0"
          />

          <Input
            label="Lieu de retrait"
            placeholder="Votre quartier à Biguglia"
            value={form.pickup_location}
            onChange={(e) => setForm(f => ({ ...f, pickup_location: e.target.value }))}
          />

          <Textarea
            label="Règles d'utilisation (optionnel)"
            placeholder="Conditions, précautions, restrictions..."
            value={form.rules}
            onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))}
            className="min-h-[80px]"
          />
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Photos (optionnel)</h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-300 hover:bg-brand-50 transition-all duration-200"
          >
            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Ajouter des photos</p>
            <p className="text-xs text-gray-400 mt-1">Jusqu&apos;à 5 photos, PNG/JPG</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handlePhotoAdd(e.target.files)}
          />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {photos.map((photo, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            Publier le matériel
          </Button>
        </div>
      </form>
    </div>
  );
}
