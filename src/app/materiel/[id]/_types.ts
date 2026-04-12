// ─── Types locaux — materiel/[id] ─────────────────────────────────────────────

export type {
  EquipmentStatus, EquipmentItemFull, EquipmentRequest, EquipmentLoan,
  EquipmentStatusHistory, AvailabilityMode, PickupMode, LendDurationHint, ConditionLabel,
} from '@/lib/equipment';

export type UseMaterielDetailReturn = {
  item: import('@/lib/equipment').EquipmentItemFull | null;
  requests: import('@/lib/equipment').EquipmentRequest[];
  activeLoan: import('@/lib/equipment').EquipmentLoan | null;
  history: import('@/lib/equipment').EquipmentStatusHistory[];
  loading: boolean;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  showRequestForm: boolean;
  setShowRequestForm: (v: boolean) => void;
  requestForm: { start_date: string; end_date: string; message: string };
  setRequestForm: React.Dispatch<React.SetStateAction<{ start_date: string; end_date: string; message: string }>>;
  submitting: boolean;
  statusLoading: boolean;
  ownerNote: string;
  setOwnerNote: (v: string) => void;
  borrowerNote: string;
  setBorrowerNote: (v: string) => void;
  showOwnerNoteForm: boolean;
  setShowOwnerNoteForm: (v: boolean) => void;
  handleStatusChange: (s: import('@/lib/equipment').EquipmentStatus) => Promise<void>;
  handleAcceptRequest: (req: import('@/lib/equipment').EquipmentRequest) => Promise<void>;
  handleRefuseRequest: (req: import('@/lib/equipment').EquipmentRequest) => Promise<void>;
  handleMarkLoaned: () => Promise<void>;
  handleMarkReturned: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleSendRequest: () => Promise<void>;
  handleCancelMyRequest: (reqId: string) => Promise<void>;
  handleSaveOwnerNote: () => Promise<void>;
  handleSaveBorrowerNote: () => Promise<void>;
  isOwner: boolean;
};
