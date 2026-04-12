'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { EMPTY_FORM } from '../_constants';
import { submitAssoItem } from './submitAssoItem';
import type { Association, AssociationFormData } from '../_types';

export type AssoFormReturn = {
  showForm:    boolean;
  setShowForm: (v: boolean) => void;
  editingAsso: Association | null;
  form:        AssociationFormData;
  setForm:     React.Dispatch<React.SetStateAction<AssociationFormData>>;
  photos:      File[];
  previews:    string[];
  photoRef:    React.RefObject<HTMLInputElement>;
  submitting:  boolean;
  step:        number;
  setStep:     (v: number) => void;
  handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto:       (i: number) => void;
  toggle:            (key: 'public_target' | 'activities' | 'tags' | 'needs', val: string) => void;
  resetForm:         () => void;
  startEdit:         (a: Association) => void;
  handleSubmit:      (profileId: string, profileName: string, asDraft?: boolean) => Promise<void>;
};

export function useAssoForm(fetchAssos: () => Promise<void>): AssoFormReturn {
  const [showForm, setShowForm]       = useState(false);
  const [editingAsso, setEditingAsso] = useState<Association | null>(null);
  const [form, setForm]               = useState<AssociationFormData>(EMPTY_FORM);
  const [photos, setPhotos]           = useState<File[]>([]);
  const [previews, setPreviews]       = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [step, setStep]               = useState(1);
  const photoRef                      = useRef<HTMLInputElement>(null);

  // ── Photos ───────────────────────────────────────────────────────────────
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

  // ── Toggle tableau ───────────────────────────────────────────────────────
  const toggle = (key: 'public_target' | 'activities' | 'tags' | 'needs', val: string) => {
    setForm(f => ({
      ...f,
      [key]: (f[key] as string[]).includes(val)
        ? (f[key] as string[]).filter(x => x !== val)
        : [...(f[key] as string[]), val],
    }));
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotos([]); setPreviews([]);
    setEditingAsso(null); setShowForm(false); setStep(1);
  };

  // ── Pré-remplir pour édition ──────────────────────────────────────────────
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
      is_accepting_members:   a.is_accepting_members   ?? false,
      is_accepting_volunteers: a.is_accepting_volunteers ?? false,
      is_accepting_donations:  a.is_accepting_donations  ?? false,
      is_accepting_partners:   a.is_accepting_partners   ?? false,
    });
    setPhotos([]); setPreviews([]);
    setShowForm(true); setStep(1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // ── Soumission — délègue à submitAssoItem ─────────────────────────────────
  const handleSubmit = async (profileId: string, profileName: string, asDraft = false) => {
    if (!form.name.trim() || !form.description_short.trim()) {
      toast.error('Nom et description courte obligatoires');
      return;
    }
    setSubmitting(true);
    await submitAssoItem(
      form, profileId, profileName, asDraft,
      editingAsso, photos, fetchAssos, resetForm, setSubmitting,
    );
  };

  return {
    showForm, setShowForm, editingAsso,
    form, setForm, photos, previews, photoRef,
    submitting, step, setStep,
    handlePhotoSelect, removePhoto, toggle,
    resetForm, startEdit, handleSubmit,
  };
}
