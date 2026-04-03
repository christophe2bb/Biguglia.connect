'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, CheckCircle, ChevronRight, Clock, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ListingCategory } from '@/types';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import ModerationBadge from '@/components/ui/ModerationBadge';
import Link from 'next/link';
import { useModeration } from '@/hooks/useModeration';
import { type ModerationStatus } from '@/lib/moderation';

export default function NouvelleAnnoncePage() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '',
    listing_type: 'sale', price: '', condition: '', location: 'Biguglia',
  });

  const { submitForModeration } = useModeration();

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.push('/connexion?redirect=/annonces/nouvelle');
      return;
    }
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('listing_categories').select('*').order('display_order');
      setCategories(data || []);
    };
    fetchCategories();
  }, [profile, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim() || !form.description.trim() || !form.category_id) {
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
        title: form.title.trim(),
        description: form.description.trim(),
        listing_type: form.listing_type,
        price: form.price ? parseFloat(form.price) : null,
        condition: form.condition || null,
        location: form.location || 'Biguglia',
        status: 'active',
        moderation_status: 'en_attente_validation',
      })
      .select()
      .single();

    if (error) {
      console.error('Publication error:', error);
      toast.error(`Erreur lors de la publication : ${error.message}`);
      setLoading(false);
      return;
    }

    // Upload photos if any
    const photoUrls: string[] = [];
    if (photos.length > 0 && listing) {
      for (const photo of photos) {
        const ext = photo.name.split('.').pop() || 'jpg';
        const fileName = `listings/${listing.id}/${Date.now()}.${ext}`;
        const { data: up, error: upError } = await supabase.storage
          .from('photos')
          .upload(fileName, photo, { upsert: true });

        if (up && !upError) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
          photoUrls.push(publicUrl);
          await supabase.from('listing_photos').insert({
            listing_id: listing.id,
            url: publicUrl,
            display_order: 0,
          });
        }
      }
    }

    // Soumettre à la file de modération
    const modResult = await submitForModeration({
      contentType: 'listing',
      contentId: listing.id,
      contentTitle: form.title.trim(),
      contentExcerpt: form.description.trim(),
      contentPhotos: photoUrls,
      validationData: {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category_id,
        price: form.listing_type === 'sale' ? form.price : '0',
      },
      sourceTable: 'listings',
      authorColumn: 'user_id',
    });

    setModerationStatus(modResult?.status || 'en_attente_validation');
    setPublishedId(listing.id);
    setLoading(false);
  };

  // --- Success screen ---
  if (publishedId) {
    const isPending = moderationStatus === 'en_attente_validation';
    const isPublished = moderationStatus === 'publie';
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className={`flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 ${
          isPublished ? 'bg-emerald-100' : 'bg-amber-100'
        }`}>
          {isPublished
            ? <CheckCircle className="w-10 h-10 text-emerald-600" />
            : <Clock className="w-10 h-10 text-amber-600" />
          }
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isPublished ? 'Annonce publiée !' : 'Annonce soumise !'}
        </h1>
        <p className="text-gray-500 mb-4">
          {isPublished
            ? 'Votre annonce est maintenant visible par tous les habitants de Biguglia.'
            : 'Votre annonce a été soumise et sera vérifiée par notre équipe sous 24h.'}
        </p>
        {isPending && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <ModerationBadge
              status="en_attente_validation"
              size="md"
              showSublabel
              showDot
              className="max-w-xs"
            />
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-left max-w-sm">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Vous recevrez une notification dès que votre annonce sera validée. Vous pouvez suivre son statut depuis votre tableau de bord.
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/annonces/${publishedId}`}
            className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl hover:bg-brand-700 transition-colors font-medium"
          >
            Voir mon annonce
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Mon tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  // --- Form ---
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Publier une annonce</h1>
      {/* Info modération */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 mb-6">
        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Toutes les publications sont vérifiées par notre équipe avant d&apos;être visibles. Traitement généralement sous 24h.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
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
            label="Titre de l'annonce *"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Ex : Perceuse Bosch en parfait état"
            required
          />

          <Textarea
            label="Description *"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Décrivez l'article ou le service en détail (min 30 caractères)..."
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
            placeholder="Biguglia"
          />
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Photos (optionnel, max 5)</h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-300 hover:bg-brand-50 transition-all"
          >
            <Camera className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Cliquez pour ajouter des photos</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5 Mo chacune</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (photos.length + files.length > 5) {
                toast.error('Maximum 5 photos autorisées');
                return;
              }
              setPhotos(p => [...p, ...files]);
            }}
          />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(p)}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos(ph => ph.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button type="submit" className="flex-2" loading={loading} disabled={loading}>
            {loading ? 'Soumission en cours...' : 'Soumettre pour validation'}
          </Button>
        </div>
      </form>
    </div>
  );
}
