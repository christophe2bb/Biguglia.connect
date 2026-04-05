'use client';

/**
 * Dashboard Collectionneurs v2.0 Premium
 * Gestion complète : annonces actives, réservées, clôturées, stats, actions rapides
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRelative, cn } from '@/lib/utils';
import {
  Trophy, Plus, Eye, Heart, MessageSquare, ArrowLeftRight, Gift,
  Search, Tag, Star, Pencil, Trash2, RefreshCw, TrendingUp,
  BarChart3, Archive, Clock, CheckCircle2, AlertCircle,
  ChevronRight, Gem, Loader2, Filter, Zap, Share2,
  Package, Truck, BadgeCheck, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedPage from '@/components/providers/ProtectedPage';
import Avatar from '@/components/ui/Avatar';
import {
  MODE_CONFIG, STATUS_CONFIG,
  type CollectionMode, type CollectionStatus, type CollectionItem,
} from '@/lib/collectionneurs-config';

// ─── Types ────────────────────────────────────────────────────────────────────

type DashTab = 'actif' | 'reserve' | 'cloture' | 'brouillon' | 'stats';

interface Stats {
  total: number;
  active: number;
  reserved: number;
  closed: number;
  totalViews: number;
  totalFavorites: number;
  totalMessages: number;
  totalOffers: number;
  byMode: Record<CollectionMode, number>;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CLOSED_STATUSES: CollectionStatus[] = ['vendu', 'echange', 'donne', 'trouve', 'retire', 'archive'];

const TABS: { key: DashTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'actif',     label: 'Actives',    icon: CheckCircle2, color: 'text-emerald-600' },
  { key: 'reserve',   label: 'Réservées',  icon: Clock,        color: 'text-amber-600' },
  { key: 'cloture',   label: 'Clôturées',  icon: Archive,      color: 'text-gray-500' },
  { key: 'stats',     label: 'Statistiques', icon: BarChart3,  color: 'text-blue-600' },
];

// ─── Carte annonce ────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onStatusChange,
  onDelete,
}: {
  item: CollectionItem;
  onStatusChange: (id: string, status: CollectionStatus) => void;
  onDelete: (id: string) => void;
}) {
  const modeCfg = MODE_CONFIG[item.mode] || MODE_CONFIG.vente;
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.actif;
  const ModeIcon = modeCfg.icon;

  const coverPhoto = item.photos?.find(p => p.is_cover) || item.photos?.[0];

  return (
    <div className={cn(
      'bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-all group',
      statusCfg.closed ? 'border-gray-100 opacity-75' : 'border-gray-100 hover:border-blue-200',
    )}>
      <div className="flex gap-3 p-3">
        {/* Miniature */}
        <Link href={`/collectionneurs/${item.id}`} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
          {coverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPhoto.url || coverPhoto.preview || ''} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Gem className="w-8 h-8" />
            </div>
          )}
        </Link>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link href={`/collectionneurs/${item.id}`} className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-blue-600 transition">
              {item.title}
            </Link>
            <span className={cn('flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold', statusCfg.bg, statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', modeCfg.bg, modeCfg.color, modeCfg.border)}>
              <ModeIcon className="w-3 h-3" />
              {modeCfg.label}
            </span>
            {item.mode === 'vente' && item.price != null && (
              <span className="text-sm font-bold text-blue-700">{Number(item.price).toLocaleString('fr-FR')} €</span>
            )}
            {item.rarity_level && item.rarity_level !== 'commun' && (
              <span className="text-xs">{['rare','tres_rare','unique'].includes(item.rarity_level) ? '💎' : '✨'}</span>
            )}
          </div>

          {/* Métriques */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {item.views_count ?? 0}</span>
            <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {item.favorites_count ?? 0}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {item.messages_count ?? 0}</span>
            <span className="ml-auto">{formatRelative(item.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      {!statusCfg.closed && (
        <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
          <Link href={`/collectionneurs/${item.id}/modifier`}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </Link>

          {item.status === 'actif' && (
            <button onClick={() => onStatusChange(item.id, 'reserve')}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition">
              <Clock className="w-3.5 h-3.5" /> Réserver
            </button>
          )}
          {item.status === 'reserve' && (
            <button onClick={() => onStatusChange(item.id, 'actif')}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition">
              <CheckCircle2 className="w-3.5 h-3.5" /> Remettre actif
            </button>
          )}

          {/* Marquer comme terminé selon mode */}
          {item.status !== 'archive' && (
            <button onClick={() => onStatusChange(item.id,
              item.mode === 'vente' ? 'vendu' :
              item.mode === 'echange' ? 'echange' :
              item.mode === 'don' ? 'donne' : 'trouve'
            )}
              className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition ml-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {item.mode === 'vente' ? 'Marquer vendu' :
               item.mode === 'echange' ? 'Échangé ✓' :
               item.mode === 'don' ? 'Donné ✓' : 'Trouvé ✓'}
            </button>
          )}

          <button onClick={() => onDelete(item.id)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition ml-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {statusCfg.closed && (
        <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
          <button onClick={() => onStatusChange(item.id, 'archive')}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition">
            <Archive className="w-3.5 h-3.5" /> Archiver
          </button>
          <Link href={`/collectionneurs/${item.id}`}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition ml-auto">
            <Eye className="w-3.5 h-3.5" /> Voir
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

function CollectionneursDashboardContent() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useAuthStore();

  const [tab, setTab] = useState<DashTab>('actif');
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0, active: 0, reserved: 0, closed: 0,
    totalViews: 0, totalFavorites: 0, totalMessages: 0, totalOffers: 0,
    byMode: { vente: 0, echange: 0, don: 0, recherche: 0 },
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadItems = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('collection_items')
        .select(`
          *,
          photos:collection_item_photos(id, url, image_url, is_cover, sort_order)
        `)
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false });

      const mapped = (data || []).map((d: Record<string, unknown>) => ({
        ...d,
        mode: ((d.mode || (d.item_type === 'troc' ? 'echange' : d.item_type)) as CollectionMode) || 'vente',
        status: (d.status as CollectionStatus) || 'actif',
        photos: ((d.photos as Array<{id?: string; url?: string; image_url?: string; is_cover?: boolean; sort_order?: number; preview?: string}>) || []).map(p => ({
          ...p,
          url: p.image_url || p.url,
          preview: p.image_url || p.url || '',
        })),
      })) as CollectionItem[];

      setItems(mapped);

      // Calcul stats
      const active = mapped.filter(i => i.status === 'actif').length;
      const reserved = mapped.filter(i => i.status === 'reserve').length;
      const closed = mapped.filter(i => CLOSED_STATUSES.includes(i.status)).length;
      const byMode = { vente: 0, echange: 0, don: 0, recherche: 0 };
      let totalViews = 0, totalFavorites = 0, totalMessages = 0;
      for (const item of mapped) {
        if (item.mode in byMode) byMode[item.mode]++;
        totalViews += item.views_count || 0;
        totalFavorites += item.favorites_count || 0;
        totalMessages += item.messages_count || 0;
      }

      setStats({ total: mapped.length, active, reserved, closed, totalViews, totalFavorites, totalMessages, totalOffers: 0, byMode });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Filtres par onglet
  const filteredItems = items.filter(item => {
    if (tab === 'actif') return item.status === 'actif';
    if (tab === 'reserve') return item.status === 'reserve';
    if (tab === 'cloture') return CLOSED_STATUSES.includes(item.status);
    if (tab === 'brouillon') return (item.status as string) === 'brouillon';
    return true;
  });

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
            <Link href="/collectionneurs/nouveau"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Nouvelle annonce
            </Link>
          </div>

          {/* Onglets */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mb-px">
            {TABS.map(t => {
              const Icon = t.icon;
              const count = t.key === 'actif' ? stats.active : t.key === 'reserve' ? stats.reserved : t.key === 'cloture' ? stats.closed : null;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition',
                    tab === t.key ? `border-blue-500 ${t.color} bg-white` : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}>
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
        {/* ── Stats rapides ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Eye, label: 'Vues totales', value: stats.totalViews, color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: Heart, label: 'Favoris reçus', value: stats.totalFavorites, color: 'text-pink-600', bg: 'bg-pink-50' },
            { icon: MessageSquare, label: 'Messages reçus', value: stats.totalMessages, color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: CheckCircle2, label: 'Annonces actives', value: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

        {/* ── Onglet Statistiques ────────────────────────────────────────── */}
        {tab === 'stats' && (
          <div className="space-y-4">
            {/* Répartition par mode */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" /> Répartition par mode
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(MODE_CONFIG) as [CollectionMode, typeof MODE_CONFIG.vente][]).map(([mode, cfg]) => {
                  const Icon = cfg.icon;
                  const count = stats.byMode[mode] || 0;
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={mode} className={cn('p-4 rounded-2xl border', cfg.bg, cfg.border)}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn('w-4 h-4', cfg.color)} />
                        <span className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', cfg.dot)} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{pct}% du total</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top annonces */}
            {items.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" /> Top annonces (par vues)
                </h3>
                <div className="space-y-2">
                  {[...items].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5).map((item, rank) => (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="w-6 h-6 bg-gray-100 rounded-full text-xs font-bold text-gray-500 flex items-center justify-center flex-shrink-0">
                        {rank + 1}
                      </span>
                      <Link href={`/collectionneurs/${item.id}`} className="flex-1 text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-1 transition">
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.views_count || 0}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{item.favorites_count || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conseils */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-5">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5" /> Conseils pour booster vos annonces
              </h3>
              <ul className="space-y-2 text-sm text-amber-700">
                {[
                  'Ajoutez au moins 5 photos de qualité (vues différentes, détails)',
                  'Renseignez la marque, l\'époque et la rareté pour mieux cibler les collectionneurs',
                  'Répondez rapidement aux messages — ça améliore votre score de réactivité',
                  'Indiquez honnêtement les défauts — la transparence inspire confiance',
                  'Utilisez des tags précis pour apparaître dans plus de recherches',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Onglets liste ──────────────────────────────────────────────── */}
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
                  {tab === 'actif' ? 'Aucune annonce active' :
                   tab === 'reserve' ? 'Aucune annonce réservée' :
                   tab === 'cloture' ? 'Aucune annonce clôturée' : 'Aucun brouillon'}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  {tab === 'actif' ? 'Publiez votre premier objet de collection.' : ''}
                </p>
                {tab === 'actif' && (
                  <Link href="/collectionneurs/nouveau"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
                    <Plus className="w-4 h-4" /> Créer une annonce
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Confirmation de suppression */}
                {deleteConfirm && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 flex-1">Confirmer la suppression de cette annonce ?</p>
                    <button onClick={() => handleDelete(deleteConfirm)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition">
                      Supprimer
                    </button>
                    <button onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition">
                      Annuler
                    </button>
                  </div>
                )}

                {filteredItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Raccourcis en bas ─────────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link href="/collectionneurs"
            className="flex items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition text-sm font-medium text-gray-700">
            <Eye className="w-4 h-4 text-blue-500" /> Voir la galerie publique
          </Link>
          <Link href="/collectionneurs/nouveau"
            className="flex items-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition text-sm font-semibold">
            <Plus className="w-4 h-4" /> Nouvelle annonce
          </Link>
          <Link href="/dashboard/avis"
            className="flex items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 hover:border-amber-200 hover:shadow-sm transition text-sm font-medium text-gray-700">
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
