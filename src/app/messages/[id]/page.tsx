'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Send, ChevronLeft, CheckCheck, ExternalLink,
  ShoppingBag, HandHeart, Dog, Users, MapPin, Wrench,
  HelpCircle, MessageSquare, ChevronDown, ChevronUp,
  PartyPopper, Star, Clock, ThumbsUp,
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

// ─── Bannière de contexte ──────────────────────────────────────────────────────
function ContextBanner({
  relatedType,
  relatedId,
  subject,
}: {
  relatedType: string | null;
  relatedId: string | null;
  subject: string;
}) {
  const [open, setOpen] = useState(true);
  const [contextData, setContextData] = useState<{
    title: string;
    description?: string;
    photo?: string;
    price?: string;
    location?: string;
    status?: string;
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
          const { data } = await supabase
            .from('listings')
            .select('title, description, price, location, listing_type, photos:listing_photos(url)')
            .eq('id', relatedId)
            .single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              price: data.price != null ? (data.price === 0 ? 'Gratuit' : `${data.price} €`) : undefined,
              location: data.location,
              status: data.listing_type,
            });
          }
        } else if (relatedType === 'equipment') {
          const { data } = await supabase
            .from('equipment_items')
            .select('title, description, daily_rate, photos:equipment_photos(url)')
            .eq('id', relatedId)
            .single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              price: data.daily_rate ? `${data.daily_rate} €/j` : 'Gratuit',
            });
          }
        } else if (relatedType === 'help_request') {
          const { data } = await supabase
            .from('help_requests')
            .select('title, description, category, urgency, location_city, photos:help_photos(url)')
            .eq('id', relatedId)
            .single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              location: data.location_city,
              status: data.urgency,
            });
          }
        } else if (relatedType === 'lost_found') {
          const { data } = await supabase
            .from('lost_found_items')
            .select('title, description, location_area, photos:lf_photos(url)')
            .eq('id', relatedId)
            .single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              location: data.location_area,
            });
          }
        } else if (relatedType === 'association') {
          const { data } = await supabase
            .from('associations')
            .select('name, description, location, photos:asso_photos(url)')
            .eq('id', relatedId)
            .single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.name,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              location: data.location,
            });
          }
        } else if (relatedType === 'collection_item') {
          const { data } = await supabase
            .from('collection_items')
            .select('title, description, price, photos:collection_photos(url)')
            .eq('id', relatedId)
            .single();
          if (data) {
            const photos = data.photos as Array<{ url: string }> | undefined;
            setContextData({
              title: data.title,
              description: data.description?.slice(0, 120),
              photo: photos?.[0]?.url,
              price: data.price != null ? `${data.price} €` : undefined,
            });
          }
        } else if (relatedType === 'service_request') {
          const { data } = await supabase
            .from('service_requests')
            .select('title, description')
            .eq('id', relatedId)
            .single();
          if (data) {
            setContextData({ title: data.title, description: data.description?.slice(0, 120) });
          }
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
      {/* Barre titre cliquable */}
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

      {/* Détail dépliable */}
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
                <img
                  src={contextData.photo}
                  alt={contextData.title}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-white/50 shadow-sm"
                />
              ) : (
                <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/50')}>
                  <CtxIcon className={cn('w-6 h-6', conf.color)} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('font-bold text-sm leading-tight truncate', conf.color)}>{contextData.title}</p>
                {contextData.description && (
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">{contextData.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {contextData.price && (
                    <span className={cn('text-xs font-black', conf.color)}>{contextData.price}</span>
                  )}
                  {contextData.location && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />{contextData.location}
                    </span>
                  )}
                  {contextData.status && (
                    <span className="text-xs text-gray-500 capitalize">{contextData.status}</span>
                  )}
                </div>
              </div>
              <Link
                href={href}
                className={cn(
                  'flex-shrink-0 self-center flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-white/80 border transition-all hover:bg-white',
                  conf.color, conf.border
                )}
                target="_blank"
              >
                <ExternalLink className="w-3 h-3" />
                Voir
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
  confirmedBy: string[];  // UUIDs des participants ayant confirmé
  confirmedAt: string | null;
  relatedType: string | null;
  relatedId: string | null;
  otherUserId: string | null;
}

// ─── Types échangeables (peuvent déclencher un avis) ──────────────────────────
const EXCHANGEABLE_TYPES: Record<string, { label: string; verb: string; color: string; bg: string; border: string }> = {
  listing:         { label: 'Annonce',         verb: 'la vente',          color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  equipment:       { label: 'Matériel',         verb: 'le prêt',           color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200'   },
  help_request:    { label: 'Coup de main',     verb: 'l\'aide',           color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  association:     { label: 'Association',      verb: 'le contact',        color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  collection_item: { label: 'Collection',       verb: 'l\'échange',        color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200'   },
  service_request: { label: 'Demande artisan',  verb: 'la prestation',     color: 'text-brand-700',  bg: 'bg-brand-50',  border: 'border-brand-200'  },
};

// ─── Panneau de confirmation d'échange ────────────────────────────────────────
function ExchangePanel({
  conversationId,
  userId,
  exchange,
  onExchangeUpdated,
}: {
  conversationId: string;
  userId: string;
  exchange: ExchangeInfo;
  onExchangeUpdated: (updated: ExchangeInfo) => void;
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
      const { error } = await supabase
        .from('conversations')
        .update({
          exchange_status: bothDone ? 'done' : 'pending_confirmation',
          exchange_confirmed_by: newConfirmedBy,
          exchange_confirmed_at: bothDone ? new Date().toISOString() : null,
        })
        .eq('id', conversationId);

      if (error) { toast.error('Erreur de confirmation'); return; }

      // Message automatique dans la conversation
      const msg = bothDone
        ? `✅ Échange confirmé par les deux parties — les avis sont maintenant débloqués.`
        : `🤝 J'ai confirmé la fin de ${conf.verb}. En attente de confirmation de l'autre partie.`;
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: msg,
      });

      onExchangeUpdated({
        ...exchange,
        status: bothDone ? 'done' : 'pending_confirmation',
        confirmedBy: newConfirmedBy,
        confirmedAt: bothDone ? new Date().toISOString() : null,
      });

      if (bothDone) toast.success('Échange confirmé ! Vous pouvez maintenant laisser un avis.');
      else toast.success('Confirmation envoyée ! En attente de l\'autre partie.');
    } finally { setConfirming(false); }
  };

  // Échange terminé → afficher un résumé + lien vers l'avis
  if (isDone) {
    return (
      <div className={cn('rounded-2xl border p-4 mb-3', conf.bg, conf.border)}>
        <div className="flex items-center gap-2 mb-3">
          <PartyPopper className={cn('w-5 h-5 flex-shrink-0', conf.color)} />
          <div>
            <p className={cn('font-bold text-sm', conf.color)}>Échange terminé ✅</p>
            {exchange.confirmedAt && (
              <p className="text-xs text-gray-500">
                Confirmé le {new Date(exchange.confirmedAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}
              </p>
            )}
          </div>
        </div>
        {exchange.relatedType && exchange.relatedId && (
          <div className="bg-white/70 rounded-xl p-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
            <p className="text-xs text-gray-700 flex-1">
              Votre avis est maintenant <strong>débloqué</strong>.
            </p>
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

  // En attente ou pas encore commencé
  return (
    <div className={cn('rounded-2xl border p-4 mb-3', conf.bg, conf.border)}>
      <div className="flex items-start gap-3">
        <ThumbsUp className={cn('w-5 h-5 flex-shrink-0 mt-0.5', conf.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn('font-bold text-sm mb-0.5', conf.color)}>
            {conf.label} — Confirmer la fin de l&apos;échange
          </p>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            {iHaveConfirmed
              ? `✓ Vous avez confirmé. ${otherHasConfirmed ? 'Les deux parties ont confirmé !' : 'En attente de confirmation de l\'autre partie…'}`
              : `Avez-vous terminé ${conf.verb} ? Confirmez pour débloquer les avis vérifiés.`
            }
          </p>
          {otherHasConfirmed && !iHaveConfirmed && (
            <p className="text-xs text-emerald-700 font-semibold mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              L&apos;autre partie a déjà confirmé — confirmez pour finaliser !
            </p>
          )}
          {!iHaveConfirmed && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all',
                'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50'
              )}
            >
              {confirming
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <CheckCheck className="w-4 h-4" />
              }
              {confirming ? 'Confirmation…' : 'Confirmer la fin de l\'échange'}
            </button>
          )}
          {iHaveConfirmed && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <CheckCheck className="w-4 h-4" />
              Votre confirmation est enregistrée
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Délais de reconnexion (ms) ────────────────────────────────────────────────
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
// Intervalle du polling de secours quand Realtime est KO (ms)
const FALLBACK_POLL_INTERVAL = 5000;

// ─── Page conversation ─────────────────────────────────────────────────────────
export default function ConversationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [messages, setMessages]       = useState<(Message & { sender?: Profile })[]>([]);
  const [newMessage, setNewMessage]   = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [otherUser, setOtherUser]     = useState<Profile | null>(null);
  const [subject, setSubject]         = useState('');
  const [relatedType, setRelatedType] = useState<string | null>(null);
  const [relatedId, setRelatedId]     = useState<string | null>(null);
  const [realtimeOk, setRealtimeOk]   = useState(false);
  const [exchange, setExchange]       = useState<ExchangeInfo>({
    status: null, confirmedBy: [], confirmedAt: null,
    relatedType: null, relatedId: null, otherUserId: null,
  });

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
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

  const markAsRead = useCallback(async () => {
    if (!profile) return;
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', id as string)
      .eq('user_id', profile.id);
    window.dispatchEvent(new Event('messages-read'));
  }, [id, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling de secours : récupère les nouveaux messages depuis le dernier connu ──
  const pollNewMessages = useCallback(async () => {
    if (!mountedRef.current || !profile) return;
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id as string)
        .order('created_at', { ascending: true });

      if (lastMsgIdRef.current) {
        // Récupérer seulement les messages plus récents que le dernier connu
        const lastMsg = (await supabase
          .from('messages')
          .select('created_at')
          .eq('id', lastMsgIdRef.current)
          .single()).data;
        if (lastMsg) {
          query = query.gt('created_at', lastMsg.created_at);
        }
      }

      const { data: newMsgs } = await query;
      if (!newMsgs || newMsgs.length === 0) return;

      const enriched = await Promise.all(
        newMsgs.map(async (msg) => {
          const sender = msg.sender_id ? await getSenderProfile(msg.sender_id) : undefined;
          return { ...msg, sender } as Message & { sender?: Profile };
        })
      );

      if (!mountedRef.current) return;
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const toAdd = enriched.filter(m => !existingIds.has(m.id));
        if (toAdd.length === 0) return prev;
        const updated = [...prev, ...toAdd];
        lastMsgIdRef.current = updated[updated.length - 1].id;
        return updated;
      });

      // Marquer comme lu si nouveaux messages de l'autre
      if (newMsgs.some(m => m.sender_id !== profile.id)) {
        await markAsRead();
        scrollToBottom();
      }
    } catch (err) {
      console.warn('[ConversationPage] pollNewMessages error:', err);
    }
  }, [id, profile, getSenderProfile, markAsRead, scrollToBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connexion Realtime ──────────────────────────────────────────────────────
  const connectRealtime = useCallback(() => {
    if (!profile || !id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`conv-${id}-${Date.now()}`, { config: { broadcast: { ack: false } } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        async (payload) => {
          if (!mountedRef.current) return;
          const newMsg = payload.new as Message;

          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            lastMsgIdRef.current = newMsg.id;
            return updated;
          });

          if (newMsg.sender_id) {
            getSenderProfile(newMsg.sender_id).then(sender =>
              setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, sender } : m))
            );
          }

          if (newMsg.sender_id !== profile.id) {
            await markAsRead();
          }
          scrollToBottom();
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        const ok = status === 'SUBSCRIBED';
        setRealtimeOk(ok);

        if (ok) {
          reconnectIdx.current = 0;
          // Arrêter le polling de secours
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeOk(false);

          // Démarrer le polling de secours
          if (!pollRef.current) {
            pollRef.current = setInterval(pollNewMessages, FALLBACK_POLL_INTERVAL);
          }

          // Planifier reconnexion
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
          reconnectIdx.current = Math.min(reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);

          if (reconnectRef.current) clearTimeout(reconnectRef.current);
          reconnectRef.current = setTimeout(() => {
            if (mountedRef.current) connectRealtime();
          }, delay);
        }
      });

    channelRef.current = channel;
  }, [id, profile, getSenderProfile, markAsRead, scrollToBottom, pollNewMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    if (!profile) { router.push('/connexion'); return; }

    const init = async () => {
      // Vérifier accès
      const { data: participants } = await supabase
        .from('conversation_participants').select('user_id').eq('conversation_id', id as string);
      if (!participants?.find(p => p.user_id === profile.id)) {
        toast.error('Accès refusé'); router.push('/messages'); return;
      }

      // Infos conversation (sujet + contexte + échange + owner_id pour l'autre participant)
      const { data: conv } = await supabase
        .from('conversations')
        .select('subject, related_type, related_id, exchange_status, exchange_confirmed_by, exchange_confirmed_at, owner_id, created_by')
        .eq('id', id as string)
        .single();

      // Profil autre participant :
      // 1. Via RPC SECURITY DEFINER (contourne la RLS qui filtre user_id=auth.uid())
      // 2. Fallback : tableau participants si RLS permissive
      // 3. Fallback : owner_id / created_by de la conversation
      const other = participants.find(p => p.user_id !== profile.id);
      let otherUserId: string | null = null;

      const { data: rpcOther } = await supabase.rpc(
        'get_conversation_other_participant',
        { p_conversation_id: id as string }
      );
      if (rpcOther && (rpcOther as Array<{user_id:string;full_name:string;avatar_url:string}>).length > 0) {
        const op = (rpcOther as Array<{user_id:string;full_name:string;avatar_url:string}>)[0];
        setOtherUser({ id: op.user_id, full_name: op.full_name, avatar_url: op.avatar_url } as Profile);
        otherUserId = op.user_id;
      } else if (other) {
        otherUserId = other.user_id;
        const op = await getSenderProfile(other.user_id);
        setOtherUser(op || null);
      } else if (conv?.owner_id && conv.owner_id !== profile.id) {
        otherUserId = conv.owner_id as string;
        const op = await getSenderProfile(otherUserId);
        setOtherUser(op || null);
      } else if (conv?.created_by && conv.created_by !== profile.id) {
        otherUserId = conv.created_by as string;
        const op = await getSenderProfile(otherUserId);
        setOtherUser(op || null);
      }
      setSubject(conv?.subject || 'Conversation');
      setRelatedType(conv?.related_type || null);
      setRelatedId(conv?.related_id || null);

      // Charger l'état d'échange (utilise otherUserId déjà résolu ci-dessus)
      if (conv?.related_type && EXCHANGEABLE_TYPES[conv.related_type]) {
        setExchange({
          status: (conv.exchange_status as ExchangeStatus) || null,
          confirmedBy: (conv.exchange_confirmed_by as string[]) || [],
          confirmedAt: conv.exchange_confirmed_at || null,
          relatedType: conv.related_type,
          relatedId: conv.related_id,
          otherUserId: otherUserId || participants.find(p => p.user_id !== profile.id)?.user_id || null,
        });
      }

      // Charger les messages
      const { data: msgs } = await supabase
        .from('messages').select('*').eq('conversation_id', id as string).order('created_at', { ascending: true });

      const enriched = await Promise.all(
        (msgs || []).map(async (msg) => {
          const sender = msg.sender_id ? await getSenderProfile(msg.sender_id) : undefined;
          return { ...msg, sender } as Message & { sender?: Profile };
        })
      );

      if (!mountedRef.current) return;
      setMessages(enriched);
      if (enriched.length > 0) {
        lastMsgIdRef.current = enriched[enriched.length - 1].id;
      }

      // ── Dernier recours : déduire l'autre utilisateur depuis les messages ──
      // Fonctionne même si la RPC et les autres fallbacks ont échoué
      if (!otherUserId && enriched.length > 0) {
        const otherSenderId = enriched.find(m => m.sender_id !== profile.id)?.sender_id;
        if (otherSenderId) {
          const op = await getSenderProfile(otherSenderId);
          if (op) setOtherUser(op);
          otherUserId = otherSenderId;
        }
      }

      setLoading(false);
      await markAsRead();
      scrollToBottom('instant' as ScrollBehavior);
    };

    init();
    connectRealtime();

    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        markAsRead();
        // Rafraîchir en cas de messages manqués pendant l'absence
        pollNewMessages();
      }
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
    if (!loading && messages.length > 0) scrollToBottom();
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile || sending) return;
    const content = newMessage.trim();
    setSending(true);
    setNewMessage('');

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, conversation_id: id as string, sender_id: profile.id,
      content, created_at: new Date().toISOString(), sender: profile as unknown as Profile,
    }]);
    scrollToBottom();

    const { data: savedMsg, error } = await supabase
      .from('messages').insert({ conversation_id: id as string, sender_id: profile.id, content }).select().single();

    if (error) {
      toast.error('Erreur lors de l\'envoi');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
    } else if (savedMsg) {
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...savedMsg, sender: profile as unknown as Profile } : m
      ));
      lastMsgIdRef.current = savedMsg.id;
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 h-[calc(100vh-64px)] flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-3">
        <Link href="/messages" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="relative flex-shrink-0">
          <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name || '?'} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">{otherUser?.full_name || 'Inconnu'}</div>
          <div className="text-xs text-gray-400 truncate">{subject}</div>
        </div>
        {/* Indicateur état Realtime — connexion au canal, pas présence de l'autre user */}
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 transition-all',
          realtimeOk
            ? 'text-emerald-600 bg-emerald-50'
            : 'text-gray-400 bg-gray-100'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', realtimeOk ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400')} />
          {realtimeOk ? 'En ligne' : 'Reconnexion…'}
        </div>
      </div>

      {/* ── Bannière contexte annonce ─────────────────────────────────────────── */}
      {!loading && (
        <ContextBanner
          relatedType={relatedType}
          relatedId={relatedId}
          subject={subject}
        />
      )}

      {/* ── Panneau suivi échange + avis ──────────────────────────────────────── */}
      {!loading && profile && exchange.relatedType && EXCHANGEABLE_TYPES[exchange.relatedType] && (
        <ExchangePanel
          conversationId={id as string}
          userId={profile.id}
          exchange={exchange}
          onExchangeUpdated={setExchange}
        />
      )}

      {/* ── Avis débloqués (échange terminé) ─────────────────────────────────── */}
      {!loading && exchange.status === 'done' && exchange.relatedId && exchange.relatedType
       && (exchange.relatedType as RatingTargetType) in ({} as Record<RatingTargetType, unknown>)
        ? null /* affiché dans ExchangePanel */ : null
      }

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse space-y-3 w-full px-4">
              <div className="h-10 bg-gray-100 rounded-2xl w-2/3" />
              <div className="h-10 bg-gray-100 rounded-2xl w-1/2 ml-auto" />
              <div className="h-10 bg-gray-100 rounded-2xl w-3/4" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-gray-500 text-sm">Démarrez la conversation !</p>
            <p className="text-gray-400 text-xs mt-1">Écrivez votre premier message ci-dessous</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === profile?.id;
            const isTemp = msg.id.startsWith('temp-');
            const showAvatar = !isMe && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
            const isLastFromMe = isMe && (i === messages.length - 1 || messages[i + 1]?.sender_id !== profile?.id);
            return (
              <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                {!isMe && (
                  <div className={cn('flex-shrink-0 w-8', !showAvatar && 'invisible')}>
                    <Avatar src={msg.sender?.avatar_url} name={msg.sender?.full_name || '?'} size="sm" />
                  </div>
                )}
                <div className={cn('max-w-[72%]', isMe && 'items-end flex flex-col')}>
                  <div className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity',
                    isMe ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm',
                    isTemp && 'opacity-50'
                  )}>
                    {msg.content}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 px-1 flex items-center gap-1">
                    <span>{formatRelative(msg.created_at)}</span>
                    {isTemp && <span className="text-gray-300">· envoi…</span>}
                    {isMe && !isTemp && isLastFromMe && <CheckCheck className="w-3 h-3 text-brand-400" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
            disabled={sending}
            autoFocus
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
