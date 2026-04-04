'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Package, CheckCircle, XCircle, Clock, Archive,
  ChevronRight, Wrench, AlertCircle, RotateCcw, EyeOff, Eye,
  History
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  EQUIPMENT_STATUS_CONFIG, LOAN_REQUEST_STATUS_CONFIG,
  getAllowedTransitions, getTransitionLabel, canDelete,
  EquipmentStatus, EquipmentItemFull, EquipmentRequest, EquipmentLoan
} from '@/lib/equipment';
import { formatDate } from '@/lib/utils';

type Tab = 'materiel' | 'demandes' | 'prets' | 'historique';

interface EquipmentWithRequests extends EquipmentItemFull {
  pending_count?: number;
  active_loan?: EquipmentLoan | null;
  requests?: EquipmentRequest[];
}

export default function DashboardMaterielPage() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('materiel');
  const [items, setItems] = useState<EquipmentWithRequests[]>([]);
  const [allRequests, setAllRequests] = useState<EquipmentRequest[]>([]);
  const [allLoans, setAllLoans] = useState<EquipmentLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();

    // Mes matériels
    const { data: equipData } = await supabase
      .from('equipment_items')
      .select('*, category:equipment_categories(id, name, icon, slug), photos:equipment_photos(id, url, display_order)')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });

    const myItems = (equipData as EquipmentItemFull[]) || [];

    // Demandes pour mes matériels
    const itemIds = myItems.map(i => i.id);
    let reqs: EquipmentRequest[] = [];
    if (itemIds.length > 0) {
      const { data: reqData } = await supabase
        .from('equipment_requests')
        .select('*, requester:profiles!equipment_requests_requester_id_fkey(id, full_name, avatar_url), equipment:equipment_items(id, title)')
        .in('equipment_id', itemIds)
        .order('created_at', { ascending: false });
      reqs = (reqData as EquipmentRequest[]) || [];
    }
    setAllRequests(reqs);

    // Prêts actifs et historique
    const { data: loanData } = await supabase
      .from('equipment_loans')
      .select('*, borrower:profiles!equipment_loans_borrower_id_fkey(id, full_name, avatar_url), equipment:equipment_items(id, title, status)')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });
    setAllLoans((loanData as EquipmentLoan[]) || []);

    // Enrichir les items avec leurs demandes et prêts
    const enriched: EquipmentWithRequests[] = myItems.map(item => {
      const itemReqs = reqs.filter(r => r.equipment_id === item.id);
      const pendingCount = itemReqs.filter(r => r.status === 'en_attente').length;
      const activeLoan = (loanData as EquipmentLoan[])?.find(
        l => l.equipment_id === item.id && ['reserve', 'en_cours'].includes(l.status)
      ) || null;
      return { ...item, pending_count: pendingCount, active_loan: activeLoan, requests: itemReqs };
    });
    setItems(enriched);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !profile) { router.push('/connexion?redirect=/dashboard/materiel'); return; }
    if (profile) fetchAll();
  }, [profile, authLoading, router, fetchAll]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStatusChange = async (itemId: string, newStatus: EquipmentStatus) => {
    setActionLoading(itemId);
    const supabase = createClient();
    const { error } = await supabase
      .from('equipment_items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) toast.error('Erreur lors du changement');
    else toast.success(`Statut → ${EQUIPMENT_STATUS_CONFIG[newStatus].label}`);
    await fetchAll();
    setActionLoading(null);
  };

  const handleAcceptRequest = async (req: EquipmentRequest) => {
    if (!profile) return;
    setActionLoading(req.id);
    const supabase = createClient();
    await supabase.from('equipment_requests').update({ status: 'acceptee', updated_at: new Date().toISOString() }).eq('id', req.id);
    await supabase.from('equipment_requests')
      .update({ status: 'refusee', updated_at: new Date().toISOString() })
      .eq('equipment_id', req.equipment_id).eq('status', 'en_attente').neq('id', req.id);
    await supabase.from('equipment_loans').insert({
      equipment_id: req.equipment_id, owner_id: profile.id,
      borrower_id: req.requester_id, request_id: req.id,
      status: 'reserve', reserved_at: new Date().toISOString(),
    });
    await supabase.from('equipment_items').update({ status: 'reserve', updated_at: new Date().toISOString() }).eq('id', req.equipment_id);
    toast.success('Demande acceptée — matériel réservé !');
    await fetchAll();
    setActionLoading(null);
  };

  const handleRefuseRequest = async (req: EquipmentRequest) => {
    setActionLoading(req.id);
    const supabase = createClient();
    await supabase.from('equipment_requests').update({ status: 'refusee', updated_at: new Date().toISOString() }).eq('id', req.id);
    toast.success('Demande refusée');
    await fetchAll();
    setActionLoading(null);
  };

  const handleMarkLoaned = async (loan: EquipmentLoan) => {
    setActionLoading(loan.id);
    const supabase = createClient();
    await supabase.from('equipment_loans').update({ status: 'en_cours', loan_started_at: new Date().toISOString() }).eq('id', loan.id);
    await supabase.from('equipment_items').update({ status: 'prete', updated_at: new Date().toISOString() }).eq('id', loan.equipment_id);
    toast.success('Matériel marqué comme prêté !');
    await fetchAll();
    setActionLoading(null);
  };

  const handleMarkReturned = async (loan: EquipmentLoan) => {
    setActionLoading(loan.id);
    const supabase = createClient();
    await supabase.from('equipment_loans').update({ status: 'retourne', returned_at: new Date().toISOString() }).eq('id', loan.id);
    if (loan.request_id) await supabase.from('equipment_requests').update({ status: 'terminee' }).eq('id', loan.request_id);
    await supabase.from('equipment_items').update({ status: 'rendu', updated_at: new Date().toISOString() }).eq('id', loan.equipment_id);
    toast.success('Retour confirmé !');
    await fetchAll();
    setActionLoading(null);
  };

  const handleDelete = async (item: EquipmentWithRequests) => {
    const { allowed, reason } = canDelete(item.status as EquipmentStatus, !!item.active_loan);
    if (!allowed) { toast.error(`Suppression impossible : ${reason}`); return; }
    if (!window.confirm(`Supprimer "${item.title}" définitivement ?`)) return;
    const supabase = createClient();
    await supabase.from('equipment_items').delete().eq('id', item.id);
    toast.success('Matériel supprimé');
    await fetchAll();
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const activeItems = items.filter(i => i.status !== 'archive');
  const archivedItems = items.filter(i => i.status === 'archive');
  const pendingRequests = allRequests.filter(r => r.status === 'en_attente');
  const activeLoans = allLoans.filter(l => ['reserve', 'en_cours'].includes(l.status));
  const loanHistory = allLoans.filter(l => ['retourne', 'annule'].includes(l.status));

  const stats = {
    total: activeItems.length,
    disponible: items.filter(i => i.status === 'disponible').length,
    reserve: items.filter(i => i.status === 'reserve').length,
    prete: items.filter(i => i.status === 'prete').length,
    rendu: items.filter(i => i.status === 'rendu').length,
    indisponible: items.filter(i => i.status === 'indisponible').length,
    pendingRequests: pendingRequests.length,
    activeLoans: activeLoans.length,
    totalLoans: allLoans.filter(l => l.status === 'retourne').length,
  };

  if (loading || authLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}</div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Wrench className="w-7 h-7 text-teal-600" /> Mon matériel
          </h1>
          <p className="text-gray-500 text-sm">Gérez vos prêts, demandes et historique</p>
        </div>
        <Button onClick={() => router.push('/materiel/nouveau')}>
          <Plus className="w-4 h-4" /> Proposer du matériel
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total actifs', value: stats.total, icon: Package, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Disponible', value: stats.disponible, icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Demandes', value: stats.pendingRequests, icon: AlertCircle, color: stats.pendingRequests > 0 ? 'text-orange-700' : 'text-gray-500', bg: stats.pendingRequests > 0 ? 'bg-orange-50' : 'bg-gray-50', alert: stats.pendingRequests > 0 },
          { label: 'Prêts terminés', value: stats.totalLoans, icon: History, color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-4 relative`}>
            {s.alert && <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Statuts détaillés */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-8">
        {(['disponible', 'reserve', 'prete', 'rendu', 'indisponible'] as EquipmentStatus[]).map(s => {
          const cfg = EQUIPMENT_STATUS_CONFIG[s];
          const count = items.filter(i => i.status === s).length;
          return (
            <div key={s} className={`flex flex-col items-center p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
              <span className="text-lg mb-1">{cfg.icon}</span>
              <span className={`text-xl font-bold ${cfg.color}`}>{count}</span>
              <span className={`text-xs ${cfg.color} opacity-80`}>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {([
          { key: 'materiel' as Tab, label: 'Matériels', count: activeItems.length },
          { key: 'demandes' as Tab, label: 'Demandes', count: pendingRequests.length, alert: pendingRequests.length > 0 },
          { key: 'prets' as Tab, label: 'Prêts actifs', count: activeLoans.length },
          { key: 'historique' as Tab, label: 'Historique', count: loanHistory.length },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition relative ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${t.alert ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab : Matériels ── */}
      {tab === 'materiel' && (
        <div className="space-y-4">
          {activeItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-2">Aucun matériel proposé</p>
              <Button onClick={() => router.push('/materiel/nouveau')}>
                <Plus className="w-4 h-4" /> Proposer du matériel
              </Button>
            </div>
          ) : (
            activeItems.map(item => <EquipmentItemCard key={item.id} item={item}
              onStatusChange={handleStatusChange} onDelete={handleDelete}
              loading={actionLoading === item.id} />)
          )}

          {/* Archivés */}
          {archivedItems.length > 0 && (
            <div className="pt-4">
              <button onClick={() => setShowArchived(v => !v)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3">
                <Archive className="w-4 h-4" />
                {showArchived ? 'Masquer' : 'Afficher'} les archivés ({archivedItems.length})
              </button>
              {showArchived && archivedItems.map(item => (
                <EquipmentItemCard key={item.id} item={item} onStatusChange={handleStatusChange}
                  onDelete={handleDelete} loading={actionLoading === item.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab : Demandes ── */}
      {tab === 'demandes' && (
        <div className="space-y-3">
          {allRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune demande reçue</p>
            </div>
          ) : (
            allRequests.map(req => {
              const rCfg = LOAN_REQUEST_STATUS_CONFIG[req.status];
              return (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={(req.requester as { avatar_url?: string })?.avatar_url}
                      name={(req.requester as { full_name?: string })?.full_name || '?'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm text-gray-900">{(req.requester as { full_name?: string })?.full_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${rCfg.bg} ${rCfg.color} font-medium`}>
                          {rCfg.icon} {rCfg.label}
                        </span>
                      </div>
                      <Link href={`/materiel/${req.equipment_id}`}
                        className="text-xs text-brand-600 hover:underline">
                        {(req.equipment as { title?: string })?.title || 'Voir le matériel'} →
                      </Link>
                      {req.requested_start_date && (
                        <div className="text-xs text-gray-500 mt-1">
                          📅 {req.requested_start_date} → {req.requested_end_date}
                        </div>
                      )}
                      {req.message && <p className="text-xs text-gray-600 mt-1 italic">&quot;{req.message}&quot;</p>}
                      <div className="text-xs text-gray-400 mt-1">{formatDate(req.created_at)}</div>
                    </div>
                    {req.status === 'en_attente' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleAcceptRequest(req)} disabled={actionLoading === req.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition disabled:opacity-50">
                          <CheckCircle className="w-3.5 h-3.5" /> Accepter
                        </button>
                        <button onClick={() => handleRefuseRequest(req)} disabled={actionLoading === req.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-200 transition disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" /> Refuser
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab : Prêts actifs ── */}
      {tab === 'prets' && (
        <div className="space-y-3">
          {activeLoans.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun prêt actif en ce moment</p>
            </div>
          ) : (
            activeLoans.map(loan => {
              const isCours = loan.status === 'en_cours';
              return (
                <div key={loan.id} className={`bg-white rounded-2xl border p-5 ${isCours ? 'border-purple-200' : 'border-orange-200'}`}>
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={(loan.borrower as { avatar_url?: string })?.avatar_url}
                      name={(loan.borrower as { full_name?: string })?.full_name || '?'}
                      size="md"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{(loan.borrower as { full_name?: string })?.full_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCours ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                          {isCours ? '🔄 En cours' : '🔒 Réservé'}
                        </span>
                      </div>
                      <Link href={`/materiel/${loan.equipment_id}`} className="text-xs text-brand-600 hover:underline">
                        {(loan.equipment as { title?: string })?.title || 'Voir le matériel'} →
                      </Link>
                      <div className="text-xs text-gray-500 mt-1">
                        {isCours ? `Prêté depuis ${formatDate(loan.loan_started_at || '')}` : `Réservé le ${formatDate(loan.reserved_at || '')}`}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {loan.status === 'reserve' && (
                        <button onClick={() => handleMarkLoaned(loan)} disabled={actionLoading === loan.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition disabled:opacity-50">
                          <CheckCircle className="w-3.5 h-3.5" /> Marquer prêté
                        </button>
                      )}
                      {loan.status === 'en_cours' && (
                        <button onClick={() => handleMarkReturned(loan)} disabled={actionLoading === loan.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
                          <CheckCircle className="w-3.5 h-3.5" /> Retour confirmé
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab : Historique ── */}
      {tab === 'historique' && (
        <div className="space-y-3">
          {loanHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun prêt terminé pour l&apos;instant</p>
            </div>
          ) : (
            loanHistory.map(loan => (
              <div key={loan.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={(loan.borrower as { avatar_url?: string })?.avatar_url}
                    name={(loan.borrower as { full_name?: string })?.full_name || '?'}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{(loan.borrower as { full_name?: string })?.full_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        🏁 Terminé
                      </span>
                    </div>
                    <Link href={`/materiel/${loan.equipment_id}`} className="text-xs text-brand-600 hover:underline">
                      {(loan.equipment as { title?: string })?.title || 'Voir le matériel'}
                    </Link>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Prêté le {formatDate(loan.loan_started_at || loan.reserved_at || '')}
                      {loan.returned_at && ` • Rendu le ${formatDate(loan.returned_at)}`}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Composant carte matériel ─────────────────────────────────────────────────

function EquipmentItemCard({
  item, onStatusChange, onDelete, loading
}: {
  item: EquipmentWithRequests;
  onStatusChange: (id: string, s: EquipmentStatus) => void;
  onDelete: (item: EquipmentWithRequests) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = (item.status as EquipmentStatus) || 'disponible';
  const cfg = EQUIPMENT_STATUS_CONFIG[status];
  const transitions = getAllowedTransitions(status);
  const photos = item.photos as Array<{ url: string }> | undefined;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${item.pending_count && item.pending_count > 0 ? 'border-orange-200' : 'border-gray-100'}`}>
      <div className="flex items-center gap-4 p-4">
        {/* Photo miniature */}
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
          {photos && photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl">{(item.category as { icon?: string })?.icon || '🔧'}</span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link href={`/materiel/${item.id}`} className="font-semibold text-gray-900 hover:text-brand-700 transition truncate">
              {item.title}
            </Link>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              {cfg.icon} {cfg.label}
            </span>
            {item.pending_count && item.pending_count > 0 ? (
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                {item.pending_count} demande{item.pending_count > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-gray-400">{(item.category as { name?: string })?.name} • {item.is_free ? 'Gratuit' : `${item.daily_rate}€/j`}</div>
        </div>

        {/* Actions rapides */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/materiel/${item.id}/modifier`}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </Link>
          <Link href={`/materiel/${item.id}`}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button onClick={() => setExpanded(v => !v)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
            {expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Actions expandées */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          <div className="text-xs font-medium text-gray-500 mb-2">Changer le statut :</div>
          <div className="flex flex-wrap gap-2">
            {transitions.map(t => {
              const tCfg = EQUIPMENT_STATUS_CONFIG[t];
              return (
                <button key={t} onClick={() => onStatusChange(item.id, t)} disabled={loading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition hover:opacity-80 disabled:opacity-50 ${tCfg.bg} ${tCfg.color} ${tCfg.border}`}>
                  {tCfg.icon} {getTransitionLabel(status, t)}
                </button>
              );
            })}
            {status === 'rendu' && (
              <button onClick={() => onStatusChange(item.id, 'disponible')} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:opacity-80">
                <RotateCcw className="w-3 h-3" /> Remettre disponible
              </button>
            )}
            <button onClick={() => onDelete(item)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition">
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
