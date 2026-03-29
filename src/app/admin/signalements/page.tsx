'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Report } from '@/types';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminSignalementsPage() {
  const { profile, isAdmin, isModerator } = useAuthStore();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !isModerator()) { router.push('/'); return; }

    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('reports')
        .select('*, reporter:profiles!reports_reporter_id_fkey(full_name, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      setReports((data as Report[]) || []);
      setLoading(false);
    };
    fetch();
  }, [profile, isModerator, router]);

  const updateReport = async (reportId: string, status: string) => {
    const supabase = createClient();
    await supabase.from('reports').update({ status }).eq('id', reportId);
    setReports(prev => prev.filter(r => r.id !== reportId));
    toast.success(`Signalement marqué comme ${status === 'resolved' ? 'résolu' : 'ignoré'}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/admin')} className="text-gray-400 hover:text-gray-600 text-sm">← Admin</button>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Signalements</h1>
        {reports.length > 0 && <Badge variant="danger">{reports.length} en attente</Badge>}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : reports.length === 0 ? (
        <EmptyState icon="✅" title="Aucun signalement en attente" description="Tous les signalements ont été traités." />
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-2xl border border-red-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Flag className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-gray-900">
                      {report.target_type === 'user' ? 'Utilisateur signalé' :
                       report.target_type === 'post' ? 'Post de forum signalé' :
                       report.target_type === 'listing' ? 'Annonce signalée' :
                       report.target_type === 'message' ? 'Message signalé' : 'Équipement signalé'}
                    </span>
                    <Badge variant="danger">En attente</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-1"><strong>Motif :</strong> {report.reason}</p>
                  {report.description && <p className="text-sm text-gray-500">{report.description}</p>}
                  <div className="flex items-center gap-2 mt-3">
                    <Avatar src={report.reporter?.avatar_url} name={report.reporter?.full_name || '?'} size="xs" />
                    <span className="text-xs text-gray-400">Signalé par {report.reporter?.full_name} · {formatRelative(report.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => updateReport(report.id, 'resolved')}>
                    <CheckCircle className="w-3.5 h-3.5" /> Résolu
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateReport(report.id, 'dismissed')}>
                    <XCircle className="w-3.5 h-3.5" /> Ignorer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
