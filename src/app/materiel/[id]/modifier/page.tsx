'use client';

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

interface ExistingPhoto { id: string; url: string; display_order: number; }
interface Category { id: string; name: string; icon: string; slug: string; }

export default function ModifierMaterielPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '',
    daily_rate: '', deposit_amount: '', pickup_location: 'Biguglia',
    condition: '', is_free: false, is_available: true, rules: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { router.push('/connexion'); return; }

    const fetchData = async () => {
      const supabase = createClient();
      const { data: cats } = await supabase.from('equipment_categories').select('*').order('display_order');
      setCategories(cats || []);

      const { data, error } = await supabase
        .from('equipment_items')
        .select('*, photos:equipment_photos(id, url, display_order)')
        .eq('id', id as string).single();

      if (error || !data) { toast.error('Matériel introuvable'); router.push('/materiel'); return; }
      if (data.owner_id !== profile.id && profile.role !== 'admin') {
        toast.error('Non autorisé'); router.push(`/materiel/${id}`); return;
      }

      setForm({
        title: data.title || '', description: data.description || '',
        category_id: data.category_id || '', daily_rate: data.daily_rate?.toString() || '',
        deposit_amount: data.deposit_amount?.toString() || '',
        pickup_location: data.pickup_location || 'Biguglia',
        condition: data.condition || '', is_free: data.is_free || false,
        is_available: data.is_available !== false, rules: data.rules || '',
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
    if (!form.title.trim() || !form.description.trim() || !form.category_id) {
      toast.error('Remplissez tous les champs obligatoires'); return;
    }
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('equipment_items').update({
      title: form.title.trim(), description: form.description.trim(),
      category_id: form.category_id,
      daily_rate: form.is_free ? 0 : (form.daily_rate ? parseFloat(form.daily_rate) : 0),
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      pickup_location: form.pickup_location || 'Biguglia',
      condition: form.condition || null, is_free: form.is_free,
      is_available: form.is_available, rules: form.rules || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id as string);

    if (error) { toast.error('Erreur lors de la sauvegarde'); setSaving(false); return; }

    for (const photoId of deletedPhotoIds) {
      await supabase.from('equipment_photos').delete().eq('id', photoId);
    }
    for (const photo of newPhotos) {
      const ext = photo.name.split('.').pop() || 'jpg';
      const fileName = `equipment/${id}/${Date.now()}.${ext}`;
      const { data: up } = await supabase.storage.from('photos').upload(fileName, photo, { upsert: true });
      if (up) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
        await supabase.from('equipment_photos').insert({ item_id: id, url: publicUrl, display_order: existingPhotos.length });
      }
    }

    toast.success('Matériel modifié !');
    router.push(`/materiel/${id}`);
  };

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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {/* Disponibilité */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700">Disponible à l&apos;emprunt</span>
            <button type="button" onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_available ? 'bg-brand-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <Select label="Catégorie *" value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))} required>
            <option value="">Sélectionner...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>

          <Input label="Titre *" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description *" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} required />

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input type="checkbox" id="is_free" checked={form.is_free} onChange={(e) => setForm(f => ({ ...f, is_free: e.target.checked }))} className="w-4 h-4 rounded text-brand-600" />
            <label htmlFor="is_free" className="text-sm font-medium text-gray-700">Prêt gratuit</label>
          </div>

          {!form.is_free && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tarif/jour (€)" type="number" min="0" value={form.daily_rate} onChange={(e) => setForm(f => ({ ...f, daily_rate: e.target.value }))} />
              <Input label="Caution (€)" type="number" min="0" value={form.deposit_amount} onChange={(e) => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
            </div>
          )}

          <Select label="État" value={form.condition} onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}>
            <option value="">Sélectionner...</option>
            <option value="neuf">Neuf</option>
            <option value="tres_bon">Très bon état</option>
            <option value="bon">Bon état</option>
            <option value="usage">Usagé</option>
          </Select>

          <Input label="Lieu de retrait" value={form.pickup_location} onChange={(e) => setForm(f => ({ ...f, pickup_location: e.target.value }))} />
          <Textarea label="Règles d'utilisation (optionnel)" value={form.rules} onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))} />
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Photos ({existingPhotos.length + newPhotos.length}/5)</h3>
          <div className="flex flex-wrap gap-3 mb-3">
            {existingPhotos.map(photo => (
              <div key={photo.id} className="relative w-24 h-24 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                <button type="button" onClick={() => { setDeletedPhotoIds(p => [...p, photo.id]); setExistingPhotos(p => p.filter(pp => pp.id !== photo.id)); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {newPhotos.map((photo, i) => (
              <div key={i} className="relative w-24 h-24 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover rounded-xl border-2 border-brand-300" />
                <button type="button" onClick={() => setNewPhotos(p => p.filter((_, j) => j !== i))}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {existingPhotos.length + newPhotos.length < 5 && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:border-brand-300 hover:bg-brand-50 transition-all">
                <Camera className="w-5 h-5 text-gray-400 mb-1" /><span className="text-xs text-gray-400">Ajouter</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (existingPhotos.length + newPhotos.length + files.length > 5) { toast.error('Max 5 photos'); return; }
              setNewPhotos(p => [...p, ...files]);
            }} />
        </div>

        <div className="flex gap-3">
          <Link href={`/materiel/${id}`} className="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
          <Button type="submit" className="flex-2" loading={saving}>Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
