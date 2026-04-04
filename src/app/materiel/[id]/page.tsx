'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, MapPin, Calendar, Shield, Clock, Pencil, Share2,
  CheckCircle, XCircle, MessageSquare, AlertCircle, History,
  ChevronDown, ChevronUp, Package
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CONDITION_LABELS, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import ContactButton from '@/components/ui/ContactButton';
import { PhotoGallery, toPhotoItems } from '@/components/ui/PhotoViewer';
import {
  EQUIPMENT_STATUS_CONFIG, LOAN_REQUEST_STATUS_CONFIG,
  getAllowedTransitions, getTransitionLabel, canDelete, isRequestable,
  EquipmentStatus, EquipmentItemFull, EquipmentRequest, EquipmentLoan,
  EquipmentStatusHistory
} from '@/lib/equipment';

export default function MaterielDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();

  const [item, setItem] = useState<EquipmentItemFull | null>(null);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [activeLoan, setActiveLoan] = useState<EquipmentLoan | null>(null);
  const [history, setHistory] = useState<EquipmentStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ start_date: '', end_date: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('equipment_items')
      .select('*, category:equipment_categories(*), photos:equipment_photos(id, url, display_order, is_cover)')
      .eq('id', id as string)
      .single();

    if (error || !data) { toast.error('Matériel introuvable'); router.push('/materiel'); return; }

    let ownerData = null;
    if (data.owner_id) {
      const { data: op } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', data.owner_id)
        .single();
      ownerData = op;
    }

    const photos = ((data.photos || []) as Array<{ id: string; url: string; display_order: number; is_cover?: boolean }>)
      .sort((a, b) => a.display_order - b.display_order);

    setItem({ ...data, owner: ownerData, photos } as unknown as EquipmentItemFull);

    // Demandes (propriétaire seulement)
    if (profile?.id === data.owner_id || profile?.role === 'admin') {
      const { data: reqs } = await supabase
        .from('equipment_requests')
        .select('*, requester:profiles!equipment_requests_requester_id_fkey(id, full_name, avatar_url)')
        .eq('equipment_id', id as string)
        .order('created_at', { ascending: false });
      setRequests((reqs as EquipmentRequest[]) || []);
    }

    // Prêt actif
    const { data: loan } = await supabase
      .from('equipment_loans')
      .select('*, borrower:profiles!equipment_loans_borrower_id_fkey(id, full_name, avatar_url)')
      .eq('equipment_id', id as string)
      .in('status', ['reserve', 'en_cours'])
      .maybeSingle();
    setActiveLoan(loan as EquipmentLoan | null);

    // Historique statuts
    const { data: hist } = await supabase
      .from('equipment_status_history')
      .select('*')
      .eq('equipment_id', id as string)
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory((hist as EquipmentStatusHistory[]) || []);

    setLoading(false);
  }, [id, profile?.id, profile?.role, router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Actions propriétaire ────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: EquipmentStatus) => {
    if (!item || !profile) return;
    setStatusLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('equipment_items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) { toast.error('Erreur lors du changement de statut'); }
    else {
      toast.success(`Statut mis à jour : ${EQUIPMENT_STATUS_CONFIG[newStatus].label}`);
      await fetchAll();
    }
    setStatusLoading(false);
  };

  const handleAcceptRequest = async (req: EquipmentRequest) => {
    if (!item || !profile) return;
    setStatusLoading(true);
    const supabase = createClient();

    // 1. Accepter la demande
    await supabase.from('equipment_requests').update({ status: 'acceptee', updated_at: new Date().toISOString() }).eq('id', req.id);
    // 2. Refuser les autres en_attente
    await supabase.from('equipment_requests')
      .update({ status: 'refusee', updated_at: new Date().toISOString() })
      .eq('equipment_id', item.id).eq('status', 'en_attente').neq('id', req.id);
    // 3. Créer le prêt
    await supabase.from('equipment_loans').insert({
      equipment_id: item.id,
      owner_id: profile.id,
      borrower_id: req.requester_id,
      request_id: req.id,
      status: 'reserve',
      reserved_at: new Date().toISOString(),
    });
    // 4. Passer le matériel en réservé
    await supabase.from('equipment_items')
      .update({ status: 'reserve', updated_at: new Date().toISOString() })
      .eq('id', item.id);

    toast.success('Demande acceptée — matériel réservé !');
    await fetchAll();
    setStatusLoading(false);
  };

  const handleRefuseRequest = async (req: EquipmentRequest) => {
    if (!item || !profile) return;
    const supabase = createClient();
    await supabase.from('equipment_requests').update({ status: 'refusee', updated_at: new Date().toISOString() }).eq('id', req.id);
    toast.success('Demande refusée');
    await fetchAll();
  };

  const handleMarkLoaned = async () => {
    if (!item || !activeLoan) return;
    setStatusLoading(true);
    const supabase = createClient();
    await supabase.from('equipment_loans').update({ status: 'en_cours', loan_started_at: new Date().toISOString() }).eq('id', activeLoan.id);
    await supabase.from('equipment_items').update({ status: 'prete', updated_at: new Date().toISOString() }).eq('id', item.id);
    toast.success('Matériel marqué comme prêté !');
    await fetchAll();
    setStatusLoading(false);
  };

  const handleMarkReturned = async () => {
    if (!item || !activeLoan) return;
    setStatusLoading(true);
    const supabase = createClient();
    await supabase.from('equipment_loans').update({ status: 'retourne', returned_at: new Date().toISOString() }).eq('id', activeLoan.id);
    await supabase.from('equipment_requests').update({ status: 'terminee' }).eq('id', activeLoan.request_id);
    await supabase.from('equipment_items').update({ status: 'rendu', updated_at: new Date().toISOString() }).eq('id', item.id);
    toast.success('Retour confirmé !');
    await fetchAll();
    setStatusLoading(false);
  };

  const handleDelete = async () => {
    if (!item || !profile) return;
    const { allowed, reason } = canDelete(item.status as EquipmentStatus, !!activeLoan);
    if (!allowed) { toast.error(`Suppression impossible : ${reason}`); return; }
    if (!window.confirm('Supprimer définitivement ce matériel ?')) return;
    const supabase = createClient();
    const photos = item.photos as Array<{ url: string }> | undefined;
    if (photos?.length) {
      for (const photo of photos) {
        const parts = photo.url.split('/storage/v1/object/public/photos/');
        if (parts[1]) await supabase.storage.from('photos').remove([parts[1]]);
      }
      await supabase.from('equipment_photos').delete().eq('item_id', item.id);
    }
    await supabase.from('equipment_items').delete().eq('id', item.id);
    toast.success('Matériel supprimé');
    router.push('/materiel');
  };

  // ── Emprunteur ──────────────────────────────────────────────────────────

  const handleSendRequest = async () => {
    if (!profile) { router.push('/connexion?redirect=/materiel/' + id); return; }
    if (!requestForm.start_date || !requestForm.end_date) { toast.error('Sélectionnez les dates'); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('equipment_requests').insert({
      equipment_id: id as string,
      requester_id: profile.id,
      message: requestForm.message || null,
      requested_start_date: requestForm.start_date,
      requested_end_date: requestForm.end_date,
      status: 'en_attente',
    });
    if (error) toast.error('Erreur lors de la demande');
    else {
      toast.success('Demande envoyée ! Le propriétaire sera notifié.');
      setRequestForm({ start_date: '', end_date: '', message: '' });
      setShowRequestForm(false);
    }
    setSubmitting(false);
  };

  const handleCancelMyRequest = async (reqId: string) => {
    const supabase = createClient();
    await supabase.from('equipment_requests').update({ status: 'annulee' }).eq('id', reqId);
    toast.success('Demande annulée');
    await fetchAll();
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-64 bg-gray-200 rounded-2xl" />
      <div className="h-8 bg-gray-200 rounded w-3/4" />
    </div>
  );
  if (!item) return null;

  const rawPhotos = item.photos as Array<{ id: string; url: string; display_order?: number }> | undefined;
  const photos = toPhotoItems(rawPhotos);
  const isOwner = profile?.id === item.owner_id;
  const status = (item.status as EquipmentStatus) || 'disponible';
  const cfg = EQUIPMENT_STATUS_CONFIG[status];
  const transitions = getAllowedTransitions(status);
  const pendingRequests = requests.filter(r => r.status === 'en_attente');
  const myRequest = profile ? requests.find(r => r.requester_id === profile.id && r.status === 'en_attente') : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/materiel" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au matériel
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Colonne gauche ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Photos */}
          {photos.length > 0 ? (
            <PhotoGallery photos={photos} title={item.title} mainHeight="h-72" />
          ) : (
            <div className="h-48 bg-gray-100 rounded-2xl flex items-center justify-center">
              <span className="text-6xl">
                {(item.category as { icon?: string })?.icon || '🔧'}
              </span>
            </div>
          )}

          {/* Titre & badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.icon} {cfg.label}
              </span>
              {item.is_free ? <Badge variant="success">Gratuit</Badge> : <Badge variant="default">{item.daily_rate}€/jour</Badge>}
              {item.category && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {(item.category as { icon?: string; name?: string }).icon} {(item.category as { name?: string }).name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {item.pickup_location && <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{item.pickup_location}</div>}
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(item.created_at)}</div>
              {item.condition && <span>{CONDITION_LABELS[item.condition] || item.condition}</span>}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Règles */}
          {item.rules && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-amber-800 mb-1">📋 Règles d&apos;utilisation</h3>
              <p className="text-sm text-amber-700">{item.rules}</p>
            </div>
          )}

          {/* Caution */}
          {item.deposit_amount && item.deposit_amount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Caution : {item.deposit_amount}€ (remboursable)</span>
              </div>
            </div>
          )}

          {/* Prêt actif (propriétaire) */}
          {isOwner && activeLoan && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {activeLoan.status === 'reserve' ? '🔒 Réservé pour' : '🔄 Actuellement prêté à'}
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={(activeLoan.borrower as { avatar_url?: string })?.avatar_url}
                  name={(activeLoan.borrower as { full_name?: string })?.full_name || '?'}
                  size="sm"
                />
                <div>
                  <div className="font-medium text-gray-900">{(activeLoan.borrower as { full_name?: string })?.full_name}</div>
                  <div className="text-xs text-gray-500">
                    {activeLoan.status === 'reserve' ? `Réservé le ${formatDate(activeLoan.reserved_at || '')}` : `Prêté depuis ${formatDate(activeLoan.loan_started_at || '')}`}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {activeLoan.status === 'reserve' && (
                  <Button onClick={handleMarkLoaned} loading={statusLoading} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    <CheckCircle className="w-4 h-4" /> Marquer comme prêté
                  </Button>
                )}
                {activeLoan.status === 'en_cours' && (
                  <Button onClick={handleMarkReturned} loading={statusLoading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="w-4 h-4" /> Confirmer le retour
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Demandes en attente (propriétaire) */}
          {isOwner && pendingRequests.length > 0 && (
            <div className="bg-white rounded-2xl border border-orange-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente
              </h3>
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Avatar
                      src={(req.requester as { avatar_url?: string })?.avatar_url}
                      name={(req.requester as { full_name?: string })?.full_name || '?'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{(req.requester as { full_name?: string })?.full_name}</div>
                      {req.requested_start_date && (
                        <div className="text-xs text-gray-500">
                          {req.requested_start_date} → {req.requested_end_date}
                        </div>
                      )}
                      {req.message && <p className="text-xs text-gray-600 truncate mt-0.5">{req.message}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleAcceptRequest(req)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition">
                        <CheckCircle className="w-3.5 h-3.5" /> Accepter
                      </button>
                      <button onClick={() => handleRefuseRequest(req)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-200 transition">
                        <XCircle className="w-3.5 h-3.5" /> Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique statuts */}
          {(isOwner || profile?.role === 'admin') && history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowHistory(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
              >
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <History className="w-4 h-4" /> Historique des statuts
                </h3>
                {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showHistory && (
                <div className="px-5 pb-4 space-y-2">
                  {history.map(h => {
                    const oldCfg = h.old_status ? EQUIPMENT_STATUS_CONFIG[h.old_status as EquipmentStatus] : null;
                    const newCfg = EQUIPMENT_STATUS_CONFIG[h.new_status as EquipmentStatus];
                    return (
                      <div key={h.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                        <div className="text-xs text-gray-400 w-28 flex-shrink-0">{formatDate(h.created_at)}</div>
                        <div className="flex items-center gap-1.5">
                          {oldCfg && <span className={`text-xs px-2 py-0.5 rounded-full ${oldCfg.bg} ${oldCfg.color}`}>{oldCfg.label}</span>}
                          {oldCfg && <span className="text-gray-400">→</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${newCfg?.bg} ${newCfg?.color}`}>{newCfg?.label || h.new_status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar droite ── */}
        <div className="space-y-4">

          {/* Propriétaire */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Proposé par</h3>
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                src={(item.owner as { avatar_url?: string })?.avatar_url}
                name={(item.owner as { full_name?: string })?.full_name || '?'}
                size="md"
              />
              <div>
                <div className="font-medium text-gray-900">{(item.owner as { full_name?: string })?.full_name || 'Habitant'}</div>
                <div className="text-xs text-gray-400">Habitant de Biguglia</div>
              </div>
            </div>

            {/* Actions propriétaire */}
            {isOwner ? (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="text-xs text-center text-brand-600 font-medium py-1 bg-brand-50 rounded-xl">
                  ✅ C&apos;est votre matériel
                </div>

                {/* Transitions de statut */}
                {transitions.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 mb-2">Actions disponibles :</div>
                    {transitions.map(t => {
                      const tCfg = EQUIPMENT_STATUS_CONFIG[t];
                      return (
                        <button
                          key={t}
                          onClick={() => handleStatusChange(t)}
                          disabled={statusLoading}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition hover:opacity-90 ${tCfg.bg} ${tCfg.color} ${tCfg.border}`}
                        >
                          <span>{tCfg.icon}</span>
                          {getTransitionLabel(status, t)}
                        </button>
                      );
                    })}
                  </div>
                )}

                <Link href={`/materiel/${id}/modifier`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">
                  <Pencil className="w-4 h-4" /> Modifier la fiche
                </Link>

                <Link href="/dashboard/materiel"
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-50 text-gray-700 border border-gray-200 text-sm rounded-xl hover:bg-gray-100 transition">
                  <Package className="w-4 h-4" /> Tableau de bord
                </Link>

                <button
                  onClick={() => {
                    if (navigator.share) navigator.share({ title: item.title, url: window.location.href });
                    else { navigator.clipboard.writeText(window.location.href); toast.success('Lien copié !'); }
                  }}
                  className="flex items-center justify-center gap-2 w-full px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition">
                  <Share2 className="w-3.5 h-3.5" /> Partager
                </button>

                <button onClick={handleDelete}
                  className="flex items-center justify-center gap-1 w-full text-xs text-red-400 hover:text-red-600 py-1 transition">
                  Supprimer
                </button>
              </div>
            ) : (
              /* Bouton contact visiteur */
              <ContactButton
                sourceType="equipment"
                sourceId={item.id}
                sourceTitle={item.title}
                ownerId={item.owner_id}
                userId={profile?.id}
                className="w-full"
              />
            )}
          </div>

          {/* Demande d'emprunt (visiteur) */}
          {!isOwner && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Demander à emprunter</h3>

              {!isRequestable(status) ? (
                <div className={`text-center py-3 rounded-xl ${cfg.bg} ${cfg.color} text-sm font-medium border ${cfg.border}`}>
                  {cfg.icon} {cfg.description}
                </div>
              ) : myRequest ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-700">Demande en attente de réponse</span>
                  </div>
                  <button onClick={() => handleCancelMyRequest(myRequest.id)}
                    className="w-full text-xs text-gray-400 hover:text-red-500 transition py-1">
                    Annuler ma demande
                  </button>
                </div>
              ) : !showRequestForm ? (
                <Button onClick={() => {
                  if (!profile) { router.push('/connexion?redirect=/materiel/' + id); return; }
                  setShowRequestForm(true);
                }} className="w-full">
                  <MessageSquare className="w-4 h-4" /> Faire une demande
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input label="Date de début *" type="date" value={requestForm.start_date}
                    onChange={(e) => setRequestForm(f => ({ ...f, start_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]} />
                  <Input label="Date de fin *" type="date" value={requestForm.end_date}
                    onChange={(e) => setRequestForm(f => ({ ...f, end_date: e.target.value }))}
                    min={requestForm.start_date || new Date().toISOString().split('T')[0]} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message (optionnel)</label>
                    <textarea value={requestForm.message}
                      onChange={(e) => setRequestForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Décrivez votre usage, vos précautions..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowRequestForm(false)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                      Annuler
                    </button>
                    <Button onClick={handleSendRequest} loading={submitting} className="flex-1">
                      Envoyer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ma demande (emprunteur) */}
          {!isOwner && profile && (() => {
            const allMyRequests = requests.filter(r => r.requester_id === profile.id);
            if (allMyRequests.length === 0) return null;
            const latest = allMyRequests[0];
            const rCfg = LOAN_REQUEST_STATUS_CONFIG[latest.status];
            return (
              <div className={`rounded-xl border p-4 ${rCfg.bg}`}>
                <div className={`text-sm font-medium ${rCfg.color} flex items-center gap-2`}>
                  {rCfg.icon} {rCfg.label}
                </div>
                <p className="text-xs text-gray-500 mt-1">Votre dernière demande</p>
              </div>
            );
          })()}

          {/* Conseils */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-medium text-blue-800">Conseils de prêt</h4>
            </div>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Vérifiez l&apos;état avant de prendre</li>
              <li>• Respectez les règles d&apos;utilisation</li>
              <li>• Rendez propre et en bon état</li>
              <li>• Signalez tout problème immédiatement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
