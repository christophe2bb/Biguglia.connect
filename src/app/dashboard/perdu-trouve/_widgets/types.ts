export type LFType = 'perdu' | 'trouve';
export type LFStatus =
  | 'perdu' | 'trouve' | 'identifie' | 'restitue' | 'clos' | 'archive' | 'draft';

export type LFItem = {
  id: string;
  type: LFType;
  status: LFStatus;
  title: string;
  category: string;
  description: string;
  location_area: string;
  lost_date: string;
  is_sensitive: boolean;
  keep_secret: boolean;
  contact_name: string;
  deposited_at: string | null;
  reward: string | null;
  sentimental_value: boolean;
  matched_item_id: string | null;
  closed_at: string | null;
  archived_at: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  photos?: { url: string; display_order?: number }[];
  _comment_count?: number;
};

export type LFMatch = {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  match_score: number;
  match_status: 'suggested' | 'confirmed' | 'rejected';
  created_at: string;
  lost_item?: { title: string; category: string; location_area: string } | null;
  found_item?: { title: string; category: string; location_area: string } | null;
};

export type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
};

export const STATUS_CONFIG: Record<LFStatus, StatusConfig> = {
  perdu:     { label: 'Perdu',     color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-300', icon: '🔴' },
  trouve:    { label: 'Trouvé',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '🟢' },
  identifie: { label: 'Identifié', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300',   icon: '🔵' },
  restitue:  { label: 'Restitué',  color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300', icon: '✅' },
  clos:      { label: 'Clos',      color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-300',   icon: '⚫' },
  archive:   { label: 'Archivé',   color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',  icon: '📦' },
  draft:     { label: 'Brouillon', color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-300', icon: '✏️' },
};

export const ACTIVE_STATUSES: LFStatus[] = ['perdu', 'trouve', 'identifie'];
