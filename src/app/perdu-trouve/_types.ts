// ─── Types partagés — Perdu / Trouvé ──────────────────────────────────────────

export type LFType = 'perdu' | 'trouve';

/** Statuts métier complets selon le cahier des charges */
export type LFStatus =
  | 'perdu'       // déclaré perdu
  | 'trouve'      // déclaré trouvé
  | 'identifie'   // correspondance sérieuse établie
  | 'restitue'    // rendu au propriétaire
  | 'clos'        // dossier terminé sans restitution directe
  | 'archive'     // conservé pour historique
  | 'draft';      // brouillon

export type LFItem = {
  id: string;
  type: LFType;
  status: LFStatus;
  title: string;
  category: string;
  description: string;
  brand: string | null;
  color: string | null;
  distinctive_sign: string | null;
  keep_secret: boolean;
  is_sensitive: boolean;
  lost_date: string;
  lost_time: string | null;
  sector_id?: string | null;
  location_area: string;
  location_detail: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_mode: string;
  show_phone: boolean;
  reward: string | null;
  sentimental_value: boolean;
  declared_authorities: boolean;
  deposited_at: string | null;
  proof_required: boolean;
  need_community_help: boolean;
  matched_item_id: string | null;
  moderation_status: string | null;
  closed_at: string | null;
  archived_at: string | null;
  author_id: string;
  author?: {
    full_name: string;
    avatar_url?: string | null;
    created_at?: string;
    role?: string;
    phone?: string | null;
  } | null;
  photos?: { url: string; display_order?: number; is_cover?: boolean }[];
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

export type LFComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

export type LFMatch = {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  match_score: number;
  match_status: 'suggested' | 'confirmed' | 'rejected';
  created_at: string;
};

/** Valeurs du formulaire multi-étapes */
export type LFFormValues = {
  type: LFType;
  title: string;
  category: string;
  description: string;
  brand: string;
  color: string;
  distinctive_sign: string;
  keep_secret: boolean;
  is_sensitive: boolean;
  lost_date: string;
  lost_time: string;
  location_area: string;
  location_detail: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_mode: string;
  show_phone: boolean;
  reward: string;
  sentimental_value: boolean;
  declared_authorities: boolean;
  need_community_help: boolean;
  deposited: boolean;
  deposited_at: string;
  proof_required: boolean;
  confirm_true: boolean;
  confirm_public: boolean;
  confirm_intermediary: boolean;
  sector_id: string;
};

/** Config d'affichage d'un statut */
export type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  icon: string;
  description: string;
};
