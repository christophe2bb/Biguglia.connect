'use client';

/**
 * UserTable — Liste des utilisateurs avec lazy-loading des cartes.
 *
 * Reçoit la liste filtrée/triée depuis la page parente et affiche
 * chaque entrée via UserCard (chargée en lazy).
 * Séparation nette : logique de fetch dans page.tsx, rendu ici.
 */

import dynamic from 'next/dynamic';
import { Users } from 'lucide-react';
import type { UserWithActivity } from './types';

// Lazy-load heavy card component
const UserCard = dynamic(() => import('./UserCard'), {
  loading: () => <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />,
});

interface UserTableProps {
  users: UserWithActivity[];
  loading: boolean;
  onSuspend: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  onChangeRole: (id: string, role: string) => void;
  onResetPassword: (email: string) => void;
}

export default function UserTable({
  users,
  loading,
  onSuspend,
  onDelete,
  onChangeRole,
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
    <div className="space-y-3">
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onSuspend={onSuspend}
          onDelete={onDelete}
          onChangeRole={onChangeRole}
          onResetPassword={onResetPassword}
        />
      ))}
    </div>
  );
}
