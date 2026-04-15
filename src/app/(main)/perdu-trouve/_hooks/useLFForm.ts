'use client';

import { useState, useRef } from 'react';
import type { LFItem, LFFormValues } from '../_types';
import { EMPTY_FORM } from '../_constants';
import { submitLFItem } from './submitLFItem';

export type LFFormReturn = {
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editingItem: LFItem | null;
  form: LFFormValues;
  setForm: React.Dispatch<React.SetStateAction<LFFormValues>>;
  photos: File[];
  previews: string[];
  submitting: boolean;
  step: number;
  setStep: (v: number) => void;
  photoRef: React.RefObject<HTMLInputElement>;
  handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: (i: number) => void;
  resetForm: () => void;
  startEdit: (item: LFItem) => void;
  handleSubmit: (asDraft: boolean, profile: { id: string; full_name?: string | null }) => Promise<void>;
};

export function useLFForm(fetchItems: () => Promise<void>): LFFormReturn {
  const [showForm, setShowForm]       = useState(false);
  const [editingItem, setEditingItem] = useState<LFItem | null>(null);
  const [form, setForm]               = useState<LFFormValues>(EMPTY_FORM);
  const [photos, setPhotos]           = useState<File[]>([]);
  const [previews, setPreviews]       = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [step, setStep]               = useState(1);
  const photoRef                      = useRef<HTMLInputElement>(null);

  // ── Photo helpers ─────────────────────────────────────────────────────────
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

  // ── Form helpers ──────────────────────────────────────────────────────────
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

  // ── Submit — délègue à submitLFItem ──────────────────────────────────────
  const handleSubmit = async (
    asDraft: boolean,
    profile: { id: string; full_name?: string | null },
  ) => {
    await submitLFItem(form, asDraft, editingItem, photos, profile, fetchItems, resetForm, setSubmitting);
  };

  return {
    showForm, setShowForm,
    editingItem,
    form, setForm,
    photos, previews,
    submitting,
    step, setStep,
    photoRef,
    handlePhotoSelect, removePhoto,
    resetForm, startEdit,
    handleSubmit,
  };
}
