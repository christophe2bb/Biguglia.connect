'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { LFItem, LFStatus, LFType, LFFormValues } from '../_types';
import {
  ACTIVE_STATUSES, HISTORY_STATUSES,
  ACTIVE_STATUSES_EN, HISTORY_STATUSES_EN,
  SENSITIVE_CATEGORIES, STATUS_CONFIG, EMPTY_FORM,
  normalizeItemStatus, normalizeItemType,
} from '../_constants';

// ─── Match engine (client-side) ───────────────────────────────────────────────
export function computeMatchScore(lost: LFItem, found: LFItem): number {
  let score = 0;
  if (lost.category === found.category) score += 40;
  if (lost.location_area === found.location_area) score += 20;
  if (lost.color && found.color && lost.color.toLowerCase() === found.color.toLowerCase()) score += 15;
  if (lost.brand && found.brand && lost.brand.toLowerCase() === found.brand.toLowerCase()) score += 15;
  const dLost = new Date(lost.lost_date).getTime();
  const dFound = new Date(found.lost_date).getTime();
  const diffDays = Math.abs(dLost - dFound) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) score += 10;
  else if (diffDays <= 7) score += 5;
  const lWords = (lost.title + ' ' + lost.description).toLowerCase().split(/\s+/);
  const fWords = (found.title + ' ' + found.description).toLowerCase().split(/\s+/);
  const common = lWords.filter(w => w.length > 3 && fWords.includes(w)).length;
  if (common > 0) score += Math.min(common * 3, 15);
  return Math.min(score, 100);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLostFound(profileId?: string) {
  const supabase = createClient();

  // ── List state ──
  const [items, setItems]               = useState<LFItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [dbReady, setDbReady]           = useState(true);

  // ── Filter state ──
  const [flux, setFlux]                 = useState<'actif' | 'historique'>('actif');
  const [filterType, setFilterType]     = useState<'all' | LFType>('all');
  const [filterCat, setFilterCat]       = useState('all');
  const [filterStatus, setFilterStatus] = useState<LFStatus | 'all'>('all');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [search, setSearch]             = useState('');

  // ── Form / UI state ──
  const [showForm, setShowForm]         = useState(false);
  const [editingItem, setEditingItem]   = useState<LFItem | null>(null);
  const [form, setForm]                 = useState<LFFormValues>(EMPTY_FORM);
  const [photos, setPhotos]             = useState<File[]>([]);
  const [previews, setPreviews]         = useState<string[]>([]);
  const [submitting, setSubmitting]     = useState(false);
  const [step, setStep]                 = useState(1);
  const photoRef                        = useRef<HTMLInputElement>(null);

  // ─── fetchItems ─────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);

    const buildQuery = (selectStr: string) => {
      let q = supabase
        .from('lost_found_items')
        .select(selectStr)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(100);
      if (flux === 'actif') q = q.in('status', [...ACTIVE_STATUSES, ...ACTIVE_STATUSES_EN]);
      else                  q = q.in('status', [...HISTORY_STATUSES, ...HISTORY_STATUSES_EN]);
      if (filterType !== 'all')    q = q.eq('type', filterType);
      if (filterCat !== 'all')     q = q.eq('category', filterCat);
      if (filterStatus !== 'all')  q = q.eq('status', filterStatus);
      if (filterSector) {
        try { q = q.eq('sector_id', filterSector); } catch { /* optionnel */ }
      }
      return q;
    };

    // Tentative 1 — FK explicite
    let { data, error } = await buildQuery(
      '*, author:profiles!lost_found_items_author_id_fkey(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover)'
    );
    // Tentative 2 — sans FK nommée
    if (error?.message?.includes('fkey') || error?.message?.includes('foreign') || error?.code === 'PGRST200') {
      ({ data, error } = await buildQuery(
        '*, author:profiles(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover)'
      ));
    }
    // Tentative 3 — sans jointures
    if (error?.message?.includes('fkey') || error?.message?.includes('foreign') || error?.code === 'PGRST200') {
      ({ data, error } = await buildQuery('*'));
    }

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('column')) {
        setDbReady(false);
      }
      setLoading(false);
      return;
    }
    setDbReady(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = (data || []) as unknown as (LFItem & { photos?: { url: string; display_order?: number; is_cover?: boolean }[] })[];
    const enriched = rawData.map(it => ({
      ...it,
      status: normalizeItemStatus(it.status),
      type:   normalizeItemType(it.type),
      photos: (it.photos || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    }));

    const filtered = search.trim()
      ? enriched.filter(it =>
          it.title.toLowerCase().includes(search.toLowerCase()) ||
          it.description.toLowerCase().includes(search.toLowerCase()) ||
          it.location_area.toLowerCase().includes(search.toLowerCase()) ||
          (it.brand && it.brand.toLowerCase().includes(search.toLowerCase())) ||
          (it.color && it.color.toLowerCase().includes(search.toLowerCase()))
        )
      : enriched;

    setItems(filtered as LFItem[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flux, filterType, filterCat, filterStatus, filterSector, search]);

  // ─── Match engine ────────────────────────────────────────────────────────────
  const getSuggestedMatches = useCallback((item: LFItem): LFItem[] => {
    if (!ACTIVE_STATUSES.includes(item.status)) return [];
    const oppositeType: LFType = item.type === 'perdu' ? 'trouve' : 'perdu';
    return items
      .filter(other =>
        other.type === oppositeType &&
        other.id !== item.id &&
        ACTIVE_STATUSES.includes(other.status) &&
        other.category === item.category
      )
      .map(other => ({
        item: other,
        score: computeMatchScore(
          item.type === 'perdu' ? item : other,
          item.type === 'perdu' ? other : item
        ),
      }))
      .filter(({ score }) => score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ item }) => item);
  }, [items]);

  // ─── Photo helpers ───────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 5 - photos.length);
    setPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    if (photoRef.current) photoRef.current.value = '';
  };

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  // ─── Form helpers ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotos([]);
    setPreviews([]);
    setEditingItem(null);
    setShowForm(false);
    setStep(1);
  };

  const startEdit = (item: LFItem) => {
    setEditingItem(item);
    setForm({
      type: item.type,
      title: item.title,
      category: item.category,
      description: item.description,
      brand: item.brand ?? '',
      color: item.color ?? '',
      distinctive_sign: item.distinctive_sign ?? '',
      keep_secret: item.keep_secret,
      is_sensitive: item.is_sensitive,
      lost_date: item.lost_date,
      lost_time: item.lost_time ?? '',
      location_area: item.location_area,
      location_detail: item.location_detail ?? '',
      contact_name: item.contact_name,
      contact_phone: item.contact_phone ?? '',
      contact_email: item.contact_email ?? '',
      contact_mode: item.contact_mode,
      show_phone: item.show_phone,
      reward: item.reward ?? '',
      sentimental_value: item.sentimental_value,
      declared_authorities: item.declared_authorities,
      need_community_help: item.need_community_help,
      deposited: !!item.deposited_at,
      deposited_at: item.deposited_at ?? '',
      proof_required: item.proof_required,
      confirm_true: true,
      confirm_public: true,
      confirm_intermediary: true,
      sector_id: item.sector_id ?? '',
    });
    setPhotos([]);
    setPreviews([]);
    setShowForm(true);
    setStep(1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (
    asDraft: boolean,
    profile: { id: string; full_name?: string | null }
  ) => {
    if (!form.title.trim() || !form.lost_date || !form.location_area) {
      toast.error('Titre, date et lieu sont obligatoires');
      return;
    }
    if (!asDraft && (!form.confirm_true || !form.confirm_public || !form.confirm_intermediary)) {
      toast.error('Veuillez cocher les 3 cases de validation');
      return;
    }

    setSubmitting(true);
    const isSensitiveCat = SENSITIVE_CATEGORIES.includes(form.category);
    const initialStatus: LFStatus = asDraft ? 'draft' : form.type === 'perdu' ? 'perdu' : 'trouve';

    const payload = {
      author_id: profile.id,
      type: form.type,
      status: initialStatus,
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      brand: form.brand.trim() || null,
      color: form.color.trim() || null,
      distinctive_sign: form.distinctive_sign.trim() || null,
      keep_secret: form.keep_secret,
      is_sensitive: form.is_sensitive || isSensitiveCat,
      lost_date: form.lost_date,
      lost_time: form.lost_time || null,
      sector_id: form.sector_id || null,
      location_area: form.location_area,
      location_detail: form.location_detail.trim() || null,
      contact_name: form.contact_name.trim() || profile.full_name || 'Anonyme',
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_mode: form.contact_mode,
      show_phone: form.show_phone,
      reward: form.reward.trim() || null,
      sentimental_value: form.sentimental_value,
      declared_authorities: form.declared_authorities,
      need_community_help: form.need_community_help,
      deposited_at: form.deposited ? (form.deposited_at || null) : null,
      proof_required: form.proof_required,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    let itemId: string | null = null;

    if (editingItem) {
      const { error } = await supabase.from('lost_found_items').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Erreur modification'); setSubmitting(false); return; }
      itemId = editingItem.id;
      toast.success('Annonce modifiée ✓');
    } else {
      const { data: inserted, error } = await supabase
        .from('lost_found_items').insert(payload).select('id').single();
      if (error) { toast.error('Erreur publication'); setSubmitting(false); return; }
      itemId = inserted?.id ?? null;
      toast.success(
        asDraft
          ? 'Brouillon enregistré ✓'
          : `${form.type === 'perdu' ? '🔴 Annonce "Perdu"' : '🟢 Annonce "Trouvé"'} publiée !`,
        { duration: 4000 }
      );
    }

    // Upload photos
    if (photos.length > 0 && itemId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `lost-found/${itemId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { toast.error(`Photo ${i + 1} non sauvegardée`); continue; }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          await supabase.from('lf_photos').insert({
            item_id: itemId, url: u.publicUrl, display_order: i, is_cover: i === 0,
          });
        }
      }
    }

    resetForm();
    fetchItems();
    setSubmitting(false);
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await supabase.from('lost_found_items').update({
      status: 'archive',
      archived_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    }).eq('id', id);
    toast.success('Annonce archivée');
    fetchItems();
  };

  // ─── Status change ───────────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, newStatus: LFStatus) => {
    const now = new Date().toISOString();
    const updates: Record<string, string | null> = { status: newStatus, updated_at: now };
    if (newStatus === 'restitue') updates.restitution_confirmed_at = now;
    if (newStatus === 'clos')     updates.closed_at   = now;
    if (newStatus === 'archive')  updates.archived_at = now;

    await supabase.from('lost_found_items').update(updates).eq('id', id);

    try {
      await supabase.from('lf_status_history').insert({
        item_id: id, new_status: newStatus, changed_by: profileId,
      });
    } catch { /* silencieux si table absente */ }

    if (newStatus === 'restitue' && profileId) {
      const item = items.find(i => i.id === id);
      if (item && item.author_id !== profileId) {
        try {
          await supabase.from('trust_interactions').insert({
            source_type: 'lost_found',
            source_id: id,
            requester_id: profileId,
            receiver_id: item.author_id,
            interaction_type: 'transaction',
            status: 'done',
            requester_review_allowed: true,
            receiver_review_allowed: true,
            completed_at: now,
          });
        } catch { /* silencieux */ }
      }
    }

    const cfg = STATUS_CONFIG[newStatus];
    toast.success(`✅ Statut : ${cfg.icon} ${cfg.label}`);
    fetchItems();
  };

  // ─── Computed stats ──────────────────────────────────────────────────────────
  const perdusCount    = items.filter(i => i.status === 'perdu').length;
  const trouveCount    = items.filter(i => i.status === 'trouve').length;
  const identifieCount = items.filter(i => i.status === 'identifie').length;
  const restitueCount  = items.filter(i => i.status === 'restitue').length;

  return {
    // List
    items, loading, dbReady, fetchItems,
    // Filters
    flux, setFlux,
    filterType, setFilterType,
    filterCat, setFilterCat,
    filterStatus, setFilterStatus,
    filterSector, setFilterSector,
    search, setSearch,
    // Form
    showForm, setShowForm,
    editingItem,
    form, setForm,
    photos, previews,
    submitting,
    step, setStep,
    photoRef,
    handlePhotoSelect, removePhoto,
    resetForm, startEdit,
    handleSubmit, handleDelete, handleStatusChange,
    // Matching
    getSuggestedMatches,
    // Stats
    perdusCount, trouveCount, identifieCount, restitueCount,
  };
}
