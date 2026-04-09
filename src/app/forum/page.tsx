'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Plus, MessageCircle, Eye, Pin, Flame, Lock, Archive,
  Search, Filter, MapPin, Tag, Users, Bell,
  TrendingUp, Clock, Star, LayoutGrid, List, X, Image
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ForumSector, ForumCategory, ForumTopic } from '@/types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative } from '@/lib/utils';

// ─── Secteurs Biguglia (fallback si DB vide) ─────────────────────────────────
const SECTORS_DEFAULT: Omit<ForumSector, 'topic_count'>[] = [
  { id: 'les-collines',       name: 'Les Collines',          slug: 'les-collines',       description: 'Quartier résidentiel sur les hauteurs', icon: '⛰️',  color: 'emerald', display_order: 1 },
  { id: 'figabruna',          name: 'Figabruna',             slug: 'figabruna',          description: 'Secteur sud de Biguglia',               icon: '🌊',  color: 'blue',    display_order: 2 },
  { id: 'village',            name: 'Village de Biguglia',   slug: 'village',            description: 'Cœur historique du village',            icon: '🏘️',  color: 'amber',   display_order: 3 },
  { id: 'casatorra',          name: 'Casatorra',             slug: 'casatorra',          description: 'Secteur Casatorra',                     icon: '🌿',  color: 'green',   display_order: 4 },
  { id: 'ortale',             name: 'Ortale',                slug: 'ortale',             description: 'Quartier Ortale',                       icon: '🏡',  color: 'violet',  display_order: 5 },
  { id: 'la-plaine',          name: 'La Plaine',             slug: 'la-plaine',          description: 'Zone de la plaine et étang',            icon: '🌾',  color: 'orange',  display_order: 6 },
  { id: 'la-marana',          name: 'La Marana',             slug: 'la-marana',          description: 'Zone de La Marana',                     icon: '🏖️',  color: 'cyan',    display_order: 7 },
];

const SECTOR_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700'       },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700'     },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   badge: 'bg-green-100 text-green-700'     },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700'   },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700'   },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700'       },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    badge: 'bg-gray-100 text-gray-700'       },
};

// Catégories thématiques
const CATEGORIES_DEFAULT = [
  { id: 'vie-quartier',   name: 'Vie du quartier',   icon: '🏠', slug: 'vie-quartier'   },
  { id: 'infos-pratiques',name: 'Infos pratiques',   icon: 'ℹ️', slug: 'infos-pratiques' },
  { id: 'entraide',       name: 'Entraide',          icon: '🤝', slug: 'entraide'        },
  { id: 'securite',       name: 'Sécurité',          icon: '🚨', slug: 'securite'        },
  { id: 'commerces',      name: 'Commerces & Services',icon: '🛒', slug: 'commerces'     },
  { id: 'enfants-ecoles', name: 'Enfants & Écoles',  icon: '🎒', slug: 'enfants-ecoles'  },
  { id: 'nature-animaux', name: 'Nature & Animaux',  icon: '🌿', slug: 'nature-animaux'  },
  { id: 'travaux',        name: 'Travaux & Chantiers',icon: '🔧', slug: 'travaux'         },
  { id: 'evenements',     name: 'Événements locaux', icon: '🎉', slug: 'evenements'      },
  { id: 'libre',          name: 'Discussion libre',  icon: '💬', slug: 'libre'           },
];

type SortMode = 'recent' | 'hot' | 'replies' | 'views';
type StatusFilter = 'all' | 'ouvert' | 'verrouille' | 'archive';

// ─── Statut badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'verrouille') return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
      <Lock className="w-2.5 h-2.5" /> Verrouillé
    </span>
  );
  if (status === 'archive') return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      <Archive className="w-2.5 h-2.5" /> Archivé
    </span>
  );
  return null;
}

// ─── Carte d'un sujet ─────────────────────────────────────────────────────────
function TopicCard({ topic, sectors }: { topic: ForumTopic; sectors: ForumSector[] }) {
  const sector = sectors.find(s => s.id === topic.sector_id);
  const colors = SECTOR_COLORS[sector?.color || 'gray'];
  const replyCount = topic.reply_count ?? 0;
  const photos = (topic as ForumTopic & { photos?: { url: string }[] }).photos;
  const coverPhoto = photos?.[0]?.url;
  const photoCount = photos?.length ?? 0;

  return (
    <Link href={`/forum/${topic.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden">

        {/* Photo de couverture */}
        {coverPhoto && (
          <div className="relative h-40 bg-gray-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhoto} alt={topic.title} className="w-full h-full object-cover" />
            {photoCount > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Image className="w-3 h-3" /> {photoCount}
              </span>
            )}
            {topic.is_pinned && (
              <span className="absolute top-2 left-2 bg-brand-600/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Pin className="w-3 h-3" /> Épinglé
              </span>
            )}
            {topic.is_hot && (
              <span className="absolute top-2 right-2 bg-red-500/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3" /> Hot
              </span>
            )}
          </div>
        )}

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Avatar
              src={(topic.author as { avatar_url?: string })?.avatar_url}
              name={(topic.author as { full_name?: string })?.full_name || '?'}
              size="md"
            />

            <div className="flex-1 min-w-0">
              {/* Badges ligne */}
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                {!coverPhoto && topic.is_pinned && (
                  <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium">
                    <Pin className="w-3 h-3" /> Épinglé
                  </span>
                )}
                {!coverPhoto && topic.is_hot && (
                  <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                    <Flame className="w-3 h-3" /> Hot
                  </span>
                )}
                {sector && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                    {sector.icon} {sector.name}
                  </span>
                )}
                {topic.category && (
                  <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    {(topic.category as { icon?: string })?.icon} {(topic.category as { name?: string })?.name}
                  </span>
                )}
                <StatusBadge status={topic.status} />
              </div>

              {/* Titre */}
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-brand-600 transition-colors">
                {topic.title}
              </h3>

              {/* Extrait */}
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">{topic.content}</p>

              {/* Tags */}
              {topic.tags && (topic.tags as string[]).length > 0 && (
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  {(topic.tags as string[]).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Métadonnées claires */}
              <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap mt-1">
                <span className="font-medium text-gray-500">{(topic.author as { full_name?: string })?.full_name}</span>
                <span>·</span>
                <span title="Publié">{formatRelative(topic.created_at)}</span>
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md" title="Réponses">
                  <MessageCircle className="w-3 h-3" />
                  <span className="font-medium">{replyCount}</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md" title="Vues">
                  <Eye className="w-3 h-3" />
                  <span className="font-medium">{topic.views}</span>
                </span>
                {photoCount > 0 && !coverPhoto && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md">
                    <Image className="w-3 h-3" />
                    <span className="font-medium">{photoCount}</span>
                  </span>
                )}
                {topic.last_reply_at && (
                  <span className="text-gray-300 ml-auto hidden sm:inline" title="Dernière réponse">
                    <Clock className="w-3 h-3 inline mr-0.5" />
                    {formatRelative(topic.last_reply_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Page principale (inner) ──────────────────────────────────────────────────
function ForumPageInner() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sectors, setSectors] = useState<ForumSector[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSector, setSelectedSector] = useState<string | null>(searchParams.get('secteur'));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('categorie'));
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({ topics: 0, replies: 0, members: 0 });

  // ── Chargement données ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Secteurs (depuis DB ou fallback)
    const { data: sectorData } = await supabase
      .from('forum_sectors')
      .select('*')
      .order('display_order');

    const usedSectors: ForumSector[] = (sectorData && sectorData.length > 0)
      ? sectorData
      : SECTORS_DEFAULT.map(s => ({ ...s, topic_count: 0 }));
    setSectors(usedSectors);

    // Catégories
    const { data: catData } = await supabase
      .from('forum_categories')
      .select('*')
      .order('display_order');
    setCategories(catData && catData.length > 0 ? catData : CATEGORIES_DEFAULT as ForumCategory[]);

    // Statistiques globales
    const { count: topicCount } = await supabase.from('forum_topics').select('*', { count: 'exact', head: true });
    const { count: replyCount } = await supabase.from('forum_replies').select('*', { count: 'exact', head: true });
    const { count: memberCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    setStats({
      topics: topicCount || 0,
      replies: replyCount || 0,
      members: memberCount || 0,
    });

    // Topics avec fallback vers forum_posts si forum_topics vide
    let topicList: ForumTopic[] = [];
    try {
      let query = supabase
        .from('forum_topics')
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(id, full_name, avatar_url, role),
          sector:forum_sectors(id, name, slug, icon, color),
          category:forum_categories(id, name, icon, slug)
        `)
        .not('status', 'eq', 'masque')
        .order('is_pinned', { ascending: false });

      if (selectedSector) query = query.eq('sector_id', selectedSector);
      if (selectedCategory) query = query.eq('category_id', selectedCategory);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (searchQuery.trim()) query = query.ilike('title', `%${searchQuery.trim()}%`);

      // Tri
      if (sortMode === 'hot') query = query.eq('is_hot', true).order('reply_count', { ascending: false });
      else if (sortMode === 'replies') query = query.order('reply_count', { ascending: false });
      else if (sortMode === 'views') query = query.order('views', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      query = query.limit(40);
      const { data } = await query;
      if (data && data.length > 0) {
        topicList = data as unknown as ForumTopic[];
      }
    } catch {
      // Fallback: utiliser forum_posts comme forum_topics
    }

    // Fallback sur forum_posts si forum_topics vide/inexistant
    if (topicList.length === 0) {
      let q2 = supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles!forum_posts_author_id_fkey(id, full_name, avatar_url, role),
          category:forum_categories(id, name, icon, slug)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(40);
      if (selectedCategory) q2 = q2.eq('category_id', selectedCategory);
      const { data: postsData } = await q2;
      topicList = (postsData || []).map((p: Record<string, unknown>) => ({
        ...p,
        status: p.is_closed ? 'verrouille' : 'ouvert',
        reply_count: 0,
        reaction_count: 0,
        last_reply_at: null,
        is_hot: false,
        sector_id: null,
        visibility: 'public',
        tags: [],
      } as unknown as ForumTopic));
    }

    setTopics(topicList);
    setLoading(false);
  }, [selectedSector, selectedCategory, sortMode, statusFilter, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const clearFilters = () => {
    setSelectedSector(null);
    setSelectedCategory(null);
    setStatusFilter('all');
    setSearchQuery('');
    setSearchInput('');
  };

  const activeFiltersCount = [selectedSector, selectedCategory, statusFilter !== 'all', searchQuery].filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* ── En-tête ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              💬 Forum local
            </h1>
            <p className="text-gray-500 mt-1">Discussions de voisinage par secteur à Biguglia</p>
          </div>
          {profile && (
            <Button onClick={() => router.push('/forum/nouveau')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouveau sujet
            </Button>
          )}
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { icon: MessageCircle, label: 'Sujets', value: stats.topics, color: 'text-brand-600' },
            { icon: TrendingUp,    label: 'Réponses', value: stats.replies, color: 'text-green-600' },
            { icon: Users,         label: 'Membres', value: stats.members, color: 'text-violet-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <div className="font-bold text-gray-900 text-lg">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Secteurs ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Secteurs</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSector(null)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
              !selectedSector
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            🗺️ Tous les secteurs
          </button>
          {sectors.map(sector => {
            const colors = SECTOR_COLORS[sector.color || 'gray'];
            const isActive = selectedSector === sector.id || selectedSector === sector.slug;
            return (
              <button
                key={sector.id}
                onClick={() => setSelectedSector(isActive ? null : (sector.id || sector.slug))}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
                  isActive
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {sector.icon} {sector.name}
                {sector.topic_count ? <span className="ml-1 opacity-60 text-xs">({sector.topic_count})</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Sidebar ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Catégories */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Catégories
            </h3>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  !selectedCategory ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Toutes
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    selectedCategory === cat.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Liens rapides */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-xs uppercase tracking-wider">Accès rapide</h3>
            <div className="space-y-1">
              {[
                { icon: Flame,    label: 'Sujets chauds',   action: () => setSortMode('hot')     },
                { icon: Clock,    label: 'Derniers sujets', action: () => setSortMode('recent')  },
                { icon: Star,     label: 'Les plus vus',    action: () => setSortMode('views')   },
                { icon: Bell,     label: 'Mes suivis',      action: () => router.push('/dashboard/forum') },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <item.icon className="w-3.5 h-3.5 text-gray-400" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liens modules */}
          <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl border border-brand-200 p-4">
            <p className="text-xs font-semibold text-brand-700 mb-2">Modules liés</p>
            {[
              { href: '/evenements', label: '🎉 Événements' },
              { href: '/promenades', label: '🌿 Promenades' },
              { href: '/coups-de-main', label: '🤝 Coups de main' },
            ].map(l => (
              <a key={l.href} href={l.href} className="block text-sm text-brand-600 hover:text-brand-800 py-1 transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* ── Contenu principal ── */}
        <div className="lg:col-span-3">

          {/* Barre recherche + filtres */}
          <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Rechercher un sujet, un mot-clé..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                />
                {searchInput && (
                  <button type="button" onClick={() => { setSearchInput(''); setSearchQuery(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button type="submit" variant="outline" size="sm">Chercher</Button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${
                  activeFiltersCount > 0
                    ? 'bg-brand-50 text-brand-700 border-brand-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="bg-brand-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">{activeFiltersCount}</span>
                )}
              </button>
            </form>

            {/* Filtres avancés */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
                  >
                    <option value="all">Tous</option>
                    <option value="ouvert">Ouverts</option>
                    <option value="verrouille">Verrouillés</option>
                    <option value="archive">Archivés</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Trier par</label>
                  <select
                    value={sortMode}
                    onChange={e => setSortMode(e.target.value as SortMode)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
                  >
                    <option value="recent">Plus récents</option>
                    <option value="hot">🔥 Les plus chauds</option>
                    <option value="replies">Plus de réponses</option>
                    <option value="views">Plus vus</option>
                  </select>
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="col-span-2 text-xs text-red-500 hover:text-red-700 text-center py-1"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Barre tri + compteur résultats + vue */}
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            {/* Tri clair avec labels complets */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {([
                { key: 'recent',  icon: Clock,         short: 'Récents',      title: "Trier par date (plus récents d'abord)" },
                { key: 'hot',     icon: Flame,         short: '🔥 Chauds',    title: "Sujets avec le plus d'activité" },
                { key: 'replies', icon: MessageCircle, short: '+ Réponses',   title: 'Trier par nombre de réponses' },
                { key: 'views',   icon: Eye,           short: 'Consultés',    title: 'Trier par nombre de consultations' },
              ] as { key: SortMode; icon: React.ComponentType<{ className?: string }>; short: string; title: string }[]).map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortMode(s.key)}
                  title={s.title}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortMode === s.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{s.short}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Compteur résultats */}
              {!loading && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-lg font-medium">
                  {topics.length} sujet{topics.length !== 1 ? 's' : ''}
                </span>
              )}
              {/* Vue liste / grille */}
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  title="Vue liste"
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  title="Vue grille (avec photos)"
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Résultats */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : topics.length === 0 ? (
            <EmptyState
              icon="💬"
              title="Aucun sujet"
              description={activeFiltersCount > 0 ? 'Aucun sujet ne correspond à vos filtres.' : 'Soyez le premier à lancer une discussion dans ce secteur !'}
              action={
                activeFiltersCount > 0
                  ? { label: 'Effacer les filtres', onClick: clearFilters }
                  : profile
                    ? { label: 'Créer un sujet', onClick: () => router.push('/forum/nouveau') }
                    : { label: "S'inscrire", onClick: () => router.push('/inscription') }
              }
            />
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
              {topics.map(topic => (
                <TopicCard key={topic.id} topic={topic} sectors={sectors} />
              ))}
            </div>
          )}

          {/* Incitation à créer si non connecté */}
          {!profile && topics.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-brand-50 to-brand-100 rounded-2xl border border-brand-200 p-5 text-center">
              <p className="text-brand-700 font-medium mb-2">Rejoignez la conversation !</p>
              <p className="text-brand-600 text-sm mb-3">Connectez-vous pour créer un sujet, répondre ou réagir.</p>
              <Link href="/connexion">
                <Button size="sm">Se connecter</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Export avec Suspense (requis pour useSearchParams) ───────────────────────
export default function ForumPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-10 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-4" /><div className="h-4 bg-gray-100 rounded w-2/3" /></div>}>
      <ForumPageInner />
    </Suspense>
  );
}
