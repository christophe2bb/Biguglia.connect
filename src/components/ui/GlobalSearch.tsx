'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, Clock, TrendingUp, Wrench, ShoppingBag, Package,
  Heart, Footprints, Calendar, BookOpen, Handshake,
  ArrowRight, Loader2, AlertCircle, ScanSearch,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface QuickResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  theme: string;
  themeLabel: string;
  themeColor: string;
  themeBg: string;
  icon: React.ReactNode;
  /** score de pertinence : nb de mots du query présents dans le titre */
  score?: number;
}

// ─── Config thèmes ─────────────────────────────────────────────────────────────
const THEME_CONFIG = {
  artisan: {
    label: 'Artisans',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  annonce: {
    label: 'Annonces',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: <ShoppingBag className="w-3.5 h-3.5" />,
  },
  materiel: {
    label: 'Matériel',
    color: 'text-sky-600',
    bg: 'bg-sky-100',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  aide: {
    label: 'Entraide',
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    icon: <Heart className="w-3.5 h-3.5" />,
  },
  promenade: {
    label: 'Promenades',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    icon: <Footprints className="w-3.5 h-3.5" />,
  },
  evenement: {
    label: 'Événements',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
  forum: {
    label: 'Forum',
    color: 'text-violet-600',
    bg: 'bg-violet-100',
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  association: {
    label: 'Associations',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    icon: <Handshake className="w-3.5 h-3.5" />,
  },
  perdu: {
    label: 'Perdu / Trouvé',
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    icon: <ScanSearch className="w-3.5 h-3.5" />,
  },
} as const;

type ThemeKey = keyof typeof THEME_CONFIG;

// ─── Recherches populaires par défaut ──────────────────────────────────────────
const POPULAR_SEARCHES = [
  { label: 'Plombier Biguglia', href: '/recherche?q=plombier' },
  { label: 'Aide déménagement', href: '/recherche?q=déménagement' },
  { label: 'Vélo à vendre', href: '/recherche?q=vélo' },
  { label: 'Cours de sport', href: '/recherche?q=sport' },
  { label: 'Matériel jardinage', href: '/recherche?q=jardinage' },
  { label: 'Covoiturage', href: '/recherche?q=covoiturage' },
];

// ─── Hook debounce ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Gestion localStorage recherches récentes ──────────────────────────────────
const RECENT_KEY = 'bc_recent_searches';
function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(q: string) {
  if (typeof window === 'undefined') return;
  const prev = getRecent().filter(r => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 5)));
}
function clearRecent() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_KEY);
}

// ─── Utilitaire recherche partielle par mots ───────────────────────────────────
/**
 * Découpe le query en mots non-vides ≥ 2 car.
 * Retourne des patterns ilike individuels ex: ['%plomb%', '%bigugli%']
 * Supabase: on construit un filtre .or() qui accepte si AU MOINS UN mot matche.
 */
function buildWordPatterns(q: string): string[] {
  return q
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire les accents pour la normalisation
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .map(w => `%${w}%`);
}

/**
 * Construit un filtre OR sur plusieurs colonnes × plusieurs mots.
 * Ex: colonnes=['title','description'], mots=['%velo%','%sport%']
 * → "title.ilike.%velo%,title.ilike.%sport%,description.ilike.%velo%,description.ilike.%sport%"
 */
function buildOrFilter(columns: string[], wordPatterns: string[]): string {
  const parts: string[] = [];
  for (const col of columns) {
    for (const pat of wordPatterns) {
      parts.push(`${col}.ilike.${pat}`);
    }
  }
  return parts.join(',');
}

/**
 * Score de pertinence : compte combien de mots normalisés du query
 * apparaissent dans le texte normalisé (titre + subtitle).
 */
function scoreResult(result: QuickResult, words: string[]): number {
  const haystack = `${result.title} ${result.subtitle ?? ''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
}

// ─── Composant ThemeBadge ───────────────────────────────────────────────────────
function ThemeBadge({ theme }: { theme: ThemeKey }) {
  const cfg = THEME_CONFIG[theme];
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md', cfg.bg, cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Composant principal GlobalSearch ─────────────────────────────────────────
interface GlobalSearchProps {
  /** Taille de la barre */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Placeholder customisé */
  placeholder?: string;
  /** Classe CSS additionnelle */
  className?: string;
  /** Callback quand la recherche est lancée */
  onSearch?: (q: string) => void;
  /** Afficher les résultats en overlay (default true) */
  overlay?: boolean;
  /** Valeur initiale */
  initialValue?: string;
  /** Auto-focus */
  autoFocus?: boolean;
}

export default function GlobalSearch({
  size = 'md',
  placeholder = 'Rechercher artisans, annonces, événements…',
  className,
  onSearch,
  overlay = true,
  initialValue = '',
  autoFocus = false,
}: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuickResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [error, setError] = useState(false);

  const debouncedQuery = useDebounce(query.trim(), 250);

  // Charge les recherches récentes au focus
  const handleFocus = () => {
    setIsFocused(true);
    setRecent(getRecent());
  };

  // Ferme la dropdown
  const handleBlur = useCallback(() => {
    setTimeout(() => setIsFocused(false), 200);
  }, []);

  // Ferme si clic dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Recherche rapide multi-tables avec matching par mots ─────────────────────
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      setLoading(true);
      setError(false);

      // Mots normalisés pour le scoring côté client
      const rawWords = debouncedQuery
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 2);

      // Patterns ilike avec accents originaux (pour que Supabase filtre bien)
      const wordPatterns = buildWordPatterns(debouncedQuery);
      if (wordPatterns.length === 0) { setLoading(false); return; }

      try {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];

        const [
          { data: artisans },
          { data: listings },
          { data: equipment },
          { data: helps },
          { data: outings },
          { data: events },
          { data: forumTopics },
          { data: associations },
          { data: lostFound },
        ] = await Promise.all([
          // Artisans — nom + description
          supabase
            .from('artisan_profiles')
            .select('id, business_name, service_area, trade_category:trade_categories(name)')
            .or(buildOrFilter(['business_name', 'description'], wordPatterns))
            .limit(4),

          // Annonces — titre + description
          supabase
            .from('listings')
            .select('id, title, listing_type, price, location')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .in('status', ['active', 'reserved'])
            .limit(4),

          // Matériel — titre + description
          supabase
            .from('equipment_items')
            .select('id, title, description, is_free, pickup_location')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .eq('is_available', true)
            .limit(4),

          // Coups de main — titre + description
          supabase
            .from('help_requests')
            .select('id, title, description')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .neq('status', 'draft')
            .neq('status', 'resolved')
            .neq('status', 'archived')
            .limit(4),

          // Promenades — titre + description
          supabase
            .from('group_outings')
            .select('id, title, description, meeting_point, outing_date')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .gte('outing_date', today)
            .limit(3),

          // Événements — titre + description
          supabase
            .from('events')
            .select('id, title, description, location, event_date')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .gte('event_date', today)
            .not('status', 'eq', 'annule')
            .not('status', 'eq', 'draft')
            .limit(4),

          // Forum topics — titre + contenu
          supabase
            .from('forum_topics')
            .select('id, title, content')
            .or(buildOrFilter(['title', 'content'], wordPatterns))
            .neq('status', 'masque')
            .neq('status', 'archive')
            .limit(4),

          // Associations — nom + description
          supabase
            .from('associations')
            .select('id, name, location, category, description')
            .or(buildOrFilter(['name', 'description'], wordPatterns))
            .eq('status', 'active')
            .limit(3),

          // Perdu / Trouvé — titre + description
          supabase
            .from('lost_found_items')
            .select('id, title, description, type, location_area')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .neq('status', 'resolved')
            .neq('status', 'returned')
            .limit(4),
        ]);

        if (cancelled) return;

        // ── Mapping brut → QuickResult ───────────────────────────────────────
        const mapped: QuickResult[] = [
          ...(artisans || []).map(a => ({
            id: `artisan-${a.id}`,
            title: a.business_name || 'Artisan',
            subtitle: (a.trade_category as { name?: string } | null)?.name || a.service_area,
            href: `/artisans/${a.id}`,
            theme: 'artisan',
            themeLabel: THEME_CONFIG.artisan.label,
            themeColor: THEME_CONFIG.artisan.color,
            themeBg: THEME_CONFIG.artisan.bg,
            icon: THEME_CONFIG.artisan.icon,
          })),
          ...(listings || []).map(l => ({
            id: `listing-${l.id}`,
            title: l.title,
            subtitle: l.price ? `${l.price} €` : l.location,
            href: `/annonces/${l.id}`,
            theme: 'annonce',
            themeLabel: THEME_CONFIG.annonce.label,
            themeColor: THEME_CONFIG.annonce.color,
            themeBg: THEME_CONFIG.annonce.bg,
            icon: THEME_CONFIG.annonce.icon,
          })),
          ...(equipment || []).map(e => ({
            id: `equip-${e.id}`,
            title: e.title,
            subtitle: e.is_free ? 'Gratuit' : e.pickup_location,
            href: `/materiel/${e.id}`,
            theme: 'materiel',
            themeLabel: THEME_CONFIG.materiel.label,
            themeColor: THEME_CONFIG.materiel.color,
            themeBg: THEME_CONFIG.materiel.bg,
            icon: THEME_CONFIG.materiel.icon,
          })),
          ...(helps || []).map(h => ({
            id: `help-${h.id}`,
            title: h.title,
            subtitle: 'Coup de main',
            href: `/coups-de-main#${h.id}`,
            theme: 'aide',
            themeLabel: THEME_CONFIG.aide.label,
            themeColor: THEME_CONFIG.aide.color,
            themeBg: THEME_CONFIG.aide.bg,
            icon: THEME_CONFIG.aide.icon,
          })),
          ...(outings || []).map(o => ({
            id: `outing-${o.id}`,
            title: o.title,
            subtitle: o.meeting_point,
            href: `/promenades/sorties/${o.id}`,
            theme: 'promenade',
            themeLabel: THEME_CONFIG.promenade.label,
            themeColor: THEME_CONFIG.promenade.color,
            themeBg: THEME_CONFIG.promenade.bg,
            icon: THEME_CONFIG.promenade.icon,
          })),
          ...(events || []).map(e => ({
            id: `event-${e.id}`,
            title: e.title,
            subtitle: e.location,
            href: `/evenements/${e.id}`,
            theme: 'evenement',
            themeLabel: THEME_CONFIG.evenement.label,
            themeColor: THEME_CONFIG.evenement.color,
            themeBg: THEME_CONFIG.evenement.bg,
            icon: THEME_CONFIG.evenement.icon,
          })),
          ...(forumTopics || []).map(f => ({
            id: `forum-${f.id}`,
            title: f.title,
            subtitle: 'Discussion',
            href: `/forum/${f.id}`,
            theme: 'forum',
            themeLabel: THEME_CONFIG.forum.label,
            themeColor: THEME_CONFIG.forum.color,
            themeBg: THEME_CONFIG.forum.bg,
            icon: THEME_CONFIG.forum.icon,
          })),
          ...(associations || []).map(a => ({
            id: `asso-${a.id}`,
            title: a.name,
            subtitle: a.location,
            href: `/associations`,
            theme: 'association',
            themeLabel: THEME_CONFIG.association.label,
            themeColor: THEME_CONFIG.association.color,
            themeBg: THEME_CONFIG.association.bg,
            icon: THEME_CONFIG.association.icon,
          })),
          ...(lostFound || []).map(l => ({
            id: `lf-${l.id}`,
            title: l.title,
            subtitle: l.type === 'lost' || l.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé',
            href: `/perdu-trouve/${l.id}`,
            theme: 'perdu' as const,
            themeLabel: THEME_CONFIG.perdu.label,
            themeColor: THEME_CONFIG.perdu.color,
            themeBg: THEME_CONFIG.perdu.bg,
            icon: THEME_CONFIG.perdu.icon,
          })),
        ];

        // ── Scoring + tri : résultats avec le plus de mots matchés en premier ─
        const scored = mapped.map(r => ({
          ...r,
          score: scoreResult(r, rawWords),
        }));
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        // Dédoublonnage par id + limite finale
        const seen = new Set<string>();
        const deduped = scored.filter(r => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });

        setResults(deduped.slice(0, 14));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runSearch();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Navigation clavier
  const totalItems = query.trim().length >= 2
    ? results.length + 1 // +1 for "Voir tous les résultats"
    : (recent.length > 0 ? recent.length : POPULAR_SEARCHES.length);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx === -1 || (query.trim().length >= 2 && selectedIdx === results.length)) {
        handleSubmit();
      } else if (query.trim().length >= 2 && results[selectedIdx]) {
        navigateTo(results[selectedIdx].href);
      } else if (query.trim().length < 2 && recent.length > 0 && recent[selectedIdx]) {
        handleSearchTerm(recent[selectedIdx]);
      }
    }
  };

  const navigateTo = (href: string) => {
    setIsFocused(false);
    router.push(href);
  };

  const handleSubmit = () => {
    const q = query.trim();
    if (!q) return;
    saveRecent(q);
    setIsFocused(false);
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/recherche?q=${encodeURIComponent(q)}`);
    }
  };

  const handleSearchTerm = (term: string) => {
    setQuery(term);
    saveRecent(term);
    setIsFocused(false);
    if (onSearch) {
      onSearch(term);
    } else {
      router.push(`/recherche?q=${encodeURIComponent(term)}`);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  // ── Tailles ─────────────────────────────────────────────────────────────────
  const sizes = {
    sm:  { input: 'h-9 text-sm pl-9 pr-8',        icon: 'left-2.5 w-4 h-4',   clearBtn: 'right-2',   btn: 'hidden' },
    md:  { input: 'h-11 text-sm pl-10 pr-9',       icon: 'left-3 w-4 h-4',     clearBtn: 'right-2.5', btn: 'hidden' },
    lg:  { input: 'h-14 text-base pl-12 pr-10',    icon: 'left-3.5 w-5 h-5',   clearBtn: 'right-3',   btn: 'hidden' },
    xl:  { input: 'h-16 text-lg pl-14 pr-36',      icon: 'left-4 w-6 h-6',     clearBtn: 'right-28',  btn: 'flex' },
  }[size];

  const showDropdown = isFocused && overlay;
  const hasQuery = query.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className={cn('absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none', sizes.icon)} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIdx(-1); }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full rounded-2xl border-2 border-white/60 bg-white shadow-xl',
            'placeholder:text-gray-400 text-gray-900 font-medium',
            'focus:outline-none focus:ring-4 focus:ring-brand-300/50 focus:border-brand-400',
            'transition-all duration-200',
            sizes.input,
          )}
        />

        {/* Bouton effacer / loader */}
        <div className={cn('absolute top-1/2 -translate-y-1/2', sizes.clearBtn)}>
          {loading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : query ? (
            <button
              onClick={clearQuery}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              tabIndex={-1}
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Bouton Rechercher (taille xl uniquement) */}
        {size === 'xl' && (
          <button
            onClick={handleSubmit}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'flex items-center gap-2 px-5 py-3 rounded-xl',
              'bg-brand-600 hover:bg-brand-700 active:scale-95',
              'text-white font-black text-sm shadow-md transition-all duration-150',
            )}
          >
            <Search className="w-4 h-4" />
            Rechercher
          </button>
        )}
      </div>

      {/* ── Dropdown overlay ────────────────────────────────────────────────── */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-[540px] overflow-y-auto">

          {/* Résultats de recherche */}
          {hasQuery ? (
            <>
              {error ? (
                <div className="flex items-center gap-2 p-4 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Erreur lors de la recherche. Réessayez.
                </div>
              ) : loading && results.length === 0 ? (
                <div className="flex items-center gap-3 p-5 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  Recherche en cours…
                </div>
              ) : results.length === 0 && !loading ? (
                <div className="p-5">
                  <p className="text-sm text-gray-500 mb-3">Aucun résultat rapide pour « {query.trim()} »</p>
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    <Search className="w-4 h-4" />
                    Recherche complète →
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-50">
                    {results.map((r, idx) => (
                      <button
                        key={r.id}
                        onClick={() => navigateTo(r.href)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          selectedIdx === idx ? 'bg-gray-50' : 'hover:bg-gray-50'
                        )}
                      >
                        <span className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          r.themeBg, r.themeColor
                        )}>
                          {r.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                          {r.subtitle && (
                            <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>
                          )}
                        </div>
                        <ThemeBadge theme={r.theme as ThemeKey} />
                      </button>
                    ))}
                  </div>

                  {/* Voir tous les résultats */}
                  <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                    <button
                      onClick={handleSubmit}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors',
                        selectedIdx === results.length && 'ring-2 ring-brand-300'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Voir tous les résultats pour « {query.trim()} »
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Recherches récentes */}
              {recent.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Récentes
                    </span>
                    <button
                      onClick={() => { clearRecent(); setRecent([]); }}
                      className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Effacer
                    </button>
                  </div>
                  {recent.map((r, idx) => (
                    <button
                      key={r}
                      onClick={() => handleSearchTerm(r)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                        selectedIdx === idx ? 'bg-gray-100' : 'hover:bg-gray-50'
                      )}
                    >
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{r}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Recherches populaires */}
              <div className={cn('p-3', recent.length > 0 && 'border-t border-gray-100')}>
                <div className="flex items-center gap-1.5 px-2 mb-2">
                  <TrendingUp className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Populaires
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                  {POPULAR_SEARCHES.map(s => (
                    <button
                      key={s.label}
                      onClick={() => handleSearchTerm(s.label)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thèmes rapides */}
              <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                <div className="px-2 mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Explorer</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.entries(THEME_CONFIG) as [ThemeKey, typeof THEME_CONFIG[ThemeKey]][]).map(([key, cfg]) => {
                    const hrefs: Record<ThemeKey, string> = {
                      artisan: '/artisans',
                      annonce: '/annonces',
                      materiel: '/materiel',
                      aide: '/coups-de-main',
                      promenade: '/promenades',
                      evenement: '/evenements',
                      forum: '/forum',
                      association: '/associations',
                      perdu: '/perdu-trouve',
                    };
                    return (
                      <button
                        key={key}
                        onClick={() => navigateTo(hrefs[key])}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-xl transition-colors',
                          cfg.bg, 'hover:opacity-80'
                        )}
                      >
                        <span className={cfg.color}>{cfg.icon}</span>
                        <span className={cn('text-[10px] font-semibold leading-tight text-center', cfg.color)}>
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Export de la config thèmes pour réutilisation ─────────────────────────────
export { THEME_CONFIG, type ThemeKey };
