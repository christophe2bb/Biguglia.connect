'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Camera, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { safeImageExt, uploadFile, isAcceptedImageType } from '@/lib/upload-utils';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Link from 'next/link';

interface Category { id: string; name: string; icon: string; }
interface Sector   { id: string; name: string; icon: string; slug: string; color?: string; }
interface ExistingPhoto { url: string; display_order: number; }

export default function ModifierForumPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const { profile, phase } = useAuthStore();
  const authReady = phase !== 'initializing';
  const isV2Ref   = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories,     setCategories]     = useState<Category[]>([]);
  const [sectors,        setSectors]        = useState<Sector[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);

  // Formulaire
  const [form, setForm] = useState({ title: '', content: '', category_id: '', sector_id: '' });

  // Photos existantes (déjà en DB)
  const [existingPhotos,  setExistingPhotos]  = useState<ExistingPhoto[]>([]);
  const [deletedPhotoUrls, setDeletedPhotoUrls] = useState<string[]>([]);

  // Nouvelles photos (fichiers locaux)
  const [newPhotos,    setNewPhotos]    = useState<File[]>([]);
  const [newPreviews,  setNewPreviews]  = useState<string[]>([]);

  /* ── Chargement ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!authReady) return;
    if (!profile) { router.push('/connexion'); return; }

    const fetchData = async () => {
      const supabase = createClient();
      const topicId  = id as string;

      const [{ data: cats }, { data: secs }] = await Promise.all([
        supabase.from('forum_categories').select('id, name, icon').order('display_order'),
        supabase.from('forum_sectors').select('id, name, icon, slug, color').order('display_order'),
      ]);
      setCategories(cats || []);
      setSectors(secs || []);

      // Chercher d'abord dans forum_topics (v2)
      const { data: topicV2 } = await supabase
        .from('forum_topics')
        .select('id, title, content, category_id, sector_id, author_id')
        .eq('id', topicId)
        .maybeSingle();

      if (topicV2) {
        isV2Ref.current = true;
        if (topicV2.author_id !== profile.id && profile.role !== 'admin' && profile.role !== 'moderator') {
          toast.error('Non autorisé'); router.push(`/forum/${topicId}`); return;
        }
        setForm({
          title:       topicV2.title       || '',
          content:     topicV2.content     || '',
          category_id: topicV2.category_id || '',
          sector_id:   topicV2.sector_id   || '',
        });

        // Photos existantes
        const { data: photos } = await supabase
          .from('forum_topic_photos')
          .select('url, display_order')
          .eq('topic_id', topicId)
          .order('display_order');
        setExistingPhotos(photos || []);
        setLoading(false);
        return;
      }

      // Fallback forum_posts (v1)
      const { data: postV1 } = await supabase
        .from('forum_posts')
        .select('id, title, content, category_id, author_id')
        .eq('id', topicId)
        .maybeSingle();

      if (!postV1) { toast.error('Sujet introuvable'); router.push('/forum'); return; }
      if (postV1.author_id !== profile.id && profile.role !== 'admin' && profile.role !== 'moderator') {
        toast.error('Non autorisé'); router.push(`/forum/${topicId}`); return;
      }
      isV2Ref.current = false;
      setForm({ title: postV1.title || '', content: postV1.content || '', category_id: postV1.category_id || '', sector_id: '' });
      setLoading(false);
    };

    fetchData();
  }, [id, profile, authReady, router]);

  /* ── Gestion photos ─────────────────────────────────────────────────────── */
  const totalPhotos = existingPhotos.length + newPhotos.length;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - totalPhotos;
    const valid = files.filter(f => {
      if (!isAcceptedImageType(f)) { toast.error(`${f.name} : format non supporté`); return false; }
      if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name} : max 8 Mo`); return false; }
      return true;
    }).slice(0, remaining);
    setNewPhotos(p => [...p, ...valid]);
    setNewPreviews(p => [...p, ...valid.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeExistingPhoto = (url: string) => {
    setDeletedPhotoUrls(prev => [...prev, url]);
    setExistingPhotos(prev => prev.filter(p => p.url !== url));
  };

  const removeNewPhoto = (i: number) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewPhotos(p => p.filter((_, j) => j !== i));
    setNewPreviews(p => p.filter((_, j) => j !== i));
  };

  /* ── Sauvegarde ─────────────────────────────────────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.category_id) {
      toast.error('Remplissez tous les champs obligatoires'); return;
    }
    setSaving(true);
    const supabase = createClient();
    const topicId  = id as string;
    const table    = isV2Ref.current ? 'forum_topics' : 'forum_posts';

    // Mise à jour du sujet
    const payload: Record<string, unknown> = {
      title:       form.title.trim(),
      content:     form.content.trim(),
      category_id: form.category_id || null,
      updated_at:  new Date().toISOString(),
    };
    if (isV2Ref.current) payload.sector_id = form.sector_id || null;

    const { data: updated, error } = await supabase
      .from(table).update(payload).eq('id', topicId).select('id');

    if (error) {
      toast.error(error.code === '42501' || error.message?.includes('policy')
        ? "Vous n'êtes pas autorisé à modifier ce sujet."
        : `Erreur : ${error.message}`);
      setSaving(false); return;
    }
    if (!updated || updated.length === 0) {
      toast.error('Modification impossible — vérifiez vos droits.'); setSaving(false); return;
    }

    // Suppression des photos retirées
    for (const url of deletedPhotoUrls) {
      await supabase.from('forum_topic_photos').delete().eq('topic_id', topicId).eq('url', url);
      // Supprimer du storage (chemin relatif après /photos/)
      const match = url.match(/photos\/(.+)$/);
      if (match) await supabase.storage.from('photos').remove([match[1]]);
    }

    // Upload des nouvelles photos
    const baseOrder = existingPhotos.length;
    for (let i = 0; i < newPhotos.length; i++) {
      const file = newPhotos[i];
      const ext  = safeImageExt(file.name);
      const path = `forum/${topicId}/${Date.now()}_${i}.${ext}`; // nosec CWE-22
      try {
        const publicUrl = await uploadFile(file, 'photos', path, profile!.id);
        await supabase.from('forum_topic_photos').insert({
          topic_id:      topicId,
          url:           publicUrl,
          display_order: baseOrder + i,
        });
      } catch (err) {
        toast.error(`Photo ${i + 1} : ${err instanceof Error ? err.message : 'Erreur upload'}`);
      }
    }

    toast.success('Sujet modifié avec succès ✅');
    router.push(`/forum/${topicId}`);
  };

  /* ── Skeleton ───────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-40 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  /* ── Rendu ──────────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      <Link href={`/forum/${id}`}
        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au sujet
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Modifier le sujet</h1>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Catégorie */}
        <Select
          label="Catégorie *"
          value={form.category_id}
          onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
          required
        >
          <option value="">Choisir une catégorie…</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </Select>

        {/* Secteur (v2 uniquement) */}
        {isV2Ref.current && sectors.length > 0 && (
          <Select
            label="Secteur (optionnel)"
            value={form.sector_id}
            onChange={(e) => setForm(f => ({ ...f, sector_id: e.target.value }))}
          >
            <option value="">Toute la commune</option>
            {sectors.map(sec => (
              <option key={sec.id} value={sec.id}>{sec.icon} {sec.name}</option>
            ))}
          </Select>
        )}

        {/* Titre */}
        <div>
          <Input
            label="Titre *"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Un titre clair et précis…"
            required
            maxLength={120}
          />
          <p className="text-xs text-gray-400 mt-1">{form.title.length}/120</p>
        </div>

        {/* Contenu */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Contenu * <span className="text-gray-400 font-normal">({form.content.length} caractères)</span>
          </label>
          <Textarea
            value={form.content}
            onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Décrivez votre sujet en détail…"
            required
            className="min-h-[200px]"
          />
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Camera className="w-4 h-4 text-gray-400" />
            Photos <span className="text-gray-400 font-normal">(optionnel — max 5, 8 Mo)</span>
          </p>

          {/* Photos existantes */}
          {existingPhotos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {existingPhotos.map((photo, i) => (
                <div key={photo.url} className="relative group aspect-square overflow-hidden rounded-xl">
                  <Image src={photo.url} alt="" fill sizes="20vw" className="object-cover border border-gray-200 rounded-xl" />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 bg-violet-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                      Couverture
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(photo.url)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Nouvelles photos */}
          {newPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {newPreviews.map((src, i) => (
                <div key={i} className="relative group aspect-square overflow-hidden rounded-xl">
                  <Image src={src} alt="" fill unoptimized sizes="20vw" className="object-cover border-2 border-blue-300 rounded-xl" />
                  <span className="absolute bottom-1 left-1 bg-blue-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                    nouvelle
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNewPhoto(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bouton ajouter */}
          {totalPhotos < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-violet-300 hover:bg-violet-50 transition-colors group"
            >
              <Upload className="w-5 h-5 text-gray-300 group-hover:text-violet-400 mx-auto mb-1 transition-colors" />
              <p className="text-sm text-gray-500 group-hover:text-violet-600 transition-colors">
                Cliquer pour ajouter des photos
              </p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP • max 8 Mo • {totalPhotos}/5</p>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            {saving ? 'Enregistrement…' : '✅ Enregistrer les modifications'}
          </Button>
          <Link href={`/forum/${id}`}>
            <Button type="button" variant="ghost">Annuler</Button>
          </Link>
        </div>

      </form>
    </div>
  );
}
