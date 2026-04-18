'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import type { AdminDashboardStats } from '@/app/api/admin/dashboard/route';

import AdminStatsGrid   from './_components/AdminStatsGrid';
import AdminNavGrid     from './_components/AdminNavGrid';

/** Bannière artisans — chargée après hydratation (peu critique au démarrage). */
const AdminArtisansBanner = dynamic(
  () => import('./_components/AdminArtisansBanner'),
  { ssr: false, loading: () => <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" /> },
);

function AdminContent() {
  const { profile } = useAuthStore();
  const profileId = profile?.id;
  const [stats, setStats]     = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profileId) return;
    try {
      const sb = createClient();
      const [
        { count: totalUsers },
        { count: pendingArt },
        { count: verifiedArt },
        { count: totalListings },
        { count: totalPosts },
        { count: pendingReports },
        { count: totalEquip },
        { count: totalMsgs },
        { count: pendingMod },
      ] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
        sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artisan_pending'),
        sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artisan_verified'),
        sb.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        sb.from('forum_posts').select('*', { count: 'exact', head: true }),
        sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('equipment_items').select('*', { count: 'exact', head: true }).eq('is_available', true),
        sb.from('messages').select('*', { count: 'exact', head: true }),
        sb.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'en_attente_validation'),
      ]);
      setStats({
        total_users:        totalUsers        ?? 0,
        pending_artisans:   pendingArt        ?? 0,
        verified_artisans:  verifiedArt       ?? 0,
        total_listings:     totalListings     ?? 0,
        total_forum_posts:  totalPosts        ?? 0,
        pending_reports:    pendingReports    ?? 0,
        total_equipment:    totalEquip        ?? 0,
        total_messages:     totalMsgs         ?? 0,
        pending_moderation: pendingMod        ?? 0,
      });
    } catch (e) {
      console.warn('[Admin] fetchData error:', e);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Retour au site">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 text-sm">Tableau de bord — Biguglia Connect</p>
        </div>
      </div>

      {/* KPIs */}
      <AdminStatsGrid stats={stats} loading={loading} />

      {/* Navigation */}
      <AdminNavGrid stats={stats} />

      {/* Bannière artisans — lazy */}
      <AdminArtisansBanner stats={stats} />
    </div>
  );
}

export default function AdminPage() {
  return <AdminContent />;
}
