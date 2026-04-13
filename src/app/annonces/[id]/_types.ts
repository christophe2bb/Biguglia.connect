import { Listing } from '@/types';

// ─── Extended listing (adds CDC-specific optional fields) ─────────────────────
export type ExtListing = Listing & {
  user_id?: string;
  sector_id?: string;
  is_urgent?: boolean;
  is_negotiable?: boolean;
  pickup_notes?: string;
  availability_window?: string;
  exchange_preferences?: string;
  condition_state?: string;
  views_count?: number;
  expires_at?: string;
};

// ─── Share method ─────────────────────────────────────────────────────────────
export type ShareMethod = 'copy' | 'native' | 'sms' | 'email';

// ─── Author profile (subset fetched alongside listing) ───────────────────────
export type AuthorProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
};
