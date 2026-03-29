'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserX, UserCheck, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Select from '@/components/ui/Select';
import { ROLE_LABELS, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminUtilisateursPage() {
  const { profile, isAdmin } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    if (!profile || !isAdmin()) { router.push('/'); return; }
    fetchUsers();
  }, [profile, isAdmin, router]);

  const fetchUsers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  };

  const suspendUser = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'suspended' ? 'suspendre' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} ce compte ?`)) return;

    const supabase = createClient();
    await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as Profile['status'] } : u));
    toast.success(`Compte ${newStatus === 'suspended' ? 'suspendu' : 'réactivé'}`);
  };

  const changeRole = async (userId: string, newRole: string) => {
    const supabase = createClient();
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as Profile['role'] } : u));
    toast.success('Rôle mis à jour');
  };

  const filtered = users.filter(u =>
    (!roleFilter || u.role === roleFilter) &&
    (!search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/admin')} className="text-gray-400 hover:text-gray-600 text-sm">← Admin</button>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:w-48">
          <option value="">Tous les rôles</option>
          <option value="resident">Résidents</option>
          <option value="artisan_pending">Artisans en attente</option>
          <option value="artisan_verified">Artisans vérifiés</option>
          <option value="moderator">Modérateurs</option>
        </Select>
      </div>

      <p className="text-sm text-gray-500 mb-4">{filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(user => (
            <div key={user.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${user.status === 'suspended' ? 'border-red-200 opacity-75' : 'border-gray-100'}`}>
              <Avatar src={user.avatar_url} name={user.full_name || user.email} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{user.full_name || 'Sans nom'}</span>
                  <Badge variant={
                    user.role === 'artisan_verified' ? 'success' :
                    user.role === 'artisan_pending' ? 'warning' :
                    user.role === 'moderator' ? 'purple' : 'default'
                  }>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                  {user.status === 'suspended' && <Badge variant="danger">Suspendu</Badge>}
                </div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="text-xs text-gray-400">Inscrit le {formatDate(user.created_at)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {user.role === 'artisan_pending' && (
                  <Button size="sm" onClick={() => changeRole(user.id, 'artisan_verified')}>
                    ✅ Valider
                  </Button>
                )}
                <button
                  onClick={() => suspendUser(user.id, user.status)}
                  className={`p-2 rounded-lg transition-colors ${user.status === 'suspended' ? 'text-green-600 hover:bg-green-50' : 'text-red-400 hover:bg-red-50'}`}
                  title={user.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                >
                  {user.status === 'suspended' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
