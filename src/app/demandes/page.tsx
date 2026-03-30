'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRelative } from '@/lib/utils';
import {
  Search, Plus, Loader2, AlertCircle, Clock, Flame,
  Wrench, MessageSquare, ChevronRight, Filter,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

// ─── Types ───────────────────────────────────────────────────────────────────
type ServiceRequest = {
  id: string;
  title: string;
  description: string;
  urgency: 'normal' | 'urgent' | 'tres_urgent';
  address: string;
  status: string;
  created_at: string;
  resident_id: string;
  resident?: { full_name: string; avatar_url?: string } | null;
  category?: { id: string; name: string; icon: string } | null;
  photos?: { url: string }[];
  comment_count?: number;
};

const URGENCY_CONFIG = {
  normal:      { label: 'Normal',      color: 'text-gray-500 bg-gray-100',    icon: <Clock className="w-3 h-3" /> },
  urgent:      { label: 'Urgent',      color: 'text-orange-600 bg-orange-100', icon: <AlertCircle className="w-3 h-3" /> },
  tres_urgent: { label: 'Très urgent', color: 'text-red-600 bg-red-100',       icon: <Flame className="w-3 h-3" /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted:  { label: 'En attente',     color: 'text-blue-600 bg-blue-100' },
  viewed:     { label: 'Vue',            color: 'text-purple-600 bg-purple-100' },
  replied:    { label: 'Réponse reçue',  color: 'text-emerald-600 bg-emerald-100' },
  scheduled:  { label: 'Planifiée',      color: 'text-teal-600 bg-teal-100' },
  completed:  { label: 'Résolue',        color: 'text-gray-400 bg-gray-100' },
  cancelled:  { label: 'Annulée',        color: 'text-gray-400 bg-gray-100' },
};

export default function DemandesPage() {
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [requests, setRequests]     = useState<ServiceRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterStatus, setFilterStatus]   = useState('open'); // open = submitted+viewed+replied

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('service_requests')
      .select(`
        id, title, description, urgency, address, status, created_at, resident_id,
        resident:profiles!service_requests_resident_id_fkey(full_name, avatar_url),
        category:trade_categories(id, name, icon),
        photos:service_request_photos(url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filterStatus === 'open') {
      query = query.in('status', ['submitted', 'viewed', 'replied']);
    } else if (filterStatus === 'resolved') {
      query = query.in('status', ['completed', 'scheduled']);
    }

    if (filterUrgency !== 'all') {
      query = query.eq('urgency', filterUrgency);
    }

    const { data, error } = await query;
    if (!error) setRequests((data as unknown as ServiceRequest[]) || []);
    setLoading(false);
  }, [supabase, filterStatus, filterUrgency]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = requests.filter(r =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    r.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <span className="text-blue-200 font-semibold text-sm">Vie pratique · Entraide</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2">Demandes d&apos;aide</h1>
              <p className="text-blue-100 text-sm max-w-xl">
                Les habitants de Biguglia partagent leurs besoins — artisans, conseils, coups de main.
                Consultez, répondez, aidez.
              </p>
            </div>
            <Link
              href="/artisans/demande"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 font-black px-6 py-3 rounded-2xl hover:bg-blue-50 transition-all shadow-lg text-sm"
            >
              <Plus className="w-4 h-4" /> Poster une demande
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Barre recherche + filtres ── */}
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
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="open">En cours</option>
                <option value="resolved">Résolues</option>
                <option value="all">Toutes</option>
              </select>
            </div>
            <select
              value={filterUrgency}
              onChange={e => setFilterUrgency(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="all">Toutes urgences</option>
              <option value="tres_urgent">🔴 Très urgent</option>
              <option value="urgent">🟠 Urgent</option>
              <option value="normal">⚪ Normal</option>
            </select>
          </div>
        </div>

        {/* ── Liste ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold text-lg mb-2">
              {search ? 'Aucune demande pour cette recherche' : 'Aucune demande pour l\'instant'}
            </p>
            <Link href="/artisans/demande"
              className="inline-flex items-center gap-2 mt-4 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-700 transition-all">
              <Plus className="w-4 h-4" /> Poster la première demande
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const urg = URGENCY_CONFIG[req.urgency] ?? URGENCY_CONFIG.normal;
              const st  = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.submitted;
              const firstPhoto = req.photos?.[0]?.url;
              return (
                <Link key={req.id} href={`/demandes/${req.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-5 group">
                  <div className="flex gap-4">
                    {/* Photo ou icône catégorie */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-blue-50 flex items-center justify-center">
                      {firstPhoto
                        /* eslint-disable-next-line @next/next/no-img-element */
                        ? <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                        : <span className="text-2xl">{req.category?.icon ?? '🔧'}</span>
                      }
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {/* Urgence */}
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${urg.color}`}>
                          {urg.icon} {urg.label}
                        </span>
                        {/* Catégorie */}
                        {req.category && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {req.category.icon} {req.category.name}
                          </span>
                        )}
                        {/* Statut */}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </div>

                      <h2 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-blue-700 transition-colors line-clamp-1">
                        {req.title}
                      </h2>
                      <p className="text-gray-500 text-xs line-clamp-2 mb-2">{req.description}</p>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1.5">
                          {req.resident && (
                            <Avatar src={req.resident.avatar_url} name={req.resident.full_name} size="xs" />
                          )}
                          <span className="font-medium text-gray-600">{req.resident?.full_name ?? 'Habitant'}</span>
                          <span>· {formatRelative(req.created_at)}</span>
                          {req.address && <span>· 📍 {req.address}</span>}
                        </span>
                        <span className="flex items-center gap-1 text-blue-500 font-semibold group-hover:text-blue-700">
                          <MessageSquare className="w-3.5 h-3.5" /> Répondre
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Bannière connexion ── */}
        {!profile && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-blue-800">Vous avez besoin d&apos;aide ?</p>
              <p className="text-blue-600 text-sm">Connectez-vous pour poster une demande ou répondre aux habitants.</p>
            </div>
            <Link href="/connexion"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-700 transition-all">
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
