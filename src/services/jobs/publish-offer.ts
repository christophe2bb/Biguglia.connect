/**
 * Service: Publication d'offre d'emploi
 * Connecté à Supabase - avec validation + calcul scores
 * VERSION ENRICHIE — tous les champs du wizard v2 transmis
 */

import { createClient } from '@/lib/supabase/client';

export interface PublishOfferInput {
  /* Étape 1 – L'offre */
  title: string;
  job_category: string;
  contract_type: string;
  description: string;
  /* Étape 2 – Employeur */
  employer_name: string;
  location_city: string;
  location_address?: string;
  sector_id?: string;
  is_urgent?: boolean;
  /* Étape 3 – Conditions enrichies */
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
  salary_type?: 'net' | 'brut' | '';          // net ou brut
  salary_is_negotiable?: boolean;
  weekly_hours?: number;
  schedule_details?: string;
  is_flexible_schedule?: boolean;
  start_date?: string;
  end_date?: string;
  experience_level?: string;
  provides_housing?: boolean;
  housing_details?: string;
  provides_meals?: boolean;
  requires_vehicle?: boolean;
  has_driving_license?: boolean;
  other_benefits?: string[];                   // IDs des avantages cochés
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
  if (input.title?.length >= 5)                        score += 15;
  if (input.job_category)                              score += 5;
  if (input.contract_type)                             score += 5;
  if (input.description?.length >= 50)                 score += 15;
  if (input.employer_name)                             score += 10;
  if (input.location_city)                             score += 5;
  if (input.sector_id)                                 score += 5;
  if (input.salary_min || input.salary_max)            score += 15;
  if (input.salary_type)                               score += 5;  // net/brut précisé
  if (input.weekly_hours)                              score += 5;
  if (input.experience_level)                          score += 5;
  if (input.contact_email || input.contact_phone)      score += 10;
  return Math.min(score, 100);
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

  // Construire la description enrichie : on fusionne les infos complémentaires
  // dans le champ full_description pour ne pas perdre les données si certaines
  // colonnes n'existent pas encore en base
  const extraLines: string[] = [];
  if (input.schedule_details)   extraLines.push(`Horaires : ${input.schedule_details}`);
  if (input.housing_details && input.provides_housing) extraLines.push(`Logement : ${input.housing_details}`);
  if (input.contact_instructions) extraLines.push(`Informations : ${input.contact_instructions}`);
  if (input.other_benefits && input.other_benefits.length > 0) {
    extraLines.push(`Avantages : ${input.other_benefits.join(', ')}`);
  }

  const fullDescription = extraLines.length > 0
    ? `${input.description}\n\n---\n${extraLines.join('\n')}`
    : input.description;

  // Construire l'objet à insérer (tous les champs enrichis)
  const row: Record<string, unknown> = {
    /* identité */
    user_id: user.id,
    slug,
    /* offre */
    title: input.title.trim(),
    job_category: input.job_category,
    contract_type: input.contract_type,
    employment_type: 'temps_plein',
    short_description: fullDescription.slice(0, 300),
    full_description: fullDescription,
    /* employeur & localisation */
    employer_name: input.employer_name.trim(),
    location_label: input.location_address
      ? `${input.location_address}, ${input.location_city}`
      : input.location_city,
    location_city: input.location_city,
    location_address: input.location_address ?? null,
    sector_id: input.sector_id ?? null,
    /* salaire */
    salary_range_min: input.salary_min ?? null,
    salary_range_max: input.salary_max ?? null,
    salary_period: input.salary_period ?? null,
    salary_is_negotiable: input.salary_is_negotiable ?? false,
    /* horaires */
    weekly_hours: input.weekly_hours ?? null,
    schedule_details: input.schedule_details ?? null,
    is_flexible_schedule: input.is_flexible_schedule ?? false,
    /* dates */
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    /* prérequis */
    experience_level: input.experience_level ?? null,
    has_driving_license: input.has_driving_license ?? false,
    requires_vehicle: input.requires_vehicle ?? false,
    /* avantages */
    provides_housing: input.provides_housing ?? false,
    housing_details: input.housing_details ?? null,
    provides_meals: input.provides_meals ?? false,
    other_benefits: input.other_benefits && input.other_benefits.length > 0
      ? input.other_benefits.join(', ')
      : null,
    /* flags */
    is_urgent: input.is_urgent ?? false,
    is_remote_possible: false,
    /* compétences */
    required_skills: input.required_skills
      ? input.required_skills.split(',').map(s => s.trim()).filter(Boolean)
      : null,
    nice_to_have_skills: input.nice_to_have_skills
      ? input.nice_to_have_skills.split(',').map(s => s.trim()).filter(Boolean)
      : null,
    /* contact */
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    application_mode: input.application_mode ?? 'email',
    contact_instructions: input.contact_instructions ?? null,
    /* statut & scores */
    status: 'published',
    moderation_status: 'approved',
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
