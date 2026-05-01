'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Star, Eye, Clock, CheckCircle, ChevronLeft,
  Wrench, MapPin, Package, TrendingUp, Bell, MessageSquare,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ServiceRequest, Review, ArtisanProfile } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ProtectedPage from '@/components/providers/ProtectedPage';
import { STATUS_LABELS, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Lazy-load heavy panels (only fetched after initial render)
const RequestsPanel = dynamic(() => import('./_components/RequestsPanel'), { ssr: false });
const ReviewsPanel  = dynamic(() => import('./_components/ReviewsPanel'),  { ssr: false });

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className={cn('bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-colors', href && 'hover:border-gray-200 cursor-pointer')}>
      <div className={cn('p-2.5 rounded-xl w-fit mb-3', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function ArtisanDashboardContent() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [artisanProfile, setArtisanProfile] = useState<ArtisanProfile | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    avgRating: 0,
    reviewCount: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'artisan_verified') {
      router.push('/dashboard');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      // Profil artisan
      const { data: ap } = await supabase
        .from('artisan_profiles')
        .select('*, trade_category:trade_categories(*), view_count')
        .eq('user_id', profile.id)
        .single();
      setArtisanProfile(ap as ArtisanProfile || null);

      if (!ap) { setLoading(false); return; }

      // Demandes adressées à cet artisan
      const { data: reqs } = await supabase
        .from('service_requests')
        .select('*, category:trade_categories(name, icon), resident:profiles!service_requests_resident_id_fkey(full_name, avatar_url)')
        .eq('artisan_id', ap.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Toutes les demandes pour les stats
      const { data: allReqs } = await supabase
        .from('service_requests')
        .select('id, status')
        .eq('artisan_id', ap.id);

      // Avis reçus
      const { data: revs } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
        .eq('artisan_id', ap.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRequests((reqs as ServiceRequest[]) || []);
      setReviews((revs as Review[]) || []);

      const totalRequests = allReqs?.length || 0;
      const pendingRequests = allReqs?.filter(r => ['submitted', 'viewed'].includes(r.status)).length || 0;
      const completedRequests = allReqs?.filter(r => r.status === 'completed').length || 0;
      const avgRating = revs?.length
        ? revs.reduce((sum, r) => sum + r.rating, 0) / revs.length
        : 0;

      setStats({
        totalRequests,
        pendingRequests,
        completedRequests,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: revs?.length || 0,
        totalViews: (ap as ArtisanProfile & { view_count?: number })?.view_count || 0,
      });

      setLoading(false);
    };

    fetchData();
  }, [profile, router]);

  const updateRequestStatus = async (requestId: string, newStatus: ServiceRequest['status']) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('service_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }

    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));

    const labels: Record<string, string> = {
      viewed: 'Marquée comme vue',
      replied: 'Marquée comme répondue',
      scheduled: 'Intervention planifiée',
      completed: 'Intervention terminée',
    };
    toast.success(labels[newStatus] || 'Statut mis à jour');

    // Notifier le résident
    const req = requests.find(r => r.id === requestId);
    if (req) {
      await supabase.from('notifications').insert({
        user_id: req.resident_id,
        type: 'request_update',
        title: '📋 Demande mise à jour',
        message: `Votre demande "${req.title}" est maintenant : ${STATUS_LABELS[newStatus]}`,
        link: `/artisans/demande/${requestId}`,
      });
    }
  };

  if (!profile || profile.role !== 'artisan_verified') return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-brand-500" />
            Espace Artisan
          </h1>
          {artisanProfile && (
            <p className="text-gray-500 text-sm">
              {artisanProfile.business_name}
              {artisanProfile.trade_category && ` · ${artisanProfile.trade_category.name}`}
            </p>
          )}
        </div>
        <Link href={artisanProfile ? `/artisans/${artisanProfile.id}` : '#'} target="_blank">
          <div className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:underline">
            <Eye className="w-4 h-4" /> Voir mon profil
          </div>
        </Link>
      </div>

      {/* Profil incomplet */}
      {!loading && !artisanProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
          <p className="text-amber-800 font-semibold mb-2">⚠️ Profil artisan introuvable</p>
          <p className="text-amber-700 text-sm mb-3">
            Votre compte artisan est validé mais votre profil n&apos;a pas encore été créé.
          </p>
          <Link href="/inscription/artisan-profil" className="inline-flex items-center gap-1.5 bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
            Créer mon profil →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Package} label="Demandes reçues" value={loading ? '…' : stats.totalRequests} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Clock} label="En attente" value={loading ? '…' : stats.pendingRequests} color="bg-orange-100 text-orange-600" />
        <StatCard icon={CheckCircle} label="Terminées" value={loading ? '…' : stats.completedRequests} color="bg-green-100 text-green-600" />
        <StatCard
          icon={Star}
          label={stats.reviewCount > 0 ? `Note (${stats.reviewCount} avis)` : 'Aucun avis'}
          value={loading ? '…' : stats.reviewCount > 0 ? `${stats.avgRating}★` : '—'}
          color="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Carte de visite artisan */}
      {artisanProfile && (
        <div className="bg-gradient-to-r from-brand-50 to-blue-50 border border-brand-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start gap-4">
          <Avatar
            src={artisanProfile.avatar_url || profile.avatar_url}
            name={artisanProfile.business_name || profile.full_name || ''}
            size="lg"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-900 text-lg">{artisanProfile.business_name}</span>
              <Badge variant="success">✅ Artisan vérifié</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
              {artisanProfile.service_area && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{artisanProfile.service_area}</span>
              )}
              {artisanProfile.years_experience && (
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{artisanProfile.years_experience} ans d&apos;exp.</span>
              )}
              {stats.reviewCount > 0 && (
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{stats.avgRating}/5</span>
              )}
              <span className="flex items-center gap-1 text-purple-600 font-medium">
                <Eye className="w-3.5 h-3.5" />{stats.totalViews} vue{stats.totalViews !== 1 ? 's' : ''} du profil
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Link href={artisanProfile ? `/artisans/${artisanProfile.id}` : '#'} target="_blank"
              className="flex items-center gap-1.5 bg-white border border-brand-200 text-brand-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-50 transition-colors">
              <Eye className="w-4 h-4" /> Mon profil public
            </Link>
            <Link href="/dashboard/artisan/modifier-profil"
              className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
              <TrendingUp className="w-4 h-4" /> Modifier mon profil
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demandes reçues — lazy panel */}
        <RequestsPanel
          requests={requests}
          loading={loading}
          pendingCount={stats.pendingRequests}
          onUpdateStatus={updateRequestStatus}
          onDelete={(id) => {
            setRequests(prev => prev.filter(r => r.id !== id));
            setStats(prev => ({
              ...prev,
              totalRequests: Math.max(0, prev.totalRequests - 1),
              pendingRequests: Math.max(0, prev.pendingRequests - 1),
            }));
          }}
        />

        {/* Avis clients — lazy panel */}
        <ReviewsPanel
          reviews={reviews}
          loading={loading}
          avgRating={stats.avgRating}
          reviewCount={stats.reviewCount}
        />
      </div>

      {/* Actions rapides */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: MessageSquare, label: 'Mes messages', href: '/messages', color: 'bg-green-50 text-green-600' },
            { icon: Bell, label: 'Notifications', href: '/notifications', color: 'bg-blue-50 text-blue-600' },
            { icon: Eye, label: 'Mon profil public', href: artisanProfile ? `/artisans/${artisanProfile.id}` : '#', color: 'bg-orange-50 text-orange-600' },
            { icon: TrendingUp, label: 'Modifier mon profil', href: '/dashboard/artisan/modifier-profil', color: 'bg-purple-50 text-purple-600' },
          ].map(({ icon: Icon, label, href, color }) => (
            <Link key={href} href={href}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-colors text-center">
                <div className={`inline-flex p-2.5 rounded-xl ${color} mb-2`}><Icon className="w-5 h-5" /></div>
                <p className="text-sm font-medium text-gray-700 leading-tight">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArtisanDashboardPage() {
  return <ProtectedPage><ArtisanDashboardContent /></ProtectedPage>;
}
