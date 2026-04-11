'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  MapPin, Clock, Mountain, Camera, MessageSquare, Footprints, TreePine,
  Heart, ChevronRight, Navigation, Compass, Sun, Plus, Users, Eye,
  Leaf, X, AlertCircle, Loader2, RefreshCw,
  Send, Pencil, Trash2, Baby, Dog, ParkingSquare, BarChart3,
  Droplets, Bike, Star, Bookmark,
  Flag, Share2, ArrowRight, Search, SlidersHorizontal, Filter,
  Shield, CheckCircle2, Waves,
  Thermometer, Wind, CloudRain, AlertTriangle,
  TrendingUp, Zap, Info, ChevronDown, ChevronUp,
  Trophy, Map, Calendar, Clock3, Sparkles,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';
import SectorFilter, { SectorBadge } from '@/components/ui/SectorFilter';
import toast from 'react-hot-toast';
import { legacyToFrenchStatus, computeDisplayStatus, OUTING_STATUS_CONFIG } from '@/lib/outings';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type Promenade = {
  id: string;
  title: string;
  description: string;
  distance_km: number | null;
  duration_min: number | null;
  difficulty: 'facile' | 'moyen' | 'difficile';
  tags: string[];
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  likes_count?: number;
  user_liked?: boolean;
  user_saved?: boolean;
  views: number;
  created_at: string;
  type: 'balade' | 'randonnee' | 'velo' | 'plage' | 'nature' | 'moto' | 'famille' | 'photo';
  photos?: { url: string }[];
  dogs_allowed?: boolean;
  stroller_friendly?: boolean;
  shade_level?: 'none' | 'partial' | 'full';
  water_access?: boolean;
  parking_available?: boolean;
  best_time_of_day?: 'morning' | 'sunset' | 'anytime';
  best_season?: string;
  safety_notes?: string;
  practical_tips?: string;
  meeting_point_label?: string;
  route_loop?: boolean;
  sector_id?: string;
  avg_rating?: number;
  ratings_count?: number;
  last_report_date?: string;
  last_report_status?: 'good' | 'degraded' | 'closed';
};

type ForumPost = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  created_at: string;
  comment_count?: number;
};

type GroupOuting = {
  id: string;
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
  organizer_id: string;
  organizer?: { full_name: string } | null;
  participants_count?: number;
  user_joined?: boolean;
  cover_photo?: string | null;
};

type OutingComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

// ─── Configs ──────────────────────────────────────────────────────────────────
const DIFF_CONFIG = {
  facile:    { label: 'Facile',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: '🟢', barColor: 'bg-emerald-400' },
  moyen:     { label: 'Moyen',     color: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   icon: '🟡', barColor: 'bg-amber-400' },
  difficile: { label: 'Difficile', color: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     icon: '🔴', barColor: 'bg-red-400' },
};

const TYPE_CONFIG = {
  balade:    { icon: Footprints, label: 'Balade',          color: 'text-sky-600',      bg: 'bg-sky-50',      border: 'border-sky-200',      emoji: '🥾',  gradient: 'from-sky-500 to-blue-600' },
  randonnee: { icon: Mountain,   label: 'Randonnée',       color: 'text-orange-600',   bg: 'bg-orange-50',   border: 'border-orange-200',   emoji: '⛰️',  gradient: 'from-orange-500 to-red-600' },
  velo:      { icon: Bike,       label: 'Vélo',            color: 'text-purple-600',   bg: 'bg-purple-50',   border: 'border-purple-200',   emoji: '🚴',  gradient: 'from-purple-500 to-violet-600' },
  plage:     { icon: Waves,      label: 'Plage',           color: 'text-yellow-600',   bg: 'bg-yellow-50',   border: 'border-yellow-200',   emoji: '🏖️',  gradient: 'from-yellow-400 to-orange-500' },
  nature:    { icon: Leaf,       label: 'Nature',          color: 'text-emerald-600',  bg: 'bg-emerald-50',  border: 'border-emerald-200',  emoji: '🌿',  gradient: 'from-emerald-500 to-teal-600' },
  moto:      { icon: Navigation, label: 'Moto découverte', color: 'text-gray-700',     bg: 'bg-gray-50',     border: 'border-gray-200',     emoji: '🏍️',  gradient: 'from-gray-600 to-slate-700' },
  famille:   { icon: Users,      label: 'Famille',         color: 'text-pink-600',     bg: 'bg-pink-50',     border: 'border-pink-200',     emoji: '👨‍👩‍👧',  gradient: 'from-pink-500 to-rose-600' },
  photo:     { icon: Camera,     label: 'Spot photo',      color: 'text-violet-600',   bg: 'bg-violet-50',   border: 'border-violet-200',   emoji: '📸',  gradient: 'from-violet-500 to-purple-600' },
};

const TERRAIN_STATUS_CONFIG = {
  good:      { label: 'Terrain OK',     color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2, dot: 'bg-emerald-500' },
  degraded:  { label: 'Terrain dégradé',color: 'text-amber-700',   bg: 'bg-amber-100',   icon: AlertTriangle, dot: 'bg-amber-500' },
  closed:    { label: 'Accès fermé',    color: 'text-red-700',     bg: 'bg-red-100',     icon: X,             dot: 'bg-red-500' },
};

const QUICK_FILTERS = [
  { id: 'balade',    label: 'Balade',      emoji: '🥾' },
  { id: 'famille',   label: 'Famille',     emoji: '👨‍👩‍👧' },
  { id: 'chien',     label: 'Avec chien',  emoji: '🐕' },
  { id: 'velo',      label: 'Vélo',        emoji: '🚴' },
  { id: 'photo',     label: 'Spot photo',  emoji: '📸' },
  { id: 'facile',    label: 'Facile',      emoji: '🟢' },
  { id: 'sunset',    label: 'Coucher soleil', emoji: '🌅' },
  { id: 'poussette', label: 'Poussette',   emoji: '🍼' },
  { id: 'court',     label: '< 1h',        emoji: '⚡' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(min: number | null) {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function getDifficultyLevel(d: 'facile' | 'moyen' | 'difficile') {
  return d === 'facile' ? 1 : d === 'moyen' ? 2 : 3;
}

// ─── PromenadeCard PRO ────────────────────────────────────────────────────────
function PromenadeCard({
  p, userId, onLike, onSave,
}: { p: Promenade; userId?: string; onLike: (id: string, liked: boolean) => void; onSave?: (id: string, saved: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const diff = DIFF_CONFIG[p.difficulty];
  const type = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.balade;
  const TypeIcon = type.icon;
  const firstPhoto = p.photos?.[0]?.url;
  const diffLevel = getDifficultyLevel(p.difficulty);

  const terrainCfg = p.last_report_status ? TERRAIN_STATUS_CONFIG[p.last_report_status] : null;
  const TerrainIcon = terrainCfg?.icon;

  const essentialBadges = [
    p.dogs_allowed      && { label: 'Chiens',      emoji: '🐕', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    p.stroller_friendly && { label: 'Poussette',   emoji: '🍼', cls: 'bg-pink-50 text-pink-700 border-pink-200' },
    p.shade_level === 'full' && { label: 'Ombragé',emoji: '🌳', cls: 'bg-green-50 text-green-700 border-green-200' },
    p.water_access      && { label: 'Point d\'eau',emoji: '💧', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    p.parking_available && { label: 'Parking',     emoji: '🅿️', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    p.route_loop        && { label: 'Boucle',      emoji: '🔄', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    p.best_time_of_day === 'sunset'  && { label: 'Coucher soleil',emoji: '🌅', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    p.best_time_of_day === 'morning' && { label: 'Matin idéal',  emoji: '🌄', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  ].filter(Boolean) as { label: string; emoji: string; cls: string }[];

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">

      {/* ── Zone photo ── */}
      <div className="relative h-52 overflow-hidden flex-shrink-0">
        {firstPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstPhoto} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${type.gradient} opacity-90 flex items-center justify-center`}>
            <TypeIcon className="w-20 h-20 opacity-20 text-white" />
          </div>
        )}
        {/* Overlay dégradé sophistiqué */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-transparent" />

        {/* Haut gauche : type */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full bg-white/95 shadow-md', type.color)}>
            <TypeIcon className="w-3 h-3" />{type.label}
          </span>
          {terrainCfg && TerrainIcon && (
            <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full shadow-md border', terrainCfg.bg, terrainCfg.color)}>
              <TerrainIcon className="w-3 h-3" />
              {p.last_report_status === 'good' ? 'OK' : p.last_report_status === 'degraded' ? 'Dégradé' : 'Fermé'}
            </span>
          )}
        </div>

        {/* Haut droite : difficulté + save */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border bg-white/95 shadow-md', diff.color)}>
            {diff.icon} {diff.label}
          </span>
          {onSave && (
            <button
              onClick={(e) => { e.stopPropagation(); userId && onSave(p.id, !!p.user_saved); }}
              title={p.user_saved ? 'Retirer des favoris' : 'Sauvegarder'}
              className={cn(
                'p-1.5 rounded-full shadow-md transition-all',
                p.user_saved ? 'bg-amber-400 text-white' : 'bg-white/90 text-gray-400 hover:text-amber-500 hover:bg-white',
                !userId && 'opacity-50 cursor-default'
              )}
            >
              <Bookmark className={cn('w-3.5 h-3.5', p.user_saved ? 'fill-current' : '')} />
            </button>
          )}
        </div>

        {/* Bas : badges + titre */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {essentialBadges.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {essentialBadges.slice(0, 4).map(b => (
                <span key={b.label} className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-white/95 shadow-sm', b.cls)}>
                  {b.emoji} {b.label}
                </span>
              ))}
              {essentialBadges.length > 4 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 text-gray-600 shadow-sm">
                  +{essentialBadges.length - 4}
                </span>
              )}
            </div>
          )}
          <p className="text-white font-black text-sm leading-tight drop-shadow-lg line-clamp-2">{p.title}</p>
        </div>
      </div>

      {/* ── Barre stats compact ── */}
      <div className="px-4 py-2.5 border-b border-gray-50 bg-gray-50/50">
        <div className="flex items-center gap-3 text-xs">
          {p.distance_km != null && (
            <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
              <MapPin className="w-3 h-3" />{p.distance_km} km
            </span>
          )}
          {p.duration_min != null && (
            <span className="flex items-center gap-1 font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3" />{formatDuration(p.duration_min)}
            </span>
          )}
          {/* Barre difficulté visuelle */}
          <div className="flex items-center gap-0.5 ml-auto">
            {[1, 2, 3].map(l => (
              <div key={l} className={cn('w-3 h-2 rounded-sm transition-all', l <= diffLevel ? diff.barColor : 'bg-gray-200')} />
            ))}
          </div>
          {p.avg_rating && p.avg_rating > 0 && (
            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
              <Star className="w-3 h-3 fill-current" />
              {p.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="p-4 flex flex-col flex-1">

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-2 flex-1">{p.description}</p>

        {/* Infos pratiques expandable */}
        {(p.practical_tips || p.safety_notes || p.meeting_point_label) && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              Infos pratiques
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5 bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                {p.meeting_point_label && (
                  <p className="text-xs text-gray-600 flex items-start gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><span className="font-semibold">Départ :</span> {p.meeting_point_label}</span>
                  </p>
                )}
                {p.practical_tips && (
                  <p className="text-xs text-gray-600 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span>{p.practical_tips}</span>
                  </p>
                )}
                {p.safety_notes && (
                  <p className="text-xs text-amber-700 flex items-start gap-1.5 bg-amber-50 rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{p.safety_notes}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {p.tags && p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {p.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-default"># {t}</span>
            ))}
            {p.tags.length > 3 && <span className="text-[11px] text-gray-400 px-1">+{p.tags.length - 3}</span>}
          </div>
        )}

        {/* ── Barre d'actions ── */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
          <div className="flex items-center gap-1">
            {/* Like */}
            <button
              onClick={() => userId && onLike(p.id, !!p.user_liked)}
              title={p.user_liked ? 'Retirer le like' : 'J\'aime'}
              className={cn(
                'flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all border',
                p.user_liked
                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-sm'
                  : 'bg-gray-50 text-gray-400 border-gray-100 hover:text-rose-500 hover:bg-rose-50',
                !userId && 'cursor-default opacity-50'
              )}
            >
              <Heart className={cn('w-3.5 h-3.5', p.user_liked ? 'fill-current' : '')} />
              {p.likes_count || 0}
            </button>

            {/* Vues */}
            <span className="flex items-center gap-1 text-xs text-gray-300 px-2">
              <Eye className="w-3.5 h-3.5" />{p.views ?? 0}
            </span>

            {/* Partager */}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: p.title, url: `${window.location.origin}/promenades` });
                } else {
                  navigator.clipboard.writeText(`${window.location.origin}/promenades`);
                  toast.success('Lien copié !');
                }
              }}
              className="flex items-center text-xs text-gray-400 border border-gray-100 bg-gray-50 hover:bg-gray-100 px-2 py-1.5 rounded-xl transition-all"
              title="Partager"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Auteur + date */}
          <div className="flex items-center gap-1.5 min-w-0">
            {p.author?.avatar_url && (
              <Avatar src={p.author.avatar_url} name={p.author.full_name} size="xs" />
            )}
            <span className="text-[11px] text-gray-400 truncate max-w-[90px]">
              {p.author?.full_name ?? 'Anonyme'} · {formatRelative(p.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Pied de carte : signalement terrain ── */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {userId && (
            <ReportButton targetType="promenade" targetId={p.id} targetTitle={p.title} variant="mini" />
          )}
        </div>
        <span className="text-[10px] text-gray-300 flex items-center gap-1">
          <Flag className="w-3 h-3" /> Signaler un problème
        </span>
      </div>
    </div>
  );
}

// ─── OutingCard ──────────────────────────────────────────────────────────────
function OutingCard({ outing, userId, isOrganizer, onJoin, onEdit, onDelete, onStatusChange }: {
  outing: GroupOuting;
  userId?: string;
  isOrganizer: boolean;
  onJoin: (id: string, joined: boolean) => void;
  onEdit: (o: GroupOuting) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const fillPct  = Math.round(((outing.participants_count || 0) / outing.max_participants) * 100);
  const isFull   = (outing.participants_count || 0) >= outing.max_participants;
  const dateLabel = new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  const diffConf  = outing.difficulty ? DIFF_CONFIG[outing.difficulty] : null;

  const [openChat, setOpenChat]     = useState(false);
  const [comments, setComments]     = useState<OutingComment[]>([]);
  const [loadingC, setLoadingC]     = useState(false);
  const [chatText, setChatText]     = useState('');
  const [sending,  setSending]      = useState(false);
  const [chatCount,setChatCount]    = useState<number|null>(null);
  const [tableOk,  setTableOk]      = useState<boolean|null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photoItems = outing.cover_photo ? [{ url: outing.cover_photo, isPrimary: true }] : [];
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('outing_comments').select('id', { count:'exact', head:true }).eq('outing_id', outing.id)
      .then(({ count: c, error }) => {
        if (cancelled) return;
        if (error) { setTableOk(false); } else { setTableOk(true); setChatCount(c ?? 0); }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outing.id]);

  const fetchComments = useCallback(async () => {
    setLoadingC(true);
    const { data } = await supabase.from('outing_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('outing_id', outing.id).order('created_at', { ascending: true }).limit(50);
    setComments((data ?? []) as OutingComment[]);
    setChatCount((data ?? []).length);
    setLoadingC(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outing.id]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    const { error } = await supabase.from('outing_comments')
      .insert({ outing_id: outing.id, author_id: userId, content: chatText.trim() });
    if (!error) { setChatText(''); await fetchComments(); }
    setSending(false);
  };

  // Calculate days until outing
  const daysUntil = Math.ceil((new Date(outing.outing_date + 'T00:00:00').getTime() - Date.now()) / 86400000);

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* ── Zone photo ── */}
      <div className="relative h-48 overflow-hidden">
        {outing.cover_photo ? (
          <div className="w-full h-full cursor-pointer" onClick={() => setLightboxOpen(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={outing.cover_photo} alt={outing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600 flex items-center justify-center">
            <Footprints className="w-20 h-20 opacity-20 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Countdown badge */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full shadow-lg',
            daysUntil === 0 ? 'bg-red-500 text-white' :
            daysUntil <= 3  ? 'bg-amber-500 text-white' :
            'bg-emerald-500 text-white'
          )}>
            <Calendar className="w-3 h-3" />
            {daysUntil === 0 ? "Aujourd'hui !" : daysUntil === 1 ? 'Demain !' : `Dans ${daysUntil}j`}
            <span className="opacity-80">· {outing.outing_time}</span>
          </span>
          {diffConf && (
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 shadow border', diffConf.color)}>
              <BarChart3 className="w-3 h-3 inline mr-1" />{diffConf.label}
            </span>
          )}
          <StatusBadge status={outing.status || 'active'} contentType="outing" extra={{ outingDate: outing.outing_date, isFull, fillPct }} size="xs" showIcon className="shadow" />
        </div>

        {isOrganizer && (
          <div className="absolute top-3 right-3 flex gap-1">
            <button type="button" onClick={() => onEdit(outing)} className="p-1.5 bg-white/90 text-gray-600 hover:text-emerald-600 rounded-xl transition-all shadow-sm"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => onDelete(outing.id)} className="p-1.5 bg-white/90 text-gray-600 hover:text-red-600 rounded-xl transition-all shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {outing.parking_available && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/90 text-white shadow backdrop-blur-sm"><ParkingSquare className="w-3 h-3 inline mr-1" />Parking</span>}
            {outing.stroller_accessible && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-500/90 text-white shadow backdrop-blur-sm"><Baby className="w-3 h-3 inline mr-1" />Poussette</span>}
            {outing.kids_friendly && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/90 text-white shadow backdrop-blur-sm"><Users className="w-3 h-3 inline mr-1" />Enfants</span>}
            {outing.dogs_allowed && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/90 text-white shadow backdrop-blur-sm"><Dog className="w-3 h-3 inline mr-1" />Chiens</span>}
          </div>
          <p className="text-white font-black text-sm leading-tight drop-shadow-lg line-clamp-2">{outing.title}</p>
        </div>
      </div>

      {/* ── Barre participants visuelle ── */}
      <div className="px-5 pt-3 pb-0">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className={cn('font-bold flex items-center gap-1', isFull ? 'text-red-500' : fillPct > 70 ? 'text-amber-600' : 'text-emerald-600')}>
            <Users className="w-3.5 h-3.5" />
            {outing.participants_count || 0}/{outing.max_participants} participants
            {isFull && <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-black text-[10px]">COMPLET</span>}
          </span>
          <span className="text-gray-400">{fillPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', fillPct > 80 ? 'bg-gradient-to-r from-red-400 to-red-500' : fillPct > 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500')}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </div>
      </div>

      <div className="p-5 pt-3">
        {outing.description && <p className="text-sm text-gray-500 mb-3 leading-relaxed">{outing.description}</p>}
        <div className="flex flex-col gap-1 mb-4">
          {outing.meeting_point && (
            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span><span className="font-semibold">RDV :</span> {outing.meeting_point}</span>
            </p>
          )}
          {outing.parking_info && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <ParkingSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> {outing.parking_info}
            </p>
          )}
          <p className="text-xs text-gray-400">Organisé par <span className="font-semibold text-gray-600">{outing.organizer?.full_name ?? 'Membre'}</span></p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {userId ? (
            <button onClick={() => onJoin(outing.id, !!outing.user_joined)}
              disabled={isFull && !outing.user_joined}
              className={cn('inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm',
                outing.user_joined ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200' : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200')}>
              <Users className="w-4 h-4" />
              {outing.user_joined ? '✓ Inscrit — Annuler' : isFull ? 'Complet' : 'Je participe'}
            </button>
          ) : (
            <Link href="/connexion" className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm">
              <Users className="w-4 h-4" /> Je participe
            </Link>
          )}
          {isOrganizer ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400 italic">✉️ Les membres vous contacteront ici</span>
              {onStatusChange && (() => {
                const fr = legacyToFrenchStatus(outing.status);
                const displayed = computeDisplayStatus(fr, outing.participants_count || 0, outing.max_participants, outing.outing_date);
                const actions: { label: string; key: string; cfg: ReturnType<typeof legacyToFrenchStatus> }[] = [];
                if (displayed === 'ouverte') {
                  actions.push({ label: '👥 Marquer complète', key: 'complete', cfg: 'complete' as ReturnType<typeof legacyToFrenchStatus> });
                  actions.push({ label: '✅ Terminer', key: 'terminee', cfg: 'terminee' as ReturnType<typeof legacyToFrenchStatus> });
                  actions.push({ label: '✖ Annuler', key: 'annulee', cfg: 'annulee' as ReturnType<typeof legacyToFrenchStatus> });
                } else if (displayed === 'complete') {
                  actions.push({ label: '🔓 Rouvrir', key: 'ouverte', cfg: 'ouverte' as ReturnType<typeof legacyToFrenchStatus> });
                  actions.push({ label: '✅ Terminer', key: 'terminee', cfg: 'terminee' as ReturnType<typeof legacyToFrenchStatus> });
                } else if (displayed === 'terminee' || displayed === 'annulee') {
                  actions.push({ label: '📦 Archiver', key: 'archivee', cfg: 'archivee' as ReturnType<typeof legacyToFrenchStatus> });
                }
                return actions.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {actions.map(a => {
                      const aCfg = OUTING_STATUS_CONFIG[a.cfg];
                      return (
                        <button key={a.key} onClick={() => { if (window.confirm(`${a.label} ?`)) onStatusChange(outing.id, a.key); }}
                          className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors', aCfg.bg, aCfg.color, aCfg.border)}>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <ContactButton sourceType="outing" sourceId={outing.id} sourceTitle={outing.title} ownerId={outing.organizer_id} userId={userId} size="sm" />
          )}
          {tableOk !== false && (
            <button onClick={handleOpenChat}
              className={cn('inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border',
                openChat ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100')}>
              <MessageSquare className="w-4 h-4" />
              Discussion
              {chatCount !== null && chatCount > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>
              )}
            </button>
          )}
          <Link href={`/promenades/sorties/${outing.id}`}
            className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100">
            <Eye className="w-4 h-4" /> Voir
          </Link>
          {userId && !isOrganizer && (
            <ReportButton targetType="outing" targetId={outing.id} targetTitle={outing.title} variant="mini" />
          )}
        </div>

        {/* Mini-chat */}
        {openChat && tableOk && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            {loadingC ? (
              <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — démarrez la discussion !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
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
                  placeholder="Votre message…" rows={2}
                  className="flex-1 text-xs rounded-lg border border-emerald-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-emerald-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Notation si sortie passée */}
      {new Date(outing.outing_date + 'T23:59:59') < new Date() && (
        <div className="px-4 pb-4">
          <RatingWidget targetType="outing" targetId={outing.id} authorId={outing.organizer_id} userId={userId} compact={false} showPoll />
        </div>
      )}
      {lightboxOpen && photoItems.length > 0 && (
        <PhotoViewer photos={photoItems} initialIndex={0} onClose={() => setLightboxOpen(false)} title={outing.title} />
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PromenadePage() {
  const { profile } = useAuthStore();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'itineraires' | 'forum' | 'agenda'>('itineraires');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dbReady, setDbReady] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [advFilters, setAdvFilters] = useState({
    dogs: false,
    stroller: false,
    parking: false,
    water: false,
    shade: false,
    sunset: false,
    duration_max: '' as string,
    loop: false,
  });

  const [promenades, setPromenades] = useState<Promenade[]>([]);
  const [loadingPromenades, setLoadingPromenades] = useState(true);

  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loadingForum, setLoadingForum] = useState(false);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);

  const [outings, setOutings] = useState<GroupOuting[]>([]);
  const [loadingOutings, setLoadingOutings] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', distance_km: '', duration_min: '',
    difficulty: 'facile', type: 'balade', tags: '', start_point: '',
    dogs_allowed: false, stroller_friendly: false, parking_available: false,
    water_access: false, shade_level: 'none' as 'none' | 'partial' | 'full',
    best_time_of_day: 'anytime' as 'morning' | 'sunset' | 'anytime',
    route_loop: false, practical_tips: '', safety_notes: '',
  });

  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  const [showOutingForm, setShowOutingForm]   = useState(false);
  const [editingOuting,  setEditingOuting]    = useState<GroupOuting | null>(null);
  const [outingForm, setOutingForm] = useState({
    title: '', description: '', outing_date: '', outing_time: '09:00',
    max_participants: '10', meeting_point: '',
    parking_info: '', parking_available: false, stroller_accessible: false,
    difficulty: 'facile' as 'facile'|'moyen'|'difficile',
    kids_friendly: false, dogs_allowed: false,
  });
  const [outingPhotos,   setOutingPhotos]     = useState<File[]>([]);
  const [outingPreviews, setOutingPreviews]   = useState<string[]>([]);
  const outingPhotoRef = useRef<HTMLInputElement>(null);
  const [submittingOuting, setSubmittingOuting] = useState(false);

  // Lire ?tab= depuis l'URL côté client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'agenda') setActiveTab('agenda');
      else if (tab === 'forum') setActiveTab('forum');
      else setActiveTab('itineraires');
    }
  }, []);

  // ── Fetch promenades ──────────────────────────────────────────────────────
  const fetchPromenades = useCallback(async () => {
    setLoadingPromenades(true);
    try {
      let query = supabase
        .from('promenades')
        .select(`*, author:profiles!promenades_author_id_fkey(full_name, avatar_url), photos:promenade_photos(url)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (quickFilter) {
        if (['balade', 'randonnee', 'velo', 'plage', 'nature', 'moto', 'famille', 'photo'].includes(quickFilter)) {
          query = query.eq('type', quickFilter);
        } else if (['facile', 'moyen', 'difficile'].includes(quickFilter)) {
          query = query.eq('difficulty', quickFilter);
        } else if (quickFilter === 'chien') {
          query = query.eq('dogs_allowed', true);
        } else if (quickFilter === 'poussette') {
          query = query.eq('stroller_friendly', true);
        } else if (quickFilter === 'sunset') {
          query = query.eq('best_time_of_day', 'sunset');
        } else if (quickFilter === 'court') {
          query = query.lte('duration_min', 60);
        }
      }

      if (advFilters.dogs)    query = query.eq('dogs_allowed', true);
      if (advFilters.stroller) query = query.eq('stroller_friendly', true);
      if (advFilters.parking) query = query.eq('parking_available', true);
      if (advFilters.water)   query = query.eq('water_access', true);
      if (advFilters.loop)    query = query.eq('route_loop', true);
      if (advFilters.sunset)  query = query.eq('best_time_of_day', 'sunset');
      if (advFilters.duration_max) {
        const maxMin = parseInt(advFilters.duration_max);
        if (!isNaN(maxMin)) query = query.lte('duration_min', maxMin);
      }

      if (filterSector) query = query.eq('sector_id', filterSector);

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingPromenades(false);
        return;
      }
      setDbReady(true);

      let enriched = (data || []) as Promenade[];
      if (profile && enriched.length > 0) {
        const ids = enriched.map(p => p.id);
        const { data: likesData } = await supabase
          .from('promenade_likes').select('promenade_id').in('promenade_id', ids).eq('user_id', profile.id);
        const likedSet = new Set((likesData || []).map((l: { promenade_id: string }) => l.promenade_id));
        const { data: countsData } = await supabase
          .from('promenade_likes').select('promenade_id').in('promenade_id', ids);
        const countMap: Record<string, number> = {};
        (countsData || []).forEach((l: { promenade_id: string }) => { countMap[l.promenade_id] = (countMap[l.promenade_id] || 0) + 1; });
        enriched = enriched.map(p => ({ ...p, user_liked: likedSet.has(p.id), likes_count: countMap[p.id] || 0 }));
      }
      setPromenades(enriched);
    } catch (err) {
      console.error('fetchPromenades error:', err);
      setDbReady(false);
    }
    setLoadingPromenades(false);
  }, [quickFilter, advFilters, filterSector, profile]);

  // ── Fetch forum ───────────────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    const { data: cats } = await supabase.from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
    const catId = cats?.id ?? null;
    setForumCategoryId(catId);
    if (!catId) { setLoadingForum(false); return; }
    const { data } = await supabase
      .from('forum_posts')
      .select(`*, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)`)
      .eq('category_id', catId).eq('is_closed', false)
      .order('created_at', { ascending: false }).limit(20);
    setForumPosts((data as unknown as ForumPost[]) || []);
    setLoadingForum(false);
  }, []);

  // ── Fetch outings ─────────────────────────────────────────────────────────
  const fetchOutings = useCallback(async () => {
    setLoadingOutings(true);
    const { data } = await supabase
      .from('group_outings')
      .select(`*, organizer:profiles!group_outings_organizer_id_fkey(full_name), participants:outing_participants(count)`)
      .in('status', ['open', 'full', 'ouverte', 'complete', 'active'])
      .gte('outing_date', new Date().toISOString().split('T')[0])
      .order('outing_date', { ascending: true }).limit(20);
    const enriched = (data || []).map((o: GroupOuting & { participants?: { count: number }[] }) => ({
      ...o, participants_count: o.participants?.[0]?.count ?? 0, user_joined: false,
    }));
    if (enriched.length > 0) {
      const ids = enriched.map(o => o.id);
      const { data: photos } = await supabase.from('outing_photos').select('outing_id, url, display_order')
        .in('outing_id', ids).order('display_order', { ascending: true });
      const photoMap: Record<string, string> = {};
      (photos || []).forEach((p: { outing_id: string; url: string }) => { if (!photoMap[p.outing_id]) photoMap[p.outing_id] = p.url; });
      enriched.forEach(o => { o.cover_photo = photoMap[o.id] ?? null; });
    }
    if (profile && enriched.length > 0) {
      const ids = enriched.map(o => o.id);
      const { data: joins } = await supabase.from('outing_participants').select('outing_id').in('outing_id', ids).eq('user_id', profile.id);
      const joinedSet = new Set((joins || []).map((j: { outing_id: string }) => j.outing_id));
      setOutings(enriched.map(o => ({ ...o, user_joined: joinedSet.has(o.id) })));
    } else {
      setOutings(enriched);
    }
    setLoadingOutings(false);
  }, [profile]);

  useEffect(() => { fetchPromenades(); }, [fetchPromenades]);
  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);
  useEffect(() => { if (activeTab === 'agenda') fetchOutings(); }, [activeTab, fetchOutings]);

  // ── Like ──────────────────────────────────────────────────────────────────
  const handleLike = async (id: string, alreadyLiked: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour liker'); return; }
    if (alreadyLiked) {
      await supabase.from('promenade_likes').delete().eq('promenade_id', id).eq('user_id', profile.id);
    } else {
      await supabase.from('promenade_likes').insert({ promenade_id: id, user_id: profile.id });
    }
    setPromenades(prev => prev.map(p => p.id === id ? { ...p, user_liked: !alreadyLiked, likes_count: (p.likes_count || 0) + (alreadyLiked ? -1 : 1) } : p));
  };

  // ── Submit promenade ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim() || !form.description.trim()) { toast.error('Titre et description obligatoires'); return; }
    setSubmitting(true);
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const { data: prom, error } = await supabase.from('promenades').insert({
      author_id: profile.id,
      title: form.title.trim(),
      description: form.description.trim(),
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      difficulty: form.difficulty,
      type: form.type,
      tags,
      start_point: form.start_point.trim() || null,
      dogs_allowed: form.dogs_allowed,
      stroller_friendly: form.stroller_friendly,
      parking_available: form.parking_available,
      water_access: form.water_access,
      shade_level: form.shade_level,
      best_time_of_day: form.best_time_of_day,
      route_loop: form.route_loop,
      practical_tips: form.practical_tips.trim() || null,
      safety_notes: form.safety_notes.trim() || null,
    }).select().single();
    if (error) { toast.error('Erreur lors de la publication'); console.error(error); setSubmitting(false); return; }
    if (photos.length > 0 && prom) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const ext = photo.name.split('.').pop() || 'jpg';
        const fileName = `promenades/${prom.id}/${Date.now()}-${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(fileName, photo, { upsert: true });
        if (upErr) { toast.error(`Photo ${i+1} : ${upErr.message}`); continue; }
        if (up?.path) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
          await supabase.from('promenade_photos').insert({ promenade_id: prom.id, url: publicUrl, display_order: i });
        }
      }
    }
    toast.success('🌿 Itinéraire publié !', { duration: 4000 });
    setForm({ title:'', description:'', distance_km:'', duration_min:'', difficulty:'facile', type:'balade', tags:'', start_point:'', dogs_allowed:false, stroller_friendly:false, parking_available:false, water_access:false, shade_level:'none', best_time_of_day:'anytime', route_loop:false, practical_tips:'', safety_notes:'' });
    setPhotos([]); setShowForm(false); fetchPromenades(); setSubmitting(false);
  };

  // ── Submit forum ──────────────────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) { toast.error('Titre et contenu requis'); return; }
    setSubmittingPost(true);
    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase.from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) { toast.error('Catégorie forum introuvable'); setSubmittingPost(false); return; }
    const { error } = await supabase.from('forum_posts').insert({ category_id: catId, author_id: profile.id, title: postForm.title.trim(), content: postForm.content.trim() });
    if (error) { toast.error(`Erreur : ${error.message}`); }
    else { toast.success('🎉 Sujet publié !', { duration: 4000 }); setPostForm({ title: '', content: '' }); setShowPostForm(false); fetchForum(); }
    setSubmittingPost(false);
  };

  // ── Outing helpers ────────────────────────────────────────────────────────
  const handleOutingPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 3 - outingPhotos.length);
    setOutingPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => { const reader = new FileReader(); reader.onload = ev => setOutingPreviews(prev => [...prev, ev.target?.result as string]); reader.readAsDataURL(f); });
  };
  const removeOutingPhoto = (i: number) => { setOutingPhotos(p => p.filter((_, idx) => idx !== i)); setOutingPreviews(p => p.filter((_, idx) => idx !== i)); };
  const resetOutingForm = () => {
    setOutingForm({ title:'', description:'', outing_date:'', outing_time:'09:00', max_participants:'10', meeting_point:'', parking_info:'', parking_available:false, stroller_accessible:false, difficulty:'facile', kids_friendly:false, dogs_allowed:false });
    setOutingPhotos([]); setOutingPreviews([]); setEditingOuting(null); setShowOutingForm(false);
  };
  const startEditOuting = (o: GroupOuting) => {
    setEditingOuting(o);
    setOutingForm({ title:o.title, description:o.description||'', outing_date:o.outing_date, outing_time:o.outing_time, max_participants:String(o.max_participants), meeting_point:o.meeting_point||'', parking_info:o.parking_info||'', parking_available:o.parking_available||false, stroller_accessible:o.stroller_accessible||false, difficulty:o.difficulty||'facile', kids_friendly:o.kids_friendly||false, dogs_allowed:o.dogs_allowed||false });
    setOutingPhotos([]); setOutingPreviews([]); setShowOutingForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior:'smooth' }), 100);
  };
  const handleDeleteOuting = async (id: string) => {
    if (!confirm('Supprimer cette sortie ?')) return;
    await supabase.from('group_outings').delete().eq('id', id);
    toast.success('Sortie supprimée'); fetchOutings();
  };
  const handleOutingStatusChange = async (id: string, newStatus: string) => {
    const frenchMap: Record<string, string> = { active:'ouverte', open:'ouverte', full:'complete', completed:'terminee', cancelled:'annulee', archived:'archivee' };
    const frStatus = frenchMap[newStatus] || newStatus;
    await createClient().from('group_outings').update({ status: frStatus, updated_at: new Date().toISOString() }).eq('id', id);
    const cfg = OUTING_STATUS_CONFIG[legacyToFrenchStatus(frStatus)];
    toast.success(`${cfg?.icon || '✅'} Statut : ${cfg?.label || frStatus}`);
    fetchOutings();
  };
  const handleOutingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!outingForm.title.trim() || !outingForm.outing_date) { toast.error('Titre et date obligatoires'); return; }
    setSubmittingOuting(true);
    const payload = { organizer_id:profile.id, title:outingForm.title.trim(), description:outingForm.description.trim()||null, outing_date:outingForm.outing_date, outing_time:outingForm.outing_time, max_participants:parseInt(outingForm.max_participants)||10, meeting_point:outingForm.meeting_point.trim()||null, parking_info:outingForm.parking_info.trim()||null, parking_available:outingForm.parking_available, stroller_accessible:outingForm.stroller_accessible, difficulty:outingForm.difficulty, kids_friendly:outingForm.kids_friendly, dogs_allowed:outingForm.dogs_allowed };
    let outingId: string | null = null;
    if (editingOuting) {
      const { error } = await supabase.from('group_outings').update(payload).eq('id', editingOuting.id);
      if (error) { toast.error('Erreur modification'); setSubmittingOuting(false); return; }
      outingId = editingOuting.id; toast.success('Sortie modifiée ✓');
    } else {
      const { data: inserted, error } = await supabase.from('group_outings').insert(payload).select('id').single();
      if (error) { toast.error('Erreur création'); setSubmittingOuting(false); return; }
      outingId = inserted?.id ?? null; toast.success('🥾 Sortie créée !', { duration: 4000 });
    }
    if (outingPhotos.length > 0 && outingId) {
      for (let i = 0; i < outingPhotos.length; i++) {
        const file = outingPhotos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `outings/${outingId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) { toast.error(`Photo ${i+1} : ${upErr.message}`); continue; }
        if (up?.path) { const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path); await supabase.from('outing_photos').insert({ outing_id: outingId, url: u.publicUrl, display_order: i }); }
      }
    }
    resetOutingForm(); fetchOutings(); setSubmittingOuting(false);
  };
  const handleJoinOuting = async (outingId: string, joined: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour participer'); return; }
    if (joined) { await supabase.from('outing_participants').delete().eq('outing_id', outingId).eq('user_id', profile.id); toast.success('Inscription annulée'); }
    else { const { error } = await supabase.from('outing_participants').insert({ outing_id: outingId, user_id: profile.id }); if (error) { toast.error('Erreur lors de l\'inscription'); return; } toast.success('Inscription confirmée !'); }
    fetchOutings();
  };

  const totalCount = promenades.length;
  const activeFiltersCount = [quickFilter, advFilters.dogs, advFilters.stroller, advFilters.parking, advFilters.water, advFilters.shade, advFilters.sunset, advFilters.loop, advFilters.duration_max, filterSector].filter(Boolean).length;
  const nextOuting = outings[0];

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── BANNER DB manquante ── */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Tables de base de données manquantes</p>
              <p className="text-xs text-amber-700 mt-0.5">Exécutez <code className="bg-amber-100 px-1 rounded font-mono">src/lib/migration_themes.sql</code> dans votre éditeur SQL Supabase.</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — Premium nature design
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-600 to-sky-600 text-white">
        {/* Motif points */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
        {/* Lumières décoratives */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-400/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-300/20 rounded-full blur-2xl translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5 text-emerald-200 text-sm">
            <span className="p-1.5 bg-white/15 rounded-lg backdrop-blur-sm"><TreePine className="w-4 h-4" /></span>
            <span className="font-medium opacity-90">Thème · Promenades &amp; Nature</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-none tracking-tight">
                🌿 Promenades<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-sky-200">&amp; Nature</span>
              </h1>
              <p className="text-white/80 text-lg leading-relaxed mb-5 max-w-xl">
                Itinéraires locaux, balades famille, spots nature, vélo et sorties groupées autour de Biguglia — filtrés selon votre envie du moment.
              </p>

              {/* Stats clés */}
              <div className="flex flex-wrap gap-2.5 mb-6">
                {[
                  { icon: Footprints, val: totalCount.toString(),                label: `itinéraire${totalCount !== 1 ? 's' : ''}`, sub: 'communauté' },
                  { icon: Users,      val: (outings.length || 0).toString(),     label: `sortie${outings.length !== 1 ? 's' : ''}`,   sub: 'à venir' },
                  { icon: TreePine,   val: '1 456',                              label: 'hectares',                                   sub: 'réserve nature' },
                  { icon: Star,       val: '4.8',                                label: 'note moy.',                                  sub: 'satisfaction' },
                ].map(({ icon: I, val, label, sub }) => (
                  <div key={label} className="inline-flex items-center gap-2.5 bg-white/12 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 hover:bg-white/20 transition-colors">
                    <I className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-black leading-tight">{val} <span className="font-bold opacity-90">{label}</span></p>
                      <p className="text-[11px] text-emerald-200/80 leading-tight">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prochaine sortie mise en avant */}
              {nextOuting && (
                <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-3 mb-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-200 font-semibold">Prochaine sortie groupée</p>
                    <p className="text-sm font-black">{nextOuting.title}</p>
                  </div>
                  <button onClick={() => setActiveTab('agenda')} className="ml-2 text-xs font-bold text-white/70 hover:text-white flex items-center gap-1 transition-colors">
                    Rejoindre <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* CTA hero */}
            <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
              {profile ? (
                <button onClick={() => { setActiveTab('itineraires'); setShowForm(true); setTimeout(() => window.scrollTo({ top: 500, behavior:'smooth' }), 100); }}
                  className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 font-black px-7 py-3.5 rounded-2xl hover:bg-emerald-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-sm w-full lg:w-auto">
                  <Plus className="w-5 h-5" /> Partager un itinéraire
                </button>
              ) : (
                <Link href="/connexion"
                  className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 font-black px-7 py-3.5 rounded-2xl hover:bg-emerald-50 transition-all shadow-xl text-sm w-full lg:w-auto">
                  <Plus className="w-5 h-5" /> Partager un itinéraire
                </Link>
              )}
              <button onClick={() => { setActiveTab('agenda'); setTimeout(() => window.scrollTo({ top: 500, behavior:'smooth' }), 100); }}
                className="inline-flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white font-bold px-7 py-3 rounded-2xl hover:bg-white/25 transition-all text-sm w-full lg:w-auto">
                <Users className="w-4 h-4" /> Voir les sorties groupées
              </button>
              <button onClick={() => { setActiveTab('forum'); setTimeout(() => window.scrollTo({ top: 500, behavior:'smooth' }), 100); }}
                className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white/80 font-semibold px-7 py-3 rounded-2xl hover:bg-white/20 transition-all text-sm w-full lg:w-auto">
                <MessageSquare className="w-4 h-4" /> Échanges &amp; conseils
              </button>
            </div>
          </div>

          {/* ── Filtres rapides ── */}
          <div className="mt-8 pt-6 border-t border-white/15">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-emerald-200 uppercase tracking-widest">Je cherche…</p>
              {quickFilter && (
                <button onClick={() => setQuickFilter(null)} className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                  <X className="w-3 h-3" /> Tout afficher
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pb-6">
              {QUICK_FILTERS.map(f => (
                <button key={f.id}
                  onClick={() => { setQuickFilter(quickFilter === f.id ? null : f.id); setActiveTab('itineraires'); }}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-all border backdrop-blur-sm',
                    quickFilter === f.id
                      ? 'bg-white text-emerald-700 border-white shadow-lg shadow-black/20'
                      : 'bg-white/12 border-white/25 text-white hover:bg-white/22 hover:border-white/40'
                  )}
                >
                  <span>{f.emoji}</span> {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTENU PRINCIPAL — Layout 2 colonnes
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Barre filtres / navigation ── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Onglets */}
          <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm flex-shrink-0">
            {[
              { id: 'itineraires', label: 'Itinéraires',      icon: Footprints,    count: totalCount > 0 ? totalCount : undefined },
              { id: 'forum',       label: 'Échanges',         icon: MessageSquare, count: forumPosts.length > 0 ? forumPosts.length : undefined },
              { id: 'agenda',      label: 'Sorties groupées', icon: Users,         count: outings.length > 0 ? outings.length : undefined },
            ].map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all relative',
                  activeTab === id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50')}>
                <Icon className="w-4 h-4" /> {label}
                {count !== undefined && (
                  <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full', activeTab === id ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500')}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filtres (itinéraires seulement) */}
          {activeTab === 'itineraires' && (
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <SectorFilter value={filterSector} onChange={setFilterSector} showAll compact label="Secteur" />
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn('inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border transition-all',
                  showAdvanced || activeFiltersCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                <SlidersHorizontal className="w-4 h-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeFiltersCount}</span>
                )}
              </button>

              {/* Vue grid/list */}
              <div className="flex gap-0.5 bg-white rounded-xl border border-gray-100 p-0.5 ml-auto">
                <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                </button>
              </div>

              {activeFiltersCount > 0 && (
                <button onClick={() => { setQuickFilter(null); setAdvFilters({ dogs:false, stroller:false, parking:false, water:false, shade:false, sunset:false, loop:false, duration_max:'' }); setFilterSector(null); }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors border border-gray-200 rounded-xl px-3 py-2 bg-white hover:border-red-200 hover:bg-red-50">
                  <X className="w-3.5 h-3.5" /> Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Filtres avancés panel ── */}
        {showAdvanced && activeTab === 'itineraires' && (
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-500" /> Filtres avancés
              </h3>
              <button onClick={() => setShowAdvanced(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {[
                { key: 'dogs',     label: '🐕 Chiens acceptés',   cls: 'amber' },
                { key: 'stroller', label: '🍼 Poussette possible', cls: 'pink' },
                { key: 'parking',  label: '🅿️ Parking disponible', cls: 'blue' },
                { key: 'water',    label: '💧 Point d\'eau',       cls: 'sky' },
                { key: 'shade',    label: '🌳 Ombragé',            cls: 'green' },
                { key: 'sunset',   label: '🌅 Coucher de soleil',  cls: 'orange' },
                { key: 'loop',     label: '🔄 Circuit en boucle',  cls: 'gray' },
              ].map(({ key, label, cls }) => (
                <button key={key}
                  onClick={() => setAdvFilters(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                  className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                    advFilters[key as keyof typeof advFilters]
                      ? `bg-${cls}-100 text-${cls}-700 border-${cls}-300 shadow-sm`
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                  {label}
                </button>
              ))}
              <div className="col-span-2 sm:col-span-3 lg:col-span-1">
                <p className="text-xs font-semibold text-gray-500 mb-2">⏱️ Durée max</p>
                <div className="flex gap-1.5">
                  {[
                    { val: '30',  label: '30 min' },
                    { val: '60',  label: '1h' },
                    { val: '120', label: '2h' },
                  ].map(d => (
                    <button key={d.val}
                      onClick={() => setAdvFilters(f => ({ ...f, duration_max: f.duration_max === d.val ? '' : d.val }))}
                      className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all', advFilters.duration_max === d.val ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filtres actifs en pills */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-gray-400">Actifs :</span>
                {quickFilter && (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                    {QUICK_FILTERS.find(f => f.id === quickFilter)?.emoji} {QUICK_FILTERS.find(f => f.id === quickFilter)?.label}
                    <button onClick={() => setQuickFilter(null)} className="ml-0.5 hover:text-emerald-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {filterSector && (
                  <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full font-semibold">
                    <MapPin className="w-3 h-3" /> Secteur
                    <button onClick={() => setFilterSector(null)} className="ml-0.5 hover:text-teal-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {advFilters.duration_max && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
                    ⏱️ max {advFilters.duration_max} min
                    <button onClick={() => setAdvFilters(f => ({ ...f, duration_max: '' }))} className="ml-0.5 hover:text-purple-900"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            Layout 2 colonnes
        ───────────────────────────────────────────────────────────────────── */}
        <div className="flex gap-8">

          {/* ── COLONNE PRINCIPALE ── */}
          <div className="flex-1 min-w-0">

            {/* ═══════════════════════════════════════════
                TAB : ITINÉRAIRES
            ═══════════════════════════════════════════ */}
            {activeTab === 'itineraires' && (
              <div>
                {/* En-tête résultats + bouton ajouter */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">
                      {loadingPromenades ? 'Chargement…' : totalCount > 0 ? `${totalCount} itinéraire${totalCount > 1 ? 's' : ''}` : 'Itinéraires'}
                    </h2>
                    {activeFiltersCount > 0 && !loadingPromenades && (
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                        <Filter className="w-3 h-3" />{activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  {profile && (
                    <button onClick={() => setShowForm(!showForm)}
                      className={cn(
                        'inline-flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl transition-all text-sm shadow-sm',
                        showForm
                          ? 'bg-gray-100 text-gray-600 border border-gray-200'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200'
                      )}>
                      {showForm ? <><X className="w-4 h-4" /> Annuler</> : <><Plus className="w-4 h-4" /> Partager</>}
                    </button>
                  )}
                </div>

                {/* ── Formulaire ajout itinéraire ── */}
                {showForm && profile && (
                  <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-emerald-200 p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
                        <span className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">🌿</span>
                        Partager un itinéraire
                      </h3>
                      <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-4">
                      {/* Titre */}
                      <input type="text" placeholder="Titre de l'itinéraire *" required
                        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300" />

                      {/* Type + Difficulté */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Type d&apos;activité *</label>
                          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
                            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.emoji} {v.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Difficulté</label>
                          <div className="flex gap-1.5">
                            {(['facile','moyen','difficile'] as const).map(d => (
                              <button key={d} type="button" onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                                className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all',
                                  form.difficulty === d
                                    ? d === 'facile' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                      : d === 'moyen' ? 'bg-amber-400 text-white border-amber-400 shadow-sm'
                                      : 'bg-red-500 text-white border-red-500 shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                                {d === 'facile' ? '🟢' : d === 'moyen' ? '🟡' : '🔴'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Distance + Durée */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Distance (km)</label>
                          <input type="number" step="0.1" min="0" placeholder="ex: 3.5"
                            value={form.distance_km} onChange={e => setForm(f => ({ ...f, distance_km: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Durée (min)</label>
                          <input type="number" min="0" placeholder="ex: 45"
                            value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                        </div>
                      </div>

                      {/* Point de départ */}
                      <input type="text" placeholder="Point de départ / RDV (ex: parking du lac de Biguglia)"
                        value={form.start_point} onChange={e => setForm(f => ({ ...f, start_point: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />

                      {/* Description */}
                      <textarea placeholder="Description : points d'intérêt, ambiance, panoramas, conseils pratiques…" required
                        rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" />

                      {/* Caractéristiques */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">Caractéristiques du parcours</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { key: 'dogs_allowed',      label: '🐕 Chiens acceptés',    cls: 'amber' },
                            { key: 'stroller_friendly', label: '🍼 Poussette possible',  cls: 'pink' },
                            { key: 'parking_available', label: '🅿️ Parking disponible',  cls: 'blue' },
                            { key: 'water_access',      label: '💧 Point d\'eau',        cls: 'sky' },
                            { key: 'route_loop',        label: '🔄 Circuit en boucle',   cls: 'gray' },
                          ].map(({ key, label, cls }) => (
                            <button key={key} type="button"
                              onClick={() => setForm(f => ({ ...f, [key]: !(f as Record<string, unknown>)[key] }))}
                              className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                                (form as Record<string, unknown>)[key]
                                  ? `bg-${cls}-100 text-${cls}-700 border-${cls}-300 shadow-sm`
                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ombre */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">Niveau d&apos;ombre</label>
                        <div className="flex gap-2">
                          {([
                            { val: 'none',    label: '☀️ Exposé' },
                            { val: 'partial', label: '⛅ Partiel' },
                            { val: 'full',    label: '🌳 Ombragé' },
                          ] as const).map(s => (
                            <button key={s.val} type="button" onClick={() => setForm(f => ({ ...f, shade_level: s.val }))}
                              className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', form.shade_level === s.val ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Meilleur moment */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">Meilleur moment de la journée</label>
                        <div className="flex gap-2">
                          {([
                            { val: 'morning', label: '🌄 Matin' },
                            { val: 'anytime', label: '🕑 Toute heure' },
                            { val: 'sunset',  label: '🌅 Coucher soleil' },
                          ] as const).map(t => (
                            <button key={t.val} type="button" onClick={() => setForm(f => ({ ...f, best_time_of_day: t.val }))}
                              className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', form.best_time_of_day === t.val ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Conseils pratiques */}
                      <textarea placeholder="Conseils pratiques : équipement recommandé, parking, horaires, accès transport…"
                        rows={2} value={form.practical_tips} onChange={e => setForm(f => ({ ...f, practical_tips: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" />

                      {/* Notes sécurité */}
                      <textarea placeholder="⚠️ Notes de sécurité : passages délicats, zones sensibles, vigilance particulière…"
                        rows={2} value={form.safety_notes} onChange={e => setForm(f => ({ ...f, safety_notes: e.target.value }))}
                        className="w-full border border-orange-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50/30" />

                      {/* Tags */}
                      <input type="text" placeholder="Tags (séparés par virgules) : ex: étang, coucher-soleil, chien, famille"
                        value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />

                      {/* Photos */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">Photos (max 5) — partagez les plus beaux points du parcours</label>
                        <div className="flex gap-2 flex-wrap">
                          {photos.map((file, i) => {
                            const url = URL.createObjectURL(file);
                            return (
                              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                          {photos.length < 5 && (
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                              className="w-20 h-20 rounded-xl border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-emerald-400 hover:bg-emerald-50 hover:border-emerald-400 transition-all">
                              <Camera className="w-5 h-5" /><span className="text-xs mt-1">Photo</span>
                            </button>
                          )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                          onChange={e => { const files = Array.from(e.target.files || []); setPhotos(prev => [...prev, ...files].slice(0, 5)); }} />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-5 pt-5 border-t border-gray-100">
                      <button type="submit" disabled={submitting}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all shadow-sm shadow-emerald-200">
                        {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication…</> : '🌿 Publier l\'itinéraire'}
                      </button>
                      <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200">Annuler</button>
                    </div>
                  </form>
                )}

                {/* ── Grille itinéraires ── */}
                {loadingPromenades ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                        <TreePine className="w-8 h-8 text-emerald-400" />
                      </div>
                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin absolute -right-1 -bottom-1" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Chargement des itinéraires…</p>
                  </div>
                ) : promenades.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <TreePine className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-600 font-bold mb-1 text-lg">
                      {activeFiltersCount > 0 ? 'Aucun itinéraire pour ces filtres' : 'Aucun itinéraire partagé'}
                    </p>
                    <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                      {activeFiltersCount > 0 ? 'Essayez d\'élargir vos critères ou explorez tous les itinéraires.' : 'Soyez le premier à partager une belle balade autour de Biguglia !'}
                    </p>
                    {activeFiltersCount > 0 ? (
                      <button onClick={() => { setQuickFilter(null); setAdvFilters({ dogs:false, stroller:false, parking:false, water:false, shade:false, sunset:false, loop:false, duration_max:'' }); setFilterSector(null); }}
                        className="inline-flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline bg-emerald-50 px-5 py-2.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors">
                        <RefreshCw className="w-4 h-4" /> Effacer les filtres
                      </button>
                    ) : profile ? (
                      <button onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm">
                        <Plus className="w-4 h-4" /> Partager un itinéraire
                      </button>
                    ) : (
                      <Link href="/connexion"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm">
                        Se connecter pour contribuer
                      </Link>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {promenades.map(p => (
                      <PromenadeCard key={p.id} p={p} userId={profile?.id} onLike={handleLike} />
                    ))}
                  </div>
                ) : (
                  /* Vue liste */
                  <div className="space-y-3">
                    {promenades.map(p => {
                      const type = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.balade;
                      const TypeIcon = type.icon;
                      const diff = DIFF_CONFIG[p.difficulty];
                      const firstPhoto = p.photos?.[0]?.url;
                      return (
                        <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex gap-0">
                          {/* Miniature */}
                          <div className={`relative w-24 h-24 flex-shrink-0 ${firstPhoto ? '' : `bg-gradient-to-br ${type.gradient}`} flex items-center justify-center`}>
                            {firstPhoto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <TypeIcon className="w-8 h-8 text-white opacity-40" />
                            )}
                          </div>
                          {/* Infos */}
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{p.title}</h3>
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0', diff.color)}>{diff.icon} {diff.label}</span>
                              </div>
                              <p className="text-xs text-gray-400 line-clamp-1">{p.description}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              {p.distance_km != null && <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.distance_km} km</span>}
                              {p.duration_min != null && <span className="text-xs font-semibold text-sky-600 flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDuration(p.duration_min)}</span>}
                              <button onClick={() => profile && handleLike(p.id, !!p.user_liked)} className={cn('ml-auto flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border transition-all', p.user_liked ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-gray-50 text-gray-400 border-gray-100')}>
                                <Heart className={cn('w-3 h-3', p.user_liked ? 'fill-current' : '')} />{p.likes_count || 0}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════
                TAB : FORUM
            ═══════════════════════════════════════════ */}
            {activeTab === 'forum' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Échanges &amp; conseils nature</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Partagez vos expériences, posez des questions, donnez des tuyaux</p>
                  </div>
                  {profile && (
                    <button onClick={() => setShowPostForm(!showPostForm)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all text-sm shadow-sm">
                      <Plus className="w-4 h-4" /> Nouveau sujet
                    </button>
                  )}
                </div>

                {showPostForm && profile && (
                  <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-500" /> Nouveau sujet
                      </h3>
                      <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
                    </div>
                    <input type="text" placeholder="Titre du sujet *" required
                      value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    <textarea placeholder="Votre message, question ou conseil de randonneur local…" rows={4}
                      value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" required />
                    <div className="flex gap-2 mt-3">
                      <button type="submit" disabled={submittingPost}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all shadow-sm">
                        {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication…</> : 'Publier'}
                      </button>
                      <button type="button" onClick={() => setShowPostForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200">Annuler</button>
                    </div>
                  </form>
                )}

                {loadingForum ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
                ) : !forumCategoryId ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <MessageSquare className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="font-bold text-emerald-800 mb-1 text-lg">Forum en cours d&apos;activation</p>
                    <p className="text-emerald-700 text-sm mb-5">Exécutez <code className="bg-emerald-100 px-1 rounded font-mono text-xs">migration_themes.sql</code> dans Supabase pour activer ce forum.</p>
                    {profile && (
                      <Link href="/forum/nouveau" className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                        <Plus className="w-4 h-4" /> Poster dans le forum général
                      </Link>
                    )}
                  </div>
                ) : forumPosts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-600 font-bold mb-1">Aucun échange pour l&apos;instant</p>
                    <p className="text-gray-400 text-sm mb-5">Posez une question ou partagez votre expérience de randonneur !</p>
                    {profile && (
                      <button onClick={() => setShowPostForm(true)} className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                        <Plus className="w-4 h-4" /> Premier message
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {forumPosts.map(post => {
                      const comments = (post.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0;
                      const isHot = comments >= 5;
                      return (
                        <Link key={post.id} href={`/forum/${post.id}`}
                          className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 hover:shadow-sm transition-all group">
                          <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm', isHot ? 'bg-amber-100' : 'bg-emerald-50')}>
                            <MessageSquare className={cn('w-5 h-5', isHot ? 'text-amber-500' : 'text-emerald-400')} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1 flex-1">{post.title}</h3>
                              {isHot && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black flex-shrink-0">🔥 Actif</span>}
                            </div>
                            <p className="text-gray-500 text-sm mb-2 line-clamp-1">{post.content}</p>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span className="flex items-center gap-1.5">
                                {post.author && <Avatar src={post.author.avatar_url} name={post.author.full_name} size="xs" />}
                                {post.author?.full_name ?? 'Membre'} · {formatRelative(post.created_at)}
                              </span>
                              <span className="flex items-center gap-1 font-semibold">
                                <MessageSquare className="w-3 h-3" />
                                {comments} réponse{comments > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 flex-shrink-0 mt-1 transition-colors" />
                        </Link>
                      );
                    })}
                  </div>
                )}
                {!profile && (
                  <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                    <p className="text-emerald-800 font-bold mb-1">Rejoignez la communauté</p>
                    <p className="text-emerald-700 text-sm mb-4">Connectez-vous pour participer aux échanges et partager votre expérience.</p>
                    <Link href="/connexion" className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                      Se connecter
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════
                TAB : SORTIES GROUPÉES
            ═══════════════════════════════════════════ */}
            {activeTab === 'agenda' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Sorties groupées &amp; rendez-vous nature</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Rejoignez ou organisez des sorties avec les habitants de Biguglia</p>
                  </div>
                  {profile && (
                    <button onClick={() => { resetOutingForm(); setShowOutingForm(!showOutingForm); }}
                      className={cn('inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all',
                        showOutingForm
                          ? 'bg-gray-100 text-gray-600 border border-gray-200'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-sm shadow-emerald-200'
                      )}>
                      <Plus className="w-4 h-4" /> {showOutingForm ? 'Annuler' : 'Créer une sortie'}
                    </button>
                  )}
                </div>

                {showOutingForm && profile && (
                  <form onSubmit={handleOutingSubmit} className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-base">{editingOuting ? '✏️' : '🥾'}</span>
                        {editingOuting ? 'Modifier la sortie' : 'Organiser une sortie groupée'}
                      </h3>
                      <button type="button" onClick={resetOutingForm} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-3">
                      <input type="text" placeholder="Titre de la sortie *" required
                        value={outingForm.title} onChange={e => setOutingForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Date *</label>
                          <input type="date" required value={outingForm.outing_date} min={new Date().toISOString().split('T')[0]}
                            onChange={e => setOutingForm(f => ({ ...f, outing_date: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Heure de départ</label>
                          <input type="time" value={outingForm.outing_time}
                            onChange={e => setOutingForm(f => ({ ...f, outing_time: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Niveau de difficulté</label>
                        <div className="flex gap-2">
                          {(['facile','moyen','difficile'] as const).map(d => (
                            <button key={d} type="button" onClick={() => setOutingForm(f => ({ ...f, difficulty: d }))}
                              className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all',
                                outingForm.difficulty === d
                                  ? d === 'facile' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : d === 'moyen' ? 'bg-amber-400 text-white border-amber-400 shadow-sm' : 'bg-red-500 text-white border-red-500 shadow-sm'
                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                              {d === 'facile' ? '🟢 Facile' : d === 'moyen' ? '🟡 Moyen' : '🔴 Difficile'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input type="text" placeholder="Point de rendez-vous (lieu précis, adresse…)"
                        value={outingForm.meeting_point} onChange={e => setOutingForm(f => ({ ...f, meeting_point: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Participants maximum</label>
                        <input type="number" min="2" max="100" value={outingForm.max_participants}
                          onChange={e => setOutingForm(f => ({ ...f, max_participants: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">Options de la sortie</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'parking_available',  label: '🅿️ Parking',      cls: 'blue' },
                            { key: 'stroller_accessible', label: '🍼 Poussette',    cls: 'pink' },
                            { key: 'kids_friendly',       label: '👶 Enfants OK',   cls: 'sky' },
                            { key: 'dogs_allowed',        label: '🐕 Chiens OK',    cls: 'amber' },
                          ].map(({ key, label, cls }) => (
                            <button key={key} type="button"
                              onClick={() => setOutingForm(f => ({ ...f, [key]: !(f as Record<string, unknown>)[key] }))}
                              className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                                (outingForm as Record<string, unknown>)[key]
                                  ? `bg-${cls}-100 text-${cls}-700 border-${cls}-300 shadow-sm`
                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {outingForm.parking_available && (
                        <input type="text" placeholder="Infos parking (ex: route forestière, 500m du départ)" value={outingForm.parking_info}
                          onChange={e => setOutingForm(f => ({ ...f, parking_info: e.target.value }))}
                          className="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-blue-50/40" />
                      )}
                      <textarea placeholder="Description : itinéraire, points d'intérêt, équipement recommandé, conseils…" rows={3}
                        value={outingForm.description} onChange={e => setOutingForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2">Photos (max 3)</label>
                        <div className="flex gap-2 flex-wrap">
                          {outingPreviews.map((src, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt="" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeOutingPhoto(i)}
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {outingPhotos.length < 3 && (
                            <button type="button" onClick={() => outingPhotoRef.current?.click()}
                              className="w-20 h-20 rounded-xl border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-emerald-400 hover:bg-emerald-50 hover:border-emerald-400 transition-all">
                              <Camera className="w-5 h-5" /><span className="text-xs mt-1">Photo</span>
                            </button>
                          )}
                        </div>
                        <input ref={outingPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleOutingPhotoSelect} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button type="submit" disabled={submittingOuting}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all shadow-sm">
                        {submittingOuting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {editingOuting ? 'Modification…' : 'Création…'}</> : editingOuting ? '✓ Enregistrer' : '🥾 Créer la sortie'}
                      </button>
                      <button type="button" onClick={resetOutingForm} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200">Annuler</button>
                    </div>
                  </form>
                )}

                {loadingOutings ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
                ) : outings.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-emerald-300" />
                    </div>
                    <p className="text-gray-600 font-bold mb-1 text-lg">Aucune sortie groupée prévue</p>
                    <p className="text-gray-400 text-sm mb-6">Organisez la première sortie et invitez les habitants à vous rejoindre !</p>
                    {profile ? (
                      <button onClick={() => setShowOutingForm(true)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm">
                        <Plus className="w-4 h-4" /> Organiser une sortie
                      </button>
                    ) : (
                      <Link href="/connexion" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm">
                        Se connecter pour créer une sortie
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {outings.map(outing => (
                      <OutingCard key={outing.id} outing={outing} userId={profile?.id}
                        isOrganizer={profile?.id === outing.organizer_id}
                        onJoin={handleJoinOuting} onEdit={startEditOuting}
                        onDelete={handleDeleteOuting} onStatusChange={handleOutingStatusChange} />
                    ))}
                  </div>
                )}
                {!profile && outings.length > 0 && (
                  <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                    <p className="text-emerald-800 font-bold mb-1">Rejoignez la communauté rando</p>
                    <p className="text-emerald-700 text-sm mb-4">Connectez-vous pour rejoindre ou créer une sortie groupée.</p>
                    <Link href="/connexion" className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                      Se connecter
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              SIDEBAR COMMUNAUTÉ (desktop only)
          ══════════════════════════════════════════════ */}
          <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

            {/* 🌿 Réserve naturelle spotlight */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-600 p-5 text-white shadow-lg">
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    <TreePine className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-200 font-semibold">🏆 Incontournable</p>
                    <h3 className="text-sm font-black">Étang de Biguglia</h3>
                  </div>
                </div>
                <p className="text-emerald-100 text-xs leading-relaxed mb-3">
                  Réserve naturelle classée, 1 456 ha. Sentier découverte, observation oiseaux migrateurs, coucher de soleil exceptionnel sur le lagon.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['🦅 Oiseaux', '🌅 Sunset', '🚶 Sentier', '🐕 Chiens OK'].map(t => (
                    <span key={t} className="text-[11px] bg-white/18 border border-white/25 rounded-full px-2.5 py-0.5 font-semibold">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-500" /> Actions rapides
              </h3>
              <div className="space-y-1.5">
                {[
                  { onClick: () => { setActiveTab('itineraires'); setShowForm(true); }, icon: Plus, label: 'Partager un itinéraire', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { onClick: () => { setActiveTab('agenda'); setShowOutingForm(true); }, icon: Users, label: 'Organiser une sortie', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
                  { onClick: () => { setActiveTab('forum'); setShowPostForm(true); }, icon: MessageSquare, label: 'Poser une question', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
                  { href: '/recherche?q=promenade', icon: Search, label: 'Rechercher une balade', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                ].map(({ onClick, href, icon: I, label, color, bg, border }) =>
                  href ? (
                    <Link key={label} href={href}
                      className={cn('flex items-center gap-3 p-3 rounded-xl transition-all group border', bg, border, 'hover:shadow-sm')}>
                      <I className={cn('w-4 h-4 flex-shrink-0', color)} />
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 flex-1">{label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </Link>
                  ) : (
                    <button key={label} onClick={() => { if (!profile) { window.location.href = '/connexion'; return; } onClick?.(); }}
                      className={cn('flex items-center gap-3 p-3 rounded-xl transition-all group border w-full text-left', bg, border, 'hover:shadow-sm')}>
                      <I className={cn('w-4 h-4 flex-shrink-0', color)} />
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 flex-1">{label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Explorer par type */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                <Map className="w-4 h-4 text-emerald-500" /> Explorer par type
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const isActive = quickFilter === key && activeTab === 'itineraires';
                  return (
                    <button key={key}
                      onClick={() => { setActiveTab('itineraires'); setQuickFilter(quickFilter === key ? null : key); }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center hover:shadow-sm',
                        isActive ? cn(cfg.bg, cfg.border, cfg.color, 'shadow-sm') : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200'
                      )}>
                      <span className="text-xl leading-none">{cfg.emoji}</span>
                      <span className="text-[11px] font-bold leading-tight">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conseils saisonniers */}
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-amber-800 mb-3 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" /> Conseils de saison
              </h3>
              <div className="space-y-2.5">
                {[
                  { icon: Thermometer, text: 'Partez tôt le matin en été pour éviter la chaleur' },
                  { icon: Droplets,    text: 'Emportez min. 1.5L d\'eau par personne par sortie' },
                  { icon: Wind,        text: 'Vérifiez les prévisions météo avant de partir' },
                  { icon: CloudRain,   text: 'Après la pluie, certains sentiers peuvent être glissants' },
                ].map(({ icon: I, text }) => (
                  <div key={text} className="flex items-start gap-2">
                    <I className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sécurité randonnée */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" /> Sécurité en randonnée
              </h3>
              <ul className="space-y-2">
                {[
                  'Prévenez un proche avant une sortie longue',
                  'Chargez votre téléphone avant de partir',
                  'Portez des chaussures adaptées au terrain',
                  'Respectez les zones protégées et la faune',
                  'En cas de problème : 15, 17, 18 ou 112',
                ].map(c => (
                  <li key={c} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />{c}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA contribuer */}
            {!profile && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black mb-1">Contribuez à la carte</h3>
                <p className="text-xs text-emerald-100 mb-4 leading-relaxed">Partagez vos balades préférées et aidez les habitants à découvrir Biguglia.</p>
                <Link href="/connexion"
                  className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-emerald-50 transition-all w-full justify-center shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Se connecter &amp; contribuer
                </Link>
              </div>
            )}

            {/* Statistiques communauté */}
            {profile && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Communauté active
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: Footprints, label: `${totalCount} itinéraire${totalCount !== 1 ? 's' : ''}`, sub: 'partagés', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { icon: Users, label: `${outings.length} sortie${outings.length !== 1 ? 's' : ''}`, sub: 'à venir', color: 'text-teal-500', bg: 'bg-teal-50' },
                    { icon: MessageSquare, label: `${forumPosts.length} échange${forumPosts.length !== 1 ? 's' : ''}`, sub: 'dans le forum', color: 'text-sky-500', bg: 'bg-sky-50' },
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
            )}

          </aside>
        </div>
      </div>
    </div>
  );
}
