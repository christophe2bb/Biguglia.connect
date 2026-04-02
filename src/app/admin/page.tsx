'use client';

import { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertTriangle, MessageSquare, Package, Wrench, Flag, TrendingUp, Eye } from 'lucide-react';
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
  const [confirmedLocal, setConfirmedLocal] = useState<Record<string, boolean>>({});

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

      // Étape 1 : récupérer tous les profils artisan_pending
      const { data: pendingProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, phone')
        .eq('role', 'artisan_pending')
        .order('created_at', { ascending: true });

      // Étape 2 : pour chaque profil, chercher les données artisan_profiles
      const artisanList: PendingArtisan[] = [];
      for (const prof of (pendingProfiles || [])) {
        const { data: artData } = await supabase
          .from('artisan_profiles')
          .select('id, user_id, business_name, created_at, trade_category:trade_categories(name, icon)')
          .eq('user_id', prof.id)
          .maybeSingle();

        artisanList.push({
          id: artData?.id ?? prof.id,
          user_id: prof.id,
          business_name: artData?.business_name ?? '',
          created_at: artData?.created_at ?? '',
          profile: prof as unknown as Profile,
          trade_category: artData?.trade_category as { name: string; icon: string } | undefined,
        });
      }
      setPendingArtisans(artisanList);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { href: '/admin/stats', label: 'Statistiques', desc: 'Graphiques & activité complète', icon: '📊', highlight: true },
          { href: '/admin/artisans', label: 'Gestion artisans', desc: 'Valider, refuser, suspendre', icon: '⚒️' },
          { href: '/admin/utilisateurs', label: 'Utilisateurs', desc: 'Gérer les comptes', icon: '👥' },
          { href: '/admin/contenu', label: 'Contenu', desc: 'Annonces, forum, avis, matériel', icon: '📋' },
          { href: '/admin/signalements', label: 'Signalements', desc: 'Modérer le contenu', icon: '🚩' },
          { href: '/admin/migration', label: 'Migration DB', desc: 'Tables thèmes (collectionneurs, promenades, événements)', icon: '🗄️', highlight: false },
          { href: '/admin/securite', label: 'Sécurité & Cloudflare', desc: 'Guide Cloudflare WAF, anti-DDoS, headers', icon: '🛡️', highlight: false },
        ].map(({ href, label, desc, icon, highlight }) => (
          <Link key={href} href={href}>
            <div className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition-all cursor-pointer ${highlight ? 'border-brand-300 bg-brand-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className="text-2xl mb-2">{icon}</div>
              <div className={`font-semibold ${highlight ? 'text-brand-700' : 'text-gray-900'}`}>{label}</div>
              <div className="text-sm text-gray-500">{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Artisans en attente */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Artisans en attente de validation
            {(stats?.pending_artisans ?? 0) > 0 && (
              <Badge variant="warning">{stats?.pending_artisans} en attente</Badge>
            )}
          </h2>
          <Link href="/admin/artisans">
            <Button size="sm" className="gap-1.5">
              <Wrench className="w-4 h-4" /> Gérer tous les artisans
            </Button>
          </Link>
        </div>

        {/* Bannière urgente si artisans en attente */}
        {!loading && pendingArtisans.length > 0 && (
          <Link href="/admin/artisans">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-5 mb-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-orange-900 text-lg">
                  {pendingArtisans.length} dossier{pendingArtisans.length > 1 ? 's' : ''} artisan en attente de vérification
                </p>
                <p className="text-sm text-orange-700 mt-0.5">
                  Cliquez pour examiner les documents, valider ou refuser chaque candidature.
                </p>
              </div>
              <div className="flex-shrink-0 bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-xl group-hover:bg-orange-700 transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Traiter maintenant
              </div>
            </div>
          </Link>
        )}

        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : pendingArtisans.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-700 font-medium">Aucune demande en attente ✓</p>
            <p className="text-green-600 text-sm mt-1">Toutes les inscriptions artisan ont été traitées.</p>
            <Link href="/admin/artisans" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-green-700 underline hover:text-green-800">
              Voir les artisans vérifiés →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingArtisans.map(artisan => (
              <div key={artisan.id} className="bg-white rounded-2xl border border-orange-200 p-4 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={artisan.profile?.avatar_url} name={artisan.profile?.full_name || artisan.business_name} size="md" />
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900">{artisan.profile?.full_name || artisan.business_name || 'Artisan'}</div>
                      <div className="text-sm text-gray-600">{(artisan.profile as unknown as { phone?: string })?.phone || artisan.profile?.email || 'Téléphone non renseigné'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {artisan.trade_category?.icon} {artisan.trade_category?.name || 'Catégorie non renseignée'} · {artisan.created_at ? formatRelative(artisan.created_at) : 'Date inconnue'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-green-600"
                        checked={!!confirmedLocal[artisan.user_id]}
                        onChange={e => setConfirmedLocal(prev => ({ ...prev, [artisan.user_id]: e.target.checked }))}
                      />
                      <span className="text-xs font-medium text-gray-700">Artisan de Biguglia ✓</span>
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" onClick={() => rejectArtisan(artisan.user_id)}>
                        Refuser
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveArtisan(artisan.user_id)}
                        disabled={!confirmedLocal[artisan.user_id]}
                      >
                        ✅ Approuver
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Link href="/admin/artisans" className="block text-center text-sm font-semibold text-orange-600 hover:text-orange-700 py-2 border border-dashed border-orange-200 rounded-2xl hover:bg-orange-50 transition-colors">
              Ouvrir la page complète de gestion artisans →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <ProtectedPage adminOnly><AdminContent /></ProtectedPage>;
}
