'use client';

/**
 * Dashboard Collectionneurs v2.1
 * — ItemCard extracted to _components/ItemCard.tsx
 * — StatsPanel lazy-loaded (only fetched when stats tab opened)
 * — Pagination: 12 items per page to avoid large DOM on first render
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import {
  Trophy, Plus, Eye, Heart, MessageSquare,
  Star, RefreshCw,
  BarChart3, Archive, Clock, CheckCircle2, AlertCircle,
  Loader2, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedPage from '@/components/providers/ProtectedPage';
import {
  MODE_CONFIG, STATUS_CONFIG,
  type CollectionMode, type CollectionStatus, type CollectionItem,
} from '@/lib/collectionneurs-config';

// Lazy-load heavy sub-components
import ItemCard from './_components/ItemCard';
const StatsPanel = dynamic(() => import('./_components/StatsPanel'), {
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
      <span className="text-sm text-gray-400">Chargement des statistiques…</span>
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type DashTab = 'actif' | 'reserve' | 'cloture' | 'stats';

interface Stats {
  total: number;
  active: number;
  reserved: number;
  closed: number;
  totalViews: number;
  totalFavorites: number;
  totalMessages: number;
  byMode: Record<CollectionMode, number>;
}

const CLOSED_STATUSES: CollectionStatus[] = ['vendu', 'echange', 'donne', 'trouve', 'retire', 'archive'];
const PAGE_SIZE = 12;

const TABS: { key: DashTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'actif',   label: 'Actives',      icon: CheckCircle2, color: 'text-emerald-600' },
  { key: 'reserve', label: 'Réservées',    icon: Clock,        color: 'text-amber-600' },
  { key: 'cloture', label: 'Clôturées',    icon: Archive,      color: 'text-gray-500' },
  { key: 'stats',   label: 'Statistiques', icon: BarChart3,    color: 'text-blue-600' },
];

// ─── Main component ────────────────────────────────────────────────────────────

function CollectionneursDashboardContent() {
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { profile } = useAuthStore();
  const profileId   = profile?.id;

  const [tab,           setTab]          = useState<DashTab>('actif');
  const [items,         setItems]         = useState<CollectionItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [page,          setPage]          = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0, active: 0, reserved: 0, closed: 0,
    totalViews: 0, totalFavorites: 0, totalMessages: 0,
    byMode: { vente: 0, echange: 0, don: 0, recherche: 0 },
  });

  const loadItems = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('collection_items')
        .select(`
          *,
          photos:collection_item_photos(id, url, image_url, is_cover, sort_order)
        `)
        .eq('author_id', profileId)
        .order('created_at', { ascending: false });

      const mapped = (data || []).map((d: Record<string, unknown>) => ({
        ...d,
        mode: ((d.mode || (d.item_type === 'troc' ? 'echange' : d.item_type)) as CollectionMode) || 'vente',
        status: (d.status as CollectionStatus) || 'actif',
        photos: ((d.photos as Array<{ id?: string; url?: string; image_url?: string; is_cover?: boolean; sort_order?: number; preview?: string }>) || []).map(p => ({
          ...p,
          url: p.image_url || p.url,
          preview: p.image_url || p.url || '',
        })),
      })) as CollectionItem[];

      setItems(mapped);

      const active   = mapped.filter(i => i.status === 'actif').length;
      const reserved = mapped.filter(i => i.status === 'reserve').length;
      const closed   = mapped.filter(i => CLOSED_STATUSES.includes(i.status)).length;
      const byMode: Record<CollectionMode, number> = { vente: 0, echange: 0, don: 0, recherche: 0 };
      let totalViews = 0, totalFavorites = 0, totalMessages = 0;
      for (const item of mapped) {
        if (item.mode in byMode) byMode[item.mode]++;
        totalViews     += item.views_count     || 0;
        totalFavorites += item.favorites_count || 0;
        totalMessages  += item.messages_count  || 0;
      }
      setStats({ total: mapped.length, active, reserved, closed, totalViews, totalFavorites, totalMessages, byMode });
    } finally {
      setLoading(false);
    }
  }, [profileId, supabase]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Reset page when tab changes
  useEffect(() => { setPage(1); }, [tab]);

  const handleStatusChange = async (id: string, newStatus: CollectionStatus) => {
    const { error } = await supabase.from('collection_items').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Erreur lors de la mise à jour.'); return; }
    toast.success(`Statut mis à jour : ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    await supabase.from('collection_item_photos').delete().eq('item_id', id);
    const { error } = await supabase.from('collection_items').delete().eq('id', id);
    if (error) { toast.error('Erreur lors de la suppression.'); return; }
    toast.success('Annonce supprimée.');
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleteConfirm(null);
  };

  const filteredItems = items.filter(item => {
    if (tab === 'actif')   return item.status === 'actif';
    if (tab === 'reserve') return item.status === 'reserve';
    if (tab === 'cloture') return CLOSED_STATUSES.includes(item.status);
    return true;
  });

  // Paginate
  const totalPages    = Math.ceil(filteredItems.length / PAGE_SIZE);
  const pagedItems    = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Mes Collectionneurs</h1>
                <p className="text-xs text-gray-500">{stats.total} annonce{stats.total > 1 ? 's' : ''} au total</p>
              </div>
            </div>
            <button
              onClick={loadItems}
              disabled={loading}
              aria-label="Actualiser"
              className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <Link
              href="/collectionneurs/nouveau"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" /> Nouvelle annonce
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mb-px">
            {TABS.map(t => {
              const Icon  = t.icon;
              const count =
                t.key === 'actif'   ? stats.active   :
                t.key === 'reserve' ? stats.reserved :
                t.key === 'cloture' ? stats.closed   : null;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition',
                    tab === t.key ? `border-blue-500 ${t.color} bg-white` : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {count !== null && count > 0 && (
                    <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Quick stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Eye,          label: 'Vues totales',     value: stats.totalViews,     color: 'text-blue-600',    bg: 'bg-blue-50' },
            { icon: Heart,        label: 'Favoris reçus',    value: stats.totalFavorites, color: 'text-pink-600',    bg: 'bg-pink-50' },
            { icon: MessageSquare, label: 'Messages reçus',   value: stats.totalMessages,  color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: CheckCircle2, label: 'Annonces actives', value: stats.active,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats tab — lazy loaded */}
        {tab === 'stats' && (
          <StatsPanel items={items} stats={{ total: stats.total, byMode: stats.byMode }} />
        )}

        {/* List tabs */}
        {tab !== 'stats' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-600 mb-2">
                  {tab === 'actif'   ? 'Aucune annonce active'   :
                   tab === 'reserve' ? 'Aucune annonce réservée' : 'Aucune annonce clôturée'}
                </h3>
                {tab === 'actif' && (
                  <Link
                    href="/collectionneurs/nouveau"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition mt-4"
                  >
                    <Plus className="w-4 h-4" /> Créer une annonce
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Delete confirmation banner */}
                {deleteConfirm && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 flex-1">Confirmer la suppression de cette annonce ?</p>
                    <button
                      onClick={() => handleDelete(deleteConfirm)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Supprimer
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {/* Item grid */}
                <div className="space-y-3">
                  {pagedItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      ← Précédent
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Bottom shortcuts */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link href="/collectionneurs" className="flex items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition text-sm font-medium text-gray-700">
            <Eye className="w-4 h-4 text-blue-500" /> Voir la galerie publique
          </Link>
          <Link href="/collectionneurs/nouveau" className="flex items-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition text-sm font-semibold">
            <Plus className="w-4 h-4" /> Nouvelle annonce
          </Link>
          <Link href="/dashboard/avis" className="flex items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 hover:border-amber-200 hover:shadow-sm transition text-sm font-medium text-gray-700">
            <Star className="w-4 h-4 text-amber-500" /> Voir mes avis
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CollectionneursDashboardPage() {
  return (
    <ProtectedPage>
      <CollectionneursDashboardContent />
    </ProtectedPage>
  );
}
