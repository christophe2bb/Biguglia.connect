// ─── Config – /emploi/publier ──────────────────────────────────────────────────

import {
  FileText, Building2, Euro, Phone,
  Shield, Star, Coffee, GraduationCap, Wifi, Utensils, Car, Zap, Heart,
} from 'lucide-react';
import type React from 'react';
import { JOB_SECTORS } from '@/types/jobs/constants';
import type { FormData } from './_types';

// ── Stepper ────────────────────────────────────────────────────────────────────
export const STEPS: { id: number; label: string; icon: React.ElementType }[] = [
  { id: 1, label: "L'offre",    icon: FileText  },
  { id: 2, label: 'Employeur',  icon: Building2 },
  { id: 3, label: 'Conditions', icon: Euro      },
  { id: 4, label: 'Contact',    icon: Phone     },
];

// ── Initial form state ─────────────────────────────────────────────────────────
export const INITIAL_FORM: FormData = {
  title: '', job_category: '', contract_type: '', description: '',
  required_skills: '', nice_to_have_skills: '',
  employer_name: '', location_city: 'Biguglia', location_address: '',
  sector_id: '', is_urgent: false,
  salary_min: '', salary_max: '', salary_period: 'monthly',
  salary_type: '', salary_is_negotiable: false,
  weekly_hours: '', schedule_details: '', is_flexible_schedule: false,
  start_date: '', end_date: '', experience_level: '',
  provides_housing: false, housing_details: '', provides_meals: false,
  requires_vehicle: false, has_driving_license: false, other_benefits: [],
  contact_email: '', contact_phone: '', application_mode: 'email',
  contact_instructions: '',
};

// ── Salary period labels ───────────────────────────────────────────────────────
export const SALARY_PERIOD_LABELS: Record<string, string> = {
  hourly: '/ heure', daily: '/ jour', monthly: '/ mois', yearly: '/ an',
};

// ── Sectors (with empty fallback for «Non précisé») ───────────────────────────
export const SECTORS = [
  { id: '', label: 'Non précisé', emoji: '' },
  ...JOB_SECTORS,
];

// ── Benefit options ───────────────────────────────────────────────────────────
export const BENEFIT_OPTIONS: {
  id: string; label: string; icon: React.ElementType; color: string;
}[] = [
  { id: 'mutuelle',      label: 'Mutuelle entreprise',          icon: Shield,        color: 'blue'   },
  { id: 'prime',         label: 'Prime / 13e mois',             icon: Star,          color: 'amber'  },
  { id: 'conges_plus',   label: 'Congés supplémentaires',       icon: Coffee,        color: 'teal'   },
  { id: 'formation',     label: 'Formation / évolution',        icon: GraduationCap, color: 'indigo' },
  { id: 'remote',        label: 'Télétravail partiel',          icon: Wifi,          color: 'cyan'   },
  { id: 'ticket_resto',  label: 'Tickets restaurant',           icon: Utensils,      color: 'green'  },
  { id: 'transport',     label: 'Prise en charge transport',    icon: Car,           color: 'orange' },
  { id: 'intéressement', label: 'Intéressement / participation',icon: Zap,           color: 'yellow' },
  { id: 'cse',           label: 'Avantages CSE',                icon: Heart,         color: 'pink'   },
];

// ── Color classes for benefit badges ──────────────────────────────────────────
export const COLOR_CLASSES: Record<string, string> = {
  blue:   'border-blue-300   bg-blue-50   text-blue-800',
  amber:  'border-amber-300  bg-amber-50  text-amber-800',
  teal:   'border-teal-300   bg-teal-50   text-teal-800',
  indigo: 'border-indigo-300 bg-indigo-50 text-indigo-800',
  cyan:   'border-cyan-300   bg-cyan-50   text-cyan-800',
  green:  'border-green-300  bg-green-50  text-green-800',
  orange: 'border-orange-300 bg-orange-50 text-orange-800',
  yellow: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  pink:   'border-pink-300   bg-pink-50   text-pink-800',
};
