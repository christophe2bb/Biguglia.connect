'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { formatRelative } from '@/lib/utils';
import {
  Calendar, MapPin, Clock, Users, Plus, MessageSquare, ChevronRight,
  Star, Trophy, Music, Utensils, Dumbbell, Heart, BookOpen, Palette,
  PartyPopper, Flag, CheckCircle, Bell, ArrowRight, Ticket, Share2,
  Filter, TrendingUp, AlertCircle, Baby, Dog, Mic2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type EventCategory = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
};

type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  organizer: string;
  max_participants?: number;
  current_participants: number;
  is_free: boolean;
  price?: number;
  tags: string[];
  is_official: boolean;
};

type Post = {
  id: string;
  title: string;
  preview: string;
  author: string;
  created_at: string;
  replies: number;
  event_ref?: string;
};

// ─── Catégories d'événements ─────────────────────────────────────────────────
const EVENT_CATEGORIES: EventCategory[] = [
  { id: 'sport',     label: 'Sport & stade',  icon: Trophy,      color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: 'culture',   label: 'Culture & arts', icon: Palette,     color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { id: 'musique',   label: 'Musique',         icon: Music,       color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200' },
  { id: 'repas',     label: 'Repas & fête',    icon: Utensils,    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  { id: 'nature',    label: 'Nature & sport',  icon: Dumbbell,    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'famille',   label: 'Famille & enfants',icon: Baby,       color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
  { id: 'social',    label: 'Vie sociale',     icon: Heart,       color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  { id: 'conference',label: 'Conférence',      icon: Mic2,        color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200' },
];

// ─── Événements exemples ──────────────────────────────────────────────────────
const SAMPLE_EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'Match du SC Biguglia – Derby régional',
    description: 'Grand match de football contre l\'équipe de Furiani. Ambiance garantie, venez nombreux soutenir notre équipe ! Buvette ouverte dès 14h, coup d\'envoi à 15h30.',
    date: '2025-04-06', time: '15:30', location: 'Stade municipal de Biguglia',
    category: 'sport', organizer: 'SC Biguglia (officiel)', max_participants: 500, current_participants: 287,
    is_free: true, tags: ['football', 'derby', 'stade'], is_official: true,
  },
  {
    id: 'e2',
    title: 'Vide-grenier de printemps',
    description: 'Le grand vide-grenier annuel revient ! Places exposants disponibles sur inscription. Venez chiner ou vendre vos affaires. Restauration sur place. 200 exposants attendus.',
    date: '2025-04-13', time: '08:00', location: 'Place du village',
    category: 'repas', organizer: 'Association Biguglia en Fête', max_participants: undefined, current_participants: 0,
    is_free: true, tags: ['vide-grenier', 'chine', 'famille'], is_official: true,
  },
  {
    id: 'e3',
    title: 'Concert de printemps – Fanfare municipale',
    description: 'La fanfare municipale vous invite à son concert de printemps. Répertoire varié : musique classique, variétés françaises et surprises. Entrée libre, participation appréciée.',
    date: '2025-04-19', time: '19:00', location: 'Salle des fêtes de Biguglia',
    category: 'musique', organizer: 'Fanfare Municipale', max_participants: 200, current_participants: 89,
    is_free: true, tags: ['concert', 'fanfare', 'musique classique'], is_official: true,
  },
  {
    id: 'e4',
    title: 'Atelier poterie pour enfants',
    description: 'Atelier créatif de poterie pour les 6-12 ans. Animé par une artiste locale. Chaque enfant repart avec sa création. Places limitées à 12 enfants.',
    date: '2025-04-12', time: '10:00', location: 'Médiathèque de Biguglia',
    category: 'famille', organizer: 'Médiathèque municipale', max_participants: 12, current_participants: 8,
    is_free: false, price: 8, tags: ['atelier', 'enfants', 'poterie', 'créatif'], is_official: true,
  },
  {
    id: 'e5',
    title: 'Tournoi de pétanque inter-quartiers',
    description: 'Tournoi convivial ouvert à tous les habitants de Biguglia. Doublettes ou triplettes. Trophée et lots pour les finalistes. Inscription obligatoire avant le 10 avril.',
    date: '2025-04-27', time: '09:00', location: 'Boulodrome municipal',
    category: 'sport', organizer: 'Club de Pétanque Biguglia', max_participants: 60, current_participants: 34,
    is_free: true, tags: ['pétanque', 'tournoi', 'convivial'], is_official: false,
  },
  {
    id: 'e6',
    title: 'Soirée barbecue de quartier – Résidence Les Pins',
    description: 'On se retrouve entre voisins pour un barbecue convivial. Chacun apporte quelque chose à griller. Boissons fraîches fournies. Pour les résidents du quartier.',
    date: '2025-05-03', time: '19:00', location: 'Résidence Les Pins – espace vert',
    category: 'social', organizer: 'Antoine et ses voisins', max_participants: 30, current_participants: 14,
    is_free: true, tags: ['barbecue', 'voisins', 'convivial'], is_official: false,
  },
];

const SAMPLE_POSTS: Post[] = [
  { id: 'f1', title: 'Composition de l\'équipe pour le derby du 6 avril ?', preview: 'Quelqu\'un a des infos sur le groupe retenu pour le match contre Furiani ?', author: 'Luca M.', created_at: new Date(Date.now() - 86400000).toISOString(), replies: 14, event_ref: 'Match SC Biguglia' },
  { id: 'f2', title: 'Comment s\'inscrire comme exposant vide-grenier ?', preview: 'Je voulais savoir la procédure pour réserver une place...', author: 'Nathalie B.', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), replies: 7, event_ref: 'Vide-grenier' },
  { id: 'f3', title: 'Idée : organiser une fête des voisins cette année ?', preview: 'Je pense qu\'on devrait relancer la fête des voisins, c\'était super les années précédentes...', author: 'François D.', created_at: new Date(Date.now() - 3600000).toISOString(), replies: 19 },
  { id: 'f4', title: 'Programme des matchs du SC Biguglia avril-mai', preview: 'Je mets le calendrier complet des rencontres ici pour ceux qui veulent suivre...', author: 'Président SCB', created_at: new Date(Date.now() - 5 * 86400000).toISOString(), replies: 4, event_ref: 'SC Biguglia' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatEventDate(dateStr: string, time: string) {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return { day: day.charAt(0).toUpperCase() + day.slice(1), time };
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return null;
  if (days === 0) return "Aujourd'hui !";
  if (days === 1) return 'Demain';
  return `Dans ${days} j.`;
}

// ─── Composant carte événement ────────────────────────────────────────────────
function EventCard({ event }: { event: Event }) {
  const cat = EVENT_CATEGORIES.find(c => c.id === event.category);
  const CatIcon = cat?.icon || Calendar;
  const { day, time } = formatEventDate(event.date, event.time);
  const countdown = daysUntil(event.date);
  const fillPct = event.max_participants ? Math.round((event.current_participants / event.max_participants) * 100) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group">
      {/* Header */}
      <div className={`${cat?.bg || 'bg-gray-50'} px-5 pt-4 pb-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-xl shadow-sm">
              <CatIcon className={`w-4 h-4 ${cat?.color || 'text-gray-500'}`} />
            </div>
            <span className={`text-xs font-bold ${cat?.color}`}>{cat?.label}</span>
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

        {/* Infos */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span>{day}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        {/* Participants + jauge */}
        {event.max_participants && fillPct !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.current_participants}/{event.max_participants} participants</span>
              <span className={fillPct > 80 ? 'text-red-500 font-bold' : ''}>{fillPct > 80 ? '⚠️ Presque complet' : `${100 - fillPct}% de places libres`}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${fillPct > 80 ? 'bg-red-400' : fillPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${fillPct}%` }} />
            </div>
          </div>
        )}

        {/* Prix + action */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className={`text-sm font-black ${event.is_free ? 'text-emerald-600' : 'text-purple-600'}`}>
            {event.is_free ? '🎟️ Gratuit' : `${event.price} €`}
          </span>
          <button
            onClick={() => toast.success('Inscription enregistrée ! Vous serez notifié avant l\'événement.')}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${cat?.bg} ${cat?.color} border ${cat?.border} hover:shadow-sm`}
          >
            <Bell className="w-3.5 h-3.5" /> Je participe
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function EvenementsPage() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'agenda' | 'stade' | 'forum' | 'creer'>('agenda');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', location: '', category: 'sport' });
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [showPostForm, setShowPostForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sportEvents = SAMPLE_EVENTS.filter(e => e.category === 'sport');
  const filteredEvents = filterCat === 'all' ? SAMPLE_EVENTS : SAMPLE_EVENTS.filter(e => e.category === filterCat);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) { toast.error('Titre et date obligatoires'); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('Événement soumis ! Il sera visible après validation par un modérateur.');
    setNewEvent({ title: '', description: '', date: '', time: '', location: '', category: 'sport' });
    setShowCreateForm(false);
    setSubmitting(false);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title) { toast.error('Entrez un titre'); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('Message publié !');
    setNewPost({ title: '', content: '' });
    setShowPostForm(false);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
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
                  { icon: Calendar, label: `${SAMPLE_EVENTS.length} événements` },
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
              <button
                onClick={() => setActiveTab('creer')}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-6 py-3 rounded-2xl hover:bg-purple-50 transition-all shadow-lg hover:-translate-y-0.5"
              >
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
            { id: 'agenda', label: 'Agenda',       icon: Calendar },
            { id: 'stade',  label: 'Stade & sport', icon: Trophy },
            { id: 'forum',  label: 'Forum',          icon: MessageSquare },
            { id: 'creer',  label: 'Créer un événement', icon: Plus },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── AGENDA ── */}
        {activeTab === 'agenda' && (
          <div>
            {/* Filtres catégorie */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setFilterCat('all')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filterCat === 'all' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}
              >
                Tout
              </button>
              {EVENT_CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCat(cat.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      filterCat === cat.id
                        ? `${cat.bg} ${cat.color} ${cat.border} shadow-sm`
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    <CatIcon className="w-3.5 h-3.5" /> {cat.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map(event => <EventCard key={event.id} event={event} />)}
            </div>

            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-4">
              <Bell className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-purple-800 mb-1">🔔 Ne ratez aucun événement</p>
                <p className="text-purple-600 text-sm">Activez les notifications pour être alerté des prochains événements à Biguglia.
                  {!profile && <> <Link href="/inscription" className="underline font-medium">Créez un compte</Link> pour activer les alertes.</>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STADE ── */}
        {activeTab === 'stade' && (
          <div>
            {/* Carte stade */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 text-[120px] leading-none font-black">⚽</div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                  <span className="font-bold text-blue-100 text-sm">SC Biguglia — Stade municipal</span>
                </div>
                <h2 className="text-2xl font-black mb-2">Suivez le SC Biguglia</h2>
                <p className="text-blue-100 text-sm max-w-lg">Calendrier des matchs, résultats, news de l'équipe et prochains rendez-vous au stade.</p>
              </div>
            </div>

            {/* Prochains matchs */}
            <h3 className="font-bold text-gray-900 text-lg mb-4">Prochains matchs & événements sportifs</h3>
            <div className="space-y-3 mb-8">
              {[
                { date: 'Dimanche 6 avril', time: '15h30', match: 'SC Biguglia vs Furiani FC', type: 'Championnat D1 Régionale', lieu: 'Stade municipal', domicile: true },
                { date: 'Samedi 19 avril',  time: '14h00', match: 'SC Biguglia vs AS Calvi', type: 'Coupe de Corse', lieu: 'Stade de Calvi', domicile: false },
                { date: 'Dimanche 27 avril', time: '15h30', match: 'SC Biguglia vs Corte FC', type: 'Championnat D1 Régionale', lieu: 'Stade municipal', domicile: true },
                { date: 'Samedi 10 mai',    time: '16h00', match: 'Tournoi de printemps U15', type: 'Jeunes — 4 équipes', lieu: 'Stade municipal', domicile: true },
              ].map(({ date, time, match, type, lieu, domicile }) => (
                <div key={match} className={`bg-white rounded-2xl border p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-all ${domicile ? 'border-blue-200' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 text-center px-3 py-2 rounded-xl ${domicile ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <div className={`text-xs font-bold ${domicile ? 'text-blue-600' : 'text-gray-500'}`}>{date.split(' ')[0]}</div>
                      <div className="text-xs text-gray-500">{date.split(' ').slice(1).join(' ')}</div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{match}</p>
                      <p className="text-xs text-gray-500">{type} · {time} · {lieu}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {domicile && <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 font-bold px-2 py-1 rounded-full">🏠 Domicile</span>}
                    <button
                      onClick={() => toast.success('Rappel activé pour ce match !')}
                      className="p-2 bg-gray-50 hover:bg-blue-50 rounded-xl text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Autres sports */}
            <h3 className="font-bold text-gray-900 text-lg mb-4">Autres activités sportives</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sportEvents.filter(e => e.id !== 'e1').map(event => <EventCard key={event.id} event={event} />)}
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
                <input type="text" placeholder="Titre (ex: Qui organise la fête de la musique ?)"
                  value={newPost.title} onChange={e => setNewPost(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <textarea placeholder="Votre message, question ou proposition..."
                  rows={4} value={newPost.content} onChange={e => setNewPost(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="bg-purple-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
                    {submitting ? 'Publication...' : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowPostForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {SAMPLE_POSTS.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-purple-200 hover:shadow-sm transition-all">
                  {post.event_ref && (
                    <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-2.5 py-0.5 mb-2">
                      <Calendar className="w-3 h-3" /> {post.event_ref}
                    </span>
                  )}
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{post.title}</h3>
                  <p className="text-gray-500 text-xs mb-3 line-clamp-2">{post.preview}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{post.author} · {formatRelative(post.created_at)}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.replies} réponses</span>
                  </div>
                </div>
              ))}
            </div>

            {!profile && (
              <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-5 text-center">
                <p className="text-purple-700 font-medium mb-3">Connectez-vous pour participer aux discussions</p>
                <Link href="/connexion" className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-all">
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Créer un événement</h2>
              <p className="text-gray-500 text-sm mb-6">Votre événement sera visible après validation par un modérateur (sous 24h).</p>

              {!profile ? (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
                  <PartyPopper className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                  <p className="text-purple-800 font-bold mb-2">Connectez-vous pour créer un événement</p>
                  <p className="text-purple-600 text-sm mb-4">Seuls les membres inscrits peuvent proposer des événements.</p>
                  <Link href="/connexion" className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-all">
                    Se connecter <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre de l'événement *</label>
                    <input type="text" placeholder="Ex: Tournoi de pétanque inter-quartiers"
                      value={newEvent.title} onChange={e => setNewEvent(f => ({ ...f, title: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date *</label>
                      <input type="date" value={newEvent.date} onChange={e => setNewEvent(f => ({ ...f, date: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Heure</label>
                      <input type="time" value={newEvent.time} onChange={e => setNewEvent(f => ({ ...f, time: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  </div>
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
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                    >
                      {EVENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
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
                  <button type="submit" disabled={submitting}
                    className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {submitting ? 'Envoi en cours...' : <><PartyPopper className="w-4 h-4" /> Soumettre l'événement</>}
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
