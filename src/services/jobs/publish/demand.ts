/**
 * jobs/publish/demand.ts
 *
 * Service de publication d'une demande d'emploi.
 * Valide l'entrée, calcule les scores, puis insère dans Supabase.
 */

import { createClient } from '@/lib/supabase/client';
import { generateSlug, expiryDate } from './shared';
import { calculateJobDemandCompleteness } from '../scoring/completeness';

// ─── Input / output types ─────────────────────────────────────────────────────

export interface PublishDemandInput {
  title: string;
  job_category: string;
  /** Types de contrat recherchés, ex. ['cdi', 'cdd'] */
  contract_types: string[];
  /** Courte présentation */
  description: string;
  /** Expérience détaillée (optionnel) */
  experience_summary?: string;
  location_city: string;
  sector_id?: string;
  /** Rayon de mobilité en km */
  mobility_radius?: number;
  /** immediate | week | month | date | flexible */
  availability_type: string;
  available_from?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
  has_driving_license?: boolean;
  has_vehicle?: boolean;
  contact_email?: string;
  contact_phone?: string;
  contact_mode?: string;
  cv_url?: string;
}

export interface PublishDemandResult {
  success: boolean;
  slug?: string;
  id?: string;
  error?: string;
}

// ─── Completeness adapter ─────────────────────────────────────────────────────

/**
 * Adapter: maps PublishDemandInput fields onto the shape expected by
 * calculateJobDemandCompleteness, avoiding duplication of scoring logic.
 */
function computeCompleteness(input: PublishDemandInput): number {
  return calculateJobDemandCompleteness({
    desired_contract_types: input.contract_types as never,
    desired_employment_types: [],
    location_label: input.location_city,
    availability_type: input.availability_type as never,
    available_from: input.available_from,
    salary_expectation_min: input.salary_min,
    salary_expectation_max: input.salary_max,
    full_description: input.experience_summary ?? input.description,
    cv_url: input.cv_url,
    experience_level: input.experience_level as never,
    short_description: input.description,
    is_flexible_schedule: false,
    has_driving_license: input.has_driving_license ?? false,
    has_vehicle: input.has_vehicle ?? false,
    is_urgent: false,
  });
}

// ─── Publish function ─────────────────────────────────────────────────────────

export async function publishJobDemand(
  input: PublishDemandInput
): Promise<PublishDemandResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Vous devez être connecté pour déposer une demande.' };
  }

  // Minimal validation
  if (!input.title || input.title.length < 5) {
    return { success: false, error: 'Le titre est trop court (min. 5 caractères).' };
  }
  if (!input.description || input.description.length < 20) {
    return { success: false, error: 'La description est trop courte (min. 20 caractères).' };
  }
  if (!input.contract_types?.length) {
    return { success: false, error: 'Sélectionnez au moins un type de contrat.' };
  }
  if (!input.location_city) {
    return { success: false, error: 'La ville est obligatoire.' };
  }
  if (!input.contact_email && !input.contact_phone) {
    return { success: false, error: 'Un email ou un téléphone de contact est obligatoire.' };
  }

  const slug = generateSlug(input.title, crypto.randomUUID());
  const completeness_score = computeCompleteness(input);

  const row = {
    user_id: user.id,
    slug,
    title: input.title.trim(),
    job_category: input.job_category,
    contract_types: input.contract_types,
    desired_contract_types: input.contract_types, // domain alias
    employment_type: 'flexible',
    short_description: input.description.slice(0, 300),
    profile_description: input.experience_summary ?? input.description,
    location_label: input.location_city,
    location_city: input.location_city,
    sector_id: input.sector_id ?? null,
    mobility_radius: input.mobility_radius ?? null,
    availability_type: input.availability_type,
    available_from: input.available_from ?? null,
    experience_level: input.experience_level ?? null,
    salary_expectation_min: input.salary_min ?? null,
    salary_expectation_max: input.salary_max ?? null,
    has_driving_license: input.has_driving_license ?? false,
    has_vehicle: input.has_vehicle ?? false,
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    contact_mode: input.contact_mode ?? 'email',
    cv_url: input.cv_url ?? null,
    status: 'published',
    moderation_status: 'approved',
    completeness_score,
    freshness_score: 100,
    views_count: 0,
    contacts_count: 0,
    published_at: new Date().toISOString(),
    expires_at: expiryDate(90).toISOString(), // 90 jours pour les demandes
  };

  const { data, error } = await supabase
    .from('job_demands')
    .insert(row)
    .select('id, slug')
    .single();

  if (error) {
    console.error('[publish/demand] Supabase error:', error);
    return { success: false, error: `Erreur lors de la publication : ${error.message}` };
  }

  return { success: true, id: data.id, slug: data.slug };
}
