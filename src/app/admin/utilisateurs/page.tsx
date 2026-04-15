'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ChevronLeft, Shield, AlertTriangle, UserX, Users,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { adminFetch } from '@/lib/admin-fetch';
import type { AdminUserEntry } from '@/app/api/admin/users/route';
import type { Profile } from '@/types';
import { ROLE_LABELS } from '@/lib/utils';
import toast from 'react-hot-toast';
import ProtectedPage from '@/components/providers/ProtectedPage';
import type { UserWithActivity } from './_components/types';
import UserFilters from './_components/UserFilters';

// Lazy-load heavy card component
const UserCard = dynamic(() => import('./_components/UserCard'), {
  loading: () => <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />,
});

const ROLE_OPTIONS = [
  { value: 'resident', label: '🏘️ Habitant' },
  { value: 'artisan_pending', label: '⏳ Artisan en attente' },
  { value: 'artisan_verified', label: '✅ Artisan vérifié' },
  { value: 'moderator', label: '🛡️ Modérateur' },
];

export default function AdminUtilisateursPage() {
  useAuthStore();
  const [users, setUsers] = useState<UserWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'activity'>('date');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/users');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error('Erreur chargement utilisateurs : ' + (body.error ?? res.statusText));
        setLoading(false);
        return;
      }
      const { users } = (await res.json()) as { users: AdminUserEntry[] };

      const profiles: UserWithActivity[] = users.map(u => ({
        id:              u.id,
        full_name:       u.full_name,
        email:           u.email,
        phone:           u.phone ?? undefined,
        avatar_url:      u.avatar_url ?? undefined,
        role:            u.role as Profile['role'],
        status:          u.status as Profile['status'],
        created_at:      u.created_at,
        artisan_profile: u.artisan_profile ?? undefined,
        _counts: {
          messages:         u.message_count,
          listings:         u.listing_count,
          forum_posts:      u.post_count,
          service_requests: u.request_count,
        },
        updated_at:     u.created_at,
        legal_consent:  false,
        home_sector_id: null,
      }));

      setUsers(profiles);
    } catch (err) {
      toast.error('Erreur réseau : ' + String(err));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const suspendUser = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'suspended' ? 'suspendre' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} ce compte ?`)) return;
    const res = await adminFetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as Profile['status'] } : u));
    toast.success(`Compte ${newStatus === 'suspended' ? 'suspendu' : 'réactivé'}`);
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`⚠️ ATTENTION\n\nSupprimer définitivement le compte de "${name}" ?\n\nCette action est IRRÉVERSIBLE.`)) return;
    if (!window.confirm(`Confirmez-vous la suppression définitive du compte de "${name}" ?`)) return;
    const res = await adminFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur suppression : ' + (data.error ?? res.statusText));
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast.success(`Compte de "${name}" supprimé définitivement`);
  };

  const changeRole = async (userId: string, newRole: string) => {
    const label = ROLE_OPTIONS.find(r => r.value === newRole)?.label || newRole;
    if (!confirm(`Changer le rôle vers "${label}" ?`)) return;
    const res = await adminFetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_role', role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as Profile['role'] } : u));
    toast.success('Rôle mis à jour');
  };

  const resetPassword = async (email: string) => {
    const res = await adminFetch('/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': window.location.origin },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    toast.success(`Email de réinitialisation envoyé à ${email}`);
  };

  // Filtering and sorting
  let filtered = users.filter(u =>
    (!roleFilter || u.role === roleFilter) &&
    (!statusFilter || u.status === statusFilter) &&
    (!search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
    )
  );

  if (sortBy === 'name') filtered = [...filtered].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  if (sortBy === 'activity') filtered = [...filtered].sort((a, b) => {
    const aTotal = Object.values(a._counts || {}).reduce((s, v) => s + v, 0);
    const bTotal = Object.values(b._counts || {}).reduce((s, v) => s + v, 0);
    return bTotal - aTotal;
  });

  const suspended = users.filter(u => u.status === 'suspended').length;
  const artisansPending = users.filter(u => u.role === 'artisan_pending').length;

  return (
    <ProtectedPage adminOnly>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-brand-600" /> Gestion des utilisateurs
            </h1>
            <p className="text-sm text-gray-500">Vision complète de tous les inscrits · Pouvoirs complets</p>
          </div>
        </div>

        {/* Alertes */}
        {(artisansPending > 0 || suspended > 0) && (
          <div className="flex flex-wrap gap-3 mb-6">
            {artisansPending > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                {artisansPending} artisan{artisansPending > 1 ? 's' : ''} en attente de validation
                <Link href="/admin/artisans" className="font-semibold underline">Gérer →</Link>
              </div>
            )}
            {suspended > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-2 rounded-xl text-sm text-red-700">
                <UserX className="w-4 h-4" />
                {suspended} compte{suspended > 1 ? 's' : ''} suspendu{suspended > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <UserFilters
          search={search}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
          sortBy={sortBy}
          totalCount={users.length}
          filteredCount={filtered.length}
          onSearch={setSearch}
          onRoleFilter={setRoleFilter}
          onStatusFilter={setStatusFilter}
          onSortBy={setSortBy}
          onRefresh={fetchUsers}
        />

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Aucun utilisateur trouvé</p>
            <p className="text-sm text-gray-400 mt-1">Modifiez vos filtres de recherche</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(user => (
              <UserCard
                key={user.id}
                user={user}
                onSuspend={suspendUser}
                onDelete={deleteUser}
                onChangeRole={changeRole}
                onResetPassword={resetPassword}
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
