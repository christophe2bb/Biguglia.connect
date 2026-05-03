// ─── Types Événements ─────────────────────────────────────────────────────────

export type LocalEvent = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  category: string;
  organizer_name: string | null;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  max_participants: number | null;
  is_free: boolean;
  price: number | null;
  tags: string[];
  is_official: boolean;
  status: string;
  participants_count?: number;
  user_joined?: boolean;
  participants_list?: { user_id: string; user?: { full_name: string; avatar_url?: string } }[];
  cover_photo?: string | null;
  sector_id?: string | null;
  registration_required?: boolean;
  audience?: string | null;
};

export type ForumPost = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  created_at: string;
  comment_count?: number;
  sector_id?: string | null;
};

export type EventCat = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  dot: string;
  emoji: string;
  description: string;
};

export type EventComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string; avatar_url?: string } | null;
};

export type QuickFilter = 'aujourd_hui' | 'ce_weekend' | 'famille' | 'gratuit' | 'officiel' | null;

export type ActiveTab = 'agenda' | 'semaine' | 'forum';

export type NewEventForm = {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  category: string;
  organizer_name: string;
  max_participants: string;
  is_free: boolean;
  price: string;
  sector_id: string;
  tags: string;
  audience: string;
  registration_required: boolean;
};
