'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, X, Camera, MapPin, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { TradeCategory, ArtisanProfile } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';

function DemandeServiceForm() {
  const searchParams = useSearchParams();
  const artisanId = searchParams.get('artisan');
  const router = useRouter();
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<TradeCategory[]>([]);
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    urgency: 'normal',
    preferred_date: '',
    preferred_time: '',
    address: 'Biguglia',
  });

  useEffect(() => {
    if (!profile) { router.push('/connexion?redirect=/artisans/demande'); return; }

    const fetchData = async () => {
      const supabase = createClient();

      const { data: cats } = await supabase.from('trade_categories').select('*').order('display_order');
      setCategories(cats || []);

      if (artisanId) {
        const { data: a } = await supabase
          .from('artisan_profiles')
          .select('*, trade_category:trade_categories(*)')
          .eq('id', artisanId)
          .single();
        if (a) {
          setArtisan(a as ArtisanProfile);
          setForm(f => ({ ...f, category_id: a.trade_category_id || '' }));
        }
      }
    };
    fetchData();
  }, [profile, artisanId, router]);

  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (photos.length + newPhotos.length > 5) {
      toast.error('Maximum 5 photos');
      return;
    }
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const uploadPhotos = async (requestId: string): Promise<string[]> => {
    if (photos.length === 0) return [];
    const supabase = createClient();
    const urls: string[] = [];

    for (const photo of photos) {
      const fileName = `requests/${requestId}/${Date.now()}-${photo.name}`;
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, photo, { upsert: true });

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title || !form.description || !form.category_id) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: request, error } = await supabase
      .from('service_requests')
      .insert({
        resident_id: profile.id,
        artisan_id: artisanId || null,
        category_id: form.category_id,
        title: form.title,
        description: form.description,
        urgency: form.urgency,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time || null,
        address: form.address,
        status: 'submitted',
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de l\'envoi. Réessayez.');
      setLoading(false);
      return;
    }

    // Upload photos
    const photoUrls = await uploadPhotos(request.id);
    if (photoUrls.length > 0) {
      await supabase.from('service_request_photos').insert(
        photoUrls.map(url => ({ request_id: request.id, url }))
      );
    }

    // Si artisan spécifié, créer une conversation
    if (artisanId && artisan) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({
          subject: form.title,
          related_type: 'service_request',
          related_id: request.id,
        })
        .select()
        .single();

      if (conv) {
        await supabase.from('conversation_participants').insert([
          { conversation_id: conv.id, user_id: profile.id },
          { conversation_id: conv.id, user_id: artisan.user_id },
        ]);
      }
    }

    toast.success('Demande publiée ! Les habitants peuvent maintenant vous répondre.', { duration: 5000 });
    router.push('/demandes');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {artisan ? `Demande à ${artisan.business_name}` : 'Nouvelle demande de service'}
      </h1>
      {artisan && (
        <p className="text-gray-500 mb-6">
          {artisan.trade_category?.icon} {artisan.trade_category?.name} · {artisan.service_area}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Input
            label="Titre de la demande"
            placeholder="Ex : Fuite sous évier cuisine"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <Select
            label="Catégorie de travaux"
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
            label="Description du problème"
            placeholder="Décrivez votre besoin en détail : symptômes, localisation, urgence..."
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            required
            className="min-h-[140px]"
          />

          <Select
            label="Urgence"
            value={form.urgency}
            onChange={(e) => setForm(f => ({ ...f, urgency: e.target.value }))}
          >
            <option value="normal">Normal — Pas urgent</option>
            <option value="urgent">Urgent — Dans les prochains jours</option>
            <option value="tres_urgent">Très urgent — Aujourd&apos;hui / demain</option>
          </Select>
        </div>

        {/* Date et lieu */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-medium text-gray-800">Disponibilités et lieu</h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date souhaitée"
              type="date"
              value={form.preferred_date}
              onChange={(e) => setForm(f => ({ ...f, preferred_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
            <Input
              label="Heure souhaitée"
              type="time"
              value={form.preferred_time}
              onChange={(e) => setForm(f => ({ ...f, preferred_time: e.target.value }))}
            />
          </div>

          <Input
            label="Adresse d'intervention"
            value={form.address}
            onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
            leftIcon={<MapPin className="w-4 h-4" />}
            placeholder="Votre adresse à Biguglia"
          />
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Photos du problème (optionnel)</h3>
          <p className="text-sm text-gray-500 mb-4">Ajoutez jusqu&apos;à 5 photos pour aider l&apos;artisan à comprendre votre besoin.</p>

          {/* Zone de dépôt */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-300 hover:bg-brand-50 transition-all duration-200"
          >
            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Cliquer pour ajouter des photos</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG jusqu&apos;à 5 Mo chacune</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handlePhotoAdd(e.target.files)}
          />

          {/* Prévisualisation */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {photos.map((photo, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
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

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            <strong>🔒 Sécurité :</strong> Vos informations ne seront partagées qu&apos;avec l&apos;artisan concerné. La plateforme facilite la mise en relation mais ne garantit pas les travaux.
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            Envoyer la demande
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function DemandeServicePage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    }>
      <DemandeServiceForm />
    </Suspense>
  );
}
