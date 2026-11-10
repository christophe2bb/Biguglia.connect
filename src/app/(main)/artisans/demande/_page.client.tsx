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
import { safeImageExt, uploadFile, isAcceptedImageType, ACCEPTED_IMAGE_TYPES, MAX_PHOTO_MB } from '@/lib/upload-utils';

function DemandeServiceForm() {
  const searchParams = useSearchParams();
  const artisanId = searchParams.get('artisan');
  const router = useRouter();
  const { profile, phase } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Client Supabase stable — créé une seule fois, session persistée dans les cookies
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [categories, setCategories] = useState<TradeCategory[]>([]);
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
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
    if (phase === 'initializing') return;
    if (phase === 'unauthenticated') {
      const intended = `/artisans/demande${artisanId ? `?artisan=${encodeURIComponent(artisanId)}` : ''}`;
      router.replace(`/connexion?next=${encodeURIComponent(intended)}`);
      return;
    }
    if (!profile) { setDataLoading(false); return; }

    let cancelled = false;
    setDataLoading(true);
    setDataError(false);
    const fetchData = async () => {
      try {
        const { data: cats, error: categoriesError } = await supabase
          .from('trade_categories').select('*').order('display_order');
        if (categoriesError) throw categoriesError;
        if (cancelled) return;
        setCategories(cats || []);

        if (artisanId) {
          const { data: found, error: artisanLoadError } = await supabase
            .from('artisan_profiles')
            .select('*, trade_category:trade_categories(*)')
            .eq('id', artisanId)
            .eq('is_verified', true)
            .single();
          if (artisanLoadError || !found) throw artisanLoadError || new Error('Artisan introuvable');
          if (cancelled) return;
          setArtisan(found as ArtisanProfile);
          setForm(f => ({ ...f, category_id: found.trade_category_id || '' }));
        }
      } catch (error) {
        console.error('[DemandeService] chargement impossible', error);
        if (!cancelled) setDataError(true);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    void fetchData();
    return () => { cancelled = true; };
  }, [phase, profile?.id, artisanId, router, supabase]);

  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.some(file => !isAcceptedImageType(file))) {
      toast.error('Format non accepté. Choisissez JPG, PNG, WebP, GIF ou une photo iPhone compatible.');
      return;
    }
    if (selected.some(file => file.size > MAX_PHOTO_MB * 1024 * 1024)) {
      toast.error(`Photo trop lourde (maximum ${MAX_PHOTO_MB} Mo avant compression).`);
      return;
    }
    if (photos.length + selected.length > 5) {
      toast.error('Maximum 5 photos');
      return;
    }
    setPhotos(prev => [...prev, ...selected]);
  };

  const uploadPhotos = async (requestId: string, accessToken: string): Promise<{ urls: string[]; failed: number }> => {
    const urls: string[] = [];
    let failed = 0;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = safeImageExt(photo.name);
      const fileName = `requests/${requestId}/${Date.now()}_${i}.${ext}`;
      try {
        const publicUrl = await uploadFile(photo, 'photos', fileName, profile?.id, accessToken);
        urls.push(publicUrl);
      } catch (error) {
        console.warn('[DemandeService] pièce jointe refusée', error);
        failed++;
      }
    }
    return { urls, failed };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (phase !== 'authenticated' || !profile) { toast.error('Connexion requise'); return; }
    if (dataLoading || dataError || (artisanId && !artisan)) { toast.error('Fiche artisan indisponible'); return; }
    if (!form.title.trim() || !form.description.trim() || !form.category_id || !form.address.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);

    // Vérifier la session avant toute opération DB — évite auth.uid() = NULL (→ 403)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Session expirée. Reconnectez-vous.');
      router.push(`/connexion?next=${encodeURIComponent(`/artisans/demande${artisanId ? `?artisan=${artisanId}` : ''}`)}`);
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
    const { urls: photoUrls, failed: failedPhotos } = await uploadPhotos(request.id, session.access_token);
    if (failedPhotos > 0) toast.error(`${failedPhotos} photo(s) non enregistrée(s). Votre demande est conservée.`, { duration: 6000 });
    if (photoUrls.length > 0) {
      const { error: photoLinkError } = await supabase.from('service_request_photos').insert(
        photoUrls.map(url => ({ request_id: request.id, url }))
      );
      if (photoLinkError) toast.error('Pièces jointes envoyées, mais liaison aux demandes impossible.', { duration: 6000 });
    }

    // Créer une conversation privée avec l'artisan via l'API admin (contourne RLS récursive)
    if (artisanId && artisan) {
      // Vérification critique : user_id doit être présent pour identifier le
      // destinataire dans start-conversation (ownerId = profiles.id, pas artisan_profiles.id)
      if (!artisan.user_id) {
        console.error('[DemandeService] artisan.user_id manquant — impossible de créer la conversation', {
          artisanId,
          artisanProfileId: artisan.id,
        });
        // La demande est créée, on redirige quand même avec un toast d'avertissement
        toast.success('Demande enregistrée ; le destinataire n’a pas pu être identifié.', { duration: 5000 });
        toast.error('La conversation privée n\'a pas pu être créée (profil artisan incomplet).', { duration: 6000 });
        router.push(`/artisans/${artisanId}`);
        setLoading(false);
        return;
      }

      const urgencyLabel =
        form.urgency === 'tres_urgent' ? 'Très urgent' :
        form.urgency === 'urgent'      ? 'Urgent'      : 'Normal';

      const initialMsg =
        `📋 **Demande de devis — ${form.title}**\n\n` +
        `**Catégorie :** ${artisan.trade_category?.name ?? ''}\n` +
        `**Urgence :** ${urgencyLabel}\n` +
        (form.preferred_date ? `**Date souhaitée :** ${new Date(form.preferred_date).toLocaleDateString('fr-FR')}\n` : '') +
        (form.preferred_time ? `**Heure :** ${form.preferred_time}\n` : '') +
        `**Lieu :** ${form.address}\n\n` +
        `**Description :**\n${form.description}` +
        (photoUrls.length > 0
          ? `\n\n─────────────────────\n**Photos jointes :**\n` +
            photoUrls.map(url => url).join('\n')
          : '');

      let conversationId: string | null = null;
      try {
        const convRes = await fetch('/api/messages/start-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ownerId: artisan.user_id,
            subject: `Devis : ${form.title}`,
            relatedType: 'service_request',
            relatedId: request.id,
            initialMsg,
          }),
        });

        if (convRes.ok) {
          const convData = await convRes.json().catch(() => null);
          conversationId = convData?.conversationId ?? null;
          if (!conversationId) {
            console.warn('[DemandeService] start-conversation OK mais pas de conversationId', convData);
          }
        } else {
          const errBody = await convRes.json().catch(() => ({ error: `HTTP ${convRes.status}` }));
          console.error('[DemandeService] start-conversation erreur HTTP', convRes.status, errBody);
        }
      } catch (convErr) {
        console.error('[DemandeService] start-conversation exception réseau', convErr);
      }

      if (conversationId) toast.success(`Demande envoyée à ${artisan.business_name} !`, { duration: 5000 });
      else toast('Votre demande est enregistrée, mais le fil de messages n’a pas pu être ouvert.', { icon: '⚠️', duration: 7000 });

      // Rediriger vers la conversation privée avec l'artisan
      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      } else {
        // La demande est créée même si la conversation a échoué — l'artisan
        // verra le devis dans "Mes devis reçus" depuis /demandes
        router.push(`/demandes`);
      }
      return;
    }

    // Cas sans artisan spécifié → demande publique classique
    toast.success('Demande publiée ! Les habitants peuvent maintenant vous répondre.', { duration: 5000 });
    router.push('/demandes');
  };

  if (phase === 'initializing' || dataLoading) return <div role="status" className="max-w-2xl mx-auto px-4 py-10">Chargement du formulaire…</div>;
  if (phase === 'unauthenticated') return <div role="status" className="max-w-2xl mx-auto px-4 py-10">Redirection vers la connexion…</div>;
  if (!profile || dataError || (artisanId && !artisan)) {
    return <div role="alert" className="max-w-2xl mx-auto px-4 py-10 text-red-700">Impossible de charger la fiche artisan ou votre profil. Revenez à la liste des artisans et réessayez.</div>;
  }

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
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF, HEIC/AVIF — jusqu&apos;à 20 Mo avant compression</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            className="hidden"
            onChange={(e) => { handlePhotoAdd(e.target.files); e.currentTarget.value = ''; }}
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
            <strong>🔒 Sécurité :</strong> La demande est accessible aux destinataires autorisés par la plateforme. Attention : les photos sont actuellement stockées sous des liens publics. Ne joignez pas de document ou de photo confidentiels. Biguglia Connect ne garantit pas les travaux.
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
