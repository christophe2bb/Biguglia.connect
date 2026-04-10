'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Send, ChevronLeft, CheckCheck, ExternalLink,
  ShoppingBag, HandHeart, Dog, Users, MapPin, Wrench,
  MessageSquare, ChevronDown, ChevronUp,
  PartyPopper, Star, Clock, ThumbsUp,
  MoreVertical, StarOff, Ban, UserCheck, Flag, Trash2,
  Info, Bot, Wifi, Phone, Copy,
  CalendarCheck, Package, CheckCircle2, XCircle,
  RefreshCw, Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Message, Profile } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { cn, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';
import RatingWidget from '@/components/ui/RatingWidget';
import type { RatingTargetType } from '@/components/ui/RatingWidget';

// ─── Config contexte par related_type ─────────────────────────────────────────
const CONTEXT_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  border: string;
  href: (id: string) => string;
}> = {
  listing:        { icon: ShoppingBag,   label: 'Annonce',         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   href: id => `/annonces/${id}` },
  equipment:      { icon: Wrench,        label: 'Matériel',        color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',   href: id => `/materiel/${id}` },
  help_request:   { icon: HandHeart,     label: 'Coup de main',    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', href: () => `/coups-de-main` },
  lost_found:     { icon: Dog,           label: 'Perdu / Trouvé',  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  href: () => `/perdu-trouve` },
  association:    { icon: Users,         label: 'Association',     color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200', href: () => `/associations` },
  outing:         { icon: MapPin,        label: 'Sortie groupée',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',href: () => `/promenades` },
  collection_item:{ icon: ShoppingBag,   label: 'Collectionneur',  color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',   href: () => `/collectionneurs` },
  service_request:{ icon: Wrench,        label: 'Demande artisan', color: 'text-brand-700',   bg: 'bg-brand-50',   border: 'border-brand-200',  href: id => `/demandes/${id}` },
  general:        { icon: MessageSquare, label: 'Conversation',    color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200',   href: () => `/` },
};

// ─── Bannière de contexte compacte ────────────────────────────────────────────
function ContextBanner({
  relatedType, relatedId, subject,
}: {
  relatedType: string | null;
  relatedId: string | null;
  subject: string;
}) {
  const [open, setOpen] = useState(true);
  const [contextData, setContextData] = useState<{
    title: string; description?: string; photo?: string;
    price?: string; location?: string; status?: string;
  } | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(false);
  const supabase = createClient();
  const conf = relatedType ? CONTEXT_CONFIG[relatedType] : null;

  useEffect(() => {
    if (!relatedType || !relatedId || relatedType === 'general') return;
    setLoadingCtx(true);

    const loadContext = async () => {
      try {
        if (relatedType === 'listing') {
          const { data } = await supabase.from('listings').select('title, description, price, location, listing_type, photos:listing_photos(url)').eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({ title: data.title, description: data.description?.slice(0, 120), photo: photos?.[0]?.url, price: data.price != null ? (data.price === 0 ? 'Gratuit' : `${data.price} €`) : undefined, location: data.location, status: data.listing_type });
          }
        } else if (relatedType === 'equipment') {
          const { data } = await supabase.from('equipment_items').select('title, description, daily_rate, photos:equipment_photos(url)').eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({ title: data.title, description: data.description?.slice(0, 120), photo: photos?.[0]?.url, price: data.daily_rate ? `${data.daily_rate} €/j` : 'Gratuit' });
          }
        } else if (relatedType === 'help_request') {
          const { data } = await supabase.from('help_requests').select('title, description, category, urgency, location_city, photos:help_photos(url)').eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({ title: data.title, description: data.description?.slice(0, 120), photo: photos?.[0]?.url, location: data.location_city, status: data.urgency });
          }
        } else if (relatedType === 'lost_found') {
          const { data } = await supabase.from('lost_found_items').select('title, description, location_area, photos:lf_photos(url)').eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({ title: data.title, description: data.description?.slice(0, 120), photo: photos?.[0]?.url, location: data.location_area });
          }
        } else if (relatedType === 'association') {
          // associations n'a pas de colonne "description" — utiliser description_short
          const { data } = await supabase.from('associations').select('name, description_short, location, photos:asso_photos(url)').eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({ title: data.name, description: (data.description_short as string | null)?.slice(0, 120), photo: photos?.[0]?.url, location: data.location });
          }
        } else if (relatedType === 'collection_item') {
          const { data } = await supabase.from('collection_items').select('title, description, price, photos:collection_item_photos(url)').eq('id', relatedId).single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({ title: data.title, description: data.description?.slice(0, 120), photo: photos?.[0]?.url, price: data.price != null ? `${data.price} €` : undefined });
          }
        } else if (relatedType === 'service_request') {
          const { data } = await supabase.from('service_requests').select('title, description').eq('id', relatedId).single();
          if (data) setContextData({ title: data.title, description: data.description?.slice(0, 120) });
        }
      } catch (e) {
        console.warn('Context load failed', e);
      } finally {
        setLoadingCtx(false);
      }
    };

    loadContext();
  }, [relatedType, relatedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!conf || relatedType === 'general') return null;

  const CtxIcon = conf.icon;
  const href = relatedId ? conf.href(relatedId) : conf.href('');

  return (
    <div className={cn('rounded-2xl border mb-3 overflow-hidden', conf.bg, conf.border)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-left', conf.bg)}
      >
        <CtxIcon className={cn('w-4 h-4 flex-shrink-0', conf.color)} />
        <span className={cn('text-xs font-bold flex-1 truncate', conf.color)}>
          {conf.label} · {contextData?.title || subject}
        </span>
        {open
          ? <ChevronUp className={cn('w-3.5 h-3.5 flex-shrink-0', conf.color)} />
          : <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0', conf.color)} />
        }
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1">
          {loadingCtx ? (
            <div className="animate-pulse flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-white/60 flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-white/60 rounded w-3/4" />
                <div className="h-3 bg-white/60 rounded w-1/2" />
              </div>
            </div>
          ) : contextData ? (
            <div className="flex gap-3">
              {contextData.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contextData.photo} alt={contextData.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-white/50 shadow-sm" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/50">
                  <CtxIcon className={cn('w-6 h-6', conf.color)} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('font-bold text-sm leading-tight truncate', conf.color)}>{contextData.title}</p>
                {contextData.description && (
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">{contextData.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {contextData.price && <span className={cn('text-xs font-black', conf.color)}>{contextData.price}</span>}
                  {contextData.location && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />{contextData.location}
                    </span>
                  )}
                  {contextData.status && <span className="text-xs text-gray-500 capitalize">{contextData.status}</span>}
                </div>
              </div>
              <Link
                href={href}
                className={cn('flex-shrink-0 self-center flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-white/80 border transition-all hover:bg-white', conf.color, conf.border)}
                target="_blank"
              >
                <ExternalLink className="w-3 h-3" />Voir
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className={cn('text-xs font-semibold', conf.color)}>{subject}</span>
              <Link href={href} className={cn('flex items-center gap-1 text-xs font-bold hover:underline', conf.color)} target="_blank">
                <ExternalLink className="w-3 h-3" /> Voir
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Types pour le suivi d'échange ────────────────────────────────────────────
type ExchangeStatus = 'pending_confirmation' | 'done' | null;

interface ExchangeInfo {
  status: ExchangeStatus;
  confirmedBy: string[];
  confirmedAt: string | null;
  relatedType: string | null;
  relatedId: string | null;
  otherUserId: string | null;
}

const EXCHANGEABLE_TYPES: Record<string, { label: string; verb: string; color: string; bg: string; border: string }> = {
  listing:         { label: 'Annonce',         verb: 'la vente',      color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  equipment:       { label: 'Matériel',         verb: 'le prêt',       color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200'   },
  help_request:    { label: 'Coup de main',     verb: 'l\'aide',       color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  association:     { label: 'Association',      verb: 'le contact',    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  collection_item: { label: 'Collection',       verb: 'l\'échange',    color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200'   },
  service_request: { label: 'Demande artisan',  verb: 'la prestation', color: 'text-brand-700',  bg: 'bg-brand-50',  border: 'border-brand-200'  },
};

// ─── Panneau de confirmation d'échange ────────────────────────────────────────
function ExchangePanel({ conversationId, userId, exchange, onExchangeUpdated }: {
  conversationId: string; userId: string; exchange: ExchangeInfo; onExchangeUpdated: (updated: ExchangeInfo) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const supabase = createClient();
  const conf = exchange.relatedType ? EXCHANGEABLE_TYPES[exchange.relatedType] : null;
  if (!conf || !exchange.relatedType || !exchange.relatedId) return null;

  const iHaveConfirmed = exchange.confirmedBy.includes(userId);
  const isDone = exchange.status === 'done';
  const otherHasConfirmed = exchange.confirmedBy.some(id => id !== userId);

  const handleConfirm = async () => {
    if (confirming || iHaveConfirmed) return;
    setConfirming(true);
    try {
      const newConfirmedBy = [...exchange.confirmedBy, userId];
      const bothDone = newConfirmedBy.length >= 2;

      // Utilise l'API admin pour contourner la récursion RLS
      const { data: { session: exchSession } } = await supabase.auth.getSession();
      const exchToken = exchSession?.access_token;
      const exchHeaders = {
        'Content-Type': 'application/json',
        ...(exchToken ? { 'Authorization': `Bearer ${exchToken}` } : {}),
      };

      const patchRes = await fetch(`/api/messages/conversation/${conversationId}`, {
        method: 'PATCH',
        headers: exchHeaders,
        body: JSON.stringify({
          action: 'update_exchange_status',
          exchangeStatus: bothDone ? 'done' : 'pending_confirmation',
        }),
      }).catch(() => null);

      if (!patchRes?.ok) { toast.error('Erreur de confirmation'); return; }

      // Envoyer le message de confirmation via l'API
      const msgText = bothDone
        ? `✅ Échange confirmé par les deux parties — les avis sont maintenant débloqués.`
        : `🤝 J'ai confirmé la fin de ${conf.verb}. En attente de confirmation de l'autre partie.`;
      await fetch(`/api/messages/conversation/${conversationId}`, {
        method: 'POST',
        headers: exchHeaders,
        body: JSON.stringify({ content: msgText }),
      }).catch(() => null);

      onExchangeUpdated({ ...exchange, status: bothDone ? 'done' : 'pending_confirmation', confirmedBy: newConfirmedBy, confirmedAt: bothDone ? new Date().toISOString() : null });
      if (bothDone) toast.success('Échange confirmé ! Vous pouvez maintenant laisser un avis.');
      else toast.success('Confirmation envoyée ! En attente de l\'autre partie.');
    } finally { setConfirming(false); }
  };

  if (isDone) {
    return (
      <div className={cn('rounded-2xl border p-4 mb-3', conf.bg, conf.border)}>
        <div className="flex items-center gap-2 mb-3">
          <PartyPopper className={cn('w-5 h-5 flex-shrink-0', conf.color)} />
          <div>
            <p className={cn('font-bold text-sm', conf.color)}>Échange terminé ✅</p>
            {exchange.confirmedAt && (
              <p className="text-xs text-gray-500">Confirmé le {new Date(exchange.confirmedAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}</p>
            )}
          </div>
        </div>
        {exchange.relatedType && exchange.relatedId && (
          <div className="bg-white/70 rounded-xl p-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
            <p className="text-xs text-gray-700 flex-1">Votre avis est maintenant <strong>débloqué</strong>.</p>
            <Link
              href={`/${exchange.relatedType === 'listing' ? 'annonces' : exchange.relatedType === 'equipment' ? 'materiel' : exchange.relatedType === 'help_request' ? 'coups-de-main' : exchange.relatedType === 'collection_item' ? 'collectionneurs' : exchange.relatedType}/${exchange.relatedId}`}
              className={cn('text-xs font-bold px-3 py-1.5 rounded-xl border bg-white', conf.color, conf.border)}
            >
              Laisser un avis
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border p-4 mb-3', conf.bg, conf.border)}>
      <div className="flex items-start gap-3">
        <ThumbsUp className={cn('w-5 h-5 flex-shrink-0 mt-0.5', conf.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn('font-bold text-sm mb-0.5', conf.color)}>{conf.label} — Confirmer la fin de l&apos;échange</p>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            {iHaveConfirmed
              ? `✓ Vous avez confirmé. ${otherHasConfirmed ? 'Les deux parties ont confirmé !' : 'En attente de confirmation de l\'autre partie…'}`
              : `Avez-vous terminé ${conf.verb} ? Confirmez pour débloquer les avis vérifiés.`
            }
          </p>
          {otherHasConfirmed && !iHaveConfirmed && (
            <p className="text-xs text-emerald-700 font-semibold mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> L&apos;autre partie a déjà confirmé — confirmez pour finaliser !
            </p>
          )}
          {!iHaveConfirmed && (
            <button onClick={handleConfirm} disabled={confirming} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all">
              {confirming ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              {confirming ? 'Confirmation…' : 'Confirmer la fin de l\'échange'}
            </button>
          )}
          {iHaveConfirmed && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <CheckCheck className="w-4 h-4" /> Votre confirmation est enregistrée
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Séparateur de date dans le fil de messages ───────────────────────────────
function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  let label: string;
  if (d.toDateString() === todayStr) label = "Aujourd'hui";
  else if (d.toDateString() === yesterdayStr) label = 'Hier';
  else {
    label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    label = label.charAt(0).toUpperCase() + label.slice(1);
  }

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap bg-white px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── Bulle message système ────────────────────────────────────────────────────
function SystemMessage({ content }: { content: string }) {
  const isPositive = content.startsWith('✅') || content.startsWith('🤝');
  return (
    <div className="flex justify-center my-2">
      <div className={cn(
        'flex items-start gap-2 max-w-[80%] px-3.5 py-2 rounded-2xl text-xs',
        isPositive
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          : 'bg-gray-50 border border-gray-200 text-gray-600'
      )}>
        <Bot className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', isPositive ? 'text-emerald-500' : 'text-gray-400')} />
        <span className="leading-relaxed">{content}</span>
      </div>
    </div>
  );
}

// ─── Délais de reconnexion ────────────────────────────────────────────────────
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const FALLBACK_POLL_INTERVAL = 5000;

// ─── Page conversation ─────────────────────────────────────────────────────────
export default function ConversationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  // Ref stable pour supabase — évite de recréer l'instance à chaque render
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [messages, setMessages]       = useState<(Message & { sender?: Profile; is_system?: boolean })[]>([]);
  const [newMessage, setNewMessage]   = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [otherUser, setOtherUser]     = useState<Profile | null>(null);
  const [subject, setSubject]         = useState('');
  const [relatedType, setRelatedType] = useState<string | null>(null);
  const [relatedId, setRelatedId]     = useState<string | null>(null);
  const [realtimeOk, setRealtimeOk]   = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [isFavorite, setIsFavorite]   = useState(false);
  const [isBlocked, setIsBlocked]     = useState(false);
  const [activeMsg, setActiveMsg]     = useState<string | null>(null);
  const [deletingMsg, setDeletingMsg] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const menuRef     = useRef<HTMLDivElement>(null);
  const pressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const [exchange, setExchange] = useState<ExchangeInfo>({
    status: null, confirmedBy: [], confirmedAt: null,
    relatedType: null, relatedId: null, otherUserId: null,
  });

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const profileCacheRef = useRef<Record<string, Profile>>({});
  const channelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx    = useRef(0);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef      = useRef(true);
  const lastMsgIdRef    = useRef<string | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior }), 50);
  }, []);

  const getSenderProfile = useCallback(async (senderId: string): Promise<Profile | undefined> => {
    if (profileCacheRef.current[senderId]) return profileCacheRef.current[senderId];
    const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', senderId).single();
    if (data) { profileCacheRef.current[senderId] = data as Profile; return data as Profile; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(() => {
    if (!profile) return;
    // Dispatch l'event → useUnreadCounts gère le badge ET la persistence BDD
    window.dispatchEvent(new CustomEvent('messages-read', {
      detail: { conversationId: id, readAt: Date.now() }
    }));
  }, [id, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const pollNewMessages = useCallback(async () => {
    if (!mountedRef.current || !profile) return;
    try {
      // Utilise l'API admin pour contourner la récursion RLS sur messages
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const apiRes = await fetch(`/api/messages/conversation/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }).catch(() => null);

      if (!apiRes || !apiRes.ok) return;
      const apiData = await apiRes.json().catch(() => null);
      if (!apiData?.messages) return;

      const allMsgs = apiData.messages as Array<Message & Record<string, unknown>>;

      // Alimenter le cache de profils avec les données fraîches
      if (apiData.profiles) {
        (apiData.profiles as Array<{ id: string; full_name: string | null; avatar_url: string | null }>).forEach(p => {
          profileCacheRef.current[p.id] = p as unknown as Profile;
        });
      }

      const enriched = allMsgs.map(msg => ({
        ...msg,
        sender: msg.sender_id ? profileCacheRef.current[msg.sender_id as string] : undefined,
      })) as (Message & { sender?: Profile })[];

      if (!mountedRef.current) return;
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const toAdd = enriched.filter(m => !existingIds.has(m.id));
        if (toAdd.length === 0) return prev;
        const updated = [...prev, ...toAdd];
        lastMsgIdRef.current = updated[updated.length - 1].id;
        return updated;
      });
      if (allMsgs.some(m => m.sender_id !== profile.id)) { markAsRead(); scrollToBottom(); }
    } catch (err) { console.warn('[ConversationPage] pollNewMessages error:', err); }
  }, [id, profile, markAsRead, scrollToBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectRealtime = useCallback(() => {
    if (!profile || !id) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    // Le polling est le mode principal (l'API admin bypass les RLS récursives).
    // On démarre immédiatement un polling régulier.
    if (!pollRef.current) {
      pollRef.current = setInterval(pollNewMessages, FALLBACK_POLL_INTERVAL);
    }

    // On tente quand même le Realtime en bonus (messages instantanés si les RLS le permettent).
    // Si l'abonnement échoue (RLS récursive sur messages), le polling prend le relais sans erreur UI.
    const channel = supabase
      .channel(`conv-${id}-${Date.now()}`, { config: { broadcast: { ack: false } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, async (payload) => {
        if (!mountedRef.current) return;
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          const updated = [...prev, newMsg];
          lastMsgIdRef.current = newMsg.id;
          return updated;
        });
        if (newMsg.sender_id) getSenderProfile(newMsg.sender_id).then(sender => setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, sender } : m)));
        if (newMsg.sender_id !== profile.id) await markAsRead();
        scrollToBottom();
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          // Realtime opérationnel — le polling devient redondant mais on le garde à basse fréquence
          setRealtimeOk(true);
          reconnectIdx.current = 0;
          // Réduire le polling (garder comme sécurité)
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Realtime indisponible (RLS récursive) — le polling suffit, pas de tentative de reconnexion agressive
          setRealtimeOk(false);
          // S'assurer que le polling tourne
          if (!pollRef.current) pollRef.current = setInterval(pollNewMessages, FALLBACK_POLL_INTERVAL);
          // Tentative de reconnexion espacée (pas en boucle rapide)
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
          if (reconnectIdx.current < RECONNECT_DELAYS.length - 1) {
            reconnectIdx.current++;
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            reconnectRef.current = setTimeout(() => { if (mountedRef.current) connectRealtime(); }, delay);
          }
          // Au-delà du dernier délai, on abandonne le Realtime — le polling suffit
        }
      });

    channelRef.current = channel;
  }, [id, profile, getSenderProfile, markAsRead, scrollToBottom, pollNewMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    if (!profile) { router.push('/connexion'); return; }

    // Marquer comme lu IMMÉDIATEMENT dès l'ouverture de la page
    // (avant même que les données soient chargées)
    markAsRead();

    const init = async () => {
      // Utilise l'API admin pour contourner la récursion infinie dans les RLS
      // de conversation_participants, messages et conversations.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const apiRes = await fetch(`/api/messages/conversation/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }).catch(() => null);

      if (!apiRes) {
        toast.error('Erreur réseau'); setLoading(false); return;
      }

      if (apiRes.status === 403) {
        toast.error('Accès refusé'); router.push('/messages'); return;
      }

      if (apiRes.status === 401) {
        router.push('/connexion'); return;
      }

      if (!apiRes.ok) {
        toast.error('Erreur de chargement'); setLoading(false); return;
      }

      const apiData = await apiRes.json().catch(() => null);
      if (!apiData) { toast.error('Erreur de données'); setLoading(false); return; }

      const { conversation: conv, participants, profiles: profilesData, messages: msgs } = apiData as {
        conversation: Record<string, unknown> | null;
        participants: string[];
        profiles: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
        messages: Array<{ id: string; conversation_id: string; sender_id: string; content: string; created_at: string; is_deleted?: boolean; deleted_at?: string }>;
        myParticipation: { user_id: string; last_read_at: string | null; joined_at: string };
      };

      // Alimenter le cache des profils
      (profilesData || []).forEach(p => { profileCacheRef.current[p.id] = p as unknown as Profile; });

      // Déterminer l'autre utilisateur
      // On cherche dans participants[] le premier ID différent du user courant,
      // puis on retrouve son profil dans profilesData (plus fiable que le cache).
      const candidateIds = (participants || []).filter(uid => uid !== profile.id);

      let otherUserId: string | null = null;
      if (candidateIds.length > 0) {
        const otherId = candidateIds[0];
        // Chercher d'abord dans profilesData (fraîchement récupéré depuis l'API)
        const found = (profilesData || []).find(p => p.id === otherId)
          ?? profileCacheRef.current[otherId]
          ?? null;
        if (found) {
          setOtherUser(found as unknown as Profile);
          otherUserId = found.id;
        } else {
          // Profil introuvable dans la réponse API — tentative directe (table profiles sans RLS récursive)
          supabase.from('profiles').select('id, full_name, avatar_url').eq('id', otherId).maybeSingle()
            .then(({ data }) => {
              if (data && mountedRef.current) {
                profileCacheRef.current[data.id] = data as unknown as Profile;
                setOtherUser(data as unknown as Profile);
              }
            });
          otherUserId = otherId; // conserver l'ID même si profil pas encore chargé
        }
      }

      setSubject((conv?.subject as string) || 'Conversation');
      setRelatedType((conv?.related_type as string) || null);
      setRelatedId((conv?.related_id as string) || null);

      const enriched = (msgs || []).map(msg => ({
        ...msg,
        sender: msg.sender_id ? profileCacheRef.current[msg.sender_id] : undefined,
      })) as (Message & { sender?: Profile })[];

      if (!mountedRef.current) return;
      setMessages(enriched);
      if (enriched.length > 0) lastMsgIdRef.current = enriched[enriched.length - 1].id;

      if (conv?.related_type && EXCHANGEABLE_TYPES[conv.related_type as string]) {
        setExchange({
          status: (conv.exchange_status as ExchangeStatus) || null,
          confirmedBy: (conv.exchange_confirmed_by as string[]) || [],
          confirmedAt: (conv.exchange_confirmed_at as string) || null,
          relatedType: conv.related_type as string,
          relatedId: conv.related_id as string,
          otherUserId: otherUserId || candidateIds[0] || null,
        });
      }

      if (otherUserId) {
        // Les tables user_favorites et user_blocks n'ont pas de RLS récursive
        Promise.all([
          supabase.from('user_favorites').select('id').eq('user_id', profile.id).eq('target_user_id', otherUserId).maybeSingle(),
          supabase.from('user_blocks').select('id').eq('user_id', profile.id).eq('target_user_id', otherUserId).maybeSingle(),
        ]).then(([favRes, blkRes]) => {
          if (!mountedRef.current) return;
          setIsFavorite(!!favRes.data);
          setIsBlocked(!!blkRes.data);
        });
      }

      setLoading(false);
      markAsRead();
      scrollToBottom('instant' as ScrollBehavior);
    };

    init();
    connectRealtime();

    const handleVis = () => {
      if (document.visibilityState === 'visible') { markAsRead(); pollNewMessages(); }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [id, profile, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      const target = e.target as HTMLElement;
      if (!target.closest('[data-msg-menu]')) { setActiveMsg(null); setShowQuickReplies(false); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handlePressStart = (msgId: string, isMe: boolean) => {
    if (!isMe) return;
    pressTimer.current = setTimeout(() => { setActiveMsg(msgId); if (navigator.vibrate) navigator.vibrate(30); }, 600);
  };
  const handlePressEnd = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  const handleDeleteMessage = async (msgId: string) => {
    setActiveMsg(null);
    setDeletingMsg(msgId);
    await new Promise(r => setTimeout(r, 280));
    // Utilise l'API admin pour contourner la récursion RLS
    const { data: { session: delSession } } = await supabase.auth.getSession();
    const delToken = delSession?.access_token;
    const delRes = await fetch(`/api/messages/conversation/${id}?messageId=${msgId}`, {
      method: 'DELETE',
      headers: delToken ? { 'Authorization': `Bearer ${delToken}` } : {},
    }).catch(() => null);
    if (!delRes?.ok) { toast.error('Impossible de supprimer ce message'); setDeletingMsg(null); }
    else { setMessages(prev => prev.filter(m => m.id !== msgId)); setDeletingMsg(null); }
  };

  const handleToggleFavorite = async () => {
    if (!profile || !otherUser) return;
    setMenuOpen(false);
    if (isFavorite) {
      await supabase.from('user_favorites').delete().eq('user_id', profile.id).eq('target_user_id', otherUser.id);
      setIsFavorite(false);
      toast.success(`${otherUser.full_name || 'Utilisateur'} retiré des favoris`);
    } else {
      await supabase.from('user_favorites').insert({ user_id: profile.id, target_user_id: otherUser.id });
      setIsFavorite(true);
      toast.success(`${otherUser.full_name || 'Utilisateur'} ajouté aux favoris ⭐`);
    }
  };

  const handleToggleBlock = async () => {
    if (!profile || !otherUser) return;
    setMenuOpen(false);
    if (isBlocked) {
      await supabase.from('user_blocks').delete().eq('user_id', profile.id).eq('target_user_id', otherUser.id);
      setIsBlocked(false);
      toast.success(`${otherUser.full_name || 'Utilisateur'} débloqué`);
    } else {
      if (!confirm(`Bloquer ${otherUser.full_name || 'cet utilisateur'} ?`)) return;
      await supabase.from('user_blocks').insert({ user_id: profile.id, target_user_id: otherUser.id });
      setIsBlocked(true);
      toast.success(`${otherUser.full_name || 'Utilisateur'} bloqué`);
    }
  };

  useEffect(() => { if (!loading && messages.length > 0) scrollToBottom(); }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (content?: string) => {
    const text = (content || newMessage).trim();
    if (!text || !profile || sending) return;
    setSending(true);
    if (!content) setNewMessage('');
    setShowQuickReplies(false);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, conversation_id: id as string, sender_id: profile.id, content: text, created_at: new Date().toISOString(), sender: profile as unknown as Profile }]);
    scrollToBottom();

    // Utilise l'API admin pour contourner la récursion RLS sur messages
    const { data: { session: sendSession } } = await supabase.auth.getSession();
    const sendToken = sendSession?.access_token;
    const sendRes = await fetch(`/api/messages/conversation/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sendToken ? { 'Authorization': `Bearer ${sendToken}` } : {}),
      },
      body: JSON.stringify({ content: text }),
    }).catch(() => null);
    const savedMsg = sendRes?.ok ? (await sendRes.json().catch(() => null))?.message : null;
    const error = !sendRes?.ok ? true : null;

    if (error) {
      toast.error('Erreur lors de l\'envoi');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      if (!content) setNewMessage(text);
    } else if (savedMsg) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...savedMsg, sender: profile as unknown as Profile } : m));
      lastMsgIdRef.current = savedMsg.id;

      // Notifications gérées côté serveur dans /api/messages/conversation/[id] POST
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Suggestions de réponses rapides selon le contexte ─────────────────────
  const getQuickReplies = (): string[] => {
    if (!relatedType) return ['Bonjour ! 👋', 'Merci pour votre message.', 'Je suis intéressé(e).', 'Pouvez-vous me donner plus d\'infos ?'];
    if (relatedType === 'listing') return ['Je suis intéressé(e) 🛒', 'Est-il encore disponible ?', 'Quel est votre dernier prix ?', 'Quand peut-on se rencontrer ?'];
    if (relatedType === 'equipment') return ['Je voudrais emprunter ce matériel 🔧', 'Pour quelle durée est-il disponible ?', 'À quel endroit peut-on se retrouver ?', 'Je vous le rends en bon état, promis !'];
    if (relatedType === 'help_request') return ['Je peux vous aider ! 🙋', 'À quelle heure êtes-vous disponible ?', 'Donnez-moi votre adresse.', 'J\'arrive dès que possible.'];
    if (relatedType === 'outing') return ['Je participe avec plaisir ! 🐾', 'Quel est le point de rendez-vous ?', 'Combien de chiens maximum ?', 'J\'ai une question sur le parcours.'];
    if (relatedType === 'service_request') return ['Je peux intervenir 🔨', 'Je viendrai estimer le travail.', 'Pouvez-vous partager des photos ?', 'Quel est votre délai souhaité ?'];
    return ['Bonjour ! 👋', 'Merci pour votre message.', 'À très bientôt !', 'Bien reçu, je reviens vers vous.'];
  };

  // ── Grouper les messages par jour ─────────────────────────────────────────
  const groupedMessages = messages.reduce((acc, msg, i) => {
    const msgDate = new Date(msg.created_at).toDateString();
    const prevDate = i > 0 ? new Date(messages[i - 1].created_at).toDateString() : null;
    const showSep = msgDate !== prevDate;
    acc.push({ msg, showSep });
    return acc;
  }, [] as { msg: typeof messages[0]; showSep: boolean }[]);

  const conf = relatedType ? CONTEXT_CONFIG[relatedType] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 h-[calc(100vh-64px)] flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-3">
        <Link href="/messages" className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>

        <div className="relative flex-shrink-0">
          <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name || '?'} size="md" />
          {isFavorite && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[9px]">⭐</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-900 truncate">
              {otherUser?.full_name
                ? otherUser.full_name
                : loading ? <span className="inline-block w-28 h-4 bg-gray-200 animate-pulse rounded" /> : (subject || '—')}
            </span>
            {isBlocked && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Bloqué</span>}
          </div>

          {/* Badge contexte en en-tête */}
          {conf && relatedType !== 'general' ? (
            <div className="flex items-center gap-1 mt-0.5">
              <conf.icon className={cn('w-3 h-3', conf.color)} />
              <span className={cn('text-xs font-semibold', conf.color)}>{conf.label}</span>
              {subject && <span className="text-xs text-gray-400">· {subject.slice(0, 30)}{subject.length > 30 ? '…' : ''}</span>}
            </div>
          ) : (
            <div className="text-xs text-gray-400 truncate">{subject}</div>
          )}
        </div>

        {/* Indicateur Realtime — affiché uniquement si connecté en temps réel */}
        {realtimeOk && (
          <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 text-emerald-600 bg-emerald-50">
            <Wifi className="w-3 h-3" /><span className="hidden sm:inline">En ligne</span>
          </div>
        )}

        {/* Menu ⋮ */}
        {otherUser && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
              title="Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[200px]">
                <Link href={`/profil/${otherUser.id}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700">
                  <UserCheck className="w-4 h-4 text-gray-400" />Voir le profil
                </Link>
                {relatedType && relatedId && relatedType !== 'general' && conf && (
                  <Link href={conf.href(relatedId)} target="_blank" onClick={() => setMenuOpen(false)} className={cn('flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm', conf.color)}>
                    <ExternalLink className="w-4 h-4" />Voir {conf.label.toLowerCase()}
                  </Link>
                )}
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Lien copié !'); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-500 w-full"
                >
                  <Copy className="w-4 h-4" />Copier le lien
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button onClick={handleToggleFavorite} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm w-full text-left">
                  {isFavorite ? <><StarOff className="w-4 h-4 text-yellow-500" /><span className="text-gray-700">Retirer des favoris</span></> : <><Star className="w-4 h-4 text-yellow-500" /><span className="text-gray-700">Ajouter aux favoris</span></>}
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button onClick={handleToggleBlock} className={cn('flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm w-full text-left', isBlocked ? 'text-gray-500' : 'text-red-600')}>
                  <Ban className="w-4 h-4" />{isBlocked ? 'Débloquer' : 'Bloquer cet utilisateur'}
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button onClick={() => { setMenuOpen(false); toast('Signalement envoyé — merci !'); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm w-full text-left text-gray-500">
                  <Flag className="w-4 h-4" />Signaler
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bannière contexte ──────────────────────────────────────────────────── */}
      {!loading && (
        <ContextBanner relatedType={relatedType} relatedId={relatedId} subject={subject} />
      )}

      {/* ── Panneau échange ────────────────────────────────────────────────────── */}
      {!loading && profile && exchange.relatedType && EXCHANGEABLE_TYPES[exchange.relatedType] && (
        <ExchangePanel conversationId={id as string} userId={profile.id} exchange={exchange} onExchangeUpdated={setExchange} />
      )}

      {/* ── Fil de messages ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pb-4 px-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse space-y-3 w-full px-4">
              <div className="h-10 bg-gray-100 rounded-2xl w-2/3" />
              <div className="h-10 bg-gray-100 rounded-2xl w-1/2 ml-auto" />
              <div className="h-10 bg-gray-100 rounded-2xl w-3/4" />
              <div className="h-10 bg-gray-100 rounded-2xl w-2/5 ml-auto" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-brand-400" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">Démarrez la conversation !</p>
            <p className="text-gray-400 text-sm">Écrivez votre premier message ci-dessous</p>
            {relatedType && relatedType !== 'general' && conf && (
              <div className={cn('mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium', conf.bg, conf.color)}>
                <conf.icon className="w-3.5 h-3.5" />
                <span>À propos de : {subject || conf.label}</span>
              </div>
            )}
          </div>
        ) : (
          groupedMessages.map(({ msg, showSep }, i) => {
            const isMe = msg.sender_id === profile?.id;
            const isTemp = msg.id.startsWith('temp-');
            const isDeleting = deletingMsg === msg.id;
            const isMenuOpen = activeMsg === msg.id;

            // Détection message système
            const isSystem = (msg as Message & { is_system?: boolean }).is_system ||
              msg.content?.startsWith('✅') || msg.content?.startsWith('🤝') ||
              msg.content?.includes('Échange confirmé') || msg.content?.includes('Conversation créée');

            const showAvatar = !isMe && !isSystem && (i === 0 || groupedMessages[i - 1]?.msg.sender_id !== msg.sender_id);
            const isLastFromSender = isMe && !isSystem && (i === groupedMessages.length - 1 || groupedMessages[i + 1]?.msg.sender_id !== profile?.id);

            return (
              <div key={msg.id} className={cn('transition-all duration-300', isDeleting && 'opacity-0 scale-95 pointer-events-none')}>
                {/* Séparateur de date */}
                {showSep && <DateSeparator date={msg.created_at} />}

                {/* Message système */}
                {isSystem ? (
                  <SystemMessage content={msg.content || ''} />
                ) : (
                  <div data-msg-menu={isMenuOpen ? 'open' : undefined}>
                    {/* Ligne principale */}
                    <div className={cn('flex items-end gap-1.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
                      {/* Avatar */}
                      {!isMe && (
                        <div className={cn('flex-shrink-0 w-8', !showAvatar && 'invisible')}>
                          <Avatar src={msg.sender?.avatar_url} name={msg.sender?.full_name || '?'} size="sm" />
                        </div>
                      )}

                      {/* Bulle */}
                      <div
                        className={cn(
                          'max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words cursor-default select-text',
                          isMe ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm',
                          isTemp && 'opacity-60',
                          isMenuOpen && isMe && 'ring-2 ring-red-400'
                        )}
                        onContextMenu={isMe && !isTemp ? (e) => { e.preventDefault(); setActiveMsg(isMenuOpen ? null : msg.id); } : undefined}
                        onTouchStart={() => handlePressStart(msg.id, isMe)}
                        onTouchEnd={handlePressEnd}
                        onTouchMove={handlePressEnd}
                      >
                        {msg.content}
                      </div>

                      {/* Bouton suppression */}
                      {isMe && !isTemp && (
                        <button
                          data-msg-menu="trigger"
                          onClick={(e) => { e.stopPropagation(); setActiveMsg(isMenuOpen ? null : msg.id); }}
                          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setActiveMsg(isMenuOpen ? null : msg.id); }}
                          className={cn(
                            'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100',
                            isMenuOpen ? 'bg-red-500 text-white opacity-100' : 'bg-red-100 text-red-400 hover:bg-red-200 hover:text-red-600'
                          )}
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Heure + statut */}
                    <div className={cn(
                      'text-xs text-gray-400 mt-0.5 px-1 flex items-center gap-1',
                      isMe ? 'justify-end pr-10' : 'justify-start pl-10'
                    )}>
                      <span>{formatRelative(msg.created_at)}</span>
                      {isTemp && <span className="text-gray-300">· envoi…</span>}
                      {isMe && !isTemp && isLastFromSender && <CheckCheck className="w-3 h-3 text-brand-400" />}
                    </div>

                    {/* Popup confirmation suppression */}
                    {isMenuOpen && isMe && (
                      <div data-msg-menu="popup" className="flex justify-end pr-10 mt-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 bg-white border border-red-200 shadow-lg rounded-2xl px-3 py-2 text-xs">
                          <Trash2 className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-gray-700 font-medium">Supprimer ce message ?</span>
                          <button onClick={e => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-lg">Oui</button>
                          <button onClick={e => { e.stopPropagation(); setActiveMsg(null); }} className="text-gray-400 hover:text-gray-600 font-medium">Non</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Réponses rapides ──────────────────────────────────────────────────── */}
      {showQuickReplies && (
        <div className="flex flex-wrap gap-1.5 mb-2 pb-1 overflow-x-auto">
          {getQuickReplies().map((reply, i) => (
            <button
              key={i}
              onClick={() => sendMessage(reply)}
              className="flex-shrink-0 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl text-xs font-semibold hover:bg-brand-100 transition-colors border border-brand-200"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* ── Zone de saisie ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        {/* Bouton réponses rapides */}
        <button
          onClick={() => setShowQuickReplies(v => !v)}
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
            showQuickReplies ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          )}
          title="Réponses rapides"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              relatedType && relatedType !== 'general'
                ? 'Posez une question ou proposez quelque chose…'
                : 'Écrivez votre message…'
            }
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
            disabled={sending}
            autoFocus
          />
          {sending && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />}
        </div>

        <button
          onClick={() => sendMessage()}
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
