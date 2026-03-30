'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  MapPin, Clock, ArrowRight, Mountain, Camera, MessageSquare,
  Footprints, TreePine, Star, Heart, Share2, ChevronRight,
  Navigation, Compass, Sun, Cloud, Filter, Plus, Users, Eye,
  Bookmark, TrendingUp, Map, Wind, Thermometer, Leaf,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

// ─── Types locaux ─────────────────────────────────────────────────────────────
type Promenade = {
  id: string;
  title: string;
  description: string;
  distance_km: number;
  duration_min: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
  tags: string[];
  author_id: string;
  author?: { full_name: string; avatar_url?: string };
  likes: number;
  views: number;
  created_at: string;
  type: 'balade' | 'randonnee' | 'velo' | 'plage' | 'nature';
};

type Post = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string };
  created_at: string;
  comment_count?: number;
};

// ─── Données exemple (affichées tant que la table Supabase n'existe pas) ──────
const SAMPLE_PROMENADES: Promenade[] = [
  {
    id: 'p1', title: 'Tour du Cap Tormentoso', description: 'Une balade magnifique le long des falaises avec vue panoramique sur le golfe de Biguglia. Parfait en soirée pour le coucher de soleil.',
    distance_km: 4.5, duration_min: 90, difficulty: 'facile',
    tags: ['vue mer', 'coucher de soleil', 'famille'],
    author_id: '', likes: 24, views: 187,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(), type: 'balade',
  },
  {
    id: 'p2', title: 'Sentier de l\'Étang de Biguglia', description: 'Le tour complet de l\'étang, réserve naturelle classée. Idéal pour observer les flamants roses, hérons et autres oiseaux migrateurs.',
    distance_km: 12, duration_min: 210, difficulty: 'moyen',
    tags: ['nature', 'oiseaux', 'étang', 'réserve'],
    author_id: '', likes: 41, views: 312,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(), type: 'nature',
  },
  {
    id: 'p3', title: 'Piste cyclable côtière', description: 'Le long du bord de mer jusqu\'à Furiani. Accessible à tous en vélo. On longe la plage sur plusieurs kilomètres.',
    distance_km: 8, duration_min: 60, difficulty: 'facile',
    tags: ['vélo', 'mer', 'plage', 'accessible'],
    author_id: '', likes: 17, views: 134,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(), type: 'velo',
  },
  {
    id: 'p4', title: 'Montée au Monte Castellu', description: 'Randonnée avec dénivelé vers les ruines médiévales. Vue à 360° sur toute la plaine orientale et le littoral. Emporter de l\'eau.',
    distance_km: 7, duration_min: 180, difficulty: 'difficile',
    tags: ['histoire', 'panorama', 'ruines', 'sport'],
    author_id: '', likes: 33, views: 256,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(), type: 'randonnee',
  },
];

const SAMPLE_POSTS = [
  { id: 'f1', title: 'Meilleur moment pour voir les flamants ?', content: 'Quelqu\'un sait à quelle heure ils sont les plus visibles à l\'étang ?', author_id: '', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), comment_count: 8 },
  { id: 'f2', title: 'Sentier glissant après la pluie', content: 'Attention sur le chemin du Cap, très glissant hier soir.', author_id: '', created_at: new Date(Date.now() - 86400000).toISOString(), comment_count: 3 },
  { id: 'f3', title: 'Groupe de randonnée dimanche matin ?', content: 'Je propose une sortie dimanche à 8h, qui est partant ?', author_id: '', created_at: new Date(Date.now() - 3600000).toISOString(), comment_count: 12 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DIFF_CONFIG = {
  facile:    { label: 'Facile',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  moyen:     { label: 'Moyen',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  difficile: { label: 'Difficile', color: 'bg-red-100 text-red-700 border-red-200' },
};

const TYPE_CONFIG = {
  balade:    { icon: Footprints, label: 'Balade',     color: 'text-sky-600',     bg: 'bg-sky-50' },
  randonnee: { icon: Mountain,   label: 'Randonnée',  color: 'text-orange-600',  bg: 'bg-orange-50' },
  velo:      { icon: Navigation, label: 'Vélo',       color: 'text-purple-600',  bg: 'bg-purple-50' },
  plage:     { icon: Sun,        label: 'Plage',      color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  nature:    { icon: Leaf,       label: 'Nature',     color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

// ─── Composant carte promenade ────────────────────────────────────────────────
function PromenadeCard({ p }: { p: Promenade }) {
  const diff = DIFF_CONFIG[p.difficulty];
  const type = TYPE_CONFIG[p.type];
  const TypeIcon = type.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group">
      {/* Header coloré par type */}
      <div className={`${type.bg} px-5 pt-4 pb-2`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 bg-white rounded-xl shadow-sm`}>
              <TypeIcon className={`w-4 h-4 ${type.color}`} />
            </div>
            <span className={`text-xs font-bold ${type.color}`}>{type.label}</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${diff.color}`}>{diff.label}</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-base mb-2 group-hover:text-emerald-700 transition-colors leading-snug">{p.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{p.description}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-500" />{p.distance_km} km</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-sky-500" />{formatDuration(p.duration_min)}</span>
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-gray-400" />{p.views}</span>
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400" />{p.likes}</span>
        </div>

        {/* Tags */}
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {p.tags.map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"># {t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">{formatRelative(p.created_at)}</span>
          <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:gap-1.5 transition-all">
            Voir le détail <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PromenadePage() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'itineraires' | 'forum' | 'agenda'>('itineraires');
  const [filter, setFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  const filteredPromenades = filter === 'all'
    ? SAMPLE_PROMENADES
    : SAMPLE_PROMENADES.filter(p => p.type === filter || p.difficulty === filter);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) { toast.error('Remplissez tous les champs'); return; }
    setSubmitting(true);
    // Simulation d'envoi (à brancher sur forum_posts avec category_id = 'promenades')
    await new Promise(r => setTimeout(r, 800));
    toast.success('Votre message a été publié !');
    setNewPost({ title: '', content: '' });
    setShowForm(false);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <TreePine className="w-5 h-5" />
                </div>
                <span className="text-emerald-100 text-sm font-semibold">Thème · Promenades & Nature</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
                🌿 Promenades de Biguglia
              </h1>
              <p className="text-emerald-100 text-base sm:text-lg max-w-xl leading-relaxed">
                Itinéraires, balades, sentiers nature, vélo et sorties en famille autour de Biguglia.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                {[
                  { icon: Footprints, label: `${SAMPLE_PROMENADES.length} itinéraires` },
                  { icon: TreePine,   label: 'Réserve naturelle' },
                  { icon: Camera,    label: 'Photos partagées' },
                ].map(({ icon: I, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <I className="w-3.5 h-3.5" /> {label}
                  </span>
                ))}
              </div>
            </div>
            {profile && (
              <button
                onClick={() => { setActiveTab('forum'); setShowForm(true); }}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-6 py-3 rounded-2xl hover:bg-emerald-50 transition-all shadow-lg hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" /> Partager un itinéraire
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── ONGLETS ── */}
        <div className="flex gap-2 mb-8 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
          {[
            { id: 'itineraires', label: 'Itinéraires', icon: Map },
            { id: 'forum',       label: 'Forum',       icon: MessageSquare },
            { id: 'agenda',      label: 'Sorties groupées', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── ITINÉRAIRES ── */}
        {activeTab === 'itineraires' && (
          <div>
            {/* Filtres */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { v: 'all',       label: 'Tous' },
                { v: 'balade',    label: '🚶 Balades' },
                { v: 'randonnee', label: '⛰️ Randonnées' },
                { v: 'velo',      label: '🚴 Vélo' },
                { v: 'nature',    label: '🌿 Nature' },
                { v: 'facile',    label: '✅ Facile' },
                { v: 'difficile', label: '🔴 Difficile' },
              ].map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    filter === v
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPromenades.map(p => <PromenadeCard key={p.id} p={p} />)}
            </div>

            {/* CTA ajouter */}
            {profile && (
              <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-emerald-800">Vous connaissez un beau sentier ?</p>
                  <p className="text-emerald-600 text-sm">Partagez votre itinéraire avec la communauté de Biguglia</p>
                </div>
                <button
                  onClick={() => { setActiveTab('forum'); setShowForm(true); }}
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all"
                >
                  <Plus className="w-4 h-4" /> Ajouter un itinéraire
                </button>
              </div>
            )}

            {/* Carte info */}
            <div className="mt-6 bg-sky-50 border border-sky-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="p-2.5 bg-sky-100 rounded-xl flex-shrink-0">
                <Compass className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="font-bold text-sky-800 mb-1">🦩 Réserve naturelle de l'Étang de Biguglia</p>
                <p className="text-sky-700 text-sm leading-relaxed">
                  Site classé Natura 2000, l'étang abrite plus de 200 espèces d'oiseaux. Meilleure période : novembre à mars pour les oiseaux migrateurs. Flamants roses visibles toute l'année.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── FORUM ── */}
        {activeTab === 'forum' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Échanges & conseils promenades</h2>
              {profile && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-all text-sm"
                >
                  <Plus className="w-4 h-4" /> Nouveau message
                </button>
              )}
            </div>

            {/* Formulaire */}
            {showForm && profile && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Partager votre expérience</h3>
                <input
                  type="text" placeholder="Titre (ex: Groupe rando samedi matin...)"
                  value={newPost.title} onChange={e => setNewPost(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <textarea
                  placeholder="Décrivez votre itinéraire, partagez un bon plan, proposez une sortie groupée..."
                  rows={4} value={newPost.content} onChange={e => setNewPost(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <div className="flex gap-2 mt-3">
                  <button type="submit" disabled={submitting}
                    className="bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all">
                    {submitting ? 'Publication...' : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">
                    Annuler
                  </button>
                </div>
              </form>
            )}

            {/* Posts */}
            <div className="space-y-3">
              {SAMPLE_POSTS.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 hover:shadow-sm transition-all">
                  <h3 className="font-bold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{post.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatRelative(post.created_at)}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> {post.comment_count} réponses
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {!profile && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <p className="text-emerald-700 font-medium mb-3">Connectez-vous pour partager un itinéraire ou répondre</p>
                <Link href="/connexion" className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── SORTIES GROUPÉES ── */}
        {activeTab === 'agenda' && (
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Sorties groupées & rendez-vous nature</h2>

            <div className="space-y-4">
              {[
                { date: 'Dimanche 6 avril', time: '08h00', title: 'Randonnée Monte Castellu', organizer: 'Marie-Hélène D.', spots: 6, joined: 4, color: 'emerald' },
                { date: 'Samedi 12 avril',  time: '17h30', title: 'Balade coucher de soleil Cap Tormentoso', organizer: 'Antoine M.', spots: 8, joined: 3, color: 'sky' },
                { date: 'Dimanche 20 avril', time: '09h00', title: 'Observation oiseaux Étang de Biguglia', organizer: 'Sylvie R.', spots: 10, joined: 7, color: 'teal' },
              ].map(({ date, time, title, organizer, spots, joined, color }) => (
                <div key={title} className={`bg-white rounded-2xl border border-${color}-100 p-5 hover:shadow-md transition-all`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-bold text-${color}-600 bg-${color}-50 border border-${color}-200 rounded-full px-3 py-1 mb-3`}>
                        <Sun className="w-3 h-3" /> {date} · {time}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                      <p className="text-sm text-gray-500">Organisé par <span className="font-medium text-gray-700">{organizer}</span></p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-500 mb-1">{joined}/{spots} participants</div>
                      <div className={`w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden`}>
                        <div className={`h-full bg-${color}-400 rounded-full`} style={{ width: `${(joined/spots)*100}%` }} />
                      </div>
                    </div>
                  </div>
                  {profile && (
                    <button
                      onClick={() => toast.success('Inscription confirmée ! L\'organisateur vous contactera.')}
                      className={`mt-3 inline-flex items-center gap-2 bg-${color}-500 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-all`}
                    >
                      <Users className="w-4 h-4" /> Je participe
                    </button>
                  )}
                </div>
              ))}
            </div>

            {profile && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-emerald-800">Organisez une sortie !</p>
                  <p className="text-emerald-600 text-sm">Proposez une balade, une randonnée ou une sortie nature à la communauté.</p>
                </div>
                <button
                  onClick={() => toast('Fonctionnalité bientôt disponible 🚀')}
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all"
                >
                  <Plus className="w-4 h-4" /> Créer une sortie
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
