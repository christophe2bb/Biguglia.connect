'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Filter, X, SlidersHorizontal, Wrench, ShoppingBag,
  Package, Heart, Footprints, Calendar, BookOpen, Handshake,
  MapPin, Euro, Star, Clock, TrendingUp, ChevronRight,
  Loader2, AlertCircle, LayoutGrid, List, ArrowUpDown,
  CheckCircle2, Tag,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import GlobalSearch from '@/components/ui/GlobalSearch';
import Avatar from '@/components/ui/Avatar';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SearchResult {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  meta?: string;
  href: string;
  theme: string;
  themeLabel: string;
  themeColor: string;
  themeBg: string;
  themeIcon: React.ReactNode;
  image?: string;
  price?: number;
  isFree?: boolean;
  location?: string;
  date?: string;
  author?: { name: string; avatar?: string };
  status?: string;
  score?: number;
  badge?: string;
}

interface ThemeBlock {
  key: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  results: SearchResult[];
}

// ─── Config thèmes ─────────────────────────────────────────────────────────────
const THEMES = {
  artisan:     { label: 'Artisans',     color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  icon: <Wrench className="w-4 h-4" />,     activeBg: 'bg-orange-100', activeText: 'text-orange-700' },
  annonce:     { label: 'Annonces',     color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: <ShoppingBag className="w-4 h-4" />, activeBg: 'bg-blue-100',   activeText: 'text-blue-700' },
  materiel:    { label: 'Matériel',     color: 'text-sky-700',     bg: 'bg-sky-50',      border: 'border-sky-200',     icon: <Package className="w-4 h-4" />,     activeBg: 'bg-sky-100',    activeText: 'text-sky-700' },
  aide:        { label: 'Entraide',     color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200',    icon: <Heart className="w-4 h-4" />,       activeBg: 'bg-rose-100',   activeText: 'text-rose-700' },
  promenade:   { label: 'Promenades',   color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: <Footprints className="w-4 h-4" />,  activeBg: 'bg-emerald-100',activeText: 'text-emerald-700' },
  evenement:   { label: 'Événements',  color: 'text-purple-700',  bg: 'bg-purple-50',   border: 'border-purple-200',  icon: <Calendar className="w-4 h-4" />,    activeBg: 'bg-purple-100', activeText: 'text-purple-700' },
  forum:       { label: 'Forum',        color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200',  icon: <BookOpen className="w-4 h-4" />,    activeBg: 'bg-violet-100', activeText: 'text-violet-700' },
  association: { label: 'Associations', color: 'text-teal-700',    bg: 'bg-teal-50',     border: 'border-teal-200',    icon: <Handshake className="w-4 h-4" />,   activeBg: 'bg-teal-100',   activeText: 'text-teal-700' },
} as const;

type ThemeKey = keyof typeof THEMES;

// ─── Suggestions contextuelles ─────────────────────────────────────────────────
const CONTEXT_MAP: Record<string, { themes: ThemeKey[]; label: string }> = {
  déménagement: { themes: ['aide', 'annonce', 'materiel'], label: 'déménagement' },
  demenagement: { themes: ['aide', 'annonce', 'materiel'], label: 'déménagement' },
  plantes: { themes: ['aide', 'promenade', 'annonce'], label: 'plantes' },
  jardinage: { themes: ['aide', 'materiel', 'annonce', 'artisan'], label: 'jardinage' },
  sport: { themes: ['evenement', 'promenade', 'association'], label: 'sport' },
  covoiturage: { themes: ['aide', 'annonce'], label: 'covoiturage' },
  vélo: { themes: ['annonce', 'materiel', 'promenade'], label: 'vélo' },
  velo: { themes: ['annonce', 'materiel', 'promenade'], label: 'vélo' },
  plombier: { themes: ['artisan'], label: 'plombier' },
  plomberie: { themes: ['artisan'], label: 'plomberie' },
  electricite: { themes: ['artisan'], label: 'électricité' },
  musique: { themes: ['evenement', 'association', 'forum'], label: 'musique' },
  enfants: { themes: ['evenement', 'association', 'aide'], label: 'enfants' },
  animaux: { themes: ['aide', 'forum', 'annonce'], label: 'animaux' },
  chien: { themes: ['aide', 'promenade', 'annonce'], label: 'chien' },
};

// ─── Sort options ───────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'pertinence', label: 'Pertinence' },
  { value: 'recent', label: 'Plus récent' },
  { value: 'gratuit', label: 'Gratuit d\'abord' },
  { value: 'note', label: 'Mieux noté' },
];

// ─── Composant ResultCard ───────────────────────────────────────────────────────
function ResultCard({ result, view }: { result: SearchResult; view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <Link href={result.href} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group">
        {result.image ? (
          <img src={result.image} alt={result.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className={cn('w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0', result.themeBg, result.themeColor)}>
            <div className="scale-150">{result.themeIcon}</div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors truncate flex-1">{result.title}</p>
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0', result.themeBg, result.themeColor)}>
              {result.themeIcon}
              {result.themeLabel}
            </span>
          </div>
          {result.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">{result.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {result.location && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />{result.location}
              </span>
            )}
            {result.price !== undefined && (
              <span className="text-xs font-semibold text-gray-700">{result.price} €</span>
            )}
            {result.isFree && (
              <span className="text-xs font-semibold text-emerald-600">Gratuit</span>
            )}
            {result.date && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />{result.date}
              </span>
            )}
            {result.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                {result.badge}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-1" />
      </Link>
    );
  }

  // Grid view
  return (
    <Link href={result.href} className="flex flex-col bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group overflow-hidden">
      {result.image ? (
        <div className="h-32 overflow-hidden">
          <img src={result.image} alt={result.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className={cn('h-24 flex items-center justify-center', result.themeBg)}>
          <span className={cn('scale-[2.5]', result.themeColor)}>{result.themeIcon}</span>
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md', result.themeBg, result.themeColor)}>
            {result.themeIcon}
            {result.themeLabel}
          </span>
          {result.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              {result.badge}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 line-clamp-2 flex-1 mb-1.5">{result.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {result.location && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <MapPin className="w-3 h-3" />{result.location}
            </span>
          )}
          {result.price !== undefined && (
            <span className="text-xs font-semibold text-gray-700">{result.price} €</span>
          )}
          {result.isFree && (
            <span className="text-[11px] font-semibold text-emerald-600">Gratuit</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Composant ThemeBlock ────────────────────────────────────────────────────────
function ThemeBlock({ block, view }: { block: ThemeBlock; view: 'grid' | 'list' }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? block.results : block.results.slice(0, 4);
  const cfg = THEMES[block.key as ThemeKey];

  return (
    <div className="mb-8">
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-3 rounded-t-xl border-b', cfg.bg, cfg.border)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center', 'bg-white shadow-sm', cfg.color)}>
            {block.icon}
          </span>
          <div>
            <span className={cn('text-sm font-bold', cfg.color)}>{block.label}</span>
            <span className="ml-2 text-xs text-gray-500">{block.results.length} résultat{block.results.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        <Link
          href={getThemeLink(block.key)}
          className={cn('text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all', cfg.color)}
        >
          Voir tout <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Results */}
      <div className={cn(
        'border border-t-0 rounded-b-xl overflow-hidden',
        cfg.border.replace('border-', 'border-').replace('200', '100')
      )}>
        <div className={view === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100'
          : 'divide-y divide-gray-50'
        }>
          {shown.map(r => (
            <div key={r.id} className={view === 'grid' ? 'bg-white' : ''}>
              <ResultCard result={r} view={view} />
            </div>
          ))}
        </div>

        {!expanded && block.results.length > 4 && (
          <button
            onClick={() => setExpanded(true)}
            className={cn(
              'w-full py-3 text-sm font-semibold text-center border-t transition-colors',
              cfg.bg, cfg.color, 'hover:opacity-80'
            )}
          >
            Voir {block.results.length - 4} autre{block.results.length - 4 > 1 ? 's' : ''} →
          </button>
        )}
      </div>
    </div>
  );
}

function getThemeLink(theme: string): string {
  const map: Record<string, string> = {
    artisan: '/artisans',
    annonce: '/annonces',
    materiel: '/materiel',
    aide: '/coups-de-main',
    promenade: '/promenades',
    evenement: '/evenements',
    forum: '/forum',
    association: '/associations',
  };
  return map[theme] || '/';
}

// ─── Page principale ────────────────────────────────────────────────────────────
function RechercheContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeThemes, setActiveThemes] = useState<ThemeKey[]>([]);
  const [sortBy, setSortBy] = useState('pertinence');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<ThemeBlock[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filtres avancés
  const [filterFree, setFilterFree] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Context suggestions
  const [contextSuggestions, setContextSuggestions] = useState<{ themes: ThemeKey[]; label: string } | null>(null);

  // Detect context from query
  useEffect(() => {
    const q = query.toLowerCase();
    const found = Object.entries(CONTEXT_MAP).find(([key]) => q.includes(key));
    setContextSuggestions(found ? found[1] : null);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setBlocks([]); setTotalCount(0); return; }
    setLoading(true);

    try {
      const supabase = createClient();
      const pattern = `%${q.trim()}%`;
      const today = new Date().toISOString().split('T')[0];

      const [
        { data: artisans },
        { data: listings },
        { data: equipment },
        { data: helps },
        { data: outings },
        { data: events },
        { data: forum },
        { data: associations },
      ] = await Promise.all([
        supabase
          .from('artisan_profiles')
          .select('id, business_name, city, description, trade_category:trade_categories(name)')
          .or(`business_name.ilike.${pattern},description.ilike.${pattern},city.ilike.${pattern}`)
          .eq('is_verified', true)
          .limit(20),
        supabase
          .from('listings')
          .select('id, title, description, listing_type, price, location, status, created_at, photos:listing_photos(url)')
          .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
          .in('status', ['active', 'reserved'])
          .limit(20),
        supabase
          .from('equipment_items')
          .select('id, name, description, is_free, price_per_day, city, photos:equipment_photos(url)')
          .or(`name.ilike.${pattern},description.ilike.${pattern}`)
          .eq('is_available', true)
          .limit(20),
        supabase
          .from('help_requests')
          .select('id, title, description, city, help_type, urgency')
          .or(`title.ilike.${pattern},description.ilike.${pattern},city.ilike.${pattern}`)
          .eq('status', 'open')
          .limit(20),
        supabase
          .from('group_outings')
          .select('id, title, description, location, outing_date, difficulty, photos:outing_photos(url)')
          .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
          .gte('outing_date', today)
          .limit(20),
        supabase
          .from('local_events')
          .select('id, title, description, location, event_date, is_free, price, photos:event_photos(url)')
          .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
          .gte('event_date', today)
          .limit(20),
        supabase
          .from('forum_posts')
          .select('id, title, content, created_at, category:forum_categories(name), author:profiles(full_name, avatar_url)')
          .or(`title.ilike.${pattern},content.ilike.${pattern}`)
          .limit(20),
        supabase
          .from('associations')
          .select('id, name, description, city, category, logo_url')
          .or(`name.ilike.${pattern},description.ilike.${pattern},city.ilike.${pattern},category.ilike.${pattern}`)
          .eq('status', 'active')
          .limit(20),
      ]);

      // Formatter les résultats par blocs
      const rawBlocks: ThemeBlock[] = [];

      const artisanResults: SearchResult[] = (artisans || []).map(a => ({
        id: `artisan-${a.id}`,
        title: a.business_name || 'Artisan',
        description: a.description,
        subtitle: (a.trade_category as { name?: string } | null)?.name,
        href: `/artisans/${a.id}`,
        theme: 'artisan',
        themeLabel: THEMES.artisan.label,
        themeColor: THEMES.artisan.color,
        themeBg: THEMES.artisan.bg,
        themeIcon: THEMES.artisan.icon,
        location: a.city,
        badge: 'Vérifié ✓',
      }));

      const listingResults: SearchResult[] = (listings || [])
        .filter(l => !filterFree || l.listing_type === 'free')
        .filter(l => !filterLocation || (l.location || '').toLowerCase().includes(filterLocation.toLowerCase()))
        .map(l => {
          const photos = (l.photos as { url: string }[] | null);
          return {
            id: `listing-${l.id}`,
            title: l.title,
            description: l.description,
            href: `/annonces/${l.id}`,
            theme: 'annonce',
            themeLabel: THEMES.annonce.label,
            themeColor: THEMES.annonce.color,
            themeBg: THEMES.annonce.bg,
            themeIcon: THEMES.annonce.icon,
            image: photos?.[0]?.url,
            price: l.listing_type !== 'free' ? l.price : undefined,
            isFree: l.listing_type === 'free',
            location: l.location,
          };
        });

      const equipResults: SearchResult[] = (equipment || [])
        .filter(e => !filterFree || e.is_free)
        .map(e => {
          const photos = (e.photos as { url: string }[] | null);
          return {
            id: `equip-${e.id}`,
            title: e.name,
            description: e.description,
            href: `/materiel/${e.id}`,
            theme: 'materiel',
            themeLabel: THEMES.materiel.label,
            themeColor: THEMES.materiel.color,
            themeBg: THEMES.materiel.bg,
            themeIcon: THEMES.materiel.icon,
            image: photos?.[0]?.url,
            price: e.is_free ? undefined : e.price_per_day,
            isFree: e.is_free,
            location: e.city,
          };
        });

      const helpResults: SearchResult[] = (helps || []).map(h => ({
        id: `help-${h.id}`,
        title: h.title,
        description: h.description,
        href: `/coups-de-main#${h.id}`,
        theme: 'aide',
        themeLabel: THEMES.aide.label,
        themeColor: THEMES.aide.color,
        themeBg: THEMES.aide.bg,
        themeIcon: THEMES.aide.icon,
        location: h.city,
        badge: h.urgency === 'urgent' ? '🔴 Urgent' : undefined,
      }));

      const outingResults: SearchResult[] = (outings || []).map(o => {
        const photos = (o.photos as { url: string }[] | null);
        return {
          id: `outing-${o.id}`,
          title: o.title,
          description: o.description,
          href: `/promenades`,
          theme: 'promenade',
          themeLabel: THEMES.promenade.label,
          themeColor: THEMES.promenade.color,
          themeBg: THEMES.promenade.bg,
          themeIcon: THEMES.promenade.icon,
          image: photos?.[0]?.url,
          location: o.location,
          date: o.outing_date ? new Date(o.outing_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : undefined,
        };
      });

      const eventResults: SearchResult[] = (events || []).map(e => {
        const photos = (e.photos as { url: string }[] | null);
        return {
          id: `event-${e.id}`,
          title: e.title,
          description: e.description,
          href: `/evenements`,
          theme: 'evenement',
          themeLabel: THEMES.evenement.label,
          themeColor: THEMES.evenement.color,
          themeBg: THEMES.evenement.bg,
          themeIcon: THEMES.evenement.icon,
          image: photos?.[0]?.url,
          price: e.is_free ? undefined : e.price,
          isFree: e.is_free,
          location: e.location,
          date: e.event_date ? new Date(e.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : undefined,
        };
      });

      const forumResults: SearchResult[] = (forum || []).map(f => {
        const author = (f.author as { full_name?: string; avatar_url?: string } | null);
        const category = (f.category as { name?: string } | null);
        return {
          id: `forum-${f.id}`,
          title: f.title,
          description: (f.content as string || '').slice(0, 100),
          href: `/forum/${f.id}`,
          theme: 'forum',
          themeLabel: THEMES.forum.label,
          themeColor: THEMES.forum.color,
          themeBg: THEMES.forum.bg,
          themeIcon: THEMES.forum.icon,
          subtitle: category?.name,
          author: author ? { name: author.full_name || 'Anonyme', avatar: author.avatar_url } : undefined,
          date: f.created_at ? new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : undefined,
        };
      });

      const assoResults: SearchResult[] = (associations || []).map(a => ({
        id: `asso-${a.id}`,
        title: a.name,
        description: a.description,
        href: `/associations`,
        theme: 'association',
        themeLabel: THEMES.association.label,
        themeColor: THEMES.association.color,
        themeBg: THEMES.association.bg,
        themeIcon: THEMES.association.icon,
        image: a.logo_url,
        location: a.city,
        subtitle: a.category,
      }));

      // Construire les blocs en filtrant par thème actif
      const allBlocks: [ThemeKey, SearchResult[]][] = [
        ['artisan', artisanResults],
        ['annonce', listingResults],
        ['materiel', equipResults],
        ['aide', helpResults],
        ['promenade', outingResults],
        ['evenement', eventResults],
        ['forum', forumResults],
        ['association', assoResults],
      ];

      let total = 0;
      for (const [key, results] of allBlocks) {
        if (results.length === 0) continue;
        if (activeThemes.length > 0 && !activeThemes.includes(key)) continue;

        // Sort
        let sorted = [...results];
        if (sortBy === 'gratuit') {
          sorted = sorted.sort((a, b) => (a.isFree ? -1 : 1) - (b.isFree ? -1 : 1));
        }

        rawBlocks.push({
          key,
          label: THEMES[key].label,
          color: THEMES[key].color,
          bg: THEMES[key].bg,
          border: THEMES[key].border,
          icon: THEMES[key].icon,
          results: sorted,
        });
        total += sorted.length;
      }

      setBlocks(rawBlocks);
      setTotalCount(total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeThemes, sortBy, filterFree, filterLocation]);

  // Lancer la recherche quand query change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q) runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Relancer si filtres changent
  useEffect(() => {
    if (query) runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThemes, sortBy, filterFree, filterLocation]);

  const handleSearch = (q: string) => {
    router.push(`/recherche?q=${encodeURIComponent(q)}`);
  };

  const toggleTheme = (key: ThemeKey) => {
    setActiveThemes(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  };

  const isEmpty = !loading && query.trim() && blocks.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header recherche ── */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Barre de recherche */}
          <GlobalSearch
            size="lg"
            placeholder="Rechercher artisans, annonces, événements, promenades…"
            onSearch={handleSearch}
            overlay={false}
            initialValue={query}
            className="mb-4"
          />

          {/* Filtres thèmes */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveThemes([])}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
                activeThemes.length === 0
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              <LayoutGrid className="w-3 h-3" />
              Tous
            </button>
            {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => toggleTheme(key)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
                  activeThemes.includes(key)
                    ? cn(cfg.activeBg, cfg.activeText, cfg.border)
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            ))}

            {/* Séparateur */}
            <div className="flex-shrink-0 w-px h-6 bg-gray-200 mx-1" />

            {/* Filtre gratuit */}
            <button
              onClick={() => setFilterFree(!filterFree)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
                filterFree
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              <Tag className="w-3 h-3" />
              Gratuit
            </button>

            {/* Bouton filtres avancés */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
                showFilters
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filtres
              {(filterLocation || filterFree) && (
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Filtres avancés (expandable) */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Quartier, ville…"
                  value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {(filterLocation || filterFree) && (
                <button
                  onClick={() => { setFilterLocation(''); setFilterFree(false); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                >
                  <X className="w-3 h-3" /> Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── État vide (aucune query) ── */}
        {!query.trim() && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-brand-50 rounded-full flex items-center justify-center">
              <Search className="w-7 h-7 text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Recherche globale</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Trouvez artisans, annonces, événements, promenades, matériel, entraide, forum et associations en une seule recherche.
            </p>

            {/* Recherches populaires */}
            <div className="max-w-lg mx-auto mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Tendances
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Plombier', 'Aide déménagement', 'Vélo', 'Cours sport', 'Matériel jardinage', 'Covoiturage', 'Événement', 'Forum'].map(t => (
                  <button
                    key={t}
                    onClick={() => handleSearch(t)}
                    className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-colors shadow-sm"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Grille thèmes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, cfg]) => (
                <Link
                  key={key}
                  href={getThemeLink(key)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-md group',
                    cfg.bg, cfg.border
                  )}
                >
                  <span className={cn('w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform', cfg.color)}>
                    <span className="scale-125">{cfg.icon}</span>
                  </span>
                  <span className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Suggestions contextuelles ── */}
        {contextSuggestions && query.trim() && !loading && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <span className="text-amber-500 mt-0.5">💡</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Pour « {contextSuggestions.label} », on vous suggère aussi :
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {contextSuggestions.themes
                  .filter(t => !activeThemes.includes(t))
                  .map(t => (
                    <button
                      key={t}
                      onClick={() => toggleTheme(t)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors',
                        THEMES[t].bg, THEMES[t].color, 'hover:opacity-80'
                      )}
                    >
                      {THEMES[t].icon}
                      {THEMES[t].label}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ── En-tête résultats ── */}
        {query.trim() && !loading && (
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {totalCount > 0
                  ? <>{totalCount} résultat{totalCount > 1 ? 's' : ''} pour <span className="text-brand-600">« {query} »</span></>
                  : <>Résultats pour <span className="text-brand-600">« {query} »</span></>
                }
              </h1>
              {activeThemes.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Filtrés par : {activeThemes.map(t => THEMES[t].label).join(', ')}
                </p>
              )}
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setView('list')}
                className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
                title="Vue liste"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
                title="Vue grille"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-500">Recherche en cours dans tous les thèmes…</p>
          </div>
        )}

        {/* ── Aucun résultat ── */}
        {isEmpty && (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun résultat trouvé</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Aucun contenu ne correspond à « <strong>{query}</strong> » dans {activeThemes.length > 0 ? 'les thèmes sélectionnés' : 'nos rubriques'}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {activeThemes.length > 0 && (
                <button
                  onClick={() => setActiveThemes([])}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-50 text-brand-700 text-sm font-semibold hover:bg-brand-100 transition-colors"
                >
                  <X className="w-4 h-4" /> Supprimer les filtres
                </button>
              )}
              <button
                onClick={() => handleSearch(query.split(' ')[0])}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                <Search className="w-4 h-4" /> Essayer « {query.split(' ')[0]} »
              </button>
            </div>

            {/* Suggestions alternatives */}
            <div className="mt-8 max-w-md mx-auto">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Explorer les rubriques</p>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, cfg]) => (
                  <Link
                    key={key}
                    href={getThemeLink(key)}
                    className={cn('flex flex-col items-center gap-1 p-3 rounded-xl transition-colors', cfg.bg, 'hover:opacity-80')}
                  >
                    <span className={cfg.color}>{cfg.icon}</span>
                    <span className={cn('text-[10px] font-semibold', cfg.color)}>{cfg.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Blocs de résultats ── */}
        {!loading && blocks.length > 0 && (
          <div>
            {blocks.map(block => (
              <ThemeBlock key={block.key} block={block} view={view} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export avec Suspense ───────────────────────────────────────────────────────
export default function RecherchePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    }>
      <RechercheContent />
    </Suspense>
  );
}
