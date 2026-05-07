'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import { SECTORS_DEFAULT, CATEGORIES_DEFAULT } from '../_config';
import type { Step, FormState, ForumSector, ForumCategory, SimilarTopic } from '../_types';
import { safeImageExt, uploadFile } from '@/lib/upload-utils';

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useForumComposer() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [sectors, setSectors] = useState<ForumSector[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Anti-doublon ──────────────────────────────────────────────────────────
  const [similarTopics, setSimilarTopics] = useState<SimilarTopic[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [showSimilar, setShowSimilar] = useState(true);

  // ── Photos ────────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // ── Tags input ────────────────────────────────────────────────────────────
  const [tagInput, setTagInput] = useState('');

  // ── Form ──────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    sector_id:   '',
    category_id: '',
    post_type:   '',
    urgency:     'basse',
    title:       '',
    content:     '',
    tags:        [],
    visibility:  'public',
  });

  // ── Bootstrap: redirect if not logged in, fetch sectors/categories ────────
  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    const fetchOptions = async () => {
      const supabase = createClient();
      const { data: sectorData } = await supabase
        .from('forum_sectors').select('*').order('display_order');
      const rawSectors = sectorData && sectorData.length > 0 ? sectorData : SECTORS_DEFAULT;
      setSectors(rawSectors.filter((s: { id?: string; slug?: string }) => SECTORS_DEFAULT.some(d => d.id === s.id || d.slug === s.slug)));

      const { data: catData } = await supabase
        .from('forum_categories').select('*').order('display_order');
      setCategories(catData && catData.length > 0 ? catData : CATEGORIES_DEFAULT);
    };
    fetchOptions();
  }, [profile, router]);

  // ── Similar-topic lookup ──────────────────────────────────────────────────
  const searchSimilar = useCallback(async (title: string) => {
    if (title.trim().length < 4) { setSimilarTopics([]); return; }
    setSearchingDuplicates(true);
    try {
      const supabase = createClient();
      const words = title.trim().split(' ').filter(w => w.length > 3).slice(0, 3);
      if (words.length === 0) { setSimilarTopics([]); return; }

      const { data } = await supabase
        .from('forum_topics')
        .select('id, title, created_at')
        .or(words.map(w => `title.ilike.%${w}%`).join(','))
        .not('status', 'eq', 'masque')
        .order('created_at', { ascending: false })
        .limit(3);

      setSimilarTopics((data || []).filter((t: { id: string; title: string; created_at: string }) => t.title !== title));
    } catch {
      setSimilarTopics([]);
    } finally {
      setSearchingDuplicates(false);
    }
  }, []);

  // Debounced title → similar search (step 3 only)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 3 && form.title.trim().length >= 4) {
        searchSimilar(form.title);
        setShowSimilar(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.title, step, searchSimilar]);

  // ── Photo handlers ────────────────────────────────────────────────────────
  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error(`Maximum 5 photos — ${files.length - remaining} ignorée(s)`);
    }
    toAdd.forEach(file => {
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} dépasse 8 Mo`); return; }
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
      setPhotos(prev => [...prev, file]);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [photos.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Tag handlers ──────────────────────────────────────────────────────────
  const addTag = useCallback((tag: string) => {
    const cleaned = tag.trim().toLowerCase()
      .replace(/[^a-z0-9àâçéèêëîïôûùüÿœæ-]/g, '').slice(0, 25);
    if (!cleaned || form.tags.includes(cleaned) || form.tags.length >= 5) return;
    setForm(f => ({ ...f, tags: [...f.tags, cleaned] }));
    setTagInput('');
  }, [form.tags]);

  const removeTag = useCallback((tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  }, []);

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      setForm(f => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  }, [tagInput, form.tags, addTag]);

  // ── Step navigation ───────────────────────────────────────────────────────
  const canGoNext = useCallback((): boolean => {
    if (step === 1) return !!form.sector_id;
    if (step === 2) return !!form.category_id;
    if (step === 3) return form.title.trim().length >= 5 && form.content.trim().length >= 10;
    return true;
  }, [step, form.sector_id, form.category_id, form.title, form.content]);

  const nextStep = useCallback(() => {
    if (canGoNext()) setStep(s => Math.min(4, s + 1) as Step);
  }, [canGoNext]);

  const prevStep = useCallback(() => {
    setStep(s => Math.max(1, s - 1) as Step);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();
    let topicId: string | null = null;

    // post_type et urgency n'existent pas comme colonnes sur forum_topics.
    // On les encode dans le tableau tags : "type:<valeur>" et "urgence:haute"
    // pour permettre le filtrage côté client dans useForumPage.
    const systemTags: string[] = [];
    if (form.post_type)         systemTags.push(`type:${form.post_type}`);
    if (form.urgency === 'haute') systemTags.push('urgence:haute');
    const allTags = [...systemTags, ...form.tags];

    const { data: topicData, error } = await supabase
      .from('forum_topics')
      .insert({
        sector_id:      form.sector_id   || null,
        category_id:    form.category_id || null,
        author_id:      profile.id,
        title:          form.title.trim(),
        content:        form.content.trim(),
        status:         'ouvert',
        visibility:     form.visibility,
        tags:           allTags,
        is_pinned:      false,
        is_hot:         false,
        views:          0,
        reply_count:    0,
        reaction_count: 0,
      })
      .select()
      .single();

    if (error) {
      // Fallback: legacy forum_posts table
      const { data: postData, error: err2 } = await supabase
        .from('forum_posts')
        .insert({
          category_id: form.category_id || null,
          author_id:   profile.id,
          title:       form.title.trim(),
          content:     form.content.trim(),
        })
        .select()
        .single();
      if (err2) {
        toast.error('Erreur lors de la publication');
        setLoading(false);
        return;
      }
      topicId = postData.id;
    } else {
      topicId = topicData.id;

      // Upsert tags
      if (form.tags.length > 0) {
        for (const tagName of form.tags) {
          const { data: tagRow } = await supabase
            .from('forum_tags')
            .upsert({ name: tagName, slug: tagName }, { onConflict: 'slug' })
            .select('id')
            .single();
          if (tagRow) {
            try {
              await supabase.from('forum_topic_tags').insert({ topic_id: topicId, tag_id: tagRow.id });
            } catch { /* table optionnelle */ }
          }
        }
      }
    }

    // Upload photos — via /api/upload (magic-bytes validation côté serveur)
    if (photos.length > 0 && topicId) {
      setUploadingPhotos(true);
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = safeImageExt(file.name);
        const path = `forum/${topicId}/${Date.now()}_${i}.${ext}`;  // nosec CWE-22 — chemin composé de UUID/ID serveur + Date.now() + ext validée, aucune entrée utilisateur
        try {
          const publicUrl = await uploadFile(file, 'photos', path, profile.id);
          await supabase.from('forum_topic_photos').insert({
            topic_id:      topicId,
            url:           publicUrl,
            display_order: i,
          });
        } catch (err) {
          console.error('[forum-upload]', err);
          toast.error(`Photo ${i + 1} refusée : ${err instanceof Error ? err.message : 'type invalide'}`);
        }
      }
      setUploadingPhotos(false);
    }

    toast.success('Sujet publié avec succès ! 🎉');
    router.push(`/forum/${topicId}`);
  }, [profile, form, photos, router]);

  // ── Derived selections ─────────────────────────────────────────────────────
  const selectedSector   = sectors.find(s => s.id === form.sector_id   || s.slug === form.sector_id);
  const selectedCategory = categories.find(c => c.id === form.category_id || c.slug === form.category_id);

  return {
    // auth
    profile,
    // step
    step,
    setStep,
    // data
    sectors,
    categories,
    loading,
    // anti-doublon
    similarTopics,
    searchingDuplicates,
    showSimilar,
    setShowSimilar,
    // photos
    photos,
    photoPreviews,
    uploadingPhotos,
    fileInputRef,
    handlePhotoSelect,
    removePhoto,
    // tags
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    handleTagKeyDown,
    // form
    form,
    setForm,
    // navigation
    canGoNext,
    nextStep,
    prevStep,
    // submit
    handleSubmit,
    // derived
    selectedSector,
    selectedCategory,
  };
}
