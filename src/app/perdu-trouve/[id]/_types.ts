// ─── Perdu / Trouvé – shared types ───────────────────────────────────────────

export type LFType   = 'perdu' | 'trouve';
export type LFStatus = 'perdu' | 'trouve' | 'identifie' | 'restitue' | 'clos' | 'archive' | 'draft';

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
  photos?: {
    url: string;
    display_order?: number;
    is_cover?: boolean;
    visibility_type?: string;
  }[];
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

export type LFStatusHistory = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  changer?: { full_name?: string } | null;
};

export type ShareMode = 'sms' | 'email' | 'copy';
