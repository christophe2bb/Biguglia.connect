'use client';

/**
 * Hook: useDemandPublishForm
 * Centralise tout l'état, la validation et la soumission du wizard
 * "Déposer une demande d'emploi".
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { publishJobDemand } from '@/services/jobs/publish-demand';
import {
  CONTRACT_TYPES,
  AVAILABILITY_TYPES,
  EXPERIENCE_LEVELS,
  type ContractType,
  type AvailabilityType,
  type ExperienceLevel,
} from '@/types/jobs/constants';
import { INITIAL } from '../_config';
import type { FormData, Step } from '../_types';

/* ── Types du hook ────────────────────────────────────────────────────────── */
export interface UseDemandPublishFormReturn {
  /* state */
  step: Step;
  form: FormData;
  submitting: boolean;
  serverError: string | null;
  done: boolean;
  publishedSlug: string | null;
  /* helpers */
  set: (field: keyof FormData, value: string | boolean | string[] | File | null) => void;
  toggleContractType: (type: string) => void;
  setCvFile: (file: File | null) => void;
  next: () => void;
  prev: () => void;
  canNext: () => boolean;
  handleSubmit: () => Promise<void>;
  resetWizard: () => void;
}

/* ── Hook ─────────────────────────────────────────────────────────────────── */
export function useDemandPublishForm(): UseDemandPublishFormReturn {
  const [step, setStep]               = useState<Step>(1);
  const [form, setForm]               = useState<FormData>(INITIAL);
  const [submitting, setSubmitting]   = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone]               = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  /* ── Mise à jour d'un champ ─────────────────────────────────────────────── */
  const set = (
    field: keyof FormData,
    value: string | boolean | string[] | File | null,
  ) => setForm(f => ({ ...f, [field]: value }));

  /* ── Sélection / désélection d'un type de contrat ──────────────────────── */
  const toggleContractType = (type: string) => {
    const cur = form.contract_types;
    const next = cur.includes(type)
      ? cur.filter(c => c !== type)
      : [...cur, type];
    set('contract_types', next);
  };

  /* ── Upload du fichier CV ───────────────────────────────────────────────── */
  const setCvFile = (file: File | null) => set('cv_file', file);

  /* ── Navigation entre étapes ────────────────────────────────────────────── */
  const next = () => {
    setServerError(null);
    setStep(s => Math.min(s + 1, 4) as Step);
  };
  const prev = () => {
    setServerError(null);
    setStep(s => Math.max(s - 1, 1) as Step);
  };

  /* ── Validation par étape ───────────────────────────────────────────────── */
  const canNext = (): boolean => {
    switch (step) {
      case 1:
        return (
          form.title.length >= 5 &&
          !!form.job_category &&
          form.contract_types.length > 0 &&
          form.description.length >= 20
        );
      case 2:
        return true; // tout optionnel
      case 3:
        return form.location_city.length >= 2;
      case 4:
        return (
          (form.contact_mode !== 'phone' ? form.contact_email.includes('@') : true) &&
          (form.contact_mode !== 'email' ? form.contact_phone.length >= 8 : true) &&
          (form.contact_mode === 'email'  ? form.contact_email.includes('@') : true)
        );
      default:
        return false;
    }
  };

  /* ── Upload CV vers Supabase Storage ─────────────────────────────────────── */
  const uploadCv = async (demandId: string): Promise<string | null> => {
    if (!form.cv_file) return null;
    try {
      const supabase = createClient();
      const ext  = form.cv_file.name.split('.').pop() ?? 'pdf';
      const path = `cv/${demandId}.${ext}`;
      const { error } = await supabase.storage
        .from('job-documents')
        .upload(path, form.cv_file, { upsert: true, contentType: form.cv_file.type });
      if (error) {
        console.warn('[cv-upload] Storage error:', error.message);
        return null;
      }
      const { data } = supabase.storage.from('job-documents').getPublicUrl(path);
      return data?.publicUrl ?? null;
    } catch {
      return null;
    }
  };

  /* ── Soumission Supabase ─────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setServerError(null);

    // Narrowing des unions : CONTRACT_TYPES / AVAILABILITY_TYPES / EXPERIENCE_LEVELS
    // servent de validateurs runtime ; .filter() supprime toute valeur invalide.
    const contractTypes = (form.contract_types as string[])
      .filter((v): v is ContractType =>
        (CONTRACT_TYPES as readonly string[]).includes(v),
      );

    const availabilityType: AvailabilityType =
      (AVAILABILITY_TYPES as readonly string[]).includes(form.availability_type)
        ? (form.availability_type as AvailabilityType)
        : 'flexible';

    const experienceLevel =
      form.experience_level &&
      (EXPERIENCE_LEVELS as readonly string[]).includes(form.experience_level)
        ? (form.experience_level as ExperienceLevel)
        : undefined;

    const result = await publishJobDemand({
      title:               form.title,
      job_category:        form.job_category,
      contract_types:      contractTypes,
      description:         form.description,
      experience_summary:  form.experience_summary || undefined,
      location_city:       form.location_city,
      sector_id:           form.sector_id || undefined,
      mobility_radius:     form.mobility_radius ? parseInt(form.mobility_radius) : undefined,
      availability_type:   availabilityType,
      available_from:      form.available_from || undefined,
      experience_level:    experienceLevel,
      salary_min:          form.salary_min ? parseFloat(form.salary_min) : undefined,
      salary_max:          form.salary_max ? parseFloat(form.salary_max) : undefined,
      has_driving_license: form.has_driving_license,
      has_vehicle:         form.has_vehicle,
      contact_email:       form.contact_email || undefined,
      contact_phone:       form.contact_phone || undefined,
      contact_mode:        form.contact_mode,
    });

    setSubmitting(false);

    if (!result.success) {
      setServerError(result.error ?? 'Une erreur est survenue.');
      return;
    }

    // Upload CV non-bloquant
    if (form.cv_file && result.id) {
      await uploadCv(result.id);
    }

    setPublishedSlug(result.slug ?? null);
    setDone(true);
  };

  /* ── Réinitialisation ────────────────────────────────────────────────────── */
  const resetWizard = () => {
    setForm(INITIAL);
    setStep(1);
    setDone(false);
    setPublishedSlug(null);
    setServerError(null);
  };

  return {
    step, form, submitting, serverError, done, publishedSlug,
    set, toggleContractType, setCvFile,
    next, prev, canNext,
    handleSubmit, resetWizard,
  };
}
