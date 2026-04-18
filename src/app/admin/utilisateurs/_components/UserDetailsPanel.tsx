'use client';

/**
 * UserDetailsPanel — section dépliable du UserCard.
 * Chargé dynamiquement (lazy) : téléchargé seulement quand l'admin ouvre les détails.
 *
 * Contient :
 *  - Sélecteur de rôle
 *  - Informations complètes (ID, statut, dates, CGU, téléphone)
 *  - Profil artisan (si applicable)
 *  - Actions destructives (suspendre, réinitialiser MDP, supprimer)
 */

import Link from 'next/link';
import {
  UserX, UserCheck, Trash2, Mail,
  Crown, Eye, HardHat,
} from 'lucide-react';
import { ROLE_LABELS, formatDate, formatRelative } from '@/lib/utils';
import type { UserWithActivity } from './types';

const ROLE_OPTIONS = [
  { value: 'resident',         label: '🏘️ Habitant',            color: 'text-blue-700',   bg: 'bg-blue-50'   },
  { value: 'artisan_pending',  label: '⏳ Artisan en attente',   color: 'text-amber-700',  bg: 'bg-amber-50'  },
  { value: 'artisan_verified', label: '✅ Artisan vérifié',      color: 'text-green-700',  bg: 'bg-green-50'  },
  { value: 'moderator',        label: '🛡️ Modérateur',          color: 'text-purple-700', bg: 'bg-purple-50' },
];

interface UserDetailsPanelProps {
  user: UserWithActivity;
  onSuspend:       (id: string, status: string) => void;
  onDelete:        (id: string, name: string)   => void;
  onChangeRole:    (id: string, role: string)   => void;
  onResetPassword: (email: string)              => void;
}

export default function UserDetailsPanel({
  user, onSuspend, onDelete, onChangeRole, onResetPassword,
}: UserDetailsPanelProps) {
  const isSuspended = user.status === 'suspended';
  const isArtisan   = user.role === 'artisan_verified' || user.role === 'artisan_pending';

  return (
    <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-5">

      {/* Changement de rôle */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5" /> Modifier le rôle
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChangeRole(user.id, opt.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all text-left ${
                user.role === opt.value
                  ? `${opt.bg} ${opt.color} border-current`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Infos complètes */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Informations complètes
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <span className="text-xs text-gray-400">ID utilisateur</span>
            <div className="font-mono text-xs text-gray-600 truncate">{user.id}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <span className="text-xs text-gray-400">Statut compte</span>
            <div className="font-medium text-gray-800 capitalize">{user.status}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <span className="text-xs text-gray-400">Date d&apos;inscription</span>
            <div className="font-medium text-gray-800">{formatDate(user.created_at)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <span className="text-xs text-gray-400">Dernière mise à jour</span>
            <div className="font-medium text-gray-800">{formatRelative(user.updated_at)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <span className="text-xs text-gray-400">CGU acceptées</span>
            <div className="font-medium text-gray-800">
              {user.legal_consent
                ? `✅ Oui${user.legal_consent_at ? ` · ${formatDate(user.legal_consent_at)}` : ''}`
                : '❌ Non'}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
            <span className="text-xs text-gray-400">Téléphone</span>
            <div className="font-medium text-gray-800">{user.phone || 'Non renseigné'}</div>
          </div>
        </div>
      </div>

      {/* Profil artisan */}
      {isArtisan && user.artisan_profile && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <HardHat className="w-3.5 h-3.5" /> Profil artisan
          </h4>
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
            <div>
              <span className="font-medium text-gray-900">{user.artisan_profile.business_name}</span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-sm text-gray-500">
                {user.artisan_profile.trade_category?.icon} {user.artisan_profile.trade_category?.name}
              </span>
            </div>
            <Link href="/admin/artisans" className="text-xs text-brand-600 hover:underline">
              Gérer le dossier →
            </Link>
          </div>
        </div>
      )}

      {/* Actions destructives */}
      <div className="border-t border-gray-200 pt-4 flex flex-wrap gap-3">
        <button
          onClick={() => onSuspend(user.id, user.status)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            isSuspended
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          {isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
          {isSuspended ? 'Réactiver ce compte' : 'Suspendre ce compte'}
        </button>
        <button
          onClick={() => onResetPassword(user.email)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Mail className="w-4 h-4" /> Envoyer réinitialisation MDP
        </button>
        <button
          onClick={() => onDelete(user.id, user.full_name || user.email)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors ml-auto"
        >
          <Trash2 className="w-4 h-4" /> Supprimer définitivement
        </button>
      </div>
    </div>
  );
}
