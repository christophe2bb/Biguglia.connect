'use client';

/**
 * Collectionneurs — Module Premium v2.0
 * Marketplace spécialisée : vente, échange, don, recherche
 * UX haut de gamme, confiance, filtres avancés, galerie immersive
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative, cn } from '@/lib/utils';
import {
  Search, Plus, Eye, Heart, HeartOff, MessageSquare, ArrowLeftRight,
  Package, Gift, Gem, Star, MapPin, Truck, Users, Filter, X,
  SlidersHorizontal, TrendingUp, Clock, CheckCircle2, Shield,
  BadgeCheck, Sparkles, ChevronDown, ChevronUp, Loader2,
  Zap, Tag, Camera, Bell, LayoutGrid, List, RefreshCw,
  AlertTriangle, Share2, Bookmark, Layers, Pencil, Trash2, AlertCircle, Send
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import ContactButton from '@/components/ui/ContactButton';
import { PhotoViewer, toPhotoItems } from '@/components/ui/PhotoViewer';
import {
  MODE_CONFIG, STATUS_CONFIG, RARITY_CONFIG, CONDITION_CONFIG,
  type CollectionMode, type CollectionStatus, type RarityLevel, type ConditionLevel,
  type CollectionCategory, type CollectionItem,
} from '@/lib/collectionneurs-config';

// ─── Catégories statiques ─────────────────────────────────────────────────────

const STATIC_CATEGORIES: CollectionCategory[] = [
  { id: 'cat-1',  name: 'Timbres & philatélie',    slug: 'timbres',      icon: '📮', color: 'blue',    display_order: 1 },
  { id: 'cat-2',  name: 'Monnaies & numismatique',  slug: 'monnaies',     icon: '🪙', color: 'amber',   display_order: 2 },
  { id: 'cat-3',  name: 'Vinyles & musique',        slug: 'vinyles',      icon: '🎵', color: 'purple',  display_order: 3 },
  { id: 'cat-4',  name: 'Livres anciens',           slug: 'livres',       icon: '📚', color: 'emerald', display_order: 4 },
  { id: 'cat-5',  name: 'Figurines & jouets',       slug: 'figurines',    icon: '🧸', color: 'rose',    display_order: 5 },
  { id: 'cat-6',  name: 'Cartes & TCG',             slug: 'cards',        icon: '🃏', color: 'red',     display_order: 6 },
  { id: 'cat-7',  name: 'Art & tableaux',           slug: 'art',          icon: '🎨', color: 'pink',    display_order: 7 },
  { id: 'cat-8',  name: 'Vintage & mode',           slug: 'vintage',      icon: '👗', color: 'orange',  display_order: 8 },
  { id: 'cat-9',  name: 'Miniatures & maquettes',   slug: 'miniatures',   icon: '🏗️', color: 'indigo',  display_order: 9 },
  { id: 'cat-10', name: 'Automobilia',              slug: 'automobilia',  icon: '🚗', color: 'red',     display_order: 10 },
  { id: 'cat-11', name: 'BD & Mangas',              slug: 'bd-manga',     icon: '📖', color: 'indigo',  display_order: 11 },
  { id: 'cat-12', name: 'Jeux vidéo rétro',         slug: 'retro-gaming', icon: '🕹️', color: 'violet',  display_order: 12 },
  { id: 'cat-13', name: 'Montres & horlogerie',     slug: 'montres',      icon: '⌚', color: 'gray',    display_order: 13 },
  { id: 'cat-14', name: 'Militaria',                slug: 'militaria',    icon: '🎖️', color: 'stone',   display_order: 14 },
  { id: 'cat-15', name: 'Minéraux & fossiles',      slug: 'mineraux',     icon: '🪨', color: 'teal',    display_order: 15 },
  { id: 'cat-16', name: 'Autres',                   slug: 'autres',       icon: '📦', color: 'gray',    display_order: 99 },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'   },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'  },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200'},
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200'   },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'    },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200'   },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'   },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200'   },
  stone:   { bg: 'bg-stone-50',   text: 'text-stone-700',   border: 'border-stone-200'  },
};

function getCatClasses(color: string) {
  return COLOR_MAP[color] || COLOR_MAP.gray;
}

// ─── ItemCard Premium ─────────────────────────────────────────────────────────

function ItemCard({
  item,
  currentUserId,
  onFavoriteToggle,
  viewMode = 'grid',
}: {
  item: CollectionItem;
  currentUserId?: string;
  onFavoriteToggle: (itemId: string, isFav: boolean) => void;
  viewMode?: 'grid' | 'list';
}) {
  const modeCfg   = MODE_CONFIG[item.mode || (item.item_type === 'troc' ? 'echange' : (item.item_type as CollectionMode)) || 'vente'];
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.actif;
  const rarityCfg = item.rarity_level ? RARITY_CONFIG[item.rarity_level] : null;
  const condCfg   = CONDITION_CONFIG[item.condition];
  const catClasses = item.category ? getCatClasses(item.category.color) : COLOR_MAP.gray;

  const getPhotoUrl = (p: NonNullable<CollectionItem['photos']>[number]) => p.url || p.image_url || p.preview || '';
  const coverPhoto = item.photos?.find(p => p.is_cover && getPhotoUrl(p)) || item.photos?.find(p => getPhotoUrl(p));
  const coverUrl   = coverPhoto ? getPhotoUrl(coverPhoto) : '';
  const photoCount = item.photos?.filter(p => getPhotoUrl(p)).length || 0;
  const allPhotos  = toPhotoItems((item.photos ?? []).map((p, i) => ({ url: getPhotoUrl(p), display_order: p.sort_order ?? i })).filter(p => p.url));

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx,  setLightboxIdx]  = useState(0);
  const [favLoading, setFavLoading]     = useState(false);

  const isOwner   = currentUserId === item.author_id;
  const isClosed  = statusCfg.closed;
  const ModeIcon  = modeCfg.icon;

  const handleFav = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!currentUserId) { toast.error('Connectez-vous pour ajouter aux favoris'); return; }
    setFavLoading(true);
    try { onFavoriteToggle(item.id, !!item.isFavorited); }
    finally { setFavLoading(false); }
  };

  if (viewMode === 'list') {
    return (
      <div className={cn(
        'bg-white rounded-2xl border border-gray-100 overflow-hidden',
        'hover:shadow-md hover:border-gray-200 transition-all duration-200',
        isClosed && 'opacity-70'
      )}>
        <div className="flex gap-4 p-3">
          {/* Photo */}
          <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
               onClick={() => { if (coverPhoto) { setLightboxIdx(0); setLightboxOpen(true); } }}>
            {coverUrl ? (
              <img src={coverUrl} alt={item.title}
                   className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {item.category?.icon || '📦'}
              </div>
            )}
            {isClosed && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full bg-black/50">
                  {statusCfg.label}
                </span>
              </div>
            )}
          </div>
          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border', modeCfg.bg, modeCfg.color, modeCfg.border)}>
                    <ModeIcon className="w-3 h-3" />{modeCfg.label}
                  </span>
                  {item.is_featured && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white">
                      <Sparkles className="w-3 h-3" /> À la une
                    </span>
                  )}
                  {rarityCfg && item.rarity_level !== 'commun' && (
                    <span className={cn('text-xs font-semibold', rarityCfg.color)}>
                      {rarityCfg.icon} {rarityCfg.label}
                    </span>
                  )}
                </div>
                <Link href={`/collectionneurs/${item.id}`}>
                  <h3 className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 mb-0.5">
                    {item.title}
                  </h3>
                </Link>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className={condCfg.color}>{condCfg.label}</span>
                  {item.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.city}</span>}
                  {item.shipping_available && <span className="flex items-center gap-0.5 text-blue-500"><Truck className="w-3 h-3" />Expédition</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {item.mode === 'vente' && item.price != null ? (
                  <div className="text-lg font-black text-gray-900">
                    {item.price === 0 ? 'Gratuit' : `${item.price.toLocaleString('fr-FR')} €`}
                  </div>
                ) : item.mode === 'don' ? (
                  <div className="text-sm font-bold text-emerald-600">Don gratuit ❤️</div>
                ) : item.mode === 'echange' ? (
                  <div className="text-sm font-bold text-amber-600">Échange</div>
                ) : (
                  <div className="text-sm font-bold text-purple-600">Recherche</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {lightboxOpen && allPhotos.length > 0 && (
          <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
        )}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-gray-100 overflow-hidden group',
      'hover:shadow-lg hover:shadow-gray-100/80 hover:border-gray-200 transition-all duration-200',
      isClosed && 'opacity-75',
      item.is_featured && 'ring-2 ring-amber-300/50 shadow-amber-50'
    )}>
      {/* Photo principale */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden cursor-pointer"
           onClick={() => { if (coverPhoto) { setLightboxIdx(0); setLightboxOpen(true); } }}>
        {coverUrl ? (
          <>
            <img src={coverUrl} alt={item.title}
                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                 loading="lazy" />
            {photoCount > 1 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                <Camera className="w-3 h-3" /> {photoCount}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
            <span className="text-4xl">{item.category?.icon || '📦'}</span>
            <span className="text-xs text-gray-400">Aucune photo</span>
          </div>
        )}

        {/* Badge featured */}
        {item.is_featured && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">
              <Sparkles className="w-3 h-3" /> À la une
            </span>
          </div>
        )}

        {/* Overlay clôturé */}
        {isClosed && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className={cn('px-3 py-1.5 rounded-xl text-sm font-black text-white shadow-lg', 'bg-black/70')}>
              {statusCfg.label}
            </div>
          </div>
        )}

        {/* Bouton favoris */}
        {!isOwner && (
          <button
            onClick={handleFav}
            disabled={favLoading}
            className={cn(
              'absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center',
              'transition-all duration-200 shadow-sm',
              item.isFavorited
                ? 'bg-red-500 text-white scale-110'
                : 'bg-white/90 text-gray-400 hover:bg-white hover:text-red-500 hover:scale-110'
            )}
          >
            {favLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
              item.isFavorited ? <Heart className="w-4 h-4 fill-current" /> : <Heart className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Contenu */}
      <div className="p-3">
        {/* Badges ligne 1 */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border', modeCfg.bg, modeCfg.color, modeCfg.border)}>
            <ModeIcon className="w-3 h-3" />{modeCfg.label}
          </span>
          {!isClosed && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusCfg.bg, statusCfg.color)}>
              {statusCfg.label}
            </span>
          )}
          {rarityCfg && item.rarity_level !== 'commun' && (
            <span className={cn('text-xs font-semibold', rarityCfg.color)}>
              {rarityCfg.icon}
            </span>
          )}
        </div>

        {/* Titre */}
        <Link href={`/collectionneurs/${item.id}`}>
          <h3 className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-1 leading-snug">
            {item.title}
          </h3>
        </Link>

        {/* Catégorie & état */}
        {item.category && (
          <div className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2', catClasses.bg, catClasses.text)}>
            {item.category.icon} {item.category.name}
          </div>
        )}

        {/* Prix / mode */}
        <div className="mb-2">
          {item.mode === 'vente' && item.price != null ? (
            <div className="text-xl font-black text-gray-900">
              {item.price === 0 ? <span className="text-emerald-600">Gratuit</span> : `${item.price.toLocaleString('fr-FR')} €`}
            </div>
          ) : item.mode === 'don' ? (
            <div className="text-base font-bold text-emerald-600">Don gratuit ❤️</div>
          ) : item.mode === 'echange' ? (
            <div className="text-sm font-bold text-amber-700 flex items-center gap-1">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {item.exchange_expected ? `Contre : ${item.exchange_expected}` : 'Échange à discuter'}
            </div>
          ) : (
            <div className="text-sm font-bold text-purple-700 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> Recherche
            </div>
          )}
        </div>

        {/* Infos locales */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <div className="flex items-center gap-2">
            {item.city && (
              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.city}</span>
            )}
            {item.shipping_available && (
              <span className="flex items-center gap-0.5 text-blue-500"><Truck className="w-3 h-3" />Envoi</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(item.views_count || 0) > 0 && (
              <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{item.views_count}</span>
            )}
            {(item.favorites_count || 0) > 0 && (
              <span className="flex items-center gap-0.5 text-red-400"><Heart className="w-3 h-3" />{item.favorites_count}</span>
            )}
          </div>
        </div>

        {/* Date publication */}
        <div className="flex justify-end">
          <span className="text-xs text-gray-400">{formatRelative(item.published_at || item.created_at)}</span>
        </div>

        {/* CTA — Voir l'annonce + Message privé */}
        {!isClosed && !isOwner && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2">
            <Link href={`/collectionneurs/${item.id}`}
                  className={cn('flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all', modeCfg.bg, modeCfg.color, 'hover:opacity-80')}>
              <MessageSquare className="w-3.5 h-3.5" />
              {modeCfg.cta}
            </Link>
            <ContactButton
              sourceType="collection_item"
              sourceId={item.id}
              sourceTitle={item.title}
              ownerId={item.author_id}
              userId={currentUserId}
              size="sm"
              ctaLabel="Contacter"
              prefillMsg={`👋 Bonjour, je suis intéressé(e) par votre annonce "${item.title}".`}
            />
          </div>
        )}
        {isOwner && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2">
            <Link href={`/collectionneurs/${item.id}/modifier`}
                  className="flex-1 text-center text-xs text-gray-500 hover:text-gray-700 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              Modifier
            </Link>
            <Link href={`/dashboard/collectionneurs`}
                  className="flex-1 text-center text-xs text-blue-600 hover:text-blue-700 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
              Dashboard
            </Link>
          </div>
        )}

        {/* Mini-fiche auteur au survol (profil vendeur) */}
        <div className="mt-2 pt-2 border-t border-gray-50">
          <Link href={`/profil/${item.author_id}`}
                className="flex items-center gap-2 group/author hover:bg-amber-50 rounded-xl px-2 py-1.5 transition-colors -mx-1">
            <Avatar src={item.author?.avatar_url} name={item.author?.full_name || '?'} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 group-hover/author:text-amber-700 truncate transition-colors">
                {item.author?.full_name || 'Membre'}
              </p>
              <p className="text-xs text-gray-400 truncate">Voir le profil →</p>
            </div>
          </Link>
        </div>
      </div>

      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

// ─── Type Forum ───────────────────────────────────────────────────────────────

type ForumPost = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  author?: { full_name: string; avatar_url?: string } | null;
  comment_count?: { count: number }[];
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CollectionneursPage() {
  const { profile } = useAuthStore();
  const router      = useRouter();
  const supabase    = createClient();

  // Onglets
  const [activeTab, setActiveTab] = useState<'annonces' | 'forum'>('annonces');

  // État principal
  const [items,      setItems]      = useState<CollectionItem[]>([]);
  const [categories, setCategories] = useState<CollectionCategory[]>(STATIC_CATEGORIES);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [viewMode,   setViewMode]   = useState<'grid' | 'list'>('grid');

  // Filtres
  const [search,         setSearch]         = useState('');
  const [selectedCat,    setSelectedCat]    = useState('all');
  const [selectedMode,   setSelectedMode]   = useState<CollectionMode | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'actif' | 'reserve'>('actif');
  const [selectedCond,   setSelectedCond]   = useState<ConditionLevel | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<RarityLevel | 'all'>('all');
  const [shippingOnly,   setShippingOnly]   = useState(false);
  const [localOnly,      setLocalOnly]      = useState(false);
  const [priceMin,       setPriceMin]       = useState('');
  const [priceMax,       setPriceMax]       = useState('');
  const [sortBy,         setSortBy]         = useState<'recent' | 'price_asc' | 'price_desc' | 'views' | 'featured'>('featured');
  const [showFilters,    setShowFilters]    = useState(false);
  const [page,           setPage]           = useState(0);
  const PAGE_SIZE = 24;

  // Favoris
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Forum
  const [forumPosts,       setForumPosts]       = useState<ForumPost[]>([]);
  const [forumCategoryId,  setForumCategoryId]  = useState<string | null>(null);
  const [loadingForum,     setLoadingForum]     = useState(false);
  const [showPostForm,     setShowPostForm]     = useState(false);
  const [postForm,         setPostForm]         = useState({ title: '', content: '' });
  const [submittingPost,   setSubmittingPost]   = useState(false);
  const [editPost,         setEditPost]         = useState<ForumPost | null>(null);
  const [editPostForm,     setEditPostForm]     = useState({ title: '', content: '' });
  const [savingPost,       setSavingPost]       = useState(false);

  // ── Fetch catégories ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await supabase.from('collection_categories').select('*').order('display_order');
        if (data && data.length > 0) setCategories(data as CollectionCategory[]);
      } catch { /* use static */ }
    };
    fetchCats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch favoris utilisateur ───────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    const fetchFavs = async () => {
      try {
        const { data } = await supabase
          .from('collection_favorites').select('item_id').eq('user_id', profile.id);
        setFavorites(new Set((data || []).map((f: { item_id: string }) => f.item_id)));
      } catch { /* table might not exist yet */ }
    };
    fetchFavs();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch items ─────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('collection_items')
        .select(`
          id, title, description, category_id, mode, item_type, status, price,
          exchange_expected, condition, rarity_level, year_period, brand, series_name,
          authenticity_declared, shipping_available, local_meetup_available, city,
          tags, author_id, views_count, favorites_count, messages_count, is_featured,
          published_at, created_at, updated_at,
          author:profiles!collection_items_author_id_fkey(id, full_name, avatar_url, created_at),
          category:collection_categories(id, name, slug, icon, color),
          photos:collection_item_photos(url, is_cover, sort_order)
        `, { count: 'estimated' });

      // Filtres statut
      if (selectedStatus === 'actif') {
        query = query.eq('status', 'actif');
      } else if (selectedStatus === 'reserve') {
        query = query.in('status', ['actif', 'reserve']);
      } else {
        query = query.in('status', ['actif', 'reserve', 'vendu', 'echange', 'donne', 'trouve']);
      }

      // Filtre mode
      if (selectedMode !== 'all') query = query.eq('mode', selectedMode);

      // Filtre catégorie
      if (selectedCat !== 'all') query = query.eq('category_id', selectedCat);

      // Filtre état
      if (selectedCond !== 'all') query = query.eq('condition', selectedCond);

      // Filtre rareté
      if (selectedRarity !== 'all') query = query.eq('rarity_level', selectedRarity);

      // Filtres transaction
      if (shippingOnly) query = query.eq('shipping_available', true);
      if (localOnly)    query = query.eq('local_meetup_available', true);

      // Prix
      if (priceMin) query = query.gte('price', parseFloat(priceMin));
      if (priceMax) query = query.lte('price', parseFloat(priceMax));

      // Recherche texte
      if (search.trim()) {
        query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,brand.ilike.%${search.trim()}%,series_name.ilike.%${search.trim()}%`);
      }

      // Tri
      switch (sortBy) {
        case 'recent':     query = query.order('published_at', { ascending: false }); break;
        case 'price_asc':  query = query.order('price', { ascending: true, nullsFirst: false }); break;
        case 'price_desc': query = query.order('price', { ascending: false, nullsFirst: false }); break;
        case 'views':      query = query.order('views_count', { ascending: false }); break;
        case 'featured':
          query = query.order('is_featured', { ascending: false }).order('published_at', { ascending: false }); break;
      }

      // Pagination
      const from = reset ? 0 : page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) {
        // Fallback: table sans les colonnes v2 — applique tous les filtres disponibles
        let fbQuery = supabase
          .from('collection_items')
          .select(`
            id, title, description, category_id, item_type, condition, price, tags,
            author_id, views, created_at,
            author:profiles!collection_items_author_id_fkey(id, full_name, avatar_url),
            category:collection_categories(id, name, slug, icon, color),
            photos:collection_item_photos(url, is_cover, sort_order)
          `);

        // Filtre statut de base
        if (selectedStatus === 'actif') {
          fbQuery = fbQuery.in('status', ['active','actif']);
        }

        // Filtre catégorie
        if (selectedCat !== 'all') fbQuery = fbQuery.eq('category_id', selectedCat);

        // Filtre mode → item_type
        if (selectedMode !== 'all') {
          const ftypes = selectedMode === 'echange' ? ['troc', 'echange'] : [selectedMode];
          fbQuery = fbQuery.in('item_type', ftypes);
        }

        // Filtre état
        if (selectedCond !== 'all') fbQuery = fbQuery.eq('condition', selectedCond);

        // Recherche texte
        if (search.trim()) {
          fbQuery = fbQuery.or(
            `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
          );
        }

        const { data: fallback } = await fbQuery
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        const mapped: CollectionItem[] = (fallback || []).map((d: Record<string, unknown>) => ({
          ...(d as unknown as CollectionItem),
          mode: (d.item_type === 'troc' ? 'echange' : d.item_type) as CollectionMode || 'vente',
          status: 'actif' as CollectionStatus,
          isFavorited: favorites.has(d.id as string),
        }));
        if (reset || page === 0) setItems(mapped);
        else setItems(prev => [...prev, ...mapped]);
        setTotal(mapped.length);
        return;
      }

      const mapped: CollectionItem[] = (data || []).map((d: Record<string, unknown>) => ({
        ...(d as unknown as CollectionItem),
        mode: ((d.mode || (d.item_type === 'troc' ? 'echange' : d.item_type)) as CollectionMode) || 'vente',
        isFavorited: favorites.has(d.id as string),
      }));

      if (reset || page === 0) setItems(mapped);
      else setItems(prev => [...prev, ...mapped]);
      setTotal(count || mapped.length);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedMode, selectedCat, selectedCond, selectedRarity, shippingOnly, localOnly, priceMin, priceMax, search, sortBy, page, favorites]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setItems([]);  // Clear items immediately when filter changes to avoid stale display
    setPage(0);
    fetchItems(true);
  }, [selectedStatus, selectedMode, selectedCat, selectedCond, selectedRarity, shippingOnly, localOnly, priceMin, priceMax, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setItems([]); setPage(0); fetchItems(true); }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle favori ────────────────────────────────────────────────────────────
  const handleFavoriteToggle = async (itemId: string, isFav: boolean) => {
    if (!profile?.id) { router.push('/connexion?redirect=/collectionneurs'); return; }
    const newFavs = new Set(favorites);
    try {
      if (isFav) {
        await supabase.from('collection_favorites').delete().eq('user_id', profile.id).eq('item_id', itemId);
        newFavs.delete(itemId);
        toast.success('Retiré des favoris');
      } else {
        await supabase.from('collection_favorites').insert({ user_id: profile.id, item_id: itemId });
        newFavs.add(itemId);
        toast.success('Ajouté aux favoris ❤️');
      }
      setFavorites(newFavs);
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, isFavorited: !isFav, favorites_count: (it.favorites_count || 0) + (isFav ? -1 : 1) } : it));
    } catch { toast.error('Erreur lors de la mise à jour'); }
  };

  // ── Nombre de filtres actifs ─────────────────────────────────────────────────
  const activeFiltersCount = [
    selectedMode !== 'all', selectedCond !== 'all', selectedRarity !== 'all',
    shippingOnly, localOnly, priceMin !== '', priceMax !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedMode('all'); setSelectedCond('all'); setSelectedRarity('all');
    setShippingOnly(false); setLocalOnly(false); setPriceMin(''); setPriceMax('');
    setSearch(''); setSelectedCat('all'); setSelectedStatus('actif');
  };

  // ── Fetch forum ──────────────────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    try {
      const { data: catData } = await supabase
        .from('forum_categories').select('id').eq('slug', 'collectionneurs').maybeSingle();
      const catId = catData?.id ?? null;
      setForumCategoryId(catId);
      if (!catId) { setLoadingForum(false); return; }
      const { data } = await supabase
        .from('forum_posts')
        .select(`*, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)`)
        .eq('category_id', catId)
        .order('created_at', { ascending: false })
        .limit(30);
      setForumPosts((data as unknown as ForumPost[]) || []);
    } catch (err) { console.error('fetchForum error:', err); }
    setLoadingForum(false);
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);

  // ── Publier un sujet forum ───────────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) { toast.error('Remplissez le titre et le contenu'); return; }
    setSubmittingPost(true);
    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase.from('forum_categories').select('id').eq('slug', 'collectionneurs').maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) {
      toast.error('Catégorie forum introuvable — la migration SQL doit être exécutée dans Supabase.');
      setSubmittingPost(false); return;
    }
    const { error } = await supabase.from('forum_posts').insert({
      category_id: catId, author_id: profile.id,
      title: postForm.title.trim(), content: postForm.content.trim(),
    });
    if (error) { toast.error(`Erreur publication : ${error.message}`); }
    else { toast.success('🎉 Sujet publié !', { duration: 4000 }); setPostForm({ title: '', content: '' }); setShowPostForm(false); fetchForum(); }
    setSubmittingPost(false);
  };

  // ── Modifier un sujet forum ──────────────────────────────────────────────────
  const openEditPost = (post: ForumPost) => { setEditPost(post); setEditPostForm({ title: post.title, content: post.content }); };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPost || !profile) return;
    if (!editPostForm.title.trim() || !editPostForm.content.trim()) { toast.error('Titre et contenu obligatoires'); return; }
    setSavingPost(true);
    const { error } = await supabase.from('forum_posts')
      .update({ title: editPostForm.title.trim(), content: editPostForm.content.trim() })
      .eq('id', editPost.id).eq('author_id', profile.id);
    if (error) { toast.error(`Erreur : ${error.message}`); }
    else { toast.success('✅ Sujet modifié !', { duration: 3000 }); setEditPost(null); fetchForum(); }
    setSavingPost(false);
  };

  // ── Supprimer un sujet forum ─────────────────────────────────────────────────
  const handleDeletePost = async (post: ForumPost) => {
    if (!profile || profile.id !== post.author_id) return;
    if (!confirm(`Supprimer le sujet "${post.title}" ? Action irréversible.`)) return;
    const { error } = await supabase.from('forum_posts').delete().eq('id', post.id).eq('author_id', profile.id);
    if (error) { toast.error(`Erreur suppression : ${error.message}`); }
    else { toast.success('🗑️ Sujet supprimé', { duration: 3000 }); fetchForum(); }
  };

  // ── Items enrichis avec favoris ──────────────────────────────────────────────
  const enrichedItems = items.map(it => ({ ...it, isFavorited: favorites.has(it.id) }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Gem className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold text-white/80 uppercase tracking-wider">Collectionneurs</span>
              </div>
              <h1 className="text-3xl font-black mb-2">Objets de collection</h1>
              <p className="text-white/80 text-sm max-w-md leading-relaxed">
                Vendez, échangez, donnez ou recherchez des pièces rares. Plateforme spécialisée pour passionnés sérieux.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-white/90">
                  <Shield className="w-4 h-4" />
                  <span>Membres vérifiés</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-white/90">
                  <BadgeCheck className="w-4 h-4" />
                  <span>Avis certifiés</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-white/90">
                  <Star className="w-4 h-4" />
                  <span>{total > 0 ? `${total} objets` : 'Soyez le premier'}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link href="/collectionneurs/nouveau"
                    className="flex items-center gap-2 bg-white text-orange-600 font-bold px-5 py-3 rounded-2xl hover:bg-orange-50 transition-colors shadow-lg text-sm">
                <Plus className="w-4 h-4" />
                Déposer une annonce
              </Link>
              {profile && (
                <Link href="/dashboard/collectionneurs"
                      className="flex items-center gap-2 bg-white/20 text-white font-semibold px-5 py-2.5 rounded-2xl hover:bg-white/30 transition-colors text-sm">
                  <LayoutGrid className="w-4 h-4" />
                  Mes annonces
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Onglets Annonces / Forum ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-1">
            {([
              { id: 'annonces', label: 'Annonces & troc', icon: Tag },
              { id: 'forum',    label: 'Forum communauté', icon: MessageSquare },
            ] as { id: 'annonces' | 'forum'; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all',
                  activeTab === id
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                )}
              >
                <Icon className="w-4 h-4" /> {label}
                {id === 'forum' && forumPosts.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{forumPosts.length}</span>
                )}
              </button>
            ))}
            {/* Lien direct vers la page Communauté avec les fiches membres */}
            <Link href="/communaute/collectionneurs"
                  className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 border-transparent text-amber-600 hover:text-amber-800 hover:border-amber-300 transition-all ml-auto">
              <Users className="w-4 h-4" /> Membres
            </Link>
          </div>
        </div>
      </div>

      {/* ══ TAB FORUM ═════════════════════════════════════════════════════ */}
      {activeTab === 'forum' && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Forum des collectionneurs</h2>
              {profile && (
                <button onClick={() => setShowPostForm(!showPostForm)}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-all text-sm">
                  <Plus className="w-4 h-4" /> Nouveau sujet
                </button>
              )}
            </div>

            {/* Formulaire nouveau sujet */}
            {showPostForm && profile && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-amber-200 p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">Nouveau sujet</h3>
                  <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <input type="text" placeholder="Titre du sujet..." required
                  value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                <textarea placeholder="Votre question, conseil, ou annonce de bourse..." required
                  rows={4} value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                <div className="flex gap-2">
                  <button type="submit" disabled={submittingPost}
                    className="flex items-center gap-2 bg-amber-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-50 transition-all">
                    {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication...</> : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowPostForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            {/* Formulaire édition */}
            {editPost && profile && (
              <form onSubmit={handleUpdatePost} className="bg-white rounded-2xl border border-blue-200 p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">Modifier le sujet</h3>
                  <button type="button" onClick={() => setEditPost(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <input type="text" placeholder="Titre du sujet..." required
                  value={editPostForm.title} onChange={e => setEditPostForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <textarea placeholder="Contenu..." required rows={4}
                  value={editPostForm.content} onChange={e => setEditPostForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <div className="flex gap-2">
                  <button type="submit" disabled={savingPost}
                    className="flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-all">
                    {savingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sauvegarde...</> : 'Sauvegarder'}
                  </button>
                  <button type="button" onClick={() => setEditPost(null)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
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
                  <button onClick={() => setShowPostForm(true)} className="mt-4 text-amber-600 font-semibold text-sm hover:underline">
                    Soyez le premier à poster !
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {forumPosts.map(post => {
                  const isPostOwner = profile?.id === post.author_id;
                  return (
                    <div key={post.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-amber-200 hover:shadow-sm transition-all group">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <Link href={`/forum/${post.id}`} className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm hover:text-amber-700 transition-colors leading-snug">{post.title}</h3>
                        </Link>
                        {isPostOwner && (
                          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditPost(post)} title="Modifier"
                              className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 transition-all">
                              <Pencil className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button onClick={() => handleDeletePost(post)} title="Supprimer"
                              className="p-1.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-all">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                      <Link href={`/forum/${post.id}`} className="block">
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
                    </div>
                  );
                })}
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
        </div>
      )}

      {/* ══ TAB ANNONCES ══════════════════════════════════════════════════ */}
      {activeTab === 'annonces' && (
      <>

      {/* ── Modes rapides ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {/* Tous */}
            <button
              onClick={() => setSelectedMode('all')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0',
                selectedMode === 'all'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Tout
            </button>
            {(Object.entries(MODE_CONFIG) as [CollectionMode, typeof MODE_CONFIG.vente][]).map(([mode, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(selectedMode === mode ? 'all' : mode)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
                    selectedMode === mode
                      ? cn(cfg.bg, cfg.color, cfg.border, 'shadow-sm')
                      : 'text-gray-600 hover:bg-gray-50 border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {cfg.label}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {/* Vue grid/list */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setViewMode('grid')}
                        className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600')}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')}
                        className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600')}>
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border',
                  showFilters || activeFiltersCount > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtres avancés ─────────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Statut */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Statut</label>
                <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as typeof selectedStatus)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="actif">Disponible</option>
                  <option value="reserve">+ Réservés</option>
                  <option value="all">Tout (historique)</option>
                </select>
              </div>

              {/* État */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">État</label>
                <select value={selectedCond} onChange={e => setSelectedCond(e.target.value as ConditionLevel | 'all')}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">Tous états</option>
                  {(Object.entries(CONDITION_CONFIG) as [ConditionLevel, { label: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Rareté */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Rareté</label>
                <select value={selectedRarity} onChange={e => setSelectedRarity(e.target.value as RarityLevel | 'all')}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">Toute rareté</option>
                  {(Object.entries(RARITY_CONFIG) as [RarityLevel, { label: string; icon: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>

              {/* Prix min */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Prix min (€)</label>
                <input type="number" placeholder="0" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                       className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Prix max */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Prix max (€)</label>
                <input type="number" placeholder="∞" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                       className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Tri */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Trier par</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="featured">⭐ En vedette d'abord</option>
                  <option value="recent">🕐 Plus récents</option>
                  <option value="price_asc">💰 Prix croissant</option>
                  <option value="price_desc">💰 Prix décroissant</option>
                  <option value="views">👁️ Plus consultés</option>
                </select>
              </div>
            </div>

            {/* Options transac */}
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={shippingOnly} onChange={e => setShippingOnly(e.target.checked)}
                       className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-gray-700 flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-blue-500" /> Expédition possible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={localOnly} onChange={e => setLocalOnly(e.target.checked)}
                       className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-gray-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> Remise en main propre</span>
              </label>
              {activeFiltersCount > 0 && (
                <button onClick={resetFilters}
                        className="ml-auto flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-semibold">
                  <X className="w-4 h-4" /> Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* ── Sidebar catégories ─────────────────────────────────────────── */}
          <div className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-20">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Catégories</h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedCat('all')}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left',
                    selectedCat === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <span>🏆</span>
                  <span className="flex-1">Toutes catégories</span>
                  <span className="text-xs opacity-60">{total}</span>
                </button>
                {categories.map(cat => {
                  const cls = getCatClasses(cat.color);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCat(selectedCat === cat.id ? 'all' : cat.id)}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left',
                        selectedCat === cat.id ? cn(cls.bg, cls.text) : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <span>{cat.icon}</span>
                      <span className="flex-1 truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Contenu principal ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Barre de recherche + stats */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un objet, une marque, une série..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `${total} annonce${total > 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Catégories mobile scroll */}
            <div className="lg:hidden mb-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2">
                <button onClick={() => setSelectedCat('all')}
                        className={cn('flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border', selectedCat === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200')}>
                  🏆 Tout
                </button>
                {categories.slice(0, 12).map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCat(selectedCat === cat.id ? 'all' : cat.id)}
                          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border', selectedCat === cat.id ? cn(getCatClasses(cat.color).bg, getCatClasses(cat.color).text, getCatClasses(cat.color).border) : 'bg-white text-gray-600 border-gray-200')}>
                    {cat.icon} {cat.name.split('&')[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            {/* Annonces en vedette */}
            {enrichedItems.some(i => i.is_featured) && selectedMode === 'all' && selectedCat === 'all' && !search && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide">En vedette</h2>
                </div>
                <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1')}>
                  {enrichedItems.filter(i => i.is_featured).slice(0, 3).map(item => (
                    <ItemCard key={item.id} item={item} currentUserId={profile?.id} onFavoriteToggle={handleFavoriteToggle} viewMode={viewMode} />
                  ))}
                </div>
                <div className="my-6 border-t border-gray-100" />
              </div>
            )}

            {/* Grille principale */}
            {loading && items.length === 0 ? (
              <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                      <div className="h-4 bg-gray-100 rounded" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loading && items.length > 0 ? (
              /* Refresh en cours : skeleton overlay léger */
              <div className="relative">
                <div className="absolute inset-0 bg-white/60 z-10 flex items-start justify-center pt-20 rounded-2xl">
                  <div className="flex items-center gap-2 bg-white shadow-lg rounded-2xl px-5 py-3 border border-gray-100">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    <span className="text-sm font-semibold text-gray-700">Chargement…</span>
                  </div>
                </div>
                <div className={cn('grid gap-4 opacity-40', viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
                  {enrichedItems.slice(0, 8).map(item => (
                    <ItemCard key={item.id} item={item} currentUserId={profile?.id} onFavoriteToggle={handleFavoriteToggle} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            ) : enrichedItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune annonce trouvée</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  {search ? `Aucun résultat pour "${search}"` : 'Soyez le premier à déposer une annonce dans cette catégorie !'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {activeFiltersCount > 0 && (
                    <button onClick={resetFilters}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      Supprimer les filtres
                    </button>
                  )}
                  <Link href="/collectionneurs/nouveau"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
                    <Plus className="w-4 h-4" /> Déposer une annonce
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
                  {enrichedItems.map(item => (
                    <ItemCard key={item.id} item={item} currentUserId={profile?.id} onFavoriteToggle={handleFavoriteToggle} viewMode={viewMode} />
                  ))}
                </div>

                {/* Load more */}
                {items.length < total && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Charger plus ({total - items.length} restants)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      </> /* fin TAB ANNONCES */
      )}
    </div>
  );
}
