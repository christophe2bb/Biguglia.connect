'use client';

/**
 * /admin/confiance — Tableau de bord admin du système de confiance
 *
 * SÉCURITÉ : données chargées via GET /api/admin/confiance
 * (protégé par getAdminUser — service-role, bypass RLS).
 *
 * Chaque onglet est lazy-chargé via dynamic() pour réduire le bundle initial.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Shield, ArrowLeft, Flag, AlertTriangle, Award, BarChart3,
  Loader2, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { adminFetch } from '@/lib/admin-fetch';
import { cn } from '@/lib/utils';
import type { AdminConfianceData, AdminReviewEntry, AdminRiskMember, AdminThemeStat } from '@/app/api/admin/confiance/route';
import toast from 'react-hot-toast';

// ─── Lazy-loaded tab panels ───────────────────────────────────────────────────
// NOTE: next/dynamic requires options to be inline object literals (webpack static analysis)
const TabSpinner = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-brand-500 mr-2" />
    <span className="text-sm text-gray-400">Chargement…</span>
  </div>
);

const ReportedReviewsTab = dynamic(() => import('./_components/ReportedReviewsTab'), { loading: () => <TabSpinner /> });
const RiskMembersTab     = dynamic(() => import('./_components/RiskMembersTab'),     { loading: () => <TabSpinner /> });
const BadgesTab          = dynamic(() => import('./_components/BadgesTab'),           { loading: () => <TabSpinner /> });
const StatsTab           = dynamic(() => import('./_components/StatsTab'),            { loading: () => <TabSpinner /> });

type TabId = 'reported' | 'risk' | 'badges' | 'stats';

export default function AdminConfiancePage() {
  const { profile } = useAuthStore();
  const [tab,       setTab]       = useState<TabId>('reported');
  const [loading,   setLoading]   = useState(true);
  const [reviews,   setReviews]   = useState<AdminReviewEntry[]>([]);
  const [riskMembers, setRiskMembers] = useState<AdminRiskMember[]>([]);
  const [themeStats,  setThemeStats]  = useState<AdminThemeStat[]>([]);
  const [moderating, setModerating]   = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/confiance');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error('Erreur chargement confiance : ' + (body.error ?? res.statusText));
        return;
      }
      const data = (await res.json()) as AdminConfianceData;
      setReviews(data.reviews);
      setRiskMembers(data.riskMembers);
      setThemeStats(data.themeStats);
    } catch (err) {
      toast.error('Erreur réseau : ' + String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const moderateReview = async (reviewId: string, action: 'visible' | 'hidden' | 'deleted') => {
    setModerating(reviewId);
    const res = await adminFetch(`/api/admin/confiance/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'moderate_review', moderation_status: action }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error('Erreur lors de la modération : ' + (body.error ?? res.statusText));
    } else {
      toast.success(action === 'visible' ? 'Avis restauré' : action === 'hidden' ? 'Avis masqué' : 'Avis supprimé');
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    }
    setModerating(null);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-500">Cette page est réservée aux administrateurs.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 mt-4 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-700">
            <ArrowLeft className="w-4 h-4" /> Tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  const reportedCount = reviews.filter(r => r.moderation_status === 'reported').length;

  const TABS: { id: TabId; label: string; icon: typeof Flag; urgent?: boolean }[] = [
    { id: 'reported', label: `Avis signalés${reportedCount ? ` (${reportedCount})` : ''}`, icon: Flag,          urgent: reportedCount > 0 },
    { id: 'risk',     label: `Membres à risque${riskMembers.length ? ` (${riskMembers.length})` : ''}`, icon: AlertTriangle },
    { id: 'badges',   label: 'Attribuer badges', icon: Award },
    { id: 'stats',    label: 'Statistiques',     icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-black text-gray-900">Confiance &amp; Réputation</h1>
              <p className="text-xs text-gray-500">Modération des avis, membres à risque, badges</p>
            </div>
            <button
              onClick={load}
              aria-label="Actualiser"
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} aria-hidden="true" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border',
                    tab === t.id
                      ? t.urgent ? 'bg-red-50 text-red-700 border-red-300' : 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <>
            {tab === 'reported' && (
              <ReportedReviewsTab
                reviews={reviews}
                moderating={moderating}
                onModerate={moderateReview}
              />
            )}
            {tab === 'risk' && (
              <RiskMembersTab members={riskMembers} />
            )}
            {tab === 'badges' && (
              <BadgesTab />
            )}
            {tab === 'stats' && (
              <StatsTab
                reviews={reviews}
                riskMembers={riskMembers}
                themeStats={themeStats}
                moderating={moderating}
                onModerate={moderateReview}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
