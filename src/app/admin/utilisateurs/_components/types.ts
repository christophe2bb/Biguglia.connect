import type { Profile } from '@/types';
import type { AdminUserEntry } from '@/app/api/admin/users/route';

export interface UserWithActivity extends Profile {
  artisan_profile?: AdminUserEntry['artisan_profile'];
  _counts?: {
    messages:         number;
    listings:         number;
    forum_posts:      number;
    service_requests: number;
    help_requests:    number;
    lost_found:       number;
    events:           number;
    group_outings:    number;
    equipment_items:  number;
    promenades:       number;
    reviews:          number;
    reports_sent:     number;
    job_offers:       number;
    job_demands:      number;
  };
}

/* ── Activité chargée à la demande ─────────────────────────────────────── */

export interface ActivityMessage {
  id:              string;
  content:         string;
  created_at:      string;
  conversation_id: string;
}

export interface ActivityListing {
  id:           string;
  title:        string;
  status:       string;
  listing_type: string;
  price:        number | null;
  cover_url:    string | null;
  created_at:   string;
}

export interface ActivityPost {
  id:        string;
  title:     string;
  is_closed: boolean;
  views:     number;
  created_at: string;
  category?: { name: string; icon: string } | null;
}

export interface ActivityRequest {
  id:         string;
  title:      string;
  status:     string;
  urgency:    string;
  created_at: string;
  category?:  { name: string; icon: string } | null;
}

export interface ActivityHelpRequest {
  id:         string;
  title:      string;
  category:   string;
  help_type:  string;
  status:     string;
  urgency:    string;
  created_at: string;
}

export interface ActivityLostFound {
  id:         string;
  title:      string;
  type:       'perdu' | 'trouve';
  category:   string;
  status:     string;
  created_at: string;
}

export interface ActivityEvent {
  id:         string;
  title:      string;
  status:     string;
  start_date: string;
  location:   string | null;
  created_at: string;
}

export interface ActivityOuting {
  id:               string;
  title:            string;
  status:           string;
  outing_date:      string | null;
  location:         string | null;
  max_participants: number | null;
  created_at:       string;
}

export interface ActivityEquipment {
  id:             string;
  title:          string;
  status:         string;
  category:       string | null;
  deposit_amount: number | null;
  created_at:     string;
}

export interface ActivityPromenade {
  id:          string;
  title:       string;
  type:        string;
  difficulty:  string;
  distance_km: number | null;
  status:      string;
  views:       number;
  created_at:  string;
}

export interface ActivityReview {
  id:         string;
  rating:     number;
  comment:    string | null;
  created_at: string;
  artisan?:   { business_name: string } | null;
}

export interface ActivityReport {
  id:          string;
  target_type: string;
  target_id:   string;
  reason:      string;
  status:      string;
  created_at:  string;
}

export interface ActivityJobOffer {
  id:            string;
  title:         string;
  status:        string;
  contract_type: string | null;
  created_at:    string;
}

export interface ActivityJobDemand {
  id:         string;
  title:      string;
  status:     string;
  created_at: string;
}

export interface ActivityNotification {
  id:         string;
  type:       string;
  title:      string;
  message:    string;
  is_read:    boolean;
  created_at: string;
}

export interface UserActivity {
  messages:         ActivityMessage[];
  listings:         ActivityListing[];
  forum_posts:      ActivityPost[];
  service_requests: ActivityRequest[];
  help_requests:    ActivityHelpRequest[];
  lost_found:       ActivityLostFound[];
  events:           ActivityEvent[];
  group_outings:    ActivityOuting[];
  equipment_items:  ActivityEquipment[];
  promenades:       ActivityPromenade[];
  reviews:          ActivityReview[];
  reports_sent:     ActivityReport[];
  job_offers:       ActivityJobOffer[];
  job_demands:      ActivityJobDemand[];
  notifications:    ActivityNotification[];
}
