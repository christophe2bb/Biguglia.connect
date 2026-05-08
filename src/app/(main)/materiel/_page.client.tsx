'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Filter, Package, Users, Gift } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';
import { CONDITION_LABELS } from '@/lib/utils';
import { EQUIPMENT_STATUS_CONFIG, EquipmentStatus } from '@/lib/equipment';
import type { EquipmentItemFull } from '@/lib/equipment';
import SectionTracker from '@/components/ui/SectionTracker';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'disponible', label: '✅ Disponible uniquement' },
  { value: 'all',        label: '🔍 Tout afficher' },
  { value: 'reserve',    label: '🔒 Réservé' },
  { value: 'prete',      label: '🔄 Prêté' },
  { value: 'indisponible', label: '⛔ Indisponible' },
];

const PAGE_SIZE = 12;

export default function MaterielPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [items, setItems] = useState<EquipmentItemFull[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('disponible');
  const [onlyFree, setOnlyFree] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [sectorCounts, setSectorCounts] = useState<Record<string, number>>({});

  const catsRef = useRef<{ id: string; name: string; icon: string; slug: string }[]>([]);

  // Stable fetch function — does NOT depend on state directly, receives all params as arguments
  const fetchData = useCallback(async (
    pageIndex: number,
    replace: boolean,
    opts: {
      category: string;
      status: string;
      free: boolean;
      sector: string | null;
    }
  ) => {
    if (pageIndex === 0) setLoading(true); else setLoadingMore(true);
    const supabase = createClient();

    // Fetch categories once (on first load)
    if (pageIndex === 0) {
      const { data: cats } = await supabase.from('equipment_categories').select('*').order('display_order');
      const currentCats = (cats || []) as typeof catsRef.current;
      catsRef.current = currentCats;
      setCategories(currentCats);
    }

    const currentCats = catsRef.current;

    let query = supabase
      .from('equipment_items')
      .select('*, owner:profiles!equipment_items_owner_id_fkey(id, full_name, avatar_url), category:equipment_categories(*), photos:equipment_photos(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

    if (opts.status !== 'all') {
      query = query.eq('status', opts.status);
    } else {
      query = query.neq('status', 'archive');
    }

    if (opts.category) {
      const cat = currentCats.find((c) => c.slug === opts.category);
      if (cat) query = query.eq('category_id', cat.id);
    }

    if (opts.free) query = query.eq('is_free', true);

    if (opts.sector) {
      try { query = query.eq('sector_id', opts.sector); } catch { /* colonne optionnelle */ }
    }

    const { data, count } = await query;
    const newItems = (data as EquipmentItemFull[]) || [];

    if (replace) {
      setItems(newItems);
    } else {
      setItems(prev => [...prev, ...newItems]);
    }

    const total = count || 0;
    setTotalCount(total);
    setHasMore((pageIndex + 1) * PAGE_SIZE < total);

    // Calcul des comptages par secteur (sans filtre secteur pour garder tous les badges visibles)
    if (pageIndex === 0) {
      const supabaseCounts = createClient();
      let countQuery = supabaseCounts
        .from('equipment_items')
        .select('sector_id')
        .not('sector_id', 'is', null);
      if (opts.status !== 'all') countQuery = countQuery.eq('status', opts.status);
      else countQuery = countQuery.neq('status', 'archive');
      if (opts.category) {
        const cat = currentCats.find((c) => c.slug === opts.category);
        if (cat) countQuery = countQuery.eq('category_id', cat.id);
      }
      if (opts.free) countQuery = countQuery.eq('is_free', true);
      const { data: sectorData } = await countQuery;
      const counts: Record<string, number> = {};
      (sectorData || []).forEach((row: { sector_id: string }) => {
        if (row.sector_id) counts[row.sector_id] = (counts[row.sector_id] || 0) + 1;
      });
      setSectorCounts(counts);
    }

    if (pageIndex === 0) setLoading(false); else setLoadingMore(false);
  }, []); // ← stable: aucune dépendance sur les états

  // Trigger fetch whenever filters change
  useEffect(() => {
    setPage(0);
    fetchData(0, true, {
      category: selectedCategory,
      status: selectedStatus,
      free: onlyFree,
      sector: filterSector,
    });
  }, [fetchData, selectedCategory, selectedStatus, onlyFree, filterSector]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchData(nextPage, false, {
      category: selectedCategory,
      status: selectedStatus,
      free: onlyFree,
      sector: filterSector,
    });
  };

  const filtered = items.filter(i =>
    !search ||
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.description?.toLowerCase().includes(search.toLowerCase()) ||
    i.pickup_location?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    disponible: items.filter(i => i.status === 'disponible').length,
    reserve: items.filter(i => i.status === 'reserve').length,
    prete: items.filter(i => i.status === 'prete').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionTracker section="materiel" />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Prêt de matériel</h1>
          <p className="text-gray-500 text-sm">Empruntez ou prêtez du matériel entre voisins à Biguglia</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/communaute/materiel"
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-sm font-semibold hover:bg-teal-100 transition">
            <Users className="w-4 h-4" /> Communauté
          </Link>
          {profile && (
            <>
              <Link href="/dashboard/materiel"
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-100 transition">
                <Package className="w-4 h-4" /> Mon matériel
              </Link>
              <Button onClick={() => router.push('/materiel/nouveau')}>
                <Plus className="w-4 h-4" /> Proposer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats rapides */}
      {selectedStatus === 'all' && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(['disponible', 'reserve', 'prete'] as EquipmentStatus[]).map(s => {
            const cfg = EQUIPMENT_STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => setSelectedStatus(s)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left hover:opacity-80 transition ${cfg.bg} ${cfg.border}`}>
                <span className="text-lg">{cfg.icon}</span>
                <div>
                  <div className={`text-lg font-bold ${cfg.color}`}>{counts[s as keyof typeof counts]}</div>
                  <div className={`text-xs ${cfg.color} opacity-70`}>{cfg.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Explorer par quartier ── */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-4">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-gray-900">🗺️ Explorer par quartier</h2>
              <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un secteur pour filtrer le matériel</p>
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">
              {Object.values(sectorCounts).reduce((a, b) => a + b, 0)} matériels géolocalisés
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {/* Toute la ville */}
            <button
              type="button"
              onClick={() => setFilterSector(null)}
              className={`
                flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
                transition-all duration-200 cursor-pointer
                ${!filterSector
                  ? 'bg-teal-50 border-teal-300 shadow-md scale-105'
                  : 'bg-white border-gray-100 hover:bg-teal-50 hover:border-teal-200'
                }
              `}
            >
              <span className="text-2xl">🗺️</span>
              <span className={`text-[10px] font-bold leading-tight text-center ${
                !filterSector ? 'text-teal-700' : 'text-gray-700'
              }`}>
                Toute la ville
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                !filterSector ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {totalCount}
              </span>
            </button>

            {SECTORS.map(sector => {
              const count  = sectorCounts[sector.id] || 0;
              const colors = SECTOR_COLORS[sector.color];
              const active = filterSector === sector.id;
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => setFilterSector(active ? null : sector.id)}
                  className={`
                    relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
                    transition-all duration-200 cursor-pointer select-none
                    ${active
                      ? `${colors.bg} ${colors.border} shadow-md scale-105`
                      : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                    }
                  `}
                >
                  <span className="text-2xl">{sector.icon}</span>
                  <span className={`text-[10px] font-bold leading-tight text-center ${
                    active ? colors.text : 'text-gray-700'
                  }`}>
                    {sector.name}
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    active ? colors.badgeSolid : count > 0 ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-300'
                  }`}>
                    {count > 0 ? count : '–'}
                  </span>
                  {active && (
                    <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${colors.badgeSolid} flex items-center justify-center`}>
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Rechercher un outil, appareil, lieu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="sm:w-52">
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </Select>
          <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="sm:w-52">
            <option value="">Toutes les catégories</option>
            {categories.map(c => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
          </Select>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${showFilters ? 'bg-brand-50 border-brand-200 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" /> Filtres
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={onlyFree} onChange={e => setOnlyFree(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600" />
              <span className="text-sm text-gray-700"><Gift className="w-3.5 h-3.5 inline mr-1" />Gratuit seulement</span>
            </label>
          </div>
        )}
      </div>

      {/* Résultats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-5"><div className="h-4 bg-gray-200 rounded mb-3" /><div className="h-3 bg-gray-100 rounded w-2/3" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔧"
          title={selectedStatus === 'disponible' ? 'Aucun matériel disponible en ce moment' : 'Aucun matériel trouvé'}
          description={selectedStatus === 'disponible' ? 'Soyez le premier à proposer du matériel à la communauté !' : 'Modifiez vos filtres pour voir plus de résultats.'}
          action={profile
            ? { label: 'Proposer du matériel', onClick: () => router.push('/materiel/nouveau') }
            : { label: "S'inscrire", onClick: () => router.push('/inscription') }
          }
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {search ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} pour « ${search} »` : `${totalCount} matériel${totalCount > 1 ? 's' : ''}`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => <EquipmentCard key={item.id} item={item} currentUserId={profile?.id} />)}
          </div>

          {/* Pagination — Charger plus */}
          {!search && hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Chargement...
                  </>
                ) : (
                  <>Charger plus <span className="text-xs text-gray-400">({items.length}/{totalCount})</span></>
                )}
              </button>
            </div>
          )}
          {!search && !hasMore && items.length > PAGE_SIZE && (
            <p className="mt-6 text-center text-xs text-gray-400">Tous les {totalCount} matériels sont affichés</p>
          )}
        </>
      )}
    </div>
  );
}

function EquipmentCard({ item, currentUserId }: { item: EquipmentItemFull; currentUserId?: string }) {
  const photos = item.photos as Array<{ url: string }> | undefined;
  const status = (item.status as EquipmentStatus) || (item.is_available ? 'disponible' : 'indisponible');
  const cfg = EQUIPMENT_STATUS_CONFIG[status] || EQUIPMENT_STATUS_CONFIG.disponible;
  const isOwner = currentUserId && currentUserId === item.owner_id;

  return (
    <Link href={`/materiel/${item.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-colors duration-200 group cursor-pointer">
        {/* Photo */}
        <div className="relative h-44 overflow-hidden">
          {photos && photos.length > 0 ? (
            <Image
              src={photos[0].url}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center">
              <span className="text-6xl opacity-20">
                {(item.category as { icon?: string })?.icon || '🔧'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Badges haut gauche */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {item.category && (
              <span className="text-xs font-black bg-white/90 text-teal-700 px-2.5 py-1 rounded-full shadow">
                {(item.category as { icon?: string; name?: string }).icon} {(item.category as { name?: string }).name}
              </span>
            )}
            {/* Badge statut */}
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              <span className="text-[10px]">{cfg.icon}</span> {cfg.label}
            </span>
          </div>

          {/* Gratuit / Prix */}
          <span className="absolute top-3 right-3 text-xs font-black bg-white/90 text-gray-800 px-2.5 py-1 rounded-full shadow">
            {item.is_free ? '🎁 Gratuit' : item.daily_rate ? `${item.daily_rate}€/j` : 'Prix libre'}
          </span>

          {/* Titre bas */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{item.title}</p>
          </div>
        </div>

        {/* Infos */}
        <div className="p-4">
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar
                src={(item.owner as { avatar_url?: string })?.avatar_url}
                name={(item.owner as { full_name?: string })?.full_name || '?'}
                size="xs"
              />
              <div>
                <span className="text-xs text-gray-600 font-medium">
                  {(item.owner as { full_name?: string })?.full_name || 'Habitant'}
                </span>
                {item.pickup_location && (
                  <div className="text-xs text-gray-400">{item.pickup_location}</div>
                )}
                {(item as EquipmentItemFull & { sector_id?: string }).sector_id && (
                  <SectorBadge sectorId={(item as EquipmentItemFull & { sector_id?: string }).sector_id} size="xs" />
                )}
              </div>
            </div>
            <div className="text-right">
              {item.condition && (
                <div className="text-xs text-gray-400">{CONDITION_LABELS[item.condition] || item.condition}</div>
              )}
              {isOwner && (
                <span className="text-xs text-brand-600 font-semibold">Votre matériel</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
