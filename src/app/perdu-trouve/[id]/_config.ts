import type { LFStatus } from './_types';

// ─── Status config (styles + label) ──────────────────────────────────────────
export const STATUS_CONFIG: Record<LFStatus, {
  label: string; color: string; bg: string; border: string; icon: string; dot: string;
}> = {
  perdu:     { label: 'Perdu',     color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-300',  icon: '🔴', dot: 'bg-orange-500' },
  trouve:    { label: 'Trouvé',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '🟢', dot: 'bg-emerald-500' },
  identifie: { label: 'Identifié', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300',    icon: '🔵', dot: 'bg-blue-500' },
  restitue:  { label: 'Restitué',  color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300',  icon: '✅', dot: 'bg-purple-500' },
  clos:      { label: 'Clos',      color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-300',    icon: '⚫', dot: 'bg-gray-400' },
  archive:   { label: 'Archivé',   color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',   icon: '📦', dot: 'bg-slate-400' },
  draft:     { label: 'Brouillon', color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-300',  icon: '✏️', dot: 'bg-yellow-500' },
};

// ─── Allowed status transitions ───────────────────────────────────────────────
export const ALLOWED_TRANSITIONS: Record<LFStatus, LFStatus[]> = {
  perdu:     ['identifie', 'clos'],
  trouve:    ['identifie', 'clos'],
  identifie: ['restitue', 'clos', 'perdu', 'trouve'],
  restitue:  ['archive'],
  clos:      ['archive'],
  archive:   [],
  draft:     ['perdu', 'trouve'],
};

// ─── Category labels ──────────────────────────────────────────────────────────
export const CATEGORIES: Record<string, string> = {
  cles:         'Clés',
  portefeuille: 'Portefeuille / papiers',
  telephone:    'Téléphone',
  sac:          'Sac / valise',
  bijou:        'Bijou / montre',
  vetement:     'Vêtement',
  lunettes:     'Lunettes',
  animal:       'Animal',
  document:     'Document officiel',
  enfant:       'Objet enfant / doudou',
  velo:         'Vélo / trottinette',
  electronique: 'Électronique',
  autre:        'Autre',
};

// ─── Status normaliser (DB legacy: english → french) ─────────────────────────
export function normalizeStatus(s: string | null | undefined): LFStatus {
  const map: Record<string, LFStatus> = {
    // english → french
    lost: 'perdu', found: 'trouve', identified: 'identifie',
    returned: 'restitue', closed: 'clos', archived: 'archive',
    active: 'perdu', open: 'perdu', resolved: 'clos',
    // french pass-through
    perdu: 'perdu', trouve: 'trouve', identifie: 'identifie',
    restitue: 'restitue', clos: 'clos', archive: 'archive', draft: 'draft',
  };
  return map[s ?? ''] ?? 'perdu';
}

// ─── Type normaliser ──────────────────────────────────────────────────────────
export function normalizeType(t: string | null | undefined): 'perdu' | 'trouve' {
  if (t === 'perdu' || t === 'lost')  return 'perdu';
  if (t === 'trouve' || t === 'found') return 'trouve';
  return 'perdu';
}
