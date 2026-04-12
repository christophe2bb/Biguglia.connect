/**
 * Types partagés – wizard "Déposer une demande d'emploi"
 */

export type Step = 1 | 2 | 3 | 4;

export interface FormData {
  /* Étape 1 – Mon profil */
  title: string;
  job_category: string;
  contract_types: string[];
  description: string;
  /* Étape 2 – Expérience */
  experience_level: string;
  experience_summary: string;
  has_driving_license: boolean;
  has_vehicle: boolean;
  cv_file: File | null;
  /* Étape 3 – Disponibilité & Conditions */
  availability_type: string;
  available_from: string;
  location_city: string;
  sector_id: string;
  mobility_radius: string;
  salary_min: string;
  salary_max: string;
  salary_period: string;
  salary_type: 'net' | 'brut' | '';
  weekly_hours: string;
  is_flexible_schedule: boolean;
  /* Étape 4 – Contact */
  contact_email: string;
  contact_phone: string;
  contact_mode: string;
  contact_instructions: string;
}

export interface StepConfig {
  id: number;
  label: string;
  /** Lucide icon component */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
}
