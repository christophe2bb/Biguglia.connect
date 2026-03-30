'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Calendar, MapPin, Clock, Users, Plus, MessageSquare, ChevronRight,
  Trophy, Music, Utensils, Dumbbell, Heart, Palette,
  PartyPopper, CheckCircle, Bell, ArrowRight,
  AlertCircle, Baby, Mic2, X, Loader2, RefreshCw,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type LocalEvent = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  category: string;
  organizer_name: string | null;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  max_participants: number | null;
  is_free: boolean;
  price: number | null;
  tags: string[];
  is_official: boolean;
  status: string;
  participants_count?: number;
  user_joined?: boolean;
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

// ─── Catégories d'événements ──────────────────────────────────────────────────
type EventCat = { id: string; label: string; icon: React.ElementType; color: string; bg: string; border: string };
const EVENT_CATEGORIES: EventCat[] = [
  { id: 'sport',      label: 'Sport & stade',   icon: Trophy,      color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: 'culture',    label: 'Culture & arts',  icon: Palette,     color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { id: 'musique',    label: 'Musique',          icon: Music,       color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200' },
  { id: 'repas',      label: 'Repas & fête',     icon: Utensils,    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  { id: 'nature',     label: 'Nature & sport',   icon: Dumbbell,    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'famille',    label: 'Famille',          icon: Baby,        color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
  { id: 'social',     label: 'Vie sociale',      icon: Heart,       color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  { id: 'conference', label: 'Conférence',       icon: Mic2,        color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200' },
];

function getCat(id: string) {
  return EVENT_CATEGORIES.find(c => c.id === id) ?? EVENT_CATEGORIES[0];
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return null;
  if (days === 0) return "Aujourd'hui !";
  if (days === 1) return 'Demain';
  return `Dans ${days} j.`;
}

// ─── EventCard ─────────────────────────────────────────────────────────────────
function EventCard({
  event, userId, onJoin,
}: { event: LocalEvent; userId?: string; onJoin: (id: string, joined: boolean) => void }) {
  const cat = getCat(event.category);
  const CatIcon = cat.icon;
  const dateLabel = formatEventDate(event.event_date);
  const countdown = daysUntil(event.event_date);
  const fillPct = event.max_participants && event.participants_count !== undefined
    ? Math.round((event.participants_count / event.max_participants) * 100)
    : null;
  const isFull = event.max_participants !== null && (event.participants_count ?? 0) >= event.max_participants;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group">
      <div className={`${cat.bg} px-5 pt-4 pb-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-xl shadow-sm">
              <CatIcon className={`w-4 h-4 ${cat.color}`} />
            </div>
            <span className={`text-xs font-bold ${cat.color}`}>{cat.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {event.is_official && (
              <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Officiel
              </span>
            )}
            {countdown && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countdown.includes('Aujourd') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                {countdown}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-2 leading-snug group-hover:text-purple-700 transition-colors line-clamp-2">{event.title}</h3>
        <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">{event.description}</p>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span>{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
            <span>{event.event_time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        {event.max_participants !== null && fillPct !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.participants_count ?? 0}/{event.max_participants}</span>
              {isFull && <span className="text-red-500 font-bold">⚠️ Complet</span>}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${fillPct > 80 ? 'bg-red-400' : fillPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(fillPct, 100)}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className={`text-sm font-black ${event.is_free ? 'text-emerald-600' : 'text-purple-600'}`}>
            {event.is_free ? '🎟️ Gratuit' : `${event.price} €`}
          </span>
          {userId ? (
            <button
              onClick={() => onJoin(event.id, !!event.user_joined)}
              disabled={isFull && !event.user_joined}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 ${
                event.user_joined
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : `${cat.bg} ${cat.color} border ${cat.border} hover:shadow-sm`
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              {event.user_joined ? 'Inscrit ✓' : isFull ? 'Complet' : 'Je participe'}
            </button>
          ) : (
            <Link href="/connexion" className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${cat.bg} ${cat.color} border ${cat.border}`}>
              <Bell className="w-3.5 h-3.5" /> Participer
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function EvenementsPage() {
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'agenda' | 'stade' | 'forum' | 'creer'>('agenda');
  const [filterCat, setFilterCat] = useState<string>('all');

  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [dbReady, setDbReady] = useState(true); // false si tables manquantes
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);
  const [loadingForum, setLoadingForum] = useState(false);

  // Create event form
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', event_date: '', event_time: '18:00',
    location: '', category: 'sport', organizer_name: '',
    max_participants: '', is_free: true, price: '',
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Forum post form
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // ── Fetch events ──────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('local_events')
        .select(`*, author:profiles!local_events_author_id_fkey(full_name, avatar_url), participants:event_participations(count)`)
        .eq('status', 'active')
        .gte('event_date', today)
        .order('event_date', { ascending: true });

      if (filterCat !== 'all') query = query.eq('category', filterCat);

      const { data, error } = await query;
      if (error) {
        // Table manquante → code 42P01 ou PGRST116
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingEvents(false);
        return;
      }
      setDbReady(true);

      let enriched = (data || []).map((e: LocalEvent & { participants?: { count: number }[] }) => ({
        ...e,
        participants_count: e.participants?.[0]?.count ?? 0,
        user_joined: false,
      }));

      if (profile && enriched.length > 0) {
        const ids = enriched.map(e => e.id);
        const { data: joins } = await supabase
          .from('event_participations')
          .select('event_id')
          .in('event_id', ids)
          .eq('user_id', profile.id);
        const joinedSet = new Set((joins || []).map((j: { event_id: string }) => j.event_id));
        enriched = enriched.map(e => ({ ...e, user_joined: joinedSet.has(e.id) }));
      }

      setEvents(enriched);
    } catch (err) {
      console.error('fetchEvents error:', err);
      setDbReady(false);
    }
    setLoadingEvents(false);
  }, [filterCat, profile]);

  // ── Fetch forum ───────────────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    const { data: cats } = await supabase.from('forum_categories').select('id').eq('slug', 'evenements').single();
    const catId = cats?.id ?? null;
    setForumCategoryId(catId);
    if (!catId) { setLoadingForum(false); return; }
    const { data } = await supabase
      .from('forum_posts')
      .select(`*, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)`)
      .eq('category_id', catId)
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(20);
    setForumPosts((data as unknown as ForumPost[]) || []);
    setLoadingForum(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);

  // ── Join / Leave event ────────────────────────────────────────────────────
  const handleJoin = async (eventId: string, joined: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour participer'); return; }
    if (joined) {
      await supabase.from('event_participations').delete().eq('event_id', eventId).eq('user_id', profile.id);
      toast.success('Inscription annulée');
    } else {
      const { error } = await supabase.from('event_participations').insert({ event_id: eventId, user_id: profile.id });
      if (error) { toast.error('Erreur lors de l\'inscription'); return; }
      toast.success('Inscription enregistrée ! Vous serez notifié avant l\'événement.');
    }
    fetchEvents();
  };

  // ── Create event ──────────────────────────────────────────────────────────
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!newEvent.title.trim() || !newEvent.event_date) {
      toast.error('Titre et date obligatoires');
      return;
    }
    setSubmittingEvent(true);
    const { error } = await supabase.from('local_events').insert({
      author_id: profile.id,
      title: newEvent.title.trim(),
      description: newEvent.description.trim(),
      event_date: newEvent.event_date,
      event_time: newEvent.event_time,
      location: newEvent.location.trim() || 'Biguglia',
      category: newEvent.category,
      organizer_name: newEvent.organizer_name.trim() || null,
      max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
      is_free: newEvent.is_free,
      price: !newEvent.is_free && newEvent.price ? parseFloat(newEvent.price) : null,
      status: 'pending', // awaiting moderator approval
    });

    if (error) {
      toast.error('Erreur lors de la soumission');
      console.error(error);
    } else {
      toast.success('Événement soumis ! Il sera visible après validation par un modérateur (sous 24h).');
      setNewEvent({ title: '', description: '', event_date: '', event_time: '18:00', location: '', category: 'sport', organizer_name: '', max_participants: '', is_free: true, price: '' });
    }
    setSubmittingEvent(false);
  };

  // ── Submit forum post ─────────────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !forumCategoryId) return;
    if (!postForm.title.trim() || !postForm.content.trim()) {
      toast.error('Remplissez tous les champs');
      return;
    }
    setSubmittingPost(true);
    const { error } = await supabase.from('forum_posts').insert({
      category_id: forumCategoryId,
      author_id: profile.id,
      title: postForm.title.trim(),
      content: postForm.content.trim(),
    });
    if (error) {
      toast.error('Erreur lors de la publication');
    } else {
      toast.success('Message publié !');
      setPostForm({ title: '', content: '' });
      setShowPostForm(false);
      fetchForum();
    }
    setSubmittingPost(false);
  };

  const sportEvents = events.filter(e => e.category === 'sport');
  const filteredEvents = filterCat === 'all' ? events : events.filter(e => e.category === filterCat);
  const totalCount = events.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">

      {/* ── BANNER migration DB ── */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Tables de base de données manquantes</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Exécutez le fichier <code className="bg-amber-100 px-1 rounded font-mono">src/lib/migration_themes.sql</code> dans votre éditeur SQL Supabase pour activer cette page.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-pink-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <span className="text-purple-100 text-sm font-semibold">Thème · Événements locaux</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
                🎉 Événements de Biguglia
              </h1>
              <p className="text-purple-100 text-base sm:text-lg max-w-xl leading-relaxed">
                Concerts, matchs, vide-greniers, fêtes de quartier — tout ce qui se passe à Biguglia au même endroit.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                {[
                  { icon: Calendar, label: `${totalCount} événement${totalCount !== 1 ? 's' : ''}` },
                  { icon: Trophy,   label: 'Matchs & sport' },
                  { icon: Music,    label: 'Culture & musique' },
                  { icon: Users,    label: 'Fêtes & social' },
                ].map(({ icon: I, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <I className="w-3.5 h-3.5" /> {label}
                  </span>
                ))}
              </div>
            </div>
            {profile && (
              <button onClick={() => setActiveTab('creer')}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-6 py-3 rounded-2xl hover:bg-purple-50 transition-all shadow-lg hover:-translate-y-0.5">
                <Plus className="w-4 h-4" /> Créer un événement
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── ONGLETS ── */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
          {[
            { id: 'agenda', label: 'Agenda',           icon: Calendar },
            { id: 'stade',  label: 'Stade & sport',    icon: Trophy },
            { id: 'forum',  label: 'Forum',             icon: MessageSquare },
            { id: 'creer',  label: 'Proposer un événement', icon: Plus },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── AGENDA ── */}
        {activeTab === 'agenda' && (
          <div>
            {/* Filtres */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setFilterCat('all')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filterCat === 'all' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}>
                Tout
              </button>
              {EVENT_CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <button key={cat.id} onClick={() => setFilterCat(cat.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      filterCat === cat.id ? `${cat.bg} ${cat.color} ${cat.border} shadow-sm` : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200'
                    }`}>
                    <CatIcon className="w-3.5 h-3.5" /> {cat.label.split(' ')[0]}
                  </button>
                );
              })}
              <button onClick={fetchEvents} className="p-2 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-purple-600 hover:border-purple-300 transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingEvents ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold text-lg">Aucun événement à venir</p>
                <p className="text-gray-400 text-sm mt-1 mb-6">
                  {filterCat !== 'all' ? 'Essayez une autre catégorie ou' : ''} Proposez le premier événement de Biguglia !
                </p>
                {profile && (
                  <button onClick={() => setActiveTab('creer')}
                    className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-purple-700 transition-all">
                    <Plus className="w-4 h-4" /> Proposer un événement
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map(event => (
                  <EventCard key={event.id} event={event} userId={profile?.id} onJoin={handleJoin} />
                ))}
              </div>
            )}

            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-4">
              <Bell className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-purple-800 mb-1">🔔 Ne ratez aucun événement</p>
                <p className="text-purple-600 text-sm">
                  Cliquez sur « Je participe » pour être notifié avant chaque événement.
                  {!profile && <> <Link href="/inscription" className="underline font-medium">Créez un compte</Link> pour activer les alertes.</>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STADE ── */}
        {activeTab === 'stade' && (
          <div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 text-[120px] leading-none font-black">⚽</div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                  <span className="font-bold text-blue-100 text-sm">SC Biguglia — Stade municipal</span>
                </div>
                <h2 className="text-2xl font-black mb-2">Suivez le SC Biguglia</h2>
                <p className="text-blue-100 text-sm max-w-lg">Calendrier des matchs, résultats et prochains rendez-vous au stade.</p>
              </div>
            </div>

            <h3 className="font-bold text-gray-900 text-lg mb-4">Événements sportifs à venir</h3>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              </div>
            ) : sportEvents.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun événement sportif à venir</p>
                {profile && (
                  <button onClick={() => { setNewEvent(f => ({ ...f, category: 'sport' })); setActiveTab('creer'); }}
                    className="mt-4 inline-flex items-center gap-2 bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-600 transition-all">
                    <Plus className="w-4 h-4" /> Proposer un événement sportif
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sportEvents.map(event => (
                  <EventCard key={event.id} event={event} userId={profile?.id} onJoin={handleJoin} />
                ))}
              </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="font-bold text-blue-800 mb-1">📣 Vous êtes du SC Biguglia ?</p>
              <p className="text-blue-600 text-sm mb-3">Publiez les prochains matchs et événements du club pour que tous les habitants puissent les suivre.</p>
              {profile ? (
                <button onClick={() => { setNewEvent(f => ({ ...f, category: 'sport' })); setActiveTab('creer'); }}
                  className="inline-flex items-center gap-2 bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-600 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Publier un événement sportif
                </button>
              ) : (
                <Link href="/inscription" className="inline-flex items-center gap-2 bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-600 transition-all">
                  Créer un compte <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── FORUM ── */}
        {activeTab === 'forum' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Forum événements</h2>
              {profile && (
                <button onClick={() => setShowPostForm(!showPostForm)}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all text-sm">
                  <Plus className="w-4 h-4" /> Nouveau message
                </button>
              )}
            </div>

            {showPostForm && profile && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-purple-200 p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">Nouveau message</h3>
                  <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input type="text" placeholder="Titre (ex: Qui organise la fête de la musique ?)" required
                  value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <textarea placeholder="Votre message, question ou proposition..." required
                  rows={4} value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={submittingPost}
                    className="flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
                    {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication...</> : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowPostForm(false)}
                    className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            {loadingForum ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
              </div>
            ) : forumPosts.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun message pour l'instant</p>
                {profile && (
                  <button onClick={() => setShowPostForm(true)}
                    className="mt-4 text-purple-600 font-semibold text-sm hover:underline">
                    Soyez le premier à écrire !
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {forumPosts.map(post => (
                  <Link key={post.id} href={`/forum/${post.id}`}
                    className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-purple-200 hover:shadow-sm transition-all">
                    <h3 className="font-bold text-gray-900 text-sm mb-2 hover:text-purple-700 transition-colors">{post.title}</h3>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{post.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-2">
                        {post.author && <Avatar src={post.author.avatar_url} name={post.author.full_name} size="xs" />}
                        {post.author?.full_name ?? 'Membre'} · {formatRelative(post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {(post.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0} réponses
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!profile && (
              <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-5 text-center">
                <p className="text-purple-700 font-medium mb-3">Connectez-vous pour participer aux discussions</p>
                <Link href="/connexion"
                  className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── CRÉER UN ÉVÉNEMENT ── */}
        {activeTab === 'creer' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Proposer un événement</h2>
              <p className="text-gray-500 text-sm mb-6">Votre événement sera visible après validation par un modérateur (sous 24h).</p>

              {!profile ? (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
                  <PartyPopper className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                  <p className="text-purple-800 font-bold mb-2">Connectez-vous pour proposer un événement</p>
                  <p className="text-purple-600 text-sm mb-4">Seuls les membres inscrits peuvent proposer des événements.</p>
                  <Link href="/connexion"
                    className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-all">
                    Se connecter <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre de l'événement *</label>
                    <input type="text" placeholder="Ex: Tournoi de pétanque inter-quartiers" required
                      value={newEvent.title} onChange={e => setNewEvent(f => ({ ...f, title: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date *</label>
                      <input type="date" required
                        min={new Date().toISOString().split('T')[0]}
                        value={newEvent.event_date} onChange={e => setNewEvent(f => ({ ...f, event_date: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Heure</label>
                      <input type="time"
                        value={newEvent.event_time} onChange={e => setNewEvent(f => ({ ...f, event_time: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Lieu</label>
                      <input type="text" placeholder="Ex: Stade municipal, Place du village..."
                        value={newEvent.location} onChange={e => setNewEvent(f => ({ ...f, location: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catégorie</label>
                      <select value={newEvent.category} onChange={e => setNewEvent(f => ({ ...f, category: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                        {EVENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organisateur</label>
                      <input type="text" placeholder="Nom de l'association ou organisateur"
                        value={newEvent.organizer_name} onChange={e => setNewEvent(f => ({ ...f, organizer_name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nb max participants</label>
                      <input type="number" placeholder="Illimité si vide" min="1"
                        value={newEvent.max_participants} onChange={e => setNewEvent(f => ({ ...f, max_participants: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tarif</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={newEvent.is_free} onChange={() => setNewEvent(f => ({ ...f, is_free: true }))} className="accent-purple-600" />
                        <span className="text-sm">Gratuit</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={!newEvent.is_free} onChange={() => setNewEvent(f => ({ ...f, is_free: false }))} className="accent-purple-600" />
                        <span className="text-sm">Payant</span>
                      </label>
                      {!newEvent.is_free && (
                        <input type="number" placeholder="Prix (€)" min="0" step="0.01"
                          value={newEvent.price} onChange={e => setNewEvent(f => ({ ...f, price: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                    <textarea placeholder="Décrivez l'événement, le programme, les conditions d'inscription..."
                      rows={4} value={newEvent.description} onChange={e => setNewEvent(f => ({ ...f, description: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Les événements sont vérifiés par notre équipe avant publication. Merci de ne soumettre que des événements réels à Biguglia ou ses alentours.</p>
                  </div>
                  <button type="submit" disabled={submittingEvent}
                    className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {submittingEvent
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
                      : <><PartyPopper className="w-4 h-4" /> Soumettre l'événement</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
