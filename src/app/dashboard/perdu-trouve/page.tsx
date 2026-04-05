'use client';

/**
 * Biguglia Connect — Dashboard Perdu / Trouvé
 * Tableau de bord personnel : mes annonces, statuts, correspondances, historique.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  ArrowLeft, Search, Plus, Loader2, AlertCircle, MapPin, Clock,
  CheckCircle2, Archive, XCircle, Eye, Pencil, Trash2,
  MessageSquare, Zap, Shield, Package, Bell, BarChart3,
  ChevronRight, RefreshCw, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type LFType = 'perdu' | 'trouve';
type LFStatus =
  | 'perdu' | 'trouve' | 'identifie' | 'restitue' | 'clos' | 'archive' | 'draft';

type LFItem = {
  id: string;
  type: LFType;
  status: LFStatus;
  title: string;
  category: string;
  description: string;
  location_area: string;
  lost_date: string;
  is_sensitive: boolean;
  keep_secret: boolean;
  contact_name: string;
  deposited_at: string | null;
  reward: string | null;
  sentimental_value: boolean;
  matched_item_id: string | null;
  closed_at: string | null;
  archived_at: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  photos?: { url: string; display_order?: number }[];
  _comment_count?: number;
};

type LFMatch = {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  match_score: number;
  match_status: 'suggested' | 'confirmed' | 'rejected';
  created_at: string;
  lost_item?: { title: string; category: string; location_area: string } | null;
  found_item?: { title: string; category: string; location_area: string } | null;
};

type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
};

const STATUS_CONFIG: Record<LFStatus, StatusConfig> = {
  perdu:     { label: 'Perdu',     color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-300', icon: '🔴' },
  trouve:    { label: 'Trouvé',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '🟢' },
  identifie: { label: 'Identifié', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300',   icon: '🔵' },
  restitue:  { label: 'Restitué',  color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300', icon: '✅' },
  clos:      { label: 'Clos',      color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-300',   icon: '⚫' },
  archive:   { label: 'Archivé',   color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',  icon: '📦' },
  draft:     { label: 'Brouillon', color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-300', icon: '✏️' },
};

const ACTIVE_STATUSES: LFStatus[] = ['perdu', 'trouve', 'identifie'];
const HISTORY_STATUSES: LFStatus[] = ['restitue', 'clos', 'archive'];

// Sections dashboard
const SECTIONS = [
  { key: 'actifs',       label: 'En cours',        icon: Bell,          color: 'text-orange-600',  statuses: ACTIVE_STATUSES },
  { key: 'restitues',    label: 'Restitués',        icon: CheckCircle2,  color: 'text-purple-600',  statuses: ['restitue'] as LFStatus[] },
  { key: 'clos',         label: 'Clos',             icon: XCircle,       color: 'text-gray-600',    statuses: ['clos'] as LFStatus[] },
  { key: 'archives',     label: 'Archivés',         icon: Archive,       color: 'text-slate-500',   statuses: ['archive', 'draft'] as LFStatus[] },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

// ─── Mini badge statut ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LFStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.perdu;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Carte annonce ────────────────────────────────────────────────────────────
function ItemCard({
  item,
  onStatusChange,
  onDelete,
}: {
  item: LFItem;
  onStatusChange: (id: string, s: LFStatus) => void;
  onDelete: (id: string) => void;
}) {
  const ALLOWED: Record<LFStatus, LFStatus[]> = {
    perdu:     ['identifie', 'clos'],
    trouve:    ['identifie', 'clos'],
    identifie: ['restitue', 'clos', 'perdu', 'trouve'],
    restitue:  ['archive'],
    clos:      ['archive'],
    archive:   [],
    draft:     ['perdu', 'trouve'],
  };

  const coverPhoto = item.photos?.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];
  const transitions = ALLOWED[item.status] ?? [];
  const isActive = ACTIVE_STATUSES.includes(item.status);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
      isActive
        ? item.type === 'perdu' ? 'border-orange-200' : 'border-emerald-200'
        : 'border-gray-100 opacity-80'
    }`}>
      <div className="flex gap-0">
        {/* Photo */}
        <div className="w-20 h-20 flex-shrink-0 overflow-hidden">
          {coverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPhoto.url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${
              item.type === 'perdu' ? 'bg-orange-50' : 'bg-emerald-50'
            }`}>
              <Package className="w-8 h-8 text-gray-200" />
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={item.status} />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                item.type === 'perdu' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {item.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé'}
              </span>
              {item.is_sensitive && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" /> Sensible
                </span>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Link href={`/perdu-trouve#${item.id}`}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir">
                <Eye className="w-3.5 h-3.5" />
              </Link>
              <Link href={`/perdu-trouve?edit=${item.id}`}
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Modifier">
                <Pencil className="w-3.5 h-3.5" />
              </Link>
              <button onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Archiver">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-sm font-bold text-gray-900 truncate mb-1">{item.title}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location_area}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(item.created_at)}</span>
            {item._comment_count !== undefined && item._comment_count > 0 && (
              <span className="flex items-center gap-1 text-blue-500">
                <MessageSquare className="w-3 h-3" /> {item._comment_count}
              </span>
            )}
          </div>

          {/* Transitions */}
          {transitions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {transitions.map(t => {
                const cfg = STATUS_CONFIG[t];
                return (
                  <button key={t}
                    onClick={() => onStatusChange(item.id, t)}
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg border transition-colors ${cfg.bg} ${cfg.color} ${cfg.border} hover:opacity-80`}>
                    {cfg.icon} → {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DashboardPerduTrouvePage() {
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [items, setItems] = useState<LFItem[]>([]);
  const [matches, setMatches] = useState<LFMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey>('actifs');
  const [search, setSearch] = useState('');
  const [dbReady, setDbReady] = useState(true);

  // ── Stats calculées ────────────────────────────────────────────────────────
  const countByStatus = (statuses: LFStatus[]) =>
    items.filter(i => statuses.includes(i.status)).length;

  const statsCards = [
    { label: 'En cours', count: countByStatus(ACTIVE_STATUSES), color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Bell },
    { label: 'Restitués', count: countByStatus(['restitue']), color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: CheckCircle2 },
    { label: 'Clos', count: countByStatus(['clos']), color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: XCircle },
    { label: 'Total', count: items.length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: BarChart3 },
  ];

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: itemsData, error } = await supabase
      .from('lost_found_items')
      .select('*, photos:lf_photos(url, display_order)')
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation')) {
        setDbReady(false);
      }
      setLoading(false);
      return;
    }
    setDbReady(true);

    // Count comments per item
    const ids = (itemsData ?? []).map((i: LFItem) => i.id);
    let commentCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: cData } = await supabase
        .from('lf_comments')
        .select('item_id')
        .in('item_id', ids);
      (cData ?? []).forEach((c: { item_id: string }) => {
        commentCounts[c.item_id] = (commentCounts[c.item_id] ?? 0) + 1;
      });
    }

    const enriched = (itemsData ?? []).map((i: LFItem) => ({
      ...i,
      photos: (i.photos ?? []).sort((a: { display_order?: number }, b: { display_order?: number }) =>
        (a.display_order ?? 0) - (b.display_order ?? 0)),
      _comment_count: commentCounts[i.id] ?? 0,
    }));
    setItems(enriched as LFItem[]);

    // Fetch matches involving user's items
    if (ids.length > 0) {
      const { data: matchData } = await supabase
        .from('lf_matches')
        .select(`
          *,
          lost_item:lost_found_items!lf_matches_lost_item_id_fkey(title, category, location_area),
          found_item:lost_found_items!lf_matches_found_item_id_fkey(title, category, location_area)
        `)
        .or(ids.map((id: string) => `lost_item_id.eq.${id},found_item_id.eq.${id}`).join(','))
        .order('created_at', { ascending: false })
        .limit(20);
      setMatches((matchData ?? []) as LFMatch[]);
    } else {
      setMatches([]);
    }

    setLoading(false);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, newStatus: LFStatus) => {
    const cfg = STATUS_CONFIG[newStatus];
    if (!confirm(`Passer en "${cfg.label}" ?`)) return;
    const now = new Date().toISOString();
    const updates: Record<string, string> = { status: newStatus, updated_at: now };
    if (newStatus === 'restitue') updates.restitution_confirmed_at = now;
    if (newStatus === 'clos') updates.closed_at = now;
    if (newStatus === 'archive') updates.archived_at = now;
    await supabase.from('lost_found_items').update(updates).eq('id', id);
    // Log history
    const item = items.find(i => i.id === id);
    try {
      await supabase.from('lf_status_history').insert({
        item_id: id,
        old_status: item?.status,
        new_status: newStatus,
        changed_by: profile?.id,
      });
    } catch { /* silencieux si table absente */ }

    // Créer une trust_interaction lors d'une restitution confirmée
    if (newStatus === 'restitue' && profile) {
      try {
        await supabase.from('trust_interactions').insert({
          source_type: 'lost_found',
          source_id: id,
          requester_id: profile.id,
          receiver_id: item?.author_id ?? profile.id,
          interaction_type: 'transaction',
          status: 'done',
          requester_review_allowed: true,
          receiver_review_allowed: true,
          completed_at: new Date().toISOString(),
        });
      } catch { /* silencieux si table absente */ }
    }

    toast.success(`${cfg.icon} Statut mis à jour : ${cfg.label}`);
    fetchData();
  };

  // ── Delete (soft) ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Archiver cette annonce ?')) return;
    await supabase.from('lost_found_items').update({
      status: 'archive',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    toast.success('📦 Annonce archivée');
    fetchData();
  };

  // ── Filtered items ─────────────────────────────────────────────────────────
  const sectionStatuses = SECTIONS.find(s => s.key === activeSection)?.statuses ?? ACTIVE_STATUSES;
  const displayedItems = items
    .filter(i => sectionStatuses.includes(i.status))
    .filter(i =>
      !search.trim() ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.location_area.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
    );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Connectez-vous pour accéder à votre tableau de bord</p>
          <Link href="/connexion"
            className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-600 transition-all">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* DB warning */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Tables manquantes.</strong> Exécutez le SQL depuis{' '}
              <Link href="/admin/migration" className="underline">Admin → Migration</Link>.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-emerald-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/perdu-trouve" className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black">Mes dossiers Perdu / Trouvé</h1>
              <p className="text-amber-100 text-sm">Gérez vos annonces, suivez les correspondances</p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {statsCards.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white/20 border border-white/25 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Icon className="w-4 h-4 text-white/80" />
                    <span className="text-2xl font-black text-white">{s.count}</span>
                  </div>
                  <p className="text-xs text-amber-100 font-medium">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Matches banner */}
        {matches.filter(m => m.match_status === 'suggested').length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-bold text-blue-800">
                {matches.filter(m => m.match_status === 'suggested').length} correspondance{matches.filter(m => m.match_status === 'suggested').length > 1 ? 's' : ''} suggérée{matches.filter(m => m.match_status === 'suggested').length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-2">
              {matches.filter(m => m.match_status === 'suggested').slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-blue-100">
                  <div className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-1 rounded-full flex-shrink-0">
                    {m.match_score}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">
                      {m.lost_item?.title ?? 'Objet perdu'} ↔ {m.found_item?.title ?? 'Objet trouvé'}
                    </p>
                    <p className="text-xs text-gray-500">{m.lost_item?.location_area} · {m.found_item?.location_area}</p>
                  </div>
                  <Link href="/perdu-trouve"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 flex-shrink-0">
                    Voir <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Link href="/perdu-trouve"
            className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Nouvelle annonce
          </Link>
          <Link href="/perdu-trouve"
            className="inline-flex items-center gap-2 bg-white text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-all">
            <Search className="w-4 h-4" /> Voir toutes les annonces
          </Link>
          <button onClick={fetchData}
            className="inline-flex items-center gap-2 bg-white text-gray-500 font-semibold px-4 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-all">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>

        {/* Navigation sections */}
        <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm overflow-x-auto">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const count = countByStatus([...s.statuses]);
            return (
              <button key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  activeSection === s.key ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
                {count > 0 && (
                  <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
                    activeSection === s.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrer par titre, lieu, catégorie…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? 'Aucune annonce correspondant à votre recherche' : `Aucune annonce dans cette section`}
            </p>
            {activeSection === 'actifs' && !search && (
              <Link href="/perdu-trouve"
                className="mt-4 inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-all">
                <Plus className="w-4 h-4" /> Publier une annonce
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium mb-2">
              {displayedItems.length} annonce{displayedItems.length > 1 ? 's' : ''}
            </p>
            {displayedItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Graphique activité */}
        {items.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-bold text-gray-800">Activité — 12 derniers mois</h3>
            </div>
            <ActivityChart items={items} />
          </div>
        )}

        {/* Info block */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🔒', title: 'Confidentialité', desc: 'Les détails privés ne sont jamais publiés. Seule la plateforme peut les partager lors de la restitution.' },
            { icon: '⚡', title: 'Correspondances', desc: 'Le moteur compare automatiquement catégorie, lieu, date, couleur et marque pour suggérer des correspondances.' },
            { icon: '📦', title: 'Archivage auto', desc: 'Les annonces de plus de 60 jours sont archivées automatiquement. Vous pouvez les rouvrir à tout moment.' },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
              <span className="text-2xl">{b.icon}</span>
              <div>
                <p className="text-sm font-bold text-gray-800">{b.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Graphique d'activité ─────────────────────────────────────────────────────
function ActivityChart({ items }: { items: LFItem[] }) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return { label: d.toLocaleDateString('fr-FR', { month: 'short' }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
  });

  const perdus = months.map(m => items.filter(it => it.type === 'perdu' && it.created_at.startsWith(m.key)).length);
  const trouves = months.map(m => items.filter(it => it.type === 'trouve' && it.created_at.startsWith(m.key)).length);
  const maxVal = Math.max(...perdus, ...trouves, 1);

  return (
    <div>
      <div className="flex items-end gap-1.5 h-24 mb-2">
        {months.map((m, i) => (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex flex-col-reverse gap-0.5">
              <div
                className="w-full bg-orange-400 rounded-t transition-all"
                style={{ height: `${Math.max((perdus[i] / maxVal) * 80, perdus[i] > 0 ? 4 : 0)}px` }}
                title={`${perdus[i]} perdu(s)`}
              />
              <div
                className="w-full bg-emerald-400 rounded-t transition-all"
                style={{ height: `${Math.max((trouves[i] / maxVal) * 80, trouves[i] > 0 ? 4 : 0)}px` }}
                title={`${trouves[i]} trouvé(s)`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {months.map(m => (
          <div key={m.key} className="flex-1 text-center text-[9px] text-gray-400 truncate">{m.label}</div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 inline-block" />Perdus</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />Trouvés</span>
      </div>
    </div>
  );
}
