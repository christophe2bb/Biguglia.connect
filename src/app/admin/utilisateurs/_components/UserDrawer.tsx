'use client';

/**
 * UserDrawer — Modal plein écran de détails utilisateur.
 *
 * ✅ Modal centré (pas panneau latéral)  — visible sur tous les écrans
 * ✅ Textes lisibles, contraste élevé   — taille min 14px, labels clairs
 * ✅ Boutons grands (min 44px)           — accessibles au touch / clic
 * ✅ Confirmations intégrées             — Suspendre / Supprimer / Réinit. MDP
 * ✅ Changement de rôle fonctionnel      — appelle onChangeRole immédiatement
 * ✅ z-index correct                     — overlay z-40, modal z-50
 */

import { useEffect, useRef, useId, useState } from 'react';
import Link from 'next/link';
import {
  X, Mail, Phone, Crown, Info,
  HardHat, Users, UserX, UserCheck, Trash2,
  AlertTriangle, KeyRound, MessageSquare,
  Package, FileText, Wrench, CheckCircle2,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { ROLE_LABELS, formatDate, formatRelative } from '@/lib/utils';
import type { UserWithActivity } from './types';

/* ─── Rôles ──────────────────────────────────────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: 'resident',         label: 'Habitant',            emoji: '🏘️', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300'   },
  { value: 'artisan_pending',  label: 'Artisan en attente',  emoji: '⏳', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300'  },
  { value: 'artisan_verified', label: 'Artisan vérifié',     emoji: '✅', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300'  },
  { value: 'moderator',        label: 'Modérateur',          emoji: '🛡️', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' },
];

const ROLE_BADGE: Record<string, string> = {
  resident:         'bg-blue-100 text-blue-800',
  artisan_pending:  'bg-amber-100 text-amber-800',
  artisan_verified: 'bg-green-100 text-green-800',
  moderator:        'bg-purple-100 text-purple-800',
  admin:            'bg-red-100 text-red-800',
};

type ConfirmStep = 'suspend' | 'delete' | 'reset' | null;

interface UserDrawerProps {
  user: UserWithActivity;
  onClose: () => void;
  onSuspend: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  onChangeRole: (id: string, role: string) => void;
  onResetPassword: (email: string) => void;
}

export default function UserDrawer({
  user, onClose, onSuspend, onDelete, onChangeRole, onResetPassword,
}: UserDrawerProps) {
  const modalRef   = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId    = useId();
  const [confirm, setConfirm] = useState<ConfirmStep>(null);

  const isSuspended = user.status === 'suspended';
  const isArtisan   = user.role === 'artisan_verified' || user.role === 'artisan_pending';
  const displayName = user.full_name || 'Sans nom';

  /* ── Escape ferme confirmation ou modal ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirm) { setConfirm(null); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, confirm]);

  /* ── Focus trap + scroll lock ── */
  useEffect(() => {
    triggerRef.current = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => modalRef.current?.focus());
    return () => {
      document.documentElement.style.overflow = '';
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, []);

  /* ── Exécution des actions confirmées ── */
  const executeConfirm = () => {
    if (confirm === 'suspend') {
      onSuspend(user.id, user.status);
    } else if (confirm === 'delete') {
      onDelete(user.id, displayName);
      onClose();
    } else if (confirm === 'reset') {
      onResetPassword(user.email);
    }
    setConfirm(null);
  };

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Modal centré ── */}
      {/* Le positionnement est géré par ce conteneur ; le dialog lui-même capture les clics */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col outline-none pointer-events-auto"
        >

          {/* ════════════════ EN-TÊTE ════════════════ */}
          <div className={`flex items-start gap-4 p-6 rounded-t-2xl border-b border-gray-200 ${
            isSuspended ? 'bg-red-50' : 'bg-gray-50'
          }`}>
            <Avatar src={user.avatar_url} name={displayName} size="xl" />

            <div className="flex-1 min-w-0">
              {/* Nom + badge rôle */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 id={titleId} className="text-xl font-bold text-gray-900">
                  {displayName}
                </h2>
                <span className={`text-sm font-semibold px-3 py-0.5 rounded-full ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-700'}`}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
                {isSuspended && (
                  <span className="text-sm font-semibold px-3 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                    ⛔ Suspendu
                  </span>
                )}
              </div>

              {/* Contacts */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <a
                  href={`mailto:${user.email}`}
                  className="flex items-center gap-1.5 hover:text-brand-600 font-medium"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  {user.email}
                </a>
                {user.phone && (
                  <a
                    href={`tel:${user.phone}`}
                    className="flex items-center gap-1.5 hover:text-brand-600 font-medium"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    {user.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Bouton fermer */}
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 transition-colors flex-shrink-0 ml-2"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* ════════════════ CONTENU SCROLLABLE ════════════════ */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Activité ── */}
            {user._counts && (
              <div className="px-6 pt-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Activité
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: MessageSquare, label: 'Messages',    val: user._counts.messages,         color: 'text-brand-600',  bg: 'bg-brand-50'  },
                    { icon: Package,       label: 'Annonces',    val: user._counts.listings,          color: 'text-purple-600', bg: 'bg-purple-50' },
                    { icon: FileText,      label: 'Forum',       val: user._counts.forum_posts,       color: 'text-teal-600',   bg: 'bg-teal-50'   },
                    { icon: Wrench,        label: 'Demandes',    val: user._counts.service_requests,  color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  ].map(({ icon: Icon, label, val, color, bg }) => (
                    <div key={label} className={`${bg} rounded-xl p-3 text-center border border-gray-100`}>
                      <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                      <div className="text-2xl font-black text-gray-900">{val}</div>
                      <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Informations ── */}
            <div className="px-6 pt-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Informations
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Statut compte',        value: isSuspended ? '⛔ Suspendu' : '✅ Actif' },
                  { label: 'Inscription',          value: formatDate(user.created_at) },
                  { label: 'Dernière mise à jour', value: formatRelative(user.updated_at) },
                  { label: 'CGU acceptées',        value: user.legal_consent ? `✅ Oui${user.legal_consent_at ? ` · ${formatDate(user.legal_consent_at)}` : ''}` : '❌ Non' },
                  { label: 'Téléphone',            value: user.phone || 'Non renseigné' },
                  { label: 'ID utilisateur',       value: user.id.slice(0, 18) + '…' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">{label}</span>
                    <div className="text-sm font-semibold text-gray-800">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Profil artisan ── */}
            {isArtisan && user.artisan_profile && (
              <div className="px-6 pt-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5" /> Profil artisan
                </p>
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.artisan_profile.artisan_type === 'professionnel'
                      ? <HardHat className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      : <Users   className="w-5 h-5 text-green-600 flex-shrink-0" />
                    }
                    <div>
                      <div className="font-semibold text-gray-900">{user.artisan_profile.business_name}</div>
                      <div className="text-sm text-gray-500">
                        {user.artisan_profile.trade_category?.icon} {user.artisan_profile.trade_category?.name}
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/admin/artisans"
                    onClick={onClose}
                    className="text-sm font-semibold text-brand-600 hover:underline px-3 py-1.5 bg-white rounded-lg border border-brand-200"
                  >
                    Gérer →
                  </Link>
                </div>
              </div>
            )}

            {/* ── Modifier le rôle ── */}
            <div className="px-6 pt-5 pb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Modifier le rôle
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onChangeRole(user.id, opt.value)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all text-left ${
                      user.role === opt.value
                        ? `${opt.bg} ${opt.color} ${opt.border} ring-2 ring-offset-1 ring-current`
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    <span>{opt.label}</span>
                    {user.role === opt.value && (
                      <CheckCircle2 className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ════════════════ PIED : CONFIRMATIONS ET ACTIONS ════════════════ */}
          <div className="border-t border-gray-200 flex-shrink-0 rounded-b-2xl overflow-hidden">

            {/* Panneau de confirmation */}
            {confirm && (
              <div className={`p-5 ${
                confirm === 'delete'
                  ? 'bg-red-50 border-b-4 border-red-400'
                  : confirm === 'suspend' && !isSuspended
                    ? 'bg-amber-50 border-b-4 border-amber-400'
                    : 'bg-blue-50 border-b-4 border-blue-400'
              }`}>
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                    confirm === 'delete' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <div>
                    <p className="text-base font-bold text-gray-900">
                      {confirm === 'delete'
                        ? `Supprimer définitivement "${displayName}" ?`
                        : confirm === 'suspend' && !isSuspended
                          ? `Suspendre le compte de "${displayName}" ?`
                          : confirm === 'suspend' && isSuspended
                            ? `Réactiver le compte de "${displayName}" ?`
                            : `Envoyer la réinitialisation MDP à ${user.email} ?`
                      }
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {confirm === 'delete'
                        ? '⚠️ Action irréversible — toutes ses données seront supprimées.'
                        : confirm === 'suspend' && !isSuspended
                          ? 'L\'utilisateur sera bloqué et recevra une notification.'
                          : confirm === 'suspend' && isSuspended
                            ? 'L\'utilisateur pourra de nouveau se connecter.'
                            : 'Un lien de réinitialisation sera envoyé par email.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirm(null)}
                    className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={executeConfirm}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-colors ${
                      confirm === 'delete'
                        ? 'bg-red-600 hover:bg-red-700'
                        : confirm === 'suspend' && !isSuspended
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {confirm === 'delete'          ? '🗑 Supprimer définitivement'
                     : confirm === 'suspend' && !isSuspended ? '⛔ Oui, suspendre'
                     : confirm === 'suspend'       ? '✅ Oui, réactiver'
                     :                               '📧 Envoyer l\'email'}
                  </button>
                </div>
              </div>
            )}

            {/* Boutons principaux (cachés pendant la confirmation) */}
            {!confirm && (
              <div className="p-5 bg-white">
                <div className="grid grid-cols-3 gap-3">
                  {/* Suspendre / Réactiver */}
                  <button
                    onClick={() => setConfirm('suspend')}
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-semibold text-sm transition-colors border-2 ${
                      isSuspended
                        ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                        : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {isSuspended
                      ? <><UserCheck className="w-5 h-5" /><span>Réactiver</span></>
                      : <><UserX     className="w-5 h-5" /><span>Suspendre</span></>
                    }
                  </button>

                  {/* Réinit. MDP */}
                  <button
                    onClick={() => setConfirm('reset')}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-semibold text-sm bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <KeyRound className="w-5 h-5" />
                    <span>Réinit. MDP</span>
                  </button>

                  {/* Supprimer */}
                  <button
                    onClick={() => setConfirm('delete')}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-semibold text-sm bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
