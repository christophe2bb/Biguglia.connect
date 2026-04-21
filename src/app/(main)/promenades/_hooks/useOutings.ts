'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { legacyToFrenchStatus, OUTING_STATUS_CONFIG } from '@/lib/outings';
import type { GroupOuting, OutingFormState } from '../_types';
import { DEFAULT_OUTING_FORM } from '../_constants';
import { safeImageExt } from '@/lib/upload-utils';

export function useOutings(profile: { id: string } | null | undefined) {
  const supabase = useMemo(() => createClient(), []);

  const [outings, setOutings] = useState<GroupOuting[]>([]);
  const [loadingOutings, setLoadingOutings] = useState(false);

  // Outing form state
  const [showOutingForm, setShowOutingForm] = useState(false);
  const [editingOuting, setEditingOuting] = useState<GroupOuting | null>(null);
  const [outingForm, setOutingForm] = useState<OutingFormState>(DEFAULT_OUTING_FORM);
  const [outingPhotos, setOutingPhotos] = useState<File[]>([]);
  const [outingPreviews, setOutingPreviews] = useState<string[]>([]);
  const outingPhotoRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
  const [submittingOuting, setSubmittingOuting] = useState(false);

  const fetchOutings = useCallback(async () => {
    setLoadingOutings(true);
    const { data } = await supabase
      .from('group_outings')
      .select(`*, organizer:profiles!group_outings_organizer_id_fkey(full_name), participants:outing_participants(count), sector_id`)
      .in('status', ['ouverte', 'complete', 'open', 'active', 'full'])
      .gte('outing_date', new Date().toISOString().split('T')[0])
      .order('outing_date', { ascending: true })
      .limit(20);

    const enriched = (data || []).map((o: GroupOuting & { participants?: { count: number }[] }) => ({
      ...o,
      participants_count: o.participants?.[0]?.count ?? 0,
      user_joined: false,
    }));

    if (enriched.length > 0) {
      const ids = enriched.map(o => o.id);
      const { data: photosData } = await supabase
        .from('outing_photos').select('outing_id, url, display_order')
        .in('outing_id', ids).order('display_order', { ascending: true });
      const photoMap: Record<string, string> = {};
      (photosData || []).forEach((p: { outing_id: string; url: string }) => {
        if (!photoMap[p.outing_id]) photoMap[p.outing_id] = p.url;
      });
      enriched.forEach(o => { o.cover_photo = photoMap[o.id] ?? null; });
    }

    if (profile && enriched.length > 0) {
      const ids = enriched.map(o => o.id);
      const { data: joins } = await supabase
        .from('outing_participants').select('outing_id')
        .in('outing_id', ids).eq('user_id', profile.id);
      const joinedSet = new Set((joins || []).map((j: { outing_id: string }) => j.outing_id));
      setOutings(enriched.map(o => ({ ...o, user_joined: joinedSet.has(o.id) })));
    } else {
      setOutings(enriched);
    }
    setLoadingOutings(false);
  }, [profile, supabase]);

  const handleOutingPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 3 - outingPhotos.length);
    setOutingPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setOutingPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeOutingPhoto = (i: number) => {
    setOutingPhotos(p => p.filter((_, idx) => idx !== i));
    setOutingPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const resetOutingForm = () => {
    setOutingForm(DEFAULT_OUTING_FORM);
    setOutingPhotos([]);
    setOutingPreviews([]);
    setEditingOuting(null);
    setShowOutingForm(false);
  };

  const startEditOuting = (o: GroupOuting) => {
    setEditingOuting(o);
    setOutingForm({
      title: o.title,
      description: o.description || '',
      outing_date: o.outing_date,
      outing_time: o.outing_time,
      max_participants: String(o.max_participants),
      meeting_point: o.meeting_point || '',
      parking_info: o.parking_info || '',
      parking_available: o.parking_available || false,
      stroller_accessible: o.stroller_accessible || false,
      difficulty: o.difficulty || 'facile',
      kids_friendly: o.kids_friendly || false,
      dogs_allowed: o.dogs_allowed || false,
      sector_id: o.sector_id || '',
    });
    setOutingPhotos([]);
    setOutingPreviews([]);
    setShowOutingForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handleDeleteOuting = async (id: string) => {
    if (!confirm('Supprimer cette sortie ?')) return;
    await supabase.from('group_outings').delete().eq('id', id);
    toast.success('Sortie supprimée');
    fetchOutings();
  };

  const handleOutingStatusChange = async (id: string, newStatus: string) => {
    const frenchMap: Record<string, string> = {
      active: 'ouverte', open: 'ouverte', full: 'complete',
      completed: 'terminee', cancelled: 'annulee', archived: 'archivee',
    };
    const frStatus = frenchMap[newStatus] || newStatus;
    await createClient()
      .from('group_outings')
      .update({ status: frStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    const cfg = OUTING_STATUS_CONFIG[legacyToFrenchStatus(frStatus)];
    toast.success(`${cfg?.icon || '✅'} Statut : ${cfg?.label || frStatus}`);
    fetchOutings();
  };

  const handleOutingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!outingForm.title.trim() || !outingForm.outing_date) {
      toast.error('Titre et date obligatoires'); return;
    }
    setSubmittingOuting(true);

    const fullPayload: Record<string, unknown> = {
      organizer_id: profile.id,
      title: outingForm.title.trim(),
      description: outingForm.description.trim() || null,
      outing_date: outingForm.outing_date,
      outing_time: outingForm.outing_time || null,
      max_participants: parseInt(outingForm.max_participants) || 10,
      meeting_point: outingForm.meeting_point.trim() || null,
      parking_info: outingForm.parking_info.trim() || null,
      parking_available: outingForm.parking_available,
      stroller_accessible: outingForm.stroller_accessible,
      difficulty: outingForm.difficulty,
      kids_friendly: outingForm.kids_friendly,
      dogs_allowed: outingForm.dogs_allowed,
    };
    if (outingForm.sector_id) fullPayload.sector_id = outingForm.sector_id;

    const minPayload: Record<string, unknown> = {
      organizer_id: profile.id,
      title: outingForm.title.trim(),
      description: outingForm.description.trim() || null,
      outing_date: outingForm.outing_date,
      outing_time: outingForm.outing_time || null,
      max_participants: parseInt(outingForm.max_participants) || 10,
      meeting_point: outingForm.meeting_point.trim() || null,
    };

    let outingId: string | null = null;

    if (editingOuting) {
      const { error } = await supabase.from('group_outings').update(fullPayload).eq('id', editingOuting.id);
      if (error) {
        console.warn('Update enrichi échoué, fallback minimal:', error.message);
        const { error: err2 } = await supabase.from('group_outings').update(minPayload).eq('id', editingOuting.id);
        if (err2) { toast.error(`Erreur modification : ${err2.message}`); setSubmittingOuting(false); return; }
      }
      outingId = editingOuting.id;
      toast.success('Sortie modifiée ✓');
    } else {
      const { data: inserted, error } = await supabase.from('group_outings').insert(fullPayload).select('id').single();
      if (error) {
        console.warn('Insert enrichi échoué, fallback minimal. Erreur:', error.message);
        if (error.message?.includes('column') || error.code === '42703') {
          toast('ℹ️ Migration SQL requise pour les options avancées — sortie créée en mode simplifié', { icon: '⚠️', duration: 5000 });
        }
        const { data: ins2, error: err2 } = await supabase.from('group_outings').insert(minPayload).select('id').single();
        if (err2) { toast.error(`Erreur création : ${err2.message}`); setSubmittingOuting(false); return; }
        outingId = ins2?.id ?? null;
      } else {
        outingId = inserted?.id ?? null;
      }
      toast.success('🥾 Sortie créée !', { duration: 4000 });
    }

    if (outingPhotos.length > 0 && outingId) {
      for (let i = 0; i < outingPhotos.length; i++) {
        const file = outingPhotos[i];
        const ext = safeImageExt(file.name);
        const path = `outings/${outingId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { toast.error(`Photo ${i + 1} : ${upErr.message}`); continue; }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          await supabase.from('outing_photos').insert({ outing_id: outingId, url: u.publicUrl, display_order: i });
        }
      }
    }

    resetOutingForm();
    await fetchOutings();
    setSubmittingOuting(false);
  };

  const handleJoinOuting = async (outingId: string, joined: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour participer'); return; }
    if (joined) {
      await supabase.from('outing_participants').delete().eq('outing_id', outingId).eq('user_id', profile.id);
      toast.success('Inscription annulée');
    } else {
      const { error } = await supabase.from('outing_participants').insert({ outing_id: outingId, user_id: profile.id });
      if (error) { toast.error('Erreur lors de l\'inscription'); return; }
      toast.success('Inscription confirmée !');
    }
    fetchOutings();
  };

  return {
    outings,
    loadingOutings,
    showOutingForm, setShowOutingForm,
    editingOuting,
    outingForm, setOutingForm,
    outingPhotos, outingPreviews,
    outingPhotoRef,
    submittingOuting,
    fetchOutings,
    handleOutingPhotoSelect,
    removeOutingPhoto,
    resetOutingForm,
    startEditOuting,
    handleDeleteOuting,
    handleOutingStatusChange,
    handleOutingSubmit,
    handleJoinOuting,
  };
}
