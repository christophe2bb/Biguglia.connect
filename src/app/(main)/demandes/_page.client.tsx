'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRelative } from '@/lib/utils';
import {
  Search, Plus, Loader2, AlertCircle, Clock, Flame,
  Wrench, MessageSquare, ChevronRight, Filter, Briefcase, Lock,
  MapPin,
} from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';

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
  comment_count?: number;
};

// ─── Configs ──────────────────────────────────────────────────────────────────
const URGENCY_CONFIG = {
  normal:      { label: 'Normal',      dot: 'bg-gray-400',    pill: 'bg-gray-100 text-gray-600',     icon: <Clock className="w-3 h-3" />,       border: 'border-gray-200' },
  urgent:      { label: 'Urgent',      dot: 'bg-orange-500',  pill: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="w-3 h-3" />, border: 'border-orange-200' },
  tres_urgent: { label: 'Très urgent', dot: 'bg-red-500',     pill: 'bg-red-100 text-red-700',       icon: <Flame className="w-3 h-3" />,        border: 'border-red-200' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted:  { label: 'En attente',    color: 'bg-blue-100 text-blue-700' },
  viewed:     { label: 'Vue',           color: 'bg-purple-100 text-purple-700' },
  replied:    { label: 'Réponse reçue', color: 'bg-emerald-100 text-emerald-700' },
  scheduled:  { label: 'Planifiée',     color: 'bg-teal-100 text-teal-700' },
  completed:  { label: 'Résolue',       color: 'bg-gray-100 text-gray-500' },
  cancelled:  { label: 'Annulée',       color: 'bg-gray-100 text-gray-400' },
};

// ─── Carte demande ────────────────────────────────────────────────────────────
function RequestCard({ req, isPrivate = false }: { req: ServiceRequest; isPrivate?: boolean }) {
  const urg  = URGENCY_CONFIG[req.urgency] ?? URGENCY_CONFIG.normal;
  const st   = STATUS_CONFIG[req.status]   ?? STATUS_CONFIG.submitted;
  const photo = req.photos?.[0]?.url;
  const name  = req.resident?.full_name ?? 'Habitant';
  const initial = name[0]?.toUpperCase() ?? '?';

  return (
    <Link
      href={`/demandes/${req.id}`}
      className={`group block bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${urg.border}`}
    >
      {/* ── Bandeau urgence (très urgent seulement) ── */}
      {req.urgency === 'tres_urgent' && req.status !== 'completed' && req.status !== 'cancelled' && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black">
          <Flame className="w-3.5 h-3.5 flex-shrink-0" />
          TRÈS URGENT — Aide recherchée maintenant
        </div>
      )}

      <div className="flex gap-0">

        {/* ── Bande colorée gauche (catégorie) ── */}
        <div className="w-1.5 flex-shrink-0 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-l-none" />

        {/* ── Miniature photo ou icône ── */}
        <div className="relative flex-shrink-0 w-20 h-auto min-h-[88px] bg-blue-50 flex items-center justify-center overflow-hidden">
          {photo ? (
            <Image src={photo} alt="" fill sizes="80px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <span className="text-3xl select-none">{req.category?.icon ?? '🔧'}</span>
          )}
        </div>

        {/* ── Contenu principal ── */}
        <div className="flex-1 min-w-0 p-4">

          {/* Ligne 1 : badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {isPrivate && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                <Lock className="w-2.5 h-2.5" /> Devis privé
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${urg.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${urg.dot} inline-block`} />
              {urg.label}
            </span>
            {req.category && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                {req.category.icon} {req.category.name}
              </span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
              {st.label}
            </span>
          </div>

          {/* Ligne 2 : titre */}
          <h2 className="font-bold text-gray-900 text-sm leading-snug mb-1 group-hover:text-blue-700 transition-colors line-clamp-1">
            {req.title}
          </h2>

          {/* Ligne 3 : description */}
          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">
            {req.description}
          </p>

          {/* Ligne 4 : auteur + date + localisation + CTA */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Avatar */}
              {req.resident?.avatar_url ? (
                <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <Image src={req.resident.avatar_url} alt={name} fill sizes="24px" className="object-cover" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-black">{initial}</span>
                </div>
              )}
              <span className="text-xs font-semibold text-gray-700 truncate">{name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(req.created_at)}</span>
              {req.address && (
                <span className="hidden sm:flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0">
                  <MapPin className="w-3 h-3" />{req.address}
                </span>
              )}
            </div>

            {/* CTA */}
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-800 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              {isPrivate ? 'Voir le devis' : 'Répondre'}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
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

  const [activeTab,      setActiveTab]      = useState<'public' | 'mes_devis'>('public');
  const [requests,       setRequests]       = useState<ServiceRequest[]>([]);
  const [mesDevis,       setMesDevis]       = useState<ServiceRequest[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [loadingDevis,   setLoadingDevis]   = useState(false);
  const [search,         setSearch]         = useState('');
  const [filterUrgency,  setFilterUrgency]  = useState('all');
  const [filterStatus,   setFilterStatus]   = useState('open');
  const [filterSector,   setFilterSector]   = useState<string | null>(null);

  const isArtisan = profile?.role === 'artisan_pending' || profile?.role === 'artisan_verified';

  // ── Charger les demandes publiques ────────────────────────────────────────
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
      if (filterStatus === 'open')     q = q.in('status', ['submitted', 'viewed', 'replied']);
      else if (filterStatus === 'resolved') q = q.in('status', ['completed', 'scheduled']);
      if (filterUrgency !== 'all')     q = q.eq('urgency', filterUrgency);

      let { data, error } = await q;

      if (error && (error as { code?: string }).code === '42703') {
        let q2 = supabase
          .from('service_requests')
          .select(SELECT)
          .order('created_at', { ascending: false })
          .limit(50);
        if (filterStatus === 'open')          q2 = q2.in('status', ['submitted', 'viewed', 'replied']);
        else if (filterStatus === 'resolved') q2 = q2.in('status', ['completed', 'scheduled']);
        if (filterUrgency !== 'all')          q2 = q2.eq('urgency', filterUrgency);
        const fb = await q2;
        data  = fb.data;
        error = fb.error;
      }

      if (error) { setRequests([]); }
      else       { setRequests((data as unknown as ServiceRequest[]) || []); }
    } catch { setRequests([]); }
    finally  { setLoading(false); }
  }, [supabase, filterStatus, filterUrgency]);

  // ── Charger les devis privés ──────────────────────────────────────────────
  const fetchMesDevis = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingDevis(true);
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          id, title, description, urgency, address, status, created_at, resident_id, artisan_id, sector_id,
          resident:profiles!service_requests_resident_id_fkey(full_name, avatar_url),
          category:trade_categories(id, name, icon),
          photos:service_request_photos(url)
        `)
        .not('artisan_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) { setMesDevis([]); }
      else       { setMesDevis((data as unknown as ServiceRequest[]) || []); }
    } catch { setMesDevis([]); }
    finally  { setLoadingDevis(false); }
  }, [supabase, profile?.id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => {
    if (activeTab === 'mes_devis' && isArtisan) fetchMesDevis();
  }, [activeTab, isArtisan, fetchMesDevis]);

  const filtered = requests.filter(r => {
    if (filterSector && r.sector_id !== filterSector) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
        !r.description.toLowerCase().includes(search.toLowerCase()) &&
        !r.category?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredDevis = mesDevis.filter(r =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  // ── Compteurs KPI ─────────────────────────────────────────────────────────
  const nbUrgent    = filtered.filter(r => r.urgency === 'urgent' || r.urgency === 'tres_urgent').length;
  const nbNouveaux  = filtered.filter(r => r.status === 'submitted').length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white">
        <div className="absolute inset-0 opacity-10 bg-dot-grid-lg" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-blue-200 font-semibold text-sm">Vie pratique · Entraide</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">Demandes d&apos;aide</h1>
              <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
                Les habitants de Biguglia partagent leurs besoins — artisans, conseils, coups de main.
                Consultez, répondez, aidez.
              </p>

              {/* KPIs */}
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

            <Link
              href="/artisans/demande"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 font-black px-6 py-3 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg text-sm"
            >
              <Plus className="w-4 h-4" /> Poster une demande
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Onglets artisan ─────────────────────────────────────────────── */}
        {isArtisan && (
          <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 w-fit">
            <button type="button" onClick={() => setActiveTab('public')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'public' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Wrench className="w-4 h-4" /> Demandes publiques
            </button>
            <button type="button" onClick={() => setActiveTab('mes_devis')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'mes_devis' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase className="w-4 h-4" /> Mes devis reçus
              {mesDevis.filter(d => d.status === 'submitted').length > 0 && (
                <span className="bg-indigo-600 text-white text-xs font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {mesDevis.filter(d => d.status === 'submitted').length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ══ ONGLET DEMANDES PUBLIQUES ═════════════════════════════════════ */}
        {activeTab === 'public' && (
          <>
            {/* Filtre secteur */}
            <SectorFilter
              value={filterSector}
              onChange={setFilterSector}
              showAll={true}
              compact={true}
              label="Secteur"
              className="mb-4"
            />

            {/* Barre recherche + filtres */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une demande…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="open">En cours</option>
                    <option value="resolved">Résolues</option>
                    <option value="all">Toutes</option>
                  </select>
                </div>
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="all">Toutes urgences</option>
                  <option value="tres_urgent">🔴 Très urgent</option>
                  <option value="urgent">🟠 Urgent</option>
                  <option value="normal">⚪ Normal</option>
                </select>
              </div>
            </div>

            {/* Compteur résultats */}
            {!loading && filtered.length > 0 && (
              <p className="text-sm text-gray-500 font-medium mb-4">
                {filtered.length} demande{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
              </p>
            )}

            {/* Liste */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold text-lg mb-2">
                  {search ? 'Aucune demande pour cette recherche' : 'Aucune demande pour l\'instant'}
                </p>
                <Link href="/artisans/demande"
                  className="inline-flex items-center gap-2 mt-4 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" /> Poster la première demande
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map(req => <RequestCard key={req.id} req={req} />)}
              </div>
            )}
          </>
        )}

        {/* ══ ONGLET MES DEVIS REÇUS ═══════════════════════════════════════ */}
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

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Rechercher dans mes devis…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {loadingDevis ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : filteredDevis.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold text-lg mb-2">
                  {search ? 'Aucun devis pour cette recherche' : 'Aucun devis reçu pour l\'instant'}
                </p>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                  Les demandes de devis envoyées via votre page artisan apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredDevis.map(req => <RequestCard key={req.id} req={req} isPrivate />)}
              </div>
            )}
          </>
        )}

        {/* ── Bannière connexion ─────────────────────────────────────────── */}
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
