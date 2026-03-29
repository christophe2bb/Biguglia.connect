'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ListingCategory } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';

export default function NouvelleAnnoncePage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '',
    listing_type: 'sale', price: '', condition: '', location: 'Biguglia',
  });

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('listing_categories').select('*').order('display_order');
      setCategories(data || []);
    };
    fetch();
  }, [profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title || !form.description || !form.category_id) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setLoading(true);
    const supabase = createClient();

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        user_id: profile.id,
        category_id: form.category_id,
        title: form.title,
        description: form.description,
        listing_type: form.listing_type,
        price: form.price ? parseFloat(form.price) : null,
        condition: form.condition || null,
        location: form.location,
        status: 'active',
      })
      .select()
      .single();

    if (error) { toast.error('Erreur lors de la publication'); setLoading(false); return; }

    // Upload photos
    for (const photo of photos) {
      const fileName = `listings/${listing.id}/${Date.now()}-${photo.name}`;
      const { data: up } = await supabase.storage.from('photos').upload(fileName, photo, { upsert: true });
      if (up) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
        await supabase.from('listing_photos').insert({ listing_id: listing.id, url: publicUrl, display_order: 0 });
      }
    }

    toast.success('Annonce publiée !');
    router.push(`/annonces/${listing.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Publier une annonce</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Select label="Type d'annonce" value={form.listing_type} onChange={(e) => setForm(f => ({ ...f, listing_type: e.target.value }))}>
            <option value="sale">À vendre</option>
            <option value="wanted">Je recherche</option>
            <option value="free">Je donne (gratuit)</option>
            <option value="service">Service proposé</option>
          </Select>
          <Select label="Catégorie" value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))} required>
            <option value="">Sélectionner...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
          <Input label="Titre de l'annonce" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex : Perceuse Bosch en parfait état" required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Décrivez l'article ou le service..." required />
          {form.listing_type === 'sale' && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Prix (€)" type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" />
              <Select label="État" value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}>
                <option value="">Sélectionner...</option>
                <option value="neuf">Neuf</option>
                <option value="tres_bon">Très bon état</option>
                <option value="bon">Bon état</option>
                <option value="usage">Usagé</option>
              </Select>
            </div>
          )}
          <Input label="Lieu" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Photos (max 5)</h3>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-300 hover:bg-brand-50 transition-all">
            <Camera className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Ajouter des photos</p>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (photos.length + files.length > 5) { toast.error('Max 5 photos'); return; }
              setPhotos(p => [...p, ...files]);
            }} />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover rounded-xl" />
                  <button type="button" onClick={() => setPhotos(ph => ph.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Annuler</Button>
          <Button type="submit" className="flex-2" loading={loading}>Publier l&apos;annonce</Button>
        </div>
      </form>
    </div>
  );
}
