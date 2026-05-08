'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, CheckCircle, History, AlertCircle, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  EQUIPMENT_STATUS_CONFIG,
  canDelete,
  type EquipmentStatus,
  type EquipmentItemFull,
  type EquipmentRequest,
  type EquipmentLoan,
} from '@/lib/equipment';
import MaterielTab from './_widgets/MaterielTab';
import DemandesTab from './_widgets/DemandesTab';
import { PretsActifsTab, PretsRecusTab } from './_widgets/PretsTab';
import HistoriqueTab from './_widgets/HistoriqueTab';
import ActiviteTab from './_widgets/ActiviteTab';
import { type EquipmentWithRequests } from './_widgets/EquipmentItemCard';

type Tab = 'materiel' | 'demandes' | 'prets' | 'prets_recus' | 'historique' | 'activite';

export default function DashboardMaterielPage() {
  const { profile, phase } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('materiel');
  const [items, setItems] = useState<EquipmentWithRequests[]>([]);
  const [allRequests, setAllRequests] = useState<EquipmentRequest[]>([]);
  const [allLoans, setAllLoans] = useState<EquipmentLoan[]>([]);
  const [borrowedLoans, setBorrowedLoans] = useState<EquipmentLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();

    const { data: equipData } = await supabase
      .from('equipment_items')
      .select('*, category:equipment_categories(id, name, icon, slug), photos:equipment_photos(id, url, display_order)')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });
    const myItems = (equipData as EquipmentItemFull[]) || [];

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

    const { data: loanData } = await supabase
      .from('equipment_loans')
      .select('*, borrower:profiles!equipment_loans_borrower_id_fkey(id, full_name, avatar_url), equipment:equipment_items(id, title, status)')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });
    setAllLoans((loanData as EquipmentLoan[]) || []);

    const { data: borrowedData } = await supabase
      .from('equipment_loans')
      .select('*, owner:profiles!equipment_loans_owner_id_fkey(id, full_name, avatar_url), equipment:equipment_items(id, title, status, owner_id)')
      .eq('borrower_id', profile.id)
      .order('created_at', { ascending: false });
    setBorrowedLoans((borrowedData as EquipmentLoan[]) || []);

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

  // Ref stable pour router — évite de l'inclure dans les deps de l'effet
  // (router change de référence à chaque navigation RSC → boucle sinon).
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    // Ne rien faire tant que Supabase n'a pas résolu la session initiale.
    if (phase === 'initializing') return;
    // Session confirmée absente → redirection. router.replace évite d'empiler
    // des entrées dans l'historique (ce qui créait la boucle RSC ↔ /connexion).
    if (phase === 'unauthenticated') {
      routerRef.current.replace('/connexion?next=/dashboard/materiel');
      return;
    }
    // phase === 'authenticated' : profile peut être null si erreur DB → on
    // lance fetchAll uniquement quand le profil est disponible.
    if (profile) fetchAll();
  }, [phase, profile, fetchAll]);

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
    // ⚠️ Appelé APRÈS confirmation dans l'UI.
    const supabase = createClient();
    await supabase.from('equipment_items').delete().eq('id', item.id);
    toast.success('Matériel supprimé');
    await fetchAll();
  };

  const handleDuplicate = async (item: EquipmentWithRequests) => {
    if (!profile) return;
    setActionLoading(`dup-${item.id}`);
    const supabase = createClient();
    const { data: newItem, error } = await supabase.from('equipment_items').insert({
      owner_id: profile.id,
      title: `${item.title} (copie)`,
      description: item.description,
      category_id: item.category_id,
      condition: item.condition,
      is_free: item.is_free,
      daily_rate: item.daily_rate,
      deposit_amount: item.deposit_amount,
      pickup_location: item.pickup_location,
      rules: item.rules,
      sector: item.sector,
      availability_mode: item.availability_mode,
      pickup_mode: item.pickup_mode,
      lend_duration_hint: item.lend_duration_hint,
      requires_explanation: item.requires_explanation,
      usage_instructions: item.usage_instructions,
      included_accessories: item.included_accessories,
      status: 'disponible',
    }).select().single();
    if (error || !newItem) { toast.error('Erreur lors de la duplication'); setActionLoading(null); return; }
    toast.success('Matériel dupliqué — modifiez la copie !');
    router.push(`/materiel/${newItem.id}/modifier`);
    setActionLoading(null);
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const activeItems = items.filter(i => i.status !== 'archive');
  const archivedItems = items.filter(i => i.status === 'archive');
  const pendingRequests = allRequests.filter(r => r.status === 'en_attente');
  const activeLoans = allLoans.filter(l => ['reserve', 'en_cours'].includes(l.status));
  const loanHistory = allLoans.filter(l => ['retourne', 'annule'].includes(l.status));
  const activeBorrowedLoans = borrowedLoans.filter(l => ['reserve', 'en_cours'].includes(l.status));

  const activityData = (() => {
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const count = allLoans.filter(l => {
        const at = l.reserved_at || l.loan_started_at || '';
        return at.startsWith(key);
      }).length;
      months.push({ key, label, count });
    }
    return months;
  })();
  const maxActivity = Math.max(...activityData.map(m => m.count), 1);

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

  if (loading || phase === 'initializing') return (
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
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 flex-wrap">
        {([
          { key: 'materiel' as Tab, label: 'Matériels', count: activeItems.length },
          { key: 'demandes' as Tab, label: 'Demandes', count: pendingRequests.length, alert: pendingRequests.length > 0 },
          { key: 'prets' as Tab, label: 'Prêts actifs', count: activeLoans.length },
          { key: 'prets_recus' as Tab, label: 'Prêts reçus', count: activeBorrowedLoans.length },
          { key: 'historique' as Tab, label: 'Historique', count: loanHistory.length },
          { key: 'activite' as Tab, label: 'Activité', count: 0 },
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

      {/* Tab content */}
      {tab === 'materiel' && (
        <MaterielTab
          activeItems={activeItems}
          archivedItems={archivedItems}
          actionLoading={actionLoading}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}
      {tab === 'demandes' && (
        <DemandesTab
          requests={allRequests}
          actionLoading={actionLoading}
          onAccept={handleAcceptRequest}
          onRefuse={handleRefuseRequest}
        />
      )}
      {tab === 'prets' && (
        <PretsActifsTab
          activeLoans={activeLoans}
          actionLoading={actionLoading}
          onMarkLoaned={handleMarkLoaned}
          onMarkReturned={handleMarkReturned}
        />
      )}
      {tab === 'prets_recus' && (
        <PretsRecusTab borrowedLoans={borrowedLoans} />
      )}
      {tab === 'historique' && (
        <HistoriqueTab loanHistory={loanHistory} />
      )}
      {tab === 'activite' && (
        <ActiviteTab
          allLoans={allLoans}
          activityData={activityData}
          maxActivity={maxActivity}
          loanHistory={loanHistory}
        />
      )}

    </div>
  );
}
