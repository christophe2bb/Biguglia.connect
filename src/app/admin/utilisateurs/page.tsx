'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, UserX, UserCheck, Trash2, ChevronLeft,
  Shield, Phone, Mail, Calendar, Eye, ChevronDown,
  ChevronUp, AlertTriangle, Crown, Wrench, Users,
  HardHat, MessageSquare, Package, FileText, MoreVertical,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { adminFetch } from '@/lib/admin-fetch';
import { Profile } from '@/types';
import type { AdminUserEntry } from '@/app/api/admin/users/route';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Select from '@/components/ui/Select';
import { ROLE_LABELS, formatDate, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';
import ProtectedPage from '@/components/providers/ProtectedPage';

/**
 * UserWithActivity : aligné sur AdminUserEntry (GET /api/admin/users).
 * On conserve les champs Profile utilisés dans l'UI (email, phone, role, status…)
 * et on ajoute les compteurs d'activité retournés par la route serveur.
 */
interface UserWithActivity extends Profile {
  artisan_profile?: AdminUserEntry['artisan_profile'];
  _counts?: {
    messages: number;
    listings: number;
    forum_posts: number;
    service_requests: number;
  };
}

const ROLE_OPTIONS = [
  { value: 'resident', label: '🏘️ Habitant', color: 'text-blue-700', bg: 'bg-blue-50' },
  { value: 'artisan_pending', label: '⏳ Artisan en attente', color: 'text-amber-700', bg: 'bg-amber-50' },
  { value: 'artisan_verified', label: '✅ Artisan vérifié', color: 'text-green-700', bg: 'bg-green-50' },
  { value: 'moderator', label: '🛡️ Modérateur', color: 'text-purple-700', bg: 'bg-purple-50' },
];

function UserCard({
  user, onSuspend, onDelete, onChangeRole, onResetPassword,
}: {
  user: UserWithActivity;
  onSuspend: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  onChangeRole: (id: string, role: string) => void;
  onResetPassword: (email: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isSuspended = user.status === 'suspended';
  const isArtisan = user.role === 'artisan_verified' || user.role === 'artisan_pending';

  const roleBadgeVariant = () => {
    if (user.role === 'artisan_verified') return 'success';
    if (user.role === 'artisan_pending') return 'warning';
    if (user.role === 'moderator') return 'purple';
    return 'default';
  };

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
      isSuspended ? 'border-red-200 opacity-80' :
      user.role === 'artisan_pending' ? 'border-amber-200' :
      user.role === 'artisan_verified' ? 'border-green-200' :
      'border-gray-100'
    }`}>
      {/* Header */}
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
                  : <Users className="w-3 h-3 text-green-500" />
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
              { icon: MessageSquare, label: 'Messages', val: user._counts.messages, color: 'text-brand-600' },
              { icon: Package, label: 'Annonces', val: user._counts.listings, color: 'text-purple-600' },
              { icon: FileText, label: 'Posts forum', val: user._counts.forum_posts, color: 'text-teal-600' },
              { icon: Wrench, label: 'Demandes', val: user._counts.service_requests, color: 'text-indigo-600' },
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

      {/* Détails dépliables */}
      {expanded && (
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
                <span className="text-xs text-gray-400">Date d'inscription</span>
                <div className="font-medium text-gray-800">{formatDate(user.created_at)}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-400">Dernière mise à jour</span>
                <div className="font-medium text-gray-800">{formatRelative(user.updated_at)}</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-400">CGU acceptées</span>
                <div className="font-medium text-gray-800">
                  {user.legal_consent ? `✅ Oui${user.legal_consent_at ? ` · ${formatDate(user.legal_consent_at)}` : ''}` : '❌ Non'}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-400">Téléphone</span>
                <div className="font-medium text-gray-800">{user.phone || 'Non renseigné'}</div>
              </div>
            </div>
          </div>

          {/* Artisan profil */}
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
                <Link
                  href={`/admin/artisans`}
                  className="text-xs text-brand-600 hover:underline"
                >
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
      )}
    </div>
  );
}

export default function AdminUtilisateursPage() {
  const { profile, isAdmin } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'activity'>('date');

  /**
   * fetchUsers — lecture des utilisateurs via GET /api/admin/users
   *
   * Avant ce correctif, la page interrogeait directement `createClient()` avec
   * la clé anon. La protection reposait uniquement sur la RLS Supabase.
   * La route serveur utilise getAdminUser() + createAdminClient() (service role)
   * pour garantir que seuls les admins/modérateurs accèdent aux données PII.
   */
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

      // Convertir AdminUserEntry → UserWithActivity (même forme, juste renommage _counts)
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
        // Champs Profile non retournés par l'API — valeurs par défaut
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
    if (!profile || !isAdmin()) { router.push('/'); return; }
    fetchUsers();
  }, [profile, isAdmin, router, fetchUsers]);

  const suspendUser = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'suspended' ? 'suspendre' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} ce compte ?`)) return;
    const res = await fetch(`/api/admin/users/${userId}`, {
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
    const confirm1 = window.confirm(`⚠️ ATTENTION\n\nSupprimer définitivement le compte de "${name}" ?\n\nCette action est IRRÉVERSIBLE. Toutes ses données (annonces, messages, posts) seront supprimées.`);
    if (!confirm1) return;
    const confirm2 = window.confirm(`Confirmez-vous la suppression définitive du compte de "${name}" ?`);
    if (!confirm2) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
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
    const res = await fetch(`/api/admin/users/${userId}`, {
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

  /**
   * resetPassword — envoi de l'email de réinitialisation via POST /api/admin/users/reset-password
   *
   * Avant ce correctif, cette action appelait directement
   * supabase.auth.resetPasswordForEmail() depuis le navigateur avec la clé anon.
   * N'importe quelle personne pouvant rejouer la requête pouvait déclencher
   * des emails de reset sans contrôle de rôle.
   *
   * Correction : la requête passe maintenant par l'API Route
   * /api/admin/users/reset-password qui vérifie que l'acteur est bien admin
   * et effectue le reset via le client service-role (Supabase Auth Admin API).
   */
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

  // Filtrage et tri
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

  if (!profile || !isAdmin()) return null;

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

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:w-48">
          <option value="">Tous les rôles</option>
          <option value="resident">Habitants</option>
          <option value="artisan_pending">Artisans en attente</option>
          <option value="artisan_verified">Artisans vérifiés</option>
          <option value="moderator">Modérateurs</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="sm:w-44">
          <option value="date">Tri : Plus récent</option>
          <option value="name">Tri : Nom A→Z</option>
          <option value="activity">Tri : + actifs</option>
        </Select>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{filtered.length}</span> utilisateur{filtered.length !== 1 ? 's' : ''}
          {search || roleFilter || statusFilter ? ` (filtré sur ${users.length})` : ' au total'}
        </p>
        <button onClick={fetchUsers} className="text-xs text-brand-600 hover:underline">Actualiser</button>
      </div>

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