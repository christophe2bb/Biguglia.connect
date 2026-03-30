'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { formatRelative } from '@/lib/utils';
import {
  Tag, MessageSquare, Star, Heart, Search, Plus, Eye, ChevronRight,
  Package, ArrowLeftRight, Trophy, Coins, Camera, BookOpen, Clock,
  BadgeCheck, AlertCircle, Users, Gem, Palette, Music, Stamp, Car,
  Shirt, FlaskConical, Gamepad2, Leaf, Globe, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type CollectionType = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  count: number;
};

type Item = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'vente' | 'troc' | 'don' | 'recherche';
  price?: number;
  condition: 'neuf' | 'excellent' | 'bon' | 'passable';
  author_name: string;
  created_at: string;
  views: number;
  likes: number;
  tags: string[];
};

type Post = {
  id: string;
  title: string;
  preview: string;
  author: string;
  created_at: string;
  replies: number;
  category: string;
};

// ─── Catégories de collections ────────────────────────────────────────────────
const CATEGORIES: CollectionType[] = [
  { id: 'timbres',    label: 'Timbres & philatélie', icon: Stamp,       color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   count: 12 },
  { id: 'monnaies',   label: 'Monnaies & numismatique', icon: Coins,    color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  count: 8 },
  { id: 'vinyles',    label: 'Vinyles & musique',    icon: Music,        color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200', count: 21 },
  { id: 'livres',     label: 'Livres anciens',        icon: BookOpen,    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',count: 15 },
  { id: 'figurines',  label: 'Figurines & jouets',    icon: Gamepad2,    color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',   count: 7 },
  { id: 'cartes',     label: 'Cartes postales',       icon: Globe,       color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',    count: 19 },
  { id: 'art',        label: 'Art & tableaux',        icon: Palette,     color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',   count: 6 },
  { id: 'vintage',    label: 'Vintage & mode',        icon: Shirt,       color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', count: 14 },
  { id: 'mineraux',   label: 'Minéraux & fossiles',   icon: FlaskConical,color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',   count: 5 },
  { id: 'miniatures', label: 'Miniatures & maquettes',icon: Layers,      color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200', count: 9 },
  { id: 'automobilia',label: 'Automobilia',           icon: Car,         color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',    count: 4 },
  { id: 'nature',     label: 'Nature & botanique',    icon: Leaf,        color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-200',  count: 11 },
];

// ─── Données exemples ─────────────────────────────────────────────────────────
const SAMPLE_ITEMS: Item[] = [
  {
    id: 'c1', title: 'Collection timbres France 1960-1980 complète', category: 'timbres',
    description: 'Classeur avec 340 timbres, tous en excellent état. Quelques raretés dont le bloc Concorde 1976. Estimation expert 450€. Cède pour 280€ ferme.',
    type: 'vente', price: 280, condition: 'excellent', author_name: 'Jean-Paul V.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(), views: 89, likes: 7, tags: ['france', 'classeur', 'concorde'],
  },
  {
    id: 'c2', title: 'Cherche vinyles jazz années 50-70', category: 'vinyles',
    description: 'Collectionneur passionné cherche vinyles jazz, be-bop, cool jazz. Miles Davis, Coltrane, Bill Evans. Bon prix ou troc contre mes vinyles rock.',
    type: 'recherche', condition: 'bon', author_name: 'Marc-Antoine L.',
    created_at: new Date(Date.now() - 86400000).toISOString(), views: 56, likes: 4, tags: ['jazz', 'miles davis', 'coltrane'],
  },
  {
    id: 'c3', title: 'Lot 50 cartes postales Corse début XXe', category: 'cartes',
    description: 'Cartes postales anciennes de Corse, période 1900-1930. Villages de montagne, scènes de vie locale. Authentiques, bon état général. Idéal pour collectionneurs ou décoration.',
    type: 'vente', price: 95, condition: 'bon', author_name: 'Isabelle M.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(), views: 134, likes: 18, tags: ['corse', 'ancienne', 'XIXe'],
  },
  {
    id: 'c4', title: 'Troc : monnaies romaines contre médailles militaires', category: 'monnaies',
    description: 'Propose 3 pièces romaines authentiques (IIe-IIIe s.) contre médailles militaires françaises WW1-WW2. Expertise possible sur demande.',
    type: 'troc', condition: 'excellent', author_name: 'Dominique S.',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(), views: 67, likes: 9, tags: ['romaines', 'antiquité', 'troc'],
  },
  {
    id: 'c5', title: 'Don : encyclopédies Larousse années 70 (20 volumes)', category: 'livres',
    description: 'Je donne un Larousse encyclopédique complet, 20 volumes. Couvertures cuir rouge, très bel état. À venir chercher sur place. Premier arrivé, premier servi.',
    type: 'don', condition: 'bon', author_name: 'Chantal R.',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(), views: 203, likes: 31, tags: ['don', 'encyclopédie', 'larousse'],
  },
  {
    id: 'c6', title: 'Figurines Tintin - collection complète 45 personnages', category: 'figurines',
    description: 'Collection résine Tintin complète, 45 figurines avec boîtes d\'origine. Jamais sorties de leurs boîtes. Réf. Moulinsart officielle. Valeur neuf : 680€.',
    type: 'vente', price: 420, condition: 'neuf', author_name: 'Pierre-François D.',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(), views: 178, likes: 22, tags: ['tintin', 'moulinsart', 'collection'],
  },
];

const SAMPLE_POSTS: Post[] = [
  { id: 'f1', title: 'Comment estimer la valeur d\'un timbre rare ?', preview: 'Je viens de trouver dans le grenier un timbre qui semble ancien...', author: 'Marie-L.', created_at: new Date(Date.now() - 1 * 86400000).toISOString(), replies: 11, category: 'timbres' },
  { id: 'f2', title: 'Bourse aux collections Bastia le 15 mai ?', preview: 'Quelqu\'un a des infos sur la bourse aux collections annoncée ?', author: 'Robert V.', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), replies: 6, category: 'général' },
  { id: 'f3', title: 'Où faire expertiser une monnaie ancienne en Corse ?', preview: 'J\'ai trouvé une pièce qui pourrait être médiévale, besoin de conseils...', author: 'Armand P.', created_at: new Date(Date.now() - 4 * 86400000).toISOString(), replies: 8, category: 'monnaies' },
  { id: 'f4', title: 'Groupe WhatsApp collectionneurs Biguglia', preview: 'Je crée un groupe pour faciliter les échanges entre nous...', author: 'Sophie B.', created_at: new Date(Date.now() - 3600000).toISOString(), replies: 23, category: 'général' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  vente:     { label: 'Vente',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  troc:      { label: 'Troc',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  don:       { label: 'Don ❤️',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  recherche: { label: 'Recherche', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};
const CONDITION_CONFIG = {
  neuf:      { label: 'Neuf',     color: 'text-emerald-600' },
  excellent: { label: 'Excellent',color: 'text-sky-600' },
  bon:       { label: 'Bon état', color: 'text-amber-600' },
  passable:  { label: 'Passable', color: 'text-gray-500' },
};

function ItemCard({ item }: { item: Item }) {
  const tc = TYPE_CONFIG[item.type];
  const cc = CONDITION_CONFIG[item.condition];
  const cat = CATEGORIES.find(c => c.id === item.category);
  const CatIcon = cat?.icon || Package;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 p-5 group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${cat?.bg || 'bg-gray-50'} rounded-lg`}>
            <CatIcon className={`w-4 h-4 ${cat?.color || 'text-gray-500'}`} />
          </div>
          <span className={`text-xs font-bold ${cat?.color}`}>{cat?.label}</span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tc.color}`}>{tc.label}</span>
      </div>

      <h3 className="font-bold text-gray-900 text-sm mb-2 leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">{item.title}</h3>
      <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-3">{item.description}</p>

      {item.price !== undefined && (
        <div className="text-xl font-black text-amber-600 mb-3">{item.price} €</div>
      )}

      <div className="flex items-center gap-3 mb-3 text-xs text-gray-400">
        <span className={cc.color + ' font-medium'}>{cc.label}</span>
        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{item.views}</span>
        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3 text-rose-400" />{item.likes}</span>
      </div>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>)}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs text-gray-400">
        <span>{item.author_name} · {formatRelative(item.created_at)}</span>
        <button className="text-amber-600 font-semibold hover:text-amber-700 flex items-center gap-1 transition-colors">
          Contacter <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CollectionneursPage() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'annonces' | 'forum' | 'categories'>('annonces');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  const filtered = SAMPLE_ITEMS.filter(item => {
    const matchCat = selectedCat === 'all' || item.category === selectedCat;
    const matchType = selectedType === 'all' || item.type === selectedType;
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchType && matchSearch;
  });

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) { toast.error('Remplissez tous les champs'); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('Message publié !');
    setNewPost({ title: '', content: '' });
    setShowForm(false);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-white">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute bottom-0 left-0 w-96 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Gem className="w-5 h-5" />
                </div>
                <span className="text-amber-100 text-sm font-semibold">Thème · Collectionneurs</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
                🏆 Collectionneurs de Biguglia
              </h1>
              <p className="text-amber-100 text-base sm:text-lg max-w-xl leading-relaxed">
                Vendez, échangez, donnez ou recherchez des objets de collection. Rencontrez d'autres passionnés du village.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                {[
                  { icon: Tag,           label: `${SAMPLE_ITEMS.length} annonces` },
                  { icon: ArrowLeftRight, label: 'Troc & don' },
                  { icon: MessageSquare, label: 'Forum entraide' },
                  { icon: Trophy,        label: `${CATEGORIES.length} catégories` },
                ].map(({ icon: I, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <I className="w-3.5 h-3.5" /> {label}
                  </span>
                ))}
              </div>
            </div>
            {profile && (
              <button
                onClick={() => { setActiveTab('annonces'); setShowForm(true); }}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-amber-700 font-bold px-6 py-3 rounded-2xl hover:bg-amber-50 transition-all shadow-lg hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" /> Déposer une annonce
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── ONGLETS ── */}
        <div className="flex gap-2 mb-8 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
          {[
            { id: 'annonces',   label: 'Annonces & troc', icon: Tag },
            { id: 'forum',      label: 'Forum',            icon: MessageSquare },
            { id: 'categories', label: 'Catégories',       icon: Layers },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── ANNONCES ── */}
        {activeTab === 'annonces' && (
          <div>
            {/* Barre de recherche + filtres */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" placeholder="Rechercher un objet, une collection..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                />
              </div>
              <select
                value={selectedType} onChange={e => setSelectedType(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="all">Tous types</option>
                <option value="vente">Vente</option>
                <option value="troc">Troc</option>
                <option value="don">Don</option>
                <option value="recherche">Recherche</option>
              </select>
            </div>

            {/* Filtres catégorie */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSelectedCat('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedCat === 'all' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'}`}
              >
                Tout
              </button>
              {CATEGORIES.slice(0, 8).map(cat => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      selectedCat === cat.id
                        ? `${cat.bg} ${cat.color} ${cat.border} shadow-sm`
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-200'
                    }`}
                  >
                    <CatIcon className="w-3.5 h-3.5" /> {cat.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Formulaire rapide */}
            {showForm && profile && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-amber-200 p-5 mb-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Publier une annonce</h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input type="text" placeholder="Titre de l'annonce"
                    value={newPost.title} onChange={e => setNewPost(f => ({ ...f, title: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <select className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                    <option>Type d'annonce...</option>
                    <option>Vente</option><option>Troc</option><option>Don</option><option>Recherche</option>
                  </select>
                </div>
                <textarea placeholder="Description de votre objet, état, prix souhaité..."
                  rows={3} value={newPost.content} onChange={e => setNewPost(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting}
                    className="bg-amber-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50 transition-all">
                    {submitting ? 'Publication...' : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-all">Annuler</button>
                </div>
              </form>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(item => <ItemCard key={item.id} item={item} />)}
              {filtered.length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aucune annonce pour cette recherche</p>
                  {profile && <button onClick={() => setShowForm(true)} className="mt-3 text-amber-600 font-semibold text-sm hover:underline">Soyez le premier à publier !</button>}
                </div>
              )}
            </div>

            {!profile && (
              <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-amber-800">Vous avez des objets à échanger ?</p>
                  <p className="text-amber-600 text-sm">Connectez-vous pour publier une annonce ou contacter un collectionneur.</p>
                </div>
                <Link href="/connexion" className="flex-shrink-0 inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-amber-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── FORUM ── */}
        {activeTab === 'forum' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Forum des collectionneurs</h2>
              {profile && (
                <button onClick={() => setShowForm(!showForm)}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-all text-sm">
                  <Plus className="w-4 h-4" /> Nouveau sujet
                </button>
              )}
            </div>

            {showForm && profile && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-amber-200 p-5 mb-6 shadow-sm">
                <input type="text" placeholder="Titre du sujet..."
                  value={newPost.title} onChange={e => setNewPost(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <textarea placeholder="Votre question, conseil ou annonce de bourse..."
                  rows={4} value={newPost.content} onChange={e => setNewPost(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="bg-amber-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50 transition-all">
                    {submitting ? 'Publication...' : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {SAMPLE_POSTS.map(post => {
                const cat = CATEGORIES.find(c => c.id === post.category);
                return (
                  <div key={post.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-amber-200 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">{post.title}</h3>
                      {cat && (
                        <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${cat.bg} ${cat.color} ${cat.border} border`}>{cat.label.split(' ')[0]}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{post.preview}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-medium text-gray-600">{post.author} · {formatRelative(post.created_at)}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.replies} réponses</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
              <BadgeCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 mb-1">💡 Conseil anti-arnaque</p>
                <p className="text-amber-700 text-sm leading-relaxed">Pour tout achat, privilégiez les échanges en main propre. Ne jamais envoyer d'argent avant d'avoir vu l'objet. En cas de doute, signalez l'annonce.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── CATÉGORIES ── */}
        {activeTab === 'categories' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Toutes les catégories de collection</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCat(cat.id); setActiveTab('annonces'); }}
                    className={`group ${cat.bg} ${cat.border} border rounded-2xl p-5 text-left hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 bg-white rounded-xl shadow-sm`}>
                        <CatIcon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{cat.count} annonces</span>
                    </div>
                    <h3 className={`font-bold text-sm ${cat.color} leading-snug`}>{cat.label}</h3>
                    <p className="text-gray-500 text-xs mt-1 group-hover:text-gray-700 transition-colors flex items-center gap-1">
                      Voir les annonces <ChevronRight className="w-3 h-3" />
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
