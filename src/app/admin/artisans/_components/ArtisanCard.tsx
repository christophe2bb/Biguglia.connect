'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle, XCircle, Eye,
  FileText, MessageSquare, AlertCircle,
  Shield, Clock, MapPin, Briefcase,
  ChevronDown, ChevronUp, Phone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ROLE_LABELS, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';
import DocLink from './DocLink';
import type { Profile } from '@/types';

interface ArtisanEntry {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  service_area: string;
  years_experience?: number;
  siret?: string;
  insurance?: string;
  artisan_type?: 'professionnel' | 'particulier';
  doc_kbis_url?: string;
  doc_insurance_url?: string;
  doc_id_url?: string;
  rejection_reason?: string;
  created_at: string;
  profile?: Profile & { email: string; phone?: string };
  trade_category?: { name: string; icon: string };
}

interface ArtisanCardProps {
  artisan: ArtisanEntry;
  onApprove: (userId: string) => void;
  onReject: (userId: string, reason: string) => void;
}

export default function ArtisanCard({ artisan, onApprove, onReject }: ArtisanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmedLocal, setConfirmedLocal] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const isPending = artisan.profile?.role === 'artisan_pending';
  const isVerified = artisan.profile?.role === 'artisan_verified';
  const docCount = [artisan.doc_kbis_url, artisan.doc_insurance_url, artisan.doc_id_url].filter(Boolean).length;

  const handleSendMessage = async () => {
    if (!artisan.user_id) return;
    setSendingMsg(true);
    try {
      const supabaseAuth = createClient();
      const { data: sessionData } = await supabaseAuth.auth.getSession();
      if (!sessionData.session) { toast.error('Non connecté'); return; }

      const res = await fetch('/api/messages/start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          ownerId: artisan.user_id,
          subject: `Dossier artisan — ${artisan.profile?.full_name || artisan.business_name}`,
          relatedType: 'general',
          relatedId: null,
          initialMsg: null,
        }),
      }).catch(() => null);

      if (!res?.ok) { toast.error('Impossible de créer la conversation'); return; }
      const { conversationId } = await res.json().catch(() => ({}));
      if (!conversationId) { toast.error('Impossible de créer la conversation'); return; }

      window.location.href = `/messages/${conversationId}`;
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'ouverture de la messagerie');
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${isPending ? 'border-orange-200' : isVerified ? 'border-green-200' : 'border-gray-200'}`}>

      {/* ── En-tête résumé ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar
            src={artisan.profile?.avatar_url}
            name={artisan.profile?.full_name || artisan.business_name}
            size="lg"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-900 text-lg">
                {artisan.profile?.full_name || artisan.business_name || 'Artisan'}
              </span>
              <Badge variant={isVerified ? 'success' : isPending ? 'warning' : 'default'}>
                {ROLE_LABELS[artisan.profile?.role || 'artisan_pending']}
              </Badge>
              {docCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  📎 {docCount} doc{docCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-1">
              {artisan.profile?.phone ? (
                <span className="flex items-center gap-1 font-medium text-brand-700">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${artisan.profile.phone}`} className="hover:underline">{artisan.profile.phone}</a>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400 italic text-xs">
                  <Phone className="w-3 h-3" /> Téléphone non renseigné
                </span>
              )}
              <a href={`mailto:${artisan.profile?.email}`} className="text-brand-600 hover:underline text-xs">
                {artisan.profile?.email}
              </a>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {artisan.trade_category && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {artisan.trade_category.icon} {artisan.trade_category.name}
                </span>
              )}
              {artisan.service_area && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {artisan.service_area}
                </span>
              )}
              {artisan.years_experience != null && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {artisan.years_experience} ans d&apos;exp.
                </span>
              )}
              {artisan.siret && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> SIRET : {artisan.siret}
                </span>
              )}
              <span className="text-gray-400">Inscrit {formatRelative(artisan.created_at)}</span>
            </div>
          </div>

          {/* Boutons d'action rapide */}
          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Réduire' : 'Voir le dossier'}
            </button>

            <button
              onClick={handleSendMessage}
              disabled={sendingMsg}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors disabled:opacity-60"
            >
              {sendingMsg
                ? <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                : <MessageSquare className="w-3.5 h-3.5" />
              }
              Envoyer un message
            </button>

            <Link href={`/artisans/${artisan.id}`} target="_blank">
              <Button size="sm" variant="outline" className="w-full">
                <Eye className="w-3.5 h-3.5" /> Profil public
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Dossier complet dépliable ── */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/50">

          {artisan.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Présentation</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{artisan.description}</p>
            </div>
          )}

          {(artisan.siret || artisan.insurance) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Informations légales</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {artisan.siret && (
                  <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-500 text-xs">SIRET déclaré</span>
                    <div className="font-mono font-medium text-gray-900">{artisan.siret}</div>
                  </div>
                )}
                {artisan.insurance && (
                  <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span className="text-gray-500 text-xs">Assurance déclarée</span>
                    <div className="font-medium text-gray-900">{artisan.insurance}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Documents justificatifs
            </h4>
            <div className="space-y-2">
              <DocLink storagePath={artisan.doc_insurance_url} label="Attestation d'assurance décennale / RC Pro" icon="🛡️" />
              <DocLink storagePath={artisan.doc_kbis_url} label="Kbis / Justificatif d'immatriculation" icon="📋" />
              <DocLink storagePath={artisan.doc_id_url} label="Pièce d'identité" icon="🪪" />
            </div>
            {docCount === 0 && (
              <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Aucun document fourni. Vous pouvez valider si vous avez vérifié l&apos;artisan par un autre moyen,
                  ou utiliser le bouton &ldquo;Envoyer un message&rdquo; pour lui demander ses documents.
                </p>
              </div>
            )}
          </div>

          {/* ── Actions pour artisan en attente ── */}
          {isPending && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer bg-green-50 border border-green-200 rounded-xl p-3 hover:bg-green-100 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-green-600 flex-shrink-0"
                  checked={confirmedLocal}
                  onChange={e => setConfirmedLocal(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-semibold text-green-800">✅ Je confirme que cet artisan est bien de Biguglia</span>
                  <p className="text-xs text-green-600 mt-0.5">Cochez cette case pour activer le bouton d&apos;approbation</p>
                </div>
              </label>

              {!rejecting ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRejecting(true)}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Refuser
                  </button>
                  <button
                    onClick={() => {
                      if (!confirmedLocal) {
                        toast.error('Cochez d\'abord la case "Artisan de Biguglia"');
                        return;
                      }
                      onApprove(artisan.user_id);
                    }}
                    disabled={!confirmedLocal}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" /> ✅ Approuver le profil artisan
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Motif du refus <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Ce message sera envoyé à l&apos;artisan par notification.</p>
                    <div className="space-y-2 mb-3">
                      {[
                        'Documents manquants : veuillez joindre votre attestation d\'assurance en cours de validité.',
                        'Documents manquants : veuillez joindre votre Kbis ou justificatif d\'immatriculation.',
                        'Documents manquants : veuillez joindre une pièce d\'identité en cours de validité.',
                        'Les documents fournis sont illisibles ou incomplets. Veuillez les renvoyer.',
                        'Votre assurance est expirée. Veuillez fournir une attestation en cours de validité.',
                        'Activité non éligible à la plateforme Biguglia Connect.',
                      ].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReason(s)}
                          className="w-full text-left text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Ou saisissez un motif personnalisé..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRejecting(false); setReason(''); }}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        if (!reason.trim()) { toast.error('Indiquez un motif de refus'); return; }
                        onReject(artisan.user_id, reason);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                    >
                      Confirmer le refus et notifier l&apos;artisan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isVerified && (
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Profil validé et visible sur la plateforme</span>
              </div>
              <button
                onClick={() => {
                  const r = window.prompt('Motif de révocation (sera envoyé à l\'artisan) :');
                  if (r !== null) onReject(artisan.user_id, r || 'Profil suspendu par l\'administrateur.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Révoquer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
