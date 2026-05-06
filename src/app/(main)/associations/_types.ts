// ─── Types ───────────────────────────────────────────────────────────────────

export type AssoCategory =
  | 'sport' | 'culture' | 'solidarite' | 'jeunesse' | 'environnement'
  | 'loisirs' | 'animaux' | 'patrimoine' | 'sante' | 'education'
  | 'seniors' | 'autre';

export type PubType =
  | 'vitrine' | 'benevoles' | 'activite' | 'adherents'
  | 'materiel' | 'evenement' | 'dons' | 'partenaires';

export type AssoStatus = 'active' | 'inactive' | 'draft';

export type Association = {
  id: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  pub_type: PubType;
  status: AssoStatus;
  name: string;
  slogan: string | null;
  category: AssoCategory;
  description_short: string;
  description_full: string | null;
  location: string;
  address: string | null;
  schedule: string | null;
  public_target: string[];
  age_min: number | null;
  age_max: number | null;
  membership_required: boolean;
  price_type: string;
  price_detail: string | null;
  capacity: number | null;
  activities: string[];
  frequency: string | null;
  tags: string[];
  needs: string[];
  need_detail: string | null;
  contact_name: string;
  contact_role: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_website: string | null;
  contact_facebook: string | null;
  contact_instagram: string | null;
  contact_mode: string;
  show_phone: boolean;
  declared: boolean;
  rna_number: string | null;
  pmr_accessible: boolean;
  families_welcome: boolean;
  animals_ok: boolean;
  indoor: boolean | null;
  parking_nearby: boolean;
  material_provided: boolean;
  registration_required: boolean;
  places_limited: boolean;
  urgent_need: boolean;
  sector_id?: string | null;
  is_accepting_members?: boolean;
  is_accepting_volunteers?: boolean;
  is_accepting_donations?: boolean;
  is_accepting_partners?: boolean;
  last_activity_at?: string | null;
  photos?: { url: string; display_order: number }[];
  created_at: string;
  updated_at: string;
};

export type AssoComment = {
  id: string;
  content: string;
  created_at: string;
  author_id?: string;
  author?: { full_name?: string } | null;
};

export type AssociationFormData = {
  pub_type: PubType;
  name: string;
  slogan: string;
  category: AssoCategory;
  description_short: string;
  description_full: string;
  location: string;
  address: string;
  schedule: string;
  public_target: string[];
  age_min: string;
  age_max: string;
  membership_required: boolean;
  price_type: string;
  price_detail: string;
  capacity: string;
  activities: string[];
  frequency: string;
  tags: string[];
  needs: string[];
  need_detail: string;
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  contact_email: string;
  contact_website: string;
  contact_facebook: string;
  contact_instagram: string;
  contact_mode: string;
  show_phone: boolean;
  declared: boolean;
  rna_number: string;
  pmr_accessible: boolean;
  families_welcome: boolean;
  animals_ok: boolean;
  indoor: boolean | null;
  parking_nearby: boolean;
  material_provided: boolean;
  registration_required: boolean;
  places_limited: boolean;
  urgent_need: boolean;
  sector_id: string;
  is_accepting_members: boolean;
  is_accepting_volunteers: boolean;
  is_accepting_donations: boolean;
  is_accepting_partners: boolean;
};
