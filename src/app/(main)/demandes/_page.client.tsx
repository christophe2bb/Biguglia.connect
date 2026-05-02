'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRelative } from '@/lib/utils';
import {
  Search, Plus, Loader2, AlertCircle, Clock, Flame,
  Wrench, ChevronRight, Filter, Briefcase, Lock, MapPin,
} from 'lucide-react';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceRequest = {
  id: string;
  title: string;
  description: string;
  urgency: 'normal' | 'urgent' | 'tres_urgent';
  address: string;
  status: string;
  created_at: string;
  resident_id: string;
  artisan_id?: string | null;
  sector_id?: string | null;
  resident?: { full_name: string; avatar_url?: string } | null;
  category?: { id: string; name: string; icon: string } | null;
  photos?: { url: string }[];
};

// ─── Configs ──────────────────────────────────────────────────────────────────
const URGENCY_CONFIG = {
  normal:      { label: 'Normal',      pill: 'bg-gray-800/70 text-white',    icon: <Clock className="w-3 h-3" /> },
  urgent:      { label: 'Urgent',      pill: 'bg-orange-600/90 text-white',  icon: <AlertCircle className="w-3 h-3" /> },
  tres_urgent: { label: 'Très urgent', pill: 'bg-red-600/90 text-white',     icon: <Flame className="w-3 h-3" /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted:  { label: 'En attente',    color: 'bg-blue-100 text-blue-700' },
  viewed:     { label: 'Vue',           color: 'bg-purple-100 text-purple-700' },
  replied:    { label: 'Réponse reçue', color: 'bg-emerald-100 text-emerald-700' },
  scheduled:  { label: 'Planifiée',     color: 'bg-teal-100 text-teal-700' },
  completed:  { label: 'Résolue',       color: 'bg-gray-100 text-gray-500' },
  cancelled:  { label: 'Annulée',       color: 'bg-gray-100 text-gray-400' },
};

// ─── Composant fenêtre-secteur ────────────────────────────────────────────────
function SectorWindow({
  sector,
  count,
  isActive,
  onClick,
}: {
  sector: typeof SECTORS[0];
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const colors = SECTOR_COLORS[sector.color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
        transition-all duration-200 cursor-pointer select-none
        ${isActive
          ? `${colors.bg} ${colors.border} shadow-md scale-105`
          : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
        }
      `}
    >
      <span className="text-2xl">{sector.icon}</span>
      <span className={`text-[10px] font-bold leading-tight text-center ${isActive ? colors.text : 'text-gray-700'}`}>
        {sector.name}
      </span>
      {count > 0 && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? colors.badgeSolid : 'bg-gray-100 text-gray-500'}`}>
          {count}
        </span>
      )}
      {isActive && (
        <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${colors.badgeSolid} flex items-center justify-center`}>
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        </span>
      )}
    </button>
  );
}

// ─── Carte demande — style fenêtre annonces ───────────────────────────────────
function RequestCard({ req, isPrivate = false }: { req: ServiceRequest; isPrivate?: boolean }) {
  const urg   = URGENCY_CONFIG[req.urgency] ?? URGENCY_CONFIG.normal;
  const st    = STATUS_CONFIG[req.status]   ?? STATUS_CONFIG.submitted;
  const photo = req.photos?.[0]?.url;
  const name  = req.resident?.full_name ?? 'Habitant';
  const sector = req.sector_id ? SECTORS.find(s => s.id === req.sector_id) : null;
  const sectorColors = sector ? SECTOR_COLORS[sector.color] : null;

  return (
    <Link href={`/demandes/${req.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200">

        {/* ── Zone photo — aspect 4/3 ── */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {photo ? (
            <Image
              src={photo}
              alt={req.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              <span className="text-6xl opacity-30">{req.category?.icon ?? '🔧'}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badge urgence haut gauche */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-full shadow ${urg.pill}`}>
              {urg.icon} {urg.label}
            </span>
            {isPrivate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full shadow bg-indigo-600 text-white">
                <Lock className="w-2.5 h-2.5" /> Devis privé
              </span>
            )}
            {req.urgency === 'tres_urgent' && req.status !== 'completed' && req.status !== 'cancelled' && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-black rounded-full shadow bg-red-500 text-white animate-pulse">
                ⚡ URGENT
              </span>
            )}
          </div>

          {/* Badge statut haut droite */}
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow ${st.color}`}>
              {st.label}
            </span>
          </div>

          {/* Titre + catégorie en bas */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">
              {req.title}
            </p>
            {req.category?.name && (
              <p className="text-white/80 text-xs mt-0.5">
                {req.category.icon} {req.category.name}
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-3">
          {/* Description */}
          <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
            {req.description}
          </p>

          {/* Auteur + date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              {req.resident?.avatar_url ? (
                <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                  <Image src={req.resident.avatar_url} alt={name} fill sizes="20px" className="object-cover" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[9px] font-black">{name[0]?.toUpperCase() ?? '?'}</span>
                </div>
              )}
              <span className="text-xs font-semibold text-gray-700 truncate">{name}</span>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(req.created_at)}</span>
          </div>

          {/* Localisation / secteur */}
          {(sector || req.address) && (
            <div className="flex items-center gap-1 mt-1.5">
              {sector && sectorColors ? (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sectorColors.badge}`}>
                  {sector.icon} {sector.name}
                </span>
              ) : (
                <>
                  <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate">{req.address}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DemandesPageClient() {
  const { profile } = useAuthStore();
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;

  const [activeTab,     setActiveTab]     = useState<'public' | 'mes_devis'>('public');
  const [requests,      setRequests]      = useState<ServiceRequest[]>([]);
  const [mesDevis,      setMesDevis]      = useState<ServiceRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingDevis,  setLoadingDevis]  = useState(false);
  const [search,        setSearch]        = useState('');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterStatus,  setFilterStatus]  = useState('open');
  const [filterSector,  setFilterSector]  = useState<string | null>(null);

  const isArtisan = profile?.role === 'artisan_pending' || profile?.role === 'artisan_verified';

  // ── Charger les demandes publiques ──────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const SELECT = `
        id, title, description, urgency, address, status, created_at, resident_id, sector_id,
        resident:profiles!service_requests_resident_id_fkey(full_name, avatar_url),
        category:trade_categories(id, name, icon),
        photos:service_request_photos(url)
      `;
      let q = supabase
        .from('service_requests')
        .select(SELECT)
        .order('created_at', { ascending: false })
        .is('artisan_id', null)
        .limit(50);
      if (filterStatus === 'open')          q = q.in('status', ['submitted', 'viewed', 'replied']);
      else if (filterStatus === 'resolved') q = q.in('status', ['completed', 'scheduled']);
      if (filterUrgency !== 'all')          q = q.eq('urgency', filterUrgency);

      let { data, error } = await q;

      if (error && (error as { code?: string }).code === '42703') {
        let q2 = supabase.from('service_requests').select(SELECT)
          .order('created_at', { ascending: false }).limit(50);
        if (filterStatus === 'open')          q2 = q2.in('status', ['submitted', 'viewed', 'replied']);
        else if (filterStatus === 'resolved') q2 = q2.in('status', ['completed', 'scheduled']);
        if (filterUrgency !== 'all')          q2 = q2.eq('urgency', filterUrgency);
        const fb = await q2; data = fb.data; error = fb.error;
      }

      setRequests(error ? [] : (data as unknown as ServiceRequest[]) || []);
    } catch { setRequests([]); }
    finally  { setLoading(false); }
  }, [supabase, filterStatus, filterUrgency]);

  // ── Charger les devis privés ────────────────────────────────────────────────
  const fetchMesDevis = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingDevis(true);
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          id, title, description, urgency, address, status, created_at,
          resident_id, artisan_id, sector_id,
          resident:profiles!service_requests_resident_id_fkey(full_name, avatar_url),
          category:trade_categories(id, name, icon),
          photos:service_request_photos(url)
        `)
        .not('artisan_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      setMesDevis(error ? [] : (data as unknown as ServiceRequest[]) || []);
    } catch { setMesDevis([]); }
    finally  { setLoadingDevis(false); }
  }, [supabase, profile?.id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => {
    if (activeTab === 'mes_devis' && isArtisan) fetchMesDevis();
  }, [activeTab, isArtisan, fetchMesDevis]);

  const filtered = requests.filter(r => {
    if (filterSector && r.sector_id !== filterSector) return false;
    if (search &&
      !r.title.toLowerCase().includes(search.toLowerCase()) &&
      !r.description.toLowerCase().includes(search.toLowerCase()) &&
      !r.category?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredDevis = mesDevis.filter(r =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  // Compteurs par secteur
  const sectorCounts = SECTORS.reduce<Record<string, number>>((acc, s) => {
    acc[s.id] = requests.filter(r => r.sector_id === s.id).length;
    return acc;
  }, {});

  const nbUrgent   = filtered.filter(r => r.urgency === 'urgent' || r.urgency === 'tres_urgent').length;
  const nbNouveaux = filtered.filter(r => r.status === 'submitted').length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white">
        <div className="absolute inset-0 opacity-10 bg-dot-grid-lg" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl"><Wrench className="w-5 h-5" /></div>
                <span className="text-blue-200 font-semibold text-sm">Vie pratique · Entraide</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">Demandes d&apos;aide</h1>
              <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
                Les habitants de Biguglia partagent leurs besoins — artisans, conseils, coups de main.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1.5 text-sm font-semibold">
                  📋 {filtered.length} demande{filtered.length !== 1 ? 's' : ''}
                </span>
                {nbUrgent > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-red-500/40 border border-white/20 rounded-full px-3 py-1.5 text-sm font-bold animate-pulse">
                    🔥 {nbUrgent} urgent{nbUrgent !== 1 ? 's' : ''}
                  </span>
                )}
                {nbNouveaux > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/30 border border-white/20 rounded-full px-3 py-1.5 text-sm font-semibold">
                    🆕 {nbNouveaux} nouvelle{nbNouveaux !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <Link href="/artisans/demande"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 font-black px-6 py-3 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg text-sm">
              <Plus className="w-4 h-4" /> Poster une demande
            </Link>
          </div>
        </div>
      </div>

      {/* ── Fenêtres secteurs ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-gray-900">🗺️ Explorer par quartier</h2>
              <p className="text-xs text-gray-500 mt-0.5">Cliquez pour filtrer les demandes</p>
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">
              {Object.values(sectorCounts).reduce((a, b) => a + b, 0)} demandes géolocalisées
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
                  ? 'bg-blue-50 border-blue-300 shadow-md scale-105'
                  : 'bg-white border-gray-100 hover:bg-blue-50 hover:border-blue-200'
                }
              `}
            >
              <span className="text-2xl">🗺️</span>
              <span className={`text-[10px] font-bold leading-tight text-center ${!filterSector ? 'text-blue-700' : 'text-gray-700'}`}>
                Tous
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${!filterSector ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {requests.length}
              </span>
            </button>

            {SECTORS.map(sector => (
              <SectorWindow
                key={sector.id}
                sector={sector}
                count={sectorCounts[sector.id] || 0}
                isActive={filterSector === sector.id}
                onClick={() => setFilterSector(filterSector === sector.id ? null : sector.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Onglets artisan ── */}
        {isArtisan && (
          <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 w-fit">
            <button type="button" onClick={() => setActiveTab('public')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'public' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Wrench className="w-4 h-4" /> Demandes publiques
            </button>
            <button type="button" onClick={() => setActiveTab('mes_devis')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'mes_devis' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Briefcase className="w-4 h-4" /> Mes devis reçus
              {mesDevis.filter(d => d.status === 'submitted').length > 0 && (
                <span className="bg-indigo-600 text-white text-xs font-black px-1.5 py-0.5 rounded-full">
                  {mesDevis.filter(d => d.status === 'submitted').length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ══ DEMANDES PUBLIQUES ═══════════════════════════════════════════ */}
        {activeTab === 'public' && (
          <>
            {/* Barre recherche + filtres */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Rechercher (titre, catégorie, secteur, description…)"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: 'all',      label: '📋 Toutes' },
                  { val: 'open',     label: '⏳ En cours' },
                  { val: 'resolved', label: '✅ Résolues' },
                ].map(chip => (
                  <button key={chip.val} type="button"
                    onClick={() => setFilterStatus(chip.val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      filterStatus === chip.val
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {chip.label}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
                    className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white font-medium">
                    <option value="all">Toutes urgences</option>
                    <option value="tres_urgent">🔴 Très urgent</option>
                    <option value="urgent">🟠 Urgent</option>
                    <option value="normal">⚪ Normal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Compteur */}
            {!loading && filtered.length > 0 && (
              <p className="text-sm text-gray-500 mb-4 font-medium">
                {filtered.length} demande{filtered.length > 1 ? 's' : ''}
                {search && ` pour « ${search} »`}
              </p>
            )}

            {/* Grille 3 colonnes */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-5xl mb-4">🔧</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune demande trouvée</h3>
                <p className="text-gray-500 text-sm mb-6">
                  {search ? 'Essayez avec d\'autres termes.' : 'Soyez le premier à poster une demande !'}
                </p>
                <Link href="/artisans/demande"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" /> Poster la première demande
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(req => <RequestCard key={req.id} req={req} />)}
              </div>
            )}
          </>
        )}

        {/* ══ MES DEVIS REÇUS ══════════════════════════════════════════════ */}
        {activeTab === 'mes_devis' && isArtisan && (
          <>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6 flex gap-3">
              <Lock className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-indigo-900 text-sm">Devis privés</p>
                <p className="text-indigo-700 text-sm mt-0.5">
                  Ces demandes vous ont été adressées directement depuis votre page artisan.
                  Elles ne sont visibles que par vous et le résident.
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Rechercher dans mes devis…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            {loadingDevis ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : filteredDevis.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-500 font-semibold text-lg mb-2">
                  {search ? 'Aucun devis pour cette recherche' : 'Aucun devis reçu pour l\'instant'}
                </p>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                  Les demandes de devis envoyées via votre page artisan apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDevis.map(req => <RequestCard key={req.id} req={req} isPrivate />)}
              </div>
            )}
          </>
        )}

        {/* ── Bannière connexion ── */}
        {!profile && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-blue-800">Vous avez besoin d&apos;aide ?</p>
              <p className="text-blue-600 text-sm mt-0.5">
                Connectez-vous pour poster une demande ou répondre aux habitants.
              </p>
            </div>
            <Link href="/connexion"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors">
              Se connecter <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
