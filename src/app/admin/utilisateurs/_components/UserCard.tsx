'use client';

/**
 * UserCard — Carte utilisateur dans la liste admin.
 *
 * • Bouton "Détails" → appelle onSelect(user) pour ouvrir le UserDrawer (panneau latéral)
 * • Menu "···" → actions rapides (suspendre, MDP, supprimer) avec confirmation intégrée
 *
 * Le UserDetailsPanel inline a été SUPPRIMÉ : il créait une superposition avec le UserDrawer
 * quand les deux s'ouvraient simultanément. Toutes les actions détaillées sont dans le Drawer.
 */

import { useState, useRef, useEffect } from 'react';
import {
  Mail, Calendar, Phone,
  HardHat, Users,
  MessageSquare, Package, FileText, Wrench,
  MoreVertical, UserX, UserCheck, Trash2, Eye,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { ROLE_LABELS, formatDate } from '@/lib/utils';
import type { UserWithActivity } from './types';

interface UserCardProps {
  user:            UserWithActivity;
  onSelect:        (user: UserWithActivity) => void;
  onSuspend:       (id: string, status: string) => Promise<void> | void;
  onDelete:        (id: string, name: string)   => Promise<void> | void;
  onResetPassword: (email: string)              => Promise<void> | void;
}

export default function UserCard({
  user, onSelect, onSuspend, onDelete, onResetPassword,
}: UserCardProps) {
  const [menuOpen, setMenuOpen]           = useState(false);
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'delete' | null>(null);
  const menuRef                           = useRef<HTMLDivElement>(null);

  const isSuspended = user.status === 'suspended';
  const isArtisan   = user.role === 'artisan_verified' || user.role === 'artisan_pending';

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const roleBadgeVariant = () => {
    if (user.role === 'artisan_verified') return 'success'  as const;
    if (user.role === 'artisan_pending')  return 'warning'  as const;
    if (user.role === 'moderator')        return 'purple'   as const;
    return 'default' as const;
  };

  const handleSuspend = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmAction('suspend');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmAction('delete');
  };

  const handleResetPassword = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onResetPassword(user.email);
  };

  const confirmSuspend = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction(null);
    onSuspend(user.id, user.status);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction(null);
    onDelete(user.id, user.full_name || user.email);
  };

  const cancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction(null);
  };

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-visible transition-colors ${
      isSuspended                      ? 'border-red-200 opacity-80'  :
      user.role === 'artisan_pending'  ? 'border-amber-200'           :
      user.role === 'artisan_verified' ? 'border-green-200'           :
      'border-gray-100'
    }`}>

      {/* ── Bannière de confirmation (suspend/delete) ── */}
      {confirmAction && (
        <div
          role="presentation"
          className={`px-5 py-3 flex items-center justify-between gap-3 text-sm font-medium rounded-t-2xl ${
            confirmAction === 'delete'
              ? 'bg-red-50 text-red-700 border-b border-red-200'
              : 'bg-amber-50 text-amber-700 border-b border-amber-200'
          }`}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          <span>
            {confirmAction === 'delete'
              ? `⚠️ Supprimer définitivement "${user.full_name || user.email}" ?`
              : isSuspended
                ? `Réactiver le compte de "${user.full_name || user.email}" ?`
                : `Suspendre le compte de "${user.full_name || user.email}" ?`
            }
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={cancelConfirm}
              className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-xs"
            >
              Annuler
            </button>
            <button
              onClick={confirmAction === 'delete' ? confirmDelete : confirmSuspend}
              className={`px-3 py-1 rounded-lg text-white text-xs transition-colors ${
                confirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              Confirmer
            </button>
          </div>
        </div>
      )}

      {/* ── Corps de la carte ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar src={user.avatar_url} name={user.full_name || user.email} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-900">{user.full_name || 'Sans nom'}</span>
              <Badge variant={roleBadgeVariant()}>{ROLE_LABELS[user.role]}</Badge>
              {isSuspended && <Badge variant="danger">Suspendu</Badge>}
              {user.legal_consent && (
                <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  ✓ CGU acceptées
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <a
                  href={`mailto:${user.email}`}
                  onClick={e => e.stopPropagation()}
                  className="hover:text-brand-600 hover:underline"
                >
                  {user.email}
                </a>
              </span>
              {user.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <a
                    href={`tel:${user.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="hover:text-brand-600"
                  >
                    {user.phone}
                  </a>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Inscrit le {formatDate(user.created_at)}
              </span>
            </div>

            {isArtisan && user.artisan_profile && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1 inline-flex items-center gap-1.5 mt-1">
                {user.artisan_profile.artisan_type === 'professionnel'
                  ? <HardHat className="w-3 h-3 text-blue-500" />
                  : <Users   className="w-3 h-3 text-green-500" />
                }
                {user.artisan_profile.trade_category?.icon} {user.artisan_profile.trade_category?.name}
                {' — '}
                <span className="font-medium">{user.artisan_profile.business_name}</span>
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Bouton Détails → ouvre le Drawer */}
            <button
              onClick={e => { e.stopPropagation(); onSelect(user); }}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors border border-brand-200"
            >
              <Eye className="w-3.5 h-3.5" /> Détails
            </button>

            {/* Menu ··· actions rapides */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Actions rapides"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {menuOpen && (
                <div
                  role="presentation"
                  className="absolute right-0 top-9 z-[200] bg-white border border-gray-200 rounded-xl shadow-xl w-56 py-1 text-sm"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                >
                  <button
                    onClick={handleSuspend}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                      isSuspended ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {isSuspended
                      ? <><UserCheck className="w-4 h-4" /> Réactiver le compte</>
                      : <><UserX     className="w-4 h-4" /> Suspendre le compte</>
                    }
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    <Mail className="w-4 h-4" /> Envoyer réinit. MDP
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer définitivement
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compteurs d'activité */}
        {user._counts && (
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { icon: MessageSquare, label: 'Messages',    val: user._counts.messages,         color: 'text-brand-600'  },
              { icon: Package,       label: 'Annonces',    val: user._counts.listings,          color: 'text-purple-600' },
              { icon: FileText,      label: 'Posts forum', val: user._counts.forum_posts,       color: 'text-teal-600'   },
              { icon: Wrench,        label: 'Demandes',    val: user._counts.service_requests,  color: 'text-indigo-600' },
            ].map(({ icon: Icon, label, val, color }) => (
              <div key={label} className="flex items-center gap-1 text-xs text-gray-500">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="font-semibold text-gray-700">{val}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
