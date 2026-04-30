'use client';

/**
 * UserTable — Liste des utilisateurs avec lazy-loading des cartes et pagination.
 *
 * Passe onSelect à UserCard : le bouton "Détails" dans la carte ouvre directement
 * le UserDrawer sans wrapper div clickable (qui causait la double ouverture).
 */

import dynamic from 'next/dynamic';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserWithActivity } from './types';

// Lazy-load heavy card component
const UserCard = dynamic(() => import('./UserCard'), {
  loading: () => <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />,
});

interface UserTableProps {
  users: UserWithActivity[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSelect: (user: UserWithActivity) => void;
  onSuspend: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  onChangeRole: (id: string, role: string) => void;
  onResetPassword: (email: string) => void;
}

export default function UserTable({
  users,
  loading,
  page,
  totalPages,
  onPageChange,
  onSelect,
  onSuspend,
  onDelete,
  onResetPassword,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="font-medium text-gray-600">Aucun utilisateur trouvé</p>
        <p className="text-sm text-gray-400 mt-1">Modifiez vos filtres de recherche</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {users.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onSelect={onSelect}
            onSuspend={onSuspend}
            onDelete={onDelete}
            onResetPassword={onResetPassword}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
