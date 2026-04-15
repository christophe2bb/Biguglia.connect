'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { EMPTY_FORM } from '../_constants';
import { submitCDMItem } from './submitCDMItem';
import type { HelpRequest, HelpFormValues } from '../_types';

export type CDMFormReturn = {
  showForm:    boolean;
  setShowForm: (v: boolean) => void;
  editingItem: HelpRequest | null;
  step:        number;
  setStep:     (v: number) => void;
  submitting:  boolean;
  form:        HelpFormValues;
  setForm:     React.Dispatch<React.SetStateAction<HelpFormValues>>;
  photos:      File[];
  previews:    string[];
  resetForm:        () => void;
  handleEdit:       (item: HelpRequest) => void;
  handlePhotoSelect:(files: File[], reset?: () => void) => void;
  removePhoto:      (i: number) => void;
  toggleArr:        (key: 'equipment' | 'conditions', val: string) => void;
  handleSubmit:     (isDraft: boolean, profileId: string) => Promise<void>;
};

export function useCDMForm(fetchItems: () => Promise<void>): CDMFormReturn {
  const [showForm, setShowForm]       = useState(false);
  const [editingItem, setEditingItem] = useState<HelpRequest | null>(null);
  const [step, setStep]               = useState(1);
  const [submitting, setSubmitting]   = useState(false);
  const [form, setForm]               = useState<HelpFormValues>(EMPTY_FORM);
  const [photos, setPhotos]           = useState<File[]>([]);
  const [previews, setPreviews]       = useState<string[]>([]);

  // ── Réinitialisation ─────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotos([]);
    setPreviews([]);
    setStep(1);
    setEditingItem(null);
    setShowForm(false);
  };

  // ── Pré-remplir pour édition ──────────────────────────────────────────────
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

  // ── Photos ───────────────────────────────────────────────────────────────
  const handlePhotoSelect = (files: File[], reset?: () => void) => {
    if (photos.length + files.length > 5) { toast.error('5 photos maximum'); return; }
    setPhotos(p => [...p, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(p => [...p, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    reset?.();
  };

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const toggleArr = (key: 'equipment' | 'conditions', val: string) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(v => v !== val) : [...f[key], val],
    }));
  };

  // ── Soumission — délègue à submitCDMItem ─────────────────────────────────
  const handleSubmit = async (isDraft: boolean, profileId: string) => {
    if (!form.title.trim())       { toast.error('Titre obligatoire');       return; }
    if (!form.description.trim()) { toast.error('Description obligatoire'); return; }
    if (!isDraft && (!form.check1 || !form.check2 || !form.check3 || !form.check4 || !form.check5)) {
      toast.error('Cochez toutes les cases de validation');
      return;
    }
    setSubmitting(true);
    await submitCDMItem(form, isDraft, profileId, editingItem, photos, fetchItems, resetForm, setSubmitting);
  };

  return {
    showForm, setShowForm,
    editingItem,
    step, setStep,
    submitting,
    form, setForm,
    photos, previews,
    resetForm, handleEdit,
    handlePhotoSelect, removePhoto, toggleArr,
    handleSubmit,
  };
}
