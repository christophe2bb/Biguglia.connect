/**
 * Module Emploi Local - Validations Zod
 * Version 1.1 - 2026-04-09
 * 
 * Schémas de validation renforcés avec :
 * - Validation cross-field (min/max salary, dates)
 * - Messages d'erreur clairs en français
 * - Validation stricte pour application_mode=mixed
 * - Cohérence avec les constantes centralisées
 */

import { z } from 'zod';
import {
  CONTRACT_TYPES,
  EMPLOYMENT_TYPES,
  JOB_CATEGORIES,
  EXPERIENCE_LEVELS,
  AVAILABILITY_TYPES,
  JOB_STATUSES,
  _CONTACT_STATUSES,
  APPLICATION_MODES,
  MOBILITY_MODES,
  VISIBILITY_LEVELS,
  PROMOTION_TYPES,
  _PLAN_TYPES,
  VALIDATION_RULES,
} from './constants';

// ============================================================================
// BASE FIELD VALIDATORS
// ============================================================================

const titleSchema = z
  .string()
  .min(
    VALIDATION_RULES.TITLE_MIN_LENGTH,
    `Le titre doit contenir au moins ${VALIDATION_RULES.TITLE_MIN_LENGTH} caractères`
  )
  .max(
    VALIDATION_RULES.TITLE_MAX_LENGTH,
    `Le titre ne peut pas dépasser ${VALIDATION_RULES.TITLE_MAX_LENGTH} caractères`
  );

const shortDescriptionSchema = z
  .string()
  .min(
    VALIDATION_RULES.SHORT_DESC_MIN_LENGTH,
    `La description courte doit contenir au moins ${VALIDATION_RULES.SHORT_DESC_MIN_LENGTH} caractères`
  )
  .max(
    VALIDATION_RULES.SHORT_DESC_MAX_LENGTH,
    `La description courte ne peut pas dépasser ${VALIDATION_RULES.SHORT_DESC_MAX_LENGTH} caractères`
  );

const fullDescriptionSchema = z
  .string()
  .min(
    VALIDATION_RULES.FULL_DESC_MIN_LENGTH,
    `La description complète doit contenir au moins ${VALIDATION_RULES.FULL_DESC_MIN_LENGTH} caractères`
  )
  .max(
    VALIDATION_RULES.FULL_DESC_MAX_LENGTH,
    `La description complète ne peut pas dépasser ${VALIDATION_RULES.FULL_DESC_MAX_LENGTH} caractères`
  )
  .optional()
  .nullable();

const locationSchema = z
  .string()
  .min(
    VALIDATION_RULES.LOCATION_MIN_LENGTH,
    `Le lieu doit contenir au moins ${VALIDATION_RULES.LOCATION_MIN_LENGTH} caractères`
  )
  .max(
    VALIDATION_RULES.LOCATION_MAX_LENGTH,
    `Le lieu ne peut pas dépasser ${VALIDATION_RULES.LOCATION_MAX_LENGTH} caractères`
  );

const emailSchema = z
  .string()
  .email('Format d\'email invalide')
  .optional()
  .nullable();

const phoneSchema = z
  .string()
  .regex(/^(\+33|0)[1-9]\d{8}$/, 'Format de téléphone invalide (ex: 06 12 34 56 78)')
  .optional()
  .nullable();

const urlSchema = z
  .string()
  .url('Format d\'URL invalide')
  .optional()
  .nullable();

const tagsSchema = z
  .array(
    z
      .string()
      .max(
        VALIDATION_RULES.MAX_TAG_LENGTH,
        `Un tag ne peut pas dépasser ${VALIDATION_RULES.MAX_TAG_LENGTH} caractères`
      )
  )
  .max(
    VALIDATION_RULES.MAX_TAGS,
    `Vous ne pouvez pas ajouter plus de ${VALIDATION_RULES.MAX_TAGS} tags`
  )
  .optional()
  .nullable();

const skillsSchema = z
  .array(
    z
      .string()
      .max(
        VALIDATION_RULES.MAX_SKILL_LENGTH,
        `Une compétence ne peut pas dépasser ${VALIDATION_RULES.MAX_SKILL_LENGTH} caractères`
      )
  )
  .max(
    VALIDATION_RULES.MAX_SKILLS,
    `Vous ne pouvez pas ajouter plus de ${VALIDATION_RULES.MAX_SKILLS} compétences`
  )
  .optional()
  .nullable();

// ============================================================================
// JOB OFFER VALIDATION SCHEMA
// ============================================================================

export const jobOfferSchema = z
  .object({
    // Basic info
    title: titleSchema,
    job_category: z.enum(JOB_CATEGORIES, {
      message: 'Catégorie invalide',
    }),
    contract_type: z.enum(CONTRACT_TYPES, {
      message: 'Type de contrat invalide',
    }),
    employment_type: z.enum(EMPLOYMENT_TYPES, {
      message: 'Type d\'emploi invalide',
    }),

    // Location
    location_label: locationSchema,
    location_lat: z.number().min(-90).max(90).optional().nullable(),
    location_lng: z.number().min(-180).max(180).optional().nullable(),
    sector_id: z.string().optional().nullable(),
    is_remote_possible: z.boolean().default(false),

    // Timing
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    mission_duration_days: z
      .number()
      .int()
      .min(
        VALIDATION_RULES.MIN_MISSION_DURATION_DAYS,
        `La durée minimale est de ${VALIDATION_RULES.MIN_MISSION_DURATION_DAYS} jour`
      )
      .max(
        VALIDATION_RULES.MAX_MISSION_DURATION_DAYS,
        `La durée maximale est de ${VALIDATION_RULES.MAX_MISSION_DURATION_DAYS} jours`
      )
      .optional()
      .nullable(),
    availability_type: z.enum(AVAILABILITY_TYPES, {
      message: 'Type de disponibilité invalide',
    }),

    // Description
    short_description: shortDescriptionSchema,
    full_description: fullDescriptionSchema,
    required_skills: skillsSchema,
    nice_to_have_skills: skillsSchema,
    tags: tagsSchema,

    // Experience
    experience_level: z
      .enum(EXPERIENCE_LEVELS, {
        message: 'Niveau d\'expérience invalide',
      })
      .optional()
      .nullable(),
    experience_years_min: z.number().int().min(0).max(50).optional().nullable(),
    experience_years_max: z.number().int().min(0).max(50).optional().nullable(),

    // Salary
    salary_range_min: z
      .number()
      .min(
        VALIDATION_RULES.MIN_HOURLY_RATE,
        `Le salaire minimum ne peut pas être inférieur à ${VALIDATION_RULES.MIN_HOURLY_RATE}€`
      )
      .optional()
      .nullable(),
    salary_range_max: z
      .number()
      .max(
        VALIDATION_RULES.MAX_MONTHLY_SALARY,
        `Le salaire maximum ne peut pas dépasser ${VALIDATION_RULES.MAX_MONTHLY_SALARY}€`
      )
      .optional()
      .nullable(),
    salary_period: z.enum(['hourly', 'monthly', 'yearly']).optional().nullable(),
    salary_is_negotiable: z.boolean().default(false),

    // Schedule
    weekly_hours: z
      .number()
      .min(
        VALIDATION_RULES.MIN_WEEKLY_HOURS,
        `Le nombre d'heures hebdomadaires minimum est ${VALIDATION_RULES.MIN_WEEKLY_HOURS}h`
      )
      .max(
        VALIDATION_RULES.MAX_WEEKLY_HOURS,
        `Le nombre d'heures hebdomadaires maximum est ${VALIDATION_RULES.MAX_WEEKLY_HOURS}h (légal)`
      )
      .optional()
      .nullable(),
    schedule_details: z.string().max(500).optional().nullable(),
    is_flexible_schedule: z.boolean().default(false),

    // Requirements
    has_driving_license: z.boolean().default(false),
    requires_vehicle: z.boolean().default(false),

    // Contact
    application_mode: z.enum(APPLICATION_MODES, {
      message: 'Mode de candidature invalide',
    }),
    contact_email: emailSchema,
    contact_phone: phoneSchema,
    application_url: urlSchema,
    contact_instructions: z.string().max(500).optional().nullable(),

    // Benefits
    provides_housing: z.boolean().default(false),
    housing_details: z.string().max(500).optional().nullable(),
    provides_meals: z.boolean().default(false),
    other_benefits: z.string().max(500).optional().nullable(),

    // Status & visibility
    status: z
      .enum(JOB_STATUSES, {
        message: 'Statut invalide',
      })
      .default('draft'),
    is_urgent: z.boolean().default(false),
    visibility_level: z
      .enum(VISIBILITY_LEVELS)
      .default('standard'),
    promotion_type: z
      .enum(PROMOTION_TYPES)
      .default('none'),
    boosted_until: z.string().optional().nullable(),
    sponsor_label: z.string().max(50).optional().nullable(),

    // Optional organization
    organization_id: z.string().uuid().optional().nullable(),
  })
  // Cross-field validations
  .refine(
    (data) => {
      // Validate salary range: min <= max
      if (
        data.salary_range_min &&
        data.salary_range_max &&
        data.salary_range_min > data.salary_range_max
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Le salaire minimum ne peut pas être supérieur au salaire maximum',
      path: ['salary_range_min'],
    }
  )
  .refine(
    (data) => {
      // Validate experience range: min <= max
      if (
        data.experience_years_min &&
        data.experience_years_max &&
        data.experience_years_min > data.experience_years_max
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        'Le nombre d\'années d\'expérience minimum ne peut pas être supérieur au maximum',
      path: ['experience_years_min'],
    }
  )
  .refine(
    (data) => {
      // Validate dates: start < end
      if (data.start_date && data.end_date) {
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        if (start >= end) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'La date de début doit être antérieure à la date de fin',
      path: ['start_date'],
    }
  )
  .refine(
    (data) => {
      // Validate contact info based on application_mode
      if (data.application_mode === 'email' && !data.contact_email) {
        return false;
      }
      if (data.application_mode === 'phone' && !data.contact_phone) {
        return false;
      }
      if (data.application_mode === 'on_site' && !data.location_label) {
        return false;
      }
      // STRICT: mixed mode requires at least 2 contact methods
      if (data.application_mode === 'mixed') {
        const methods = [
          data.contact_email,
          data.contact_phone,
          data.application_url,
        ].filter(Boolean);
        if (methods.length < 2) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'Vous devez fournir les informations de contact correspondant au mode de candidature choisi (mode "Plusieurs moyens" requiert au moins 2 méthodes)',
      path: ['application_mode'],
    }
  )
  .refine(
    (data) => {
      // If requires_vehicle, must have driving_license
      if (data.requires_vehicle && !data.has_driving_license) {
        return false;
      }
      return true;
    },
    {
      message:
        'Si un véhicule est requis, le permis de conduire doit également être requis',
      path: ['requires_vehicle'],
    }
  );

// ============================================================================
// JOB DEMAND VALIDATION SCHEMA
// ============================================================================

export const jobDemandSchema = z
  .object({
    // Basic info
    title: titleSchema,
    job_category: z.enum(JOB_CATEGORIES, {
      message: 'Catégorie invalide',
    }),
    desired_contract_types: z
      .array(z.enum(CONTRACT_TYPES))
      .min(1, 'Vous devez sélectionner au moins un type de contrat')
      .max(5, 'Vous ne pouvez pas sélectionner plus de 5 types de contrats'),
    desired_employment_types: z
      .array(z.enum(EMPLOYMENT_TYPES))
      .min(1, 'Vous devez sélectionner au moins un type d\'emploi')
      .max(3, 'Vous ne pouvez pas sélectionner plus de 3 types d\'emploi'),

    // Location & mobility
    location_label: locationSchema,
    location_lat: z.number().min(-90).max(90).optional().nullable(),
    location_lng: z.number().min(-180).max(180).optional().nullable(),
    sector_id: z.string().optional().nullable(),
    mobility_radius: z
      .number()
      .min(0)
      .max(
        VALIDATION_RULES.MAX_MOBILITY_RADIUS,
        `Le rayon de mobilité ne peut pas dépasser ${VALIDATION_RULES.MAX_MOBILITY_RADIUS} km`
      )
      .optional()
      .nullable(),
    mobility_mode: z
      .enum(MOBILITY_MODES, {
        message: 'Mode de mobilité invalide',
      })
      .optional()
      .nullable(),

    // Availability
    availability_type: z.enum(AVAILABILITY_TYPES, {
      message: 'Type de disponibilité invalide',
    }),
    available_from: z.string().optional().nullable(),
    availability_comment: z.string().max(300).optional().nullable(),

    // Description
    short_description: shortDescriptionSchema,
    full_description: fullDescriptionSchema,
    skills: skillsSchema,
    tags: tagsSchema,

    // Experience
    experience_level: z
      .enum(EXPERIENCE_LEVELS, {
        message: 'Niveau d\'expérience invalide',
      })
      .optional()
      .nullable(),
    experience_years: z.number().int().min(0).max(50).optional().nullable(),

    // Expectations
    salary_expectation_min: z
      .number()
      .min(
        VALIDATION_RULES.MIN_HOURLY_RATE,
        `Le salaire attendu minimum ne peut pas être inférieur à ${VALIDATION_RULES.MIN_HOURLY_RATE}€`
      )
      .optional()
      .nullable(),
    salary_expectation_max: z
      .number()
      .max(
        VALIDATION_RULES.MAX_MONTHLY_SALARY,
        `Le salaire attendu maximum ne peut pas dépasser ${VALIDATION_RULES.MAX_MONTHLY_SALARY}€`
      )
      .optional()
      .nullable(),
    salary_period: z.enum(['hourly', 'monthly', 'yearly']).optional().nullable(),
    weekly_hours_desired: z
      .number()
      .min(VALIDATION_RULES.MIN_WEEKLY_HOURS)
      .max(VALIDATION_RULES.MAX_WEEKLY_HOURS)
      .optional()
      .nullable(),
    is_flexible_schedule: z.boolean().default(false),

    // Assets
    has_driving_license: z.boolean().default(false),
    has_vehicle: z.boolean().default(false),

    // Documents
    cv_url: urlSchema,
    portfolio_url: urlSchema,

    // Status
    status: z
      .enum(JOB_STATUSES, {
        message: 'Statut invalide',
      })
      .default('draft'),
    is_urgent: z.boolean().default(false),
  })
  // Cross-field validations
  .refine(
    (data) => {
      // Validate salary expectation range: min <= max
      if (
        data.salary_expectation_min &&
        data.salary_expectation_max &&
        data.salary_expectation_min > data.salary_expectation_max
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        'Le salaire attendu minimum ne peut pas être supérieur au salaire attendu maximum',
      path: ['salary_expectation_min'],
    }
  );

// ============================================================================
// JOB CONTACT VALIDATION SCHEMA
// ============================================================================

export const jobContactSchema = z
  .object({
    offer_id: z.string().uuid().optional().nullable(),
    demand_id: z.string().uuid().optional().nullable(),
    message: z
      .string()
      .min(
        10,
        'Votre message doit contenir au moins 10 caractères pour être clair et professionnel'
      )
      .max(
        VALIDATION_RULES.MAX_CONTACT_MESSAGE_LENGTH,
        `Le message ne peut pas dépasser ${VALIDATION_RULES.MAX_CONTACT_MESSAGE_LENGTH} caractères`
      ),
    contact_method: z.enum(['internal_message', 'email', 'phone'], {
      message: 'Méthode de contact invalide',
    }),
  })
  .refine(
    (data) => {
      // Must have either offer_id OR demand_id, not both, not neither
      const hasOffer = !!data.offer_id;
      const hasDemand = !!data.demand_id;
      return (hasOffer && !hasDemand) || (!hasOffer && hasDemand);
    },
    {
      message:
        'Le contact doit concerner soit une offre, soit une demande (pas les deux)',
      path: ['offer_id'],
    }
  );

// ============================================================================
// FILTER VALIDATION SCHEMAS
// ============================================================================

export const jobOfferFiltersSchema = z.object({
  query: z.string().optional(),
  categories: z
    .array(z.enum(JOB_CATEGORIES))
    .optional(),
  contractTypes: z
    .array(z.enum(CONTRACT_TYPES))
    .optional(),
  employmentTypes: z
    .array(z.enum(EMPLOYMENT_TYPES))
    .optional(),
  sectorId: z.string().optional(),
  radius: z.number().min(0).max(VALIDATION_RULES.MAX_MOBILITY_RADIUS).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  experienceLevels: z
    .array(z.enum(EXPERIENCE_LEVELS))
    .optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  salaryPeriod: z.enum(['hourly', 'monthly', 'yearly']).optional(),
  requiresLicense: z.boolean().optional(),
  requiresVehicle: z.boolean().optional(),
  providesHousing: z.boolean().optional(),
  providesRemote: z.boolean().optional(),
  availableFrom: z.string().optional(),
  isUrgent: z.boolean().optional(),
  sortBy: z
    .enum([
      'relevance',
      'date_desc',
      'date_asc',
      'salary_desc',
      'salary_asc',
      'completeness_desc',
    ])
    .optional()
    .default('relevance'),
  page: z.number().int().min(1).optional().default(1),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20),
});

export const jobDemandFiltersSchema = z.object({
  query: z.string().optional(),
  categories: z
    .array(z.enum(JOB_CATEGORIES))
    .optional(),
  contractTypes: z
    .array(z.enum(CONTRACT_TYPES))
    .optional(),
  employmentTypes: z
    .array(z.enum(EMPLOYMENT_TYPES))
    .optional(),
  sectorId: z.string().optional(),
  radius: z.number().min(0).max(VALIDATION_RULES.MAX_MOBILITY_RADIUS).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  experienceLevels: z
    .array(z.enum(EXPERIENCE_LEVELS))
    .optional(),
  availableFrom: z.string().optional(),
  isUrgent: z.boolean().optional(),
  hasLicense: z.boolean().optional(),
  hasVehicle: z.boolean().optional(),
  sortBy: z
    .enum([
      'relevance',
      'date_desc',
      'date_asc',
      'experience_desc',
      'completeness_desc',
    ])
    .optional()
    .default('relevance'),
  page: z.number().int().min(1).optional().default(1),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20),
});

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type JobOfferValidated = z.infer<typeof jobOfferSchema>;
export type JobDemandValidated = z.infer<typeof jobDemandSchema>;
export type JobContactValidated = z.infer<typeof jobContactSchema>;
export type JobOfferFiltersValidated = z.infer<typeof jobOfferFiltersSchema>;
export type JobDemandFiltersValidated = z.infer<typeof jobDemandFiltersSchema>;
