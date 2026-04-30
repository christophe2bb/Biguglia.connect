'use client';

/**
 * UserDrawer — Panneau admin complet pour un utilisateur.
 *
 * Onglets :
 *   Profil      — infos, rôle, CGU, actions (Suspendre / Réinit. MDP / Supprimer)
 *   Messages    — derniers messages envoyés
 *   Annonces    — listings publiés
 *   Forum       — sujets créés
 *   Demandes    — demandes de service
 *
 * Droits :
 *   admin       — tout : voir + changer rôle + suspendre + supprimer
 *   moderator   — voir + suspendre uniquement (pas changer rôle, pas supprimer)
 */

import { useEffect, useRef, useId, useState, useCallback } from 'react';
import {
  X, Crown, Info, HardHat, Users,
  UserX, UserCheck, Trash2, AlertTriangle,
  KeyRound, MessageSquare, Package, FileText,
  Wrench, CheckCircle2, ShieldCheck, Lock,
  ExternalLink, Clock, Tag, ChevronRight,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { ROLE_LABELS, formatDate, formatRelative } from '@/lib/utils';
import { adminFetch } from '@/lib/admin-fetch';
import type { UserWithActivity } from './types';

/* ─────────────────────────── constantes ─────────────────────────────────── */

const ROLE_OPTIONS = [
  { value: 'resident',         label: 'Habitant',           emoji: '🏘️', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300'   },
  { value: 'artisan_pending',  label: 'Artisan en attente', emoji: '⏳', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300'  },
  { value: 'artisan_verified', label: 'Artisan vérifié',    emoji: '✅', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300'  },
  { value: 'moderator',        label: 'Modérateur',         emoji: '🛡️', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' },
] as const;

const ROLE_BADGE: Record<string, string> = {
  resident:         'bg-blue-100 text-blue-800',
  artisan_pending:  'bg-amber-100 text-amber-800',
  artisan_verified: 'bg-green-100 text-green-800',
  moderator:        'bg-purple-100 text-purple-800',
  admin:            'bg-red-100 text-red-800',
};

type Tab = 'profil' | 'messages' | 'annonces' | 'forum' | 'demandes';
type ConfirmStep = 'suspend' | 'delete' | 'reset' | null;

/* ─────────────────────────── types activité ─────────────────────────────── */

interface ActivityMessage  { id: string; content: string; created_at: string; conversation_id: string; }
interface ActivityListing  { id: string; title: string; status: string; listing_type: string; price: number | null; created_at: string; }
interface ActivityPost     { id: string; title: string; content: string; is_closed: boolean; views: number; created_at: string; category?: { name: string; icon: string } | null; }
interface ActivityRequest  { id: string; title: string; status: string; urgency: string; created_at: string; category?: { name: string; icon: string } | null; }

interface UserActivity {
  messages:          ActivityMessage[];
  listings:          ActivityListing[];
  forum_posts:       ActivityPost[];
  service_requests:  ActivityRequest[];
}

/* ─────────────────────────── props ──────────────────────────────────────── */

interface UserDrawerProps {
  user:            UserWithActivity;
  actorRole:       'admin' | 'moderator';
  onClose:         () => void;
  onSuspend:       (id: string, status: string) => void;
  onDelete:        (id: string, name: string)   => void;
  onChangeRole:    (id: string, role: string)   => void;
  onResetPassword: (email: string)              => void;
}

/* ═══════════════════════════ composant ══════════════════════════════════════ */

export default function UserDrawer({
  user, actorRole, onClose, onSuspend, onDelete, onChangeRole, onResetPassword,
}: UserDrawerProps) {

  const modalRef   = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId    = useId();

  const [tab,     setTab]     = useState<Tab>('profil');
  const [confirm, setConfirm] = useState<ConfirmStep>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const isAdmin     = actorRole === 'admin';
  const isSuspended = user.status === 'suspended';
  const isArtisan   = user.role === 'artisan_verified' || user.role === 'artisan_pending';
  const displayName = user.full_name?.trim() || 'Sans nom';

  /* ── chargement activité (une seule fois) ── */
  const fetchActivity = useCallback(async () => {
    if (activity || loadingActivity) return;
    setLoadingActivity(true);
    try {
      const res = await adminFetch(`/api/admin/users/${user.id}/activity`);
      if (res.ok) setActivity(await res.json());
    } finally {
      setLoadingActivity(false);
    }
  }, [user.id, activity, loadingActivity]);

  /* charger activité dès l'ouverture */
  useEffect(() => { fetchActivity(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Escape : confirmation → fermer ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirm) { setConfirm(null); return; }
      onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, confirm]);

  /* ── focus trap + scroll lock ── */
  useEffect(() => {
    triggerRef.current = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => modalRef.current?.focus());
    return () => {
      document.documentElement.style.overflow = '';
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, []);

  /* ── exécution action après confirmation ── */
  const executeConfirm = () => {
    if (confirm === 'suspend') { onSuspend(user.id, user.status); }
    else if (confirm === 'delete') { onDelete(user.id, displayName); onClose(); }
    else if (confirm === 'reset') { onResetPassword(user.email); }
    setConfirm(null);
  };

  /* ── compteurs pour badges onglets ── */
  const counts = user._counts;
  const tabDef: { id: Tab; label: string; icon: typeof MessageSquare; count: number }[] = [
    { id: 'profil',   label: 'Profil',    icon: Info,           count: 0 },
    { id: 'messages', label: 'Messages',  icon: MessageSquare,  count: counts?.messages         ?? 0 },
    { id: 'annonces', label: 'Annonces',  icon: Package,        count: counts?.listings         ?? 0 },
    { id: 'forum',    label: 'Forum',     icon: FileText,       count: counts?.forum_posts      ?? 0 },
    { id: 'demandes', label: 'Demandes',  icon: Wrench,         count: counts?.service_requests ?? 0 },
  ];

  /* ═══════════════════ rendu ═══════════════════════════════════════════════ */

  return (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* conteneur de positionnement — pointer-events-none pour que l'overlay reste cliquable */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-none"
        onClick={e => e.stopPropagation()}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col outline-none pointer-events-auto"
        >

          {/* ══════════════ EN-TÊTE ══════════════ */}
          <div className={`flex items-start gap-4 px-6 py-5 rounded-t-2xl border-b border-gray-200 flex-shrink-0 ${isSuspended ? 'bg-red-50' : 'bg-gray-50'}`}>
            <Avatar src={user.avatar_url} name={displayName} size="lg" />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h2 id={titleId} className="text-lg font-bold text-gray-900 leading-tight">
                  {displayName}
                </h2>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-700'}`}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
                {isSuspended && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-200 text-red-800">
                    ⛔ Suspendu
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5 text-sm text-gray-600">
                <a href={`mailto:${user.email}`} className="hover:text-blue-600 transition-colors truncate font-medium">
                  {user.email}
                </a>
                {user.phone && (
                  <a href={`tel:${user.phone}`} className="hover:text-blue-600 transition-colors font-medium">
                    {user.phone}
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* ══════════════ ONGLETS ══════════════ */}
          <div className="flex border-b border-gray-200 bg-white flex-shrink-0 overflow-x-auto">
            {tabDef.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    active
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ══════════════ CONTENU ONGLET ══════════════ */}
          <div className="flex-1 overflow-y-auto">

            {/* ── ONGLET PROFIL ── */}
            {tab === 'profil' && (
              <div className="divide-y divide-gray-100">

                {/* Modifier le rôle */}
                <div className="px-6 py-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" /> Modifier le rôle
                  </p>
                  {isAdmin ? (
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
                          <span className="flex-1">{opt.label}</span>
                          {user.role === opt.value && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500">
                      <Lock className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span>Seul un <strong>administrateur</strong> peut modifier les rôles. Votre compte est modérateur.</span>
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="px-6 py-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Informations
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'Statut compte',
                        value: isSuspended ? '⛔ Suspendu' : '✅ Actif',
                        cls: isSuspended ? 'text-red-700 font-bold' : 'text-green-700 font-bold',
                      },
                      {
                        label: 'Inscription',
                        value: user.created_at ? formatDate(user.created_at) : '—',
                        cls: '',
                      },
                      {
                        label: 'Dernière mise à jour',
                        value: user.updated_at ? formatDate(user.updated_at) : '—',
                        cls: 'text-gray-500',
                      },
                      {
                        label: 'CGU acceptées',
                        value: user.legal_consent
                          ? `✅ Oui${user.legal_consent_at ? ` — ${formatDate(user.legal_consent_at)}` : ''}`
                          : '❌ Non',
                        cls: user.legal_consent ? 'text-green-700' : 'text-red-600',
                      },
                      {
                        label: 'Téléphone',
                        value: user.phone || '—',
                        cls: '',
                      },
                      {
                        label: 'ID utilisateur',
                        value: user.id,
                        cls: 'font-mono text-gray-400 text-xs break-all',
                      },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">{label}</span>
                        <div className={`text-sm font-semibold text-gray-800 ${cls}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profil artisan */}
                {isArtisan && user.artisan_profile && (
                  <div className="px-6 py-5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5" /> Profil artisan
                    </p>
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.artisan_profile.artisan_type === 'professionnel'
                          ? <HardHat className="w-5 h-5 text-blue-600" />
                          : <Users   className="w-5 h-5 text-green-600" />
                        }
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{user.artisan_profile.business_name}</div>
                          <div className="text-xs text-gray-500">
                            {user.artisan_profile.trade_category?.icon} {user.artisan_profile.trade_category?.name}
                          </div>
                        </div>
                      </div>
                      <a
                        href="/admin/artisans"
                        className="text-xs font-semibold text-blue-600 hover:underline px-3 py-1.5 bg-white rounded-lg border border-blue-200"
                      >
                        Gérer →
                      </a>
                    </div>
                  </div>
                )}

                {/* Badge modérateur */}
                {user.role === 'moderator' && (
                  <div className="px-6 py-5">
                    <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 font-medium">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      Ce compte dispose des droits de modération sur la plateforme.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ONGLET MESSAGES ── */}
            {tab === 'messages' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.messages ?? []}
                empty="Aucun message envoyé"
                renderItem={(m: ActivityMessage) => (
                  <div key={m.id} className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug line-clamp-2">{m.content}</p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatRelative(m.created_at)}
                      </p>
                    </div>
                    <a
                      href={`/admin/messages`}
                      className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5 flex-shrink-0"
                      title="Voir dans messages"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              />
            )}

            {/* ── ONGLET ANNONCES ── */}
            {tab === 'annonces' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.listings ?? []}
                empty="Aucune annonce publiée"
                renderItem={(l: ActivityListing) => (
                  <div key={l.id} className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <Package className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{l.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={l.status} />
                        <span className="text-xs text-gray-400">{l.listing_type}</span>
                        {l.price != null && (
                          <span className="text-xs font-semibold text-gray-600">
                            {l.price === 0 ? 'Gratuit' : `${l.price} €`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatRelative(l.created_at)}
                      </p>
                    </div>
                  </div>
                )}
              />
            )}

            {/* ── ONGLET FORUM ── */}
            {tab === 'forum' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.forum_posts ?? []}
                empty="Aucun sujet forum créé"
                renderItem={(p: ActivityPost) => (
                  <div key={p.id} className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <FileText className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {p.category && (
                          <span className="text-xs text-gray-500 flex items-center gap-0.5">
                            <Tag className="w-3 h-3" /> {p.category.icon} {p.category.name}
                          </span>
                        )}
                        {p.is_closed && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Fermé</span>}
                        <span className="text-xs text-gray-400">{p.views} vues</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatRelative(p.created_at)}
                      </p>
                    </div>
                  </div>
                )}
              />
            )}

            {/* ── ONGLET DEMANDES ── */}
            {tab === 'demandes' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.service_requests ?? []}
                empty="Aucune demande de service"
                renderItem={(r: ActivityRequest) => (
                  <div key={r.id} className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <Wrench className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={r.status} />
                        <UrgencyBadge urgency={r.urgency} />
                        {r.category && (
                          <span className="text-xs text-gray-500">
                            {r.category.icon} {r.category.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatRelative(r.created_at)}
                      </p>
                    </div>
                  </div>
                )}
              />
            )}

          </div>

          {/* ══════════════ PIED — ACTIONS (onglet Profil uniquement) ══════════════ */}
          {tab === 'profil' && (
            <div className="border-t border-gray-200 flex-shrink-0 rounded-b-2xl overflow-hidden">

              {/* Panneau de confirmation */}
              {confirm && (
                <div className={`p-5 ${
                  confirm === 'delete'
                    ? 'bg-red-50 border-b-2 border-red-300'
                    : confirm === 'suspend' && !isSuspended
                      ? 'bg-amber-50 border-b-2 border-amber-300'
                      : 'bg-blue-50 border-b-2 border-blue-300'
                }`}>
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${confirm === 'delete' ? 'text-red-500' : 'text-amber-500'}`} />
                    <div>
                      <p className="text-base font-bold text-gray-900">
                        {confirm === 'delete'
                          ? `Supprimer définitivement « ${displayName} » ?`
                          : confirm === 'suspend' && !isSuspended
                            ? `Suspendre le compte de « ${displayName} » ?`
                            : confirm === 'suspend' && isSuspended
                              ? `Réactiver le compte de « ${displayName} » ?`
                              : `Envoyer la réinitialisation MDP à ${user.email} ?`
                        }
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {confirm === 'delete'
                          ? '⚠️ Action irréversible — toutes les données seront supprimées.'
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
                      className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
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
                      {confirm === 'delete'
                        ? '🗑 Supprimer'
                        : confirm === 'suspend' && !isSuspended
                          ? '⛔ Suspendre'
                          : confirm === 'suspend'
                            ? '✅ Réactiver'
                            : '📧 Envoyer'
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Boutons principaux */}
              {!confirm && (
                <div className="p-4 bg-gray-50">
                  <div className={`grid gap-3 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>

                    {/* Suspendre / Réactiver */}
                    <button
                      onClick={() => setConfirm('suspend')}
                      className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-semibold text-sm transition-colors border-2 min-h-[72px] ${
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

                    {/* Réinit. MDP — admin seulement */}
                    {isAdmin && (
                      <button
                        onClick={() => setConfirm('reset')}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-semibold text-sm bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-100 transition-colors min-h-[72px]"
                      >
                        <KeyRound className="w-5 h-5" />
                        <span>Réinit. MDP</span>
                      </button>
                    )}

                    {/* Supprimer — admin seulement */}
                    {isAdmin ? (
                      <button
                        onClick={() => setConfirm('delete')}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-semibold text-sm bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100 transition-colors min-h-[72px]"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>Supprimer</span>
                      </button>
                    ) : (
                      /* Modérateur : bouton désactivé avec explication */
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-sm bg-gray-100 text-gray-400 border-2 border-gray-200 min-h-[72px] cursor-not-allowed select-none">
                        <Lock className="w-5 h-5" />
                        <span>Admin requis</span>
                      </div>
                    )}
                  </div>

                  {!isAdmin && (
                    <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      Réinit. MDP et Suppression réservées aux administrateurs
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pied minimal sur les autres onglets */}
          {tab !== 'profil' && (
            <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex-shrink-0 rounded-b-2xl">
              <button
                onClick={() => setTab('profil')}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                Retour au profil et aux actions
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════ sous-composants ════════════════════════════════ */

function ActivityList<T>({
  loading, items, empty, renderItem,
}: {
  loading: boolean;
  items: T[];
  empty: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-3xl mb-2">📭</span>
        <p className="text-sm font-medium">{empty}</p>
      </div>
    );
  }
  return <div>{items.map(item => renderItem(item))}</div>;
}

const STATUS_COLORS: Record<string, string> = {
  active:     'bg-green-100 text-green-700',
  published:  'bg-green-100 text-green-700',
  submitted:  'bg-blue-100  text-blue-700',
  viewed:     'bg-blue-100  text-blue-700',
  replied:    'bg-purple-100 text-purple-700',
  scheduled:  'bg-indigo-100 text-indigo-700',
  completed:  'bg-gray-100  text-gray-600',
  cancelled:  'bg-red-100   text-red-700',
  draft:      'bg-gray-100  text-gray-500',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

const URGENCY_COLORS: Record<string, string> = {
  normal:      'bg-gray-100 text-gray-600',
  urgent:      'bg-orange-100 text-orange-700',
  tres_urgent: 'bg-red-100 text-red-700',
};
const URGENCY_LABELS: Record<string, string> = {
  normal:      'Normal',
  urgent:      '⚡ Urgent',
  tres_urgent: '🔴 Très urgent',
};

function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${URGENCY_COLORS[urgency] ?? 'bg-gray-100 text-gray-600'}`}>
      {URGENCY_LABELS[urgency] ?? urgency}
    </span>
  );
}
