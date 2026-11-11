'use client';

/**
 * ModifierDemandeClient — Formulaire de modification d'une demande de service
 *
 * Accès : propriétaire uniquement (resident_id === profile.id).
 * Si l'utilisateur n'est pas le propriétaire → redirection vers la page détail.
 * Pré-remplit tous les champs depuis la base.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, MapPin, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import type { TradeCategory } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import SectorFilter from '@/components/ui/SectorFilter';
import { safeImageExt, uploadFile, isAcceptedImageType, MAX_PHOTO_MB } from '@/lib/upload-utils';
import { servicePhotoLocation, QUOTE_PHOTO_BUCKET } from '@/lib/service-request-photos';
import { deletePhotoFiles } from '@/lib/delete-photo-files';
import { isPreferredDatePast, localISODate } from '@/lib/service-request-date';

// ─── Type minimal pour le chargement initial ────────────────────────────────
type ServiceRequestRow = {
  id: string;
  resident_id: string;
  artisan_id: string | null;
  title: string;
  description: string;
  category_id: string | null;
  urgency: 'normal' | 'urgent' | 'tres_urgent';
  preferred_date: string | null;
  preferred_time: string | null;
  address: string;
  sector_id: string | null;
  status: string;
  photos: { url: string }[];
};

interface Props {
  id: string;
}

export default function ModifierDemandeClient({ id }: Props) {
  const router = useRouter();
  const { profile, phase } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useRef(createClient()).current;

  // ── État du chargement ────────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);
  // Se calcule après hydratation pour éviter toute divergence UTC/SSR.
  const [localToday, setLocalToday] = useState('');
  useEffect(() => { setLocalToday(localISODate()); }, []);
  const [categories, setCategories]         = useState<TradeCategory[]>([]);
  const [originalPreferredDate, setOriginalPreferredDate] = useState('');

  // ── Formulaire ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title:          '',
    description:    '',
    category_id:    '',
    urgency:        'normal' as 'normal' | 'urgent' | 'tres_urgent',
    preferred_date: '',
    preferred_time: '',
    address:        'Biguglia',
    sector_id:      '',
  });

  // Photos existantes (URLs déjà en base)
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);
  // Nouvelles photos à uploader
  const [newPhotos, setNewPhotos]           = useState<File[]>([]);
  const [previewUrls, setPreviewUrls]       = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  // Protection immédiate contre deux envois avant le prochain rendu React.
  const savingRef = useRef(false);
  const [isPrivateQuote, setIsPrivateQuote] = useState(false);

  // Revoke object URLs lors du démontage ou changement
  useEffect(() => {
    const urls = newPhotos.map(f => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [newPhotos]);

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'initializing') return;
    if (phase === 'unauthenticated') {
      router.replace(`/connexion?next=${encodeURIComponent(`/demandes/${id}/modifier`)}`);
      return;
    }
    if (!profile) { setInitialLoading(false); return; }

    const load = async () => {
      try {
      // Catégories
      const { data: cats } = await supabase
        .from('trade_categories')
        .select('*')
        .order('display_order');
      setCategories(cats || []);

      // Demande existante
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          id, resident_id, artisan_id, title, description, category_id, urgency,
          preferred_date, preferred_time, address, sector_id, status,
          photos:service_request_photos(url)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Demande introuvable.');
        router.push('/demandes');
        return;
      }

      const row = data as unknown as ServiceRequestRow;

      // Vérifier que l'utilisateur est bien le propriétaire
      if (row.resident_id !== profile.id) {
        toast.error('Vous ne pouvez modifier que vos propres demandes.');
        router.push(`/demandes/${id}`);
        return;
      }

      // Même règle que le bouton de la fiche et le trigger Supabase :
      // un lien direct vers /modifier ne doit pas proposer un formulaire
      // inutilisable pour une demande déjà clôturée.
      if (row.status === 'completed' || row.status === 'cancelled') {
        toast.error('Cette demande est clôturée et ne peut plus être modifiée.');
        router.replace(`/demandes/${id}`);
        return;
      }

      // Préremplir le formulaire
      setOriginalPreferredDate(row.preferred_date ?? '');
      setForm({
        title:          row.title,
        description:    row.description,
        category_id:    row.category_id ?? '',
        urgency:        row.urgency,
        preferred_date: row.preferred_date ?? '',
        preferred_time: row.preferred_time ?? '',
        address:        row.address,
        sector_id:      row.sector_id ?? '',
      });
      setIsPrivateQuote(Boolean(row.artisan_id));
      setExistingPhotos(row.photos?.map(p => p.url) ?? []);
      setPhotosToRemove([]);
      } catch (error) {
        console.error('[ModifierDemande] chargement interrompu', error);
        toast.error('Impossible de charger la demande. Réessayez.');
        router.push('/demandes');
      } finally {
        setInitialLoading(false);
      }
    };

    load();
  }, [phase, profile, id, router, supabase]);

  // ── Ajouter de nouvelles photos ───────────────────────────────────────────
  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files);
    if (added.some(f => !isAcceptedImageType(f) || f.size > MAX_PHOTO_MB * 1024 * 1024)) {
      toast.error(`Photo refusée : format non accepté ou taille supérieure à ${MAX_PHOTO_MB} Mo.`);
      return;
    }
    const total = existingPhotos.length + newPhotos.length + added.length;
    if (total > 5) {
      toast.error(`Maximum 5 photos (${existingPhotos.length + newPhotos.length} déjà présentes)`);
      return;
    }
    setNewPhotos(prev => [...prev, ...added]);
  };

  // Une suppression ne doit pas être effectuée tant que le formulaire
  // n'a pas été enregistré : le bouton Annuler doit conserver les photos.
  const removeExistingPhoto = (url: string) => {
    setExistingPhotos(prev => prev.filter(item => item !== url));
    setPhotosToRemove(prev => prev.includes(url) ? prev : [...prev, url]);
  };

  // ── Upload des nouvelles photos ───────────────────────────────────────────
  const uploadNewPhotos = async (accessToken: string): Promise<{ urls: string[]; failures: number }> => {
    if (newPhotos.length === 0) return { urls: [], failures: 0 };
    const urls: string[] = [];
    let failures = 0;

    for (let i = 0; i < newPhotos.length; i++) {
      const photo = newPhotos[i];
      const ext   = safeImageExt(photo.name);
      const fileName = `requests/${id}/${Date.now()}_${i}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
      try {
        const bucket = isPrivateQuote ? QUOTE_PHOTO_BUCKET : 'photos';
        const photoUrl = await uploadFile(photo, bucket, fileName, profile?.id, accessToken);
        urls.push(photoUrl);
      } catch (err) {
        console.error('Photo upload error:', err);
        failures++;
        // On continue sur les autres photos
      }
    }
    return { urls, failures };
  };

  // ── Soumettre la modification ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || savingRef.current || !profile) return;
    if (!form.title.trim() || !form.description.trim() || !form.category_id || !form.address.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    // Une ancienne demande peut garder sa date historique : ne pas empêcher
    // l'utilisateur de corriger uniquement son titre ou sa description.
    // Toute NOUVELLE date choisie doit en revanche être aujourd'hui ou après.
    if (form.preferred_date !== originalPreferredDate && isPreferredDatePast(form.preferred_date)) {
      toast.error('La date souhaitée est passée. Choisissez aujourd’hui ou une date future.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expirée : reconnectez-vous.');
        return;
      }

      // UPDATE must return one row; RLS can silently update zero rows.
      const { data: saved, error } = await supabase
        .from('service_requests')
        .update({
          title: form.title.trim(),
          description: form.description.trim(),
          category_id: form.category_id,
          urgency: form.urgency,
          preferred_date: form.preferred_date || null,
          preferred_time: form.preferred_time || null,
          address: form.address.trim(),
          sector_id: form.sector_id || null,
        })
        .eq('id', id)
        .eq('resident_id', profile.id)
        .select('id')
        .maybeSingle();
      if (error || !saved) {
        toast.error('La demande n’a pas été modifiée. Vérifiez votre accès.');
        return;
      }

      let failedRemovals = 0;
      for (const url of photosToRemove) {
        const { data: removed, error: removeError } = await supabase
          .from('service_request_photos')
          .delete()
          .eq('request_id', id)
          .eq('url', url)
          .select('id');
        if (removeError || !removed?.length) {
          console.warn('[ModifierDemande] retrait photo refusé', removeError?.code);
          failedRemovals++;
        } else {
          // La demande existe toujours : /api/storage/photos peut vérifier
          // son résident avant de nettoyer les fichiers de cette demande.
          const location = servicePhotoLocation(url, id);
          if (location?.path.startsWith('requests/' + id + '/')) {
            try {
              await deletePhotoFiles([location.path], location.bucket);
            } catch (error) {
              console.warn('[ModifierDemande] photo Storage non supprimée', error);
              failedRemovals++;
            }
          } else {
            // Impossible de supprimer en sécurité un chemin étranger.
            console.warn('[ModifierDemande] URL Storage hors dossier');
            failedRemovals++;
          }
        }
      }

      const { urls, failures } = await uploadNewPhotos(session.access_token);
      let associationFailed = false;
      let orphanCleanupFailed = false;
      if (urls.length > 0) {
        const { error: photoError } = await supabase.from('service_request_photos').insert(
          urls.map(url => ({ request_id: id, url })),
        );
        associationFailed = !!photoError;
        if (photoError) {
          // Une insertion de métadonnées échouée ne doit pas laisser les
          // nouveaux fichiers publics et orphelins dans Supabase Storage.
          const locations = urls.map(url => servicePhotoLocation(url, id));
          const bucket = isPrivateQuote ? QUOTE_PHOTO_BUCKET : 'photos';
          if (!locations.every(location => !!location && location.bucket === bucket)) {
            orphanCleanupFailed = true;
            console.warn('[ModifierDemande] chemins de photos non reconnus ; nettoyage requis');
          } else {
            try {
              await deletePhotoFiles(locations.map(location => location!.path), bucket);
            } catch (cleanupError) {
              orphanCleanupFailed = true;
              console.warn('[ModifierDemande] nettoyage de photos orphelines incomplet', cleanupError);
            }
          }
        }
      }
      if (orphanCleanupFailed) {
        toast.error('Certaines photos non enregistrées nécessitent un nettoyage du stockage.', { duration: 7000 });
      }
      if (failures || associationFailed || failedRemovals) {
        toast.error('Demande modifiée, mais certaines opérations sur les photos ont échoué.', { duration: 6500 });
      } else {
        toast.success('Demande modifiée avec succès !', { duration: 4000 });
      }
      router.push(`/demandes/${id}`);
    } catch (err) {
      console.error('[ModifierDemande] erreur', err);
      toast.error('Enregistrement interrompu : réessayez.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const photoCount = existingPhotos.length + newPhotos.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* ── Retour ── */}
      <Link
        href={`/demandes/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Retour à la demande
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Modifier ma demande</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Champs principaux ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Input
            label="Titre de la demande *"
            placeholder="Ex : Fuite sous évier cuisine"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <Select
            label="Catégorie de travaux *"
            value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </Select>

          <Textarea
            label="Description du problème *"
            placeholder="Décrivez votre besoin en détail…"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
            className="min-h-[140px]"
          />

          <Select
            label="Urgence"
            value={form.urgency}
            onChange={e => setForm(f => ({ ...f, urgency: e.target.value as typeof form.urgency }))}
          >
            <option value="normal">Normal — Pas urgent</option>
            <option value="urgent">Urgent — Dans les prochains jours</option>
            <option value="tres_urgent">Très urgent — Aujourd&apos;hui / demain</option>
          </Select>
        </div>

        {/* ── Disponibilités et lieu ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-medium text-gray-800">Disponibilités et lieu</h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date souhaitée"
              type="date"
              min={form.preferred_date === originalPreferredDate && isPreferredDatePast(originalPreferredDate)
                ? undefined : localToday}
              value={form.preferred_date}
              onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
            />
            <Input
              label="Heure souhaitée"
              type="time"
              value={form.preferred_time}
              onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))}
            />
          </div>

          <Input
            label="Adresse d'intervention"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            leftIcon={<MapPin className="w-4 h-4" />}
            placeholder="Votre adresse à Biguglia"
          />

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Secteur{' '}
              <span className="text-xs text-gray-400 font-normal ml-1">
                (recommandé — pour cibler les artisans de votre zone)
              </span>
            </p>
            <SectorFilter
              value={form.sector_id || null}
              onChange={sid => setForm(f => ({ ...f, sector_id: sid || '' }))}
              showAll={false}
              compact={true}
            />
          </div>
        </div>

        {/* ── Photos ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-1">Photos du problème</h3>
          <p className="text-sm text-gray-400 mb-4">
            {photoCount} / 5 photo{photoCount > 1 ? 's' : ''}
          </p>

          {/* Photos existantes */}
          {existingPhotos.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {existingPhotos.map((url, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Aperçu ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(url)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                    title="Supprimer cette photo"
                    aria-label={`Retirer la photo existante ${i + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Nouvelles photos à uploader */}
          {previewUrls.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Nouvel aperçu ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-xl border-2 border-blue-300"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPhotos(p => p.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Retirer cette photo"
                    aria-label={`Retirer la nouvelle photo ${i + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Zone d'ajout si < 5 photos */}
          {photoCount < 5 && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <Camera className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Ajouter des photos</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG jusqu&apos;à 5 Mo chacune</p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                className="hidden"
                onChange={e => { handlePhotoAdd(e.target.files); e.currentTarget.value = ''; }}
              />
            </>
          )}
        </div>

        {/* ── Boutons ── */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/demandes/${id}`)}
          >
            Annuler
          </Button>
          <Button type="submit" className="flex-1" loading={saving}>
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}
