// ─── Types for associations/[id] ─────────────────────────────────────────────

export type AssoCategory =
  | 'sport' | 'culture' | 'solidarite' | 'jeunesse' | 'environnement'
  | 'loisirs' | 'animaux' | 'patrimoine' | 'sante' | 'education'
  | 'seniors' | 'autre';

export type PubType =
  | 'vitrine' | 'benevoles' | 'activite' | 'adherents'
  | 'materiel' | 'evenement' | 'dons' | 'partenaires';

export type Association = {
  id: string;
  author_id: string;
  author?: { full_name?: string; avatar_url?: string } | null;
  pub_type: PubType;
  status: string;
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

export type NeedPicto = {
  icon: string;
  label: string;
  color: string;
};
