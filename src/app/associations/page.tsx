'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import StatusBadge from '@/components/ui/StatusBadge';
import ContactButton from '@/components/ui/ContactButton';
import {
  Search, Plus, X, Loader2, AlertCircle, Camera, MapPin, Clock,
  Phone, Mail, Globe, MessageSquare, CheckCircle2, Shield, Users,
  Pencil, Trash2, Share2, ChevronDown, ChevronUp, Heart, Star,
  Send, Calendar, Tag, Info, Handshake, Flag, BookOpen,
  Music, Leaf, Dumbbell, Baby, Dog, ParkingSquare, Accessibility,
  Building2, ArrowRight, Eye, Bookmark, BookmarkCheck, Zap,
  TrendingUp, Gift, Package, UserCheck, Sparkles, Filter,
  ChevronRight, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SectorFilter, { SectorBadge } from '@/components/ui/SectorFilter';
import { cn } from '@/lib/utils';
import { SECTORS } from '@/lib/sectors';

// ─── Types ────────────────────────────────────────────────────────────────────
type AssoCategory =
  | 'sport' | 'culture' | 'solidarite' | 'jeunesse' | 'environnement'
  | 'loisirs' | 'animaux' | 'patrimoine' | 'sante' | 'education'
  | 'seniors' | 'autre';

type PubType =
  | 'vitrine' | 'benevoles' | 'activite' | 'adherents'
  | 'materiel' | 'evenement' | 'dons' | 'partenaires';

type AssoStatus = 'active' | 'inactive' | 'draft';

type Association = {
  id: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  pub_type: PubType;
  status: AssoStatus;
  name: string;
  slogan: string | null;
  category: AssoCategory;
  description_short: string;
  description_full: string | null;
  location: string;
  address: string | null;
  schedule: string | null;
  public_target: string[];
  age_min: number | null;
  age_max: number | null;
  membership_required: boolean;
  price_type: string;
  price_detail: string | null;
  capacity: number | null;
  activities: string[];
  frequency: string | null;
  tags: string[];
  needs: string[];
  need_detail: string | null;
  contact_name: string;
  contact_role: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_website: string | null;
  contact_facebook: string | null;
  contact_instagram: string | null;
  contact_mode: string;
  show_phone: boolean;
  declared: boolean;
  rna_number: string | null;
  pmr_accessible: boolean;
  families_welcome: boolean;
  animals_ok: boolean;
  indoor: boolean | null;
  parking_nearby: boolean;
  material_provided: boolean;
  registration_required: boolean;
  places_limited: boolean;
  urgent_need: boolean;
  sector_id?: string | null;
  is_accepting_members?: boolean;
  is_accepting_volunteers?: boolean;
  is_accepting_donations?: boolean;
  is_accepting_partners?: boolean;
  last_activity_at?: string | null;
  photos?: { url: string; display_order: number }[];
  created_at: string;
  updated_at: string;
};

type AssoComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

// ─── Configs ──────────────────────────────────────────────────────────────────
const CAT_CONFIG: Record<AssoCategory, { label: string; icon: React.ElementType; color: string; bg: string; emoji: string }> = {
  sport:        { label: 'Sport',         icon: Dumbbell,   color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200',   emoji: '⚽' },
  culture:      { label: 'Culture',       icon: Music,      color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200',   emoji: '🎭' },
  solidarite:   { label: 'Solidarité',    icon: Handshake,  color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',       emoji: '🤝' },
  jeunesse:     { label: 'Jeunesse',      icon: Baby,       color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200',         emoji: '🧒' },
  environnement:{ label: 'Environnement', icon: Leaf,       color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', emoji: '🌿' },
  loisirs:      { label: 'Loisirs',       icon: Star,       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     emoji: '🎯' },
  animaux:      { label: 'Animaux',       icon: Dog,        color: 'text-lime-600',    bg: 'bg-lime-50 border-lime-200',       emoji: '🐾' },
  patrimoine:   { label: 'Patrimoine',    icon: Flag,       color: 'text-stone-600',   bg: 'bg-stone-50 border-stone-200',     emoji: '🏛️' },
  sante:        { label: 'Santé',         icon: Heart,      color: 'text-red-600',     bg: 'bg-red-50 border-red-200',         emoji: '❤️' },
  education:    { label: 'Éducation',     icon: BookOpen,   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',       emoji: '📚' },
  seniors:      { label: 'Seniors',       icon: Users,      color: 'text-teal-600',    bg: 'bg-teal-50 border-teal-200',       emoji: '🧓' },
  autre:        { label: 'Autre',         icon: Building2,  color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200',       emoji: '🏢' },
};

const PUB_TYPE_CONFIG: Record<PubType, { label: string; emoji: string; color: string; icon: React.ElementType }> = {
  vitrine:     { label: 'Présentation',       emoji: '🏛️', color: 'bg-blue-100 text-blue-700',       icon: Building2 },
  benevoles:   { label: 'Cherche bénévoles',  emoji: '🙋', color: 'bg-rose-100 text-rose-700',        icon: UserCheck },
  activite:    { label: 'Activité',           emoji: '🎯', color: 'bg-amber-100 text-amber-700',      icon: Zap },
  adherents:   { label: 'Cherche adhérents',  emoji: '👥', color: 'bg-purple-100 text-purple-700',    icon: Users },
  materiel:    { label: 'Cherche matériel',   emoji: '📦', color: 'bg-teal-100 text-teal-700',        icon: Package },
  evenement:   { label: 'Événement',          emoji: '🎉', color: 'bg-pink-100 text-pink-700',        icon: Calendar },
  dons:        { label: 'Appel aux dons',     emoji: '💝', color: 'bg-red-100 text-red-700',          icon: Gift },
  partenaires: { label: 'Cherche partenaires',emoji: '🤝', color: 'bg-emerald-100 text-emerald-700',  icon: Handshake },
};

const NEEDS_OPTIONS = [
  'Bénévoles', 'Nouveaux adhérents', 'Participants', 'Matériel',
  'Sponsors', 'Dons', 'Local', 'Transport', 'Encadrants',
  'Compétences spécifiques', 'Communication / visibilité',
];

const PUBLIC_OPTIONS = ['Enfants', 'Ados', 'Adultes', 'Seniors', 'Tout public', 'Familles'];

const ACTIVITY_OPTIONS = [
  'Cours', 'Sorties', 'Entraînements', 'Ateliers', 'Événements',
  'Aide sociale', 'Accompagnement', 'Permanences', 'Actions terrain',
];

const TAG_OPTIONS = [
  'bénévolat', 'sport', 'enfants', 'nature', 'musique', 'entraide',
  'quartier', 'patrimoine', 'seniors', 'culture', 'solidarité', 'loisirs',
];

// ─── Composant NeedPicto ──────────────────────────────────────────────────────
function NeedPicto({ needs, isAcceptingMembers, isAcceptingVolunteers, isAcceptingDonations, isAcceptingPartners, urgent }:
  { needs: string[]; isAcceptingMembers?: boolean; isAcceptingVolunteers?: boolean; isAcceptingDonations?: boolean; isAcceptingPartners?: boolean; urgent?: boolean }) {
  const pictos = [];
  if (isAcceptingMembers || needs.includes('Nouveaux adhérents'))
    pictos.push({ icon: '👥', label: 'Adhérents', color: 'bg-purple-50 text-purple-700 border-purple-200' });
  if (isAcceptingVolunteers || needs.includes('Bénévoles'))
    pictos.push({ icon: '🙋', label: 'Bénévoles', color: 'bg-rose-50 text-rose-700 border-rose-200' });
  if (needs.includes('Matériel'))
    pictos.push({ icon: '📦', label: 'Matériel', color: 'bg-teal-50 text-teal-700 border-teal-200' });
  if (isAcceptingPartners || needs.includes('Sponsors'))
    pictos.push({ icon: '🤝', label: 'Partenaires', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
  if (isAcceptingDonations || needs.includes('Dons'))
    pictos.push({ icon: '💝', label: 'Dons', color: 'bg-red-50 text-red-700 border-red-200' });
  if (!pictos.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {urgent && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">🚨 Urgent</span>}
      {pictos.map(p => (
        <span key={p.label} className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border', p.color)}>
          {p.icon} {p.label}
        </span>
      ))}
    </div>
  );
}

// ─── AssociationCard ──────────────────────────────────────────────────────────
function AssociationCard({
  asso, userId, isAuthor, onEdit, onDelete, saved, onToggleSave,
}: {
  asso: Association;
  userId?: string;
  isAuthor: boolean;
  onEdit: (a: Association) => void;
  onDelete: (id: string) => void;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [expanded, setExpanded] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [comments, setComments] = useState<AssoComment[]>([]);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const cat = CAT_CONFIG[asso.category];
  const CatIcon = cat.icon;
  const pubConf = PUB_TYPE_CONFIG[asso.pub_type];
  const coverPhoto = asso.photos?.[0]?.url;
  const allPhotos = toPhotoItems(asso.photos ?? []);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Indicateur activité récente
  const lastAct = asso.last_activity_at ?? asso.updated_at;
  const daysSince = Math.floor((Date.now() - new Date(lastAct).getTime()) / 86400000);
  const actLabel = daysSince <= 7 ? '🟢 Active récemment' : daysSince <= 30 ? '🟡 Active ce mois' : '🔵 À suivre';

  useEffect(() => {
    supabase.from('asso_comments').select('id', { count: 'exact', head: true })
      .eq('asso_id', asso.id)
      .then(({ count }) => setChatCount(count ?? 0));
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asso.id]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('asso_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('asso_id', asso.id).order('created_at', { ascending: true }).limit(50);
    setComments((data ?? []) as AssoComment[]);
    setChatCount((data ?? []).length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asso.id]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('asso_comments').insert({ asso_id: asso.id, author_id: userId, content: chatText.trim() });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/associations/${asso.id}`;
  const shareText = encodeURIComponent(`${asso.name} — ${asso.description_short}\n${shareUrl}`);

  return (
    <div id={asso.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">

      {/* Cover photo ou header coloré */}
      <div className="relative h-44 overflow-hidden">
        {coverPhoto ? (
          <div className="w-full h-full cursor-pointer" onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhoto} alt={asso.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
                📷 +{allPhotos.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center', cat.bg)}>
            <CatIcon className={cn('w-16 h-16 opacity-15', cat.color)} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={cn('text-xs font-black px-2.5 py-1 rounded-full shadow', pubConf.color)}>{pubConf.emoji} {pubConf.label}</span>
          {asso.urgent_need && <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-500 text-white shadow animate-pulse">🚨 Urgent</span>}
          <StatusBadge status={asso.status || 'active'} contentType="association" size="xs" showIcon showDot={asso.status === 'active'} className="shadow" />
        </div>

        {/* Bouton favori + auteur haut droite */}
        <div className="absolute top-3 right-3 flex gap-1">
          <button type="button" onClick={() => onToggleSave(asso.id)}
            className={cn('p-1.5 rounded-lg backdrop-blur-sm shadow transition-all',
              saved ? 'bg-yellow-400/90 text-white' : 'bg-white/80 text-gray-500 hover:text-yellow-500')}>
            {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
          {isAuthor && (
            <>
              <button type="button" onClick={() => onEdit(asso)} className="p-1.5 bg-white/80 text-gray-600 hover:text-blue-600 rounded-lg transition-all backdrop-blur-sm shadow"><Pencil className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onDelete(asso.id)} className="p-1.5 bg-white/80 text-gray-600 hover:text-red-600 rounded-lg transition-all backdrop-blur-sm shadow"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>

        {/* Nom + slogan en bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-black text-base leading-tight drop-shadow">{asso.name}</p>
          {asso.slogan && <p className="text-white/80 text-xs mt-0.5 line-clamp-1">{asso.slogan}</p>}
        </div>
      </div>

      <div className="p-5">
        {/* Badges catégorie + secteur + activité */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border', cat.bg, cat.color)}>
            <CatIcon className="w-3 h-3" />{cat.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            <MapPin className="w-3 h-3 text-gray-400" />{asso.location}
          </span>
          {asso.sector_id && <SectorBadge sectorId={asso.sector_id} size="xs" />}
          {asso.declared && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />Déclarée
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">{actLabel}</span>
        </div>

        {/* Description courte */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{asso.description_short}</p>

        {/* Pictos besoins actifs — CDC §6.2 */}
        <div className="mb-3">
          <NeedPicto
            needs={asso.needs}
            isAcceptingMembers={asso.is_accepting_members}
            isAcceptingVolunteers={asso.is_accepting_volunteers}
            isAcceptingDonations={asso.is_accepting_donations}
            isAcceptingPartners={asso.is_accepting_partners}
            urgent={asso.urgent_need}
          />
        </div>

        {/* Publics concernés */}
        {asso.public_target.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {asso.public_target.map(p => (
              <span key={p} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                {p === 'Enfants' ? '🧒' : p === 'Seniors' ? '🧓' : p === 'Familles' ? '👨‍👩‍👧' : p === 'Ados' ? '🧑' : '👤'} {p}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {asso.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {asso.tags.map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"># {t}</span>
            ))}
          </div>
        )}

        {/* Infos pratiques rapides */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 text-xs text-gray-500">
          {asso.schedule && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" />{asso.schedule}</span>
          )}
          {asso.price_type && (
            <span className="flex items-center gap-1">
              💶 {asso.price_type === 'gratuit' ? 'Gratuit' : asso.price_type === 'cotisation' ? `Cotisation${asso.price_detail ? ` · ${asso.price_detail}` : ''}` : asso.price_detail || 'Voir conditions'}
            </span>
          )}
          {asso.contact_email && (
            <span className="flex items-center gap-1 col-span-2 truncate"><Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />{asso.contact_email}</span>
          )}
        </div>

        {/* Badges accessibilité */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {asso.pmr_accessible && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200"><Accessibility className="w-3 h-3 inline mr-1" />PMR</span>}
          {asso.families_welcome && <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200"><Baby className="w-3 h-3 inline mr-1" />Familles</span>}
          {asso.animals_ok && <span className="text-xs px-2 py-0.5 rounded-full bg-lime-50 text-lime-600 border border-lime-200"><Dog className="w-3 h-3 inline mr-1" />Animaux</span>}
          {asso.parking_nearby && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200"><ParkingSquare className="w-3 h-3 inline mr-1" />Parking</span>}
        </div>

        {/* Bouton détails */}
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="text-xs text-violet-600 hover:text-violet-800 font-semibold flex items-center gap-1 mb-3 transition-colors">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Réduire</> : <><ChevronDown className="w-3.5 h-3.5" />Voir la présentation complète</>}
        </button>

        {expanded && (
          <div className="space-y-4 mb-4">
            {asso.description_full && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Présentation</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{asso.description_full}</p>
              </div>
            )}
            {asso.activities.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Activités proposées</p>
                <div className="flex flex-wrap gap-1.5">
                  {asso.activities.map(a => <span key={a} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>)}
                </div>
                {asso.frequency && <p className="text-xs text-gray-500 mt-1.5">⏱ {asso.frequency}</p>}
              </div>
            )}
            {asso.need_detail && (
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Ce que nous recherchons</p>
                <p className="text-sm text-gray-700">{asso.need_detail}</p>
              </div>
            )}
            {/* Contact complet */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact</p>
              <p className="text-sm font-semibold text-gray-800">{asso.contact_name}{asso.contact_role ? ` · ${asso.contact_role}` : ''}</p>
              {asso.show_phone && asso.contact_phone && (
                <a href={`tel:${asso.contact_phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600"><Phone className="w-3 h-3" />{asso.contact_phone}</a>
              )}
              {asso.contact_email && (
                <a href={`mailto:${asso.contact_email}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600"><Mail className="w-3 h-3" />{asso.contact_email}</a>
              )}
              {asso.contact_website && (
                <a href={asso.contact_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><Globe className="w-3 h-3" />{asso.contact_website}</a>
              )}
              <div className="flex gap-2 pt-1">
                {asso.contact_facebook && <a href={asso.contact_facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-semibold">Facebook →</a>}
                {asso.contact_instagram && <a href={asso.contact_instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 hover:underline font-semibold">Instagram →</a>}
              </div>
            </div>
            {asso.rna_number && <p className="text-xs text-gray-400">N° RNA : {asso.rna_number}</p>}

            {/* Événements liés — lien vers agenda filtré */}
            <Link href={`/evenements?q=${encodeURIComponent(asso.name)}`}
              className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 hover:bg-purple-100 transition-colors group/ev">
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-700">Voir les événements de cette association</p>
                <p className="text-xs text-purple-500">Agenda · Biguglia Connect</p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400 ml-auto group-hover/ev:translate-x-0.5 transition-transform" />
            </Link>

            {/* Lien forum */}
            <Link href={`/forum?q=${encodeURIComponent(asso.name)}`}
              className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 hover:bg-violet-100 transition-colors group/fr">
              <MessageSquare className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-violet-700">Discussions liées sur le forum</p>
                <p className="text-xs text-violet-500">Forum · Biguglia Connect</p>
              </div>
              <ChevronRight className="w-4 h-4 text-violet-400 ml-auto group-hover/fr:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* Galerie photos miniatures */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {allPhotos.slice(1).map((p, i) => (
              <button key={i} onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }}
                className="flex-shrink-0 focus:outline-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-100 hover:border-violet-300 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* ── ACTIONS PRINCIPALES CDC §5.2 & §9 ── */}
        <div className="space-y-2">
          {/* Ligne 1 : CTA principal + Action secondaire */}
          <div className="flex gap-2 flex-wrap">
            {!isAuthor && (
              <ContactButton
                sourceType="association"
                sourceId={asso.id}
                sourceTitle={asso.name}
                ownerId={asso.author_id}
                userId={userId}
                size="sm"
                ctaLabel={
                  asso.pub_type === 'benevoles' ? '🙋 Devenir bénévole' :
                  asso.pub_type === 'dons' ? '💝 Faire un don' :
                  asso.pub_type === 'adherents' ? '👥 Adhérer' :
                  asso.pub_type === 'partenaires' ? '🤝 Devenir partenaire' :
                  asso.pub_type === 'materiel' ? '📦 Proposer du matériel' :
                  '✉️ Contacter'
                }
              />
            )}
            {/* Rejoindre si accepte membres */}
            {!isAuthor && (asso.is_accepting_members || asso.needs.includes('Nouveaux adhérents')) && (
              <ContactButton
                sourceType="association"
                sourceId={asso.id}
                sourceTitle={asso.name}
                ownerId={asso.author_id}
                userId={userId}
                size="sm"
                ctaLabel="👥 Rejoindre"
              />
            )}
            {/* Bénévole si accepte volontaires */}
            {!isAuthor && (asso.is_accepting_volunteers || asso.needs.includes('Bénévoles')) && asso.pub_type !== 'benevoles' && (
              <ContactButton
                sourceType="association"
                sourceId={asso.id}
                sourceTitle={asso.name}
                ownerId={asso.author_id}
                userId={userId}
                size="sm"
                ctaLabel="🙋 Je veux aider"
              />
            )}
          </div>

          {/* Ligne 2 : Discussion + Partager + Signaler */}
          <div className="flex gap-2 flex-wrap">
            {/* Discussion */}
            <button type="button" onClick={handleOpenChat}
              className={cn('inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border',
                openChat ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100')}>
              <MessageSquare className="w-4 h-4" />Forum
              {chatCount > 0 && <span className="bg-violet-100 text-violet-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>}
            </button>

            {/* Voir les événements (raccourci) */}
            <Link href={`/evenements?q=${encodeURIComponent(asso.name)}`}
              className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border bg-gray-50 text-gray-500 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200">
              <Calendar className="w-4 h-4" />Événements
            </Link>

            {/* Partager */}
            <div ref={shareRef} className="relative">
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenShare(v => !v); }}
                className={cn('inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm border transition-all',
                  openShare ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100')}>
                <Share2 className="w-4 h-4" />
              </button>
              {openShare && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[150px]">
                  <button type="button" onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    💬 Par SMS
                  </button>
                  <div className="border-t border-gray-100" />
                  <button type="button" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(asso.name)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    📧 Par Email
                  </button>
                  <div className="border-t border-gray-100" />
                  <button type="button" onClick={() => { if (navigator.clipboard) { navigator.clipboard.writeText(shareUrl); toast.success('Lien copié !'); } setOpenShare(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    🔗 Copier le lien
                  </button>
                </div>
              )}
            </div>

            {/* Signaler */}
            {!isAuthor && (
              <ReportButton targetType="association" targetId={asso.id} targetTitle={asso.name} variant="icon" />
            )}
          </div>
        </div>

        {/* Mini-forum */}
        {openChat && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">💬 Forum de l&apos;association</p>
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — soyez le premier !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
                      {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5">
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
                  className="flex-1 text-xs rounded-lg border border-violet-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button type="button" onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-violet-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            {asso.author?.full_name ?? 'Membre'} · {formatRelative(asso.created_at)}
          </p>
          <Link href={`/associations/${asso.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline transition-colors flex-shrink-0">
            Fiche complète <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-50">
          <RatingWidget
            targetType="association"
            targetId={asso.id}
            authorId={asso.author_id}
            userId={userId}
            compact={!expanded}
            showPoll={expanded}
          />
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={asso.name} />
      )}
    </div>
  );
}

// ─── EMPTY FORM ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  pub_type: 'vitrine' as PubType,
  name: '',
  slogan: '',
  category: 'autre' as AssoCategory,
  description_short: '',
  description_full: '',
  location: 'Biguglia',
  address: '',
  schedule: '',
  public_target: [] as string[],
  age_min: '',
  age_max: '',
  membership_required: false,
  price_type: 'gratuit',
  price_detail: '',
  capacity: '',
  activities: [] as string[],
  frequency: '',
  tags: [] as string[],
  needs: [] as string[],
  need_detail: '',
  contact_name: '',
  contact_role: '',
  contact_phone: '',
  contact_email: '',
  contact_website: '',
  contact_facebook: '',
  contact_instagram: '',
  contact_mode: 'messagerie',
  show_phone: false,
  declared: false,
  rna_number: '',
  pmr_accessible: false,
  families_welcome: false,
  animals_ok: false,
  indoor: null as boolean | null,
  parking_nearby: false,
  material_provided: false,
  registration_required: false,
  places_limited: false,
  urgent_need: false,
  sector_id: '',
  is_accepting_members: false,
  is_accepting_volunteers: false,
  is_accepting_donations: false,
  is_accepting_partners: false,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AssociationsPage() {
  const { profile } = useAuthStore();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [assos, setAssos] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<AssoCategory | 'all'>('all');
  const [filterType, setFilterType] = useState<PubType | 'all'>('all');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [filterNeed, setFilterNeed] = useState<string>('');
  const [filterPublic, setFilterPublic] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAsso, setEditingAsso] = useState<Association | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dbReady, setDbReady] = useState(true);
  const [step, setStep] = useState(1);
  const photoRef = useRef<HTMLInputElement>(null);
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  // Favoris localStorage
  const [savedAssos, setSavedAssos] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Charger favoris au montage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('biguglia_saved_assos');
      if (raw) setSavedAssos(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  const toggleSaved = (id: string) => {
    setSavedAssos(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast('Association retirée des favoris'); }
      else { next.add(id); toast.success('⭐ Ajoutée aux favoris !'); }
      try { localStorage.setItem('biguglia_saved_assos', JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAssos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('associations')
      .select('*, author:profiles!associations_author_id_fkey(full_name, avatar_url), photos:asso_photos(url, display_order)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(60);

    if (filterCat !== 'all') query = query.eq('category', filterCat);
    if (filterType !== 'all') query = query.eq('pub_type', filterType);
    if (filterSector) {
      try { query = query.eq('sector_id', filterSector); } catch { /* optionnel */ }
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation')) setDbReady(false);
      setLoading(false);
      return;
    }
    setDbReady(true);

    let enriched = (data || []).map((a: Association & { photos?: { url: string; display_order: number }[] }) => ({
      ...a,
      photos: (a.photos || []).sort((x, y) => (x.display_order ?? 0) - (y.display_order ?? 0)),
    }));

    // Recherche plein texte enrichie (CDC §7.1 — nom, desc, activités, publics, besoins, tags, secteur)
    if (search.trim()) {
      const q = search.toLowerCase();
      enriched = enriched.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description_short.toLowerCase().includes(q) ||
        (a.description_full ?? '').toLowerCase().includes(q) ||
        a.tags.some((t: string) => t.toLowerCase().includes(q)) ||
        a.needs.some((n: string) => n.toLowerCase().includes(q)) ||
        a.activities.some((ac: string) => ac.toLowerCase().includes(q)) ||
        a.public_target.some((p: string) => p.toLowerCase().includes(q)) ||
        (a.contact_name ?? '').toLowerCase().includes(q)
      );
    }

    // Filtre besoin actif
    if (filterNeed) {
      enriched = enriched.filter(a =>
        a.needs.some((n: string) => n.toLowerCase().includes(filterNeed.toLowerCase())) ||
        (filterNeed === 'benevoles' && (a.is_accepting_volunteers || a.pub_type === 'benevoles')) ||
        (filterNeed === 'dons' && (a.is_accepting_donations || a.pub_type === 'dons')) ||
        (filterNeed === 'adherents' && (a.is_accepting_members || a.pub_type === 'adherents')) ||
        (filterNeed === 'partenaires' && (a.is_accepting_partners || a.pub_type === 'partenaires'))
      );
    }

    // Filtre public
    if (filterPublic) {
      enriched = enriched.filter(a => a.public_target.some((p: string) => p === filterPublic));
    }

    setAssos(enriched as Association[]);
    setLoading(false);
  }, [filterCat, filterType, filterSector, search, filterNeed, filterPublic]);

  useEffect(() => { fetchAssos(); }, [fetchAssos]);

  // ── Photo helpers ─────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 6 - photos.length);
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

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggle = (key: 'public_target' | 'activities' | 'tags' | 'needs', val: string) => {
    setForm(f => ({
      ...f,
      [key]: (f[key] as string[]).includes(val)
        ? (f[key] as string[]).filter(x => x !== val)
        : [...(f[key] as string[]), val],
    }));
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotos([]); setPreviews([]);
    setEditingAsso(null); setShowForm(false); setStep(1);
  };

  const startEdit = (a: Association) => {
    setEditingAsso(a);
    setForm({
      pub_type: a.pub_type, name: a.name, slogan: a.slogan ?? '',
      category: a.category, description_short: a.description_short,
      description_full: a.description_full ?? '', location: a.location,
      address: a.address ?? '', schedule: a.schedule ?? '',
      public_target: a.public_target, age_min: a.age_min?.toString() ?? '',
      age_max: a.age_max?.toString() ?? '', membership_required: a.membership_required,
      price_type: a.price_type, price_detail: a.price_detail ?? '',
      capacity: a.capacity?.toString() ?? '', activities: a.activities,
      frequency: a.frequency ?? '', tags: a.tags, needs: a.needs,
      need_detail: a.need_detail ?? '', contact_name: a.contact_name,
      contact_role: a.contact_role ?? '', contact_phone: a.contact_phone ?? '',
      contact_email: a.contact_email ?? '', contact_website: a.contact_website ?? '',
      contact_facebook: a.contact_facebook ?? '', contact_instagram: a.contact_instagram ?? '',
      contact_mode: a.contact_mode, show_phone: a.show_phone,
      declared: a.declared, rna_number: a.rna_number ?? '',
      pmr_accessible: a.pmr_accessible, families_welcome: a.families_welcome,
      animals_ok: a.animals_ok, indoor: a.indoor, parking_nearby: a.parking_nearby,
      material_provided: a.material_provided, registration_required: a.registration_required,
      places_limited: a.places_limited, urgent_need: a.urgent_need,
      sector_id: a.sector_id ?? '',
      is_accepting_members: a.is_accepting_members ?? false,
      is_accepting_volunteers: a.is_accepting_volunteers ?? false,
      is_accepting_donations: a.is_accepting_donations ?? false,
      is_accepting_partners: a.is_accepting_partners ?? false,
    });
    setPhotos([]); setPreviews([]);
    setShowForm(true); setStep(1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (asDraft = false) => {
    if (!profile) return;
    if (!form.name.trim() || !form.description_short.trim()) {
      toast.error('Nom et description courte obligatoires'); return;
    }
    setSubmitting(true);
    const payload = {
      author_id: profile.id,
      pub_type: form.pub_type,
      status: asDraft ? 'draft' : 'active',
      name: form.name.trim(),
      slogan: form.slogan.trim() || null,
      category: form.category,
      description_short: form.description_short.trim(),
      description_full: form.description_full.trim() || null,
      location: form.location || 'Biguglia',
      address: form.address.trim() || null,
      schedule: form.schedule.trim() || null,
      public_target: form.public_target,
      age_min: form.age_min ? parseInt(form.age_min) : null,
      age_max: form.age_max ? parseInt(form.age_max) : null,
      membership_required: form.membership_required,
      price_type: form.price_type,
      price_detail: form.price_detail.trim() || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      activities: form.activities,
      frequency: form.frequency.trim() || null,
      tags: form.tags,
      needs: form.needs,
      need_detail: form.need_detail.trim() || null,
      contact_name: form.contact_name.trim() || profile.full_name || 'Contact',
      contact_role: form.contact_role.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_website: form.contact_website.trim() || null,
      contact_facebook: form.contact_facebook.trim() || null,
      contact_instagram: form.contact_instagram.trim() || null,
      contact_mode: form.contact_mode,
      show_phone: form.show_phone,
      declared: form.declared,
      rna_number: form.rna_number.trim() || null,
      pmr_accessible: form.pmr_accessible,
      families_welcome: form.families_welcome,
      animals_ok: form.animals_ok,
      indoor: form.indoor,
      parking_nearby: form.parking_nearby,
      material_provided: form.material_provided,
      registration_required: form.registration_required,
      places_limited: form.places_limited,
      urgent_need: form.urgent_need,
      sector_id: form.sector_id || null,
      is_accepting_members: form.is_accepting_members,
      is_accepting_volunteers: form.is_accepting_volunteers,
      is_accepting_donations: form.is_accepting_donations,
      is_accepting_partners: form.is_accepting_partners,
    };

    let assoId: string | null = null;
    if (editingAsso) {
      const { error } = await supabase.from('associations').update(payload).eq('id', editingAsso.id);
      if (error) { toast.error('Erreur modification'); console.error(error); setSubmitting(false); return; }
      assoId = editingAsso.id;
      toast.success('Association modifiée ✓');
    } else {
      const { data: ins, error } = await supabase.from('associations').insert(payload).select('id').single();
      if (error) { toast.error('Erreur publication'); console.error(error); setSubmitting(false); return; }
      assoId = ins?.id ?? null;
      toast.success(asDraft ? '💾 Brouillon enregistré' : '🏛️ Association publiée !', { duration: 4000 });
    }

    if (photos.length > 0 && assoId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `associations/${assoId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { console.error('[storage] asso photo upload error:', upErr.message); toast.error(`Photo ${i+1} non sauvegardée`); continue; }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          const { error: dbErr } = await supabase.from('asso_photos').insert({ asso_id: assoId, url: u.publicUrl, display_order: i });
          if (dbErr) console.error('[asso_photos] insert error:', dbErr.message);
        }
      }
    }

    resetForm();
    fetchAssos();
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette fiche association ?')) return;
    await supabase.from('associations').delete().eq('id', id);
    toast.success('Fiche supprimée');
    fetchAssos();
  };

  // ── Filtres appliqués ─────────────────────────────────────────────────────
  const displayedAssos = showSavedOnly ? assos.filter(a => savedAssos.has(a.id)) : assos;

  // KPIs pour le hero
  const urgentCount = assos.filter(a => a.urgent_need).length;
  const needsCount = assos.filter(a => a.needs.length > 0).length;
  const sectorCounts = SECTORS.map(s => ({
    ...s,
    count: assos.filter(a => a.sector_id === s.id || a.sector_id === s.slug).length,
  }));

  const activeFiltersCount = [filterCat !== 'all', filterType !== 'all', !!filterSector, !!filterNeed, !!filterPublic, !!search.trim(), showSavedOnly].filter(Boolean).length;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalActive = assos.length;
  const volunteerCount = assos.filter(a => a.needs.includes('Bénévoles') || a.is_accepting_volunteers).length;
  const eventsAssosCount = assos.filter(a => a.pub_type === 'evenement').length;

  // ── Form render ───────────────────────────────────────────────────────────
  const STEPS = ['Type', 'Identité', 'Activités', 'Besoins & CDC', 'Photos', 'Contact & Options'];
  const catConf = CAT_CONFIG[form.category];

  const renderForm = () => (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900">{editingAsso ? '✏️ Modifier la fiche' : '🏛️ Référencer une association'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Faites connaître votre association à toute la communauté de Biguglia</p>
        </div>
        <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      {/* Steps */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button key={i} type="button" onClick={() => setStep(i + 1)}
            className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
              step === i + 1 ? 'bg-violet-500 text-white' :
              step > i + 1 ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400')}>
            {step > i + 1 ? '✓ ' : `${i + 1}. `}{s}
          </button>
        ))}
      </div>

      {/* ── STEP 1 : Type de publication ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Quel est l&apos;objet de cette fiche ?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(PUB_TYPE_CONFIG) as [PubType, typeof PUB_TYPE_CONFIG[PubType]][]).map(([key, conf]) => {
              const PubIcon = conf.icon;
              return (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, pub_type: key }))}
                  className={cn('flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all text-center',
                    form.pub_type === key ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}>
                  <span className="text-2xl">{conf.emoji}</span>
                  <PubIcon className="w-4 h-4 opacity-60" />
                  <span>{conf.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2 : Identité ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 2 — Identité de l&apos;association</p>
          <input type="text" placeholder="Nom de l'association *" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <input type="text" placeholder='Slogan / phrase courte (ex: "Faire vivre le sport pour tous à Biguglia")'
            value={form.slogan} onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          {/* Catégorie */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.entries(CAT_CONFIG) as [AssoCategory, typeof CAT_CONFIG[AssoCategory]][]).map(([key, conf]) => {
                const Icon = conf.icon;
                return (
                  <button key={key} type="button" onClick={() => setForm(f => ({ ...f, category: key }))}
                    className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all',
                      form.category === key ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300')}>
                    <span className="text-lg">{conf.emoji}</span>
                    <Icon className={cn('w-4 h-4', form.category === key ? 'text-violet-600' : conf.color)} />
                    <span className="text-center leading-tight">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <textarea placeholder="Description courte * (1-2 phrases visibles immédiatement)" rows={2} required
            value={form.description_short} onChange={e => setForm(f => ({ ...f, description_short: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <textarea placeholder="Présentation complète — histoire, mission, actions, public, valeurs…" rows={5}
            value={form.description_full} onChange={e => setForm(f => ({ ...f, description_full: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Commune / zone</label>
              <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                {['Biguglia', 'Biguglia et alentours', 'Toute la région'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Adresse / lieu principal"
              value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 mt-5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Secteur principal <span className="font-normal text-gray-400">(recommandé)</span></label>
            <SectorFilter value={form.sector_id || null} onChange={id => setForm(f => ({ ...f, sector_id: id || '' }))} allowCitywide compact />
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3 : Activités & Public ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 3 — Ce que vous proposez</p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Public concerné</label>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_OPTIONS.map(p => (
                <button key={p} type="button" onClick={() => toggle('public_target', p)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.public_target.includes(p) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Âge minimum</label>
              <input type="number" placeholder="ex: 6" min={0} max={120} value={form.age_min}
                onChange={e => setForm(f => ({ ...f, age_min: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Âge maximum</label>
              <input type="number" placeholder="ex: 18" min={0} max={120} value={form.age_max}
                onChange={e => setForm(f => ({ ...f, age_max: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Activités proposées</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => toggle('activities', a)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.activities.includes(a) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fréquence</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                <option value="">—</option>
                {['Chaque semaine', 'Chaque mois', 'Ponctuel', 'Selon calendrier'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Jours et horaires (ex: Lundi 18h-20h)"
              value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 mt-5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adhésion / tarif</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[['gratuit','Gratuit'],['cotisation','Cotisation annuelle'],['libre','Participation libre'],['autre','Autre']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setForm(f => ({ ...f, price_type: v }))}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.price_type === v ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {l}
                </button>
              ))}
            </div>
            {form.price_type !== 'gratuit' && (
              <input type="text" placeholder="Précisez (ex: 30€/an, 5€/séance…)"
                value={form.price_detail} onChange={e => setForm(f => ({ ...f, price_detail: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(t => (
                <button key={t} type="button" onClick={() => toggle('tags', t)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.tags.includes(t) ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  # {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(4)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4 : Besoins & CDC ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 4 — Besoins actuels & engagements (CDC §7.2-7.3)</p>

          {/* Besoins structurés */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">L&apos;association recherche actuellement :</label>
            <div className="flex flex-wrap gap-2">
              {NEEDS_OPTIONS.map(n => (
                <button key={n} type="button" onClick={() => toggle('needs', n)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    form.needs.includes(n) ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <textarea placeholder="Détail du besoin (ex: Nous cherchons 4 bénévoles pour notre tournoi le 15 juin…)" rows={3}
            value={form.need_detail} onChange={e => setForm(f => ({ ...f, need_detail: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />

          {/* Drapeaux CDC — CDC §10 */}
          <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
            <p className="text-xs font-bold text-violet-700 mb-3">Acceptations (visible sur la fiche)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'is_accepting_members',    label: '👥 Accepte de nouveaux adhérents', color: 'text-purple-700' },
                { key: 'is_accepting_volunteers', label: '🙋 Accepte des bénévoles',          color: 'text-rose-700' },
                { key: 'is_accepting_donations',  label: '💝 Accepte les dons',               color: 'text-red-700' },
                { key: 'is_accepting_partners',   label: '🤝 Cherche des partenaires',        color: 'text-emerald-700' },
              ].map(({ key, label, color }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded accent-violet-600" />
                  <span className={cn('text-xs font-semibold', color)}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.urgent_need} onChange={e => setForm(f => ({ ...f, urgent_need: e.target.checked }))} className="rounded" />
            <span className="text-sm font-semibold text-red-600">🚨 Besoin urgent</span>
          </label>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(5)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 5 : Photos ── */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Bloc 5 — Photos (logo, couverture, galerie — max 6)</p>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded font-bold">Couverture</span>}
              </div>
            ))}
            {photos.length < 6 && (
              <button type="button" onClick={() => photoRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-violet-300 flex flex-col items-center justify-center text-violet-400 hover:bg-violet-50 transition-all">
                <Camera className="w-6 h-6" /><span className="text-xs mt-1">Photo</span>
              </button>
            )}
          </div>
          <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
          <p className="text-xs text-gray-400">1ère photo = couverture principale · {photos.length}/6</p>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(4)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
            <button type="button" onClick={() => setStep(6)} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm bg-violet-500 hover:bg-violet-600">Suivant →</button>
          </div>
        </div>
      )}

      {/* ── STEP 6 : Contact + Options ── */}
      {step === 6 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Bloc 6 — Contact</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nom du contact *" value={form.contact_name}
                  onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <select value={form.contact_role} onChange={e => setForm(f => ({ ...f, contact_role: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                  <option value="">Fonction…</option>
                  {['Président(e)', 'Secrétaire', 'Trésorier(e)', 'Bénévole', 'Responsable activité'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="Téléphone" value={form.contact_phone}
                  onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <input type="email" placeholder="Email" value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <input type="url" placeholder="Site web (https://…)" value={form.contact_website}
                onChange={e => setForm(f => ({ ...f, contact_website: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <div className="grid grid-cols-2 gap-3">
                <input type="url" placeholder="Facebook (https://…)" value={form.contact_facebook}
                  onChange={e => setForm(f => ({ ...f, contact_facebook: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <input type="url" placeholder="Instagram (https://…)" value={form.contact_instagram}
                  onChange={e => setForm(f => ({ ...f, contact_instagram: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.show_phone} onChange={e => setForm(f => ({ ...f, show_phone: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Afficher le téléphone publiquement</span>
              </label>
            </div>
          </div>

          {/* Options */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Informations complémentaires</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'declared',             label: '🏛️ Association déclarée en préfecture' },
                { key: 'pmr_accessible',        label: '♿ Accessible PMR' },
                { key: 'families_welcome',      label: '👨‍👩‍👧 Accueil familles' },
                { key: 'animals_ok',            label: '🐾 Animaux acceptés' },
                { key: 'parking_nearby',        label: '🅿️ Parking à proximité' },
                { key: 'material_provided',     label: '✅ Matériel fourni' },
                { key: 'registration_required', label: '📝 Inscription obligatoire' },
                { key: 'places_limited',        label: '🔢 Places limitées' },
                { key: 'membership_required',   label: '🎫 Adhésion obligatoire' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[key as keyof typeof form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded" />
                  <span className="text-xs text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {form.declared && (
              <input type="text" placeholder="N° RNA (optionnel)" value={form.rna_number}
                onChange={e => setForm(f => ({ ...f, rna_number: e.target.value }))}
                className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
            {form.places_limited && (
              <input type="number" placeholder="Nombre de places disponibles" min={1} value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            )}
          </div>

          {/* Boutons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => handleSubmit(false)} disabled={submitting}
              className="flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white text-sm bg-violet-500 hover:bg-violet-600 disabled:opacity-50 transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              🏛️ {editingAsso ? 'Enregistrer' : 'Publier la fiche'}
            </button>
            <button type="button" onClick={() => handleSubmit(true)} disabled={submitting}
              className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
              💾 Brouillon
            </button>
            <button type="button" onClick={() => setStep(5)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">

      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Tables manquantes.</span> Exécutez le SQL dans Supabase (
              <Link href="/admin/migration" className="underline">page Admin</Link>).
            </p>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl"><Handshake className="w-5 h-5" /></div>
                <span className="text-violet-200 text-sm font-semibold">Vie locale · Associations</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
                🏛️ Associations de Biguglia
              </h1>
              <p className="text-violet-200 text-base sm:text-lg max-w-xl leading-relaxed">
                Découvrez, rejoignez et soutenez les associations locales. Bénévolat, dons, adhésion, événements — tout en un seul endroit.
              </p>

              {/* KPIs — CDC §6.1 */}
              <div className="flex flex-wrap gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  <Building2 className="w-3.5 h-3.5" /> {totalActive} association{totalActive !== 1 ? 's' : ''}
                </span>
                {needsCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-rose-500/30 border border-rose-400/40 rounded-full px-3 py-1.5 text-sm font-medium">
                    <Zap className="w-3.5 h-3.5" /> {needsCount} ont des besoins ouverts
                  </span>
                )}
                {urgentCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-red-500/30 border border-red-400/40 rounded-full px-3 py-1.5 text-sm font-bold animate-pulse">
                    🚨 {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
                  </span>
                )}
                {volunteerCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <UserCheck className="w-3.5 h-3.5" /> {volunteerCount} cherchent des bénévoles
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <Link href="/communaute/associations"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition backdrop-blur-sm">
                  <Users className="w-4 h-4" /> Communauté →
                </Link>
                <Link href="/evenements"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition backdrop-blur-sm">
                  <Calendar className="w-4 h-4" /> Événements →
                </Link>
                <Link href="/forum"
                  className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition backdrop-blur-sm">
                  <MessageSquare className="w-4 h-4" /> Forum →
                </Link>
              </div>
            </div>

            {profile && (
              <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
                className="inline-flex items-center gap-2 bg-white text-violet-700 font-black px-6 py-3 rounded-2xl hover:bg-violet-50 transition-all shadow-lg text-sm flex-shrink-0">
                <Plus className="w-5 h-5" /> Référencer une association
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENU PRINCIPAL ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {showForm && profile && renderForm()}

        {/* Layout 2 colonnes */}
        <div className="flex gap-8 items-start">

          {/* ── COLONNE PRINCIPALE ── */}
          <div className="flex-1 min-w-0">

            {/* Blocs contextuels rapides — CDC §6.1 */}
            {!loading && assos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {/* Besoins urgents */}
                {urgentCount > 0 && (
                  <button onClick={() => { setFilterNeed('urgent'); }}
                    className="bg-red-50 border border-red-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all group">
                    <p className="text-2xl font-black text-red-600 mb-1">{urgentCount}</p>
                    <p className="text-xs font-bold text-red-700">Besoins urgents</p>
                    <p className="text-xs text-red-400 mt-0.5">Action immédiate</p>
                  </button>
                )}
                {/* Cherchent bénévoles */}
                {volunteerCount > 0 && (
                  <button onClick={() => setFilterNeed('benevoles')}
                    className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all">
                    <p className="text-2xl font-black text-rose-600 mb-1">{volunteerCount}</p>
                    <p className="text-xs font-bold text-rose-700">Cherchent bénévoles</p>
                    <p className="text-xs text-rose-400 mt-0.5">Engagez-vous !</p>
                  </button>
                )}
                {/* Événements */}
                {eventsAssosCount > 0 && (
                  <button onClick={() => setFilterType('evenement')}
                    className="bg-pink-50 border border-pink-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all">
                    <p className="text-2xl font-black text-pink-600 mb-1">{eventsAssosCount}</p>
                    <p className="text-xs font-bold text-pink-700">Événements</p>
                    <p className="text-xs text-pink-400 mt-0.5">À venir</p>
                  </button>
                )}
                {/* Acceptent dons */}
                {assos.filter(a => a.is_accepting_donations || a.pub_type === 'dons').length > 0 && (
                  <button onClick={() => setFilterNeed('dons')}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left hover:shadow-sm transition-all">
                    <p className="text-2xl font-black text-amber-600 mb-1">{assos.filter(a => a.is_accepting_donations || a.pub_type === 'dons').length}</p>
                    <p className="text-xs font-bold text-amber-700">Acceptent les dons</p>
                    <p className="text-xs text-amber-400 mt-0.5">Soutenez-les</p>
                  </button>
                )}
              </div>
            )}

            {/* ── FILTRES ── */}
            <div className="space-y-3 mb-6">
              {/* Barre de recherche enrichie */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Rechercher (nom, activité, besoin, public, tag…)" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button onClick={() => setShowAdvFilters(v => !v)}
                  className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                    showAdvFilters || activeFiltersCount > 0 ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && <span className="w-5 h-5 bg-violet-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{activeFiltersCount}</span>}
                </button>
              </div>

              {/* Filtres actifs pills */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filterCat !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      {CAT_CONFIG[filterCat as AssoCategory]?.emoji} {CAT_CONFIG[filterCat as AssoCategory]?.label ?? filterCat}
                      <button onClick={() => setFilterCat('all')}><X className="w-3 h-3 ml-0.5" /></button>
                    </span>
                  )}
                  {filterSector && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      📍 {SECTORS.find(s => s.slug === filterSector || s.id === filterSector)?.name ?? filterSector}
                      <button onClick={() => setFilterSector(null)}><X className="w-3 h-3 ml-0.5" /></button>
                    </span>
                  )}
                  {filterNeed && (
                    <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      🙋 {filterNeed === 'benevoles' ? 'Bénévoles' : filterNeed === 'dons' ? 'Dons' : filterNeed === 'adherents' ? 'Adhérents' : filterNeed === 'partenaires' ? 'Partenaires' : filterNeed}
                      <button onClick={() => setFilterNeed('')}><X className="w-3 h-3 ml-0.5" /></button>
                    </span>
                  )}
                  {filterPublic && (
                    <span className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      👤 {filterPublic}
                      <button onClick={() => setFilterPublic('')}><X className="w-3 h-3 ml-0.5" /></button>
                    </span>
                  )}
                  {showSavedOnly && (
                    <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      <BookmarkCheck className="w-3 h-3" /> Mes favoris
                      <button onClick={() => setShowSavedOnly(false)}><X className="w-3 h-3 ml-0.5" /></button>
                    </span>
                  )}
                  <button onClick={() => { setFilterCat('all'); setFilterType('all'); setFilterSector(null); setFilterNeed(''); setFilterPublic(''); setSearch(''); setShowSavedOnly(false); }}
                    className="text-xs text-gray-400 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors">
                    <X className="w-3 h-3" /> Tout réinitialiser
                  </button>
                </div>
              )}

              {/* Filtres avancés */}
              {showAdvFilters && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
                  {/* Secteur */}
                  <SectorFilter value={filterSector} onChange={setFilterSector} compact label="Secteur" allowCitywide showAll />

                  {/* Type de publication */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Type de fiche</label>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setFilterType('all')}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                          filterType === 'all' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300')}>
                        Tous
                      </button>
                      {(Object.entries(PUB_TYPE_CONFIG) as [PubType, typeof PUB_TYPE_CONFIG[PubType]][]).map(([key, conf]) => (
                        <button key={key} onClick={() => setFilterType(filterType === key ? 'all' : key)}
                          className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                            filterType === key ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300')}>
                          {conf.emoji} {conf.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Besoins */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Besoin actif</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'benevoles', label: '🙋 Bénévoles' },
                        { id: 'adherents', label: '👥 Adhérents' },
                        { id: 'dons',      label: '💝 Dons' },
                        { id: 'partenaires', label: '🤝 Partenaires' },
                        { id: 'Matériel',  label: '📦 Matériel' },
                      ].map(({ id, label }) => (
                        <button key={id} onClick={() => setFilterNeed(filterNeed === id ? '' : id)}
                          className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                            filterNeed === id ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300')}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Public */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Public cible</label>
                    <div className="flex flex-wrap gap-2">
                      {PUBLIC_OPTIONS.map(p => (
                        <button key={p} onClick={() => setFilterPublic(filterPublic === p ? '' : p)}
                          className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                            filterPublic === p ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-500 border-gray-200 hover:border-sky-300')}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Favoris */}
                  {savedAssos.size > 0 && (
                    <button onClick={() => setShowSavedOnly(v => !v)}
                      className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all',
                        showSavedOnly ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-yellow-50')}>
                      <BookmarkCheck className="w-4 h-4" /> Mes favoris ({savedAssos.size})
                    </button>
                  )}
                </div>
              )}

              {/* Catégories — pills horizontales */}
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setFilterCat('all')}
                  className={cn('px-4 py-1.5 rounded-full text-xs font-bold border transition-all',
                    filterCat === 'all' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300')}>
                  Toutes
                </button>
                {(Object.entries(CAT_CONFIG) as [AssoCategory, typeof CAT_CONFIG[AssoCategory]][]).map(([key, conf]) => {
                  const Icon = conf.icon;
                  const count = assos.filter(a => a.category === key).length;
                  return (
                    <button key={key} type="button" onClick={() => setFilterCat(filterCat === key ? 'all' : key)}
                      className={cn('inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all',
                        filterCat === key ? 'bg-violet-500 text-white border-violet-500' : `bg-white ${conf.color} border-gray-200 hover:border-violet-300`)}>
                      <span>{conf.emoji}</span>
                      <Icon className="w-3 h-3" />{conf.label}
                      {count > 0 && <span className={cn('text-[10px]', filterCat === key ? 'text-white/70' : 'text-gray-400')}>{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Compteur résultats */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-600">
                  {loading ? 'Chargement…' : `${displayedAssos.length} association${displayedAssos.length !== 1 ? 's' : ''}`}
                  {activeFiltersCount > 0 && <span className="text-violet-500 ml-1 font-normal">({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''})</span>}
                </p>
              </div>
            </div>

            {/* ── GRILLE ASSOCIATIONS ── */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            ) : displayedAssos.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium text-lg">Aucune association trouvée</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">
                  {activeFiltersCount > 0 ? 'Modifiez les filtres pour élargir la recherche.' : 'Soyez la première association à se référencer !'}
                </p>
                {activeFiltersCount > 0 && (
                  <button onClick={() => { setFilterCat('all'); setFilterType('all'); setFilterSector(null); setFilterNeed(''); setFilterPublic(''); setSearch(''); setShowSavedOnly(false); }}
                    className="mr-2 inline-flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-all">
                    <X className="w-4 h-4" /> Réinitialiser
                  </button>
                )}
                {profile ? (
                  <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
                    className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all">
                    <Plus className="w-4 h-4" /> Référencer une association
                  </button>
                ) : (
                  <Link href="/connexion" className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all">
                    Se connecter pour publier
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {displayedAssos.map(asso => (
                  <AssociationCard
                    key={asso.id}
                    asso={asso}
                    userId={profile?.id}
                    isAuthor={profile?.id === asso.author_id}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    saved={savedAssos.has(asso.id)}
                    onToggleSave={toggleSaved}
                  />
                ))}
              </div>
            )}

            {/* CTA connexion bas de page */}
            {!profile && assos.length > 0 && (
              <div className="mt-8 bg-violet-50 border border-violet-200 rounded-2xl p-6 text-center">
                <p className="text-violet-700 font-medium mb-3">Connectez-vous pour contacter, rejoindre ou soutenir une association</p>
                <Link href="/connexion" className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>

          {/* ── SIDEBAR (desktop only) ─────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

            {/* Besoins urgents */}
            {urgentCount > 0 && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-5 shadow-sm">
                <h3 className="text-sm font-black text-red-800 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-500 animate-pulse" /> Besoins urgents
                </h3>
                <div className="space-y-2">
                  {assos.filter(a => a.urgent_need).slice(0, 4).map(a => {
                    const cat = CAT_CONFIG[a.category];
                    return (
                      <a key={a.id} href={`#${a.id}`}
                        className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-red-100 hover:border-red-300 transition-colors group">
                        <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-red-600">{a.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{a.needs.slice(0, 2).join(', ')}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Favoris */}
            {savedAssos.size > 0 && (
              <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-yellow-800 flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-yellow-500" /> Mes favoris
                  </h3>
                  <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{savedAssos.size}</span>
                </div>
                <button onClick={() => { setShowSavedOnly(true); setShowAdvFilters(false); }}
                  className="w-full text-xs font-bold text-yellow-700 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Voir mes associations sauvegardées
                </button>
              </div>
            )}

            {/* Explorer par catégorie */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" /> Explorer par catégorie
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CAT_CONFIG) as [AssoCategory, typeof CAT_CONFIG[AssoCategory]][]).map(([key, conf]) => {
                  const Icon = conf.icon;
                  const count = assos.filter(a => a.category === key).length;
                  const isActive = filterCat === key;
                  return (
                    <button key={key}
                      onClick={() => { setFilterCat(filterCat === key ? 'all' : key); }}
                      className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all hover:shadow-sm text-xs font-bold',
                        isActive ? `${conf.bg} ${conf.color}` : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200')}>
                      <span className="text-xl leading-none">{conf.emoji}</span>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="leading-tight">{conf.label}</span>
                      {count > 0 && <span className={cn('text-[10px] font-semibold', isActive ? conf.color : 'text-gray-400')}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secteurs — CDC §8 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-500" /> Par quartier
              </h3>
              <div className="space-y-2">
                {sectorCounts.filter(s => s.count > 0).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Aucun secteur renseigné</p>
                ) : (
                  sectorCounts.map(s => (
                    <button key={s.id} onClick={() => setFilterSector(filterSector === s.slug ? null : s.slug)}
                      className={cn('w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                        filterSector === s.slug ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-white hover:border-gray-200')}>
                      <span>{s.name}</span>
                      <span className={cn('font-black', filterSector === s.slug ? 'text-violet-600' : 'text-gray-400')}>{s.count}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Blocs intelligents — CDC §12 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-500" /> Vie associative
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Building2,  label: `${totalActive} actives`,         sub: 'à Biguglia',           color: 'text-violet-500', bg: 'bg-violet-50' },
                  { icon: UserCheck,  label: `${volunteerCount} bénévolat`,     sub: 'places ouvertes',       color: 'text-rose-500',   bg: 'bg-rose-50' },
                  { icon: Gift,       label: `${assos.filter(a=>a.is_accepting_donations||a.pub_type==='dons').length} dons`,
                                                                                sub: 'associations soutenues',color: 'text-amber-500',  bg: 'bg-amber-50' },
                  { icon: Calendar,   label: `${eventsAssosCount} événements`,  sub: 'en préparation',        color: 'text-pink-500',   bg: 'bg-pink-50' },
                ].map(({ icon: I, label, sub, color, bg }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                      <I className={cn('w-4 h-4', color)} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Liens rapides vers modules liés — CDC §8 */}
            <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-violet-800 mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-violet-500" /> Modules liés
              </h3>
              <div className="space-y-2">
                {[
                  { href: '/evenements',      icon: Calendar,      label: 'Événements',    sub: 'Agenda communautaire' },
                  { href: '/forum',           icon: MessageSquare, label: 'Forum',          sub: 'Discussions locales' },
                  { href: '/coups-de-main',   icon: Handshake,     label: 'Coups de main',  sub: 'Entraide & bénévolat' },
                  { href: '/annonces',        icon: Tag,           label: 'Annonces',        sub: 'Matériel & dons' },
                  { href: '/messages',        icon: Send,          label: 'Messages',        sub: 'Contacter une asso' },
                ].map(({ href, icon: Icon, label, sub }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white transition-colors group">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Icon className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-violet-800 group-hover:text-violet-600">{label}</p>
                      <p className="text-[10px] text-violet-500">{sub}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-violet-300 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Charte — CDC §11 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-500" /> Charte associations
              </h3>
              <ul className="space-y-2">
                {[
                  'Nom, catégorie, description et contact obligatoires',
                  'Un seul besoin actif à la fois par type',
                  'Dons et sponsors distincts des adhésions',
                  'Modération légère — signalement possible',
                  "Mise à jour requise si changement d'activité",
                ].map(rule => (
                  <li key={rule} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />{rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA non connecté */}
            {!profile && (
              <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black mb-1">Rejoignez la communauté</h3>
                <p className="text-xs text-purple-200 mb-4 leading-relaxed">Inscrivez-vous pour contacter des associations, proposer votre aide et suivre les besoins locaux.</p>
                <Link href="/connexion"
                  className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-purple-50 transition-all w-full justify-center shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Se connecter & participer
                </Link>
              </div>
            )}

            {/* Notification nouveaux besoins */}
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 shadow-sm">
              <h3 className="text-sm font-black text-emerald-800 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500" /> Rester informé
              </h3>
              <p className="text-xs text-emerald-700 mb-3">Activez les notifications pour être alerté des nouveaux besoins et événements associatifs.</p>
              <Link href={profile ? '/notifications' : '/connexion'}
                className="w-full text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> {profile ? 'Gérer mes alertes' : 'Se connecter pour les alertes'}
              </Link>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
