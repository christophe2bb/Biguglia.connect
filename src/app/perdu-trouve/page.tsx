'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Search, Plus, X, Loader2, AlertCircle, Camera, MapPin, Clock,
  Phone, Mail, MessageSquare, CheckCircle2, Shield, Eye, EyeOff,
  Pencil, Trash2, Share2, ChevronDown, ChevronUp, Users,
  Dog, Key, CreditCard, Smartphone, Briefcase, Gem, Glasses,
  Shirt, FileText, Bike, Baby, Package, Send, Archive,
  Bell, Zap, Star, Info, Flag, ChevronRight, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import { TrustScoreMini } from '@/components/ui/TrustScore';
import SectorFilter, { SectorBadge } from '@/components/ui/SectorFilter';
import { SECTORS } from '@/lib/sectors';

// ─── Types ────────────────────────────────────────────────────────────────────
type LFType = 'perdu' | 'trouve';

// Statuts métier complets selon le cahier des charges
type LFStatus =
  | 'perdu'       // déclaré perdu
  | 'trouve'      // déclaré trouvé
  | 'identifie'   // correspondance sérieuse établie
  | 'restitue'    // rendu au propriétaire
  | 'clos'        // dossier terminé sans restitution directe
  | 'archive'     // conservé pour historique
  | 'draft';      // brouillon

// Statuts du flux actif (visibles dans la liste principale)
const ACTIVE_STATUSES: LFStatus[] = ['perdu', 'trouve', 'identifie'];
// Statuts du flux historique
const HISTORY_STATUSES: LFStatus[] = ['restitue', 'clos', 'archive'];

// Statuts anglais (DB legacy) équivalents des statuts actifs
const ACTIVE_STATUSES_EN = ['lost', 'found', 'identified', 'active', 'open'];
// Statuts anglais (DB legacy) équivalents des statuts historiques
const HISTORY_STATUSES_EN = ['returned', 'closed', 'archived', 'resolved'];

// Normalise un statut DB (anglais ou français) vers les valeurs FR de l'UI
function normalizeItemStatus(s: string | null | undefined): LFStatus {
  const map: Record<string, LFStatus> = {
    lost: 'perdu', found: 'trouve', identified: 'identifie',
    returned: 'restitue', closed: 'clos', archived: 'archive',
    active: 'perdu', open: 'perdu', resolved: 'clos',
    perdu: 'perdu', trouve: 'trouve', identifie: 'identifie',
    restitue: 'restitue', clos: 'clos', archive: 'archive', draft: 'draft',
  };
  return map[s ?? ''] ?? 'perdu';
}

// Normalise le type DB (anglais ou français) vers 'perdu' | 'trouve'
function normalizeItemType(t: string | null | undefined): LFType {
  if (t === 'lost') return 'perdu';
  if (t === 'found') return 'trouve';
  if (t === 'perdu' || t === 'trouve') return t as LFType;
  return 'perdu';
}

type LFItem = {
  id: string;
  type: LFType;
  status: LFStatus;
  title: string;
  category: string;
  description: string;
  brand: string | null;
  color: string | null;
  distinctive_sign: string | null;
  keep_secret: boolean;
  is_sensitive: boolean;
  lost_date: string;
  lost_time: string | null;
  location_area: string;
  location_detail: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_mode: string;
  show_phone: boolean;
  reward: string | null;
  sentimental_value: boolean;
  declared_authorities: boolean;
  deposited_at: string | null;
  proof_required: boolean;
  need_community_help: boolean;
  matched_item_id: string | null;
  moderation_status: string | null;
  closed_at: string | null;
  archived_at: string | null;
  author_id: string;
  author?: { full_name: string; avatar_url?: string | null; created_at?: string; role?: string; phone?: string | null } | null;
  photos?: { url: string; display_order?: number; is_cover?: boolean }[];
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

type LFComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

type LFMatch = {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  match_score: number;
  match_status: 'suggested' | 'confirmed' | 'rejected';
  created_at: string;
};

// ─── Statut config ────────────────────────────────────────────────────────────
type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  icon: string;
  description: string;
};

const STATUS_CONFIG: Record<LFStatus, StatusConfig> = {
  perdu:     { label: 'Perdu',      color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-300',  dot: 'bg-orange-500',  icon: '🔴', description: 'Objet déclaré perdu' },
  trouve:    { label: 'Trouvé',     color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-300', dot: 'bg-emerald-500', icon: '🟢', description: 'Objet trouvé et signalé' },
  identifie: { label: 'Identifié',  color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-300',    dot: 'bg-blue-500',    icon: '🔵', description: 'Correspondance sérieuse établie' },
  restitue:  { label: 'Restitué',   color: 'text-purple-700',  bg: 'bg-purple-50',   border: 'border-purple-300',  dot: 'bg-purple-500',  icon: '✅', description: 'Rendu à son propriétaire' },
  clos:      { label: 'Clos',       color: 'text-gray-600',    bg: 'bg-gray-50',     border: 'border-gray-300',    dot: 'bg-gray-400',    icon: '⚫', description: 'Dossier clôturé' },
  archive:   { label: 'Archivé',    color: 'text-slate-500',   bg: 'bg-slate-50',    border: 'border-slate-200',   dot: 'bg-slate-400',   icon: '📦', description: 'Conservé pour historique' },
  draft:     { label: 'Brouillon',  color: 'text-yellow-700',  bg: 'bg-yellow-50',   border: 'border-yellow-300',  dot: 'bg-yellow-500',  icon: '✏️', description: 'Brouillon non publié' },
};

// Transitions autorisées selon le cahier des charges
const ALLOWED_TRANSITIONS: Record<LFStatus, LFStatus[]> = {
  perdu:     ['identifie', 'clos'],
  trouve:    ['identifie', 'clos'],
  identifie: ['restitue', 'clos', 'perdu', 'trouve'],
  restitue:  ['archive'],
  clos:      ['archive', 'perdu', 'trouve'],
  archive:   [],
  draft:     ['perdu', 'trouve'],
};

// ─── Catégories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'cles',         label: 'Clés',                    icon: Key,         sensitive: false },
  { value: 'portefeuille', label: 'Portefeuille / papiers',  icon: CreditCard,  sensitive: true  },
  { value: 'telephone',    label: 'Téléphone',               icon: Smartphone,  sensitive: false },
  { value: 'sac',          label: 'Sac / valise',            icon: Briefcase,   sensitive: false },
  { value: 'bijou',        label: 'Bijou / montre',          icon: Gem,         sensitive: false },
  { value: 'vetement',     label: 'Vêtement',                icon: Shirt,       sensitive: false },
  { value: 'lunettes',     label: 'Lunettes',                icon: Glasses,     sensitive: false },
  { value: 'animal',       label: 'Animal',                  icon: Dog,         sensitive: false },
  { value: 'document',     label: 'Document officiel',       icon: FileText,    sensitive: true  },
  { value: 'enfant',       label: 'Objet enfant / doudou',   icon: Baby,        sensitive: false },
  { value: 'velo',         label: 'Vélo / trottinette',      icon: Bike,        sensitive: false },
  { value: 'electronique', label: 'Électronique',            icon: Zap,         sensitive: false },
  { value: 'autre',        label: 'Autre',                   icon: Package,     sensitive: false },
];

const SENSITIVE_CATEGORIES = CATEGORIES.filter(c => c.sensitive).map(c => c.value);

const DEPOSIT_LOCATIONS = ['Mairie', 'Commerce', 'Police municipale', 'Gendarmerie', 'Pharmacie', 'Voisin', 'Autre'];

const LOCATION_AREAS = [
  'Centre-ville', 'Mairie', 'Parking stade', 'Parking mairie', 'Plage',
  'Stade', 'École', 'Arrêt de bus', 'Route nationale', 'Route forestière',
  'Étang', 'Marché', 'Poste', 'Église', 'Zone commerciale', 'Autre quartier',
];

// ─── StatusBadge component ────────────────────────────────────────────────────
function LFStatusBadge({ status, size = 'sm' }: { status: LFStatus; size?: 'xs' | 'sm' | 'md' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.perdu;
  const sz = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : size === 'md' ? 'text-sm px-3 py-1.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border} ${sz}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Moteur de correspondance (côté client, léger) ───────────────────────────
function computeMatchScore(lost: LFItem, found: LFItem): number {
  let score = 0;
  if (lost.category === found.category) score += 40;
  if (lost.location_area === found.location_area) score += 20;
  if (lost.color && found.color && lost.color.toLowerCase() === found.color.toLowerCase()) score += 15;
  if (lost.brand && found.brand && lost.brand.toLowerCase() === found.brand.toLowerCase()) score += 15;
  // Date proximity (within 7 days)
  const dLost = new Date(lost.lost_date).getTime();
  const dFound = new Date(found.lost_date).getTime();
  const diffDays = Math.abs(dLost - dFound) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) score += 10;
  else if (diffDays <= 7) score += 5;
  // Keyword match
  const lWords = (lost.title + ' ' + lost.description).toLowerCase().split(/\s+/);
  const fWords = (found.title + ' ' + found.description).toLowerCase().split(/\s+/);
  const common = lWords.filter(w => w.length > 3 && fWords.includes(w)).length;
  if (common > 0) score += Math.min(common * 3, 15);
  return Math.min(score, 100);
}

// ─── LostFoundCard ────────────────────────────────────────────────────────────
function LostFoundCard({
  item, userId, isAuthor, onEdit, onDelete, onStatusChange, suggestedMatches,
}: {
  item: LFItem;
  userId?: string;
  isAuthor: boolean;
  onEdit: (i: LFItem) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: LFStatus) => void;
  suggestedMatches?: LFItem[];
}) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [comments, setComments] = useState<LFComment[]>([]);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const CatIcon = CATEGORIES.find(c => c.value === item.category)?.icon ?? Package;
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.perdu;
  const isActive = ACTIVE_STATUSES.includes(item.status);
  const allPhotos = toPhotoItems(item.photos ?? []);
  const allowedTransitions = ALLOWED_TRANSITIONS[item.status] ?? [];
  const isSensitive = item.is_sensitive || SENSITIVE_CATEGORIES.includes(item.category);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    supabase.from('lf_comments').select('id', { count: 'exact', head: true })
      .eq('item_id', item.id)
      .then(({ count }) => setChatCount(count ?? 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const fetchComments = async () => {
    const { data } = await supabase.from('lf_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('item_id', item.id)
      .order('created_at', { ascending: true })
      .limit(50);
    setComments((data ?? []) as LFComment[]);
    setChatCount((data ?? []).length);
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('lf_comments').insert({ item_id: item.id, author_id: userId, content: chatText.trim() });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  const handleTransition = async (newStatus: LFStatus) => {
    const statusLabel: Record<LFStatus, string> = {
      perdu: 'Perdu', trouve: 'Trouvé', identifie: 'Identifié',
      restitue: 'Restitué', clos: 'Clos', archive: 'Archivé', draft: 'Brouillon',
    };
    if (!window.confirm(`Passer le dossier en "${statusLabel[newStatus]}" ?`)) return;
    setTransitioning(true);
    await onStatusChange(item.id, newStatus);
    setTransitioning(false);
  };

  const dateLabel = new Date(item.lost_date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const shareText = encodeURIComponent(
    `${item.type === 'perdu' ? '🔴 Objet perdu' : '🟢 Objet trouvé'} : ${item.title} — ${item.location_area}\n${typeof window !== 'undefined' ? window.location.origin : ''}/perdu-trouve`
  );

  return (
    <div id={item.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
      !isActive ? 'opacity-70 border-gray-200' : item.status === 'identifie' ? 'border-blue-300 ring-1 ring-blue-200' : item.type === 'perdu' ? 'border-orange-200' : 'border-emerald-200'
    }`}>

      {/* ── Photo / header ── */}
      <div className="relative h-44 overflow-hidden">
        {item.photos && item.photos.length > 0 ? (
          <div className="w-full h-full cursor-pointer" onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photos[0].url} alt={item.title} className="w-full h-full object-cover" />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-2 right-10 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
                +{allPhotos.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            item.type === 'perdu' ? 'bg-gradient-to-br from-orange-50 to-amber-100' : 'bg-gradient-to-br from-emerald-50 to-teal-100'
          }`}>
            <CatIcon className={`w-16 h-16 opacity-15 ${item.type === 'perdu' ? 'text-orange-400' : 'text-emerald-400'}`} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <LFStatusBadge status={item.status} />
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-gray-700 shadow">
            <CatIcon className="w-3 h-3" />
            {CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}
          </span>
          {isSensitive && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100/90 text-red-700 shadow">
              <Shield className="w-3 h-3" /> Sensible
            </span>
          )}
        </div>

        {/* Actions auteur haut droite */}
        {isAuthor && (
          <div className="absolute top-3 right-3 flex gap-1">
            <button onClick={() => onEdit(item)}
              className="p-1.5 bg-white/90 text-gray-600 hover:text-blue-600 rounded-lg shadow" title="Modifier">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(item.id)}
              className="p-1.5 bg-white/90 text-gray-600 hover:text-red-600 rounded-lg shadow" title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Correspondances suggérées */}
        {suggestedMatches && suggestedMatches.length > 0 && (
          <div className="absolute top-3 right-3">
            <button onClick={() => setShowMatches(v => !v)}
              className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
              <Zap className="w-3 h-3" /> {suggestedMatches.length} correspondance{suggestedMatches.length > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Titre en bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{item.title}</p>
          <p className="text-white/75 text-xs mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />{item.location_area} · {dateLabel}
          </p>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="p-4">

        {/* Badges secondaires */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Badge secteur */}
          {(item as LFItem & { sector_id?: string }).sector_id && (
            <SectorBadge sectorId={(item as LFItem & { sector_id?: string }).sector_id} size="xs" />
          )}
          {item.sentimental_value && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200">
              💝 Valeur sentimentale
            </span>
          )}
          {item.keep_secret && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <EyeOff className="w-3 h-3 inline mr-0.5" />Infos partielles
            </span>
          )}
          {item.declared_authorities && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
              🏛️ Déclaré aux autorités
            </span>
          )}
          {item.deposited_at && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              📍 Déposé : {item.deposited_at}
            </span>
          )}
          {item.reward && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              🏆 {item.reward}
            </span>
          )}
        </div>

        {/* Lieu + date */}
        <div className="flex flex-col gap-0.5 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            {item.location_area}{item.location_detail ? ` — ${item.location_detail}` : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            {dateLabel}{item.lost_time ? ` · ${item.lost_time}` : ''}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">{item.description}</p>

        {/* Correspondances suggérées */}
        {showMatches && suggestedMatches && suggestedMatches.length > 0 && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Correspondances probables
            </p>
            {suggestedMatches.map(m => {
              const score = computeMatchScore(
                item.type === 'perdu' ? item : m,
                item.type === 'perdu' ? m : item
              );
              return (
                <div key={m.id} className="flex items-center gap-2 py-1.5 border-t border-blue-100 first:border-0">
                  <div className={`text-xs font-black px-1.5 py-0.5 rounded-full ${score >= 70 ? 'bg-emerald-100 text-emerald-700' : score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    {score}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.location_area} · {m.lost_date}</p>
                  </div>
                  <ContactButton
                    sourceType="lost_found"
                    sourceId={m.id}
                    sourceTitle={m.title}
                    ownerId={m.author_id}
                    userId={userId}
                    size="sm"
                    ctaLabel="Contacter"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Expandable details */}
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1 mb-3">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Moins de détails</> : <><ChevronDown className="w-3.5 h-3.5" />Plus de détails</>}
        </button>

        {expanded && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs space-y-1.5 border border-gray-100">
            {item.color && <p className="text-gray-600"><span className="font-semibold">Couleur :</span> {item.color}</p>}
            {item.brand && <p className="text-gray-600"><span className="font-semibold">Marque :</span> {item.brand}</p>}
            {item.distinctive_sign && (
              <p className="text-gray-600"><span className="font-semibold">Signe distinctif :</span> {item.distinctive_sign}</p>
            )}
            {item.proof_required && (
              <p className="text-indigo-700 font-semibold">🔒 Preuve de propriété requise pour restitution</p>
            )}
            {/* Contact — affiché seulement si autorisé */}
            {!item.keep_secret && (
              <div className="pt-1.5 border-t border-gray-200 space-y-1">
                <p className="font-semibold text-gray-700">Contact : {item.contact_name}</p>
                {item.show_phone && item.contact_phone && (
                  <p className="flex items-center gap-1.5 text-gray-600"><Phone className="w-3 h-3" />{item.contact_phone}</p>
                )}
                {item.contact_email && (
                  <p className="flex items-center gap-1.5 text-gray-600"><Mail className="w-3 h-3" />{item.contact_email}</p>
                )}
              </div>
            )}
            {item.keep_secret && (
              <div className="pt-1.5 border-t border-gray-200">
                <p className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  Certains détails sont gardés confidentiels pour sécuriser la restitution.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Photos miniatures supplémentaires */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {allPhotos.slice(1).map((p, i) => (
              <button key={i} onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }} className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-100 hover:border-blue-300 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* ── Actions principales ── */}
        <div className="flex flex-wrap gap-2 items-start">

          {isAuthor ? (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 italic mb-1.5">✉️ Les membres vous contacteront via la messagerie</p>
              {/* Transitions de statut */}
              {allowedTransitions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {allowedTransitions.map(t => {
                    const tCfg = STATUS_CONFIG[t];
                    return (
                      <button key={t} onClick={() => handleTransition(t)} disabled={transitioning}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl border transition-colors disabled:opacity-50 ${tCfg.bg} ${tCfg.color} ${tCfg.border}`}>
                        {tCfg.icon} {tCfg.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <ContactButton
              sourceType="lost_found"
              sourceId={item.id}
              sourceTitle={item.title}
              ownerId={item.author_id}
              userId={userId}
              size="sm"
              ctaLabel={item.type === 'trouve' ? "C'est le mien" : "J'ai une info"}
              prefillMsg={item.type === 'trouve'
                ? `Bonjour, l'objet "${item.title}" trouvé à ${item.location_area} pourrait m'appartenir. Comment procéder pour la restitution ?`
                : `Bonjour, j'ai peut-être une information concernant votre "${item.title}" perdu à ${item.location_area}.`
              }
            />
          )}

          {/* Discussion */}
          <button onClick={() => { const w = !openChat; setOpenChat(w); if (w) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }}}
            className={`inline-flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs border transition-all ${
              openChat ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}>
            <MessageSquare className="w-3.5 h-3.5" />
            {chatCount > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>}
            Discussion
          </button>

          {/* Partager */}
          <div ref={shareRef} className="relative">
            <button onClick={e => { e.stopPropagation(); setOpenShare(v => !v); }}
              className="inline-flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Partager
            </button>
            {openShare && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[150px] overflow-hidden">
                <button onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  💬 Par SMS
                </button>
                <div className="border-t border-gray-100" />
                <button onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  📧 Par Email
                </button>
                <div className="border-t border-gray-100" />
                <button onClick={() => { navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/perdu-trouve#${item.id}`); toast.success('Lien copié !'); setOpenShare(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  🔗 Copier le lien
                </button>
              </div>
            )}
          </div>

          {!isAuthor && (
            <ReportButton targetType="lost_found" targetId={item.id} targetTitle={item.title} variant="mini" />
          )}
        </div>

        {/* ── Mini-forum ── */}
        {openChat && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message pour l&apos;instant</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: item.type === 'perdu' ? 'linear-gradient(135deg,#f97316,#ef4444)' : 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
                      {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <p className="text-xs font-bold text-gray-700">
                        {c.author?.full_name ?? 'Anonyme'}
                        <span className="font-normal text-gray-400 ml-1.5">{formatRelative(c.created_at)}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {userId ? (
              <div className="flex items-end gap-1.5">
                <textarea ref={inputRef} value={chatText} onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Votre message… (Entrée pour envoyer)" rows={2}
                  className="flex-1 text-xs rounded-lg border border-blue-200 px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                />
                <button onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-blue-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour répondre →
              </Link>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-3 pt-2 border-t border-gray-50">
          {item.author && (
            <TrustScoreMini
              profile={{
                id: item.author_id,
                created_at: item.author.created_at ?? item.created_at,
                role: (item.author as { role?: string }).role ?? 'resident',
                avatar_url: item.author.avatar_url ?? null,
                phone: item.author.phone ?? null,
              }}
            />
          )}
          <span className="flex-1">{item.author?.full_name ?? 'Membre'}</span>
          <span>· {formatRelative(item.created_at)}</span>
          {item.updated_at !== item.created_at && (
            <span className="text-gray-300">· modifié {formatRelative(item.updated_at)}</span>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={item.title} />
      )}
    </div>
  );
}

// ─── Formulaire initial ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  type: 'perdu' as LFType,
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
  sector_id: '',   // secteur obligatoire
};

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PerduTrouvePage() {
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [items, setItems] = useState<LFItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [flux, setFlux] = useState<'actif' | 'historique'>('actif');
  const [filterType, setFilterType] = useState<'all' | 'perdu' | 'trouve'>('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState<LFStatus | 'all'>('all');
  const [filterSector, setFilterSector] = useState<string | null>(
    typeof window !== 'undefined' && profile?.home_sector_id ? profile.home_sector_id : null
  );
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LFItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const photoRef = useRef<HTMLInputElement>(null);

  // ── Fetch items ──────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const activeStatuses = ACTIVE_STATUSES.map(s => `"${s}"`).join(',');
    const historyStatuses = HISTORY_STATUSES.map(s => `"${s}"`).join(',');

    // ── Requête principale avec FK explicite ─────────────────────────────────
    const buildQuery = (selectStr: string) => {
      let q = supabase
        .from('lost_found_items')
        .select(selectStr)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(100);
      // Inclut les équivalents anglais (DB legacy) pour ne rater aucune annonce
      if (flux === 'actif') q = q.in('status', [...ACTIVE_STATUSES, ...ACTIVE_STATUSES_EN]);
      else q = q.in('status', [...HISTORY_STATUSES, ...HISTORY_STATUSES_EN]);
      if (filterType !== 'all') q = q.eq('type', filterType);
      if (filterCat !== 'all') q = q.eq('category', filterCat);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (filterSector) { try { q = q.eq('sector_id', filterSector); } catch { /* optionnel */ } }
      return q;
    };

    // Tentative 1 : avec FK explicite
    let { data, error } = await buildQuery(
      '*, author:profiles!lost_found_items_author_id_fkey(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover)'
    );

    // Tentative 2 : sans FK nommée
    if (error?.message?.includes('fkey') || error?.message?.includes('foreign') || error?.code === 'PGRST200') {
      ({ data, error } = await buildQuery(
        '*, author:profiles(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover)'
      ));
    }

    // Tentative 3 : sans jointure profiles ni photos
    if (error?.message?.includes('fkey') || error?.message?.includes('foreign') || error?.code === 'PGRST200') {
      ({ data, error } = await buildQuery('*'));
    }

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('column')) {
        setDbReady(false);
      }
      setLoading(false);
      return;
    }
    setDbReady(true);

    // Normalise les statuts et types (DB peut stocker en anglais) + tri photos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = (data || []) as unknown as (LFItem & { photos?: { url: string; display_order?: number; is_cover?: boolean }[] })[];
    const enriched = rawData.map((it) => ({
      ...it,
      status: normalizeItemStatus(it.status),
      type: normalizeItemType(it.type),
      photos: (it.photos || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    }));

    // Search filter
    const filtered = search.trim()
      ? enriched.filter(it =>
          it.title.toLowerCase().includes(search.toLowerCase()) ||
          it.description.toLowerCase().includes(search.toLowerCase()) ||
          it.location_area.toLowerCase().includes(search.toLowerCase()) ||
          (it.brand && it.brand.toLowerCase().includes(search.toLowerCase())) ||
          (it.color && it.color.toLowerCase().includes(search.toLowerCase()))
        )
      : enriched;

    setItems(filtered as LFItem[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flux, filterType, filterCat, filterStatus, filterSector, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Moteur de correspondance côté client ─────────────────────────────────
  const getSuggestedMatches = useCallback((item: LFItem): LFItem[] => {
    if (!ACTIVE_STATUSES.includes(item.status)) return [];
    const oppositeType: LFType = item.type === 'perdu' ? 'trouve' : 'perdu';
    return items
      .filter(other =>
        other.type === oppositeType &&
        other.id !== item.id &&
        ACTIVE_STATUSES.includes(other.status) &&
        other.category === item.category
      )
      .map(other => ({
        item: other,
        score: computeMatchScore(
          item.type === 'perdu' ? item : other,
          item.type === 'perdu' ? other : item
        ),
      }))
      .filter(({ score }) => score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ item }) => item);
  }, [items]);

  // ── Photo helpers ─────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 5 - photos.length);
    setPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    if (photoRef.current) photoRef.current.value = '';
  };

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM); setPhotos([]); setPreviews([]);
    setEditingItem(null); setShowForm(false); setStep(1);
  };

  const startEdit = (item: LFItem) => {
    setEditingItem(item);
    setForm({
      type: item.type, title: item.title, category: item.category,
      description: item.description, brand: item.brand ?? '', color: item.color ?? '',
      distinctive_sign: item.distinctive_sign ?? '', keep_secret: item.keep_secret,
      is_sensitive: item.is_sensitive, lost_date: item.lost_date, lost_time: item.lost_time ?? '',
      location_area: item.location_area, location_detail: item.location_detail ?? '',
      contact_name: item.contact_name, contact_phone: item.contact_phone ?? '',
      contact_email: item.contact_email ?? '', contact_mode: item.contact_mode,
      show_phone: item.show_phone, reward: item.reward ?? '',
      sentimental_value: item.sentimental_value, declared_authorities: item.declared_authorities,
      need_community_help: item.need_community_help, deposited: !!item.deposited_at,
      deposited_at: item.deposited_at ?? '', proof_required: item.proof_required,
      confirm_true: true, confirm_public: true, confirm_intermediary: true,
      sector_id: (item as LFItem & { sector_id?: string }).sector_id ?? '',
    });
    setPhotos([]); setPreviews([]);
    setShowForm(true); setStep(1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (asDraft = false) => {
    if (!profile) return;
    if (!form.title.trim() || !form.lost_date || !form.location_area) {
      toast.error('Titre, date et lieu sont obligatoires'); return;
    }
    if (!asDraft && (!form.confirm_true || !form.confirm_public || !form.confirm_intermediary)) {
      toast.error('Veuillez cocher les 3 cases de validation'); return;
    }

    setSubmitting(true);

    // Détecter si catégorie sensible
    const isSensitiveCat = SENSITIVE_CATEGORIES.includes(form.category);

    // Statut métier initial selon le type
    const initialStatus: LFStatus = asDraft ? 'draft' : form.type === 'perdu' ? 'perdu' : 'trouve';

    const payload = {
      author_id: profile.id,
      type: form.type,
      status: initialStatus,
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      brand: form.brand.trim() || null,
      color: form.color.trim() || null,
      distinctive_sign: form.distinctive_sign.trim() || null,
      keep_secret: form.keep_secret,
      is_sensitive: form.is_sensitive || isSensitiveCat,
      lost_date: form.lost_date,
      lost_time: form.lost_time || null,
      sector_id: form.sector_id || null,
      location_area: form.location_area,
      location_detail: form.location_detail.trim() || null,
      contact_name: form.contact_name.trim() || profile.full_name || 'Anonyme',
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_mode: form.contact_mode,
      show_phone: form.show_phone,
      reward: form.reward.trim() || null,
      sentimental_value: form.sentimental_value,
      declared_authorities: form.declared_authorities,
      need_community_help: form.need_community_help,
      deposited_at: form.deposited ? (form.deposited_at || null) : null,
      proof_required: form.proof_required,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    let itemId: string | null = null;

    if (editingItem) {
      const { error } = await supabase.from('lost_found_items').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Erreur modification'); setSubmitting(false); return; }
      itemId = editingItem.id;
      toast.success('Annonce modifiée ✓');
    } else {
      const { data: inserted, error } = await supabase.from('lost_found_items').insert(payload).select('id').single();
      if (error) { toast.error('Erreur publication'); setSubmitting(false); return; }
      itemId = inserted?.id ?? null;
      toast.success(asDraft ? 'Brouillon enregistré ✓' : `${form.type === 'perdu' ? '🔴 Annonce "Perdu"' : '🟢 Annonce "Trouvé"'} publiée !`, { duration: 4000 });
    }

    // Upload photos
    if (photos.length > 0 && itemId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `lost-found/${itemId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { toast.error(`Photo ${i + 1} non sauvegardée`); continue; }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          await supabase.from('lf_photos').insert({ item_id: itemId, url: u.publicUrl, display_order: i, is_cover: i === 0 });
        }
      }
    }

    resetForm();
    fetchItems();
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    // Suppression logique : on archive plutôt que de supprimer physiquement
    await supabase.from('lost_found_items').update({
      status: 'archive',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    toast.success('Annonce archivée');
    fetchItems();
  };

  const handleStatusChange = async (id: string, newStatus: LFStatus) => {
    const now = new Date().toISOString();
    const updates: Record<string, string | null> = {
      status: newStatus,
      updated_at: now,
    };
    if (newStatus === 'restitue') updates.restitution_confirmed_at = now;
    if (newStatus === 'clos') updates.closed_at = now;
    if (newStatus === 'archive') updates.archived_at = now;

    await supabase.from('lost_found_items').update(updates).eq('id', id);

    // Enregistrer dans l'historique de statuts (si la table existe)
    try {
      await supabase.from('lf_status_history').insert({
        item_id: id,
        new_status: newStatus,
        changed_by: profile?.id,
      });
    } catch { /* silencieux si table absente */ }

    // Créer une trust_interaction lors d'une restitution confirmée
    if (newStatus === 'restitue' && profile) {
      const item = items.find(i => i.id === id);
      if (item && item.author_id !== profile.id) {
        try {
          await supabase.from('trust_interactions').insert({
            source_type: 'lost_found',
            source_id: id,
            requester_id: profile.id,
            receiver_id: item.author_id,
            interaction_type: 'transaction',
            status: 'done',
            requester_review_allowed: true,
            receiver_review_allowed: true,
            completed_at: new Date().toISOString(),
          });
        } catch { /* silencieux si table absente */ }
      }
    }

    const cfg = STATUS_CONFIG[newStatus];
    toast.success(`✅ Statut : ${cfg.icon} ${cfg.label}`);
    fetchItems();
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const activeItems = items.filter(i => ACTIVE_STATUSES.includes(i.status));
  const perdusCount = items.filter(i => i.status === 'perdu').length;
  const trouveCount = items.filter(i => i.status === 'trouve').length;
  const identifieCount = items.filter(i => i.status === 'identifie').length;
  const restitueCount = items.filter(i => i.status === 'restitue').length;

  // ── Formulaire ────────────────────────────────────────────────────────────
  const renderForm = () => {
    const isPerdu = form.type === 'perdu';
    const isSensitive = form.is_sensitive || SENSITIVE_CATEGORIES.includes(form.category);
    const accentOn = isPerdu ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600';
    const accentBorder = isPerdu ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700';

    return (
      <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              {editingItem ? '✏️ Modifier l\'annonce' : '📢 Publier une annonce Perdu / Trouvé'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Service local · Biguglia Connect</p>
          </div>
          <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {/* Steps */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {['Type', 'Objet', 'Lieu & Date', 'Photos', 'Contact', 'Validation'].map((s, i) => (
            <button key={i} onClick={() => setStep(i + 1)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                step === i + 1 ? (isPerdu ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white') :
                step > i + 1 ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'
              }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                step > i + 1 ? 'bg-green-400 text-white' : step === i + 1 ? 'bg-white/30' : 'bg-gray-300 text-gray-500'
              }`}>{step > i + 1 ? '✓' : i + 1}</span>
              {s}
            </button>
          ))}
        </div>

        {/* Step 1 : Type */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(['perdu', 'trouve'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 font-black text-lg transition-all ${
                    form.type === t
                      ? t === 'perdu' ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                  }`}>
                  <span className="text-5xl">{t === 'perdu' ? '🔴' : '🟢'}</span>
                  <span className="uppercase tracking-wide">{t === 'perdu' ? "J'ai perdu" : "J'ai trouvé"}</span>
                  <span className="text-xs font-normal text-current opacity-70 text-center">
                    {t === 'perdu' ? 'Je cherche à retrouver un objet' : 'J\'ai trouvé un objet et cherche son propriétaire'}
                  </span>
                </button>
              ))}
            </div>
            <div className={`rounded-xl p-3 text-sm border ${accentBorder}`}>
              {isPerdu
                ? '🔐 Décrivez précisément l\'objet et l\'endroit où vous pensez l\'avoir perdu. Gardez un détail secret si vous le souhaitez.'
                : '🔐 Indiquez où et quand vous l\'avez trouvé, sans révéler d\'informations sensibles permettant une fausse réclamation.'}
            </div>
            {/* Secteur obligatoire dès l'étape 1 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                📍 Secteur <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(où avez-vous perdu/trouvé l&apos;objet ?)</span>
              </label>
              <SectorFilter
                value={form.sector_id || null}
                onChange={id => setForm(f => ({ ...f, sector_id: id || '' }))}
                showAll={false}
                compact={true}
                required={true}
                className="w-full"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!form.sector_id}
                className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-opacity ${accentOn} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 : Objet */}
        {step === 2 && (
          <div className="space-y-4">
            <input type="text" placeholder="Titre de l'annonce *" required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.value} type="button" onClick={() => setForm(f => ({
                      ...f, category: cat.value, is_sensitive: cat.sensitive
                    }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                        form.category === cat.value
                          ? isPerdu ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-center leading-tight">{cat.label}</span>
                      {cat.sensitive && <span className="text-[9px] text-red-400 font-bold">🔒 Sensible</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <textarea placeholder="Description (couleur, marque, état, circonstances…)" rows={3}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Couleur" value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input type="text" placeholder="Marque / modèle" value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <input type="text" placeholder="Signe distinctif (gravure, autocollant, rayure…)" value={form.distinctive_sign}
              onChange={e => setForm(f => ({ ...f, distinctive_sign: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {!isPerdu && (
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input type="checkbox" checked={form.keep_secret} onChange={e => setForm(f => ({ ...f, keep_secret: e.target.checked }))} className="mt-0.5 rounded" />
                <div>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><EyeOff className="w-4 h-4" />Garder certains détails confidentiels</p>
                  <p className="text-xs text-slate-500 mt-0.5">Recommandé : vérifier que le réclamant est le vrai propriétaire avant de révéler tous les détails</p>
                </div>
              </label>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
              <button onClick={() => setStep(3)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${accentOn}`}>Suivant →</button>
            </div>
          </div>
        )}

        {/* Step 3 : Lieu & Date */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                <input type="date" required value={form.lost_date}
                  onChange={e => setForm(f => ({ ...f, lost_date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Heure approximative</label>
                <input type="time" value={form.lost_time}
                  onChange={e => setForm(f => ({ ...f, lost_time: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Lieu principal *</label>
              <select value={form.location_area} onChange={e => setForm(f => ({ ...f, location_area: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                <option value="">Choisir un lieu…</option>
                {LOCATION_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Précision sur le lieu (ex: banc côté gauche, entrée principale…)"
              value={form.location_detail} onChange={e => setForm(f => ({ ...f, location_detail: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
              <button onClick={() => setStep(4)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${accentOn}`}>Suivant →</button>
            </div>
          </div>
        )}

        {/* Step 4 : Photos */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Photos (max 5 — fortement conseillées)</p>
            {isSensitive && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Objet sensible :</strong> Pour un portefeuille ou document d&apos;identité, ne photographiez pas les informations personnelles visibles (n° de carte, photo…).
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 py-0.5 rounded font-bold">Principal</span>}
                </div>
              ))}
              {photos.length < 5 && (
                <button onClick={() => photoRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-400 hover:bg-blue-50 transition-all">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs mt-1">Ajouter</span>
                </button>
              )}
            </div>
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            <p className="text-xs text-gray-400">{photos.length === 0 ? '💡 Une photo augmente fortement les chances de retrouver l\'objet !' : `${photos.length}/5 photo${photos.length > 1 ? 's' : ''}`}</p>
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
              <button onClick={() => setStep(5)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${accentOn}`}>Suivant →</button>
            </div>
          </div>
        )}

        {/* Step 5 : Contact + compléments */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Contact</p>
              <div className="space-y-3">
                <input type="text" placeholder="Nom ou prénom affiché *"
                  value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input type="tel" placeholder="Téléphone (optionnel)"
                    value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <input type="email" placeholder="Email (optionnel)"
                    value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[{ v: 'messagerie', l: '💬 Messagerie' }, { v: 'telephone', l: '📞 Téléphone' }, { v: 'email', l: '📧 Email' }].map(m => (
                    <button key={m.v} type="button" onClick={() => setForm(f => ({ ...f, contact_mode: m.v }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.contact_mode === m.v ? accentBorder : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                      {m.l}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.show_phone} onChange={e => setForm(f => ({ ...f, show_phone: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">Afficher mon téléphone publiquement</span>
                </label>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">{isPerdu ? '📋 Infos — Objet perdu' : '📋 Infos — Objet trouvé'}</p>
              <div className="space-y-3">
                {isPerdu ? (
                  <>
                    <input type="text" placeholder="🏆 Récompense proposée (ex: 50€)"
                      value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.sentimental_value} onChange={e => setForm(f => ({ ...f, sentimental_value: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">💝 Objet de grande valeur sentimentale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.declared_authorities} onChange={e => setForm(f => ({ ...f, declared_authorities: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">🏛️ Déclaration faite en mairie / gendarmerie</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.need_community_help} onChange={e => setForm(f => ({ ...f, need_community_help: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">📢 Besoin d&apos;aide de la communauté</span>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.deposited} onChange={e => setForm(f => ({ ...f, deposited: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">📍 Objet déposé quelque part</span>
                    </label>
                    {form.deposited && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Déposé où ?</label>
                        <div className="flex gap-2 flex-wrap">
                          {DEPOSIT_LOCATIONS.map(d => (
                            <button key={d} type="button" onClick={() => setForm(f => ({ ...f, deposited_at: d }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.deposited_at === d ? accentBorder : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.proof_required} onChange={e => setForm(f => ({ ...f, proof_required: e.target.checked }))} className="rounded" />
                      <span className="text-sm text-gray-700">🔒 Remise uniquement après vérification du propriétaire</span>
                    </label>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(4)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
              <button onClick={() => setStep(6)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${accentOn}`}>Suivant →</button>
            </div>
          </div>
        )}

        {/* Step 6 : Validation */}
        {step === 6 && (
          <div className="space-y-5">
            {/* Aperçu */}
            <div className={`rounded-xl border p-4 ${isPerdu ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Aperçu avant publication</p>
              <p className="text-base font-black text-gray-900">{form.title || '(sans titre)'}</p>
              <p className="text-xs text-gray-500 mt-1">
                {form.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé'} · {CATEGORIES.find(c => c.value === form.category)?.label} · {form.location_area || '—'} · {form.lost_date || '—'}
              </p>
              {form.color && <p className="text-xs text-gray-500 mt-0.5">Couleur : {form.color}</p>}
              {form.reward && <p className="text-xs text-orange-600 font-bold mt-1">🏆 {form.reward}</p>}
            </div>

            {/* Conseils sécurité */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-bold text-blue-700">Rappels de sécurité</p>
              </div>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Ne publiez pas de données bancaires, N° de sécu ou mot de passe</li>
                <li>• Pour un portefeuille, ne photographiez pas les infos personnelles</li>
                {!isPerdu && <li>• Gardez un détail secret pour identifier le vrai propriétaire</li>}
                <li>• Privilégiez la messagerie de la plateforme pour les contacts initiaux</li>
                {form.category === 'animal' && <li>• Pour un animal, mentionnez si vous avez contacté un vétérinaire / vérifié la puce</li>}
              </ul>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              {[
                { key: 'confirm_true', label: 'Je confirme que les informations sont exactes et véridiques' },
                { key: 'confirm_public', label: 'J\'accepte que l\'annonce soit visible publiquement sur la plateforme' },
                { key: 'confirm_intermediary', label: 'Je comprends que la plateforme est un intermédiaire, non responsable de la restitution' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="mt-0.5 rounded" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleSubmit(false)}
                disabled={submitting || !form.confirm_true || !form.confirm_public || !form.confirm_intermediary}
                className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white text-sm disabled:opacity-50 ${accentOn}`}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                📢 Publier l&apos;annonce
              </button>
              <button onClick={() => handleSubmit(true)} disabled={submitting}
                className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                💾 Brouillon
              </button>
              <button onClick={() => setStep(5)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* Avertissement DB */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Migration nécessaire.</strong> Exécutez le SQL dans <Link href="/admin/migration" className="underline">Admin → Migration</Link> pour activer le module.
            </p>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-400 via-amber-400 to-emerald-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl"><Search className="w-5 h-5" /></div>
                <span className="text-amber-100 text-sm font-semibold">Vie pratique · Perdu / Trouvé</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">🔍 Perdu / Trouvé à Biguglia</h1>
              <p className="text-amber-100 text-base max-w-lg leading-relaxed">
                Service local de proximité — déclarez un objet perdu ou trouvé, la communauté vous aide.
              </p>

              {/* Compteurs */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 bg-orange-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  🔴 {perdusCount} perdu{perdusCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  🟢 {trouveCount} trouvé{trouveCount !== 1 ? 's' : ''}
                </span>
                {identifieCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    🔵 {identifieCount} identifié{identifieCount !== 1 ? 's' : ''}
                  </span>
                )}
                {restitueCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-purple-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    ✅ {restitueCount} restitué{restitueCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Link href="/communaute/perdu-trouve"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition">
                  <Users className="w-4 h-4" /> Communauté →
                </Link>
                {profile && (
                  <Link href="/dashboard/perdu-trouve"
                    className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition">
                    <BookOpen className="w-4 h-4" /> Mes dossiers →
                  </Link>
                )}
              </div>
            </div>
            {profile && (
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-6 py-3 rounded-2xl hover:bg-orange-50 transition-all shadow-lg text-sm flex-shrink-0">
                <Plus className="w-5 h-5" /> Publier une annonce
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Formulaire */}
        {showForm && profile && renderForm()}

        {/* ── Flux actif / historique ── */}
        <div className="flex items-center gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
          <button onClick={() => setFlux('actif')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${flux === 'actif' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
            <Bell className="w-4 h-4" /> Flux actif
            {perdusCount + trouveCount + identifieCount > 0 && (
              <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${flux === 'actif' ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-700'}`}>
                {perdusCount + trouveCount + identifieCount}
              </span>
            )}
          </button>
          <button onClick={() => setFlux('historique')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${flux === 'historique' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
            <Archive className="w-4 h-4" /> Historique
            {restitueCount > 0 && (
              <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${flux === 'historique' ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {restitueCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Filtre secteur (obligatoire — affichage, pas blocage) ── */}
        <SectorFilter
          value={filterSector}
          onChange={setFilterSector}
          showAll={true}
          compact={true}
          label="Secteur"
          className="mb-4"
        />

        {/* ── Filtres ── */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-52 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher (titre, couleur, marque, lieu…)" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            />
          </div>

          {/* Filtre statut (remplace le double filtre type + statut) */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm font-semibold shadow-sm">
            <button onClick={() => { setFilterStatus('all'); setFilterType('all'); }}
              className={`px-3 py-2.5 text-xs transition-all ${filterStatus === 'all' && filterType === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              Tous
            </button>
            {(flux === 'actif' ? ACTIVE_STATUSES : HISTORY_STATUSES).map(s => {
              const cfg = STATUS_CONFIG[s];
              // Pour perdu/trouvé on filtre par type, pour les autres par statut
              const isTypeFilter = s === 'perdu' || s === 'trouve';
              const isActive = isTypeFilter
                ? filterType === s
                : filterStatus === s;
              return (
                <button key={s}
                  onClick={() => {
                    if (isTypeFilter) {
                      setFilterType(s as 'perdu' | 'trouve');
                      setFilterStatus('all');
                    } else {
                      setFilterStatus(s);
                      setFilterType('all');
                    }
                  }}
                  className={`px-3 py-2.5 text-xs transition-all ${isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>

          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* ── Liste ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">Aucune annonce dans ce flux</p>
            <p className="text-gray-400 text-sm mt-1">
              {flux === 'actif' ? 'Soyez le premier à publier !' : 'Aucune restitution enregistrée pour l\'instant.'}
            </p>
            {flux === 'actif' && (
              profile ? (
                <button onClick={() => { resetForm(); setShowForm(true); }}
                  className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-all">
                  <Plus className="w-4 h-4" /> Publier une annonce
                </button>
              ) : (
                <Link href="/connexion"
                  className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-all">
                  Se connecter pour publier
                </Link>
              )
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {items.length} annonce{items.length > 1 ? 's' : ''} · {flux === 'actif' ? 'flux actif' : 'historique'}
              </p>
              {flux === 'actif' && items.some(i => getSuggestedMatches(i).length > 0) && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                  <Zap className="w-3.5 h-3.5" /> Correspondances détectées automatiquement
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map(item => (
                <LostFoundCard
                  key={item.id}
                  item={item}
                  userId={profile?.id}
                  isAuthor={profile?.id === item.author_id}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  suggestedMatches={flux === 'actif' ? getSuggestedMatches(item) : []}
                />
              ))}
            </div>
          </>
        )}

        {/* CTA non connecté */}
        {!profile && items.length > 0 && (
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
            <p className="text-orange-700 font-medium mb-3">Connectez-vous pour publier ou répondre aux annonces</p>
            <Link href="/connexion"
              className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-all">
              Se connecter
            </Link>
          </div>
        )}

        {/* Bloc info bas de page */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🔒', title: 'Confidentialité', desc: 'Certains détails restent privés pour sécuriser la restitution et prévenir les fraudes.' },
            { icon: '🔵', title: 'Statut Identifié', desc: 'Quand une piste sérieuse est établie, le dossier passe en "Identifié" pour indiquer qu\'une restitution est probable.' },
            { icon: '📦', title: 'Historique séparé', desc: 'Les dossiers restitués ou clos sont dans l\'historique, pour ne pas encombrer le flux actif.' },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
              <span className="text-2xl">{b.icon}</span>
              <div>
                <p className="text-sm font-bold text-gray-800">{b.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
