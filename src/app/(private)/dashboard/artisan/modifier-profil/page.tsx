'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, X, ChevronLeft, Briefcase, MapPin, Clock, Upload,
  CheckCircle, AlertCircle, HardHat, Users, Save, Eye, Phone,
  Hash, FileText, Building2, Star,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { TradeCategory, ArtisanProfile } from '@/types';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';

import Badge from '@/components/ui/Badge';
import ProtectedPage from '@/components/providers/ProtectedPage';
import toast from 'react-hot-toast';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

// ─── Carte de visite prévisualisation ──────────────────────────────────────────
function BusinessCard({
  artisan,
  avatarPreview,
  category,
}: {
  artisan: Partial<ArtisanProfile & { phone?: string }>;
  avatarPreview: string | null;
  category?: TradeCategory | null;
}) {
  return (
    <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-blue-700 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
      {/* Motif décoratif */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 flex-shrink-0 border-2 border-white/40">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Aperçu du profil" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {category?.icon || '🔧'}
              </div>
            )}
          </div>

          {/* Nom + badge */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate">
              {artisan.business_name || 'Votre entreprise'}
            </h3>
            <p className="text-white/80 text-sm truncate">
              {category?.name || 'Votre métier'}
            </p>
            <div className="mt-1.5 flex gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                ✅ Vérifié
              </span>
              {artisan.artisan_type === 'professionnel' ? (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-400/30 px-2 py-0.5 rounded-full">
                  🏢 Pro
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-green-400/30 px-2 py-0.5 rounded-full">
                  🤝 Particulier
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Infos */}
        <div className="space-y-1.5 text-sm text-white/90">
          {artisan.description && (
            <p className="text-white/70 text-xs line-clamp-2 italic leading-relaxed">
              &ldquo;{artisan.description}&rdquo;
            </p>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            {artisan.service_area && (
              <span className="flex items-center gap-1 text-xs">
                <MapPin className="w-3 h-3" /> {artisan.service_area}
              </span>
            )}
            {artisan.years_experience && (
              <span className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" /> {artisan.years_experience} ans d&apos;exp.
              </span>
            )}
            {(artisan as { phone?: string }).phone && (
              <span className="flex items-center gap-1 text-xs">
                <Phone className="w-3 h-3" /> {(artisan as { phone?: string }).phone}
              </span>
            )}
          </div>
          {artisan.siret && (
            <p className="text-xs text-white/60 mt-1">SIRET : {artisan.siret}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────────
function ModifierProfilContent() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<TradeCategory[]>([]);
  const [artisanProfile, setArtisanProfile] = useState<ArtisanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Photo principale
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Photos galerie existantes + nouvelles
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    business_name: '',
    trade_category_id: '',
    description: '',
    service_area: '',
    years_experience: '',
    siret: '',
    insurance: '',
    phone: '',
    address: '',
    artisan_type: 'particulier' as 'professionnel' | 'particulier',
  });

  const selectedCategory = categories.find(c => c.id === form.trade_category_id) || null;

  const fetchData = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();

    const [{ data: cats }, { data: ap }] = await Promise.all([
      supabase.from('trade_categories').select('*').order('display_order'),
      supabase
        .from('artisan_profiles')
        .select('*, trade_category:trade_categories(*), gallery:artisan_photos(*), profile:profiles!artisan_profiles_user_id_fkey(phone)')
        .eq('user_id', profile.id)
        .single(),
    ]);

    setCategories(cats || []);

    if (ap) {
      setArtisanProfile(ap as ArtisanProfile);
      const profileData = ap.profile as { phone?: string } | null;
      setForm({
        business_name: ap.business_name || '',
        trade_category_id: ap.trade_category_id || '',
        description: ap.description || '',
        service_area: ap.service_area || '',
        years_experience: ap.years_experience?.toString() || '',
        siret: ap.siret || '',
        insurance: ap.insurance || '',
        phone: profileData?.phone || '',
        address: (ap as ArtisanProfile & { address?: string }).address || '',
        artisan_type: (ap.artisan_type as 'professionnel' | 'particulier') || 'particulier',
      });
      if (ap.avatar_url) setAvatarPreview(ap.avatar_url as string);
      const gallery = ap.gallery as { id: string; url: string }[] | null;
      if (gallery) setExistingPhotos(gallery.map(g => ({ id: g.id, url: g.url })));
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'artisan_verified' && profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [profile, router, fetchData]);

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo trop lourde (max 5 Mo)'); return; }
    if (avatarPreview && !artisanProfile?.avatar_url) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleGalleryAdd = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    const total = existingPhotos.length + newPhotos.length + arr.length;
    if (total > 8) { toast.error('Maximum 8 photos de galerie'); return; }
    const urls = arr.map(f => URL.createObjectURL(f));
    setNewPhotos(prev => [...prev, ...arr]);
    setNewPhotoPreviews(prev => [...prev, ...urls]);
  };

  const removeExistingPhoto = (id: string) => {
    setExistingPhotos(prev => prev.filter(p => p.id !== id));
    setDeletedPhotoIds(prev => [...prev, id]);
  };

  const removeNewPhoto = (idx: number) => {
    URL.revokeObjectURL(newPhotoPreviews[idx]);
    setNewPhotos(prev => prev.filter((_, i) => i !== idx));
    setNewPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !artisanProfile) return;
    if (!form.business_name || !form.trade_category_id || !form.description) {
      toast.error('Nom, métier et présentation sont obligatoires');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      // 1. Upload photo principale si changée
      let avatarUrl = artisanProfile.avatar_url as string | null;
      if (avatarFile) {
        const ext = safeImageExt(avatarFile.name);
        const path = `artisans/${artisanProfile.id}/cover-${Date.now()}.${ext}`;  // nosec CWE-22
        avatarUrl = await uploadFile(avatarFile, 'photos', path, profile.id);
      }

      // 2. Mettre à jour artisan_profiles
      const { error: updateError } = await supabase
        .from('artisan_profiles')
        .update({
          business_name: form.business_name,
          trade_category_id: form.trade_category_id,
          description: form.description,
          service_area: form.service_area,
          years_experience: Number(form.years_experience) || null,
          siret: form.siret || null,
          insurance: form.insurance || null,
          artisan_type: form.artisan_type,
          avatar_url: avatarUrl,
        })
        .eq('id', artisanProfile.id);

      if (updateError) throw updateError;

      // 3. Mettre à jour le téléphone dans profiles
      if (form.phone) {
        await supabase
          .from('profiles')
          .update({ phone: form.phone })
          .eq('id', profile.id);
      }

      // 4. Supprimer les photos de galerie retirées
      if (deletedPhotoIds.length > 0) {
        await supabase.from('artisan_photos').delete().in('id', deletedPhotoIds);
      }

      // 5. Upload les nouvelles photos de galerie
      const offset = existingPhotos.length;
      for (let i = 0; i < newPhotos.length; i++) {
        const photo = newPhotos[i];
        const ext = safeImageExt(photo.name);  // nosec CWE-22
        const path = `artisans/${artisanProfile.id}/gallery-${offset + i}-${Date.now()}.${ext}`;  // nosec CWE-22
        try {
          const url = await uploadFile(photo, 'photos', path, profile.id);
          await supabase.from('artisan_photos').insert({
            artisan_id: artisanProfile.id,
            url,
            display_order: offset + i,
          });
        } catch (err) {
          console.error('Photo upload error:', err);
        }
      }

      toast.success('Profil mis à jour avec succès !', { duration: 4000 });
      router.push('/dashboard/artisan');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!profile || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-40 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!artisanProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-600 mb-4">Profil artisan introuvable.</p>
        <Link href="/dashboard/artisan" className="text-brand-600 hover:underline">Retour</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/artisan" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Modifier mon profil artisan</h1>
          <p className="text-sm text-gray-500">Votre carte de visite est mise à jour en temps réel</p>
        </div>
        <Link href={`/artisans/${artisanProfile.id}`} target="_blank"
          className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:underline">
          <Eye className="w-4 h-4" /> Voir le profil
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne gauche : aperçu carte de visite */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Aperçu de votre carte
            </p>
            <BusinessCard
              artisan={{ ...form, years_experience: Number(form.years_experience) || undefined }}
              avatarPreview={avatarPreview}
              category={selectedCategory}
            />

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-700">
                <strong>💡 Conseil :</strong> Une belle photo et une description détaillée augmentent vos chances d&apos;être contacté.
              </p>
            </div>

            {/* Stats vues */}
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">
                  {(artisanProfile as ArtisanProfile & { view_count?: number }).view_count || 0}
                </div>
                <div className="text-xs text-gray-500">vues de votre profil</div>
              </div>
            </div>

            {/* Badge vérifié */}
            <div className="mt-4">
              <Badge variant="success" className="w-full justify-center py-2">
                ✅ Artisan vérifié par l&apos;équipe Biguglia Connect
              </Badge>
            </div>
          </div>
        </div>

        {/* Colonne droite : formulaire */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Photo principale ── */}
            <div className="bg-white rounded-2xl border-2 border-brand-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-600" />
                Photo principale
                <span className="text-xs font-normal text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  Apparaît sur votre carte
                </span>
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Cette photo est affichée sur votre fiche dans la liste des artisans.
              </p>
              <div className="flex items-center gap-4">
                {/* Aperçu */}
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex-shrink-0">
                  {avatarPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarPreview} alt="Aperçu de votre annonce" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(artisanProfile.avatar_url as string || null);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full flex items-center gap-2 p-3 border-2 border-dashed border-brand-300 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-brand-500" />
                    <span className="text-sm text-brand-700 font-medium">
                      {avatarPreview ? 'Changer la photo' : 'Ajouter une photo'}
                    </span>
                  </button>
                  <p className="text-xs text-gray-400 mt-1.5 text-center">JPG, PNG · 5 Mo max</p>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => handleAvatarChange(e.target.files?.[0] || null)}
              />
            </div>

            {/* ── Informations professionnelles ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Informations professionnelles
              </h2>

              <Input
                label="Nom de l'entreprise / raison sociale *"
                placeholder="Ex : Plomberie Martin"
                value={form.business_name}
                onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                required
              />
              <Select
                label="Catégorie de métier *"
                value={form.trade_category_id}
                onChange={e => setForm(f => ({ ...f, trade_category_id: e.target.value }))}
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
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
                className="min-h-[120px]"
              />

              {/* Type artisan */}
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Type d&apos;intervenant</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, artisan_type: 'professionnel' }))}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      form.artisan_type === 'professionnel'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <HardHat className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-sm text-blue-800">🏢 Professionnel</span>
                    </div>
                    <p className="text-xs text-gray-500">SIRET, assurance, activité déclarée</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, artisan_type: 'particulier' }))}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      form.artisan_type === 'particulier'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-sm text-green-800">🤝 Particulier</span>
                    </div>
                    <p className="text-xs text-gray-500">Aide de voisinage, bénévole</p>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Coordonnées & zone ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Coordonnées & zone d&apos;intervention
              </h2>
              <Input
                label="Téléphone"
                type="tel"
                placeholder="Ex : 06 12 34 56 78"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                leftIcon={<Phone className="w-4 h-4" />}
              />
              <Input
                label="Adresse professionnelle"
                placeholder="Ex : 12 rue des Artisans, Biguglia"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                leftIcon={<Building2 className="w-4 h-4" />}
              />
              <Input
                label="Zone d'intervention"
                placeholder="Ex : Biguglia, Bastia, Haute-Corse"
                value={form.service_area}
                onChange={e => setForm(f => ({ ...f, service_area: e.target.value }))}
                leftIcon={<MapPin className="w-4 h-4" />}
              />
              <Input
                label="Années d'expérience"
                type="number"
                placeholder="Ex : 10"
                value={form.years_experience}
                onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))}
                leftIcon={<Clock className="w-4 h-4" />}
                min="0" max="60"
              />
            </div>

            {/* ── Informations légales ── */}
            {form.artisan_type === 'professionnel' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Informations légales
                  <span className="text-xs text-gray-400 font-normal">(optionnel)</span>
                </h2>
                <Input
                  label="Numéro SIRET"
                  placeholder="Ex : 123 456 789 00001"
                  value={form.siret}
                  onChange={e => setForm(f => ({ ...f, siret: e.target.value }))}
                  leftIcon={<Hash className="w-4 h-4" />}
                />
                <Input
                  label="Assurance décennale / RC Pro"
                  placeholder="Ex : MAAF, AXA — n° de contrat..."
                  value={form.insurance}
                  onChange={e => setForm(f => ({ ...f, insurance: e.target.value }))}
                  leftIcon={<AlertCircle className="w-4 h-4" />}
                />
              </div>
            )}

            {/* ── Photos de galerie ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Star className="w-4 h-4" /> Photos de réalisations
                <span className="text-xs text-gray-400 font-normal">(max 8)</span>
              </h2>
              <p className="text-sm text-gray-500 mb-4">Valorisez votre travail avec des photos de vos chantiers et réalisations.</p>

              <div className="flex flex-wrap gap-3 mb-4">
                {/* Photos existantes */}
                {existingPhotos.map(photo => (
                  <div key={photo.id} className="relative w-24 h-24 group">
                    <Image src={photo.url} alt="Réalisation" fill unoptimized sizes="96px" className="object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(photo.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* Nouvelles photos */}
                {newPhotoPreviews.map((url, i) => (
                  <div key={`new-${i}`} className="relative w-24 h-24 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Aperçu de la réalisation" className="w-24 h-24 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-xs bg-brand-600 text-white px-1.5 rounded-md">Nouveau</span>
                  </div>
                ))}
                {/* Bouton ajouter */}
                {existingPhotos.length + newPhotos.length < 8 && (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Ajouter</span>
                  </button>
                )}
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                className="hidden"
                onChange={e => handleGalleryAdd(e.target.files)}
              />
              {deletedPhotoIds.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {deletedPhotoIds.length} photo(s) sera(ont) supprimée(s) à la sauvegarde
                </div>
              )}
            </div>

            {/* ── Info confirmation ── */}
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Mise à jour instantanée</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Votre profil public sera mis à jour immédiatement après la sauvegarde, sans nouvelle validation.
                </p>
              </div>
            </div>

            {/* ── Boutons ── */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/dashboard/artisan')}
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1 gap-2" loading={saving}>
                <Save className="w-4 h-4" /> Sauvegarder les modifications
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ModifierProfilPage() {
  return <ProtectedPage><ModifierProfilContent /></ProtectedPage>;
}
