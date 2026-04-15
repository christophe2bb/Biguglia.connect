'use client';

// ─── Hook central – /emploi/publier ───────────────────────────────────────────

import { useState } from 'react';
import { publishJobOffer } from '@/services/jobs/publish-offer';
import { INITIAL_FORM } from './_config';
import { canNextForStep } from './_validation';
import { buildPayload } from './_payload';
import type { FormData, Step, UsePublierFormReturn } from './_types';

export function usePublierForm(): UsePublierFormReturn {
  const [step,          setStep]          = useState<Step>(1);
  const [form,          setForm]          = useState<FormData>(INITIAL_FORM);
  const [submitting,    setSubmitting]    = useState(false);
  const [serverError,   setServerError]   = useState<string | null>(null);
  const [done,          setDone]          = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  // ── Field setter ────────────────────────────────────────────────────────────
  const set = (field: keyof FormData, value: string | boolean | string[]) =>
    setForm(f => ({ ...f, [field]: value }));

  // ── Benefit toggle ──────────────────────────────────────────────────────────
  const toggleBenefit = (id: string) => {
    const cur  = form.other_benefits;
    const next = cur.includes(id) ? cur.filter(b => b !== id) : [...cur, id];
    set('other_benefits', next);
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const next = () => {
    setServerError(null);
    setStep(s => Math.min(s + 1, 4) as Step);
  };

  const prev = () => {
    setServerError(null);
    setStep(s => Math.max(s - 1, 1) as Step);
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const canNext = () => canNextForStep(step, form);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setServerError(null);

    const result = await publishJobOffer(buildPayload(form));

    setSubmitting(false);
    if (!result.success) {
      setServerError(result.error ?? 'Une erreur est survenue.');
      return;
    }
    setPublishedSlug(result.slug ?? null);
    setDone(true);
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(INITIAL_FORM);
    setStep(1);
    setDone(false);
    setPublishedSlug(null);
    setServerError(null);
  };

  return {
    step, form, submitting, serverError, done, publishedSlug,
    set, toggleBenefit, next, prev, canNext, handleSubmit, resetForm,
  };
}
