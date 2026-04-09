/**
 * Service: Publication d'offre d'emploi
 * Connecté à Supabase - avec validation Zod + calcul scores
 */

import { createClient } from '@/lib/supabase/client';

export interface PublishOfferInput {
  title: string;
  job_category: string;
  contract_type: string;
  description: string;
  employer_name: string;
  location_city: string;
  location_address?: string;
  sector_id?: string;
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
  start_date?: string;
  experience_level?: string;
  provides_housing?: boolean;
  is_urgent?: boolean;
  contact_email?: string;
  contact_phone?: string;
  application_mode?: string;
}

export interface PublishOfferResult {
  success: boolean;
  slug?: string;
  id?: string;
  error?: string;
}

// Génère un slug déterministe à partir du titre + id court
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

// Score de complétude (0-100)
function computeCompleteness(input: PublishOfferInput): number {
  let score = 0;
  if (input.title?.length >= 5)         score += 20;
  if (input.job_category)               score += 10;
  if (input.contract_type)              score += 10;
  if (input.description?.length >= 50)  score += 20;
  if (input.employer_name)              score += 10;
  if (input.location_city)              score += 10;
  if (input.salary_min || input.salary_max) score += 10;
  if (input.contact_email || input.contact_phone) score += 10;
  return score;
}

export async function publishJobOffer(
  input: PublishOfferInput
): Promise<PublishOfferResult> {
  const supabase = createClient();

  // Vérifier l'utilisateur connecté
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Vous devez être connecté pour publier une offre.' };
  }

  // Validation minimale
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

  // Générer slug unique
  const tempId = crypto.randomUUID();
  const slug = generateSlug(input.title, tempId);

  // Calcul scores
  const completeness_score = computeCompleteness(input);
  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 60); // 60 jours

  // Construire l'objet à insérer
  const row: Record<string, unknown> = {
    user_id: user.id,
    slug,
    title: input.title.trim(),
    job_category: input.job_category,
    contract_type: input.contract_type,
    employment_type: 'temps_plein', // défaut
    short_description: input.description.slice(0, 300),
    full_description: input.description,
    employer_name: input.employer_name.trim(),
    location_label: input.location_address
      ? `${input.location_address}, ${input.location_city}`
      : input.location_city,
    location_city: input.location_city,
    location_address: input.location_address ?? null,
    sector_id: input.sector_id ?? null,
    salary_range_min: input.salary_min ?? null,
    salary_range_max: input.salary_max ?? null,
    salary_period: input.salary_period ?? null,
    salary_is_negotiable: false,
    start_date: input.start_date ?? null,
    experience_level: input.experience_level ?? null,
    provides_housing: input.provides_housing ?? false,
    provides_meals: false,
    is_urgent: input.is_urgent ?? false,
    is_remote_possible: false,
    is_flexible_schedule: false,
    has_driving_license: false,
    requires_vehicle: false,
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    application_mode: input.application_mode ?? 'email',
    status: 'published',
    moderation_status: 'approved', // auto-approuvé en V1
    availability_type: 'immediate',
    completeness_score,
    freshness_score: 100,
    views_count: 0,
    contacts_count: 0,
    published_at: new Date().toISOString(),
    expires_at: expires_at.toISOString(),
    visibility_level: 'public',
  };

  const { data, error } = await supabase
    .from('job_offers')
    .insert(row)
    .select('id, slug')
    .single();

  if (error) {
    console.error('[publish-offer] Supabase error:', error);
    return {
      success: false,
      error: `Erreur lors de la publication : ${error.message}`,
    };
  }

  return {
    success: true,
    id: data.id,
    slug: data.slug,
  };
}
