'use client';

/**
 * UserDrawer — Fiche modérateur exhaustive d'un utilisateur.
 *
 * Onglets :
 *   Profil        — infos complètes, rôle, CGU, actions (Suspendre / Réinit. MDP / Supprimer)
 *   Messages      — derniers messages envoyés
 *   Annonces      — listings publiés (avec action Supprimer)
 *   Forum         — sujets créés (avec action Fermer/Rouvrir)
 *   Demandes      — demandes de service artisan
 *   Communauté    — coups de main, perdu/trouvé, événements, sorties, matériel, promenades
 *   Avis          — avis laissés sur des artisans
 *   Signalements  — signalements émis
 *   Emploi        — offres et demandes d'emploi
 *   Notifs        — 10 dernières notifications reçues
 *
 * Droits :
 *   admin     — tout : voir + changer rôle + suspendre + supprimer + actions sur contenu
 *   moderator — voir + suspendre uniquement (pas changer rôle, pas supprimer compte)
 */

import { useEffect, useRef, useId, useState, useCallback } from 'react';
import {
  X, Crown, Info, HardHat, Users,
  UserX, UserCheck, Trash2, AlertTriangle,
  KeyRound, MessageSquare, Package, FileText,
  Wrench, CheckCircle2, ShieldCheck, Lock,
  ExternalLink, Clock, Tag, Star, Flag,
  Bike, Heart, Briefcase, Bell, HandHelping,
  Search, Calendar, ChevronDown, ChevronUp,
  Hammer, MapPin, CheckCheck,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { ROLE_LABELS, formatDate, formatRelative } from '@/lib/utils';
import { adminFetch } from '@/lib/admin-fetch';
import type { UserWithActivity, UserActivity } from './types';

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

type Tab = 'profil' | 'messages' | 'annonces' | 'forum' | 'demandes'
         | 'communaute' | 'avis' | 'signalements' | 'emploi' | 'notifs';
type ConfirmStep = 'suspend' | 'delete' | 'reset' | null;

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
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

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

  /* ── Escape ── */
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

  /* ── action confirmation ── */
  const executeConfirm = () => {
    if (confirm === 'suspend') { onSuspend(user.id, user.status); }
    else if (confirm === 'delete') { onDelete(user.id, displayName); onClose(); }
    else if (confirm === 'reset') { onResetPassword(user.email); }
    setConfirm(null);
  };

  /* ── action suppression item (annonce, sujet forum…) ── */
  const deleteItem = async (table: string, id: string) => {
    if (!isAdmin) return;
    setDeletingItem(id);
    try {
      await adminFetch(`/api/admin/content/${table}/${id}`, { method: 'DELETE' });
      // Rafraîchir l'activité localement
      if (activity) {
        setActivity(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            listings:        prev.listings.filter(x => x.id !== id),
            forum_posts:     prev.forum_posts.filter(x => x.id !== id),
            help_requests:   prev.help_requests.filter(x => x.id !== id),
            lost_found:      prev.lost_found.filter(x => x.id !== id),
            events:          prev.events.filter(x => x.id !== id),
            group_outings:   prev.group_outings.filter(x => x.id !== id),
            equipment_items: prev.equipment_items.filter(x => x.id !== id),
            promenades:      prev.promenades.filter(x => x.id !== id),
            job_offers:      prev.job_offers.filter(x => x.id !== id),
            job_demands:     prev.job_demands.filter(x => x.id !== id),
          };
        });
      }
    } finally {
      setDeletingItem(null);
    }
  };

  /* ── compteurs onglets ── */
  const c = activity;
  const counts = user._counts;

  type TabDef = { id: Tab; label: string; icon: typeof MessageSquare; count: number };
  const tabDef: TabDef[] = [
    { id: 'profil',       label: 'Profil',        icon: Info,          count: 0 },
    { id: 'messages',     label: 'Messages',       icon: MessageSquare, count: counts?.messages ?? c?.messages.length ?? 0 },
    { id: 'annonces',     label: 'Annonces',       icon: Package,       count: counts?.listings ?? c?.listings.length ?? 0 },
    { id: 'forum',        label: 'Forum',          icon: FileText,      count: counts?.forum_posts ?? c?.forum_posts.length ?? 0 },
    { id: 'demandes',     label: 'Demandes',       icon: Wrench,        count: counts?.service_requests ?? c?.service_requests.length ?? 0 },
    { id: 'communaute',   label: 'Communauté',     icon: HandHelping,   count: (counts?.help_requests ?? 0) + (counts?.lost_found ?? 0) + (counts?.events ?? 0) + (counts?.group_outings ?? 0) + (counts?.equipment_items ?? 0) + (counts?.promenades ?? 0) },
    { id: 'avis',         label: 'Avis',           icon: Star,          count: counts?.reviews ?? c?.reviews.length ?? 0 },
    { id: 'signalements', label: 'Signalements',   icon: Flag,          count: counts?.reports_sent ?? c?.reports_sent.length ?? 0 },
    { id: 'emploi',       label: 'Emploi',         icon: Briefcase,     count: (counts?.job_offers ?? 0) + (counts?.job_demands ?? 0) },
    { id: 'notifs',       label: 'Notifs',         icon: Bell,          count: c?.notifications.filter(n => !n.is_read).length ?? 0 },
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
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col outline-none pointer-events-auto"
        >

          {/* ══════════════ EN-TÊTE ══════════════ */}
          <div className={`flex items-start gap-4 px-6 py-4 rounded-t-2xl border-b border-gray-200 flex-shrink-0 ${isSuspended ? 'bg-red-50' : 'bg-gray-50'}`}>
            <Avatar src={user.avatar_url} name={displayName} size="lg" />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
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
                <span className="text-xs text-gray-400">
                  Inscrit le {user.created_at ? formatDate(user.created_at) : '—'}
                  {' · '}ID&nbsp;<span className="font-mono">{user.id.slice(0, 8)}…</span>
                </span>
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
          <div className="flex border-b border-gray-200 bg-white flex-shrink-0 overflow-x-auto scrollbar-none">
            {tabDef.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    active
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
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

          {/* ══════════════ CONTENU ══════════════ */}
          <div className="flex-1 overflow-y-auto">

            {/* ─── PROFIL ─────────────────────────────────────────────────── */}
            {tab === 'profil' && (
              <div className="divide-y divide-gray-100">

                {/* Modifier le rôle */}
                <div className="px-6 py-5">
                  <SectionTitle icon={<Crown className="w-3.5 h-3.5" />} label="Modifier le rôle" />
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
                      <span>Seul un <strong>administrateur</strong> peut modifier les rôles.</span>
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="px-6 py-5">
                  <SectionTitle icon={<Info className="w-3.5 h-3.5" />} label="Informations" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'Statut compte',       value: isSuspended ? '⛔ Suspendu' : '✅ Actif',  cls: isSuspended ? 'text-red-700 font-bold' : 'text-green-700 font-bold' },
                      { label: 'Inscription',         value: user.created_at ? formatDate(user.created_at) : '—', cls: '' },
                      { label: 'Dernière MAJ',        value: user.updated_at ? formatDate(user.updated_at) : '—', cls: 'text-gray-500' },
                      { label: 'CGU acceptées',       value: user.legal_consent ? `✅ Oui${user.legal_consent_at ? ` — ${formatDate(user.legal_consent_at)}` : ''}` : '❌ Non', cls: user.legal_consent ? 'text-green-700' : 'text-red-600' },
                      { label: 'Téléphone',           value: user.phone || '—', cls: '' },
                      { label: 'ID utilisateur',      value: user.id, cls: 'font-mono text-gray-400 text-xs break-all' },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">{label}</span>
                        <div className={`text-sm font-semibold text-gray-800 ${cls}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Résumé activité */}
                <div className="px-6 py-5">
                  <SectionTitle icon={<CheckCheck className="w-3.5 h-3.5" />} label="Résumé activité" />
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Messages',   value: counts?.messages ?? c?.messages.length ?? '…', color: 'text-blue-600' },
                      { label: 'Annonces',   value: counts?.listings ?? c?.listings.length ?? '…', color: 'text-purple-600' },
                      { label: 'Forum',      value: counts?.forum_posts ?? c?.forum_posts.length ?? '…', color: 'text-teal-600' },
                      { label: 'Demandes',   value: counts?.service_requests ?? c?.service_requests.length ?? '…', color: 'text-indigo-600' },
                      { label: 'Coups de main', value: c?.help_requests.length ?? '…', color: 'text-orange-600' },
                      { label: 'Perdu/trouvé', value: c?.lost_found.length ?? '…', color: 'text-rose-600' },
                      { label: 'Évén.',      value: c?.events.length ?? '…', color: 'text-green-600' },
                      { label: 'Avis',       value: c?.reviews.length ?? '…', color: 'text-amber-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-3 text-center">
                        <div className={`text-2xl font-black ${color}`}>{value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profil artisan */}
                {isArtisan && user.artisan_profile && (
                  <div className="px-6 py-5">
                    <SectionTitle icon={<HardHat className="w-3.5 h-3.5" />} label="Profil artisan" />
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
                      <a href="/admin/artisans" className="text-xs font-semibold text-blue-600 hover:underline px-3 py-1.5 bg-white rounded-lg border border-blue-200">
                        Gérer →
                      </a>
                    </div>
                  </div>
                )}

                {user.role === 'moderator' && (
                  <div className="px-6 py-5">
                    <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 font-medium">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      Ce compte dispose des droits de modération.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── MESSAGES ───────────────────────────────────────────────── */}
            {tab === 'messages' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.messages ?? []}
                empty="Aucun message envoyé"
                renderItem={(m) => (
                  <ItemRow key={m.id}
                    icon={<MessageSquare className="w-4 h-4 text-blue-400" />}
                    date={m.created_at}
                    action={
                      <a href={`/admin`} className="text-blue-400 hover:text-blue-600" title="Voir messages">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    }
                  >
                    <p className="text-sm text-gray-800 leading-snug line-clamp-2">{m.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">conv. {m.conversation_id.slice(0,8)}…</p>
                  </ItemRow>
                )}
              />
            )}

            {/* ─── ANNONCES ───────────────────────────────────────────────── */}
            {tab === 'annonces' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.listings ?? []}
                empty="Aucune annonce publiée"
                renderItem={(l) => (
                  <ItemRow key={l.id}
                    icon={<Package className="w-4 h-4 text-purple-400" />}
                    date={l.created_at}
                    action={isAdmin ? (
                      <DeleteBtn id={l.id} deleting={deletingItem} onDelete={() => deleteItem('listings', l.id)} label="annonce" />
                    ) : undefined}
                  >
                    <p className="text-sm font-semibold text-gray-800 truncate">{l.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={l.status} />
                      <span className="text-xs text-gray-400">{l.listing_type}</span>
                      {l.price != null && (
                        <span className="text-xs font-semibold text-gray-600">
                          {l.price === 0 ? 'Gratuit' : `${l.price} €`}
                        </span>
                      )}
                    </div>
                  </ItemRow>
                )}
              />
            )}

            {/* ─── FORUM ──────────────────────────────────────────────────── */}
            {tab === 'forum' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.forum_posts ?? []}
                empty="Aucun sujet forum créé"
                renderItem={(p) => (
                  <ItemRow key={p.id}
                    icon={<FileText className="w-4 h-4 text-teal-400" />}
                    date={p.created_at}
                    action={isAdmin ? (
                      <DeleteBtn id={p.id} deleting={deletingItem} onDelete={() => deleteItem('forum_posts', p.id)} label="sujet" />
                    ) : undefined}
                  >
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.category && (
                        <span className="text-xs text-gray-500 flex items-center gap-0.5">
                          <Tag className="w-3 h-3" /> {p.category.icon} {p.category.name}
                        </span>
                      )}
                      {p.is_closed && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Fermé</span>}
                      <span className="text-xs text-gray-400">{p.views} vues</span>
                    </div>
                  </ItemRow>
                )}
              />
            )}

            {/* ─── DEMANDES SERVICE ───────────────────────────────────────── */}
            {tab === 'demandes' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.service_requests ?? []}
                empty="Aucune demande de service"
                renderItem={(r) => (
                  <ItemRow key={r.id}
                    icon={<Wrench className="w-4 h-4 text-indigo-400" />}
                    date={r.created_at}
                  >
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={r.status} />
                      <UrgencyBadge urgency={r.urgency} />
                      {r.category && <span className="text-xs text-gray-500">{r.category.icon} {r.category.name}</span>}
                    </div>
                  </ItemRow>
                )}
              />
            )}

            {/* ─── COMMUNAUTÉ ─────────────────────────────────────────────── */}
            {tab === 'communaute' && (
              <div className="divide-y divide-gray-100">

                {/* Coups de main */}
                <CollapsibleSection
                  title="Coups de main"
                  icon={<HandHelping className="w-4 h-4 text-orange-500" />}
                  count={activity?.help_requests.length ?? 0}
                  loading={loadingActivity}
                >
                  {(activity?.help_requests ?? []).length === 0 ? (
                    <EmptyState label="Aucun coup de main" />
                  ) : (activity?.help_requests ?? []).map(h => (
                    <ItemRow key={h.id}
                      icon={<HandHelping className="w-4 h-4 text-orange-400" />}
                      date={h.created_at}
                      action={isAdmin ? (
                        <DeleteBtn id={h.id} deleting={deletingItem} onDelete={() => deleteItem('help_requests', h.id)} label="coup de main" />
                      ) : undefined}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">{h.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <HelpTypeBadge type={h.help_type} />
                        <StatusBadge status={h.status} />
                        <span className="text-xs text-gray-400">{h.category}</span>
                      </div>
                    </ItemRow>
                  ))}
                </CollapsibleSection>

                {/* Perdu / Trouvé */}
                <CollapsibleSection
                  title="Perdu / Trouvé"
                  icon={<Search className="w-4 h-4 text-rose-500" />}
                  count={activity?.lost_found.length ?? 0}
                  loading={loadingActivity}
                >
                  {(activity?.lost_found ?? []).length === 0 ? (
                    <EmptyState label="Aucun objet signalé" />
                  ) : (activity?.lost_found ?? []).map(lf => (
                    <ItemRow key={lf.id}
                      icon={<Search className="w-4 h-4 text-rose-400" />}
                      date={lf.created_at}
                      action={isAdmin ? (
                        <DeleteBtn id={lf.id} deleting={deletingItem} onDelete={() => deleteItem('lost_found_items', lf.id)} label="signalement" />
                      ) : undefined}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">{lf.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lf.type === 'perdu' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {lf.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé'}
                        </span>
                        <StatusBadge status={lf.status} />
                        <span className="text-xs text-gray-400">{lf.category}</span>
                      </div>
                    </ItemRow>
                  ))}
                </CollapsibleSection>

                {/* Événements */}
                <CollapsibleSection
                  title="Événements organisés"
                  icon={<Calendar className="w-4 h-4 text-green-600" />}
                  count={activity?.events.length ?? 0}
                  loading={loadingActivity}
                >
                  {(activity?.events ?? []).length === 0 ? (
                    <EmptyState label="Aucun événement organisé" />
                  ) : (activity?.events ?? []).map(ev => (
                    <ItemRow key={ev.id}
                      icon={<Calendar className="w-4 h-4 text-green-500" />}
                      date={ev.created_at}
                      action={isAdmin ? (
                        <DeleteBtn id={ev.id} deleting={deletingItem} onDelete={() => deleteItem('events', ev.id)} label="événement" />
                      ) : undefined}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={ev.status} />
                        {ev.location && <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ev.location}</span>}
                        {ev.start_date && <span className="text-xs text-gray-400">{formatDate(ev.start_date)}</span>}
                      </div>
                    </ItemRow>
                  ))}
                </CollapsibleSection>

                {/* Sorties groupées */}
                <CollapsibleSection
                  title="Sorties groupées"
                  icon={<Bike className="w-4 h-4 text-cyan-600" />}
                  count={activity?.group_outings.length ?? 0}
                  loading={loadingActivity}
                >
                  {(activity?.group_outings ?? []).length === 0 ? (
                    <EmptyState label="Aucune sortie organisée" />
                  ) : (activity?.group_outings ?? []).map(o => (
                    <ItemRow key={o.id}
                      icon={<Bike className="w-4 h-4 text-cyan-500" />}
                      date={o.created_at}
                      action={isAdmin ? (
                        <DeleteBtn id={o.id} deleting={deletingItem} onDelete={() => deleteItem('group_outings', o.id)} label="sortie" />
                      ) : undefined}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">{o.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={o.status} />
                        {o.max_participants && <span className="text-xs text-gray-400">{o.max_participants} places max</span>}
                        {o.outing_date && <span className="text-xs text-gray-400">{formatDate(o.outing_date)}</span>}
                      </div>
                    </ItemRow>
                  ))}
                </CollapsibleSection>

                {/* Matériel en prêt */}
                <CollapsibleSection
                  title="Matériel mis en prêt"
                  icon={<Hammer className="w-4 h-4 text-yellow-600" />}
                  count={activity?.equipment_items.length ?? 0}
                  loading={loadingActivity}
                >
                  {(activity?.equipment_items ?? []).length === 0 ? (
                    <EmptyState label="Aucun équipement proposé" />
                  ) : (activity?.equipment_items ?? []).map(eq => (
                    <ItemRow key={eq.id}
                      icon={<Hammer className="w-4 h-4 text-yellow-500" />}
                      date={eq.created_at}
                      action={isAdmin ? (
                        <DeleteBtn id={eq.id} deleting={deletingItem} onDelete={() => deleteItem('equipment_items', eq.id)} label="équipement" />
                      ) : undefined}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">{eq.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={eq.status} />
                        {eq.category && <span className="text-xs text-gray-400">{eq.category}</span>}
                        {eq.deposit_amount != null && eq.deposit_amount > 0 && (
                          <span className="text-xs text-gray-500">Caution {eq.deposit_amount} €</span>
                        )}
                      </div>
                    </ItemRow>
                  ))}
                </CollapsibleSection>

                {/* Promenades */}
                <CollapsibleSection
                  title="Promenades publiées"
                  icon={<Heart className="w-4 h-4 text-pink-500" />}
                  count={activity?.promenades.length ?? 0}
                  loading={loadingActivity}
                >
                  {(activity?.promenades ?? []).length === 0 ? (
                    <EmptyState label="Aucune promenade publiée" />
                  ) : (activity?.promenades ?? []).map(p => (
                    <ItemRow key={p.id}
                      icon={<Heart className="w-4 h-4 text-pink-400" />}
                      date={p.created_at}
                      action={isAdmin ? (
                        <DeleteBtn id={p.id} deleting={deletingItem} onDelete={() => deleteItem('promenades', p.id)} label="promenade" />
                      ) : undefined}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <DifficultyBadge difficulty={p.difficulty} />
                        {p.distance_km && <span className="text-xs text-gray-400">{p.distance_km} km</span>}
                        <span className="text-xs text-gray-400">{p.views} vues</span>
                      </div>
                    </ItemRow>
                  ))}
                </CollapsibleSection>

              </div>
            )}

            {/* ─── AVIS ───────────────────────────────────────────────────── */}
            {tab === 'avis' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.reviews ?? []}
                empty="Aucun avis laissé"
                renderItem={(r) => (
                  <ItemRow key={r.id}
                    icon={<Star className="w-4 h-4 text-amber-400" />}
                    date={r.created_at}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
                        ))}
                      </div>
                      {r.artisan && (
                        <span className="text-xs font-semibold text-gray-600">{r.artisan.business_name}</span>
                      )}
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.comment}</p>}
                  </ItemRow>
                )}
              />
            )}

            {/* ─── SIGNALEMENTS ───────────────────────────────────────────── */}
            {tab === 'signalements' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.reports_sent ?? []}
                empty="Aucun signalement émis"
                renderItem={(r) => (
                  <ItemRow key={r.id}
                    icon={<Flag className="w-4 h-4 text-red-400" />}
                    date={r.created_at}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{r.target_type}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{r.reason}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">cible {r.target_id.slice(0,8)}…</p>
                  </ItemRow>
                )}
              />
            )}

            {/* ─── EMPLOI ─────────────────────────────────────────────────── */}
            {tab === 'emploi' && (
              <div className="divide-y divide-gray-100">
                <CollapsibleSection
                  title="Offres d'emploi"
                  icon={<Briefcase className="w-4 h-4 text-blue-600" />}
                  count={activity?.job_offers.length ?? 0}
                  loading={loadingActivity}
                >
                  {(activity?.job_offers ?? []).length === 0 ? (
                    <EmptyState label="Aucune offre d'emploi" />
                  ) : (activity?.job_offers ?? []).map(j => (
                    <ItemRow key={j.id}
                      icon={<Briefcase className="w-4 h-4 text-blue-400" />}
                      date={j.created_at}
                      action={isAdmin ? (
                        <DeleteBtn id={j.id} deleting={deletingItem} onDelete={() => deleteItem('job_offers', j.id)} label="offre" />
                      ) : undefined}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">{j.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={j.status} />
                        {j.contract_type && <span className="text-xs text-gray-400">{j.contract_type}</span>}
                      </div>
                    </ItemRow>
                  ))}
                </CollapsibleSection>

                <CollapsibleSection
                  title="Demandes d'emploi"
                  icon={<Users className="w-4 h-4 text-indigo-600" />}
                  count={activity?.job_demands.length ?? 0}
                  loading={loadingActivity}
                >
                  {(activity?.job_demands ?? []).length === 0 ? (
                    <EmptyState label="Aucune demande d'emploi" />
                  ) : (activity?.job_demands ?? []).map(j => (
                    <ItemRow key={j.id}
                      icon={<Users className="w-4 h-4 text-indigo-400" />}
                      date={j.created_at}
                      action={isAdmin ? (
                        <DeleteBtn id={j.id} deleting={deletingItem} onDelete={() => deleteItem('job_demands', j.id)} label="demande" />
                      ) : undefined}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">{j.title}</p>
                      <StatusBadge status={j.status} />
                    </ItemRow>
                  ))}
                </CollapsibleSection>
              </div>
            )}

            {/* ─── NOTIFICATIONS ──────────────────────────────────────────── */}
            {tab === 'notifs' && (
              <ActivityList
                loading={loadingActivity}
                items={activity?.notifications ?? []}
                empty="Aucune notification"
                renderItem={(n) => (
                  <ItemRow key={n.id}
                    icon={<Bell className={`w-4 h-4 ${n.is_read ? 'text-gray-300' : 'text-blue-400'}`} />}
                    date={n.created_at}
                  >
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${n.is_read ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-xs text-gray-300 font-mono">{n.type}</span>
                  </ItemRow>
                )}
              />
            )}

          </div>

          {/* ══════════════ PIED — ACTIONS (onglet Profil) ══════════════ */}
          {tab === 'profil' && (
            <div className="border-t border-gray-200 flex-shrink-0 rounded-b-2xl overflow-hidden">

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
                            ? "L'utilisateur sera bloqué et recevra une notification."
                            : confirm === 'suspend' && isSuspended
                              ? "L'utilisateur pourra de nouveau se connecter."
                              : 'Un lien de réinitialisation sera envoyé par email.'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirm(null)} className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
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
                      {confirm === 'delete' ? '🗑 Supprimer' : confirm === 'suspend' && !isSuspended ? '⛔ Suspendre' : confirm === 'suspend' ? '✅ Réactiver' : '📧 Envoyer'}
                    </button>
                  </div>
                </div>
              )}

              {!confirm && (
                <div className="p-4 bg-gray-50">
                  <div className={`grid gap-3 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>

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

                    {isAdmin && (
                      <button
                        onClick={() => setConfirm('reset')}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-semibold text-sm bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-100 transition-colors min-h-[72px]"
                      >
                        <KeyRound className="w-5 h-5" />
                        <span>Réinit. MDP</span>
                      </button>
                    )}

                    {isAdmin ? (
                      <button
                        onClick={() => setConfirm('delete')}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-semibold text-sm bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100 transition-colors min-h-[72px]"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>Supprimer</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-sm bg-gray-100 text-gray-400 border-2 border-gray-200 min-h-[72px] cursor-not-allowed select-none">
                        <Lock className="w-5 h-5" />
                        <span>Admin requis</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════ composants helpers ══════════════════════════════ */

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
      {icon} {label}
    </p>
  );
}

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
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-3" />
        Chargement…
      </div>
    );
  }
  if (items.length === 0) return <EmptyState label={empty} />;
  return <div>{items.map(renderItem)}</div>;
}

function ItemRow({
  icon, date, action, children,
}: {
  icon: React.ReactNode;
  date: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        {children}
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {formatRelative(date)}
        </p>
      </div>
      {action && <div className="flex-shrink-0 mt-0.5">{action}</div>}
    </div>
  );
}

function CollapsibleSection({
  title, icon, count, loading, children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  loading: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {icon}
        <span className="text-sm font-bold text-gray-700 flex-1">{title}</span>
        {loading ? (
          <span className="text-xs text-gray-400">…</span>
        ) : (
          <span className="text-xs font-bold bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">{count}</span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-6 text-center text-sm text-gray-400 italic px-6">
      {label}
    </div>
  );
}

function DeleteBtn({
  id, deleting, onDelete, label,
}: {
  id: string;
  deleting: string | null;
  onDelete: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onDelete}
      disabled={deleting === id}
      title={`Supprimer ce ${label}`}
      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {deleting === id
        ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
        : <Trash2 className="w-3.5 h-3.5" />
      }
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:     'bg-green-100 text-green-700',
    published:  'bg-green-100 text-green-700',
    submitted:  'bg-blue-100 text-blue-700',
    pending:    'bg-amber-100 text-amber-700',
    resolved:   'bg-gray-100 text-gray-600',
    closed:     'bg-gray-100 text-gray-600',
    cancelled:  'bg-red-100 text-red-700',
    suspended:  'bg-red-100 text-red-700',
    paused:     'bg-yellow-100 text-yellow-700',
    draft:      'bg-gray-100 text-gray-500',
    refused:    'bg-red-100 text-red-600',
    archived:   'bg-gray-100 text-gray-500',
    inactive:   'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    urgent:           { label: '🚨 Urgent',         cls: 'bg-red-100 text-red-700' },
    rapidement:       { label: '⚡ Rapidement',     cls: 'bg-orange-100 text-orange-700' },
    cette_semaine:    { label: '📅 Cette semaine',  cls: 'bg-yellow-100 text-yellow-700' },
    flexible:         { label: '🌀 Flexible',       cls: 'bg-gray-100 text-gray-600' },
  };
  const u = map[urgency];
  if (!u) return null;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.cls}`}>{u.label}</span>;
}

function HelpTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    demande: { label: '🙋 Demande', cls: 'bg-blue-100 text-blue-700' },
    offre:   { label: '🤝 Offre',   cls: 'bg-green-100 text-green-700' },
    echange: { label: '🔄 Échange', cls: 'bg-purple-100 text-purple-700' },
  };
  const t = map[type];
  if (!t) return null;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    facile:    { label: '🟢 Facile',    cls: 'bg-green-100 text-green-700' },
    moyen:     { label: '🟡 Moyen',     cls: 'bg-yellow-100 text-yellow-700' },
    difficile: { label: '🔴 Difficile', cls: 'bg-red-100 text-red-700' },
  };
  const d = map[difficulty];
  if (!d) return null;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.cls}`}>{d.label}</span>;
}
