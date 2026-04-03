'use client';

/**
 * Admin — Page de modération détaillée
 *
 * Revue complète d'une publication : contenu, photos, profil auteur,
 * historique de modération, score de risque, actions.
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, ArrowLeft, CheckCircle, XCircle, AlertTriangle,
  Eye, ExternalLink, Clock, User, Flag, ChevronRight,
  FileText, Image as ImageIcon, History, MessageSquare,
  BarChart3, Star, RefreshCw, Send, AlertCircle, Info,
  Package, Wrench, Heart, Footprints, Calendar, MapPin,
  BookOpen, Handshake, ShieldOff, Archive, Pencil,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Avatar from '@/components/ui/Avatar';
import ModerationBadge from '@/components/ui/ModerationBadge';
import ProtectedPage from '@/components/providers/ProtectedPage';
import toast from 'react-hot-toast';
import { formatRelative } from '@/lib/utils';
import {
  CONTENT_TYPE_LABELS, TRUST_LEVEL_CONFIG, REFUSAL_REASONS,
  CORRECTION_REASONS, computeTrustScore,
  type ModerationStatus, type ContentType, type TrustLevel,
} from '@/lib/moderation';

// ─── Types ────────────────────────────────────────────────────────────────────
interface QueueDetail {
  id: string;
  content_type: ContentType;
  content_id: string;
  content_title: string;
  content_excerpt: string;
  content_photos: string[];
  author_id: string;
  author_trust: TrustLevel;
  status: ModerationStatus;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  completeness: number;
  validation_errors: { field: string; label: string; message: string; weight: number }[];
  reviewed_by?: string;
  reviewed_at?: string;
  decision?: string;
  refusal_reason?: string;
  correction_reason?: string;
  moderator_note?: string;
  resubmit_count: number;
  submitted_at: string;
  created_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    created_at: string;
    email?: string;
    phone?: string;
    publication_count?: number;
    reports_received?: number;
    trust_level?: string;
    role?: string;
  };
}

interface ModerationHistoryEntry {
  id: string;
  action: string;
  old_status?: string;
  new_status?: string;
  decision?: string;
  reason?: string;
  moderator_note?: string;
  created_at: string;
  moderator?: { full_name: string; avatar_url?: string };
}

const RISK_CONFIG = {
  low:      { label: 'Risque faible',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🟢' },
  medium:   { label: 'Risque modéré',    color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '🟡' },
  high:     { label: 'Risque élevé',     color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  emoji: '🟠' },
  critical: { label: 'Risque critique',  color: 'text-red-700',     bg: 'bg-red-100',    border: 'border-red-300',     emoji: '🔴' },
};

// ─── Composant Section ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, className }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
function ModerationDetailContent() {
  const { profile, isModerator } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const queueId = params.id as string;
  const supabase = createClient();

  const [item, setItem]               = useState<QueueDetail | null>(null);
  const [history, setHistory]         = useState<ModerationHistoryEntry[]>([]);
  const [authorStats, setAuthorStats] = useState<{ total: number; pending: number; refused: number } | null>(null);
  const [loading, setLoading]         = useState(true);
  const [processing, setProcessing]   = useState(false);

  // Formulaire de décision
  const [selectedDecision, setSelectedDecision] = useState<'accepter' | 'refuser' | 'demander_correction' | null>(null);
  const [selectedReason, setSelectedReason]     = useState('');
  const [moderatorNote, setModeratorNote]       = useState('');
  const [photoIndex, setPhotoIndex]             = useState(0);

  useEffect(() => {
    if (profile && !isModerator()) router.push('/admin');
  }, [profile, isModerator, router]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('moderation_queue')
      .select(`
        *,
        author:profiles!moderation_queue_author_id_fkey(
          id, full_name, avatar_url, created_at, email, phone,
          publication_count, reports_received, trust_level, role
        )
      `)
      .eq('id', queueId)
      .single();

    if (data) {
      setItem(data as QueueDetail);
      if (moderatorNote === '') setModeratorNote(data.moderator_note || '');

      // Historique
      const { data: hist } = await supabase
        .from('moderation_history')
        .select(`*, moderator:profiles!moderation_history_moderator_id_fkey(full_name, avatar_url)`)
        .eq('queue_id', queueId)
        .order('created_at', { ascending: false });
      setHistory((hist || []) as ModerationHistoryEntry[]);

      // Stats auteur
      if (data.author_id) {
        const [
          { count: total },
          { count: pending },
          { count: refused },
        ] = await Promise.all([
          supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('author_id', data.author_id),
          supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('author_id', data.author_id).eq('status', 'en_attente_validation'),
          supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('author_id', data.author_id).eq('status', 'refuse'),
        ]);
        setAuthorStats({ total: total ?? 0, pending: pending ?? 0, refused: refused ?? 0 });
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [queueId]); // eslint-disable-line

  // Soumission décision
  const handleDecision = async () => {
    if (!profile || !item || !selectedDecision) return;
    if (selectedDecision !== 'accepter' && !selectedReason) {
      toast.error('Veuillez sélectionner un motif');
      return;
    }

    setProcessing(true);

    const newStatus: ModerationStatus =
      selectedDecision === 'accepter' ? 'publie' :
      selectedDecision === 'refuser'  ? 'refuse' : 'a_corriger';

    const updateData: Record<string, unknown> = {
      status: newStatus,
      decision: selectedDecision,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      moderator_note: moderatorNote || null,
    };

    if (selectedDecision === 'refuser') updateData.refusal_reason = selectedReason;
    if (selectedDecision === 'demander_correction') updateData.correction_reason = selectedReason;

    const { error } = await supabase
      .from('moderation_queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) {
      toast.error('Erreur lors de la décision');
    } else {
      // Mettre à jour le statut de modération dans la table source
      if (item.content_type && item.content_id) {
        const tableMap: Record<ContentType, string> = {
          listing: 'listings', equipment: 'equipment_items',
          help_request: 'help_requests', outing: 'group_outings',
          event: 'local_events', lost_found: 'lost_found_items',
          collection_item: 'collection_items', association: 'associations',
          forum_post: 'forum_posts',
        };
        const table = tableMap[item.content_type];
        if (table) {
          await supabase.from(table)
            .update({ moderation_status: newStatus })
            .eq('id', item.content_id);
        }
      }

      const msgs = {
        accepter: '✅ Publication acceptée et publiée',
        refuser: '❌ Publication refusée',
        demander_correction: '✏️ Corrections demandées à l\'auteur',
      };
      toast.success(msgs[selectedDecision]);
      setSelectedDecision(null);
      setSelectedReason('');
      fetchData();
    }
    setProcessing(false);
  };

  // Changement niveau de confiance
  const handleTrustChange = async (newTrust: TrustLevel) => {
    if (!item) return;
    const { error } = await supabase
      .from('profiles')
      .update({ trust_level: newTrust })
      .eq('id', item.author_id);

    if (error) { toast.error('Erreur'); return; }
    toast.success(`Niveau de confiance mis à jour : ${TRUST_LEVEL_CONFIG[newTrust].label}`);

    await supabase.from('moderation_queue')
      .update({ author_trust: newTrust })
      .eq('id', queueId);
    fetchData();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Publication introuvable dans la file de modération.</p>
        <Link href="/admin/moderation" className="mt-4 inline-flex items-center gap-2 text-brand-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à la file
        </Link>
      </div>
    );
  }

  const contentMeta = CONTENT_TYPE_LABELS[item.content_type];
  const risk = RISK_CONFIG[item.risk_level || 'low'];
  const trust = computeTrustScore({
    created_at: item.author?.created_at || new Date().toISOString(),
    role: item.author?.role || 'resident',
    avatar_url: item.author?.avatar_url,
    phone: item.author?.phone,
    publication_count: item.author?.publication_count,
    reports_received: item.author?.reports_received,
    trust_level: item.author?.trust_level,
  });

  const canDecide = item.status === 'en_attente_validation' || item.status === 'a_corriger';
  const contentUrl = (() => {
    const urls: Record<ContentType, string> = {
      listing: `/annonces/${item.content_id}`,
      equipment: `/materiel/${item.content_id}`,
      help_request: `/coups-de-main`,
      outing: `/promenades`,
      event: `/evenements`,
      lost_found: `/perdu-trouve`,
      collection_item: `/collectionneurs`,
      association: `/associations`,
      forum_post: `/forum/${item.content_id}`,
    };
    return urls[item.content_type] || '#';
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/moderation" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-bold px-2.5 py-1 rounded-full border ${risk.bg} ${risk.color} ${risk.border}`}>
                {risk.emoji} {risk.label}
              </span>
              <span className="text-sm font-semibold text-gray-500">{contentMeta?.emoji} {contentMeta?.label}</span>
              {item.resubmit_count > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  🔄 Soumission #{item.resubmit_count + 1}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 line-clamp-1">
              {item.content_title || '(Sans titre)'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Soumis {formatRelative(item.submitted_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <ModerationBadge status={item.status} size="md" showDot />
          <Link
            href={contentUrl}
            target="_blank"
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Voir la publication"
          >
            <ExternalLink className="w-4 h-4 text-gray-600" />
          </Link>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : contenu + décision */}
        <div className="lg:col-span-2 space-y-5">

          {/* Score de risque */}
          <div className={`rounded-2xl border p-4 ${risk.bg} ${risk.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className={`w-5 h-5 ${risk.color}`} />
                <span className={`font-semibold ${risk.color}`}>Analyse automatique</span>
              </div>
              <span className={`text-2xl font-black ${risk.color}`}>{item.risk_score}/100</span>
            </div>
            <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  item.risk_score >= 60 ? 'bg-red-500' :
                  item.risk_score >= 40 ? 'bg-orange-500' :
                  item.risk_score >= 20 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${item.risk_score}%` }}
              />
            </div>
            {item.validation_errors && item.validation_errors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className={`text-xs font-semibold ${risk.color} opacity-80`}>Problèmes détectés :</p>
                {item.validation_errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${risk.color}`} />
                    <span className={`text-xs ${risk.color}`}>{err.message}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Complétude */}
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-xs font-medium ${risk.color} opacity-80`}>Complétude :</span>
              <div className="flex-1 h-1.5 bg-white/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full"
                  style={{ width: `${item.completeness}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${risk.color}`}>{item.completeness}%</span>
            </div>
          </div>

          {/* Contenu de la publication */}
          <Section title="Contenu de la publication" icon={FileText}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {item.content_title || '(Sans titre)'}
            </h2>
            {item.content_excerpt && (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {item.content_excerpt}
              </p>
            )}
            {!item.content_excerpt && (
              <p className="text-sm text-gray-400 italic">Extrait non disponible — voir la publication originale.</p>
            )}
          </Section>

          {/* Photos */}
          {item.content_photos && item.content_photos.length > 0 && (
            <Section title={`Photos (${item.content_photos.length})`} icon={ImageIcon}>
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.content_photos[photoIndex]}
                    alt={`Photo ${photoIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                {item.content_photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {item.content_photos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                          i === photoIndex ? 'border-brand-500' : 'border-transparent'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Décision de modération */}
          {canDecide && (
            <Section title="Décision de modération" icon={Shield}>
              <div className="space-y-4">
                {/* Boutons de décision */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'accepter' as const,            label: 'Accepter',       icon: CheckCircle,   color: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                    { key: 'demander_correction' as const, label: 'Corrections',    icon: AlertTriangle, color: 'border-amber-300   bg-amber-50   text-amber-700   hover:bg-amber-100' },
                    { key: 'refuser' as const,             label: 'Refuser',        icon: XCircle,       color: 'border-red-300     bg-red-50     text-red-700     hover:bg-red-100' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => { setSelectedDecision(key); setSelectedReason(''); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-semibold text-sm transition-all ${color} ${
                        selectedDecision === key ? 'ring-2 ring-offset-1' : ''
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Motifs */}
                {selectedDecision === 'refuser' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Motif de refus <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-1.5">
                      {REFUSAL_REASONS.map(r => (
                        <label key={r.key} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          selectedReason === r.key
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            name="refusal"
                            value={r.key}
                            checked={selectedReason === r.key}
                            onChange={() => setSelectedReason(r.key)}
                            className="w-4 h-4 text-red-600"
                          />
                          <span className="text-sm text-gray-800">{r.label}</span>
                          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            r.severity === 'high' ? 'bg-red-100 text-red-700' :
                            r.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{r.severity}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDecision === 'demander_correction' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Correction demandée <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-1.5">
                      {CORRECTION_REASONS.map(r => (
                        <label key={r.key} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          selectedReason === r.key
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            name="correction"
                            value={r.key}
                            checked={selectedReason === r.key}
                            onChange={() => setSelectedReason(r.key)}
                            className="w-4 h-4 text-amber-600"
                          />
                          <span className="text-sm text-gray-800">{r.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note modérateur */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Note interne (visible par l'équipe uniquement)
                  </label>
                  <textarea
                    value={moderatorNote}
                    onChange={e => setModeratorNote(e.target.value)}
                    placeholder="Observations, contexte, justification…"
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                  />
                </div>

                {/* Bouton valider */}
                {selectedDecision && (
                  <button
                    onClick={handleDecision}
                    disabled={processing || (selectedDecision !== 'accepter' && !selectedReason)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                      selectedDecision === 'accepter'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : selectedDecision === 'refuser'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {processing ? 'Traitement…' :
                     selectedDecision === 'accepter' ? 'Valider et publier' :
                     selectedDecision === 'refuser'  ? 'Confirmer le refus' :
                     'Envoyer les corrections'}
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Décision précédente (si déjà traitée) */}
          {!canDecide && item.decision && (
            <div className={`rounded-2xl border p-4 ${
              item.status === 'publie' ? 'bg-emerald-50 border-emerald-200' :
              item.status === 'refuse' ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {item.status === 'publie' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
                 item.status === 'refuse' ? <XCircle className="w-5 h-5 text-red-600" /> :
                 <Archive className="w-5 h-5 text-gray-500" />}
                <span className="font-semibold text-gray-800">
                  Décision : {item.status === 'publie' ? 'Acceptée' : item.status === 'refuse' ? 'Refusée' : 'Traitée'}
                </span>
                {item.reviewed_at && (
                  <span className="text-xs text-gray-500 ml-auto">{formatRelative(item.reviewed_at)}</span>
                )}
              </div>
              {(item.refusal_reason || item.correction_reason) && (
                <p className="text-sm text-gray-700">
                  Motif : <strong>{item.refusal_reason || item.correction_reason}</strong>
                </p>
              )}
              {item.moderator_note && (
                <p className="text-xs text-gray-600 mt-2 italic">Note : {item.moderator_note}</p>
              )}
            </div>
          )}

          {/* Historique de modération */}
          {history.length > 0 && (
            <Section title="Historique de modération" icon={History}>
              <div className="space-y-3">
                {history.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <History className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">
                          {entry.moderator?.full_name || 'Système'}
                        </span>
                        <span>·</span>
                        <span>{formatRelative(entry.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-800 mt-0.5">
                        {entry.old_status && entry.new_status
                          ? `Statut : ${entry.old_status} → ${entry.new_status}`
                          : entry.action}
                      </p>
                      {entry.reason && (
                        <p className="text-xs text-gray-500 mt-0.5">Motif : {entry.reason}</p>
                      )}
                      {entry.moderator_note && (
                        <p className="text-xs text-gray-400 italic mt-0.5">{entry.moderator_note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Colonne droite : profil auteur + contrôles */}
        <div className="space-y-5">

          {/* Profil auteur */}
          <Section title="Profil auteur" icon={User}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={item.author?.avatar_url}
                  name={item.author?.full_name || '?'}
                  size="md"
                />
                <div>
                  <p className="font-semibold text-gray-900">{item.author?.full_name || 'Inconnu'}</p>
                  <p className="text-xs text-gray-500">
                    Membre depuis{' '}
                    {item.author?.created_at
                      ? new Date(item.author.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                      : '?'}
                  </p>
                </div>
              </div>

              {/* Score de confiance */}
              <div className={`rounded-xl border p-3 ${trust.bg} border-${trust.color.split('-')[1]}-200`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${trust.color}`}>
                    {trust.emoji} {trust.label}
                  </span>
                  <span className={`text-lg font-black ${trust.color}`}>{trust.score}/100</span>
                </div>
                <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div className="h-full bg-current rounded-full" style={{ width: `${trust.score}%` }} />
                </div>
                <div className="mt-2 space-y-0.5">
                  {trust.badges.slice(0, 3).map((b, i) => (
                    <p key={i} className={`text-[10px] ${trust.color} opacity-80`}>{b}</p>
                  ))}
                </div>
              </div>

              {/* Stats pub */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Publications', value: authorStats?.total ?? item.author?.publication_count ?? 0 },
                  { label: 'En attente',   value: authorStats?.pending ?? 0 },
                  { label: 'Refusées',     value: authorStats?.refused ?? 0, alert: (authorStats?.refused ?? 0) > 2 },
                ].map(({ label, value, alert }) => (
                  <div key={label} className={`text-center p-2 rounded-xl border ${alert ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`text-lg font-black ${alert ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
                    <p className="text-[10px] text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Signalements reçus */}
              {(item.author?.reports_received ?? 0) > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
                  <Flag className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-red-700">
                    {item.author?.reports_received} signalement{(item.author?.reports_received ?? 0) > 1 ? 's' : ''} reçu{(item.author?.reports_received ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Lien profil admin */}
              <Link
                href={`/admin/utilisateurs`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-600"
              >
                <span>Voir le profil complet</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </Section>

          {/* Niveau de confiance */}
          <Section title="Niveau de confiance" icon={Star}>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">Modifier le niveau influence la modération future de cet auteur.</p>
              {(['nouveau', 'surveille', 'fiable', 'de_confiance'] as TrustLevel[]).map(level => {
                const cfg = TRUST_LEVEL_CONFIG[level];
                const isCurrent = (item.author?.trust_level || 'nouveau') === level;
                return (
                  <button
                    key={level}
                    onClick={() => handleTrustChange(level)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-brand-300`
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isCurrent ? cfg.color : 'text-gray-700'}`}>
                        {cfg.label}
                      </p>
                      <p className="text-[10px] text-gray-400 line-clamp-1">{cfg.description}</p>
                    </div>
                    {isCurrent && <CheckCircle className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Informations audit */}
          <Section title="Informations d'audit" icon={Clock}>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Créé le',       value: new Date(item.created_at).toLocaleString('fr-FR') },
                { label: 'Soumis le',     value: new Date(item.submitted_at).toLocaleString('fr-FR') },
                { label: 'Resoumissions', value: String(item.resubmit_count) },
                { label: 'ID file',       value: item.id.slice(0, 8) + '…' },
                { label: 'ID contenu',    value: item.content_id?.slice(0, 8) + '…' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Navigation */}
          <div className="flex gap-2">
            <Link
              href="/admin/moderation"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> File
            </Link>
            <Link
              href={contentUrl}
              target="_blank"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-sm transition-colors"
            >
              <Eye className="w-4 h-4" /> Voir
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminModerationDetailPage() {
  return (
    <ProtectedPage adminOnly>
      <ModerationDetailContent />
    </ProtectedPage>
  );
}
