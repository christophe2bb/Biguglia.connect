/**
 * src/app/evenements/nouveau/_config.ts
 * Static configuration for the "Nouvel événement" wizard.
 * Pure data — no React, no Supabase.
 */
import { Info, Calendar, MapPin, ImageIcon } from 'lucide-react';
import type { ElementType } from 'react';

// ── Form shape ────────────────────────────────────────────────────────────────

export interface EventForm {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  event_date: string;
  event_end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  location_area: string;
  location_detail: string;
  organizer_name: string;
  price_type: 'gratuit' | 'payant' | 'libre';
  price_amount: string;
  capacity: string;
  is_unlimited: boolean;
  registration_open: boolean;
  accessibility: string;
  contact_info: string;
  external_link: string;
  target_audience: string;
  tags: string;
  sector_id: string;
}

export const DEFAULT_FORM: EventForm = {
  title: '',
  subtitle: '',
  description: '',
  category: 'fete_locale',
  event_date: '',
  event_end_date: '',
  start_time: '18:00',
  end_time: '',
  location: 'Biguglia',
  location_area: '',
  location_detail: '',
  organizer_name: '',
  price_type: 'gratuit',
  price_amount: '',
  capacity: '',
  is_unlimited: false,
  registration_open: true,
  accessibility: '',
  contact_info: '',
  external_link: '',
  target_audience: '',
  tags: '',
  sector_id: '',
};

// ── Wizard steps ──────────────────────────────────────────────────────────────

export type FormStep = 'essentiel' | 'details' | 'pratique' | 'photos';

export interface StepConfig {
  id: FormStep;
  label: string;
  icon: ElementType;
}

export const STEPS: StepConfig[] = [
  { id: 'essentiel', label: 'Essentiel',  icon: Info      },
  { id: 'details',   label: 'Détails',    icon: Calendar  },
  { id: 'pratique',  label: 'Pratique',   icon: MapPin    },
  { id: 'photos',    label: 'Photos',     icon: ImageIcon },
];
