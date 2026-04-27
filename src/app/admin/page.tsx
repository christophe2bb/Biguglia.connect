'use client';

/**
 * src/app/admin/page.tsx — Tableau de bord admin
 *
 * SÉCURITÉ :
 *  • Le layout admin (admin/layout.tsx) exécute verifyAdminLayout() côté
 *    serveur avant tout rendu : JWT validé + rôle admin/moderator vérifié.
 *    Un non-admin ne charge jamais cette page.
 *
 *  • Les données de synthèse (compteurs) sont désormais lues via
 *    GET /api/admin/dashboard, qui refait la vérification JWT + rôle côté
 *    serveur et exécute les COUNT en service-role (bypass RLS).
 *
 *    Avant ce fix, admin/page.tsx appelait createClient() (anon key) directement
 *    depuis le navigateur pour faire 9 requêtes SELECT count. Cela exposait des
 *    agrégats sensibles (total messages, file modération…) à toute personne
 *    capable de rejouer la requête avec la clé publique.
 */

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { AdminDashboardStats } from '@/app/api/admin/dashboard/route';

import AdminStatsGrid from './_components/AdminStatsGrid';
import AdminNavGrid   from './_components/AdminNavGrid';

/** Bannière artisans — chargée après hydratation (peu critique au démarrage). */
const AdminArtisansBanner = dynamic(
  () => import('./_components/AdminArtisansBanner'),
  { ssr: false, loading: () => <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" /> },
);

function AdminContent() {
  const [stats, setStats]   = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
      if (!res.ok) {
        console.warn('[Admin] /api/admin/dashboard →', res.status);
        return;
      }
      const json = await res.json() as { stats: AdminDashboardStats };
      setStats(json.stats);
    } catch (e) {
      console.warn('[Admin] fetchData error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

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
