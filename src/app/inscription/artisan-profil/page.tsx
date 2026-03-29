'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, ChevronLeft, Briefcase, MapPin, Clock, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { TradeCategory } from '@/types';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import toast from 'react-hot-toast';

export default function ArtisanProfilPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<TradeCategory[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    business_name: '',
    trade_category_id: '',
    description: '',
    service_area: 'Biguglia et alentours',
    years_experience: '',
    siret: '',
    insurance: '',
  });

  useEffect(() => {
    if (!profile) {
      router.push('/connexion');
      return;
    }
    if (profile.role !== 'artisan_pending') {
      router.push('/dashboard');
      return;
    }

    const fetchCats = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('trade_categories').select('*').order('display_order');
      setCategories(data || []);
    };
    fetchCats();
  }, [profile, router]);

  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (photos.length + newPhotos.length > 8) {
      toast.error('Maximum 8 photos de galerie');
      return;
    }
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!form.business_name || !form.trade_category_id || !form.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Check if artisan profile already exists
    const { data: existing } = await supabase
      .from('artisan_profiles')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    let artisanId: string;

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('artisan_profiles')
        .update({
          business_name: form.business_name,
          trade_category_id: form.trade_category_id,
          description: form.description,
          service_area: form.service_area,
          years_experience: Number(form.years_experience) || null,
          siret: form.siret || null,
          insurance: form.insurance || null,
        })
        .eq('user_id', profile.id)
        .select()
        .single();

      if (error) { toast.error('Erreur lors de la sauvegarde'); setLoading(false); return; }
      artisanId = data.id;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('artisan_profiles')
        .insert({
          user_id: profile.id,
          business_name: form.business_name,
          trade_category_id: form.trade_category_id,
          description: form.description,
          service_area: form.service_area,
          years_experience: Number(form.years_experience) || null,
          siret: form.siret || null,
          insurance: form.insurance || null,
          is_featured: false,
        })
        .select()
        .single();

      if (error) { toast.error('Erreur lors de la création du profil'); setLoading(false); return; }
      artisanId = data.id;
    }

    // Upload gallery photos
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const fileName = `artisans/${artisanId}/gallery-${Date.now()}-${photo.name}`;
      const { data: uploaded } = await supabase.storage.from('photos').upload(fileName, photo, { upsert: true });
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(uploaded.path);
        await supabase.from('artisan_photos').insert({ artisan_id: artisanId, url: publicUrl, display_order: i });
      }
    }

    toast.success('Profil artisan soumis ! En attente de validation par l\'administrateur.', { duration: 6000 });
    router.push('/dashboard');
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Tableau de bord
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complétez votre profil artisan</h1>
        <p className="text-gray-500">Ces informations seront vérifiées par notre équipe avant validation.</p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-orange-700">
          <strong>⏳ En attente de validation :</strong> Une fois votre profil soumis, l&apos;administrateur vérifiera vos informations.
          Vous recevrez une notification par email dès que votre profil sera validé.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Infos pro */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Informations professionnelles
          </h2>

          <Input
            label="Nom de l'entreprise / raison sociale *"
            placeholder="Ex : Plomberie Martin, Jean Martin Électricité..."
            value={form.business_name}
            onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
            required
          />

          <Select
            label="Catégorie de métier *"
            value={form.trade_category_id}
            onChange={(e) => setForm(f => ({ ...f, trade_category_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner votre métier...</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </Select>

          <Textarea
            label="Présentation de vos services *"
            placeholder="Décrivez votre activité, vos spécialités, votre expérience..."
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            required
            className="min-h-[140px]"
          />
        </div>

        {/* Zone d'intervention */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Zone d&apos;intervention
          </h2>

          <Input
            label="Zone d'intervention"
            placeholder="Ex : Biguglia, Bastia, Haute-Corse"
            value={form.service_area}
            onChange={(e) => setForm(f => ({ ...f, service_area: e.target.value }))}
          />

          <Input
            label="Années d'expérience"
            type="number"
            placeholder="Ex : 10"
            value={form.years_experience}
            onChange={(e) => setForm(f => ({ ...f, years_experience: e.target.value }))}
            leftIcon={<Clock className="w-4 h-4" />}
            min="0"
            max="60"
          />
        </div>

        {/* Documents légaux */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documents (recommandé)
          </h2>
          <p className="text-xs text-gray-500">Ces informations facilitent la validation de votre profil par l&apos;administrateur.</p>

          <Input
            label="Numéro SIRET"
            placeholder="Ex : 123 456 789 00001"
            value={form.siret}
            onChange={(e) => setForm(f => ({ ...f, siret: e.target.value }))}
          />

          <Input
            label="Assurance décennale / RC Pro"
            placeholder="Ex : Nom assureur, numéro de contrat"
            value={form.insurance}
            onChange={(e) => setForm(f => ({ ...f, insurance: e.target.value }))}
          />
        </div>

        {/* Photos galerie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Photos de vos réalisations (optionnel)</h2>
          <p className="text-sm text-gray-500 mb-4">Ajoutez des photos de vos chantiers pour valoriser votre travail (max. 8 photos)</p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-300 hover:bg-brand-50 transition-all duration-200"
          >
            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Ajouter des photos de réalisations</p>
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

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {photos.map((photo, i) => (
                <div key={i} className="relative w-24 h-24 group">
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
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
            Plus tard
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            Soumettre pour validation
          </Button>
        </div>
      </form>
    </div>
  );
}
