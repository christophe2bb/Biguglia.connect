'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flag, Loader2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import type { AdminReportsData, ReportEntry } from '@/app/api/admin/reports/route';
import toast from 'react-hot-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { adminFetch } from '@/lib/admin-fetch';

import SignalementStats   from './_components/SignalementStats';
import SignalementFilters from './_components/SignalementFilters';

// Lazy-load the heavy row component
const SignalementRow = dynamic(() => import('./_components/SignalementRow'), {
  loading: () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      </div>
    </div>
  ),
});

type FilterStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'all';

export default function AdminSignalementsPage() {
  useAuthStore();

  const [reports,      setReports]      = useState<ReportEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterType,   setFilterType]   = useState('all');
  const [processing,   setProcessing]   = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, reviewed: 0, resolved: 0, dismissed: 0, total: 0 });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterType   !== 'all') params.set('target_type', filterType);
      const res = await adminFetch(`/api/admin/reports?${params.toString()}`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json() as AdminReportsData;
      setReports(data.reports);
      setStats({
        pending:   data.counts.pending,
        reviewed:  data.counts.reviewed,
        resolved:  data.counts.resolved,
        dismissed: data.counts.dismissed,
        total:     data.counts.total,
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updateReport = async (reportId: string, status: 'resolved' | 'dismissed' | 'reviewed') => {
    setProcessing(reportId);
    const res = await adminFetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_status', status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      setProcessing(null);
      return;
    }
    toast.success(
      status === 'resolved'  ? '✅ Signalement résolu' :
      status === 'dismissed' ? '🚫 Signalement ignoré' : '👀 Marqué en cours d\'examen'
    );
    setReports(prev =>
      filterStatus === 'all'
        ? prev.map(r => r.id === reportId ? { ...r, status } : r)
        : prev.filter(r => r.id !== reportId)
    );
    setStats(s => ({
      ...s,
      pending:   Math.max(0, s.pending - 1),
      resolved:  status === 'resolved'  ? s.resolved  + 1 : s.resolved,
      dismissed: status === 'dismissed' ? s.dismissed + 1 : s.dismissed,
    }));
    setProcessing(null);
  };

  const banUser = async (targetId: string, targetType: string) => {
    if (!confirm('⚠️ Suspendre cet utilisateur ? Cette action est réversible depuis Admin → Utilisateurs.')) return;
    if (targetType !== 'user') {
      toast.error('Pour suspendre un utilisateur, allez dans Admin → Utilisateurs');
      return;
    }
    const res = await adminFetch(`/api/admin/users/${targetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', status: 'suspended' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error('Erreur : ' + (data.error ?? res.statusText));
      return;
    }
    toast.success('🔒 Utilisateur suspendu');
  };

  // Group reports by target for multi-report badge
  const grouped = reports.reduce<Record<string, number>>((acc, r) => {
    const key = `${r.target_type}:${r.target_id}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Admin
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Flag className="w-6 h-6 text-red-500" /> Signalements
          </h1>
          {stats.pending > 0 && (
            <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse">
              {stats.pending} en attente
            </span>
          )}
        </div>

        {/* Stats — lightweight, eager */}
        <SignalementStats stats={stats} />

        {/* Filtres */}
        <SignalementFilters
          filterStatus={filterStatus}
          filterType={filterType}
          loading={loading}
          onStatus={setFilterStatus}
          onType={setFilterType}
          onRefresh={fetchReports}
        />

        {/* Contenu */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <span className="text-5xl">✅</span>
            <p className="mt-4 text-xl font-bold text-gray-700">Aucun signalement</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterStatus === 'pending'
                ? 'Aucun signalement en attente — parfait !'
                : 'Aucun résultat pour ces filtres.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <SignalementRow
                key={report.id}
                report={report}
                duplicateCount={grouped[`${report.target_type}:${report.target_id}`] ?? 1}
                processing={processing === report.id}
                onUpdate={updateReport}
                onBan={banUser}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
