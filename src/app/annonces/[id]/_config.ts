import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS } from '@/lib/utils';

// ─── Type labels / colors / emojis (extends shared constants) ────────────────
export const ALL_TYPE_LABELS: Record<string, string> = {
  ...LISTING_TYPE_LABELS,
  exchange: 'Échange',
  rental: 'Location',
};

export const ALL_TYPE_COLORS: Record<string, string> = {
  ...LISTING_TYPE_COLORS,
  exchange: 'bg-amber-100 text-amber-700',
  rental: 'bg-cyan-100 text-cyan-700',
};

export const ALL_TYPE_EMOJIS: Record<string, string> = {
  sale: '🏷️', wanted: '🔍', free: '🎁', service: '🛠️',
  exchange: '🔄', rental: '🔑',
};

// ─── Condition labels ─────────────────────────────────────────────────────────
export const CONDITION_LABELS: Record<string, string> = {
  neuf:      '✨ Neuf',
  tres_bon:  '👍 Très bon état',
  bon:       '👌 Bon état',
  usage:     '🔧 Usagé',
  a_reparer: '🔨 À réparer',
  lot:       '📦 Lot',
  excellent: '⭐ Excellent',
  passable:  '⚠️ Passable',
};

// ─── Status timeline steps ────────────────────────────────────────────────────
export type TimelineStep = {
  status: string;
  label: string;
  icon: string;
  done: boolean;
  current: boolean;
};

const STATUS_TIMELINE_DEFS = [
  { status: 'draft',    label: 'Brouillon', icon: '📝' },
  { status: 'active',   label: 'Publiée',   icon: '✅' },
  { status: 'reserved', label: 'Réservée',  icon: '🔒' },
  { status: 'sold',     label: 'Vendue',    icon: '🎉' },
];

const STATUS_ORDER = ['draft', 'active', 'reserved', 'sold', 'given', 'exchanged', 'closed', 'archived'];

export function buildTimeline(currentStatus: string): TimelineStep[] {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  return STATUS_TIMELINE_DEFS.map(step => ({
    ...step,
    done:    currentIdx >= STATUS_ORDER.indexOf(step.status),
    current: currentStatus === step.status,
  }));
}
