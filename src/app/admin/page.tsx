'use client';

import { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertTriangle, MessageSquare, Package, Wrench, Flag, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { Profile } from '@/types';
import { formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AdminStats {
  total_users: number;
  pending_artisans: number;
  verified_artisans: number;
  total_listings: number;
  total_forum_posts: number;
  pending_reports: number;
  total_equipment: number;
  total_messages: number;
}

interface PendingArtisan {
  id: string;
  user_id: string;
  business_name: string;
  created_at: string;
  profile?: Profile;
  trade_category?: { name: string; icon: string };
}

function AdminContent() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingArtisans, setPendingArtisans] = useState<PendingArtisan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      const supabase = createClient();
      const [
        { count: totalUsers },
        { count: pendingArtCount },
        { count: verifiedArtCount },
        { count: totalListings },
        { count: totalPosts },
        { count: pendingReports },
        { count: totalEquip },
        { count: totalMsgs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artisan_pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artisan_verified'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('equipment_items').select('*', { count: 'exact', head: true }).eq('is_available', true),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        total_users: totalUsers || 0,
        pending_artisans: pendingArtCount || 0,
        verified_artisans: verifiedArtCount || 0,
        total_listings: totalListings || 0,
        total_forum_posts: totalPosts || 0,
        pending_reports: pendingReports || 0,
        total_equipment: totalEquip || 0,
        total_messages: totalMsgs || 0,
      });

      const { data: pending } = await supabase
        .from('artisan_profiles')
        .select(`id, user_id, business_name, created_at, profile:profiles!artisan_profiles_user_id_fkey(id, full_name, email, avatar_url, role), trade_category:trade_categories(name, icon)`)
        .order('created_at', { ascending: true });

      const filtered = ((pending as unknown as PendingArtisan[]) || [])
        .filter(a => a.profile?.role === 'artisan_pending');
      setPendingArtisans(filtered);
      setLoading(false);
    };
    fetchData();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const approveArtisan = async (artisanUserId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ role: 'artisan_verified', status: 'active' }).eq('id', artisanUserId);
    if (error) { toast.error('Erreur lors de la validation'); return; }
    await supabase.from('notifications').insert({ user_id: artisanUserId, type: 'artisan_approved', title: '✅ Profil artisan validé !', message: 'Votre profil artisan a été validé. Vous êtes maintenant visible sur la plateforme.', link: '/dashboard/artisan' });
    setPendingArtisans(prev => prev.filter(a => a.user_id !== artisanUserId));
    setStats(s => s ? { ...s, pending_artisans: s.pending_artisans - 1, verified_artisans: s.verified_artisans + 1 } : s);
    toast.success('Artisan validé !');
  };

  const rejectArtisan = async (artisanUserId: string) => {
    if (!confirm('Refuser ce profil artisan ?')) return;
    const supabase = createClient();
    await supabase.from('profiles').update({ role: 'resident', status: 'active' }).eq('id', artisanUserId);
    await supabase.from('artisan_profiles').delete().eq('user_id', artisanUserId);
    setPendingArtisans(prev => prev.filter(a => a.user_id !== artisanUserId));
    setStats(s => s ? { ...s, pending_artisans: s.pending_artisans - 1 } : s);
    toast.success('Artisan refusé');
  };

  const statCards = [
    { icon: Users, label: 'Utilisateurs', value: stats?.total_users ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Wrench, label: 'Artisans vérifiés', value: stats?.verified_artisans ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: AlertTriangle, label: 'En attente', value: stats?.pending_artisans ?? 0, color: 'text-orange-600', bg: 'bg-orange-50', highlight: (stats?.pending_artisans ?? 0) > 0 },
    { icon: Package, label: 'Annonces actives', value: stats?.total_listings ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: MessageSquare, label: 'Messages', value: stats?.total_messages ?? 0, color: 'text-brand-600', bg: 'bg-brand-50' },
    { icon: Flag, label: 'Signalements', value: stats?.pending_reports ?? 0, color: 'text-red-600', bg: 'bg-red-50', highlight: (stats?.pending_reports ?? 0) > 0 },
    { icon: TrendingUp, label: 'Posts forum', value: stats?.total_forum_posts ?? 0, color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: CheckCircle, label: 'Matériel dispo', value: stats?.total_equipment ?? 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 text-sm">Tableau de bord — Biguglia Connect</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {statCards.map(({ icon: Icon, label, value, color, bg, highlight }) => (
          <div key={label} className={`bg-white rounded-2xl border ${highlight ? 'border-orange-300 shadow-sm' : 'border-gray-100'} p-5`}>
            <div className={`inline-flex p-2 rounded-xl ${bg} mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Navigation admin */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { href: '/admin/artisans', label: 'Gestion artisans', desc: 'Valider, refuser, suspendre', icon: '⚒️' },
          { href: '/admin/utilisateurs', label: 'Utilisateurs', desc: 'Gérer les comptes', icon: '👥' },
          { href: '/admin/signalements', label: 'Signalements', desc: 'Modérer le contenu', icon: '🚩' },
        ].map(({ href, label, desc, icon }) => (
          <Link key={href} href={href}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="font-semibold text-gray-900">{label}</div>
              <div className="text-sm text-gray-500">{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Artisans en attente */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Artisans en attente de validation
          {(stats?.pending_artisans ?? 0) > 0 && <Badge variant="warning">{stats?.pending_artisans} en attente</Badge>}
        </h2>

        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : pendingArtisans.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-700 font-medium">Aucune demande en attente</p>
            <p className="text-green-600 text-sm">Toutes les inscriptions artisan ont été traitées.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingArtisans.map(artisan => (
              <div key={artisan.id} className="bg-white rounded-2xl border border-orange-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar src={artisan.profile?.avatar_url} name={artisan.profile?.full_name || artisan.business_name} size="lg" />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900">{artisan.business_name}</div>
                      <div className="text-sm text-gray-500">{artisan.profile?.full_name} · {artisan.profile?.email}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {artisan.trade_category?.icon} {artisan.trade_category?.name} · {formatRelative(artisan.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="danger" onClick={() => rejectArtisan(artisan.user_id)}>Refuser</Button>
                    <Button size="sm" onClick={() => approveArtisan(artisan.user_id)}>✅ Valider</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <ProtectedPage adminOnly><AdminContent /></ProtectedPage>;
}
