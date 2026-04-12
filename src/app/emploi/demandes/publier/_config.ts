/**
 * Configuration statique – wizard "Déposer une demande d'emploi"
 */

import { Clock, FileText, Phone, User } from 'lucide-react';
import { JOB_SECTORS } from '@/types/jobs/constants';
import type { FormData, StepConfig } from './_types';

/* ── Valeurs initiales du formulaire ──────────────────────────────────────── */
export const INITIAL: FormData = {
  title: '',
  job_category: '',
  contract_types: [],
  description: '',
  experience_level: '',
  experience_summary: '',
  has_driving_license: false,
  has_vehicle: false,
  cv_file: null,
  availability_type: 'flexible',
  available_from: '',
  location_city: 'Biguglia',
  sector_id: '',
  mobility_radius: '20',
  salary_min: '',
  salary_max: '',
  salary_period: 'monthly',
  salary_type: '',
  weekly_hours: '',
  is_flexible_schedule: false,
  contact_email: '',
  contact_phone: '',
  contact_mode: 'email',
  contact_instructions: '',
};

/* ── Étapes du wizard ─────────────────────────────────────────────────────── */
export const STEPS: StepConfig[] = [
  { id: 1, label: 'Mon profil',    icon: FileText },
  { id: 2, label: 'Expérience',    icon: User     },
  { id: 3, label: 'Disponibilité', icon: Clock    },
  { id: 4, label: 'Contact',       icon: Phone    },
];

/* ── Labels de disponibilité ──────────────────────────────────────────────── */
export const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: '🟢 Immédiatement disponible',
  week:      '📅 Dès la semaine prochaine',
  month:     '📅 Dans le mois',
  date:      '📅 À partir d\'une date',
  flexible:  '⚡ Flexible / À discuter',
};

/* ── Labels de période salariale ──────────────────────────────────────────── */
export const SALARY_PERIOD_LABELS: Record<string, string> = {
  hourly:  '/ heure',
  monthly: '/ mois',
  yearly:  '/ an',
};

/* ── Secteurs géographiques ───────────────────────────────────────────────── */
export const SECTORS = [
  { id: '', label: 'Toute la zone', emoji: '' },
  ...JOB_SECTORS,
];
