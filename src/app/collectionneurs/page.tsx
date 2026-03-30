'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Tag, MessageSquare, Search, Plus, Eye, ChevronRight,
  Package, ArrowLeftRight, Gem,
  BadgeCheck, Layers, X,
  Loader2, RefreshCw, Camera, AlertCircle, Pencil, Trash2,
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
  is_custom?: boolean; // créée par un utilisateur
  author_id?: string;
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

// ─── Catégories statiques (fallback + base toujours visible) ──────────────────
const STATIC_CATEGORIES: CollectionCategory[] = [
  { id: 'static-1',  name: 'Timbres & philatélie',   slug: 'timbres',     icon: '📮', color: 'blue',    display_order: 1 },
  { id: 'static-2',  name: 'Monnaies & numismatique', slug: 'monnaies',    icon: '🪙', color: 'amber',   display_order: 2 },
  { id: 'static-3',  name: 'Vinyles & musique',       slug: 'vinyles',     icon: '🎵', color: 'purple',  display_order: 3 },
  { id: 'static-4',  name: 'Livres anciens',          slug: 'livres',      icon: '📚', color: 'emerald', display_order: 4 },
  { id: 'static-5',  name: 'Figurines & jouets',      slug: 'figurines',   icon: '🎮', color: 'rose',    display_order: 5 },
  { id: 'static-6',  name: 'Cartes postales',         slug: 'cartes',      icon: '🗺️', color: 'sky',     display_order: 6 },
  { id: 'static-7',  name: 'Art & tableaux',          slug: 'art',         icon: '🎨', color: 'pink',    display_order: 7 },
  { id: 'static-8',  name: 'Vintage & mode',          slug: 'vintage',     icon: '👗', color: 'orange',  display_order: 8 },
  { id: 'static-9',  name: 'Minéraux & fossiles',     slug: 'mineraux',    icon: '🪨', color: 'teal',    display_order: 9 },
  { id: 'static-10', name: 'Miniatures & maquettes',  slug: 'miniatures',  icon: '🏗️', color: 'indigo',  display_order: 10 },
  { id: 'static-11', name: 'Automobilia',             slug: 'automobilia', icon: '🚗', color: 'red',     display_order: 11 },
  { id: 'static-12', name: 'Nature & botanique',      slug: 'nature-col',  icon: '🌿', color: 'green',   display_order: 12 },
];

// Emojis disponibles pour nouvelle catégorie
const EMOJI_CHOICES = [
  '📦','🎯','⭐','🏅','🔮','🎁','💎','🧸','🖼️','📷',
  '🎸','🎺','🪗','🎻','⚽','🏀','🎾','🏈','🎱','🀄',
  '🧩','🪆','🪀','🪁','🎪','🎭','🎬','📼','📻','☎️',
  '🔭','🧪','⚗️','🦴','🌸','🍂','🦋','🐚','🪸','💫',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  vente:     { label: 'Vente',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  troc:      { label: 'Troc',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  don:       { label: 'Don ❤️',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  recherche: { label: 'Recherche', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};
const CONDITION_CONFIG = {
  neuf:      { label: 'Neuf',      color: 'text-emerald-600' },
  excellent: { label: 'Excellent', color: 'text-sky-600' },
  bon:       { label: 'Bon état',  color: 'text-amber-600' },
  passable:  { label: 'Passable',  color: 'text-gray-500' },
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; btn: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   btn: 'bg-blue-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  btn: 'bg-amber-500' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200', btn: 'bg-purple-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',btn: 'bg-emerald-500' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',   btn: 'bg-rose-500' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',    btn: 'bg-sky-500' },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',   btn: 'bg-pink-500' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200', btn: 'bg-orange-500' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',   btn: 'bg-teal-500' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200', btn: 'bg-indigo-500' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    btn: 'bg-red-500' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  btn: 'bg-green-500' },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',   btn: 'bg-gray-500' },
};

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Bleu' }, { value: 'amber', label: 'Ambre' },
  { value: 'purple', label: 'Violet' }, { value: 'emerald', label: 'Émeraude' },
  { value: 'rose', label: 'Rose' }, { value: 'sky', label: 'Ciel' },
  { value: 'pink', label: 'Rose vif' }, { value: 'orange', label: 'Orange' },
  { value: 'teal', label: 'Teal' }, { value: 'indigo', label: 'Indigo' },
  { value: 'red', label: 'Rouge' }, { value: 'green', label: 'Vert' },
];

function getCatClasses(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.gray;
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────
function ItemCard({
  item,
  currentUserId,
  onEdit,
  onDelete,
}: {
  item: CollectionItem;
  currentUserId?: string;
  onEdit: (item: CollectionItem) => void;
  onDelete: (item: CollectionItem) => void;
}) {
  const tc = TYPE_CONFIG[item.item_type];
  const cc = CONDITION_CONFIG[item.condition];
  const catClasses = item.category ? getCatClasses(item.category.color) : COLOR_CLASSES.gray;
  const firstPhoto = item.photos?.[0]?.url;
  const isOwner = currentUserId === item.author_id;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group relative">
      {/* Boutons auteur */}
      {isOwner && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(item)}
            title="Modifier"
            className="p-1.5 bg-white rounded-lg shadow border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-all"
          >
            <Pencil className="w-3.5 h-3.5 text-amber-600" />
          </button>
          <button
            onClick={() => onDelete(item)}
            title="Supprimer"
            className="p-1.5 bg-white rounded-lg shadow border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      )}

      {firstPhoto ? (
        <div className="h-36 overflow-hidden relative bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={firstPhoto} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
          <span className="text-3xl opacity-40">{item.category?.icon ?? '📦'}</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          {item.category && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${catClasses.bg} ${catClasses.text}`}>
              <span>{item.category.icon}</span>
              <span className="hidden sm:inline truncate max-w-[80px]">{item.category.name.split(' ')[0]}</span>
            </div>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tc.color} ml-auto flex-shrink-0`}>{tc.label}</span>
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
            {item.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs text-gray-400">
          <span className="truncate max-w-[120px]">{item.author?.full_name ?? 'Membre'} · {formatRelative(item.created_at)}</span>
          {isOwner ? (
            <div className="flex items-center gap-2">
              <button onClick={() => onEdit(item)} className="text-amber-600 font-semibold hover:text-amber-700 flex items-center gap-1 transition-colors">
                <Pencil className="w-3 h-3" /> Modifier
              </button>
            </div>
          ) : (
            <Link href={`/messages?to=${item.author_id}`}
              className="text-amber-600 font-semibold hover:text-amber-700 flex items-center gap-1 transition-colors flex-shrink-0">
              Contacter <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
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

  // Catégories = statiques + celles de la DB fusionnées
  const [dbCategories, setDbCategories] = useState<CollectionCategory[]>([]);
  const allCategories: CollectionCategory[] = dbCategories.length > 0
    ? dbCategories
    : STATIC_CATEGORIES;

  const [items, setItems] = useState<CollectionItem[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);

  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingForum, setLoadingForum] = useState(false);
  const [dbReady, setDbReady] = useState(true);

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');

  // ── Formulaire nouvelle annonce ───────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedNotify, setCopiedNotify] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', item_type: 'vente',
    price: '', condition: 'bon', tags: '',
  });

  // ── Formulaire nouvelle catégorie ─────────────────────────────────────────
  const [showCatForm, setShowCatForm] = useState(false);
  const [submittingCat, setSubmittingCat] = useState(false);
  const [catForm, setCatForm] = useState({
    name: '', icon: '📦', color: 'amber',
  });

  // ── Formulaire forum ──────────────────────────────────────────────────────
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // ── Fetch categories depuis DB ────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('collection_categories')
        .select('*')
        .order('display_order');
      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setDbReady(false);
        }
        return;
      }
      if (data && data.length > 0) {
        setDbCategories(data);
        setDbReady(true);
      }
    } catch {
      setDbReady(false);
    }
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
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingItems(false);
        return;
      }
      setDbReady(true);
      setItems((data || []) as CollectionItem[]);
    } catch {
      setDbReady(false);
    }
    setLoadingItems(false);
  }, [selectedCat, selectedType]);

  // ── Fetch forum ────────────────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    try {
      // Cherche la catégorie forum "collectionneurs" (créée via migration SQL)
      const { data: cats } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('slug', 'collectionneurs')
        .maybeSingle();

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
    } catch (err) {
      console.error('fetchForum error:', err);
    }
    setLoadingForum(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);

  const filteredItems = search
    ? items.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  // ── Créer une nouvelle catégorie ──────────────────────────────────────────
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!catForm.name.trim()) { toast.error('Nom de catégorie requis'); return; }

    setSubmittingCat(true);
    const slug = catForm.name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now();

    const { data, error } = await supabase
      .from('collection_categories')
      .insert({
        name: catForm.name.trim(),
        slug,
        icon: catForm.icon,
        color: catForm.color,
        display_order: 99,
        is_custom: true,
        author_id: profile.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Impossible de créer la catégorie. Vérifiez la migration SQL.');
      console.error(error);
    } else {
      toast.success(`✅ Catégorie "${catForm.name}" créée !`, { duration: 4000 });
      setDbCategories(prev => [...prev, data]);
      setCatForm({ name: '', icon: '📦', color: 'amber' });
      setShowCatForm(false);
    }
    setSubmittingCat(false);
  };

  // ── Supprimer une catégorie personnalisée ─────────────────────────────────
  const handleDeleteCategory = async (cat: CollectionCategory) => {
    if (!profile || cat.author_id !== profile.id) return;
    if (!confirm(`Supprimer la catégorie "${cat.name}" ?`)) return;
    const { error } = await supabase.from('collection_categories').delete().eq('id', cat.id);
    if (error) { toast.error('Erreur lors de la suppression'); }
    else {
      toast.success('Catégorie supprimée');
      setDbCategories(prev => prev.filter(c => c.id !== cat.id));
    }
  };

  // ── Publier une annonce ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim() || !form.description.trim() || !form.category_id) {
      toast.error('Titre, description et catégorie obligatoires');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);

    // Si la catégorie choisie est statique (pas encore en DB), on la crée d'abord
    let realCategoryId: string | null = form.category_id;
    if (form.category_id.startsWith('static-')) {
      const staticCat = STATIC_CATEGORIES.find(c => c.id === form.category_id);
      if (staticCat) {
        // Vérifie si elle existe déjà en DB (slug unique)
        const { data: existing } = await supabase
          .from('collection_categories')
          .select('id')
          .eq('slug', staticCat.slug)
          .maybeSingle();
        if (existing?.id) {
          realCategoryId = existing.id;
        } else {
          // Crée la catégorie en DB
          const { data: created, error: catErr } = await supabase
            .from('collection_categories')
            .insert({
              name: staticCat.name,
              slug: staticCat.slug,
              icon: staticCat.icon,
              color: staticCat.color,
              display_order: staticCat.display_order,
              is_custom: false,
              author_id: profile.id,
            })
            .select('id')
            .single();
          if (catErr || !created) {
            // Table pas encore créée → publier sans catégorie
            realCategoryId = null;
          } else {
            realCategoryId = created.id;
            // Mise à jour locale pour les prochaines publications
            setDbCategories(prev => {
              const already = prev.find(c => c.slug === staticCat.slug);
              if (already) return prev;
              return [...prev, { ...staticCat, id: created.id }];
            });
          }
        }
      }
    }

    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const { data: item, error } = await supabase
      .from('collection_items')
      .insert({
        author_id: profile.id,
        category_id: realCategoryId,
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
      console.error('collection_items insert error:', error);
      let msg = '';
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        msg = '⚠️ Cache Supabase non rechargé. Les tables existent mais PostgREST ne les voit pas encore. Allez sur /admin/migration et exécutez "NOTIFY pgrst, \'reload schema\';" dans Supabase SQL Editor.';
      } else if (error.message?.includes('Could not find the table')) {
        msg = '⚠️ Cache Supabase non rechargé. Allez sur /admin/migration et exécutez "NOTIFY pgrst, \'reload schema\';" dans le SQL Editor de Supabase.';
      } else if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
        msg = '⚠️ Erreur de permission RLS. Vérifiez que vous êtes bien connecté et que les politiques sont correctes dans Supabase.';
      } else {
        msg = `⚠️ Erreur Supabase : ${error.message}`;
      }
      setSubmitError(msg);
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

    toast.success('🏆 Annonce publiée avec succès !', { duration: 4000 });
    setForm({ title: '', description: '', category_id: '', item_type: 'vente', price: '', condition: 'bon', tags: '' });
    setPhotos([]);
    setShowForm(false);
    fetchItems();
    setSubmitting(false);
  };

  // ── Modale édition annonce ────────────────────────────────────────────────
  const [editItem, setEditItem] = useState<CollectionItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', item_type: 'vente' as CollectionItem['item_type'],
    price: '', condition: 'bon' as CollectionItem['condition'], tags: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (item: CollectionItem) => {
    setEditItem(item);
    setEditForm({
      title: item.title,
      description: item.description,
      item_type: item.item_type,
      price: item.price != null ? String(item.price) : '',
      condition: item.condition,
      tags: (item.tags ?? []).join(', '),
    });
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !profile) return;
    if (!editForm.title.trim() || !editForm.description.trim()) {
      toast.error('Titre et description obligatoires');
      return;
    }
    setSavingEdit(true);
    const tags = editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const { error } = await supabase
      .from('collection_items')
      .update({
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        item_type: editForm.item_type,
        price: editForm.price && editForm.item_type === 'vente' ? parseFloat(editForm.price) : null,
        condition: editForm.condition,
        tags,
      })
      .eq('id', editItem.id)
      .eq('author_id', profile.id);

    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('✅ Annonce modifiée !', { duration: 3000 });
      setEditItem(null);
      fetchItems();
    }
    setSavingEdit(false);
  };

  const handleDeleteItem = async (item: CollectionItem) => {
    if (!profile || profile.id !== item.author_id) return;
    if (!confirm(`Supprimer l'annonce "${item.title}" ? Cette action est irréversible.`)) return;
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', item.id)
      .eq('author_id', profile.id);
    if (error) {
      toast.error(`Erreur suppression : ${error.message}`);
    } else {
      toast.success('🗑️ Annonce supprimée', { duration: 3000 });
      fetchItems();
    }
  };

  // ── Publier un message forum ──────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) {
      toast.error('Remplissez le titre et le contenu');
      return;
    }

    setSubmittingPost(true);

    // Récupère le catId (dernier recours : nouvelle requête)
    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('slug', 'collectionneurs')
        .maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }

    if (!catId) {
      toast.error('Catégorie forum introuvable — la migration SQL doit être exécutée dans Supabase.');
      setSubmittingPost(false);
      return;
    }

    const { error } = await supabase.from('forum_posts').insert({
      category_id: catId,
      author_id: profile.id,
      title: postForm.title.trim(),
      content: postForm.content.trim(),
    });

    if (error) {
      console.error('forum_posts insert error:', error);
      toast.error(`Erreur publication : ${error.message}`);
    } else {
      toast.success('🎉 Sujet publié dans le forum des collectionneurs !', { duration: 4000 });
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
        <div className="bg-red-50 border-b border-red-300 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">⚠️ Tables manquantes — publication impossible</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Les tables <code className="bg-red-100 px-1 rounded font-mono">collection_items</code> et <code className="bg-red-100 px-1 rounded font-mono">collection_categories</code> n&apos;existent pas encore dans Supabase.
                </p>
              </div>
            </div>
            <Link href="/admin/migration"
              className="flex-shrink-0 inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition-all">
              🗄️ Voir la migration SQL
            </Link>
          </div>
        </div>
      )}

      {/* ── BANNER erreur publication ── */}
      {submitError && (
        <div className="bg-red-600 px-4 py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <AlertCircle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-black text-base">❌ Publication impossible</p>
                  <p className="text-red-100 text-sm mt-1 leading-relaxed">{submitError}</p>
                </div>
              </div>
              <button onClick={() => setSubmitError(null)} className="text-red-200 hover:text-white p-1 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Boutons d'action */}
            <div className="flex flex-wrap items-center gap-3 mt-4 ml-9">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("NOTIFY pgrst, 'reload schema';").then(() => {
                    setCopiedNotify(true);
                    setTimeout(() => setCopiedNotify(false), 4000);
                  });
                }}
                className={`inline-flex items-center gap-2 font-black text-sm px-5 py-2.5 rounded-xl transition-all shadow ${
                  copiedNotify ? 'bg-emerald-500 text-white' : 'bg-orange-400 text-white hover:bg-orange-300'
                }`}
              >
                {copiedNotify ? '✅ Copié ! Collez dans Supabase SQL Editor' : '⚡ Copier NOTIFY pgrst (fix cache)'}
              </button>
              <a
                href="/admin/migration"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-red-700 font-black text-sm px-5 py-2.5 rounded-xl hover:bg-red-50 transition-all shadow"
              >
                🗄️ Page Migration SQL
              </a>
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
                Vendez, échangez, donnez ou recherchez des objets de collection. Rencontrez d&apos;autres passionnés du village.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                {[
                  { icon: Tag,            label: `${totalCount} annonce${totalCount !== 1 ? 's' : ''}` },
                  { icon: ArrowLeftRight, label: 'Troc & don' },
                  { icon: MessageSquare,  label: 'Forum entraide' },
                  { icon: Layers,         label: `${allCategories.length} catégories` },
                ].map(({ icon: I, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <I className="w-3.5 h-3.5" /> {label}
                  </span>
                ))}
              </div>
            </div>
            {profile && (
              <button
                onClick={() => { setActiveTab('annonces'); setShowForm(true); setSubmitError(null); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
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
        <div className="flex flex-wrap gap-2 mb-8 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
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

        {/* ══ TAB : ANNONCES ══ */}
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
              <button onClick={fetchItems} className="p-2.5 border border-gray-200 rounded-xl bg-white text-gray-400 hover:text-amber-600 hover:border-amber-300 transition-all" title="Actualiser">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Filtres catégorie */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setSelectedCat('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedCat === 'all' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'}`}>
                Tout ({items.length})
              </button>
              {allCategories.map(cat => {
                const cls = getCatClasses(cat.color);
                return (
                  <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      selectedCat === cat.id
                        ? `${cls.bg} ${cls.text} ${cls.border} shadow-sm`
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-200'
                    }`}>
                    <span>{cat.icon}</span>
                    <span className="max-w-[80px] truncate">{cat.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Formulaire de publication */}
            {showForm && profile && (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-amber-200 p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 text-lg">Publier une annonce</h3>
                  <button type="button" onClick={() => { setShowForm(false); setSubmitError(null); }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input type="text" placeholder="Titre de l'annonce *" required
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
                    <option value="">Choisir une catégorie *</option>
                    {allCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
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

                <textarea placeholder="Description : état, histoire de l'objet, conditions d'échange..." required
                  rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />

                <input type="text" placeholder="Tags (ex: timbres, france, rare) — séparés par virgule"
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
                  <button type="button" onClick={() => { setShowForm(false); setSubmitError(null); }}
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
                <p className="text-gray-500 font-semibold text-lg">
                  {search ? 'Aucun résultat pour cette recherche' : 'Aucune annonce pour l\'instant'}
                </p>
                {profile && !search && (
                  <button onClick={() => setShowForm(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-all">
                    <Plus className="w-4 h-4" /> Soyez le premier à publier !
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    currentUserId={profile?.id}
                    onEdit={openEdit}
                    onDelete={handleDeleteItem}
                  />
                ))}
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

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
              <BadgeCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 mb-1">💡 Conseil anti-arnaque</p>
                <p className="text-amber-700 text-sm leading-relaxed">
                  Privilégiez les échanges en main propre à Biguglia. Ne jamais envoyer d&apos;argent avant d&apos;avoir vu l&apos;objet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB : FORUM ══ */}
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
            ) : !forumCategoryId && !loadingForum ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="font-bold text-amber-800 mb-1">Forum temporairement indisponible</p>
                <p className="text-amber-700 text-sm mb-4">
                  La catégorie forum &quot;Collectionneurs&quot; n&apos;existe pas encore.<br />
                  Exécutez <code className="bg-amber-100 px-1 rounded font-mono text-xs">migration_themes.sql</code> dans Supabase.
                </p>
                {profile && (
                  <Link href="/forum/nouveau"
                    className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-600 transition-all">
                    <Plus className="w-4 h-4" /> Poster dans le forum général
                  </Link>
                )}
              </div>
            ) : forumPosts.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun sujet pour l&apos;instant</p>
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

        {/* ══ TAB : CATÉGORIES ══ */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Catégories de collection</h2>
                <p className="text-gray-500 text-sm mt-0.5">{allCategories.length} catégories disponibles</p>
              </div>
              {profile && (
                <button
                  onClick={() => setShowCatForm(!showCatForm)}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-all text-sm shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Nouvelle catégorie
                </button>
              )}
            </div>

            {/* ── Formulaire création catégorie ── */}
            {showCatForm && profile && (
              <form onSubmit={handleCreateCategory}
                className="bg-white rounded-2xl border-2 border-amber-200 p-6 mb-8 shadow-md">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Pencil className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-base">Créer une nouvelle catégorie</h3>
                  </div>
                  <button type="button" onClick={() => setShowCatForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Nom de la catégorie *</label>
                    <input
                      type="text"
                      placeholder="Ex : Capsules de champagne, BD anciennes…"
                      required
                      value={catForm.name}
                      onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Couleur du badge</label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {COLOR_OPTIONS.map(opt => {
                        const cls = getCatClasses(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.label}
                            onClick={() => setCatForm(f => ({ ...f, color: opt.value }))}
                            className={`w-8 h-8 rounded-lg border-2 transition-all ${cls.btn} ${
                              catForm.color === opt.value ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-bold text-gray-600 mb-2">Emoji représentatif</label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto bg-gray-50 rounded-xl p-2">
                    {EMOJI_CHOICES.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatForm(f => ({ ...f, icon: emoji }))}
                        className={`w-9 h-9 text-xl rounded-lg flex items-center justify-center transition-all ${
                          catForm.icon === emoji
                            ? 'bg-amber-200 border-2 border-amber-500 scale-110'
                            : 'bg-white border border-gray-200 hover:bg-amber-50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aperçu */}
                <div className="mb-5 p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-medium">Aperçu :</span>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold ${getCatClasses(catForm.color).bg} ${getCatClasses(catForm.color).text} ${getCatClasses(catForm.color).border}`}>
                    <span>{catForm.icon}</span>
                    <span>{catForm.name || 'Ma catégorie'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={submittingCat}
                    className="flex items-center gap-2 bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50 transition-all">
                    {submittingCat ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : <><Plus className="w-4 h-4" /> Créer la catégorie</>}
                  </button>
                  <button type="button" onClick={() => setShowCatForm(false)}
                    className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            {/* Grille des catégories */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allCategories.map(cat => {
                const cls = getCatClasses(cat.color);
                const isOwner = profile && cat.author_id === profile.id;
                const isStatic = cat.id.startsWith('static-');
                return (
                  <div key={cat.id}
                    className={`group relative ${cls.bg} ${cls.border} border-2 rounded-2xl p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${isStatic ? 'opacity-75' : ''}`}>
                    {/* Badge statique */}
                    {isStatic && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        exemple
                      </span>
                    )}
                    {/* Badge personnalisé */}
                    {cat.is_custom && !isStatic && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        perso
                      </span>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{cat.icon}</span>
                      {isOwner && !isStatic && (
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h3 className={`font-bold text-sm ${cls.text} leading-snug mb-1`}>{cat.name}</h3>

                    <button
                      onClick={() => { if (!isStatic) { setSelectedCat(cat.id); setActiveTab('annonces'); } }}
                      className={`mt-2 text-xs flex items-center gap-1 transition-colors ${isStatic ? 'text-gray-400 cursor-default' : `${cls.text} hover:underline cursor-pointer`}`}
                    >
                      {isStatic ? 'Migration SQL requise' : 'Voir les annonces'}
                      {!isStatic && <ChevronRight className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}

              {/* Card "Créer" */}
              {profile && (
                <button
                  onClick={() => setShowCatForm(true)}
                  className="border-2 border-dashed border-amber-300 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:border-amber-500 hover:bg-amber-50 transition-all duration-300 group min-h-[120px]"
                >
                  <div className="w-10 h-10 bg-amber-100 group-hover:bg-amber-200 rounded-xl flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-bold text-amber-600">Nouvelle catégorie</span>
                  <span className="text-xs text-amber-500">Créez votre propre thème</span>
                </button>
              )}
            </div>

            {!profile && (
              <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-amber-800">Vous avez une collection unique ?</p>
                  <p className="text-amber-600 text-sm">Connectez-vous pour créer votre propre catégorie et publier des annonces.</p>
                </div>
                <Link href="/connexion"
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-amber-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Modale édition annonce ── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-gray-900">Modifier l&apos;annonce</h2>
                <p className="text-gray-400 text-xs mt-0.5">Les modifications sont immédiates</p>
              </div>
              <button onClick={() => setEditItem(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleUpdateItem} className="px-6 py-5 space-y-4">

              {/* Titre */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  maxLength={100}
                  required
                />
              </div>

              {/* Type + Condition */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                  <select
                    value={editForm.item_type}
                    onChange={e => setEditForm(f => ({ ...f, item_type: e.target.value as CollectionItem['item_type'] }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">État</label>
                  <select
                    value={editForm.condition}
                    onChange={e => setEditForm(f => ({ ...f, condition: e.target.value as CollectionItem['condition'] }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    {Object.entries(CONDITION_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prix (si vente) */}
              {editForm.item_type === 'vente' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Prix (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description *</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  required
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Tags <span className="text-gray-400 font-normal">(séparés par des virgules)</span>
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="ex: rare, vintage, 1950"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition-all disabled:opacity-60"
                >
                  {savingEdit
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</>
                    : <><Pencil className="w-4 h-4" /> Enregistrer</>}
                </button>
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-5 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
