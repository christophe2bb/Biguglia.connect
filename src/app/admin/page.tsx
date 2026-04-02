'use client';

import { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertTriangle, MessageSquare, Package, Wrench, Flag, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';
import ProtectedPage from '@/components/providers/ProtectedPage';

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


function AdminContent() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
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

      setLoading(false);
    };
    fetchData();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Artisans en attente — lien direct vers la page de gestion */}
      <Link href="/admin/artisans">
        <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group ${
          (stats?.pending_artisans ?? 0) > 0
            ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${
            (stats?.pending_artisans ?? 0) > 0 ? 'bg-orange-100' : 'bg-green-100'
          }`}>
            {(stats?.pending_artisans ?? 0) > 0
              ? <AlertTriangle className="w-6 h-6 text-orange-600" />
              : <CheckCircle className="w-6 h-6 text-green-600" />
            }
          </div>
          <div className="flex-1">
            {(stats?.pending_artisans ?? 0) > 0 ? (
              <>
                <p className="font-bold text-orange-900 text-base">
                  {stats?.pending_artisans} dossier{(stats?.pending_artisans ?? 0) > 1 ? 's' : ''} artisan en attente
                </p>
                <p className="text-sm text-orange-700 mt-0.5">
                  Cliquez pour ouvrir la page de gestion et valider les profils.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-green-800 text-base">Aucune demande artisan en attente ✓</p>
                <p className="text-sm text-green-600 mt-0.5">Cliquez pour gérer les artisans vérifiés.</p>
              </>
            )}
          </div>
          <div className={`flex-shrink-0 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            (stats?.pending_artisans ?? 0) > 0
              ? 'bg-orange-600 group-hover:bg-orange-700'
              : 'bg-green-600 group-hover:bg-green-700'
          }`}>
            <Wrench className="w-4 h-4" /> Gérer les artisans
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function AdminPage() {
  return <ProtectedPage adminOnly><AdminContent /></ProtectedPage>;
}
