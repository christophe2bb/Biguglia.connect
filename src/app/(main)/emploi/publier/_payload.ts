// ─── Payload builder – /emploi/publier ────────────────────────────────────────
//
// Converts the multi-step FormData into a PublishOfferInput ready for the
// Supabase service. All string→number coercions and optional-field guards live
// here so the hook and components stay clean.

import type { PublishOfferInput } from '@/services/jobs/publish-offer';
import { BENEFIT_OPTIONS } from './_config';
import type { FormData } from './_types';
import type { ContractType, ExperienceLevel } from '@/types/jobs/constants';

/**
 * Resolve human-readable labels for the selected benefit IDs, then build the
 * enriched description that appends benefits, schedule info, housing and
 * contact instructions to the base description.
 */
function enrichDescription(form: FormData): string {
  const benefitLabels = form.other_benefits
    .map(id => BENEFIT_OPTIONS.find(b => b.id === id)?.label ?? id)
    .join(', ');

  return [
    form.description,
    benefitLabels ? `\n\nAvantages : ${benefitLabels}` : '',
    form.schedule_details ? `\nHoraires : ${form.schedule_details}` : '',
    form.housing_details && form.provides_housing
      ? `\nLogement : ${form.housing_details}`
      : '',
    form.contact_instructions
      ? `\nInformations complémentaires : ${form.contact_instructions}`
      : '',
  ]
    .join('')
    .trim();
}

export function buildPayload(form: FormData): PublishOfferInput {
  // contract_type et experience_level sont des string dans l'état brut du formulaire.
  // À ce stade, la validation de l'étape 1 garantit que contract_type est un
  // ContractType valide (sélectionné depuis CONTRACT_TYPES). Le cast narrow
  // ici est le seul endroit de l'app où string → ContractType / ExperienceLevel
  // se fait — centralisé et documenté plutôt que dispersé dans les composants.
  return {
    /* Étape 1 */
    title:               form.title,
    job_category:        form.job_category,
    contract_type:       form.contract_type as ContractType,
    description:         enrichDescription(form),
    required_skills:     form.required_skills     || undefined,
    nice_to_have_skills: form.nice_to_have_skills  || undefined,
    /* Étape 2 */
    employer_name:       form.employer_name,
    location_city:       form.location_city,
    location_address:    form.location_address    || undefined,
    sector_id:           form.sector_id           || undefined,
    is_urgent:           form.is_urgent,
    /* Étape 3 – Conditions */
    salary_min:          form.salary_min  ? parseFloat(form.salary_min)  : undefined,
    salary_max:          form.salary_max  ? parseFloat(form.salary_max)  : undefined,
    salary_period:       form.salary_period        || undefined,
    salary_type:         form.salary_type          || undefined,
    salary_is_negotiable: form.salary_is_negotiable,
    weekly_hours:        form.weekly_hours ? parseFloat(form.weekly_hours) : undefined,
    schedule_details:    form.schedule_details     || undefined,
    is_flexible_schedule: form.is_flexible_schedule,
    start_date:          form.start_date           || undefined,
    end_date:            form.end_date             || undefined,
    experience_level:    form.experience_level
      ? form.experience_level as ExperienceLevel
      : undefined,
    provides_housing:    form.provides_housing,
    housing_details:     form.housing_details      || undefined,
    provides_meals:      form.provides_meals,
    requires_vehicle:    form.requires_vehicle,
    has_driving_license: form.has_driving_license,
    other_benefits:      form.other_benefits.length > 0 ? form.other_benefits : undefined,
    /* Étape 4 */
    contact_email:       form.contact_email        || undefined,
    contact_phone:       form.contact_phone        || undefined,
    application_mode:    form.application_mode,
    contact_instructions: form.contact_instructions || undefined,
  };
}
