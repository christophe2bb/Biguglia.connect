// ─── Types partagés — Coups de main ───────────────────────────────────────────

export type HelpType = 'demande' | 'offre' | 'echange';
export type UrgencyLevel = 'flexible' | 'cette_semaine' | 'rapidement' | 'urgent';
export type Duration = '15min' | '30min' | '1h' | '2h' | 'demi_journee' | 'journee' | 'variable';
export type Compensation = 'gratuit' | 'cafe' | 'echange' | 'frais' | 'discuter';
export type Visibility = 'public' | 'membres';
export type ContactMode = 'messagerie' | 'telephone_apres';
export type DisplayName = 'prenom' | 'prenom_initiale' | 'complet';
export type HelpStatus = 'active' | 'in_progress' | 'paused' | 'resolved' | 'closed' | 'archived' | 'draft';

export type HelpRequest = {
  id: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string; created_at?: string } | null;
  help_type: HelpType;
  status: HelpStatus;
  title: string;
  category: string;
  description: string;
  urgency: UrgencyLevel;
  help_date: string | null;
  help_time: string | null;
  sector_id?: string | null;
  location_area: string;
  location_city: string;
  location_detail: string | null;
  duration: Duration;
  persons_needed: number;
  compensation: Compensation;
  compensation_detail: string | null;
  equipment: string[];
  for_who: string;
  conditions: string[];
  visibility: Visibility;
  contact_mode: ContactMode;
  display_name: DisplayName;
  photos?: { url: string; display_order: number }[];
  created_at: string;
  updated_at: string;
  comment_count?: number;
  helper_count?: number;
};

export type HelpComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

/** Valeurs du formulaire multi-étapes */
export type HelpFormValues = {
  help_type: HelpType;
  title: string;
  category: string;
  description: string;
  urgency: UrgencyLevel;
  help_date: string;
  help_time: string;
  sector_id: string;
  location_area: string;
  location_city: string;
  location_detail: string;
  duration: Duration;
  persons_needed: number;
  compensation: Compensation;
  compensation_detail: string;
  equipment: string[];
  for_who: string;
  conditions: string[];
  visibility: Visibility;
  contact_mode: ContactMode;
  display_name: DisplayName;
  check1: boolean;
  check2: boolean;
  check3: boolean;
  check4: boolean;
  check5: boolean;
};

/** État des filtres */
export type HelpFilters = {
  filterType: 'all' | HelpType;
  filterCat: string;
  filterUrgency: 'all' | UrgencyLevel;
  filterSector: string | null;
  filterFree: boolean;
  filterMyHelp: boolean;
  search: string;
};
