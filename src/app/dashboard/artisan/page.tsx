'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star, MessageSquare, Eye, Clock, CheckCircle, ChevronLeft,
  Wrench, MapPin, Package, TrendingUp, Users, Calendar, Bell,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { ServiceRequest, Review, ArtisanProfile } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import ProtectedPage from '@/components/providers/ProtectedPage';
import StarRating from '@/components/ui/StarRating';
import { STATUS_LABELS, URGENCY_LABELS, formatRelative, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className={cn('bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all', href && 'hover:border-gray-200 cursor-pointer')}>
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
        .select('*, trade_category:trade_categories(*)')
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
        totalViews: 0,
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

      {/* Zone d'intervention & infos */}
      {artisanProfile && (
        <div className="bg-gradient-to-r from-brand-50 to-blue-50 border border-brand-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start gap-4">
          <Avatar src={profile.avatar_url} name={profile.full_name || ''} size="lg" />
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
            </div>
          </div>
          <Link href={artisanProfile ? `/artisans/${artisanProfile.id}` : '#'} target="_blank"
            className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-brand-200 text-brand-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-50 transition-colors">
            <Eye className="w-4 h-4" /> Mon profil public
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demandes reçues */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" /> Demandes reçues
            </h2>
            {stats.pendingRequests > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {stats.pendingRequests} en attente
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200">
              <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="font-medium text-gray-600">Aucune demande pour l&apos;instant</p>
              <p className="text-sm text-gray-400 mt-1">Les demandes des habitants apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <Card key={req.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={(req.resident as { avatar_url?: string })?.avatar_url}
                      name={(req.resident as { full_name?: string })?.full_name || 'Habitant'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{req.title}</p>
                      <p className="text-xs text-gray-500 mb-2">
                        {(req.resident as { full_name?: string })?.full_name || 'Habitant'} · {formatRelative(req.created_at)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={req.urgency === 'tres_urgent' ? 'danger' : req.urgency === 'urgent' ? 'warning' : 'default'} className="text-xs">
                          {URGENCY_LABELS[req.urgency]}
                        </Badge>
                        <Badge variant={
                          req.status === 'completed' ? 'success' :
                          req.status === 'cancelled' ? 'danger' :
                          ['submitted', 'viewed'].includes(req.status) ? 'warning' : 'info'
                        } className="text-xs">
                          {STATUS_LABELS[req.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {/* Actions rapides */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Link href={`/messages`} className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium">
                      <MessageSquare className="w-3.5 h-3.5" /> Répondre
                    </Link>
                    {req.status === 'submitted' && (
                      <button onClick={() => updateRequestStatus(req.id, 'viewed')}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 ml-auto">
                        <Eye className="w-3.5 h-3.5" /> Marquer vue
                      </button>
                    )}
                    {req.status === 'replied' && (
                      <button onClick={() => updateRequestStatus(req.id, 'scheduled')}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 ml-auto font-medium">
                        <Calendar className="w-3.5 h-3.5" /> Planifier
                      </button>
                    )}
                    {req.status === 'scheduled' && (
                      <button onClick={() => updateRequestStatus(req.id, 'completed')}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 ml-auto font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Terminer
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Avis reçus */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" /> Avis clients
            </h2>
            {stats.reviewCount > 0 && (
              <span className="text-sm text-gray-500">{stats.avgRating}★ sur {stats.reviewCount} avis</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200">
              <Star className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="font-medium text-gray-600">Pas encore d&apos;avis</p>
              <p className="text-sm text-gray-400 mt-1">Les avis de vos clients apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={(review.reviewer as { avatar_url?: string })?.avatar_url}
                      name={(review.reviewer as { full_name?: string })?.full_name || 'Client'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-800 text-sm">
                          {(review.reviewer as { full_name?: string })?.full_name || 'Client'}
                        </span>
                        <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
                      </div>
                      <StarRating rating={review.rating} size="sm" />
                      {review.comment && (
                        <p className="text-sm text-gray-600 mt-1.5 leading-snug">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: MessageSquare, label: 'Mes messages', href: '/messages', color: 'bg-green-50 text-green-600' },
            { icon: Bell, label: 'Notifications', href: '/notifications', color: 'bg-blue-50 text-blue-600' },
            { icon: Eye, label: 'Mon profil public', href: artisanProfile ? `/artisans/${artisanProfile.id}` : '#', color: 'bg-orange-50 text-orange-600' },
            { icon: TrendingUp, label: 'Mettre à jour profil', href: '/inscription/artisan-profil', color: 'bg-purple-50 text-purple-600' },
          ].map(({ icon: Icon, label, href, color }) => (
            <Link key={href} href={href}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-all text-center">
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
