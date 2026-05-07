'use client';

import { useState } from 'react';
import { Eye, CheckCircle, XCircle, AlertTriangle, Ban, Loader2, Trash2, MessageSquare, X, Send } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import type { ReportEntry } from '@/app/api/admin/reports/route';
import { REASON_LABELS, TYPE_LABELS } from './signalement-config';

interface SignalementRowProps {
  report: ReportEntry;
  duplicateCount: number;
  processing: boolean;
  isAdmin: boolean;
  onUpdate: (id: string, status: 'resolved' | 'dismissed' | 'reviewed') => void;
  onBan: (targetId: string, targetType: string) => void;
  onDeleteContent: (id: string) => void;
  onSendMessage: (id: string, message: string) => Promise<void>;
}

// ── Modal confirmation suppression ────────────────────────────────────────────
function ConfirmDeleteModal({
  title,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Supprimer ce contenu ?</h3>
            <p className="text-xs text-gray-500 mt-0.5">Cette action est irréversible.</p>
          </div>
        </div>
        {title && (
          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 mb-5 italic">
            &ldquo;{title}&rdquo;
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal envoi message ────────────────────────────────────────────────────────
function SendMessageModal({
  reportTitle,
  onSend,
  onCancel,
  loading,
}: {
  reportTitle: string;
  onSend: (msg: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [msg, setMsg] = useState('');

  const templates = [
    'Votre contenu a été signalé par d\'autres membres. Merci de le modifier pour respecter les règles de la communauté.',
    'Ce contenu ne respecte pas nos conditions d\'utilisation. Veuillez le corriger ou il sera supprimé.',
    'Nous avons reçu un signalement concernant votre publication. Pourriez-vous en revoir le contenu ?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Envoyer un message au créateur</h3>
              <p className="text-xs text-gray-500 mt-0.5">Il recevra une notification dans l&apos;app</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {reportTitle && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-4 italic truncate">
            Contenu : &ldquo;{reportTitle}&rdquo;
          </p>
        )}

        {/* Templates rapides */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Messages rapides :</p>
          <div className="space-y-1.5">
            {templates.map((t, i) => (
              <button
                key={i}
                onClick={() => setMsg(t)}
                className="w-full text-left text-xs px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 text-gray-600 hover:text-blue-700 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Ou rédigez votre message personnalisé…"
          rows={4}
          maxLength={2000}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 text-right mb-4">{msg.length}/2000</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => msg.trim() && onSend(msg.trim())}
            disabled={loading || !msg.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function SignalementRow({
  report,
  duplicateCount,
  processing,
  isAdmin,
  onUpdate,
  onBan,
  onDeleteContent,
  onSendMessage,
}: SignalementRowProps) {
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [deletingContent,  setDeletingContent]  = useState(false);
  const [sendingMessage,   setSendingMessage]   = useState(false);

  const reasonConf = REASON_LABELS[report.reason] ?? REASON_LABELS.autre;
  const typeConf   = TYPE_LABELS[report.target_type] ?? { label: report.target_type, icon: null };
  const TypeIcon   = typeConf.icon;

  const handleDeleteContent = async () => {
    setDeletingContent(true);
    onDeleteContent(report.id);
    setShowDeleteModal(false);
    setDeletingContent(false);
  };

  const handleSendMessage = async (msg: string) => {
    setSendingMessage(true);
    await onSendMessage(report.id, msg);
    setSendingMessage(false);
    setShowMessageModal(false);
  };

  // Détermine si on peut supprimer le contenu (type supporté)
  const canDeleteContent = isAdmin && ![
    'user', 'message',
  ].includes(report.target_type);

  return (
    <>
      <div
        className={`bg-white rounded-2xl border shadow-sm transition-colors ${
          report.status === 'pending'  ? 'border-red-200' :
          report.status === 'reviewed' ? 'border-amber-200' :
          report.status === 'resolved' ? 'border-emerald-200 opacity-70' : 'border-gray-200 opacity-60'
        }`}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">

              {/* Badges statut + type + doublons */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${reasonConf.color}`}>
                  {reasonConf.emoji} {reasonConf.label}
                </span>
                {TypeIcon && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    <TypeIcon className="w-3 h-3" /> {typeConf.label}
                  </span>
                )}
                {duplicateCount > 1 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> {duplicateCount}× signalé
                  </span>
                )}
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    report.status === 'pending'  ? 'bg-red-100 text-red-600' :
                    report.status === 'reviewed' ? 'bg-amber-100 text-amber-600' :
                    report.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {report.status === 'pending'  ? 'En attente' :
                   report.status === 'reviewed' ? 'En examen' :
                   report.status === 'resolved' ? 'Résolu' : 'Ignoré'}
                </span>
              </div>

              {/* Titre du contenu signalé */}
              {report.target_title && (
                <p className="text-sm font-semibold text-gray-800 mb-2 truncate">
                  📝 {report.target_title}
                </p>
              )}

              {/* Message du signalement (raison détaillée) */}
              {report.description && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-3">
                  <p className="text-xs font-semibold text-orange-700 mb-1">💬 Message du signalement :</p>
                  <p className="text-sm text-orange-800 italic">&ldquo;{report.description}&rdquo;</p>
                </div>
              )}

              {/* Auteur du signalement */}
              <div className="flex items-center gap-2">
                <Avatar
                  src={report.reporter?.avatar_url}
                  name={report.reporter?.full_name ?? '?'}
                  size="xs"
                />
                <span className="text-xs text-gray-400">
                  Signalé par{' '}
                  <span className="font-semibold text-gray-600">
                    {report.reporter?.full_name ?? 'Anonyme'}
                  </span>
                  {' · '}{formatRelative(report.created_at)}
                </span>
              </div>
            </div>

            {/* ── Colonne actions ── */}
            <div className="flex flex-col gap-1.5 flex-shrink-0 min-w-[110px]">

              {/* Voir le contenu — toujours visible, s'ouvre dans un nouvel onglet */}
              {typeConf.href && (
                <a
                  href={typeConf.href(report.target_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Voir
                </a>
              )}

              {/* Envoyer un message au créateur */}
              <button
                onClick={() => setShowMessageModal(true)}
                disabled={processing || sendingMessage}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                title="Envoyer un message au créateur"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Contacter
              </button>

              {/* Supprimer le contenu — admin seulement */}
              {canDeleteContent && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={processing || deletingContent || report.status === 'resolved'}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-50 border border-red-300 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  title="Supprimer le contenu signalé"
                >
                  {deletingContent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Supprimer
                </button>
              )}

              {/* Séparateur visuel */}
              {(report.status === 'pending' || report.status === 'reviewed') && (
                <div className="border-t border-gray-100 my-0.5" />
              )}

              {/* Actions de statut */}
              {report.status === 'pending' && (
                <>
                  <button
                    onClick={() => onUpdate(report.id, 'reviewed')}
                    disabled={processing}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    En cours
                  </button>
                  <button
                    onClick={() => onUpdate(report.id, 'resolved')}
                    disabled={processing}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                  </button>
                  <button
                    onClick={() => onUpdate(report.id, 'dismissed')}
                    disabled={processing}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Ignorer
                  </button>
                  {report.target_type === 'user' && isAdmin && (
                    <button
                      onClick={() => onBan(report.target_id, report.target_type)}
                      disabled={processing}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-50 border border-red-300 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" /> Bannir
                    </button>
                  )}
                </>
              )}

              {report.status === 'reviewed' && (
                <>
                  <button
                    onClick={() => onUpdate(report.id, 'resolved')}
                    disabled={processing}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                  </button>
                  <button
                    onClick={() => onUpdate(report.id, 'dismissed')}
                    disabled={processing}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Ignorer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal suppression */}
      {showDeleteModal && (
        <ConfirmDeleteModal
          title={report.target_title ?? ''}
          onConfirm={handleDeleteContent}
          onCancel={() => setShowDeleteModal(false)}
          loading={deletingContent}
        />
      )}

      {/* Modal message */}
      {showMessageModal && (
        <SendMessageModal
          reportTitle={report.target_title ?? ''}
          onSend={handleSendMessage}
          onCancel={() => setShowMessageModal(false)}
          loading={sendingMessage}
        />
      )}
    </>
  );
}
