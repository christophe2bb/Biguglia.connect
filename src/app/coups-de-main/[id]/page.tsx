'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Clock, Calendar, Users, Heart, MessageSquare,
  Send, Share2, Bookmark, BookmarkCheck, Shield, CheckCircle2,
  Pause, Play, Loader2, AlertCircle, ExternalLink, Phone,
  Handshake, HandHeart, Truck, ShoppingCart, Wrench, Trees, Baby,
  Computer, Dog, Car, Package, HelpCircle, Pencil, Trash2, Check,
  ChevronRight, Flame, X, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import GlobalTrustBadge from '@/components/ui/TrustBadge';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';
import { SectorBadge } from '@/components/ui/SectorFilter';

// ─── Types (copied from parent page) ─────────────────────────────────────────
type HelpType = 'demande' | 'offre' | 'echange';
type UrgencyLevel = 'flexible' | 'cette_semaine' | 'rapidement' | 'urgent';
type Duration = '15min' | '30min' | '1h' | '2h' | 'demi_journee' | 'journee' | 'variable';
type Compensation = 'gratuit' | 'cafe' | 'echange' | 'frais' | 'discuter';
type HelpStatus = 'active' | 'in_progress' | 'paused' | 'resolved' | 'closed' | 'archived' | 'draft';

type HelpRequest = {
  id: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string; created_at?: string } | null;
  help_type: HelpType;
  status: HelpStatus;
  title: string;
  category: string;
  description: string;
  urgency: UrgencyLevel;
  help_date: string | null;
  help_time: string | null;
  sector_id?: string | null;
  location_area: string;
  location_city: string;
  location_detail: string | null;
  duration: Duration;
  persons_needed: number;
  compensation: Compensation;
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
  resolved_at?: string | null;
};

type HelpComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { id?: string; full_name?: string; avatar_url?: string } | null;
};

type HelpParticipant = {
  id: string;
  user_id: string;
  role: string;
  state: string;
  message: string | null;
  created_at: string;
  user?: { full_name?: string; avatar_url?: string } | null;
};

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<HelpType, { label: string; emoji: string; color: string; bg: string; border: string; gradient: string }> = {
  demande: { label: "Demande d'aide", emoji: '🙋', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', gradient: 'from-orange-500 to-amber-500' },
  offre:   { label: "Offre d'aide",   emoji: '🤝', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', gradient: 'from-emerald-500 to-teal-500' },
  echange: { label: "Échange de services", emoji: '🔄', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300', gradient: 'from-blue-500 to-indigo-500' },
};

const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; color: string; bg: string; dotColor: string }> = {
  flexible:      { label: 'Flexible',            color: 'text-gray-600',  bg: 'bg-gray-100',  dotColor: 'bg-gray-400' },
  cette_semaine: { label: 'Cette semaine',        color: 'text-blue-600',  bg: 'bg-blue-100',  dotColor: 'bg-blue-500' },
  rapidement:    { label: 'Rapidement',           color: 'text-amber-600', bg: 'bg-amber-100', dotColor: 'bg-amber-500' },
  urgent:        { label: "Aujourd'hui / urgent", color: 'text-red-600',   bg: 'bg-red-100',   dotColor: 'bg-red-500' },
};

const DURATION_LABELS: Record<Duration, string> = {
  '15min': '15 min', '30min': '30 min', '1h': '1 heure', '2h': '2 heures',
  'demi_journee': 'Demi-journée', 'journee': 'Journée', 'variable': 'Variable',
};

const COMP_CONFIG: Record<Compensation, { label: string; emoji: string }> = {
  gratuit:  { label: 'Gratuit / entraide pure',         emoji: '💚' },
  cafe:     { label: 'Café / apéro / merci symbolique', emoji: '☕' },
  echange:  { label: 'Échange de service',              emoji: '🔄' },
  frais:    { label: 'Petite participation aux frais',  emoji: '💶' },
  discuter: { label: 'À discuter',                      emoji: '💬' },
};

const CAT_CONFIG: Record<string, { label: string; icon: React.ElementType; emoji: string }> = {
  demenagement:    { label: 'Déménagement',    icon: Truck,        emoji: '🚛' },
  courses:         { label: 'Courses',         icon: ShoppingCart, emoji: '🛒' },
  bricolage:       { label: 'Bricolage',       icon: Wrench,       emoji: '🔧' },
  jardin:          { label: 'Jardin',          icon: Trees,        emoji: '🌿' },
  garde:           { label: 'Garde',           icon: Baby,         emoji: '👶' },
  admin_numerique: { label: 'Admin / numérique', icon: Computer,   emoji: '💻' },
  visite:          { label: 'Visite',          icon: Heart,        emoji: '💙' },
  animaux:         { label: 'Animaux',         icon: Dog,          emoji: '🐾' },
  vehicule:        { label: 'Véhicule',        icon: Car,          emoji: '🚗' },
  livraison:       { label: 'Livraison',       icon: Package,      emoji: '📦' },
  depannage:       { label: 'Dépannage',       icon: HelpCircle,   emoji: '🔌' },
  autre:           { label: 'Autre',           icon: HandHeart,    emoji: '🤗' },
};

function getDisplayName(author: HelpRequest['author'], mode: string): string {
  if (!author?.full_name) return 'Membre';
  const parts = author.full_name.trim().split(' ');
  if (mode === 'prenom') return parts[0];
  if (mode === 'prenom_initiale') return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  return author.full_name;
}

// ─── Page détail ─────────────────────────────────────────────────────────────
export default function HelpRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  const [item, setItem] = useState<HelpRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState<HelpComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const [participants, setParticipants] = useState<HelpParticipant[]>([]);
  const [loadingPart, setLoadingPart] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const [isSaved, setIsSaved] = useState(false);
  const [helping, setHelping] = useState(false);
  const [alreadyHelping, setAlreadyHelping] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Load saved state
  useEffect(() => {
    try {
      const raw = localStorage.getItem('biguglia_saved_help');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setIsSaved(ids.includes(id));
    } catch { /* noop */ }
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [id]);

  // Fetch item
  const fetchItem = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('help_requests')
      .select(`*, author:profiles(full_name, avatar_url, created_at), photos:help_photos(url, display_order, caption)`)
      .eq('id', id)
      .single();
    if (error || !data) { setNotFound(true); setLoading(false); return; }
    setItem(data as HelpRequest);
    setLoading(false);
  }, [id, supabase]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    const { data } = await supabase.from('help_comments')
      .select('id, content, created_at, author:profiles(id, full_name, avatar_url)')
      .eq('help_id', id).order('created_at', { ascending: true }).limit(100);
    setComments((data ?? []) as HelpComment[]);
    setLoadingComments(false);
  }, [id, supabase]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    setLoadingPart(true);
    const { data } = await supabase.from('help_request_participants')
      .select('id, user_id, role, state, message, created_at, user:profiles(full_name, avatar_url)')
      .eq('help_request_id', id).order('created_at', { ascending: true });
    setParticipants((data ?? []) as HelpParticipant[]);
    if (profile) {
      const mine = (data ?? []).find((p: { user_id: string }) => p.user_id === profile.id);
      setAlreadyHelping(!!mine);
    }
    setLoadingPart(false);
  }, [id, supabase, profile]);

  useEffect(() => {
    fetchItem();
    fetchComments();
    fetchParticipants();
  }, [fetchItem, fetchComments, fetchParticipants]);

  const handleSendComment = async () => {
    if (!commentText.trim() || !profile || sendingComment) return;
    setSendingComment(true);
    const { error } = await supabase.from('help_comments').insert({ help_id: id, author_id: profile.id, content: commentText.trim() });
    if (error) toast.error('Erreur : ' + error.message);
    else { setCommentText(''); fetchComments(); }
    setSendingComment(false);
  };

  const handleCanHelp = async () => {
    if (!profile) { toast.error('Connectez-vous'); router.push('/connexion'); return; }
    if (alreadyHelping) { toast('Vous avez déjà proposé votre aide !', { icon: '✅' }); return; }
    setHelping(true);
    const { error } = await supabase.from('help_request_participants').upsert(
      { help_request_id: id, user_id: profile.id, role: 'helper', state: 'pending' },
      { onConflict: 'help_request_id,user_id' }
    );
    if (error && !error.message.includes('duplicate')) toast.error('Erreur : ' + error.message);
    else { toast.success('✅ Votre aide a été proposée !', { duration: 4000 }); setAlreadyHelping(true); fetchParticipants(); }
    setHelping(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!item) return;
    const { error } = await supabase.from('help_requests').update({
      status: newStatus,
      ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
    }).eq('id', id);
    if (error) toast.error('Erreur statut : ' + error.message);
    else { toast.success(`Statut mis à jour`); fetchItem(); }
  };

  const toggleSave = () => {
    try {
      const raw = localStorage.getItem('biguglia_saved_help');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      const next = isSaved ? ids.filter(x => x !== id) : [...ids, id];
      localStorage.setItem('biguglia_saved_help', JSON.stringify(next));
      setIsSaved(!isSaved);
      toast(isSaved ? 'Retiré des favoris' : '⭐ Ajouté aux favoris', { icon: isSaved ? '🔖' : '⭐' });
    } catch { /* noop */ }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = item ? encodeURIComponent(`${TYPE_CONFIG[item.help_type]?.emoji ?? ''} ${item.title}\n${shareUrl}`) : '';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
      <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
    </div>
  );

  if (notFound || !item) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white gap-4">
      <AlertCircle className="w-12 h-12 text-gray-300" />
      <p className="text-gray-600 font-bold text-lg">Annonce introuvable</p>
      <p className="text-gray-400 text-sm">Elle a peut-être été supprimée ou n&apos;existe pas.</p>
      <Link href="/coups-de-main" className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-all">
        <ArrowLeft className="w-4 h-4" /> Retour aux annonces
      </Link>
    </div>
  );

  const typeConf = TYPE_CONFIG[item.help_type] ?? TYPE_CONFIG.demande;
  const urgConf  = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.flexible;
  const catConf  = CAT_CONFIG[item.category] ?? CAT_CONFIG.autre;
  const CatIcon  = catConf.icon;
  const allPhotos = toPhotoItems(item.photos ?? []);
  const isAuthor  = profile?.id === item.author_id;
  const displayName = getDisplayName(item.author, item.display_name);
  const isUrgent  = item.urgency === 'urgent';
  const isActive  = item.status === 'active';
  const isResolved = item.status === 'resolved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* ── Navigation ── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Link href="/coups-de-main"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-orange-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour aux annonces</span>
            <span className="sm:hidden">Retour</span>
          </Link>

          {/* Actions sticky */}
          <div className="flex items-center gap-2">
            {/* Favori */}
            <button type="button" onClick={toggleSave}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 transition-all">
              {isSaved ? <BookmarkCheck className="w-4 h-4 text-amber-500" /> : <Bookmark className="w-4 h-4 text-gray-500" />}
            </button>
            {/* Partager */}
            <div ref={shareRef} className="relative">
              <button type="button" onClick={() => setOpenShare(!openShare)}
                className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all">
                <Share2 className="w-4 h-4 text-gray-500" />
              </button>
              {openShare && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-40 overflow-hidden">
                  <button type="button" onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">💬 Par SMS</button>
                  <button type="button" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">📧 Par Email</button>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success('Lien copié !'); setOpenShare(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">🔗 Copier lien</button>
                </div>
              )}
            </div>
            {/* Signaler */}
            {profile && !isAuthor && (
              <ReportButton targetType="help_request" targetId={item.id} targetTitle={item.title} variant="mini" />
            )}
            {/* Modifier / supprimer auteur */}
            {isAuthor && (
              <Link href="/coups-de-main"
                className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 transition-all">
                <Pencil className="w-4 h-4 text-blue-500" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">

          {/* ── COLONNE PRINCIPALE ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ── HEADER ANNONCE ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Bandeau urgent */}
              {isUrgent && isActive && (
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-black px-5 py-2.5 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  URGENT — Aide recherchée aujourd&apos;hui
                </div>
              )}

              {/* Galerie photos */}
              {allPhotos.length > 0 ? (
                <div className="relative">
                  <button type="button" onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}
                    className="w-full aspect-video overflow-hidden block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={allPhotos[0].url} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </button>
                  {allPhotos.length > 1 && (
                    <div className="flex gap-2 p-4 pt-2 overflow-x-auto">
                      {allPhotos.slice(1).map((ph, i) => (
                        <button key={i} type="button" onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }}
                          className="flex-shrink-0 focus:outline-none">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ph.url} alt="" className="h-16 w-24 object-cover rounded-lg border border-gray-100 hover:border-orange-300 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`${typeConf.bg} w-full h-40 flex items-center justify-center`}>
                  <CatIcon className={`w-20 h-20 opacity-15 ${typeConf.color}`} />
                </div>
              )}

              {/* Infos titre */}
              <div className="p-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-black px-3 py-1.5 rounded-full ${
                    item.help_type === 'demande' ? 'bg-orange-500 text-white' :
                    item.help_type === 'offre'   ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                  }`}>{typeConf.emoji} {typeConf.label}</span>

                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${urgConf.bg} ${urgConf.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${urgConf.dotColor}`} />
                    {urgConf.label}
                  </span>

                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600`}>
                    {catConf.emoji} {catConf.label}
                  </span>

                  <StatusBadge status={item.status === 'active' ? 'open' : item.status} contentType="help_request" size="sm" showIcon showDot />
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3 leading-tight">{item.title}</h1>

                {/* Auteur */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black text-white flex-shrink-0"
                    style={{ background: item.help_type === 'demande' ? 'linear-gradient(135deg,#f97316,#fb923c)' : item.help_type === 'offre' ? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}>
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{displayName}</p>
                    <p className="text-xs text-gray-400">{formatRelative(item.created_at)}</p>
                  </div>
                  {item.author?.created_at && (
                    <div className="ml-auto">
                      <GlobalTrustBadge profile={{ created_at: item.author.created_at, role: 'resident' }} variant="mini" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{item.description}</p>
              </div>
            </div>

            {/* ── INFOS PRATIQUES ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-black text-gray-800 mb-4">Informations pratiques</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Localisation */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Lieu</p>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" /> {item.location_area}
                  </p>
                  {item.location_detail && <p className="text-xs text-gray-500">{item.location_detail}</p>}
                  {item.sector_id && (
                    <div className="mt-1"><SectorBadge sectorId={item.sector_id} size="sm" /></div>
                  )}
                </div>
                {/* Date */}
                {item.help_date && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Date souhaitée</p>
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      {new Date(item.help_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {item.help_time && <span className="text-gray-500"> · {item.help_time}</span>}
                    </p>
                  </div>
                )}
                {/* Durée */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Durée estimée</p>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" /> {DURATION_LABELS[item.duration] ?? item.duration}
                  </p>
                </div>
                {/* Personnes */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Personnes</p>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {item.persons_needed} personne{item.persons_needed > 1 ? 's' : ''}
                  </p>
                </div>
                {/* Compensation */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Contrepartie</p>
                  <p className="text-sm font-bold text-gray-700">
                    {COMP_CONFIG[item.compensation]?.emoji} {COMP_CONFIG[item.compensation]?.label}
                  </p>
                  {item.compensation_detail && <p className="text-xs text-gray-500">{item.compensation_detail}</p>}
                </div>
                {/* Pour qui */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Pour qui</p>
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-400 flex-shrink-0" /> {item.for_who}
                  </p>
                </div>
              </div>

              {/* Matériel */}
              {item.equipment?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Matériel nécessaire</p>
                  <div className="flex flex-wrap gap-2">
                    {item.equipment.map(e => (
                      <span key={e} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-semibold">🔧 {e}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditions */}
              {item.conditions?.length > 0 && item.conditions[0] !== 'Rien de particulier' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Conditions / précautions</p>
                  <div className="flex flex-wrap gap-2">
                    {item.conditions.map(c => (
                      <span key={c} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── HELPERS ── */}
            {(isAuthor || participants.length > 0) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-emerald-500" />
                  Personnes disponibles pour aider ({participants.filter(p => p.role === 'helper').length})
                </h2>
                {loadingPart ? (
                  <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                ) : participants.filter(p => p.role === 'helper').length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucune personne n&apos;a encore proposé son aide.</p>
                ) : (
                  <div className="space-y-3">
                    {participants.filter(p => p.role === 'helper').map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {p.user?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800">{p.user?.full_name ?? 'Membre'}</p>
                          {p.message && <p className="text-xs text-gray-600 mt-0.5">{p.message}</p>}
                          <p className="text-xs text-gray-400">{formatRelative(p.created_at)}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.state === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                          p.state === 'declined' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.state === 'accepted' ? '✓ Accepté' : p.state === 'declined' ? '✗ Refusé' : 'En attente'}
                        </span>
                        {isAuthor && p.state === 'pending' && (
                          <div className="flex gap-1">
                            <button type="button" onClick={async () => {
                              await supabase.from('help_request_participants').update({ state: 'accepted' }).eq('id', p.id);
                              fetchParticipants();
                              toast.success('Helper accepté !');
                            }} className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-lg hover:bg-emerald-600 transition-all">✓</button>
                            <button type="button" onClick={async () => {
                              await supabase.from('help_request_participants').update({ state: 'declined' }).eq('id', p.id);
                              fetchParticipants();
                            }} className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400 transition-all">✗</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── DISCUSSION ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-500" />
                Discussion ({comments.length})
              </h2>

              {loadingComments ? (
                <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">Aucun message — soyez le premier à répondre !</p>
              ) : (
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                        style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
                        {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-800">{c.author?.full_name ?? 'Anonyme'}</span>
                          <span className="text-xs text-gray-400">{formatRelative(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Champ commentaire */}
              {profile ? (
                <div className="flex items-end gap-2 pt-4 border-t border-gray-100">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                    style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
                    {profile.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1">
                    <textarea ref={commentRef} value={commentText} onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                      placeholder="Écrire un message… (Entrée pour envoyer)" rows={2}
                      className="w-full text-sm rounded-xl border border-gray-200 px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-gray-700 placeholder-gray-400" />
                  </div>
                  <button type="button" onClick={handleSendComment} disabled={!commentText.trim() || sendingComment}
                    className="p-3 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:opacity-40 transition-all flex-shrink-0">
                    {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-100 text-center">
                  <Link href="/connexion" className="text-sm text-orange-600 font-bold hover:underline">
                    Connectez-vous pour participer à la discussion →
                  </Link>
                </div>
              )}
            </div>

            {/* ── Chronologie statut ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Progression de l&apos;annonce
              </h2>
              <div className="relative">
                {/* Ligne verticale */}
                <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-200" />
                <div className="space-y-4">
                  {[
                    { status: 'active', label: 'Annonce publiée', icon: '📢', color: 'text-orange-600', bg: 'bg-orange-100', done: true },
                    { status: 'in_progress', label: 'En cours de traitement', icon: '⚡', color: 'text-indigo-600', bg: 'bg-indigo-100', done: ['in_progress','paused','resolved','closed','archived'].includes(item.status) },
                    { status: 'resolved', label: 'Aide accomplie !', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-100', done: ['resolved','closed','archived'].includes(item.status) },
                    { status: 'archived', label: 'Archivée', icon: '📦', color: 'text-gray-500', bg: 'bg-gray-100', done: item.status === 'archived' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 z-10 ${step.done ? step.bg : 'bg-gray-100'}`}>
                        {step.done ? step.icon : <span className="text-gray-300">{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className={`text-sm font-bold ${step.done ? step.color : 'text-gray-400'}`}>{step.label}</p>
                        {step.status === 'active' && <p className="text-xs text-gray-400 mt-0.5">{formatRelative(item.created_at)}</p>}
                        {step.status === 'resolved' && item.resolved_at && (
                          <p className="text-xs text-emerald-500 mt-0.5">{new Date(item.resolved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                        )}
                        {step.status === 'in_progress' && ['in_progress'].includes(item.status) && (
                          <p className="text-xs text-indigo-400 mt-0.5 animate-pulse">En cours…</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Pause = état spécial */}
                  {item.status === 'paused' && (
                    <div className="ml-11 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-amber-700 font-semibold">⏸ Annonce temporairement en pause</p>
                    </div>
                  )}
                  {item.status === 'closed' && (
                    <div className="ml-11 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-gray-600 font-semibold">✖ Annonce fermée par l&apos;auteur</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notation */}
            {isResolved && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" /> Avis sur cette aide
                </h2>
                <RatingWidget targetType="help_request" targetId={item.id} authorId={item.author_id} userId={profile?.id} compact={false} showPoll />
              </div>
            )}

            {/* Annonces similaires */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
              <p className="text-sm text-gray-600 font-semibold mb-3">Voir d&apos;autres annonces dans la même catégorie</p>
              <Link href={`/coups-de-main?cat=${item.category}`}
                className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-all">
                {catConf.emoji} Toutes les annonces &quot;{catConf.label}&quot; <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

          {/* ── SIDEBAR ── */}
          <aside className="hidden lg:block w-72 flex-shrink-0 space-y-5">

            {/* Barre d'actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-800">Actions</h3>

              {/* Contacter */}
              {!isAuthor && isActive && (
                <ContactButton
                  sourceType="help_request"
                  sourceId={item.id}
                  sourceTitle={item.title}
                  ownerId={item.author_id}
                  userId={profile?.id}
                  size="md"
                  className="w-full justify-center"
                />
              )}

              {/* Je peux aider */}
              {!isAuthor && isActive && item.help_type !== 'offre' && (
                <button type="button" onClick={handleCanHelp} disabled={helping || alreadyHelping}
                  className={`w-full flex items-center justify-center gap-2 font-bold px-4 py-3 rounded-xl text-sm transition-all ${
                    alreadyHelping
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  } disabled:opacity-60`}>
                  {helping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {alreadyHelping ? 'Aide proposée ✓' : 'Je peux aider'}
                </button>
              )}

              {/* Je suis intéressé (pour les offres) */}
              {!isAuthor && isActive && item.help_type === 'offre' && (
                <button type="button" onClick={handleCanHelp} disabled={helping || alreadyHelping}
                  className={`w-full flex items-center justify-center gap-2 font-bold px-4 py-3 rounded-xl text-sm transition-all ${
                    alreadyHelping ? 'bg-blue-100 text-blue-700 border border-blue-200 cursor-default' : 'bg-blue-500 text-white hover:bg-blue-600'
                  } disabled:opacity-60`}>
                  {helping ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandHeart className="w-4 h-4" />}
                  {alreadyHelping ? 'Intérêt envoyé ✓' : 'Je suis intéressé'}
                </button>
              )}

              {/* Gestion auteur */}
              {isAuthor && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-semibold">Gérer mon annonce</p>
                  {isActive && (
                    <>
                      <button type="button" onClick={() => handleStatusChange('in_progress')}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all font-semibold">
                        ⚡ Passer en cours
                      </button>
                      <button type="button" onClick={() => handleStatusChange('paused')}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all font-semibold">
                        ⏸ Mettre en pause
                      </button>
                      <button type="button" onClick={() => handleStatusChange('resolved')}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all font-semibold">
                        ✅ Marquer résolu
                      </button>
                      <button type="button" onClick={() => handleStatusChange('closed')}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all font-semibold">
                        ✖ Fermer l&apos;annonce
                      </button>
                    </>
                  )}
                  {(item.status === 'paused' || item.status === 'closed') && (
                    <button type="button" onClick={() => handleStatusChange('active')}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-all font-semibold">
                      ▶️ Réactiver l&apos;annonce
                    </button>
                  )}
                  {item.status === 'resolved' && (
                    <button type="button" onClick={() => handleStatusChange('archived')}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all font-semibold">
                      📦 Archiver
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Rappels sécurité */}
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-black text-amber-800">Rappels sécurité</h3>
              </div>
              <ul className="space-y-2 text-xs text-amber-700">
                <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" />Rencontrez-vous en lieu public quand possible</li>
                <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" />Ne versez pas d&apos;argent sans confiance établie</li>
                <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" />Préférez la messagerie pour les premiers échanges</li>
                <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" />Signalez tout comportement suspect</li>
              </ul>
            </div>

            {/* Infos contact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-black text-gray-800 mb-3">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  {item.contact_mode === 'messagerie'
                    ? <><MessageSquare className="w-4 h-4 text-violet-500 flex-shrink-0" /> Via la messagerie</>
                    : <><Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Téléphone possible après 1er échange</>}
                </p>
                <p className="flex items-center gap-2">
                  {item.visibility === 'public'
                    ? <><ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" /> Visible par tous</>
                    : <><Shield className="w-4 h-4 text-gray-500 flex-shrink-0" /> Membres connectés uniquement</>}
                </p>
              </div>
              {item.resolved_at && (
                <p className="mt-3 text-xs text-emerald-600 font-semibold">
                  ✅ Résolu le {new Date(item.resolved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

          </aside>
        </div>
      </div>

      {/* ── Barre d'actions sticky (mobile + desktop) ── */}
      {!isAuthor && isActive && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg lg:hidden">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <ContactButton
              sourceType="help_request"
              sourceId={item.id}
              sourceTitle={item.title}
              ownerId={item.author_id}
              userId={profile?.id}
              size="sm"
              className="flex-1 justify-center"
            />
            {item.help_type !== 'offre' ? (
              <button type="button" onClick={handleCanHelp} disabled={helping || alreadyHelping}
                className={`flex-1 flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm transition-all ${
                  alreadyHelping
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                } disabled:opacity-60`}>
                {helping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {alreadyHelping ? 'Proposé ✓' : 'Je peux aider'}
              </button>
            ) : (
              <button type="button" onClick={handleCanHelp} disabled={helping || alreadyHelping}
                className={`flex-1 flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm transition-all ${
                  alreadyHelping ? 'bg-blue-100 text-blue-700 border border-blue-200 cursor-default' : 'bg-blue-500 text-white hover:bg-blue-600'
                } disabled:opacity-60`}>
                {helping ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandHeart className="w-4 h-4" />}
                {alreadyHelping ? 'Envoyé ✓' : 'Intéressé(e)'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={item.title} />
      )}
    </div>
  );
}
