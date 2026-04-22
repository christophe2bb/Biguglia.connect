'use client';

/**
 * UserDrawer — Panneau latéral de détails utilisateur (lazy-loaded).
 *
 * Affiché quand l'admin clique sur "Voir détails" dans UserCard.
 * Chargé en lazy depuis page.tsx via dynamic() pour ne pas alourdir
 * le bundle initial de la page admin utilisateurs.
 *
 * Usage:
 *   const UserDrawer = dynamic(() => import('./_components/UserDrawer'));
 *   <UserDrawer user={selectedUser} onClose={() => setSelected(null)} ... />
 */

import { useEffect, useRef, useId } from 'react';
import Link from 'next/link';
import {
  X, Mail, Phone, Crown, Eye,
  HardHat, Users, UserX, UserCheck, Trash2,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { ROLE_LABELS, formatDate, formatRelative } from '@/lib/utils';
import type { UserWithActivity } from './types';

const ROLE_OPTIONS = [
  { value: 'resident',         label: '🏘️ Habitant',           color: 'text-blue-700',   bg: 'bg-blue-50' },
  { value: 'artisan_pending',  label: '⏳ Artisan en attente',  color: 'text-amber-700',  bg: 'bg-amber-50' },
  { value: 'artisan_verified', label: '✅ Artisan vérifié',     color: 'text-green-700',  bg: 'bg-green-50' },
  { value: 'moderator',        label: '🛡️ Modérateur',          color: 'text-purple-700', bg: 'bg-purple-50' },
];

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
  const overlayRef  = useRef<HTMLDivElement>(null);
  const drawerRef   = useRef<HTMLElement>(null);
  const triggerRef  = useRef<Element | null>(null);
  const titleId     = useId();
  const isSuspended = user.status === 'suspended';
  const isArtisan   = user.role === 'artisan_verified' || user.role === 'artisan_pending';

  // Fermer sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus management + scroll lock
  useEffect(() => {
    triggerRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    // Move focus into drawer on next tick
    const frame = requestAnimationFrame(() => { drawerRef.current?.focus(); });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = '';
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, []);

  const roleBadgeVariant = () => {
    if (user.role === 'artisan_verified') return 'success';
    if (user.role === 'artisan_pending')  return 'warning';
    if (user.role === 'moderator')        return 'purple';
    return 'default';
  };

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* Panneau */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden outline-none"
      >

        {/* En-tête */}
        <div className="flex items-center gap-4 p-5 border-b border-gray-100">
          <Avatar src={user.avatar_url} name={user.full_name || user.email} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span id={titleId} className="font-bold text-gray-900 text-lg truncate">
                {user.full_name || 'Sans nom'}
              </span>
              <Badge variant={roleBadgeVariant()}>{ROLE_LABELS[user.role]}</Badge>
              {isSuspended && <Badge variant="danger">Suspendu</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <a href={`mailto:${user.email}`} className="flex items-center gap-1 hover:text-brand-600">
                <Mail className="w-3 h-3" /> {user.email}
              </a>
              {user.phone && (
                <a href={`tel:${user.phone}`} className="flex items-center gap-1 hover:text-brand-600">
                  <Phone className="w-3 h-3" /> {user.phone}
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors flex-shrink-0"
            aria-label="Fermer le panneau utilisateur"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Modifier le rôle */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Modifier le rôle
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onChangeRole(user.id, opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border-2 transition-colors text-left ${
                    user.role === opt.value
                      ? `${opt.bg} ${opt.color} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Informations complètes */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Informations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                { label: 'ID utilisateur',       value: <span className="font-mono text-xs truncate">{user.id}</span> },
                { label: 'Statut compte',         value: <span className="capitalize font-medium">{user.status}</span> },
                { label: 'Inscription',           value: formatDate(user.created_at) },
                { label: 'Dernière mise à jour',  value: formatRelative(user.updated_at) },
                { label: 'CGU acceptées',         value: user.legal_consent ? `✅ Oui${user.legal_consent_at ? ` · ${formatDate(user.legal_consent_at)}` : ''}` : '❌ Non' },
                { label: 'Téléphone',             value: user.phone || 'Non renseigné' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                  <span className="text-xs text-gray-400 block mb-0.5">{label}</span>
                  <div className="font-medium text-gray-800 text-xs">{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Compteurs d'activité */}
          {user._counts && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Activité</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Messages',  value: user._counts.messages },
                  { label: 'Annonces',  value: user._counts.listings },
                  { label: 'Forum',     value: user._counts.forum_posts },
                  { label: 'Demandes',  value: user._counts.service_requests },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2 text-center">
                    <div className="text-2xl font-black text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Profil artisan */}
          {isArtisan && user.artisan_profile && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5" /> Profil artisan
              </h3>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  {user.artisan_profile.artisan_type === 'professionnel'
                    ? <HardHat className="w-4 h-4 text-blue-500" />
                    : <Users className="w-4 h-4 text-green-500" />
                  }
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{user.artisan_profile.business_name}</span>
                    <div className="text-xs text-gray-500">
                      {user.artisan_profile.trade_category?.icon} {user.artisan_profile.trade_category?.name}
                    </div>
                  </div>
                </div>
                <Link href="/admin/artisans" className="text-xs text-brand-600 hover:underline">
                  Gérer →
                </Link>
              </div>
            </section>
          )}
        </div>

        {/* Pied fixe : actions */}
        <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => onSuspend(user.id, user.status)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isSuspended
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              {isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
              {isSuspended ? 'Réactiver' : 'Suspendre'}
            </button>
            <button
              onClick={() => onResetPassword(user.email)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Mail className="w-4 h-4" /> Réinit. MDP
            </button>
          </div>
          <button
            onClick={() => { onDelete(user.id, user.full_name || user.email); onClose(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-200"
          >
            <Trash2 className="w-4 h-4" /> Supprimer définitivement
          </button>
        </div>
      </aside>
    </>
  );
}
