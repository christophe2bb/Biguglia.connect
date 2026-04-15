// ─── Validation par étape – /emploi/publier ───────────────────────────────────
//
// Chaque règle est une fonction pure : (form) => boolean
// canNextForStep(step, form) est le point d'entrée utilisé dans le hook.

import type { FormData, Step } from './_types';

// Step 1: titre ≥ 5, catégorie, contrat, description ≥ 20
function validateStep1(form: FormData): boolean {
  return (
    form.title.length >= 5 &&
    !!form.job_category &&
    !!form.contract_type &&
    form.description.length >= 20
  );
}

// Step 2: employeur ≥ 2, ville ≥ 2
function validateStep2(form: FormData): boolean {
  return form.employer_name.length >= 2 && form.location_city.length >= 2;
}

// Step 3: tout optionnel — toujours valide
function validateStep3(_form: FormData): boolean {
  return true;
}

// Step 4: selon le mode de candidature
// - email ou mixed → email must include '@'
// - phone ou mixed → phone must have ≥ 8 chars
function validateStep4(form: FormData): boolean {
  const needEmail = form.application_mode === 'email' || form.application_mode === 'mixed';
  const needPhone = form.application_mode === 'phone' || form.application_mode === 'mixed';
  if (needEmail && !form.contact_email.includes('@')) return false;
  if (needPhone && form.contact_phone.length < 8) return false;
  return true;
}

const VALIDATORS: Record<Step, (form: FormData) => boolean> = {
  1: validateStep1,
  2: validateStep2,
  3: validateStep3,
  4: validateStep4,
};

export function canNextForStep(step: Step, form: FormData): boolean {
  return VALIDATORS[step]?.(form) ?? false;
}
