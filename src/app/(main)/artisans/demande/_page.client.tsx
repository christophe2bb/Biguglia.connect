'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Camera, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { TradeCategory, ArtisanProfile } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import SectorFilter from '@/components/ui/SectorFilter';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

function DemandeServiceForm() {
  const searchParams = useSearchParams();
  const artisanId = searchParams.get('artisan');
  const router = useRouter();
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Client Supabase stable — créé une seule fois, session persistée dans les cookies
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [categories, setCategories] = useState<TradeCategory[]>([]);
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  /**
   * previewUrls — stable object-URL list derived from `photos`.
   * Revoked on every update and on unmount to avoid memory leaks.
   * Using a dedicated state + effect keeps JSX free of inline
   * URL.createObjectURL() calls, which would create a new URL on
   * every render without ever revoking the old ones.
   */
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = photos.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [photos]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    urgency: 'normal',
    preferred_date: '',
    preferred_time: '',
    address: 'Biguglia',
    sector_id: '',
  });

  // Pré-remplir le secteur depuis le profil
  useEffect(() => {
    if (profile?.home_sector_id) {
      setForm(f => ({ ...f, sector_id: profile.home_sector_id || '' }));
    }
  }, [profile?.home_sector_id]);

  useEffect(() => {
    if (!profile) { router.push('/connexion?redirect=/artisans/demande'); return; }

    const fetchData = async () => {
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
  }, [profile, artisanId, router, supabase]);

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
    const urls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = safeImageExt(photo.name);
      const fileName = `requests/${requestId}/${Date.now()}_${i}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
      try {
        const publicUrl = await uploadFile(photo, 'photos', fileName, profile?.id);
        urls.push(publicUrl);
      } catch {
        // skip failed photo — continue with others
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

    // Vérifier la session avant toute opération DB — évite auth.uid() = NULL (→ 403)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Session expirée. Reconnectez-vous.');
      router.push('/connexion?redirect=/artisans/demande');
      setLoading(false);
      return;
    }

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
        sector_id: form.sector_id || null,
        status: 'submitted',
      })
      .select()
      .single();

    if (error) {
      console.error('[DemandeService] insert error:', error.code, error.message);
      toast.error(
        error.code === '23502'
          ? 'Un champ obligatoire est manquant. Vérifiez le formulaire.'
          : error.code === '42703'
          ? 'Erreur de configuration (colonne manquante). Contactez le support.'
          : 'Erreur lors de l\'envoi. Réessayez.',
      );
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

    // Si artisan spécifié, créer une conversation via l'API admin (contourne RLS récursive)
    if (artisanId && artisan) {
      if (session) {
        await fetch('/api/messages/start-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ownerId: artisan.user_id,
            subject: form.title,
            relatedType: 'service_request',
            relatedId: request.id,
            initialMsg: null,
          }),
        }).catch(() => null);
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

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Secteur <span className="text-xs text-gray-400 font-normal ml-1">(recommandé — pour cibler les artisans de votre zone)</span>
            </p>
            <SectorFilter
              value={form.sector_id || null}
              onChange={id => setForm(f => ({ ...f, sector_id: id || '' }))}
              showAll={false}
              compact={true}
            />
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Photos du problème (optionnel)</h3>
          <p className="text-sm text-gray-500 mb-4">Ajoutez jusqu&apos;à 5 photos pour aider l&apos;artisan à comprendre votre besoin.</p>

          {/* Zone de dépôt */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-300 hover:bg-brand-50 transition-colors duration-200"
          >
            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Cliquer pour ajouter des photos</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG jusqu&apos;à 5 Mo chacune</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            className="hidden"
            onChange={(e) => handlePhotoAdd(e.target.files)}
          />

          {/* Prévisualisation — local blob URLs (created once, revoked on update/unmount) */}
          {previewUrls.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  {/*
                    Intentional native <img>: src is a blob: URL produced by
                    URL.createObjectURL — next/image cannot optimise local object
                    URLs. loading="lazy" defers off-screen previews; the cleanup
                    useEffect above revokes each URL when the photos array changes.
                  */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Aperçu ${i + 1}`}
                    loading="lazy"
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

export default function DemandeServicePageClient() {
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
