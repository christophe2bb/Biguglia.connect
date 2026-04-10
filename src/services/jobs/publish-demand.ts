/**
 * Service: Publication d'une demande d'emploi
 * Connecté à Supabase - avec validation + calcul scores
 */

import { createClient } from '@/lib/supabase/client';

export interface PublishDemandInput {
  title: string;
  job_category: string;
  contract_types: string[];   // ex: ['cdi', 'cdd']
  description: string;        // courte présentation
  experience_summary?: string; // expérience détaillée
  location_city: string;
  sector_id?: string;
  mobility_radius?: number;   // km
  availability_type: string;  // immediate | week | month | date | flexible
  available_from?: string;    // ISO date
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

function generateSlug(title: string, uid: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base}-${uid.slice(0, 8)}`;
}

function computeCompleteness(input: PublishDemandInput): number {
  let score = 0;
  if (input.title?.length >= 5)               score += 20;
  if (input.job_category)                      score += 10;
  if (input.contract_types?.length)            score += 10;
  if (input.description?.length >= 50)         score += 20;
  if (input.location_city)                     score += 10;
  if (input.availability_type)                 score += 10;
  if (input.experience_level)                  score += 5;
  if (input.salary_min || input.salary_max)    score += 5;
  if (input.contact_email || input.contact_phone) score += 10;
  return score;
}

export async function publishJobDemand(
  input: PublishDemandInput
): Promise<PublishDemandResult> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Vous devez être connecté pour déposer une demande.' };
  }

  // Validation minimale
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

  const tempId = crypto.randomUUID();
  const slug = generateSlug(input.title, tempId);
  const completeness_score = computeCompleteness(input);
  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 90); // 90 jours pour les demandes

  const row: Record<string, unknown> = {
    user_id: user.id,
    slug,
    title: input.title.trim(),
    job_category: input.job_category,
    contract_types: input.contract_types,
    desired_contract_types: input.contract_types,   // alias métier
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
    expires_at: expires_at.toISOString(),
  };

  const { data, error } = await supabase
    .from('job_demands')
    .insert(row)
    .select('id, slug')
    .single();

  if (error) {
    console.error('[publish-demand] Supabase error:', error);
    return {
      success: false,
      error: `Erreur lors de la publication : ${error.message}`,
    };
  }

  return { success: true, id: data.id, slug: data.slug };
}
