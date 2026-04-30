// ─── Types locaux — coups-de-main/[id] ────────────────────────────────────────

export type { HelpType, UrgencyLevel, Duration, Compensation, HelpStatus } from '../_types';

export type HelpRequest = {
  id: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string; created_at?: string } | null;
  help_type: import('../_types').HelpType;
  status: import('../_types').HelpStatus;
  title: string;
  category: string;
  description: string;
  urgency: import('../_types').UrgencyLevel;
  help_date: string | null;
  help_time: string | null;
  sector_id?: string | null;
  location_area: string;
  location_city: string;
  location_detail: string | null;
  duration: import('../_types').Duration;
  persons_needed: number;
  compensation: import('../_types').Compensation;
  compensation_detail: string | null;
  equipment: string[];
  for_who: string;
  conditions: string[];
  visibility: string;
  contact_mode: string;
  display_name: string;
  photos?: { url: string; display_order: number; caption?: string }[];
  created_at: string;
  updated_at: string;
  status_changed_at?: string | null; // resolved_at n'existe pas sur help_requests → status_changed_at (mis à jour par trigger)
};

export type HelpComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { id?: string; full_name?: string; avatar_url?: string } | null;
};

export type HelpParticipant = {
  id: string;
  user_id: string;
  role: string;
  state: string;
  message: string | null;
  created_at: string;
  user?: { full_name?: string; avatar_url?: string } | null;
};

export type UseHelpDetailReturn = {
  item: HelpRequest | null;
  loading: boolean;
  notFound: boolean;
  comments: HelpComment[];
  loadingComments: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  sendingComment: boolean;
  participants: HelpParticipant[];
  loadingPart: boolean;
  isSaved: boolean;
  helping: boolean;
  alreadyHelping: boolean;
  openShare: boolean;
  setOpenShare: (v: boolean) => void;
  shareRef: React.RefObject<HTMLDivElement>;
  lightboxOpen: boolean;
  setLightboxOpen: (v: boolean) => void;
  lightboxIdx: number;
  setLightboxIdx: (v: number) => void;
  handleSendComment: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleCanHelp: () => Promise<void>;
  handleStatusChange: (status: string) => Promise<void>;
  handleAcceptParticipant: (participantId: string) => Promise<void>;
  handleDeclineParticipant: (participantId: string) => Promise<void>;
  toggleSave: () => void;
  shareUrl: string;
  shareText: string;
  isAuthor: boolean;
  isActive: boolean;
  isResolved: boolean;
};
