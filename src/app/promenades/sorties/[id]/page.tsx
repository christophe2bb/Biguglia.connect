'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  MapPin, Clock, Mountain, Camera, Users, ChevronLeft,
  BarChart3, ParkingSquare, Baby, Dog, Sun, Footprints,
  MessageSquare, Send, Loader2, X, CheckCircle2,
  AlertCircle, History, Calendar, User,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import ContactButton from '@/components/ui/ContactButton';
import toast from 'react-hot-toast';
import {
  OUTING_STATUS_CONFIG,
  OUTING_TRANSITIONS,
  legacyToFrenchStatus,
  computeDisplayStatus,
  canRegister,
  type OutingStatus,
} from '@/lib/outings';

// ─── Types ────────────────────────────────────────────────────────────────────
type Participant = {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  created_at: string;
  notes?: string;
  profile?: { full_name: string; avatar_url?: string } | null;
};

type StatusHistory = {
  id: string;
  old_status: string | null;
  new_status: string;
  reason?: string;
  created_at: string;
  changed_by_profile?: { full_name: string } | null;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name: string; avatar_url?: string } | null;
};

type OutingPhoto = {
  url: string;
  display_order: number;
  is_cover?: boolean;
};

type Outing = {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  outing_date: string;
  outing_time: string;
  max_participants: number;
  meeting_point: string | null;
  parking_info: string | null;
  parking_available: boolean;
  stroller_accessible: boolean;
  difficulty: 'facile' | 'moyen' | 'difficile' | null;
  kids_friendly: boolean;
  dogs_allowed: boolean;
  status: string;
  is_registration_open: boolean;
  location_area: string | null;
  location_city: string | null;
  duration_estimate: string | null;
  notes: string | null;
  cover_photo_url: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  organizer?: { full_name: string; avatar_url?: string } | null;
  photos?: OutingPhoto[];
};

const DIFF_CONFIG = {
  facile:    { label: 'Facile',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  moyen:     { label: 'Moyen',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  difficile: { label: 'Difficile', color: 'bg-red-100 text-red-700 border-red-200' },
};

export default function OutingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const supabase = createClient();
  const outingId = params.id as string;

  const [outing, setOuting] = useState<Outing | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userParticipation, setUserParticipation] = useState<Participant | null>(null);

  const [activeTab, setActiveTab] = useState<'info' | 'participants' | 'discussion' | 'historique'>('info');
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Modale transition statut
  const [showModal, setShowModal] = useState(false);
  const [pendingTo, setPendingTo] = useState<OutingStatus | null>(null);
  const [pendingLabel, setPendingLabel] = useState('');
  const [pendingRequiresReason, setPendingRequiresReason] = useState(false);
  const [transitionReason, setTransitionReason] = useState('');
  const [applyingTransition, setApplyingTransition] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchOuting = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('group_outings')
      .select(`
        *,
        organizer:profiles!group_outings_organizer_id_fkey(full_name, avatar_url),
        photos:outing_photos(url, display_order, is_cover)
      `)
      .eq('id', outingId)
      .single();

    if (error || !data) {
      toast.error('Sortie introuvable');
      router.push('/promenades?tab=agenda');
      return;
    }

    if (data.photos) {
      data.photos.sort(
        (a: OutingPhoto, b: OutingPhoto) => a.display_order - b.display_order
      );
    }
    setOuting(data as Outing);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outingId]);

  const fetchParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('outing_participants')
      .select('*, profile:profiles!outing_participants_user_id_fkey(full_name, avatar_url)')
      .eq('outing_id', outingId)
      .neq('status', 'annule')
      .order('joined_at', { ascending: true });
    const list = (data || []) as Participant[];
    setParticipants(list);
    if (profile) {
      setUserParticipation(list.find(p => p.user_id === profile.id) || null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outingId, profile]);

  const fetchStatusHistory = useCallback(async () => {
    const { data } = await supabase
      .from('outing_status_history')
      .select('*, changed_by_profile:profiles(full_name)')
      .eq('outing_id', outingId)
      .order('created_at', { ascending: false })
      .limit(20);
    setStatusHistory((data || []) as StatusHistory[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outingId]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('outing_comments')
      .select('*, author:profiles!outing_comments_author_id_fkey(full_name, avatar_url)')
      .eq('outing_id', outingId)
      .order('created_at', { ascending: true })
      .limit(50);
    setComments((data || []) as Comment[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outingId]);

  useEffect(() => { fetchOuting(); }, [fetchOuting]);
  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);
  useEffect(() => { if (activeTab === 'historique') fetchStatusHistory(); }, [activeTab, fetchStatusHistory]);
  useEffect(() => { if (activeTab === 'discussion') fetchComments(); }, [activeTab, fetchComments]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!profile) { toast.error('Connectez-vous pour vous inscrire'); router.push('/connexion'); return; }
    if (!outing) return;
    setRegistering(true);

    if (userParticipation) {
      const { error } = await supabase
        .from('outing_participants')
        .update({ status: 'annule', cancelled_at: new Date().toISOString() })
        .eq('id', userParticipation.id);
      if (error) toast.error('Erreur lors de l\'annulation');
      else toast.success('Inscription annulée');
    } else {
      const frSt = legacyToFrenchStatus(outing.status);
      const active = participants.filter(p => p.status !== 'annule').length;
      const { allowed, reason } = canRegister(frSt, active, outing.max_participants, outing.outing_date);
      if (!allowed) { toast.error(reason || 'Inscription impossible'); setRegistering(false); return; }

      const { error } = await supabase
        .from('outing_participants')
        .insert({ outing_id: outingId, user_id: profile.id, status: 'inscrit', joined_at: new Date().toISOString() });
      if (error) {
        if (error.code === '23505') toast.error('Vous êtes déjà inscrit(e)');
        else toast.error('Erreur lors de l\'inscription');
      } else {
        toast.success('🥾 Inscription confirmée ! L\'organisateur vous contactera.', { duration: 4000 });
      }
    }

    await fetchParticipants();
    await fetchOuting();
    setRegistering(false);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !profile || sendingComment) return;
    setSendingComment(true);
    const { error } = await supabase.from('outing_comments').insert({
      outing_id: outingId,
      author_id: profile.id,
      content: commentText.trim(),
    });
    if (!error) { setCommentText(''); fetchComments(); }
    setSendingComment(false);
  };

  const openTransitionModal = (to: OutingStatus, label: string, requiresReason = false) => {
    setPendingTo(to);
    setPendingLabel(label);
    setPendingRequiresReason(requiresReason);
    setTransitionReason('');
    setShowModal(true);
  };

  const applyTransition = async () => {
    if (!outing || !pendingTo || !profile) return;
    if (pendingRequiresReason && !transitionReason.trim()) {
      toast.error('Veuillez indiquer une raison'); return;
    }
    setApplyingTransition(true);

    const updateData: Record<string, unknown> = {
      status: pendingTo,
      updated_at: new Date().toISOString(),
    };
    if (pendingTo === 'archivee') updateData.archived_at = new Date().toISOString();
    if (pendingTo === 'ouverte') updateData.is_registration_open = true;
    if (['annulee', 'terminee', 'archivee'].includes(pendingTo)) updateData.is_registration_open = false;

    const { error } = await supabase.from('group_outings').update(updateData).eq('id', outingId);

    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      await supabase.from('outing_status_history').insert({
        outing_id: outingId,
        old_status: outing.status,
        new_status: pendingTo,
        changed_by: profile.id,
        reason: transitionReason.trim() || null,
      }).then(() => {});

      const cfg = OUTING_STATUS_CONFIG[pendingTo];
      toast.success(`${cfg.icon} Statut : ${cfg.label}`);
      setShowModal(false);
      await fetchOuting();
      await fetchStatusHistory();
    }
    setApplyingTransition(false);
  };

  const handleDeleteOuting = async () => {
    const active = participants.filter(p => p.status !== 'annule').length;
    if (active > 0) {
      if (!confirm(`Cette sortie a ${active} participant(s) actif(s). Supprimer quand même ?`)) return;
    } else {
      if (!confirm('Supprimer définitivement cette sortie ?')) return;
    }
    const { error } = await supabase.from('group_outings').delete().eq('id', outingId);
    if (error) toast.error('Erreur lors de la suppression');
    else { toast.success('Sortie supprimée'); router.push('/promenades?tab=agenda'); }
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const isOrganizer = profile?.id === outing?.organizer_id;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
  const canManage = isOrganizer || isAdmin;

  const activeParticipants = participants.filter(p => p.status !== 'annule');

  const frenchStatus: OutingStatus = outing
    ? computeDisplayStatus(
        legacyToFrenchStatus(outing.status),
        activeParticipants.length,
        outing.max_participants,
        outing.outing_date,
      )
    : 'ouverte';

  const statusCfg = OUTING_STATUS_CONFIG[frenchStatus];
  const availableTransitions = canManage
    ? OUTING_TRANSITIONS.filter(t => t.from === frenchStatus)
    : [];

  const fillPct = outing
    ? Math.round((activeParticipants.length / outing.max_participants) * 100)
    : 0;

  const coverPhoto =
    outing?.photos?.find(p => p.is_cover)?.url ||
    outing?.photos?.[0]?.url ||
    outing?.cover_photo_url;

  const dateLabel = outing
    ? new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }
  if (!outing) return null;

  const diffConf = outing.difficulty ? DIFF_CONFIG[outing.difficulty] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white">

      {/* ── HERO ── */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPhoto} alt={outing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Footprints className="w-24 h-24 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Retour */}
        <Link href="/promenades?tab=agenda"
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-all">
          <ChevronLeft className="w-4 h-4" /> Sorties
        </Link>

        {/* Boutons organisateur */}
        {canManage && (
          <div className="absolute top-4 right-4 flex gap-2">
            <Link href={`/promenades?editOuting=${outing.id}`}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-all">
              ✏️ Modifier
            </Link>
            <button onClick={handleDeleteOuting}
              className="bg-red-500/70 hover:bg-red-600/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-all">
              Supprimer
            </button>
          </div>
        )}

        {/* Statut & titre */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${statusCfg.badgeBg} ${statusCfg.badgeText}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
            {diffConf && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${diffConf.color} bg-white/90`}>
                <BarChart3 className="w-3.5 h-3.5" /> {diffConf.label}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow line-clamp-2">{outing.title}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Stats rapides ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Sun, color: 'text-emerald-500', label: 'Date', value: dateLabel },
            { icon: Clock, color: 'text-sky-500', label: 'Heure', value: outing.outing_time },
            {
              icon: Users,
              color: fillPct >= 100 ? 'text-red-500' : 'text-purple-500',
              label: 'Participants',
              value: `${activeParticipants.length} / ${outing.max_participants}`,
            },
            {
              icon: Mountain,
              color: 'text-amber-500',
              label: 'Niveau',
              value: outing.difficulty ? DIFF_CONFIG[outing.difficulty].label : '—',
            },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Barre de remplissage ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className={`font-bold flex items-center gap-1.5 ${fillPct >= 100 ? 'text-red-600' : 'text-emerald-700'}`}>
              <Users className="w-4 h-4" />
              {activeParticipants.length} / {outing.max_participants} places
              {fillPct >= 100 && ' · Complet'}
            </span>
            <span className="text-xs text-gray-500">{fillPct}% rempli</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-red-400' : fillPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(fillPct, 100)}%` }}
            />
          </div>
        </div>

        {/* ── Actions inscription / statut ── */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">

            {/* Participant: bouton inscription */}
            {!canManage && (
              profile ? (
                <button
                  onClick={handleRegister}
                  disabled={registering || (!userParticipation && frenchStatus !== 'ouverte')}
                  className={`inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 ${
                    userParticipation
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : frenchStatus === 'ouverte'
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {registering
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement…</>
                    : userParticipation
                      ? <><X className="w-4 h-4" /> Annuler mon inscription</>
                      : <><Users className="w-4 h-4" /> Je participe</>
                  }
                </button>
              ) : (
                <Link href="/connexion"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
                  <Users className="w-4 h-4" /> Se connecter pour participer
                </Link>
              )
            )}

            {/* Contact organisateur */}
            {!canManage && profile && (
              <ContactButton
                sourceType="outing"
                sourceId={outing.id}
                sourceTitle={outing.title}
                ownerId={outing.organizer_id}
                userId={profile.id}
                size="sm"
              />
            )}

            {/* Transitions organisateur */}
            {canManage && availableTransitions.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-gray-500">Changer le statut :</span>
                {availableTransitions.map(t => {
                  const toCfg = OUTING_STATUS_CONFIG[t.to];
                  return (
                    <button
                      key={`${t.from}-${t.to}`}
                      onClick={() => openTransitionModal(t.to, t.label, t.requiresReason)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:opacity-80 ${toCfg.bg} ${toCfg.color} ${toCfg.border}`}
                    >
                      {toCfg.icon} {t.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Signaler */}
            {profile && !canManage && (
              <div className="ml-auto">
                <ReportButton targetType="outing" targetId={outing.id} targetTitle={outing.title} variant="mini" />
              </div>
            )}
          </div>

          {/* Mon statut de participation */}
          {userParticipation && (
            <div className={`mt-3 text-sm flex items-center gap-2 px-3 py-2 rounded-xl border ${
              userParticipation.status === 'confirme'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                {userParticipation.status === 'confirme'
                  ? 'Votre participation est confirmée'
                  : 'Vous êtes inscrit(e) à cette sortie'}
                {userParticipation.joined_at && (
                  <span className="text-xs opacity-70 ml-1.5">
                    — {formatRelative(userParticipation.joined_at)}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* ── Onglets ── */}
        <div className="flex gap-1.5 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm flex-wrap">
          {([
            { id: 'info',         label: 'Infos',                                  icon: MapPin },
            { id: 'participants', label: `Participants (${activeParticipants.length})`, icon: Users },
            { id: 'discussion',  label: 'Discussion',                              icon: MessageSquare },
            ...(canManage ? [{ id: 'historique', label: 'Historique', icon: History }] : []),
          ] as { id: string; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── Tab : Info ── */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Organisateur */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" /> Organisateur
              </h3>
              <div className="flex items-center gap-3">
                <Avatar
                  src={outing.organizer?.avatar_url}
                  name={outing.organizer?.full_name || 'Organisateur'}
                  size="md"
                />
                <div>
                  <p className="font-semibold text-gray-800">{outing.organizer?.full_name || 'Membre'}</p>
                  <p className="text-xs text-gray-400">Organisateur · créé {formatRelative(outing.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {outing.description && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">À propos de cette sortie</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{outing.description}</p>
              </div>
            )}

            {/* Lieu & Logistique */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Lieu & Logistique
              </h3>
              <div className="space-y-3">
                {outing.meeting_point && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">Point de rendez-vous</p>
                      <p className="text-sm text-gray-700">{outing.meeting_point}</p>
                    </div>
                  </div>
                )}
                {(outing.location_city || outing.location_area) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600">
                      {[outing.location_area, outing.location_city].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}
                {outing.duration_estimate && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">Durée estimée</p>
                      <p className="text-sm text-gray-700">{outing.duration_estimate}</p>
                    </div>
                  </div>
                )}
                {outing.parking_info && (
                  <div className="flex items-start gap-2">
                    <ParkingSquare className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">Parking</p>
                      <p className="text-sm text-gray-700">{outing.parking_info}</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Badges options */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
                {outing.parking_available && (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    <ParkingSquare className="w-3.5 h-3.5" /> Parking disponible
                  </span>
                )}
                {outing.stroller_accessible && (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                    <Baby className="w-3.5 h-3.5" /> Accès poussette
                  </span>
                )}
                {outing.kids_friendly && (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    <Users className="w-3.5 h-3.5" /> Adapté enfants
                  </span>
                )}
                {outing.dogs_allowed && (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Dog className="w-3.5 h-3.5" /> Chiens acceptés
                  </span>
                )}
              </div>
            </div>

            {/* Notes organisateur */}
            {outing.notes && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
                <p className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Notes de l&apos;organisateur
                </p>
                <p className="text-sm text-amber-700 whitespace-pre-wrap">{outing.notes}</p>
              </div>
            )}

            {/* Galerie photos */}
            {outing.photos && outing.photos.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-500" /> Photos
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {outing.photos.map((photo, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={photo.url} alt="" className="w-full h-24 object-cover rounded-xl" />
                  ))}
                </div>
              </div>
            )}

            {/* Notation (sortie terminée) */}
            {(frenchStatus === 'terminee' || new Date(outing.outing_date + 'T23:59:59') < new Date()) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <RatingWidget
                  targetType="outing"
                  targetId={outing.id}
                  authorId={outing.organizer_id}
                  userId={profile?.id}
                  compact={false}
                  showPoll
                />
              </div>
            )}
          </div>
        )}

        {/* ── Tab : Participants ── */}
        {activeTab === 'participants' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">
              Participants ({activeParticipants.length}&nbsp;/&nbsp;{outing.max_participants})
            </h3>
            {activeParticipants.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500">Aucun participant pour l&apos;instant</p>
                {frenchStatus === 'ouverte' && (
                  <p className="text-sm text-emerald-600 mt-1">Soyez le premier à vous inscrire !</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {activeParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <Avatar
                      src={p.profile?.avatar_url}
                      name={p.profile?.full_name || 'Membre'}
                      size="sm"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{p.profile?.full_name || 'Membre'}</p>
                      <p className="text-xs text-gray-400">
                        Inscrit {formatRelative(p.joined_at || p.created_at)}
                      </p>
                    </div>
                    {canManage && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        p.status === 'confirme'  ? 'bg-blue-100 text-blue-700'   :
                        p.status === 'present'   ? 'bg-green-100 text-green-700' :
                        p.status === 'absent'    ? 'bg-red-100 text-red-700'     :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.status === 'confirme' ? 'Confirmé'
                          : p.status === 'present' ? 'Présent'
                          : p.status === 'absent'  ? 'Absent'
                          : 'Inscrit'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab : Discussion ── */}
        {activeTab === 'discussion' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Discussion</h3>
            {comments.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500">Aucun message — démarrez la discussion !</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar src={c.author?.avatar_url} name={c.author?.full_name || 'Membre'} size="sm" />
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-xs font-bold text-gray-700">
                        {c.author?.full_name || 'Membre'}
                        <span className="font-normal text-gray-400 ml-2">{formatRelative(c.created_at)}</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {profile ? (
              <div className="flex items-end gap-2 mt-2">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); }
                  }}
                  placeholder="Votre message… (Entrée pour envoyer)"
                  rows={2}
                  className="flex-1 text-sm rounded-xl border border-emerald-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || sendingComment}
                  className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-all flex-shrink-0"
                >
                  {sendingComment
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion"
                className="block text-center text-emerald-600 font-semibold text-sm py-2 hover:underline">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}

        {/* ── Tab : Historique ── */}
        {activeTab === 'historique' && canManage && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-500" /> Historique des statuts
            </h3>
            {statusHistory.length === 0 ? (
              <div className="text-center py-10">
                <History className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500">Aucun historique disponible</p>
                <p className="text-xs text-gray-400 mt-1">Les changements de statut apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statusHistory.map(h => {
                  const newCfg = OUTING_STATUS_CONFIG[legacyToFrenchStatus(h.new_status)];
                  const oldCfg = h.old_status
                    ? OUTING_STATUS_CONFIG[legacyToFrenchStatus(h.old_status)]
                    : null;
                  return (
                    <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="text-lg flex-shrink-0">{newCfg?.icon || '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {newCfg?.label || h.new_status}
                          {oldCfg && (
                            <span className="text-gray-400 font-normal"> ← {oldCfg.label}</span>
                          )}
                        </p>
                        {h.reason && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">&quot;{h.reason}&quot;</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatRelative(h.created_at)}
                          {h.changed_by_profile?.full_name && (
                            <span className="ml-1.5">— par {h.changed_by_profile.full_name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            <Calendar className="w-3 h-3 inline mr-1" />
            Sortie créée {formatRelative(outing.created_at)}
          </p>
        </div>
      </div>

      {/* ── Modale transition statut ── */}
      {showModal && pendingTo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Changer le statut</h3>
              <button onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const toCfg = OUTING_STATUS_CONFIG[pendingTo];
              return (
                <>
                  <div className={`p-3 rounded-xl mb-4 border ${toCfg.bg} ${toCfg.border}`}>
                    <p className={`font-bold text-sm flex items-center gap-2 ${toCfg.color}`}>
                      {toCfg.icon} {pendingLabel}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{toCfg.description}</p>
                  </div>

                  {pendingRequiresReason && (
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Raison <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={transitionReason}
                        onChange={e => setTransitionReason(e.target.value)}
                        placeholder="Ex : Météo défavorable, lieu indisponible…"
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={applyTransition}
                      disabled={applyingTransition || (pendingRequiresReason && !transitionReason.trim())}
                      className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 ${toCfg.bg} ${toCfg.color} border ${toCfg.border} hover:opacity-80`}
                    >
                      {applyingTransition
                        ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        : `Confirmer : ${pendingLabel}`}
                    </button>
                    <button onClick={() => setShowModal(false)}
                      className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 font-semibold">
                      Annuler
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
