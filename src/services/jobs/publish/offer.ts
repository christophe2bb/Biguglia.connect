/**
 * jobs/publish/offer.ts
 *
 * Service de publication d'une offre d'emploi.
 * Valide l'entrée, calcule les scores, puis insère dans Supabase.
 */

import { createClient } from '@/lib/supabase/client';
import { generateSlug, expiryDate } from './shared';
import { calculateJobOfferCompleteness } from '../scoring/completeness';
import type { ContractType, ExperienceLevel } from '@/types/jobs/constants';

// ─── Input / output types ─────────────────────────────────────────────────────

export interface PublishOfferInput {
  /* Étape 1 – L'offre */
  title: string;
  job_category: string;
  /** Type de contrat — union littérale ContractType */
  contract_type: ContractType;
  description: string;
  /* Étape 2 – Employeur */
  employer_name: string;
  location_city: string;
  location_address?: string;
  sector_id?: string;
  is_urgent?: boolean;
  /* Étape 3 – Conditions */
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
  salary_type?: 'net' | 'brut' | '';
  salary_is_negotiable?: boolean;
  weekly_hours?: number;
  schedule_details?: string;
  is_flexible_schedule?: boolean;
  start_date?: string;
  end_date?: string;
  /** Niveau d'expérience — union littérale ExperienceLevel */
  experience_level?: ExperienceLevel;
  provides_housing?: boolean;
  housing_details?: string;
  provides_meals?: boolean;
  requires_vehicle?: boolean;
  has_driving_license?: boolean;
  other_benefits?: string[];
  /* Compétences */
  required_skills?: string;
  nice_to_have_skills?: string;
  /* Étape 4 – Contact */
  contact_email?: string;
  contact_phone?: string;
  application_mode?: string;
  contact_instructions?: string;
}

export interface PublishOfferResult {
  success: boolean;
  slug?: string;
  id?: string;
  error?: string;
}

// ─── Completeness adapter ─────────────────────────────────────────────────────

/**
 * Adapter: maps PublishOfferInput fields onto the shape expected by
 * calculateJobOfferCompleteness, avoiding duplication of scoring logic.
 */
function computeCompleteness(input: PublishOfferInput): number {
  return calculateJobOfferCompleteness({
    contract_type: input.contract_type,
    location_label: input.location_address
      ? `${input.location_address}, ${input.location_city}`
      : input.location_city,
    start_date: input.start_date,
    end_date: input.end_date,
    salary_range_min: input.salary_min,
    salary_range_max: input.salary_max,
    weekly_hours: input.weekly_hours,
    schedule_details: input.schedule_details,
    full_description: input.description,
    contact_email: input.contact_email,
    contact_phone: input.contact_phone,
    experience_level: input.experience_level,
    required_skills: input.required_skills
      ? input.required_skills.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
  });
}

// ─── Publish function ─────────────────────────────────────────────────────────

export async function publishJobOffer(
  input: PublishOfferInput
): Promise<PublishOfferResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Vous devez être connecté pour publier une offre.' };
  }

  // Minimal validation
  if (!input.title || input.title.length < 5) {
    return { success: false, error: 'Le titre est trop court (min. 5 caractères).' };
  }
  if (!input.description || input.description.length < 20) {
    return { success: false, error: 'La description est trop courte (min. 20 caractères).' };
  }
  if (!input.employer_name) {
    return { success: false, error: "Le nom de l'employeur est obligatoire." };
  }
  if (!input.location_city) {
    return { success: false, error: 'La ville est obligatoire.' };
  }
  if (!input.contact_email && !input.contact_phone) {
    return { success: false, error: 'Un email ou un téléphone de contact est obligatoire.' };
  }

  const slug = generateSlug(input.title, crypto.randomUUID());
  const completeness_score = computeCompleteness(input);

  // Merge supplementary info into full_description to avoid data loss
  // when optional columns don't yet exist in the target environment.
  const extraLines: string[] = [];
  if (input.schedule_details)                         extraLines.push(`Horaires : ${input.schedule_details}`);
  if (input.provides_housing && input.housing_details) extraLines.push(`Logement : ${input.housing_details}`);
  if (input.contact_instructions)                     extraLines.push(`Informations : ${input.contact_instructions}`);
  if (input.other_benefits && input.other_benefits.length > 0) {
    extraLines.push(`Avantages : ${input.other_benefits.join(', ')}`);
  }
  const fullDescription =
    extraLines.length > 0
      ? `${input.description}\n\n---\n${extraLines.join('\n')}`
      : input.description;

  const location_label = input.location_address
    ? `${input.location_address}, ${input.location_city}`
    : input.location_city;

  const row = {
    user_id: user.id,
    slug,
    title: input.title.trim(),
    job_category: input.job_category,
    contract_type: input.contract_type,
    employment_type: 'temps_plein',
    short_description: fullDescription.slice(0, 300),
    full_description: fullDescription,
    employer_name: input.employer_name.trim(),
    location_label,
    location_city: input.location_city,
    location_address: input.location_address ?? null,
    sector_id: input.sector_id ?? null,
    salary_range_min: input.salary_min ?? null,
    salary_range_max: input.salary_max ?? null,
    salary_period: input.salary_period ?? null,
    salary_is_negotiable: input.salary_is_negotiable ?? false,
    weekly_hours: input.weekly_hours ?? null,
    schedule_details: input.schedule_details ?? null,
    is_flexible_schedule: input.is_flexible_schedule ?? false,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    experience_level: input.experience_level ?? null,
    has_driving_license: input.has_driving_license ?? false,
    requires_vehicle: input.requires_vehicle ?? false,
    provides_housing: input.provides_housing ?? false,
    housing_details: input.housing_details ?? null,
    provides_meals: input.provides_meals ?? false,
    other_benefits:
      input.other_benefits && input.other_benefits.length > 0
        ? input.other_benefits.join(', ')
        : null,
    is_urgent: input.is_urgent ?? false,
    is_remote_possible: false,
    required_skills: input.required_skills
      ? input.required_skills.split(',').map((s) => s.trim()).filter(Boolean)
      : null,
    nice_to_have_skills: input.nice_to_have_skills
      ? input.nice_to_have_skills.split(',').map((s) => s.trim()).filter(Boolean)
      : null,
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    application_mode: input.application_mode ?? 'email',
    contact_instructions: input.contact_instructions ?? null,
    status: 'published',
    moderation_status: 'approved',
    availability_type: 'immediate',
    completeness_score,
    freshness_score: 100,
    views_count: 0,
    contacts_count: 0,
    published_at: new Date().toISOString(),
    expires_at: expiryDate(60).toISOString(),
    visibility_level: 'public',
  };

  const { data, error } = await supabase
    .from('job_offers')
    .insert(row)
    .select('id, slug')
    .single();

  if (error) {
    console.error('[publish/offer] Supabase error:', error);
    return { success: false, error: `Erreur lors de la publication : ${error.message}` };
  }

  return { success: true, id: data.id, slug: data.slug };
}
