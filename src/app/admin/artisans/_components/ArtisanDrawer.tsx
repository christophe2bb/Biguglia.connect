'use client';

/**
 * ArtisanDrawer — Panneau latéral de détails + décision artisan (lazy-loaded).
 *
 * Affiché quand l'admin clique sur "Voir le dossier" dans ArtisanCard.
 * Chargé en lazy depuis page.tsx via dynamic() pour ne pas alourdir
 * le bundle initial.
 *
 * Contient : infos légales, documents, checkbox local + boutons Approuver/Refuser.
 * La logique de refus (textarea + suggestions) est ici, pas dans ArtisanCard.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X, CheckCircle, XCircle, Shield, FileText,
  Phone, Briefcase, MapPin, Clock, AlertCircle, MessageSquare,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { ROLE_LABELS, formatRelative } from '@/lib/utils';
import DocLink from './DocLink';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
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

const REJECT_SUGGESTIONS = [
  "Documents manquants : veuillez joindre votre attestation d'assurance en cours de validité.",
  'Documents manquants : veuillez joindre votre Kbis ou justificatif d\'immatriculation.',
  'Documents manquants : veuillez joindre une pièce d\'identité en cours de validité.',
  'Les documents fournis sont illisibles ou incomplets. Veuillez les renvoyer.',
  'Votre assurance est expirée. Veuillez fournir une attestation en cours de validité.',
  'Activité non éligible à la plateforme Biguglia Connect.',
];

interface ArtisanDrawerProps {
  artisan: ArtisanEntry;
  onClose: () => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string, reason: string) => void;
}

export default function ArtisanDrawer({ artisan, onClose, onApprove, onReject }: ArtisanDrawerProps) {
  const [confirmedLocal, setConfirmedLocal] = useState(false);
  const [rejecting, setRejecting]           = useState(false);
  const [reason, setReason]                 = useState('');
  const [sendingMsg, setSendingMsg]         = useState(false);

  const isPending  = artisan.profile?.role === 'artisan_pending';
  const isVerified = artisan.profile?.role === 'artisan_verified';
  const docCount   = [artisan.doc_kbis_url, artisan.doc_insurance_url, artisan.doc_id_url].filter(Boolean).length;

  // Fermer sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
          ownerId:     artisan.user_id,
          subject:     `Dossier artisan — ${artisan.profile?.full_name || artisan.business_name}`,
          relatedType: 'general',
          relatedId:   null,
          initialMsg:  null,
        }),
      }).catch(() => null);

      if (!res?.ok) { toast.error('Impossible de créer la conversation'); return; }
      const { conversationId } = await res.json().catch(() => ({}));
      if (!conversationId) { toast.error('Impossible de créer la conversation'); return; }
      window.location.href = `/messages/${conversationId}`;
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'ouverture de la messagerie");
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Panneau */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* En-tête */}
        <div className="flex items-center gap-4 p-5 border-b border-gray-100">
          <Avatar
            src={artisan.profile?.avatar_url}
            name={artisan.profile?.full_name || artisan.business_name}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-900 text-lg truncate">
                {artisan.profile?.full_name || artisan.business_name}
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
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              {artisan.profile?.phone && (
                <a href={`tel:${artisan.profile.phone}`} className="flex items-center gap-1 text-brand-700 hover:underline font-medium">
                  <Phone className="w-3 h-3" /> {artisan.profile.phone}
                </a>
              )}
              <a href={`mailto:${artisan.profile?.email}`} className="hover:text-brand-600">
                {artisan.profile?.email}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSendMessage}
              disabled={sendingMsg}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors disabled:opacity-60"
            >
              {sendingMsg
                ? <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                : <MessageSquare className="w-3.5 h-3.5" />
              }
              Message
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Infos métier */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informations métier</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {artisan.trade_category && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                  <span className="text-xs text-gray-400 block mb-0.5">Métier</span>
                  <div className="font-medium text-gray-800 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                    {artisan.trade_category.icon} {artisan.trade_category.name}
                  </div>
                </div>
              )}
              {artisan.service_area && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                  <span className="text-xs text-gray-400 block mb-0.5">Zone d'intervention</span>
                  <div className="font-medium text-gray-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {artisan.service_area}
                  </div>
                </div>
              )}
              {artisan.years_experience != null && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                  <span className="text-xs text-gray-400 block mb-0.5">Expérience</span>
                  <div className="font-medium text-gray-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {artisan.years_experience} ans
                  </div>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                <span className="text-xs text-gray-400 block mb-0.5">Inscrit</span>
                <div className="font-medium text-gray-800">{formatRelative(artisan.created_at)}</div>
              </div>
            </div>
          </section>

          {/* Présentation */}
          {artisan.description && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Présentation</h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 border border-gray-100">
                {artisan.description}
              </p>
            </section>
          )}

          {/* Infos légales */}
          {(artisan.siret || artisan.insurance) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Informations légales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {artisan.siret && (
                  <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> SIRET déclaré
                    </span>
                    <div className="font-mono font-medium text-gray-900 mt-0.5">{artisan.siret}</div>
                  </div>
                )}
                {artisan.insurance && (
                  <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                    <span className="text-xs text-gray-400">Assurance déclarée</span>
                    <div className="font-medium text-gray-900 mt-0.5">{artisan.insurance}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Documents */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Documents justificatifs
            </h3>
            <div className="space-y-2">
              <DocLink storagePath={artisan.doc_insurance_url} label="Attestation d'assurance décennale / RC Pro" icon="🛡️" />
              <DocLink storagePath={artisan.doc_kbis_url}      label="Kbis / Justificatif d'immatriculation"     icon="📋" />
              <DocLink storagePath={artisan.doc_id_url}        label="Pièce d'identité"                          icon="🪪" />
            </div>
            {docCount === 0 && (
              <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Aucun document fourni. Vous pouvez valider si vous avez vérifié l&apos;artisan par un autre moyen,
                  ou utiliser le bouton &laquo;&nbsp;Message&nbsp;&raquo; pour lui demander ses documents.
                </p>
              </div>
            )}
          </section>

          {/* Lien profil public */}
          <Link
            href={`/artisans/${artisan.id}`}
            target="_blank"
            className="flex items-center gap-2 text-xs text-brand-600 hover:text-brand-700 font-semibold"
          >
            Voir le profil public →
          </Link>
        </div>

        {/* Pied fixe : décision */}
        <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">
          {isPending && !rejecting && (
            <>
              <label className="flex items-center gap-3 cursor-pointer bg-green-50 border border-green-200 rounded-xl p-3 hover:bg-green-100 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-green-600 flex-shrink-0"
                  checked={confirmedLocal}
                  onChange={e => setConfirmedLocal(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-semibold text-green-800">✅ Je confirme que cet artisan est de Biguglia</span>
                  <p className="text-xs text-green-600 mt-0.5">Cochez pour activer le bouton d&apos;approbation</p>
                </div>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRejecting(true)}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Refuser
                </button>
                <button
                  onClick={() => {
                    if (!confirmedLocal) { toast.error('Cochez d\'abord la case "Artisan de Biguglia"'); return; }
                    onApprove(artisan.user_id);
                    onClose();
                  }}
                  disabled={!confirmedLocal}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" /> ✅ Approuver le profil
                </button>
              </div>
            </>
          )}

          {isPending && rejecting && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Motif du refus <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
                  {REJECT_SUGGESTIONS.map(s => (
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setRejecting(false); setReason(''); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (!reason.trim()) { toast.error('Indiquez un motif de refus'); return; }
                    onReject(artisan.user_id, reason);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                >
                  Confirmer le refus
                </button>
              </div>
            </div>
          )}

          {isVerified && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> Profil validé
              </div>
              <button
                onClick={() => {
                  const r = window.prompt('Motif de révocation (sera envoyé à l\'artisan) :');
                  if (r !== null) { onReject(artisan.user_id, r || 'Profil suspendu par l\'administrateur.'); onClose(); }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Révoquer
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
