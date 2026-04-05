'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package, Wrench, Heart, Calendar, Footprints, BookOpen,
  Handshake, MapPin, Plus, Edit3, Eye, Pause, Trash2,
  RotateCcw, Share2, ChevronRight, Loader2, ArrowLeft,
  Filter, Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { cn, formatRelative } from '@/lib/utils';
import ProtectedPage from '@/components/providers/ProtectedPage';
import Avatar from '@/components/ui/Avatar';

// ─── Types ─────────────────────────────────────────────────────────────────────
type ContentTheme = 'all' | 'listing' | 'equipment' | 'help' | 'event' | 'outing' | 'forum' | 'association';

interface ContentItem {
  id: string;
  type: ContentTheme;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  views?: number;
  responses?: number;
  href: string;
  editHref?: string;
  image?: string;
  location?: string;
  date?: string;
  isClosed?: boolean;
}

// ─── Status labels ─────────────────────────────────────────────────────────────
const STATUS_FR: Record<string, string> = {
  active: 'Actif', available: 'Disponible', unavailable: 'Indisponible',
  reserved: 'Réservé', sold: 'Vendu', archived: 'Archivé', expired: 'Expiré',
  open: 'Ouvert', resolved: 'Résolu', paused: 'En pause', draft: 'Brouillon',
  pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé',
  done: 'Terminé', cancelled: 'Annulé', full: 'Complet',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700', available: 'bg-emerald-100 text-emerald-700',
  open: 'bg-emerald-100 text-emerald-700', approved: 'bg-emerald-100 text-emerald-700',
  reserved: 'bg-amber-100 text-amber-700', pending: 'bg-amber-100 text-amber-700',
  paused: 'bg-orange-100 text-orange-700', full: 'bg-orange-100 text-orange-700',
  sold: 'bg-gray-100 text-gray-500', archived: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600', cancelled: 'bg-red-100 text-red-600',
  rejected: 'bg-red-100 text-red-600', done: 'bg-teal-100 text-teal-700',
  resolved: 'bg-teal-100 text-teal-700', unavailable: 'bg-gray-100 text-gray-500',
  draft: 'bg-gray-100 text-gray-500',
};

const THEMES: { key: ContentTheme; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: 'all',         label: 'Tous',         icon: Filter,    color: 'text-gray-600',    bg: 'bg-gray-100' },
  { key: 'listing',     label: 'Annonces',     icon: Package,   color: 'text-blue-600',    bg: 'bg-blue-100' },
  { key: 'equipment',   label: 'Matériel',     icon: Wrench,    color: 'text-sky-600',     bg: 'bg-sky-100' },
  { key: 'help',        label: 'Entraide',     icon: Heart,     color: 'text-rose-600',    bg: 'bg-rose-100' },
  { key: 'event',       label: 'Événements',   icon: Calendar,  color: 'text-purple-600',  bg: 'bg-purple-100' },
  { key: 'outing',      label: 'Promenades',   icon: Footprints,color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { key: 'forum',       label: 'Forum',        icon: BookOpen,  color: 'text-violet-600',  bg: 'bg-violet-100' },
  { key: 'association', label: 'Associations', icon: Handshake, color: 'text-teal-600',    bg: 'bg-teal-100' },
];

// ─── Content card ─────────────────────────────────────────────────────────────
function ContentCard({ item }: { item: ContentItem }) {
  const theme = THEMES.find(t => t.key === item.type) || THEMES[0];
  const ThemeIcon = theme.icon;

  return (
    <div className={cn(
      'bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-all group',
      item.isClosed ? 'border-gray-100 opacity-70' : 'border-gray-100 hover:border-gray-200',
    )}>
      {item.image ? (
        <div className="h-28 overflow-hidden">
          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className={cn('h-16 flex items-center justify-center', theme.bg)}>
          <ThemeIcon className={cn('w-7 h-7', theme.color)} />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded', theme.bg, theme.color)}>
            <ThemeIcon className="w-3 h-3" />{theme.label}
          </span>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', STATUS_COLOR[item.status] || 'bg-gray-100 text-gray-500')}>
            {STATUS_FR[item.status] || item.status}
          </span>
        </div>
        <Link href={item.href}>
          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-brand-700 transition-colors mb-1">{item.title}</h3>
        </Link>
        {item.location && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" />{item.location}</p>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <span className="text-[10px] text-gray-400">{formatRelative(item.createdAt)}</span>
          <div className="flex items-center gap-1">
            {item.views !== undefined && item.views > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><Eye className="w-3 h-3" />{item.views}</span>
            )}
            {item.editHref && (
              <Link href={item.editHref} className="p-1 rounded-lg hover:bg-brand-50 hover:text-brand-600 text-gray-400 transition-colors" title="Modifier">
                <Edit3 className="w-3.5 h-3.5" />
              </Link>
            )}
            <Link href={item.href} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Voir">
              <Eye className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function MesContenusContent() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [activeTheme, setActiveTheme] = useState<ContentTheme>('all');
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];

      const [
        { data: listings },
        { data: equipment },
        { data: helps },
        { data: events },
        { data: outings },
        { data: forum },
        { data: associations },
      ] = await Promise.all([
        supabase.from('listings').select('id, title, description, status, views, created_at, location, photos:listing_photos(url)').eq('user_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('equipment_items').select('id, title, description, is_available, pickup_location, created_at, photos:equipment_photos(url)').eq('owner_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('help_requests').select('id, title, description, status, location_city, created_at').eq('author_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('events').select('id, title, description, status, location, event_date, created_at, photos:event_photos(url)').eq('author_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('group_outings').select('id, title, description, status, meeting_point, outing_date, created_at, photos:outing_photos(url)').eq('organizer_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('forum_posts').select('id, title, content, views, created_at').eq('author_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('associations').select('id, name, description_short, status, location, created_at, logo_url').eq('author_id', profile.id).order('created_at', { ascending: false }),
      ]);

      const all: ContentItem[] = [
        ...(listings || []).map((l: Record<string, unknown>) => ({
          id: l.id as string, type: 'listing' as ContentTheme, title: l.title as string,
          status: l.status as string, createdAt: l.created_at as string, views: l.views as number,
          href: `/annonces/${l.id}`, editHref: `/annonces/${l.id}/modifier`,
          image: ((l.photos as {url: string}[]) || [])[0]?.url, location: l.location as string,
          isClosed: ['sold', 'archived', 'expired'].includes(l.status as string),
        })),
        ...(equipment || []).map((e: Record<string, unknown>) => ({
          id: e.id as string, type: 'equipment' as ContentTheme, title: e.title as string,
          status: (e.is_available ? 'available' : 'unavailable') as string, createdAt: e.created_at as string,
          href: `/materiel/${e.id}`, editHref: `/materiel/${e.id}/modifier`,
          image: ((e.photos as {url: string}[]) || [])[0]?.url, location: e.pickup_location as string,
          isClosed: !(e.is_available as boolean),
        })),
        ...(helps || []).map((h: Record<string, unknown>) => ({
          id: h.id as string, type: 'help' as ContentTheme, title: h.title as string,
          status: h.status as string, createdAt: h.created_at as string,
          href: `/coups-de-main#${h.id}`, location: h.location_city as string,
          isClosed: ['resolved', 'cancelled'].includes(h.status as string),
        })),
        ...(events || []).map((e: Record<string, unknown>) => ({
          id: e.id as string, type: 'event' as ContentTheme, title: e.title as string,
          status: e.status as string, createdAt: e.created_at as string,
          href: `/evenements`, image: ((e.photos as {url: string}[]) || [])[0]?.url,
          location: e.location as string, date: e.event_date as string,
          isClosed: ['done', 'cancelled'].includes(e.status as string),
        })),
        ...(outings || []).map((o: Record<string, unknown>) => ({
          id: o.id as string, type: 'outing' as ContentTheme, title: o.title as string,
          status: o.status as string, createdAt: o.created_at as string,
          href: `/promenades`, image: ((o.photos as {url: string}[]) || [])[0]?.url,
          location: o.meeting_point as string, date: o.outing_date as string,
          isClosed: ['done', 'cancelled'].includes(o.status as string),
        })),
        ...(forum || []).map((f: Record<string, unknown>) => ({
          id: f.id as string, type: 'forum' as ContentTheme, title: f.title as string,
          status: 'active', createdAt: f.created_at as string, views: f.views as number,
          href: `/forum/${f.id}`, isClosed: false,
        })),
        ...(associations || []).map((a: Record<string, unknown>) => ({
          id: a.id as string, type: 'association' as ContentTheme, title: a.name as string,
          status: a.status as string, createdAt: a.created_at as string,
          href: `/associations`, image: a.logo_url as string, location: a.location as string,
          isClosed: ['inactive', 'draft'].includes(a.status as string),
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setItems(all);
      setLoading(false);
    };
    load();
  }, [profile?.id]);

  const filtered = items.filter(item => {
    if (activeTheme !== 'all' && item.type !== activeTheme) return false;
    if (!showClosed && item.isClosed) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const closedCount = items.filter(i => i.isClosed && (activeTheme === 'all' || i.type === activeTheme)).length;
  const activeCount = items.filter(i => !i.isClosed && (activeTheme === 'all' || i.type === activeTheme)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-black text-gray-900">Mes contenus</h1>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{activeCount} actifs</span>
          </div>
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher dans mes contenus…"
              className="w-full pl-9 pr-4 h-9 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition-all"
            />
          </div>
          {/* Theme filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {THEMES.map(t => {
              const Icon = t.icon;
              const count = items.filter(i => (t.key === 'all' || i.type === t.key) && !i.isClosed).length;
              return (
                <button key={t.key} onClick={() => setActiveTheme(t.key)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border',
                    activeTheme === t.key
                      ? cn(t.bg, t.color, 'border-current')
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                  )}>
                  <Icon className="w-3 h-3" />{t.label}
                  {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-bold text-gray-700 mb-1">Aucun contenu trouvé</p>
            <p className="text-sm text-gray-500">{showClosed ? 'Aucun contenu dans cette catégorie.' : 'Essayez d\'afficher les contenus fermés.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(item => <ContentCard key={item.id} item={item} />)}
          </div>
        )}

        {/* Toggle closed */}
        {closedCount > 0 && (
          <button
            onClick={() => setShowClosed(!showClosed)}
            className="mt-6 w-full py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            {showClosed ? 'Masquer' : `Afficher ${closedCount} contenu(s) archivé(s) / fermé(s)`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MesContenusPage() {
  return <ProtectedPage><Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}><MesContenusContent /></Suspense></ProtectedPage>;
}
