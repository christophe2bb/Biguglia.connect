export type UserRole = 'resident' | 'artisan_pending' | 'artisan_verified' | 'moderator' | 'admin';
export type AccountStatus = 'active' | 'pending' | 'rejected' | 'suspended';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
  legal_consent: boolean;
  legal_consent_at?: string;
}

export type ArtisanType = 'professionnel' | 'particulier';

export interface ArtisanProfile {
  id: string;
  user_id: string;
  business_name: string;
  trade_category_id: string;
  description: string;
  service_area: string;
  years_experience?: number;
  siret?: string;
  insurance?: string;
  artisan_type?: ArtisanType;
  doc_kbis_url?: string;
  doc_insurance_url?: string;
  doc_id_url?: string;
  rejection_reason?: string;
  verification_notes?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  profile?: Profile;
  trade_category?: TradeCategory;
  gallery?: ArtisanPhoto[];
  reviews?: Review[];
  avg_rating?: number;
  review_count?: number;
}

export interface TradeCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  display_order: number;
}

export interface ArtisanPhoto {
  id: string;
  artisan_id: string;
  url: string;
  caption?: string;
  display_order: number;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  resident_id: string;
  artisan_id?: string;
  category_id: string;
  title: string;
  description: string;
  urgency: 'normal' | 'urgent' | 'tres_urgent';
  preferred_date?: string;
  preferred_time?: string;
  address: string;
  status: 'submitted' | 'viewed' | 'replied' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Relations
  resident?: Profile;
  artisan?: ArtisanProfile;
  category?: TradeCategory;
  photos?: ServiceRequestPhoto[];
}

export interface ServiceRequestPhoto {
  id: string;
  request_id: string;
  url: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  request_id?: string;
  resident_id: string;
  artisan_id: string;
  proposed_date: string;
  proposed_time: string;
  notes?: string;
  status: 'pending' | 'accepted' | 'declined' | 'rescheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  resident?: Profile;
  artisan?: ArtisanProfile;
}

export interface Conversation {
  id: string;
  subject?: string;
  related_type?: 'service_request' | 'listing' | 'equipment' | 'general' | 'help_request' | 'collection_item' | 'lost_found' | 'association' | 'outing' | null;
  related_id?: string | null;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  participants?: ConversationParticipant[];
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at?: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  created_at: string;
  sender?: Profile;
}

export interface ListingCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
}

export interface Listing {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string;
  listing_type: 'sale' | 'wanted' | 'free' | 'service';
  price?: number;
  condition?: 'neuf' | 'tres_bon' | 'bon' | 'usage';
  location: string;
  status: 'active' | 'sold' | 'archived';
  views?: number;
  created_at: string;
  updated_at: string;
  user?: Profile;
  category?: ListingCategory;
  photos?: ListingPhoto[];
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  url: string;
  display_order: number;
}

export interface EquipmentCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
}

export interface EquipmentItem {
  id: string;
  owner_id: string;
  category_id: string;
  title: string;
  description: string;
  condition: 'neuf' | 'tres_bon' | 'excellent' | 'bon' | 'usage';
  deposit_amount?: number;
  is_free: boolean;
  daily_rate?: number;
  pickup_location: string;
  location_area?: string;
  rules?: string;
  availability_notes?: string;
  is_available: boolean;
  status?: string; // disponible | reserve | prete | rendu | indisponible | archive
  status_changed_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  category?: EquipmentCategory;
  photos?: EquipmentPhoto[];
}

export interface EquipmentPhoto {
  id: string;
  item_id: string;
  url: string;
  display_order: number;
}

export interface BorrowRequest {
  id: string;
  item_id: string;
  borrower_id: string;
  start_date: string;
  end_date: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned' | 'cancelled';
  created_at: string;
  updated_at: string;
  item?: EquipmentItem;
  borrower?: Profile;
}

// ── Promenades / Sorties groupées ────────────────────────────────────────────

export type OutingStatusFr = 'ouverte' | 'complete' | 'terminee' | 'annulee' | 'archivee';
export type OutingParticipantStatus = 'inscrit' | 'confirme' | 'annule' | 'present' | 'absent';

export interface GroupOuting {
  id: string;
  organizer_id: string;
  promenade_id?: string | null;
  title: string;
  description: string | null;
  outing_date: string;
  outing_time: string;
  max_participants: number;
  meeting_point: string | null;
  parking_info: string | null;
  parking_available: boolean;
  stroller_accessible: boolean;
  difficulty: 'facile' | 'moyen' | 'difficile' | null;
  kids_friendly: boolean;
  dogs_allowed: boolean;
  status: OutingStatusFr | string; // string fallback for legacy values
  is_registration_open: boolean;
  location_area: string | null;
  location_city: string | null;
  duration_estimate: string | null;
  cover_photo_url: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  organizer?: { full_name: string; avatar_url?: string } | null;
  photos?: OutingPhoto[];
  participants_count?: number;
  user_joined?: boolean;
}

export interface OutingPhoto {
  id: string;
  outing_id: string;
  url: string;
  display_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface OutingParticipant {
  id: string;
  outing_id: string;
  user_id: string;
  status: OutingParticipantStatus;
  joined_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  attendance_marked_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  profile?: Profile;
  outing?: GroupOuting;
}

export interface OutingStatusHistory {
  id: string;
  outing_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  // Relations
  changed_by_profile?: Profile;
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  display_order: number;
  post_count?: number;
}

export interface ForumPost {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_closed: boolean;
  views: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  category?: ForumCategory;
  comments?: ForumComment[];
  comment_count?: number;
}

export interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Review {
  id: string;
  artisan_id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: Profile;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'user' | 'post' | 'listing' | 'message' | 'equipment';
  target_id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// OutingStatus alias (compatible with lib/outings.ts)
export type OutingStatus = OutingStatusFr;
