'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { SECTORS } from '@/lib/sectors';
import toast from 'react-hot-toast';
import { CATEGORIES, EMPTY_FORM, STATUS_LABELS } from '../_constants';
import type {
  HelpRequest, HelpFormValues, HelpFilters, HelpType, UrgencyLevel,
} from '../_types';

const LS_KEY = 'biguglia_saved_help';
const PAGE_SIZE = 12;

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useCoupsDeMain() {
  const { profile } = useAuthStore();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const router = useRouter();

  // ── Données ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<HelpRequest | null>(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<HelpFormValues>(EMPTY_FORM);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // ── Filtres ────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<HelpFilters>({
    filterType: 'all',
    filterCat: 'all',
    filterUrgency: 'all',
    filterSector: null,
    filterFree: false,
    filterMyHelp: false,
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // ── Favoris ────────────────────────────────────────────────────────────────
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(LS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        author:profiles(full_name, avatar_url, created_at),
        photos:help_photos(url, display_order)
      `)
      .neq('status', 'draft')
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) setDbReady(false);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all((data ?? []).map(async (item: HelpRequest) => {
      const [{ count: cCount }, { count: hCount }] = await Promise.all([
        supabase.from('help_comments').select('id', { count: 'exact', head: true }).eq('help_id', item.id),
        supabase.from('help_request_participants').select('id', { count: 'exact', head: true }).eq('help_request_id', item.id).eq('role', 'helper'),
      ]);
      return { ...item, comment_count: cCount ?? 0, helper_count: hCount ?? 0 };
    }));

    setItems(enriched as HelpRequest[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Reset page on filter change ────────────────────────────────────────────
  useEffect(() => { setPage(1); }, [filters]);

  // ── Favoris ────────────────────────────────────────────────────────────────
  const toggleSave = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast('Retiré des favoris', { icon: '🔖' });
      } else {
        next.add(id);
        toast.success('⭐ Ajouté aux favoris');
      }
      try { localStorage.setItem(LS_KEY, JSON.stringify(Array.from(next))); } catch { /* noop */ }
      return next;
    });
  };

  // ── Je peux aider ──────────────────────────────────────────────────────────
  const handleCanHelp = async (helpId: string, title: string) => {
    if (!profile) { toast.error('Connectez-vous pour proposer votre aide'); router.push('/connexion'); return; }
    const { error } = await supabase.from('help_request_participants').upsert(
      { help_request_id: helpId, user_id: profile.id, role: 'helper', state: 'pending' },
      { onConflict: 'help_request_id,user_id' }
    );
    if (error && !error.message.includes('duplicate')) {
      toast.error('Erreur : ' + error.message);
    } else {
      toast.success(`✅ Votre aide pour "${title.slice(0, 40)}" a été proposée !`, { duration: 4000 });
    }
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await supabase.from('help_requests').delete().eq('id', id);
    toast.success('Annonce supprimée');
    fetchItems();
  };

  const handleResolve = async (id: string) => {
    await supabase.from('help_requests').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id);
    toast.success('✅ Marqué comme résolu ! Merci pour votre entraide.');
    fetchItems();
  };

  const handlePause = async (id: string, wasPaused: boolean) => {
    await supabase.from('help_requests').update({ status: wasPaused ? 'active' : 'paused' }).eq('id', id);
    toast.success(wasPaused ? '▶️ Annonce réactivée' : '⏸ Annonce mise en pause');
    fetchItems();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('help_requests').update({ status: newStatus }).eq('id', id);
    toast.success(`✅ Statut : ${STATUS_LABELS[newStatus] || newStatus}`);
    fetchItems();
  };

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotos([]);
    setPreviews([]);
    setStep(1);
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: HelpRequest) => {
    setEditingItem(item);
    setForm({
      help_type:           item.help_type,
      title:               item.title,
      category:            item.category,
      description:         item.description,
      urgency:             item.urgency,
      help_date:           item.help_date ?? '',
      help_time:           item.help_time ?? '',
      sector_id:           item.sector_id ?? '',
      location_area:       item.location_area,
      location_city:       item.location_city,
      location_detail:     item.location_detail ?? '',
      duration:            item.duration,
      persons_needed:      item.persons_needed,
      compensation:        item.compensation,
      compensation_detail: item.compensation_detail ?? '',
      equipment:           item.equipment ?? [],
      for_who:             item.for_who,
      conditions:          item.conditions ?? [],
      visibility:          item.visibility,
      contact_mode:        item.contact_mode,
      display_name:        item.display_name,
      check1: true, check2: true, check3: true, check4: true, check5: true,
    });
    setStep(1);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePhotoSelect = (files: File[], photoInputReset?: () => void) => {
    if (photos.length + files.length > 5) { toast.error('5 photos maximum'); return; }
    setPhotos(p => [...p, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(p => [...p, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    photoInputReset?.();
  };

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const toggleArr = (key: 'equipment' | 'conditions', val: string) => {
    setForm(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(v => v !== val) : [...f[key], val] }));
  };

  const handleSubmit = async (isDraft = false) => {
    if (!profile) { toast.error('Connectez-vous'); return; }
    if (!form.title.trim()) { toast.error('Titre obligatoire'); return; }
    if (!form.description.trim()) { toast.error('Description obligatoire'); return; }
    if (!isDraft && (!form.check1 || !form.check2 || !form.check3 || !form.check4 || !form.check5)) {
      toast.error('Cochez toutes les cases de validation'); return;
    }

    setSubmitting(true);
    const payload = {
      author_id:           profile.id,
      help_type:           form.help_type,
      status:              isDraft ? 'draft' : 'active',
      title:               form.title.trim(),
      category:            form.category,
      description:         form.description.trim(),
      urgency:             form.urgency,
      help_date:           form.help_date || null,
      help_time:           form.help_time || null,
      sector_id:           form.sector_id || null,
      location_area:       form.location_area,
      location_city:       form.location_city,
      location_detail:     form.location_detail || null,
      duration:            form.duration,
      persons_needed:      form.persons_needed,
      compensation:        form.compensation,
      compensation_detail: form.compensation_detail || null,
      equipment:           form.equipment,
      for_who:             form.for_who,
      conditions:          form.conditions,
      visibility:          form.visibility,
      contact_mode:        form.contact_mode,
      display_name:        form.display_name,
    };

    let itemId: string | null = null;
    if (editingItem) {
      const { error } = await supabase.from('help_requests').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Erreur modification : ' + error.message); setSubmitting(false); return; }
      itemId = editingItem.id;
      toast.success('✅ Annonce modifiée !');
    } else {
      const { data, error } = await supabase.from('help_requests').insert(payload).select('id').single();
      if (error) { toast.error('Erreur publication : ' + error.message); setSubmitting(false); return; }
      itemId = data?.id ?? null;
      toast.success(isDraft ? '💾 Brouillon enregistré' : '🤝 Annonce publiée !', { duration: 4000 });
    }

    if (photos.length > 0 && itemId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `coups-de-main/${itemId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { toast.error(`Photo ${i + 1} non sauvegardée`); continue; }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          await supabase.from('help_photos').insert({ help_id: itemId, url: u.publicUrl, display_order: i });
        }
      }
    }

    resetForm();
    fetchItems();
    setSubmitting(false);
  };

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const filtered = items.filter(item => {
    const { filterType, filterCat, filterUrgency, filterSector, filterFree, filterMyHelp, search } = filters;
    if (filterType !== 'all' && item.help_type !== filterType) return false;
    if (filterCat !== 'all' && item.category !== filterCat) return false;
    if (filterUrgency !== 'all' && item.urgency !== filterUrgency) return false;
    if (filterSector && item.sector_id !== filterSector) return false;
    if (filterFree && item.compensation !== 'gratuit') return false;
    if (filterMyHelp && !savedIds.has(item.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      const catLabel = CATEGORIES.find(c => c.value === item.category)?.label?.toLowerCase() ?? '';
      const sectorName = item.sector_id ? (SECTORS.find(s => s.id === item.sector_id)?.name?.toLowerCase() ?? '') : '';
      if (
        !item.title.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q) &&
        !item.location_area.toLowerCase().includes(q) &&
        !catLabel.includes(q) &&
        !sectorName.includes(q) &&
        !(item.author?.full_name?.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeFiltersCount = [
    filters.filterType !== 'all',
    filters.filterCat !== 'all',
    filters.filterUrgency !== 'all',
    !!filters.filterSector,
    filters.filterFree,
    filters.filterMyHelp,
    !!filters.search,
  ].filter(Boolean).length;

  const resetFilters = () => setFilters({
    filterType: 'all',
    filterCat: 'all',
    filterUrgency: 'all',
    filterSector: null,
    filterFree: false,
    filterMyHelp: false,
    search: '',
  });

  const setFilterType     = (v: 'all' | HelpType) => setFilters(f => ({ ...f, filterType: v }));
  const setFilterCat      = (v: string) => setFilters(f => ({ ...f, filterCat: v }));
  const setFilterUrgency  = (v: 'all' | UrgencyLevel) => setFilters(f => ({ ...f, filterUrgency: v }));
  const setFilterSector   = (v: string | null) => setFilters(f => ({ ...f, filterSector: v }));
  const setFilterFree     = (v: boolean) => setFilters(f => ({ ...f, filterFree: v }));
  const setFilterMyHelp   = (v: boolean) => setFilters(f => ({ ...f, filterMyHelp: v }));
  const setSearch         = (v: string) => setFilters(f => ({ ...f, search: v }));

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpi = {
    totalActive: items.filter(i => i.status === 'active').length,
    demandes:    items.filter(i => i.help_type === 'demande' && i.status === 'active').length,
    offres:      items.filter(i => i.help_type === 'offre'   && i.status === 'active').length,
    echanges:    items.filter(i => i.help_type === 'echange' && i.status === 'active').length,
    urgents:     items.filter(i => i.urgency === 'urgent'    && i.status === 'active').length,
    gratuits:    items.filter(i => i.compensation === 'gratuit' && i.status === 'active').length,
  };

  return {
    // Data
    items, loading, dbReady,
    // Form
    showForm, setShowForm, editingItem, step, setStep, submitting,
    form, setForm, photos, previews,
    resetForm, handleEdit, handlePhotoSelect, removePhoto, toggleArr, handleSubmit,
    // CRUD
    fetchItems, handleDelete, handleResolve, handlePause, handleStatusChange, handleCanHelp,
    // Filters
    filters, showFilters, setShowFilters,
    setFilterType, setFilterCat, setFilterUrgency, setFilterSector, setFilterFree, setFilterMyHelp, setSearch,
    activeFiltersCount, resetFilters,
    // Pagination
    page, setPage, totalPages, paginated, filtered,
    // Favorites
    savedIds, toggleSave,
    // KPIs
    kpi,
    // Profile
    profile,
  };
}
