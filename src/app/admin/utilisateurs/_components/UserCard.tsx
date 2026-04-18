'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Mail, Calendar, Phone,
  ChevronDown, ChevronUp,
  HardHat, Users,
  MessageSquare, Package, FileText, Wrench,
  MoreVertical, UserX, UserCheck, Trash2,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { ROLE_LABELS, formatDate } from '@/lib/utils';
import type { UserWithActivity } from './types';

/** Section dépliable avec rôle, infos complètes et actions — chargée en lazy. */
const UserDetailsPanel = dynamic(() => import('./UserDetailsPanel'), {
  loading: () => (
    <div className="border-t border-gray-100 p-5 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  ),
});

const ROLE_OPTIONS = [
  { value: 'resident',         label: '🏘️ Habitant',           color: 'text-blue-700',   bg: 'bg-blue-50'   },
  { value: 'artisan_pending',  label: '⏳ Artisan en attente',  color: 'text-amber-700',  bg: 'bg-amber-50'  },
  { value: 'artisan_verified', label: '✅ Artisan vérifié',     color: 'text-green-700',  bg: 'bg-green-50'  },
  { value: 'moderator',        label: '🛡️ Modérateur',         color: 'text-purple-700', bg: 'bg-purple-50' },
];

interface UserCardProps {
  user:            UserWithActivity;
  onSuspend:       (id: string, status: string) => void;
  onDelete:        (id: string, name: string)   => void;
  onChangeRole:    (id: string, role: string)   => void;
  onResetPassword: (email: string)              => void;
}

export default function UserCard({
  user, onSuspend, onDelete, onChangeRole, onResetPassword,
}: UserCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isSuspended = user.status === 'suspended';
  const isArtisan   = user.role === 'artisan_verified' || user.role === 'artisan_pending';

  const roleBadgeVariant = () => {
    if (user.role === 'artisan_verified') return 'success';
    if (user.role === 'artisan_pending')  return 'warning';
    if (user.role === 'moderator')        return 'purple';
    return 'default';
  };

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
      isSuspended                         ? 'border-red-200 opacity-80'  :
      user.role === 'artisan_pending'     ? 'border-amber-200'           :
      user.role === 'artisan_verified'    ? 'border-green-200'           :
      'border-gray-100'
    }`}>

      {/* ── Header ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar src={user.avatar_url} name={user.full_name || user.email} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-900">{user.full_name || 'Sans nom'}</span>
              <Badge variant={roleBadgeVariant()}>{ROLE_LABELS[user.role]}</Badge>
              {isSuspended && <Badge variant="danger">Suspendu</Badge>}
              {user.legal_consent && (
                <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ CGU acceptées</span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <a href={`mailto:${user.email}`} className="hover:text-brand-600 hover:underline">{user.email}</a>
              </span>
              {user.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <a href={`tel:${user.phone}`} className="hover:text-brand-600">{user.phone}</a>
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

          {/* Actions rapides */}
          <div className="flex items-center gap-2 flex-shrink-0 relative">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Détails
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-xl shadow-lg w-52 py-1 text-sm">
                <button
                  onClick={() => { onSuspend(user.id, user.status); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors ${isSuspended ? 'text-green-600' : 'text-red-600'}`}
                >
                  {isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  {isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                </button>
                <button
                  onClick={() => { onResetPassword(user.email); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700"
                >
                  <Mail className="w-4 h-4" /> Envoyer réinit. MDP
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { onDelete(user.id, user.full_name || user.email); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer définitivement
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compteurs d'activité */}
        {user._counts && (
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { icon: MessageSquare, label: 'Messages',  val: user._counts.messages,        color: 'text-brand-600'  },
              { icon: Package,       label: 'Annonces',  val: user._counts.listings,         color: 'text-purple-600' },
              { icon: FileText,      label: 'Posts forum',val: user._counts.forum_posts,     color: 'text-teal-600'   },
              { icon: Wrench,        label: 'Demandes',  val: user._counts.service_requests, color: 'text-indigo-600' },
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

      {/* ── Détails dépliables (chargés en lazy) ── */}
      {expanded && (
        <UserDetailsPanel
          user={user}
          onSuspend={onSuspend}
          onDelete={onDelete}
          onChangeRole={onChangeRole}
          onResetPassword={onResetPassword}
        />
      )}
    </div>
  );
}
