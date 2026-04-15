// ─── Constants — Perdu / Trouvé ────────────────────────────────────────────────
import {
  Key, CreditCard, Smartphone, Briefcase, Gem, Shirt,
  Glasses, Dog, FileText, Baby, Bike, Zap, Package,
} from 'lucide-react';
import type { LFStatus, LFFormValues, StatusConfig } from './_types';

// ─── Flux status sets ─────────────────────────────────────────────────────────
export const ACTIVE_STATUSES: LFStatus[] = ['perdu', 'trouve', 'identifie'];
export const HISTORY_STATUSES: LFStatus[] = ['restitue', 'clos', 'archive'];

// Statuts DB legacy (anglais)
export const ACTIVE_STATUSES_EN = ['lost', 'found', 'identified', 'active', 'open'];
export const HISTORY_STATUSES_EN = ['returned', 'closed', 'archived', 'resolved'];

// ─── Normalisation helpers ────────────────────────────────────────────────────
export function normalizeItemStatus(s: string | null | undefined): LFStatus {
  const map: Record<string, LFStatus> = {
    lost: 'perdu', found: 'trouve', identified: 'identifie',
    returned: 'restitue', closed: 'clos', archived: 'archive',
    active: 'perdu', open: 'perdu', resolved: 'clos',
    perdu: 'perdu', trouve: 'trouve', identifie: 'identifie',
    restitue: 'restitue', clos: 'clos', archive: 'archive', draft: 'draft',
  };
  return map[s ?? ''] ?? 'perdu';
}

export function normalizeItemType(t: string | null | undefined): 'perdu' | 'trouve' {
  if (t === 'lost') return 'perdu';
  if (t === 'found') return 'trouve';
  if (t === 'perdu' || t === 'trouve') return t as 'perdu' | 'trouve';
  return 'perdu';
}

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<LFStatus, StatusConfig> = {
  perdu:     { label: 'Perdu',      color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-300',  dot: 'bg-orange-500',  icon: '🔴', description: 'Objet déclaré perdu' },
  trouve:    { label: 'Trouvé',     color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-300', dot: 'bg-emerald-500', icon: '🟢', description: 'Objet trouvé et signalé' },
  identifie: { label: 'Identifié',  color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-300',    dot: 'bg-blue-500',    icon: '🔵', description: 'Correspondance sérieuse établie' },
  restitue:  { label: 'Restitué',   color: 'text-purple-700',  bg: 'bg-purple-50',   border: 'border-purple-300',  dot: 'bg-purple-500',  icon: '✅', description: 'Rendu à son propriétaire' },
  clos:      { label: 'Clos',       color: 'text-gray-600',    bg: 'bg-gray-50',     border: 'border-gray-300',    dot: 'bg-gray-400',    icon: '⚫', description: 'Dossier clôturé' },
  archive:   { label: 'Archivé',    color: 'text-slate-500',   bg: 'bg-slate-50',    border: 'border-slate-200',   dot: 'bg-slate-400',   icon: '📦', description: 'Conservé pour historique' },
  draft:     { label: 'Brouillon',  color: 'text-yellow-700',  bg: 'bg-yellow-50',   border: 'border-yellow-300',  dot: 'bg-yellow-500',  icon: '✏️', description: 'Brouillon non publié' },
};

// ─── Transitions autorisées ───────────────────────────────────────────────────
export const ALLOWED_TRANSITIONS: Record<LFStatus, LFStatus[]> = {
  perdu:     ['identifie', 'clos'],
  trouve:    ['identifie', 'clos'],
  identifie: ['restitue', 'clos', 'perdu', 'trouve'],
  restitue:  ['archive'],
  clos:      ['archive', 'perdu', 'trouve'],
  archive:   [],
  draft:     ['perdu', 'trouve'],
};

// ─── Catégories ───────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { value: 'cles',         label: 'Clés',                   icon: Key,         sensitive: false },
  { value: 'portefeuille', label: 'Portefeuille / papiers', icon: CreditCard,  sensitive: true  },
  { value: 'telephone',    label: 'Téléphone',              icon: Smartphone,  sensitive: false },
  { value: 'sac',          label: 'Sac / valise',           icon: Briefcase,   sensitive: false },
  { value: 'bijou',        label: 'Bijou / montre',         icon: Gem,         sensitive: false },
  { value: 'vetement',     label: 'Vêtement',               icon: Shirt,       sensitive: false },
  { value: 'lunettes',     label: 'Lunettes',               icon: Glasses,     sensitive: false },
  { value: 'animal',       label: 'Animal',                 icon: Dog,         sensitive: false },
  { value: 'document',     label: 'Document officiel',      icon: FileText,    sensitive: true  },
  { value: 'enfant',       label: 'Objet enfant / doudou',  icon: Baby,        sensitive: false },
  { value: 'velo',         label: 'Vélo / trottinette',     icon: Bike,        sensitive: false },
  { value: 'electronique', label: 'Électronique',           icon: Zap,         sensitive: false },
  { value: 'autre',        label: 'Autre',                  icon: Package,     sensitive: false },
];

export const SENSITIVE_CATEGORIES = CATEGORIES.filter(c => c.sensitive).map(c => c.value);

// ─── Lieux ────────────────────────────────────────────────────────────────────
export const DEPOSIT_LOCATIONS = [
  'Mairie', 'Commerce', 'Police municipale', 'Gendarmerie',
  'Pharmacie', 'Voisin', 'Autre',
];

export const LOCATION_AREAS = [
  'Centre-ville', 'Mairie', 'Parking stade', 'Parking mairie', 'Plage',
  'Stade', 'École', 'Arrêt de bus', 'Route nationale', 'Route forestière',
  'Étang', 'Marché', 'Poste', 'Église', 'Zone commerciale', 'Autre quartier',
];

// ─── Formulaire initial ───────────────────────────────────────────────────────
export const EMPTY_FORM: LFFormValues = {
  type: 'perdu',
  title: '',
  category: 'autre',
  description: '',
  brand: '',
  color: '',
  distinctive_sign: '',
  keep_secret: false,
  is_sensitive: false,
  lost_date: '',
  lost_time: '',
  location_area: '',
  location_detail: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  contact_mode: 'messagerie',
  show_phone: false,
  reward: '',
  sentimental_value: false,
  declared_authorities: false,
  need_community_help: true,
  deposited: false,
  deposited_at: '',
  proof_required: false,
  confirm_true: false,
  confirm_public: false,
  confirm_intermediary: false,
  sector_id: '',
};

// ─── Blocs informatifs bas de page ────────────────────────────────────────────
export const INFO_BLOCKS = [
  {
    icon: '🔒',
    title: 'Confidentialité',
    desc: 'Certains détails restent privés pour sécuriser la restitution et prévenir les fraudes.',
  },
  {
    icon: '🔵',
    title: 'Statut Identifié',
    desc: "Quand une piste sérieuse est établie, le dossier passe en « Identifié » pour indiquer qu'une restitution est probable.",
  },
  {
    icon: '📦',
    title: 'Historique séparé',
    desc: 'Les dossiers restitués ou clos sont dans l\'historique, pour ne pas encombrer le flux actif.',
  },
];
