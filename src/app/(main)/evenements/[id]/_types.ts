// ─── Types — Détail d'un événement ───────────────────────────────────────────

import type { EventStatus } from '@/lib/events';

export interface EventDetail {
  id: string;
  author_id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  event_date: string;
  event_end_date?: string | null;
  start_time: string;
  end_time?: string | null;
  location: string;
  location_area: string;
  location_city: string;
  location_detail: string;
  organizer_name: string;
  price_type: string;
  price_amount?: number | null;
  capacity?: number | null;
  is_unlimited: boolean;
  status: string;
  registration_open: boolean;
  cover_photo_url?: string | null;
  tags: string[];
  cancel_reason?: string | null;
  postpone_reason?: string | null;
  original_event_date?: string | null;
  accessibility: string;
  contact_info: string;
  external_link: string;
  target_audience: string;
  created_at: string;
  updated_at: string;
  author?: { full_name: string; avatar_url?: string | null } | null;
  photos?: { id: string; url: string; display_order: number; is_cover: boolean }[];
  participants_count?: number;
  user_joined?: boolean;
  user_participant_status?: string | null;
}

export interface Participant {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  confirmed_at?: string | null;
  user?: { full_name: string; avatar_url?: string | null } | null;
}

export interface EventComment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string; avatar_url?: string | null } | null;
}

export interface StatusHistoryItem {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  changed_by_profile?: { full_name: string } | null;
}

export type TabId = 'info' | 'participants' | 'discussion' | 'historique';

export interface PendingTransition {
  to: EventStatus;
  label: string;
  requiresReason?: boolean;
}

export interface UseEventDetailReturn {
  // Data
  event: EventDetail | null;
  participants: Participant[];
  comments: EventComment[];
  statusHistory: StatusHistoryItem[];
  // UI state
  loading: boolean;
  activeTab: TabId;
  joiningEvent: boolean;
  commenting: boolean;
  commentText: string;
  showTransitionModal: boolean;
  pendingTransition: PendingTransition | null;
  transitionReason: string;
  showDeleteConfirm: boolean;
  newDate: string;
  newTime: string;
  lightboxIdx: number | null;
  showShareMenu: boolean;
  copied: boolean;
  // Setters
  setActiveTab: (tab: TabId) => void;
  setCommentText: (v: string) => void;
  setShowTransitionModal: (v: boolean) => void;
  setPendingTransition: (v: PendingTransition | null) => void;
  setTransitionReason: (v: string) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setNewDate: (v: string) => void;
  setNewTime: (v: string) => void;
  setLightboxIdx: (v: number | null) => void;
  setShowShareMenu: (v: (prev: boolean) => boolean) => void;
  // Actions
  handleJoinWithWaitlist: () => Promise<void>;
  handleDownloadIcal: () => void;
  handleCopyLink: () => Promise<void>;
  handleStatusTransition: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleComment: (e: React.FormEvent) => Promise<void>;
  handleDeleteComment: (commentId: string, authorId: string) => Promise<void>;
  handleMarkAttendance: (userId: string, status: 'present' | 'absent') => Promise<void>;
}
