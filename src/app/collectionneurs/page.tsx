'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Tag, MessageSquare, Heart, Search, Plus, Eye, ChevronRight,
  Package, ArrowLeftRight, Trophy, Coins, Camera, BookOpen,
  BadgeCheck, Users, Gem, Palette, Music, Stamp, Car,
  Shirt, FlaskConical, Gamepad2, Leaf, Globe, Layers, X,
  Loader2, RefreshCw, ImageIcon, AlertCircle,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type CollectionCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  display_order: number;
};

type CollectionItem = {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  category?: CollectionCategory | null;
  item_type: 'vente' | 'troc' | 'don' | 'recherche';
  price?: number | null;
  condition: 'neuf' | 'excellent' | 'bon' | 'passable';
  tags: string[];
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  views: number;
  created_at: string;
  photos?: { url: string }[];
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  vente:     { label: 'Vente',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
  troc:      { label: 'Troc',       color: 'bg-amber-100 text-amber-700 border-amber-200' },
  don:       { label: 'Don ❤️',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  recherche: { label: 'Recherche',  color: 'bg-purple-100 text-purple-700 border-purple-200' },
};
const CONDITION_CONFIG = {
  neuf:      { label: 'Neuf',      color: 'text-emerald-600' },
  excellent: { label: 'Excellent', color: 'text-sky-600' },
  bon:       { label: 'Bon état',  color: 'text-amber-600' },
  passable:  { label: 'Passable',  color: 'text-gray-500' },
};

// Color palette by index for dynamic styling
const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200' },
};

function getCatClasses(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.gray;
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────
function ItemCard({ item }: { item: CollectionItem }) {
  const tc = TYPE_CONFIG[item.item_type];
  const cc = CONDITION_CONFIG[item.condition];
  const catClasses = item.category ? getCatClasses(item.category.color) : COLOR_CLASSES.gray;
  const firstPhoto = item.photos?.[0]?.url;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group">
      {firstPhoto && (
        <div className="h-32 overflow-hidden relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={firstPhoto} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          {item.category && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${catClasses.bg} ${catClasses.text}`}>
              <span>{item.category.icon}</span>
              <span className="hidden sm:inline">{item.category.name}</span>
            </div>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tc.color}`}>{tc.label}</span>
        </div>

        <h3 className="font-bold text-gray-900 text-sm mb-2 leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">{item.title}</h3>
        <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-3">{item.description}</p>

        {item.price !== null && item.price !== undefined && item.item_type === 'vente' && (
          <div className="text-xl font-black text-amber-600 mb-3">{item.price} €</div>
        )}

        <div className="flex items-center gap-3 mb-3 text-xs text-gray-400">
          <span className={cc.color + ' font-medium'}>{cc.label}</span>
          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{item.views}</span>
        </div>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>)}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs text-gray-400">
          <span>{item.author?.full_name ?? 'Membre'} · {formatRelative(item.created_at)}</span>
          <Link href={`/messages?to=${item.author_id}`}
            className="text-amber-600 font-semibold hover:text-amber-700 flex items-center gap-1 transition-colors">
            Contacter <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CollectionneursPage() {
  const { profile } = useAuthStore();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'annonces' | 'forum' | 'categories'>('annonces');
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);

  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingForum, setLoadingForum] = useState(false);
  const [dbReady, setDbReady] = useState(true);

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');

  // New item form
  const [showForm, setShowForm] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', item_type: 'vente',
    price: '', condition: 'bon', tags: '',
  });

  // Forum form
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // ── Fetch categories ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data, error } = await supabase.from('collection_categories').select('*').order('display_order');
        if (error) {
          if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
            setDbReady(false);
          }
          return;
        }
        setCategories(data || []);
        setDbReady(true);
      } catch (err) {
        console.error('fetchCats error:', err);
        setDbReady(false);
      }
    };
    fetchCats();
  }, []);

  // ── Fetch items ───────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      let query = supabase
        .from('collection_items')
        .select(`*, author:profiles!collection_items_author_id_fkey(full_name, avatar_url), category:collection_categories(*), photos:collection_item_photos(url)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (selectedCat !== 'all') query = query.eq('category_id', selectedCat);
      if (selectedType !== 'all') query = query.eq('item_type', selectedType);

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingItems(false);
        return;
      }
      setDbReady(true);
      setItems((data || []) as CollectionItem[]);
    } catch (err) {
      console.error('fetchItems error:', err);
      setDbReady(false);
    }
    setLoadingItems(false);
  }, [selectedCat, selectedType]);

  // ── Fetch forum ───────────────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    const { data: cats } = await supabase.from('forum_categories').select('id').eq('slug', 'collectionneurs').single();
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

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);

  // Filtered by search
  const filteredItems = search
    ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))
    : items;

  // ── Submit item ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim() || !form.description.trim() || !form.category_id) {
      toast.error('Titre, description et catégorie obligatoires');
      return;
    }
    setSubmitting(true);
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const { data: item, error } = await supabase
      .from('collection_items')
      .insert({
        author_id: profile.id,
        category_id: form.category_id,
        title: form.title.trim(),
        description: form.description.trim(),
        item_type: form.item_type,
        price: form.price && form.item_type === 'vente' ? parseFloat(form.price) : null,
        condition: form.condition,
        tags,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de la publication');
      console.error(error);
      setSubmitting(false);
      return;
    }

    // Upload photos
    if (photos.length > 0 && item) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const ext = photo.name.split('.').pop() || 'jpg';
        const fileName = `collection/${item.id}/${Date.now()}-${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from('photos')
          .upload(fileName, photo, { upsert: true });
        if (up && !upErr) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
          await supabase.from('collection_item_photos').insert({
            item_id: item.id, url: publicUrl, display_order: i,
          });
        }
      }
    }

    toast.success('Annonce publiée avec succès !');
    setForm({ title: '', description: '', category_id: '', item_type: 'vente', price: '', condition: 'bon', tags: '' });
    setPhotos([]);
    setShowForm(false);
    fetchItems();
    setSubmitting(false);
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

  const totalCount = items.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-white">

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
                  { icon: Tag,            label: `${totalCount} annonce${totalCount !== 1 ? 's' : ''}` },
                  { icon: ArrowLeftRight, label: 'Troc & don' },
                  { icon: MessageSquare,  label: 'Forum entraide' },
                  { icon: Trophy,         label: `${categories.length} catégories` },
                ].map(({ icon: I, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <I className="w-3.5 h-3.5" /> {label}
                  </span>
                ))}
              </div>
            </div>
            {profile && (
              <button
                onClick={() => { setActiveTab('annonces'); setShowForm(true); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
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
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Rechercher un objet, une collection..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                />
              </div>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                <option value="all">Tous types</option>
                <option value="vente">Vente</option>
                <option value="troc">Troc</option>
                <option value="don">Don</option>
                <option value="recherche">Recherche</option>
              </select>
              <button onClick={fetchItems} className="p-2.5 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-amber-600 hover:border-amber-300 transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Filtres catégorie */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => setSelectedCat('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedCat === 'all' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'}`}>
                  Tout
                </button>
                {categories.map(cat => {
                  const cls = getCatClasses(cat.color);
                  return (
                    <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        selectedCat === cat.id
                          ? `${cls.bg} ${cls.text} ${cls.border} shadow-sm`
                          : 'bg-white text-gray-600 border-gray-200 hover:border-amber-200'
                      }`}>
                      <span>{cat.icon}</span> {cat.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Formulaire de publication */}
            {showForm && profile && (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-amber-200 p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-lg">Publier une annonce</h3>
                  <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input type="text" placeholder="Titre de l'annonce *" required
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                    <option value="">Catégorie... *</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mb-3">
                  <select value={form.item_type} onChange={e => setForm(f => ({ ...f, item_type: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                    <option value="vente">Vente</option>
                    <option value="troc">Troc</option>
                    <option value="don">Don</option>
                    <option value="recherche">Je recherche</option>
                  </select>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                    <option value="neuf">Neuf</option>
                    <option value="excellent">Excellent état</option>
                    <option value="bon">Bon état</option>
                    <option value="passable">Passable</option>
                  </select>
                  {form.item_type === 'vente' && (
                    <input type="number" placeholder="Prix (€)" min="0" step="0.01"
                      value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  )}
                </div>

                <textarea placeholder="Description de votre objet, état, prix souhaité, conditions de remise en main propre..." required
                  rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />

                <input type="text" placeholder="Tags (ex: timbres, france, rare)"
                  value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />

                {/* Photos */}
                <div className="mb-4">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-amber-600 font-medium border border-dashed border-amber-300 rounded-xl px-4 py-2.5 hover:bg-amber-50 transition-all">
                    <Camera className="w-4 h-4" /> Ajouter des photos (max 5)
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      if (photos.length + files.length > 5) { toast.error('Max 5 photos'); return; }
                      setPhotos(p => [...p, ...files]);
                    }}
                  />
                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {photos.map((ph, i) => (
                        <div key={i} className="relative w-16 h-16 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(ph)} alt="" className="w-full h-full object-cover rounded-xl" />
                          <button type="button" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50 transition-all">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication...</> : 'Publier l\'annonce'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            {/* Liste */}
            {loadingItems ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold text-lg">{search ? 'Aucun résultat pour cette recherche' : 'Aucune annonce pour l\'instant'}</p>
                {profile && !search && (
                  <button onClick={() => setShowForm(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-all">
                    <Plus className="w-4 h-4" /> Soyez le premier à publier !
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            )}

            {!profile && (
              <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-amber-800">Vous avez des objets à échanger ?</p>
                  <p className="text-amber-600 text-sm">Connectez-vous pour publier une annonce ou contacter un collectionneur.</p>
                </div>
                <Link href="/connexion"
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-amber-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}

            {/* Conseil anti-arnaque */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
              <BadgeCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 mb-1">💡 Conseil anti-arnaque</p>
                <p className="text-amber-700 text-sm leading-relaxed">Pour tout achat, privilégiez les échanges en main propre à Biguglia. Ne jamais envoyer d'argent avant d'avoir vu l'objet. En cas de doute, signalez l'annonce.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── FORUM ── */}
        {activeTab === 'forum' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Forum des collectionneurs</h2>
              {profile && (
                <button onClick={() => setShowPostForm(!showPostForm)}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-all text-sm">
                  <Plus className="w-4 h-4" /> Nouveau sujet
                </button>
              )}
            </div>

            {showPostForm && profile && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-amber-200 p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">Nouveau sujet</h3>
                  <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input type="text" placeholder="Titre du sujet..." required
                  value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <textarea placeholder="Votre question, conseil ou annonce de bourse..." required
                  rows={4} value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={submittingPost}
                    className="flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50 transition-all">
                    {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication...</> : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowPostForm(false)}
                    className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            {loadingForum ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
              </div>
            ) : forumPosts.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun sujet pour l'instant</p>
                {profile && (
                  <button onClick={() => setShowPostForm(true)}
                    className="mt-4 text-amber-600 font-semibold text-sm hover:underline">
                    Soyez le premier à poster !
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {forumPosts.map(post => (
                  <Link key={post.id} href={`/forum/${post.id}`}
                    className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-amber-200 hover:shadow-sm transition-all">
                    <h3 className="font-bold text-gray-900 text-sm mb-2 hover:text-amber-700 transition-colors">{post.title}</h3>
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
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <p className="text-amber-700 font-medium mb-3">Connectez-vous pour participer aux discussions</p>
                <Link href="/connexion"
                  className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── CATÉGORIES ── */}
        {activeTab === 'categories' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Toutes les catégories de collection</h2>
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-amber-300 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map(cat => {
                  const cls = getCatClasses(cat.color);
                  return (
                    <button key={cat.id}
                      onClick={() => { setSelectedCat(cat.id); setActiveTab('annonces'); }}
                      className={`group ${cls.bg} ${cls.border} border rounded-2xl p-5 text-left hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">{cat.icon}</span>
                      </div>
                      <h3 className={`font-bold text-sm ${cls.text} leading-snug`}>{cat.name}</h3>
                      <p className="text-gray-500 text-xs mt-1 group-hover:text-gray-700 transition-colors flex items-center gap-1">
                        Voir les annonces <ChevronRight className="w-3 h-3" />
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
