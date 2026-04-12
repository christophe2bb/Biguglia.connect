'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { Association, AssociationFormData, AssoCategory, PubType } from '../_types';
import { EMPTY_FORM } from '../_constants';
import { SECTORS } from '@/lib/sectors';

export type Filters = {
  filterCat: AssoCategory | 'all';
  filterType: PubType | 'all';
  filterSector: string | null;
  filterNeed: string;
  filterPublic: string;
  search: string;
  showSavedOnly: boolean;
};

export function useAssociations() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ── Data state ──────────────────────────────────────────────────────────────
  const [assos, setAssos] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterCat, setFilterCat] = useState<AssoCategory | 'all'>('all');
  const [filterType, setFilterType] = useState<PubType | 'all'>('all');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [filterNeed, setFilterNeed] = useState('');
  const [filterPublic, setFilterPublic] = useState('');
  const [search, setSearch] = useState('');
  const [showAdvFilters, setShowAdvFilters] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingAsso, setEditingAsso] = useState<Association | null>(null);
  const [form, setForm] = useState<AssociationFormData>(EMPTY_FORM);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const photoRef = useRef<HTMLInputElement>(null);

  // ── Saved / favoris ─────────────────────────────────────────────────────────
  const [savedAssos, setSavedAssos] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('biguglia_saved_assos');
      if (raw) setSavedAssos(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  const toggleSaved = (id: string) => {
    setSavedAssos(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast('Association retirée des favoris'); }
      else { next.add(id); toast.success('⭐ Ajoutée aux favoris !'); }
      try { localStorage.setItem('biguglia_saved_assos', JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAssos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('associations')
      .select('*, author:profiles!associations_author_id_fkey(full_name, avatar_url), photos:asso_photos(url, display_order)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(60);

    if (filterCat !== 'all') query = query.eq('category', filterCat);
    if (filterType !== 'all') query = query.eq('pub_type', filterType);
    if (filterSector) {
      try { query = query.eq('sector_id', filterSector); } catch { /* optionnel */ }
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation')) setDbReady(false);
      setLoading(false);
      return;
    }
    setDbReady(true);

    let enriched = (data || []).map((a: Association & { photos?: { url: string; display_order: number }[] }) => ({
      ...a,
      photos: (a.photos || []).sort((x, y) => (x.display_order ?? 0) - (y.display_order ?? 0)),
    }));

    // Recherche plein texte enrichie (CDC §7.1)
    if (search.trim()) {
      const q = search.toLowerCase();
      enriched = enriched.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description_short.toLowerCase().includes(q) ||
        (a.description_full ?? '').toLowerCase().includes(q) ||
        a.tags.some((t: string) => t.toLowerCase().includes(q)) ||
        a.needs.some((n: string) => n.toLowerCase().includes(q)) ||
        a.activities.some((ac: string) => ac.toLowerCase().includes(q)) ||
        a.public_target.some((p: string) => p.toLowerCase().includes(q)) ||
        (a.contact_name ?? '').toLowerCase().includes(q)
      );
    }

    // Filtre besoin actif
    if (filterNeed) {
      enriched = enriched.filter(a =>
        a.needs.some((n: string) => n.toLowerCase().includes(filterNeed.toLowerCase())) ||
        (filterNeed === 'benevoles' && (a.is_accepting_volunteers || a.pub_type === 'benevoles')) ||
        (filterNeed === 'dons' && (a.is_accepting_donations || a.pub_type === 'dons')) ||
        (filterNeed === 'adherents' && (a.is_accepting_members || a.pub_type === 'adherents')) ||
        (filterNeed === 'partenaires' && (a.is_accepting_partners || a.pub_type === 'partenaires'))
      );
    }

    // Filtre public
    if (filterPublic) {
      enriched = enriched.filter(a => a.public_target.some((p: string) => p === filterPublic));
    }

    setAssos(enriched as Association[]);
    setLoading(false);
  }, [filterCat, filterType, filterSector, search, filterNeed, filterPublic, supabase]);

  useEffect(() => { fetchAssos(); }, [fetchAssos]);

  // ── Photo helpers ────────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 6 - photos.length);
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

  // ── Toggle helpers ───────────────────────────────────────────────────────────
  const toggle = (key: 'public_target' | 'activities' | 'tags' | 'needs', val: string) => {
    setForm(f => ({
      ...f,
      [key]: (f[key] as string[]).includes(val)
        ? (f[key] as string[]).filter(x => x !== val)
        : [...(f[key] as string[]), val],
    }));
  };

  // ── Reset / edit ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotos([]); setPreviews([]);
    setEditingAsso(null); setShowForm(false); setStep(1);
  };

  const startEdit = (a: Association) => {
    setEditingAsso(a);
    setForm({
      pub_type: a.pub_type, name: a.name, slogan: a.slogan ?? '',
      category: a.category, description_short: a.description_short,
      description_full: a.description_full ?? '', location: a.location,
      address: a.address ?? '', schedule: a.schedule ?? '',
      public_target: a.public_target, age_min: a.age_min?.toString() ?? '',
      age_max: a.age_max?.toString() ?? '', membership_required: a.membership_required,
      price_type: a.price_type, price_detail: a.price_detail ?? '',
      capacity: a.capacity?.toString() ?? '', activities: a.activities,
      frequency: a.frequency ?? '', tags: a.tags, needs: a.needs,
      need_detail: a.need_detail ?? '', contact_name: a.contact_name,
      contact_role: a.contact_role ?? '', contact_phone: a.contact_phone ?? '',
      contact_email: a.contact_email ?? '', contact_website: a.contact_website ?? '',
      contact_facebook: a.contact_facebook ?? '', contact_instagram: a.contact_instagram ?? '',
      contact_mode: a.contact_mode, show_phone: a.show_phone,
      declared: a.declared, rna_number: a.rna_number ?? '',
      pmr_accessible: a.pmr_accessible, families_welcome: a.families_welcome,
      animals_ok: a.animals_ok, indoor: a.indoor, parking_nearby: a.parking_nearby,
      material_provided: a.material_provided, registration_required: a.registration_required,
      places_limited: a.places_limited, urgent_need: a.urgent_need,
      sector_id: a.sector_id ?? '',
      is_accepting_members: a.is_accepting_members ?? false,
      is_accepting_volunteers: a.is_accepting_volunteers ?? false,
      is_accepting_donations: a.is_accepting_donations ?? false,
      is_accepting_partners: a.is_accepting_partners ?? false,
    });
    setPhotos([]); setPreviews([]);
    setShowForm(true); setStep(1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (profileId: string, profileName: string, asDraft = false) => {
    if (!form.name.trim() || !form.description_short.trim()) {
      toast.error('Nom et description courte obligatoires'); return;
    }
    setSubmitting(true);
    const payload = {
      author_id: profileId,
      pub_type: form.pub_type,
      status: asDraft ? 'draft' : 'active',
      name: form.name.trim(),
      slogan: form.slogan.trim() || null,
      category: form.category,
      description_short: form.description_short.trim(),
      description_full: form.description_full.trim() || null,
      location: form.location || 'Biguglia',
      address: form.address.trim() || null,
      schedule: form.schedule.trim() || null,
      public_target: form.public_target,
      age_min: form.age_min ? parseInt(form.age_min) : null,
      age_max: form.age_max ? parseInt(form.age_max) : null,
      membership_required: form.membership_required,
      price_type: form.price_type,
      price_detail: form.price_detail.trim() || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      activities: form.activities,
      frequency: form.frequency.trim() || null,
      tags: form.tags,
      needs: form.needs,
      need_detail: form.need_detail.trim() || null,
      contact_name: form.contact_name.trim() || profileName || 'Contact',
      contact_role: form.contact_role.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_website: form.contact_website.trim() || null,
      contact_facebook: form.contact_facebook.trim() || null,
      contact_instagram: form.contact_instagram.trim() || null,
      contact_mode: form.contact_mode,
      show_phone: form.show_phone,
      declared: form.declared,
      rna_number: form.rna_number.trim() || null,
      pmr_accessible: form.pmr_accessible,
      families_welcome: form.families_welcome,
      animals_ok: form.animals_ok,
      indoor: form.indoor,
      parking_nearby: form.parking_nearby,
      material_provided: form.material_provided,
      registration_required: form.registration_required,
      places_limited: form.places_limited,
      urgent_need: form.urgent_need,
      sector_id: form.sector_id || null,
      is_accepting_members: form.is_accepting_members,
      is_accepting_volunteers: form.is_accepting_volunteers,
      is_accepting_donations: form.is_accepting_donations,
      is_accepting_partners: form.is_accepting_partners,
    };

    let assoId: string | null = null;
    if (editingAsso) {
      const { error } = await supabase.from('associations').update(payload).eq('id', editingAsso.id);
      if (error) { toast.error('Erreur modification'); console.error(error); setSubmitting(false); return; }
      assoId = editingAsso.id;
      toast.success('Association modifiée ✓');
    } else {
      const { data: ins, error } = await supabase.from('associations').insert(payload).select('id').single();
      if (error) { toast.error('Erreur publication'); console.error(error); setSubmitting(false); return; }
      assoId = ins?.id ?? null;
      toast.success(asDraft ? '💾 Brouillon enregistré' : '🏛️ Association publiée !', { duration: 4000 });
    }

    if (photos.length > 0 && assoId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `associations/${assoId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { console.error('[storage] asso photo upload error:', upErr.message); toast.error(`Photo ${i + 1} non sauvegardée`); continue; }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          const { error: dbErr } = await supabase.from('asso_photos').insert({ asso_id: assoId, url: u.publicUrl, display_order: i });
          if (dbErr) console.error('[asso_photos] insert error:', dbErr.message);
        }
      }
    }

    resetForm();
    fetchAssos();
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette fiche association ?')) return;
    await supabase.from('associations').delete().eq('id', id);
    toast.success('Fiche supprimée');
    fetchAssos();
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const displayedAssos = showSavedOnly ? assos.filter(a => savedAssos.has(a.id)) : assos;
  const urgentCount = assos.filter(a => a.urgent_need).length;
  const needsCount = assos.filter(a => a.needs.length > 0).length;
  const volunteerCount = assos.filter(a => a.needs.includes('Bénévoles') || a.is_accepting_volunteers).length;
  const eventsAssosCount = assos.filter(a => a.pub_type === 'evenement').length;
  const donationsCount = assos.filter(a => a.is_accepting_donations || a.pub_type === 'dons').length;
  const sectorCounts = SECTORS.map(s => ({
    ...s,
    count: assos.filter(a => a.sector_id === s.id || a.sector_id === s.slug).length,
  }));
  const activeFiltersCount = [
    filterCat !== 'all', filterType !== 'all', !!filterSector,
    !!filterNeed, !!filterPublic, !!search.trim(), showSavedOnly,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCat('all'); setFilterType('all'); setFilterSector(null);
    setFilterNeed(''); setFilterPublic(''); setSearch(''); setShowSavedOnly(false);
  };

  return {
    // Data
    assos, displayedAssos, loading, dbReady,
    // Filters
    filterCat, setFilterCat,
    filterType, setFilterType,
    filterSector, setFilterSector,
    filterNeed, setFilterNeed,
    filterPublic, setFilterPublic,
    search, setSearch,
    showAdvFilters, setShowAdvFilters,
    activeFiltersCount, resetFilters,
    // Form
    showForm, setShowForm,
    editingAsso,
    form, setForm,
    photos, previews,
    photoRef,
    submitting, step, setStep,
    handlePhotoSelect, removePhoto,
    toggle, resetForm, startEdit, handleSubmit,
    handleDelete,
    // Saved
    savedAssos, showSavedOnly, setShowSavedOnly, toggleSaved,
    // KPIs
    urgentCount, needsCount, volunteerCount, eventsAssosCount, donationsCount,
    sectorCounts,
    totalActive: assos.length,
  };
}
