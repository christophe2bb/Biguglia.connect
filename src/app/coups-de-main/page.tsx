'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Heart, Users, Clock, MapPin, Calendar, MessageSquare, Send,
  Plus, X, Loader2, RefreshCw, AlertCircle, CheckCircle2,
  Pencil, Trash2, Share2, ChevronDown, ChevronUp, Search,
  HandHeart, Truck, ShoppingCart, Wrench, Trees, Baby,
  Computer, Dog, Car, Package, Handshake, Star,
  Shield, Phone, Eye, EyeOff, HelpCircle, ArrowRight,
  Pause, Play, Check, Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import GlobalTrustBadge from '@/components/ui/TrustBadge';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';

// ─── Types ────────────────────────────────────────────────────────────────────
type HelpType = 'demande' | 'offre' | 'echange';
type UrgencyLevel = 'flexible' | 'cette_semaine' | 'rapidement' | 'urgent';
type Duration = '15min' | '30min' | '1h' | '2h' | 'demi_journee' | 'journee' | 'variable';
type Compensation = 'gratuit' | 'cafe' | 'echange' | 'frais' | 'discuter';
type Visibility = 'public' | 'membres';
type ContactMode = 'messagerie' | 'telephone_apres';
type DisplayName = 'prenom' | 'prenom_initiale' | 'complet';
type HelpStatus = 'active' | 'paused' | 'resolved' | 'draft';

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
  visibility: Visibility;
  contact_mode: ContactMode;
  display_name: DisplayName;
  photos?: { url: string; display_order: number }[];
  created_at: string;
  updated_at: string;
  comment_count?: number;
};

type HelpComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<HelpType, { label: string; emoji: string; color: string; bg: string; border: string; desc: string }> = {
  demande: { label: "J'ai besoin d'aide", emoji: '🙋', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', desc: 'Vous cherchez un coup de main' },
  offre:   { label: "Je propose mon aide", emoji: '🤝', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', desc: 'Vous êtes disponible pour aider' },
  echange: { label: "Échange de services", emoji: '🔄', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300', desc: "J'aide si on m'aide en retour" },
};

const CATEGORIES = [
  { value: 'demenagement',    label: 'Déménagement / transport', icon: Truck },
  { value: 'courses',         label: 'Courses / accompagnement', icon: ShoppingCart },
  { value: 'bricolage',       label: 'Bricolage léger',          icon: Wrench },
  { value: 'jardin',          label: 'Jardin / extérieur',       icon: Trees },
  { value: 'garde',           label: 'Garde ponctuelle',         icon: Baby },
  { value: 'admin_numerique', label: 'Aide administrative / numérique', icon: Computer },
  { value: 'visite',          label: 'Visite / compagnie',       icon: Heart },
  { value: 'animaux',         label: 'Animaux',                  icon: Dog },
  { value: 'vehicule',        label: 'Véhicule / covoiturage',   icon: Car },
  { value: 'livraison',       label: 'Livraison locale',         icon: Package },
  { value: 'depannage',       label: 'Petit dépannage',          icon: HelpCircle },
  { value: 'autre',           label: 'Autre entraide',           icon: HandHeart },
];

const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; color: string; bg: string }> = {
  flexible:      { label: 'Flexible',             color: 'text-gray-600',   bg: 'bg-gray-100' },
  cette_semaine: { label: 'Cette semaine',         color: 'text-blue-600',   bg: 'bg-blue-100' },
  rapidement:    { label: 'Rapidement',            color: 'text-amber-600',  bg: 'bg-amber-100' },
  urgent:        { label: "Aujourd'hui / urgent",  color: 'text-red-600',    bg: 'bg-red-100' },
};

const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: '15min',       label: '15 min' },
  { value: '30min',       label: '30 min' },
  { value: '1h',          label: '1 heure' },
  { value: '2h',          label: '2 heures' },
  { value: 'demi_journee',label: 'Demi-journée' },
  { value: 'journee',     label: 'Journée' },
  { value: 'variable',    label: 'Variable' },
];

const COMPENSATION_CONFIG: Record<Compensation, { label: string; emoji: string }> = {
  gratuit:  { label: 'Gratuit / entraide pure',       emoji: '💚' },
  cafe:     { label: 'Café / apéro / merci symbolique', emoji: '☕' },
  echange:  { label: 'Échange de service',             emoji: '🔄' },
  frais:    { label: 'Petite participation aux frais', emoji: '💶' },
  discuter: { label: 'À discuter',                     emoji: '💬' },
};

const EQUIPMENT_OPTIONS = [
  'Voiture', 'Remorque', 'Outils', 'Escabeau', 'Gants', 'Diable / chariot', 'Ordinateur', 'Autre',
];

const CONDITIONS_OPTIONS = [
  "Présence d'escaliers", 'Port de charge', 'Enfant / animal sur place',
  'Accès facile', 'Besoin d\'être véhiculé', 'Intervention à plusieurs préférable', 'Rien de particulier',
];

const FOR_WHO_OPTIONS = [
  'Pour moi', 'Pour un proche', 'Pour une personne âgée', 'Pour une famille', 'Pour une association', 'Autre',
];

const LOCATION_AREAS = [
  'Centre-ville', 'Mairie', 'Casatorra', 'Toga / proche gare', 'Périphérie', 'Biguglia nord', 'Biguglia sud', 'Autre zone',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDisplayName(author: HelpRequest['author'], mode: DisplayName): string {
  if (!author?.full_name) return 'Membre';
  const parts = author.full_name.trim().split(' ');
  if (mode === 'prenom') return parts[0];
  if (mode === 'prenom_initiale') return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  return author.full_name;
}

function LocalTrustBadge({ author }: { author: HelpRequest['author'] }) {
  if (!author?.created_at) return null;
  return (
    <GlobalTrustBadge
      profile={{
        created_at: author.created_at,
        role: 'resident',
        avatar_url: (author as { full_name: string; avatar_url?: string; created_at?: string }).avatar_url,
      }}
      variant="mini"
    />
  );
}

// ─── HelpCard ─────────────────────────────────────────────────────────────────
function HelpCard({
  item, userId, isAuthor, onEdit, onDelete, onResolve, onPause,
}: {
  item: HelpRequest;
  userId?: string;
  isAuthor: boolean;
  onEdit: (i: HelpRequest) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string) => void;
  onPause: (id: string, paused: boolean) => void;
}) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const router = useRouter();
  const [openChat, setOpenChat] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<HelpComment[]>([]);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatCount, setChatCount] = useState(item.comment_count ?? 0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const typeConf = TYPE_CONFIG[item.help_type];
  const urgConf = URGENCY_CONFIG[item.urgency];
  const catConf = CATEGORIES.find(c => c.value === item.category);
  const CatIcon = catConf?.icon ?? HandHeart;
  const coverPhoto = item.photos?.[0]?.url;
  const allPhotos = toPhotoItems(item.photos ?? []);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const isPaused = item.status === 'paused';
  const isResolved = item.status === 'resolved';

  useEffect(() => {
    supabase.from('help_comments').select('id', { count: 'exact', head: true })
      .eq('help_id', item.id)
      .then(({ count }) => setChatCount(count ?? 0));
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('help_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('help_id', item.id).order('created_at', { ascending: true }).limit(50);
    setComments((data ?? []) as HelpComment[]);
    setChatCount((data ?? []).length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('help_comments').insert({ help_id: item.id, author_id: userId, content: chatText.trim() });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/coups-de-main#${item.id}`;
  const shareText = encodeURIComponent(`${typeConf.emoji} ${item.title} — ${item.location_area}\n${shareUrl}`);

  return (
    <div id={item.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group ${
      isResolved ? 'opacity-60 border-gray-200' : isPaused ? 'border-gray-300' : item.help_type === 'demande' ? 'border-orange-200' : item.help_type === 'offre' ? 'border-emerald-200' : 'border-blue-200'
    }`}>

      {/* ── Zone photo / header — h-44 ── */}
      <div className="relative h-44 overflow-hidden">
        {coverPhoto ? (
          <div className="w-full h-full cursor-pointer" onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhoto} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                +{allPhotos.length - 1} photo{allPhotos.length > 2 ? 's' : ''}
              </div>
            )}
          </div>
        ) : (
          <div className={`w-full h-full ${typeConf.bg} flex items-center justify-center`}>
            <CatIcon className={`w-16 h-16 opacity-15 ${typeConf.color}`} />
          </div>
        )}
        {/* Overlay gradient bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`text-xs font-black px-2.5 py-1 rounded-full shadow ${
            item.help_type === 'demande' ? 'bg-orange-500 text-white' :
            item.help_type === 'offre'   ? 'bg-emerald-500 text-white' :
                                           'bg-blue-500 text-white'
          }`}>{typeConf.emoji} {typeConf.label}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 shadow ${urgConf.color}`}>
            {urgConf.label}
          </span>
          {isResolved && <StatusBadge status="resolved" contentType="help_request" size="xs" showIcon className="shadow" />}
          {isPaused   && <StatusBadge status="paused"   contentType="help_request" size="xs" showIcon className="shadow" />}
          {!isResolved && !isPaused && <StatusBadge status="open" contentType="help_request" size="xs" showDot showIcon className="shadow" />}
        </div>

        {/* Boutons auteur haut droite */}
        {isAuthor && (
          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isResolved && (
              <button type="button" onClick={() => onResolve(item.id)} title="Marquer résolu"
                className="p-1.5 bg-white/80 text-gray-600 hover:text-emerald-600 rounded-lg transition-all shadow backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button type="button" onClick={() => onPause(item.id, isPaused)} title={isPaused ? 'Réactiver' : 'Mettre en pause'}
              className="p-1.5 bg-white/80 text-gray-600 hover:text-amber-600 rounded-lg transition-all shadow backdrop-blur-sm">
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button type="button" onClick={() => onEdit(item)}
              className="p-1.5 bg-white/80 text-gray-600 hover:text-blue-600 rounded-lg transition-all shadow backdrop-blur-sm">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => onDelete(item.id)}
              className="p-1.5 bg-white/80 text-gray-600 hover:text-red-600 rounded-lg transition-all shadow backdrop-blur-sm">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Titre + catégorie bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CatIcon className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
            <span className="text-white/80 text-xs font-semibold">{catConf?.label ?? item.category}</span>
          </div>
          <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{item.title}</p>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="p-5">

        {/* Auteur + trust badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
            style={{ background: item.help_type === 'demande' ? 'linear-gradient(135deg,#f97316,#fb923c)' : item.help_type === 'offre' ? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}>
            {getDisplayName(item.author, item.display_name)[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-xs font-semibold text-gray-700">{getDisplayName(item.author, item.display_name)}</span>
          <LocalTrustBadge author={item.author} />
          <span className="ml-auto text-xs text-gray-400">{formatRelative(item.created_at)}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">{item.description}</p>

        {/* Infos pratiques */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />{item.location_area}{item.location_city !== 'Biguglia' ? ` · ${item.location_city}` : ''}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />{DURATION_OPTIONS.find(d => d.value === item.duration)?.label ?? item.duration}</span>
          {item.help_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-purple-400 flex-shrink-0" />{new Date(item.help_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{item.help_time ? ` · ${item.help_time}` : ''}</span>}
          <span className="flex items-center gap-1"><Users className="w-3 h-3 text-emerald-400 flex-shrink-0" />{item.persons_needed} personne{item.persons_needed > 1 ? 's' : ''}</span>
        </div>

        {/* Compensation */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeConf.bg} ${typeConf.color} border ${typeConf.border}`}>
            {COMPENSATION_CONFIG[item.compensation]?.emoji} {COMPENSATION_CONFIG[item.compensation]?.label}
          </span>
          {item.compensation_detail && (
            <span className="text-xs text-gray-500 italic">· {item.compensation_detail}</span>
          )}
        </div>

        {/* Conditions */}
        {item.conditions.length > 0 && item.conditions[0] !== 'Rien de particulier' && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.conditions.map(c => (
              <span key={c} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
        )}

        {/* Pour qui */}
        {item.for_who && (
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose-400 flex-shrink-0" /> {item.for_who}
          </p>
        )}

        {/* Matériel */}
        {item.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.equipment.map(e => (
              <span key={e} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">🔧 {e}</span>
            ))}
          </div>
        )}

        {/* Galerie miniatures cliquables */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {allPhotos.slice(1).map((ph, i) => (
              <button key={i} onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }}
                className="flex-shrink-0 focus:outline-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.url} alt="" className="h-14 w-20 object-cover rounded-lg border border-gray-100 hover:border-brand-300 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Bouton voir plus */}
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1 mb-3">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Moins de détails</> : <><ChevronDown className="w-3.5 h-3.5" />Plus de détails</>}
        </button>

        {expanded && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs space-y-1.5">
            <p className="text-gray-600"><span className="font-semibold">Pour :</span> {item.for_who}</p>
            <p className="text-gray-600"><span className="font-semibold">Visibilité :</span> {item.visibility === 'public' ? '🌍 Tout le monde' : '🔒 Membres connectés'}</p>
            <p className="text-gray-600"><span className="font-semibold">Contact :</span> {item.contact_mode === 'messagerie' ? '💬 Messagerie plateforme' : '📞 Téléphone possible après 1er échange'}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
          {/* Bouton contact / suivi interaction */}
          {!isAuthor && (
            <ContactButton
              sourceType="help_request"
              sourceId={item.id}
              sourceTitle={item.title}
              ownerId={item.author_id}
              userId={userId}
              size="sm"
            />
          )}

          {/* Discussion */}
          <button type="button" onClick={handleOpenChat}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${openChat ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <MessageSquare className="w-3.5 h-3.5" />
            Discussion
            {chatCount > 0 && <span className="bg-violet-100 text-violet-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>}
          </button>

          {/* Partager */}
          <div ref={shareRef} className="relative ml-auto flex items-center gap-1">
            {/* Signaler */}
            {userId && !isAuthor && (
              <ReportButton targetType="help_request" targetId={item.id} targetTitle={item.title} variant="mini" />
            )}
            <button type="button" onClick={() => setOpenShare(!openShare)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
              <Share2 className="w-4 h-4" />
            </button>
            {openShare && (
              <div className="absolute right-0 bottom-8 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-36 overflow-hidden">
                <button type="button" onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">💬 Par SMS</button>
                <button type="button" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">📧 Par Email</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Mini-forum ── */}
        {openChat && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — démarrez la discussion !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
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
                  className="flex-1 text-xs rounded-lg border border-orange-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button type="button" onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-orange-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Notation coup de main — affichage toujours visible, formulaire uniquement si résolu */}
      <div className="mt-3 px-5 pb-5 border-t border-gray-100 pt-3">
        {item.status === 'resolved' ? (
          <RatingWidget
            targetType="help_request"
            targetId={item.id}
            authorId={item.author_id}
            userId={userId}
            compact={false}
            showPoll
          />
        ) : (
          <RatingWidget
            targetType="help_request"
            targetId={item.id}
            authorId={item.author_id}
            userId={userId}
            compact
          />
        )}
      </div>
      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={item.title} />
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CoupsDeMainPage() {
  const { profile } = useAuthStore();
  const supabase = createClient();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  // Filtres
  const [filterType, setFilterType] = useState<'all' | HelpType>('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState<'all' | UrgencyLevel>('all');
  const [search, setSearch] = useState('');

  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<HelpRequest | null>(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const emptyForm = {
    help_type: 'demande' as HelpType,
    title: '',
    category: 'autre',
    description: '',
    urgency: 'flexible' as UrgencyLevel,
    help_date: '',
    help_time: '',
    location_area: 'Centre-ville',
    location_city: 'Biguglia',
    location_detail: '',
    duration: '1h' as Duration,
    persons_needed: 1,
    compensation: 'gratuit' as Compensation,
    compensation_detail: '',
    equipment: [] as string[],
    for_who: 'Pour moi',
    conditions: [] as string[],
    visibility: 'public' as Visibility,
    contact_mode: 'messagerie' as ContactMode,
    display_name: 'prenom_initiale' as DisplayName,
    // Engagement checkboxes
    check1: false, check2: false, check3: false, check4: false, check5: false,
  };
  const [form, setForm] = useState(emptyForm);

  const totalActive = items.filter(i => i.status === 'active').length;
  const demandes = items.filter(i => i.help_type === 'demande' && i.status === 'active').length;
  const offres   = items.filter(i => i.help_type === 'offre'   && i.status === 'active').length;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        author:profiles(full_name, avatar_url, created_at),
        photos:help_photos(url, display_order)
      `)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) setDbReady(false);
      setLoading(false);
      return;
    }

    // Get comment counts
    const enriched = await Promise.all((data ?? []).map(async (item: HelpRequest) => {
      const { count } = await supabase.from('help_comments')
        .select('id', { count: 'exact', head: true }).eq('help_id', item.id);
      return { ...item, comment_count: count ?? 0 };
    }));

    setItems(enriched as HelpRequest[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Photo preview
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (photos.length + files.length > 5) { toast.error('5 photos maximum'); return; }
    setPhotos(p => [...p, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(p => [...p, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };
  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const toggleArr = (key: 'equipment' | 'conditions', val: string) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(v => v !== val) : [...f[key], val],
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setPhotos([]);
    setPreviews([]);
    setStep(1);
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: HelpRequest) => {
    setEditingItem(item);
    setForm({
      help_type: item.help_type,
      title: item.title,
      category: item.category,
      description: item.description,
      urgency: item.urgency,
      help_date: item.help_date ?? '',
      help_time: item.help_time ?? '',
      location_area: item.location_area,
      location_city: item.location_city,
      location_detail: item.location_detail ?? '',
      duration: item.duration,
      persons_needed: item.persons_needed,
      compensation: item.compensation,
      compensation_detail: item.compensation_detail ?? '',
      equipment: item.equipment ?? [],
      for_who: item.for_who,
      conditions: item.conditions ?? [],
      visibility: item.visibility,
      contact_mode: item.contact_mode,
      display_name: item.display_name,
      check1: true, check2: true, check3: true, check4: true, check5: true,
    });
    setStep(1);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    await supabase.from('help_requests').delete().eq('id', id);
    toast.success('Annonce supprimée');
    fetchItems();
  };

  const handleResolve = async (id: string) => {
    await supabase.from('help_requests').update({ status: 'resolved' }).eq('id', id);
    toast.success('✅ Marqué comme résolu !');
    fetchItems();
  };

  const handlePause = async (id: string, wasPaused: boolean) => {
    await supabase.from('help_requests').update({ status: wasPaused ? 'active' : 'paused' }).eq('id', id);
    toast.success(wasPaused ? '▶️ Annonce réactivée' : '⏸ Annonce mise en pause');
    fetchItems();
  };

  const handleSubmit = async (isDraft = false) => {
    if (!profile) { toast.error('Connectez-vous'); return; }
    if (!form.title.trim()) { toast.error('Titre obligatoire'); return; }
    if (!form.description.trim()) { toast.error('Description obligatoire'); return; }
    if (!isDraft && (!form.check1 || !form.check2 || !form.check3 || !form.check4 || !form.check5)) {
      toast.error('Cochez toutes les cases de validation'); return;
    }

    setSubmitting(true);
    const payload = {
      author_id: profile.id,
      help_type: form.help_type,
      status: isDraft ? 'draft' : 'active',
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      urgency: form.urgency,
      help_date: form.help_date || null,
      help_time: form.help_time || null,
      location_area: form.location_area,
      location_city: form.location_city,
      location_detail: form.location_detail || null,
      duration: form.duration,
      persons_needed: form.persons_needed,
      compensation: form.compensation,
      compensation_detail: form.compensation_detail || null,
      equipment: form.equipment,
      for_who: form.for_who,
      conditions: form.conditions,
      visibility: form.visibility,
      contact_mode: form.contact_mode,
      display_name: form.display_name,
    };

    let itemId: string | null = null;
    if (editingItem) {
      const { error } = await supabase.from('help_requests').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Erreur modification : ' + error.message); setSubmitting(false); return; }
      itemId = editingItem.id;
      toast.success('✅ Annonce modifiée !');
    } else {
      const { data, error } = await supabase.from('help_requests').insert(payload).select('id').single();
      if (error) { toast.error('Erreur publication : ' + error.message); setSubmitting(false); return; }
      itemId = data?.id ?? null;
      toast.success(isDraft ? '💾 Brouillon enregistré' : '🤝 Annonce publiée !', { duration: 4000 });
    }

    // Upload photos
    if (photos.length > 0 && itemId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `coups-de-main/${itemId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) {
          console.error('[storage] help photo upload error:', upErr.message);
          toast.error(`Photo ${i+1} non sauvegardée : ${upErr.message}`);
          continue;
        }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          await supabase.from('help_photos').insert({ help_id: itemId, url: u.publicUrl, display_order: i });
        }
      }
    }

    resetForm();
    fetchItems();
    setSubmitting(false);
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = items.filter(item => {
    if (filterType !== 'all' && item.help_type !== filterType) return false;
    if (filterCat !== 'all' && item.category !== filterCat) return false;
    if (filterUrgency !== 'all' && item.urgency !== filterUrgency) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Formulaire ────────────────────────────────────────────────────────────
  const renderForm = () => (
    <div className="bg-white rounded-2xl border border-orange-200 shadow-md p-6 mb-8">
      {/* Header formulaire */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {editingItem ? '✏️ Modifier l\'annonce' : '🤝 Publier une annonce d\'entraide'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Demandez ou proposez un coup de main entre voisins de Biguglia</p>
        </div>
        <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      {/* Steps */}
      {(() => {
        const typeConf = TYPE_CONFIG[form.help_type];
        const isActive = (s: number) => step === s;
        const isDone   = (s: number) => step > s;
        const stepColor = form.help_type === 'demande' ? 'bg-orange-500' : form.help_type === 'offre' ? 'bg-emerald-500' : 'bg-blue-500';

        return (
          <>
            <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
              {['L\'essentiel', 'Organisation', 'Conditions', 'Confiance'].map((s, i) => (
                <button key={i} type="button" onClick={() => setStep(i + 1)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive(i+1) ? `${stepColor} text-white` : isDone(i+1) ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${isActive(i+1) ? 'bg-white/30' : isDone(i+1) ? 'bg-green-400 text-white' : 'bg-gray-300 text-gray-500'}`}>
                    {isDone(i+1) ? '✓' : i + 1}
                  </span>
                  {s}
                </button>
              ))}
            </div>

            {/* ── BLOC A : L'essentiel ── */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Type */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">1. Type d&apos;annonce *</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.entries(TYPE_CONFIG) as [HelpType, typeof TYPE_CONFIG[HelpType]][]).map(([key, conf]) => (
                      <button key={key} type="button" onClick={() => setForm(f => ({ ...f, help_type: key }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          form.help_type === key ? `${conf.border} ${conf.bg} ${conf.color}` : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                        }`}>
                        <span className="text-3xl">{conf.emoji}</span>
                        <span className="text-center leading-tight">{conf.label}</span>
                        <span className="text-xs font-normal opacity-70">{conf.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titre */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">2. Titre de l&apos;annonce *</label>
                  <input type="text" placeholder={
                    form.help_type === 'demande' ? "Ex : Besoin d'aide pour monter un meuble samedi" :
                    form.help_type === 'offre'   ? "Ex : Je peux aider pour courses ou petits déplacements" :
                    "Ex : Disponible pour jardinage si aide déménagement"
                  }
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    maxLength={80}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${form.help_type === 'demande' ? 'border-orange-200 focus:ring-orange-300' : form.help_type === 'offre' ? 'border-emerald-200 focus:ring-emerald-300' : 'border-blue-200 focus:ring-blue-300'}`}
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.title.length}/80 — Clair, précis, pas trop long</p>
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">3. Catégorie *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                            form.category === cat.value ? `${typeConf.border} ${typeConf.bg} ${typeConf.color}` : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                          }`}>
                          <Icon className="w-4 h-4" />
                          <span className="text-center leading-tight text-xs">{cat.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">4. Description détaillée *</label>
                  <textarea placeholder="Décrivez votre demande ou offre en détail…" rows={4}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 ${form.help_type === 'demande' ? 'border-orange-200 focus:ring-orange-300' : form.help_type === 'offre' ? 'border-emerald-200 focus:ring-emerald-300' : 'border-blue-200 focus:ring-blue-300'}`}
                  />
                  <div className="mt-2 bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">💡 Questions guides :</p>
                    <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
                      <li>De quoi avez-vous besoin exactement ?</li>
                      <li>Combien de temps cela prend ?</li>
                      <li>Faut-il une compétence particulière ?</li>
                      <li>Y a-t-il du matériel à prévoir ?</li>
                      <li>Pour qui est cette aide ?</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => setStep(2)}
                    className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${stepColor} hover:opacity-90`}>
                    Suivant →
                  </button>
                </div>
              </div>
            )}

            {/* ── BLOC B : Organisation ── */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-700">Bloc B — Organisation pratique</p>

                {/* Urgence */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">5. Niveau d&apos;urgence</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(URGENCY_CONFIG) as [UrgencyLevel, typeof URGENCY_CONFIG[UrgencyLevel]][]).map(([key, conf]) => (
                      <button key={key} type="button" onClick={() => setForm(f => ({ ...f, urgency: key }))}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left ${
                          form.urgency === key ? `${conf.bg} ${conf.color} border-current` : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}>{conf.label}</button>
                    ))}
                  </div>
                </div>

                {/* Date / heure */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">6. Date souhaitée</label>
                    <input type="date" value={form.help_date} onChange={e => setForm(f => ({ ...f, help_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Heure / créneau</label>
                    <input type="text" placeholder="Ex : 14h, matin, soirée…" value={form.help_time} onChange={e => setForm(f => ({ ...f, help_time: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                </div>

                {/* Lieu */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">7. Lieu</label>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.location_area} onChange={e => setForm(f => ({ ...f, location_area: e.target.value }))}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
                      {LOCATION_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input type="text" placeholder="Ville (ex: Biguglia)" value={form.location_city} onChange={e => setForm(f => ({ ...f, location_city: e.target.value }))}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                  <input type="text" placeholder="Précision facultative (pas d'adresse complète)" value={form.location_detail} onChange={e => setForm(f => ({ ...f, location_detail: e.target.value }))}
                    className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>

                {/* Durée */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">8. Durée estimée</label>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map(d => (
                      <button key={d.value} type="button" onClick={() => setForm(f => ({ ...f, duration: d.value }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          form.duration === d.value ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}` : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}>{d.label}</button>
                    ))}
                  </div>
                </div>

                {/* Personnes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">9. Nombre de personnes</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setForm(f => ({ ...f, persons_needed: Math.max(1, f.persons_needed - 1) }))}
                      className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg font-bold flex items-center justify-center">−</button>
                    <span className="text-lg font-black text-gray-900 w-8 text-center">{form.persons_needed}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, persons_needed: Math.min(20, f.persons_needed + 1) }))}
                      className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg font-bold flex items-center justify-center">+</button>
                    <span className="text-sm text-gray-500">personne{form.persons_needed > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
                  <button type="button" onClick={() => setStep(3)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${stepColor} hover:opacity-90`}>Suivant →</button>
                </div>
              </div>
            )}

            {/* ── BLOC C : Conditions ── */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-700">Bloc C — Conditions &amp; photos</p>

                {/* Contrepartie */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">10. Compensation / contrepartie</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(COMPENSATION_CONFIG) as [Compensation, typeof COMPENSATION_CONFIG[Compensation]][]).map(([key, conf]) => (
                      <button key={key} type="button" onClick={() => setForm(f => ({ ...f, compensation: key }))}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                          form.compensation === key ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}` : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}>{conf.emoji} {conf.label}</button>
                    ))}
                  </div>
                  <input type="text" placeholder="Précision (optionnel) — ex : Je rembourse l'essence"
                    value={form.compensation_detail} onChange={e => setForm(f => ({ ...f, compensation_detail: e.target.value }))}
                    className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>

                {/* Matériel */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">11. Matériel nécessaire</label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map(e => (
                      <button key={e} type="button" onClick={() => toggleArr('equipment', e)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          form.equipment.includes(e) ? 'bg-amber-100 text-amber-700 border-amber-300' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}>{e}</button>
                    ))}
                  </div>
                </div>

                {/* Pour qui */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">12. Pour qui est la demande ?</label>
                  <div className="flex flex-wrap gap-2">
                    {FOR_WHO_OPTIONS.map(f => (
                      <button key={f} type="button" onClick={() => setForm(prev => ({ ...prev, for_who: f }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          form.for_who === f ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}` : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}>{f}</button>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">13. Photos (optionnel, max 5)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group/p">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">Principal</span>}
                        <button type="button" onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover/p:flex">×</button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <button type="button" onClick={() => photoInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center gap-1 transition-all">
                        <Camera className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400">Ajouter</span>
                      </button>
                    )}
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
                </div>

                {/* Conditions */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">14. Conditions / précautions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONDITIONS_OPTIONS.map(c => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.conditions.includes(c)} onChange={() => toggleArr('conditions', c)} className="rounded" />
                        <span className="text-xs text-gray-700">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
                  <button type="button" onClick={() => setStep(4)} className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm ${stepColor} hover:opacity-90`}>Suivant →</button>
                </div>
              </div>
            )}

            {/* ── BLOC D : Confiance ── */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-gray-700">Bloc D — Confiance &amp; sécurité</p>

                {/* Visibilité */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">15. Visibilité</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ v: 'public' as Visibility, l: '🌍 Visible par toute la communauté', icon: Eye }, { v: 'membres' as Visibility, l: '🔒 Membres connectés uniquement', icon: EyeOff }].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, visibility: opt.v }))}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                          form.visibility === opt.v ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}` : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}>{opt.l}</button>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">16. Mode de contact</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ v: 'messagerie' as ContactMode, l: '💬 Messagerie plateforme uniquement' }, { v: 'telephone_apres' as ContactMode, l: '📞 Téléphone possible après 1er échange' }].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, contact_mode: opt.v }))}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                          form.contact_mode === opt.v ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}` : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}>{opt.l}</button>
                    ))}
                  </div>
                </div>

                {/* Nom affiché */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">17. Nom affiché</label>
                  <div className="flex gap-2">
                    {[{ v: 'prenom' as DisplayName, l: 'Prénom seul' }, { v: 'prenom_initiale' as DisplayName, l: 'Prénom + initiale (recommandé)' }, { v: 'complet' as DisplayName, l: 'Nom complet' }].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, display_name: opt.v }))}
                        className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                          form.display_name === opt.v ? `${typeConf.bg} ${typeConf.color} ${typeConf.border}` : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                        }`}>{opt.l}</button>
                    ))}
                  </div>
                </div>

                {/* Engagement */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-bold text-gray-700">19. Engagement — cases obligatoires</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { key: 'check1', label: 'Je publie une demande sincère et réelle' },
                      { key: 'check2', label: "Je comprends qu'il s'agit d'entraide entre particuliers" },
                      { key: 'check3', label: 'Je m\'engage à rester respectueux envers les autres' },
                      { key: 'check4', label: "Je n'utilise pas cette rubrique pour du travail dissimulé" },
                      { key: 'check5', label: "J'accepte les règles de sécurité de la plateforme" },
                    ].map(c => (
                      <label key={c.key} className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={form[c.key as keyof typeof form] as boolean}
                          onChange={e => setForm(f => ({ ...f, [c.key]: e.target.checked }))}
                          className="rounded mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Boutons publication */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => handleSubmit(false)} disabled={submitting}
                    className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-white text-sm ${stepColor} hover:opacity-90 disabled:opacity-50`}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {form.help_type === 'demande' ? '🙋 Publier ma demande' : form.help_type === 'offre' ? '🤝 Publier mon offre' : '🔄 Publier mon échange'}
                  </button>
                  <button type="button" onClick={() => handleSubmit(true)} disabled={submitting}
                    className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                    💾 Brouillon
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">← Retour</button>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );

  // ── RENDU PAGE ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* DB warning */}
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

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-emerald-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl"><HandHeart className="w-5 h-5" /></div>
                <span className="text-amber-100 text-sm font-semibold">Vie locale · Entraide</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">🤝 Coups de main entre voisins</h1>
              <p className="text-amber-100 text-base sm:text-lg max-w-xl leading-relaxed">
                Demandez de l&apos;aide ou proposez-en simplement, entre habitants de Biguglia.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 bg-red-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  🙋 {demandes} demande{demandes !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/40 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  🤝 {offres} offre{offres !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                  💚 {totalActive} annonce{totalActive !== 1 ? 's' : ''} actives
                </span>
              </div>
            </div>
            {profile && (
              <button type="button" onClick={() => { resetForm(); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 bg-white text-orange-600 font-black px-6 py-3 rounded-2xl hover:bg-orange-50 transition-all shadow-lg text-sm flex-shrink-0">
                <Plus className="w-5 h-5" /> Publier une annonce
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {showForm && profile && renderForm()}

        {/* ── Filtres ── */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Recherche */}
          <div className="flex-1 min-w-56 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
          </div>
          {/* Type */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm font-semibold shadow-sm">
            {([['all','Tous'], ['demande','🙋 Demandes'], ['offre','🤝 Offres'], ['echange','🔄 Échanges']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setFilterType(v as 'all' | HelpType)}
                className={`px-4 py-2.5 transition-all text-xs ${filterType === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          {/* Catégorie */}
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {/* Urgence */}
          <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value as 'all' | UrgencyLevel)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="all">Toutes urgences</option>
            {Object.entries(URGENCY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button type="button" onClick={fetchItems} disabled={loading} className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-orange-600 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ── Grille ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <HandHeart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">Aucune annonce pour le moment</p>
            <p className="text-gray-400 text-sm mt-1">Soyez le premier à publier !</p>
            {profile ? (
              <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
                className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-all">
                <Plus className="w-4 h-4" /> Publier une annonce
              </button>
            ) : (
              <Link href="/connexion" className="mt-5 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-all">
                Se connecter pour publier <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{filtered.length} annonce{filtered.length > 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(item => (
                <HelpCard
                  key={item.id}
                  item={item}
                  userId={profile?.id}
                  isAuthor={item.author_id === profile?.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onResolve={handleResolve}
                  onPause={handlePause}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
