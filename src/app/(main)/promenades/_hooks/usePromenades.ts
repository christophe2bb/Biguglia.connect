'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Promenade, AdvFilters, PromenadeFormState } from '../_types';
import { DEFAULT_PROMENADE_FORM } from '../_constants';
import { safeImageExt } from '@/lib/upload-utils';

export function usePromenades(
  profile: { id: string } | null | undefined,
  quickFilter: string | null,
  advFilters: AdvFilters,
  filterSector: string | null,
) {
  const supabase = useMemo(() => createClient(), []);

  const [promenades, setPromenades] = useState<Promenade[]>([]);
  const [loadingPromenades, setLoadingPromenades] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [photos, setPhotos]           = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<PromenadeFormState>(DEFAULT_PROMENADE_FORM);

  const fetchPromenades = useCallback(async () => {
    setLoadingPromenades(true);
    try {
      let query = supabase
        .from('promenades')
        .select(`*, author:profiles!promenades_author_id_fkey(full_name, avatar_url), photos:promenade_photos(url)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (quickFilter) {
        if (['balade', 'randonnee', 'velo', 'plage', 'nature', 'moto', 'famille', 'photo'].includes(quickFilter)) {
          query = query.eq('type', quickFilter);
        } else if (['facile', 'moyen', 'difficile'].includes(quickFilter)) {
          query = query.eq('difficulty', quickFilter);
        } else if (quickFilter === 'chien') {
          query = query.eq('dogs_allowed', true);
        } else if (quickFilter === 'poussette') {
          query = query.eq('stroller_friendly', true);
        } else if (quickFilter === 'sunset') {
          query = query.eq('best_time_of_day', 'sunset');
        } else if (quickFilter === 'court') {
          query = query.lte('duration_min', 60);
        }
      }

      if (advFilters.dogs)     query = query.eq('dogs_allowed', true);
      if (advFilters.stroller) query = query.eq('stroller_friendly', true);
      if (advFilters.parking)  query = query.eq('parking_available', true);
      if (advFilters.water)    query = query.eq('water_access', true);
      if (advFilters.loop)     query = query.eq('route_loop', true);
      if (advFilters.sunset)   query = query.eq('best_time_of_day', 'sunset');
      if (advFilters.duration_max) {
        const maxMin = parseInt(advFilters.duration_max);
        if (!isNaN(maxMin)) query = query.lte('duration_min', maxMin);
      }
      if (filterSector) query = query.eq('sector_id', filterSector);

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingPromenades(false);
        return;
      }
      setDbReady(true);

      let enriched = (data || []) as Promenade[];
      if (profile && enriched.length > 0) {
        const ids = enriched.map(p => p.id);
        const { data: likesData } = await supabase
          .from('promenade_likes').select('promenade_id').in('promenade_id', ids).eq('user_id', profile.id);
        const likedSet = new Set((likesData || []).map((l: { promenade_id: string }) => l.promenade_id));
        const { data: countsData } = await supabase
          .from('promenade_likes').select('promenade_id').in('promenade_id', ids);
        const countMap: Record<string, number> = {};
        (countsData || []).forEach((l: { promenade_id: string }) => {
          countMap[l.promenade_id] = (countMap[l.promenade_id] || 0) + 1;
        });
        enriched = enriched.map(p => ({ ...p, user_liked: likedSet.has(p.id), likes_count: countMap[p.id] || 0 }));
      }
      setPromenades(enriched);
    } catch (err) {
      console.error('fetchPromenades error:', err);
      setDbReady(false);
    }
    setLoadingPromenades(false);
  }, [quickFilter, advFilters, filterSector, profile, supabase]);

  const handleLike = async (id: string, alreadyLiked: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour liker'); return; }
    if (alreadyLiked) {
      await supabase.from('promenade_likes').delete().eq('promenade_id', id).eq('user_id', profile.id);
    } else {
      await supabase.from('promenade_likes').insert({ promenade_id: id, user_id: profile.id });
    }
    setPromenades(prev =>
      prev.map(p => p.id === id
        ? { ...p, user_liked: !alreadyLiked, likes_count: (p.likes_count || 0) + (alreadyLiked ? -1 : 1) }
        : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim() || !form.description.trim()) { toast.error('Titre et description obligatoires'); return; }
    setSubmitting(true);
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const promPayload: Record<string, unknown> = {
      author_id: profile.id,
      title: form.title.trim(),
      description: form.description.trim(),
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      difficulty: form.difficulty,
      type: form.type,
      tags,
      start_point: form.start_point.trim() || null,
      dogs_allowed: form.dogs_allowed,
      stroller_friendly: form.stroller_friendly,
      parking_available: form.parking_available,
      water_access: form.water_access,
      shade_level: form.shade_level,
      best_time_of_day: form.best_time_of_day,
      route_loop: form.route_loop,
      practical_tips: form.practical_tips.trim() || null,
      safety_notes: form.safety_notes.trim() || null,
    };
    if (form.sector_id) promPayload.sector_id = form.sector_id;

    const { data: prom, error } = await supabase.from('promenades').insert(promPayload).select().single();
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      console.error('Promenade insert error:', error);
      setSubmitting(false);
      return;
    }
    if (photos.length > 0 && prom) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const ext = safeImageExt(photo.name);
        const fileName = `promenades/${prom.id}/${Date.now()}-${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(fileName, photo, { upsert: true });
        if (upErr) { toast.error(`Photo ${i + 1} : ${upErr.message}`); continue; }
        if (up?.path) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
          await supabase.from('promenade_photos').insert({ promenade_id: prom.id, url: publicUrl, display_order: i });
        }
      }
    }
    toast.success('🌿 Itinéraire publié !', { duration: 4000 });
    setForm(DEFAULT_PROMENADE_FORM);
    // Revoke all blob URLs before clearing
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviews([]);
    setShowForm(false);
    await fetchPromenades();
    setSubmitting(false);
  };

  return {
    promenades,
    loadingPromenades,
    dbReady,
    showForm, setShowForm,
    photos, setPhotos,
    photoPreviews, setPhotoPreviews,
    submitting,
    form, setForm,
    fetchPromenades,
    handleLike,
    handleSubmit,
  };
}
