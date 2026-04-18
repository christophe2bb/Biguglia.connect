'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  EQUIPMENT_STATUS_CONFIG, canDelete, EquipmentStatus,
  EquipmentItemFull, EquipmentRequest, EquipmentLoan, EquipmentStatusHistory,
} from '@/lib/equipment';
import type { UseMaterielDetailReturn } from './_types';

export function useMaterielDetail(initialItem: EquipmentItemFull): UseMaterielDetailReturn {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();

  // Initialisé avec les données serveur (évite le double-fetch)
  const [item, setItem]           = useState<EquipmentItemFull | null>(initialItem);
  const [requests, setRequests]   = useState<EquipmentRequest[]>([]);
  const [activeLoan, setActiveLoan] = useState<EquipmentLoan | null>(null);
  const [history, setHistory]     = useState<EquipmentStatusHistory[]>([]);
  const [loading, setLoading]     = useState(false); // déjà chargé côté serveur
  const [showHistory, setShowHistory]       = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm]         = useState({ start_date: '', end_date: '', message: '' });
  const [submitting, setSubmitting]           = useState(false);
  const [statusLoading, setStatusLoading]     = useState(false);
  const [ownerNote, setOwnerNote]             = useState('');
  const [borrowerNote, setBorrowerNote]       = useState('');
  const [showOwnerNoteForm, setShowOwnerNoteForm] = useState(false);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('equipment_items')
      .select('*, category:equipment_categories(*), photos:equipment_photos(id, url, display_order, is_cover)')
      .eq('id', id)
      .single();
    if (error || !data) { toast.error('Matériel introuvable'); router.push('/materiel'); return; }

    let ownerData = null;
    if (data.owner_id) {
      const { data: op } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, created_at')
        .eq('id', data.owner_id)
        .single();
      ownerData = op;
    }

    const photos = ((data.photos || []) as Array<{ id: string; url: string; display_order: number; is_cover?: boolean }>)
      .sort((a, b) => a.display_order - b.display_order);
    setItem({ ...data, owner: ownerData, photos } as unknown as EquipmentItemFull);

    if (profile?.id === data.owner_id || profile?.role === 'admin') {
      const { data: reqs } = await supabase
        .from('equipment_requests')
        .select('*, requester:profiles!equipment_requests_requester_id_fkey(id, full_name, avatar_url)')
        .eq('equipment_id', id)
        .order('created_at', { ascending: false });
      setRequests((reqs as EquipmentRequest[]) || []);
    }

    const { data: loan } = await supabase
      .from('equipment_loans')
      .select('*, borrower:profiles!equipment_loans_borrower_id_fkey(id, full_name, avatar_url)')
      .eq('equipment_id', id)
      .in('status', ['reserve', 'en_cours'])
      .maybeSingle();
    setActiveLoan(loan as EquipmentLoan | null);

    const { data: hist } = await supabase
      .from('equipment_status_history')
      .select('*')
      .eq('equipment_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory((hist as EquipmentStatusHistory[]) || []);

    setLoading(false);
  }, [id, profile?.id, profile?.role, router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Notifications helper ──────────────────────────────────────────────────
  const sendNotification = async (userId: string, type: string, title: string, message: string, link: string) => {
    const supabase = createClient();
    await supabase.from('notifications').insert({ user_id: userId, type, title, message, link });
  };

  // ── Actions propriétaire ──────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: EquipmentStatus) => {
    if (!item || !profile) return;
    setStatusLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('equipment_items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) toast.error('Erreur lors du changement de statut');
    else { toast.success(`Statut mis à jour : ${EQUIPMENT_STATUS_CONFIG[newStatus].label}`); await fetchAll(); }
    setStatusLoading(false);
  };

  const handleAcceptRequest = async (req: EquipmentRequest) => {
    if (!item || !profile) return;
    setStatusLoading(true);
    const supabase = createClient();
    await supabase.from('equipment_requests').update({ status: 'acceptee', updated_at: new Date().toISOString() }).eq('id', req.id);
    const { data: others } = await supabase
      .from('equipment_requests').select('id, requester_id')
      .eq('equipment_id', item.id).eq('status', 'en_attente').neq('id', req.id);
    await supabase.from('equipment_requests')
      .update({ status: 'refusee', updated_at: new Date().toISOString() })
      .eq('equipment_id', item.id).eq('status', 'en_attente').neq('id', req.id);
    for (const other of (others || [])) {
      await sendNotification(other.requester_id, 'request_update', '❌ Demande refusée',
        `Votre demande pour "${item.title}" n'a pas été retenue.`, `/materiel/${item.id}`);
    }
    await supabase.from('equipment_loans').insert({
      equipment_id: item.id, owner_id: profile.id, borrower_id: req.requester_id,
      request_id: req.id, status: 'reserve', reserved_at: new Date().toISOString(),
    });
    await supabase.from('equipment_items').update({ status: 'reserve', updated_at: new Date().toISOString() }).eq('id', item.id);
    await sendNotification(req.requester_id, 'request_update', '✅ Demande acceptée !',
      `Votre demande pour "${item.title}" a été acceptée.`, `/materiel/${item.id}`);
    toast.success('Demande acceptée — matériel réservé !');
    await fetchAll();
    setStatusLoading(false);
  };

  const handleRefuseRequest = async (req: EquipmentRequest) => {
    if (!item || !profile) return;
    const supabase = createClient();
    await supabase.from('equipment_requests').update({ status: 'refusee', updated_at: new Date().toISOString() }).eq('id', req.id);
    await sendNotification(req.requester_id, 'request_update', '❌ Demande refusée',
      `Votre demande pour "${item.title}" a été refusée par le propriétaire.`, `/materiel/${item.id}`);
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
    if (!item || !activeLoan || !profile) return;
    setStatusLoading(true);
    const supabase = createClient();
    await supabase.from('equipment_loans').update({ status: 'retourne', returned_at: new Date().toISOString() }).eq('id', activeLoan.id);
    await supabase.from('equipment_requests').update({ status: 'terminee' }).eq('id', activeLoan.request_id);
    await supabase.from('equipment_items').update({ status: 'rendu', updated_at: new Date().toISOString() }).eq('id', item.id);
    const now = new Date().toISOString();
    await supabase.from('trust_interactions').upsert({
      source_type: 'equipment', source_id: item.id,
      requester_id: activeLoan.borrower_id, receiver_id: item.owner_id,
      interaction_type: 'material_request', status: 'done',
      review_unlocked: true, completed_at: now,
      status_history: [{ status: 'done', changed_at: now }],
    }, { onConflict: 'source_type,source_id,requester_id' });
    await sendNotification(activeLoan.borrower_id, 'loan_returned', '📦 Retour confirmé',
      `Le retour de "${item.title}" est confirmé.`, `/profil/${item.owner_id}`);
    await sendNotification(item.owner_id, 'loan_returned', '📦 Matériel rendu',
      `"${item.title}" a été rendu.`, `/profil/${activeLoan.borrower_id}`);
    toast.success('Retour confirmé ! Les avis sont maintenant débloqués.');
    setShowOwnerNoteForm(true);
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

  // ── Actions emprunteur ────────────────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!profile || !item) { router.push('/connexion?redirect=/materiel/' + id); return; }
    if (!requestForm.start_date || !requestForm.end_date) { toast.error('Sélectionnez les dates'); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('equipment_requests').insert({
      equipment_id: id, requester_id: profile.id,
      message: requestForm.message || null,
      requested_start_date: requestForm.start_date,
      requested_end_date: requestForm.end_date,
      status: 'en_attente',
    });
    if (error) toast.error('Erreur lors de la demande');
    else {
      await sendNotification(item.owner_id, 'new_request', '📬 Nouvelle demande d\'emprunt',
        `${profile.full_name || 'Un membre'} souhaite emprunter "${item.title}".`, `/materiel/${id}`);
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

  const handleSaveOwnerNote = async () => {
    if (!ownerNote.trim() || !activeLoan) return;
    const supabase = createClient();
    await supabase.from('equipment_loans').update({ notes_owner: ownerNote }).eq('id', activeLoan.id);
    setShowOwnerNoteForm(false);
    toast.success('Note enregistrée');
  };

  const handleSaveBorrowerNote = async () => {
    if (!borrowerNote.trim() || !activeLoan) return;
    const supabase = createClient();
    await supabase.from('equipment_loans').update({ notes_borrower: borrowerNote }).eq('id', activeLoan.id);
    toast.success('Note enregistrée !');
    setBorrowerNote('');
  };

  const isOwner = profile?.id === item?.owner_id;

  return {
    item, requests, activeLoan, history, loading,
    showHistory, setShowHistory,
    showRequestForm, setShowRequestForm,
    requestForm, setRequestForm,
    submitting, statusLoading,
    ownerNote, setOwnerNote,
    borrowerNote, setBorrowerNote,
    showOwnerNoteForm, setShowOwnerNoteForm,
    handleStatusChange, handleAcceptRequest, handleRefuseRequest,
    handleMarkLoaned, handleMarkReturned, handleDelete,
    handleSendRequest, handleCancelMyRequest,
    handleSaveOwnerNote, handleSaveBorrowerNote,
    isOwner,
  };
}
