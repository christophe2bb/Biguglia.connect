// ─── Types – Promenade sortie detail ──────────────────────────────────────────

import type { OutingStatus, StatusTransition } from '@/lib/outings';
export type { StatusTransition };

export type TabId = 'info' | 'participants' | 'discussion' | 'historique';

export type Participant = {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  created_at: string;
  notes?: string;
  profile?: { full_name: string; avatar_url?: string } | null;
};

export type StatusHistory = {
  id: string;
  old_status: string | null;
  new_status: string;
  reason?: string;
  created_at: string;
  changed_by_profile?: { full_name: string } | null;
};

export type Comment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name: string; avatar_url?: string } | null;
};

export type OutingPhoto = {
  url: string;
  display_order: number;
  is_cover?: boolean;
};

export type Outing = {
  id: string;
  organizer_id: string;
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
  status: string;
  is_registration_open: boolean;
  location_area: string | null;
  location_city: string | null;
  duration_estimate: string | null;
  notes: string | null;
  cover_photo_url: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  organizer?: { full_name: string; avatar_url?: string } | null;
  photos?: OutingPhoto[];
};

export type UseOutingDetailReturn = {
  // Data
  outing: Outing | null;
  participants: Participant[];
  statusHistory: StatusHistory[];
  comments: Comment[];
  loading: boolean;
  userParticipation: Participant | null;

  // Computed
  isOrganizer: boolean;
  isAdmin: boolean;
  canManage: boolean;
  activeParticipants: Participant[];
  frenchStatus: OutingStatus;
  availableTransitions: StatusTransition[];
  fillPct: number;
  coverPhoto: string | undefined;
  dateLabel: string;

  // Tab
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  // Comment
  commentText: string;
  setCommentText: (v: string) => void;
  sendingComment: boolean;
  handleSendComment: () => Promise<void>;

  // Registration
  registering: boolean;
  handleRegister: () => Promise<void>;

  // Deletion
  handleDeleteOuting: () => Promise<void>;
  activeParticipantsCount: number;

  // Transition modal
  showModal: boolean;
  pendingTo: OutingStatus | null;
  pendingLabel: string;
  pendingRequiresReason: boolean;
  transitionReason: string;
  setTransitionReason: (v: string) => void;
  applyingTransition: boolean;
  openTransitionModal: (to: OutingStatus, label: string, requiresReason?: boolean) => void;
  closeModal: () => void;
  applyTransition: () => Promise<void>;
};
