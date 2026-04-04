'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Calendar, Mail, Phone,
  PartyPopper, Star, Users, Loader2, UserX, MessageCircle,
  ExternalLink, Shield, CheckCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Avatar from '@/components/ui/Avatar';
import { UserRatingBadge } from '@/components/ui/RatingWidget';
import { ROLE_LABELS } from '@/lib/utils';
import { EVENT_STATUS_CONFIG } from '@/lib/events';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfile {
  id: string;
  full_name: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  phone?: string | null;
  role: string;
  status?: string | null;
  created_at: string;
}

interface EventItem {
  id: string;
  title: string;
  event_date: string;
  start_time?: string | null;
  location?: string | null;
  status: string;
  category?: string | null;
  cover_photo_url?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function memberSince(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const rawParams = useParams();
  const userId = (Array.isArray(rawParams?.id) ? rawParams.id[0] : rawParams?.id) ?? '';
  const router = useRouter();
  const { profile: me } = useAuthStore();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'events'>('info');

  const isMe = me?.id === userId;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);

      // 1. Charger le profil
      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, bio, city, phone, role, status, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPublicProfile(p);

      // 2. Charger les événements organisés (table events puis local_events en fallback)
      let evData: EventItem[] | null = null;
      try {
        const { data } = await supabase
          .from('events')
          .select('id, title, event_date, start_time, location, status, category, cover_photo_url')
          .eq('author_id', userId)
          .not('status', 'in', '(archive)')
          .order('event_date', { ascending: false })
          .limit(12);
        evData = data ?? [];
      } catch {
        try {
          const { data } = await supabase
            .from('local_events')
            .select('id, title, event_date, start_time, location, status, category, cover_photo_url')
            .eq('author_id', userId)
            .order('event_date', { ascending: false })
            .limit(12);
          evData = data ?? [];
        } catch { evData = []; }
      }
      setEvents(evData ?? []);
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // ── 404 ──
  if (notFound || !publicProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <UserX className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-700">Profil introuvable</h1>
        <p className="text-gray-500 text-center">Ce profil n&apos;existe pas ou a été supprimé.</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  const isAdmin = me?.role === 'admin' || me?.role === 'moderator';
  const canSeeContact = isMe || isAdmin;

  const upcomingEvents = events.filter(e => ['a_venir', 'complet', 'reporte'].includes(e.status));
  const pastEvents = events.filter(e => ['passe', 'annule', 'archive'].includes(e.status));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-purple-700 via-pink-600 to-rose-500 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-8 pt-2">
          <div className="flex items-end gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar
                src={publicProfile.avatar_url}
                name={publicProfile.full_name || publicProfile.email || '?'}
                size="xl"
                className="ring-4 ring-white/40 shadow-lg"
              />
              {publicProfile.role === 'admin' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow">
                  <Shield className="w-3.5 h-3.5 text-yellow-900" />
                </div>
              )}
              {publicProfile.role === 'artisan_verified' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow">
                  <CheckCircle className="w-3.5 h-3.5 text-green-900" />
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight truncate">
                {publicProfile.full_name || 'Utilisateur'}
              </h1>
              {publicProfile.city && (
                <p className="flex items-center gap-1 text-white/80 text-sm mt-0.5">
                  <MapPin className="w-3.5 h-3.5" /> {publicProfile.city}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                  {ROLE_LABELS[publicProfile.role] ?? publicProfile.role}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs">
                  Membre depuis {memberSince(publicProfile.created_at)}
                </span>
                {publicProfile.status === 'suspended' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/80 text-xs font-semibold">
                    Suspendu
                  </span>
                )}
              </div>
              {publicProfile.id && (
                <div className="mt-2">
                  <UserRatingBadge userId={publicProfile.id} />
                </div>
              )}
            </div>

            {/* Action — si ce n'est pas moi */}
            {!isMe && me && (
              <Link
                href={`/messages?to=${userId}`}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Message
              </Link>
            )}
            {isMe && (
              <Link
                href="/profil"
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
              >
                Modifier mon profil
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {[
            { key: 'info', label: 'Informations', icon: <Users className="w-4 h-4" /> },
            { key: 'events', label: `Événements (${events.length})`, icon: <PartyPopper className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'info' | 'events')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Info ── */}
        {activeTab === 'info' && (
          <div className="space-y-4">

            {/* Bio */}
            {publicProfile.bio && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-700 text-sm mb-2">À propos</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{publicProfile.bio}</p>
              </div>
            )}

            {/* Coordonnées (visibles seulement par soi ou admin) */}
            {canSeeContact && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
                <h2 className="font-semibold text-gray-700 text-sm">Coordonnées</h2>
                {publicProfile.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${publicProfile.email}`} className="hover:text-purple-600 transition-colors">
                      {publicProfile.email}
                    </a>
                  </div>
                )}
                {publicProfile.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${publicProfile.phone}`} className="hover:text-purple-600 transition-colors">
                      {publicProfile.phone}
                    </a>
                  </div>
                )}
                {!publicProfile.email && !publicProfile.phone && (
                  <p className="text-gray-400 text-sm">Aucune coordonnée renseignée.</p>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-bold text-purple-600">{events.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Événements organisés</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-bold text-pink-600">{upcomingEvents.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">À venir</div>
              </div>
            </div>

            {/* Infos supplémentaires */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm mb-3">Informations</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Membre depuis
                  </span>
                  <span className="font-medium text-gray-700">{formatDate(publicProfile.created_at)}</span>
                </div>
                {publicProfile.city && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> Localisation
                    </span>
                    <span className="font-medium text-gray-700">{publicProfile.city}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Star className="w-4 h-4" /> Rôle
                  </span>
                  <span className="font-medium text-gray-700">{ROLE_LABELS[publicProfile.role] ?? publicProfile.role}</span>
                </div>
              </div>
            </div>

            {/* Liens utiles */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm mb-3">Voir aussi</h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/communaute/evenements/membre/${userId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-lg text-xs font-semibold hover:bg-pink-100 transition-colors"
                >
                  <PartyPopper className="w-3.5 h-3.5" /> Profil Événements
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Link>
                {!isMe && me && (
                  <Link
                    href={`/messages?to=${userId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Envoyer un message
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Events ── */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
                <PartyPopper className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucun événement organisé.</p>
              </div>
            ) : (
              <>
                {upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      À venir / En cours ({upcomingEvents.length})
                    </h3>
                    <div className="space-y-2">
                      {upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
                    </div>
                  </div>
                )}
                {pastEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">
                      Passés ({pastEvents.length})
                    </h3>
                    <div className="space-y-2 opacity-75">
                      {pastEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EventCard miniature ──────────────────────────────────────────────────────

function EventCard({ event }: { event: EventItem }) {
  const cfg = EVENT_STATUS_CONFIG[event.status as keyof typeof EVENT_STATUS_CONFIG] ?? {
    label: event.status, badgeBg: 'bg-gray-100', badgeText: 'text-gray-600',
  };

  return (
    <Link
      href={`/evenements/${event.id}`}
      className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all group"
    >
      {/* Cover ou placeholder */}
      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        {event.cover_photo_url
          ? <img src={event.cover_photo_url} alt="" className="w-full h-full object-cover" />
          : <PartyPopper className="w-6 h-6 text-purple-300" />
        }
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-purple-700 transition-colors">
          {event.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5">
            <Calendar className="w-3 h-3" />
            {formatEventDate(event.event_date)}
          </span>
          {event.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" /> {event.location}
            </span>
          )}
        </div>
      </div>

      {/* Badge statut */}
      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>
        {cfg.label}
      </span>
    </Link>
  );
}
