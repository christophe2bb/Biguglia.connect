// ─── Types – /emploi/publier ───────────────────────────────────────────────────

export type Step = 1 | 2 | 3 | 4;

export interface FormData {
  /* Étape 1 – L'offre */
  title: string;
  job_category: string;
  /** État brut du formulaire — validaé comme ContractType dans _payload.ts au submit */
  contract_type: string;
  description: string;
  required_skills: string;
  nice_to_have_skills: string;
  /* Étape 2 – Employeur */
  employer_name: string;
  location_city: string;
  location_address: string;
  sector_id: string;
  is_urgent: boolean;
  /* Étape 3 – Conditions */
  salary_min: string;
  salary_max: string;
  salary_period: string;
  salary_type: 'net' | 'brut' | '';
  salary_is_negotiable: boolean;
  weekly_hours: string;
  schedule_details: string;
  is_flexible_schedule: boolean;
  start_date: string;
  end_date: string;
  /** État brut du formulaire — validé comme ExperienceLevel dans _payload.ts au submit */
  experience_level: string;
  provides_housing: boolean;
  housing_details: string;
  provides_meals: boolean;
  requires_vehicle: boolean;
  has_driving_license: boolean;
  other_benefits: string[];
  /* Étape 4 – Contact */
  contact_email: string;
  contact_phone: string;
  application_mode: string;
  contact_instructions: string;
}

export type SetField = (field: keyof FormData, value: string | boolean | string[]) => void;

export type UsePublierFormReturn = {
  step: Step;
  form: FormData;
  submitting: boolean;
  serverError: string | null;
  done: boolean;
  publishedSlug: string | null;
  set: SetField;
  toggleBenefit: (id: string) => void;
  next: () => void;
  prev: () => void;
  canNext: () => boolean;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
};
